/**
 * Template Preview Hook
 * Manages audio playback, recording, and conversation state for template preview
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../../../services/api';
import { Message, TemplateData, ActiveTab } from '../template-preview.types';

export function useTemplatePreview(template: TemplateData) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('conversation');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [customText, setCustomText] = useState('');
  const [callActive, setCallActive] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [callDuration, setCallDuration] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<unknown>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const silenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const defaultGreeting = template.greeting || template.greetings?.default ||
    `Hello! Welcome to ${template.name}. How can I help you today?`;

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Call duration timer
  useEffect(() => {
    if (callActive) {
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
      setCallDuration(0);
    }
    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, [callActive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (recognitionRef.current && typeof (recognitionRef.current as { stop?: () => void }).stop === 'function') {
        (recognitionRef.current as { stop: () => void }).stop();
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
    };
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const transcribeAudio = useCallback(async (audioBlob: Blob) => {
    setIsProcessing(true);
    setCurrentTranscript('Transcribing...');

    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      const response = await api.post('/voice-templates/transcribe', {
        audio: base64Audio,
        language: template.language || 'en-IN',
      });

      const { text } = response.data.data;
      setCurrentTranscript('');

      return text?.trim() || null;
    } catch (error) {
      console.error('Transcription error:', error);
      setCurrentTranscript('');
      setIsProcessing(false);
      toast.error('Failed to transcribe. Please try again.');
      return null;
    }
  }, [template.language]);

  const handleUserMessage = useCallback(async (userText: string) => {
    if (!userText.trim() || isProcessing) return;

    setIsProcessing(true);
    setMessages(prev => [...prev, { role: 'user', content: userText }]);

    try {
      const response = await api.post(`/voice-templates/${template.id}/test-conversation`, {
        message: userText,
        conversationHistory: messages.slice(-6),
        includeAudio: true,
      });

      const { reply, audio, audioFormat } = response.data.data;

      let audioUrl: string | undefined;
      if (audio) {
        const audioBlob = new Blob(
          [Uint8Array.from(atob(audio), c => c.charCodeAt(0))],
          { type: audioFormat === 'mp3' ? 'audio/mpeg' : 'audio/wav' }
        );
        audioUrl = URL.createObjectURL(audioBlob);
      }

      setMessages(prev => [...prev, { role: 'assistant', content: reply, audioUrl }]);

      return audioUrl;
    } catch (error) {
      console.error('Error in conversation:', error);
      toast.error('Failed to get response');
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' },
      ]);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, messages, template.id]);

  const startBackendRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const text = await transcribeAudio(audioBlob);
          if (text) {
            const audioUrl = await handleUserMessage(text);
            if (audioUrl && audioRef.current) {
              audioRef.current.pause();
              audioRef.current = new Audio(audioUrl);
              audioRef.current.onended = () => {
                setIsPlaying(false);
                if (callActive) {
                  startBackendRecording();
                }
              };
              setIsPlaying(true);
              await audioRef.current.play();
            } else if (callActive) {
              startBackendRecording();
            }
          } else {
            setIsProcessing(false);
            if (callActive) {
              startBackendRecording();
            }
          }
        }
        audioChunksRef.current = [];
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Auto-stop after 15 seconds
      silenceTimeoutRef.current = setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          stopBackendRecording();
        }
      }, 15000);

    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Failed to access microphone');
    }
  }, [callActive, transcribeAudio, handleUserMessage]);

  const stopBackendRecording = useCallback(() => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  const handlePlayVoice = useCallback(async (text?: string) => {
    try {
      setIsLoadingAudio(true);

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      const response = await api.post(`/voice-templates/${template.id}/preview-voice`, {
        text: text || customText || undefined,
        voice: template.voiceId,
        language: template.language,
      });

      const { audio, format } = response.data.data;

      const audioBlob = new Blob(
        [Uint8Array.from(atob(audio), c => c.charCodeAt(0))],
        { type: format === 'mp3' ? 'audio/mpeg' : 'audio/wav' }
      );
      const audioUrl = URL.createObjectURL(audioBlob);

      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => setIsPlaying(false);
      audioRef.current.onpause = () => setIsPlaying(false);
      audioRef.current.onplay = () => setIsPlaying(true);

      await audioRef.current.play();
    } catch (error) {
      console.error('Error playing voice:', error);
      toast.error('Failed to play voice preview');
    } finally {
      setIsLoadingAudio(false);
    }
  }, [customText, template.id, template.voiceId, template.language]);

  const handleStopVoice = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  }, []);

  const startCall = useCallback(async () => {
    setCallActive(true);
    setMessages([]);

    try {
      const voiceResponse = await api.post(`/voice-templates/${template.id}/preview-voice`, {
        text: defaultGreeting,
        voice: template.voiceId,
        language: template.language,
      });

      const { audio, format } = voiceResponse.data.data;
      const audioBlob = new Blob(
        [Uint8Array.from(atob(audio), c => c.charCodeAt(0))],
        { type: format === 'mp3' ? 'audio/mpeg' : 'audio/wav' }
      );
      const audioUrl = URL.createObjectURL(audioBlob);

      setMessages([{ role: 'assistant', content: defaultGreeting, audioUrl }]);

      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => {
        setIsPlaying(false);
        startBackendRecording();
      };
      setIsPlaying(true);
      await audioRef.current.play();

    } catch (error) {
      console.error('Error starting call:', error);
      toast.error('Failed to start call');
      setCallActive(false);
    }
  }, [defaultGreeting, template.id, template.voiceId, template.language, startBackendRecording]);

  const endCall = useCallback(() => {
    setCallActive(false);
    if (recognitionRef.current && typeof (recognitionRef.current as { stop?: () => void }).stop === 'function') {
      (recognitionRef.current as { stop: () => void }).stop();
    }
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
    setIsRecording(false);
    setCurrentTranscript('');
  }, []);

  const replayMessage = useCallback(async (audioUrl: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    audioRef.current = new Audio(audioUrl);
    audioRef.current.onended = () => setIsPlaying(false);
    setIsPlaying(true);
    await audioRef.current.play();
  }, []);

  return {
    // State
    activeTab,
    isPlaying,
    isLoadingAudio,
    messages,
    isRecording,
    isProcessing,
    customText,
    callActive,
    currentTranscript,
    callDuration,
    defaultGreeting,
    // Refs
    chatEndRef,
    // Actions
    setActiveTab,
    setCustomText,
    handlePlayVoice,
    handleStopVoice,
    startCall,
    endCall,
    stopBackendRecording,
    replayMessage,
    formatDuration,
  };
}
