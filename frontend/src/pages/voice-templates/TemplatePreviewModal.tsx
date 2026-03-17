import React, { useState, useRef, useEffect } from 'react';
import {
  XMarkIcon,
  PlayIcon,
  PauseIcon,
  SpeakerWaveIcon,
  ArrowPathIcon,
  MicrophoneIcon,
  StopIcon,
  PhoneIcon,
  PhoneXMarkIcon,
} from '@heroicons/react/24/outline';
import { PhoneIcon as PhoneIconSolid } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';
import api from '../../services/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  audioUrl?: string;
}

interface TemplatePreviewModalProps {
  template: {
    id: string;
    name: string;
    greeting?: string;
    greetings?: Record<string, string>;
    voiceId?: string;
    language?: string;
    systemPrompt?: string;
    industry?: string;
    icon?: string;
    color?: string;
  };
  onClose: () => void;
}

const TemplatePreviewModal: React.FC<TemplatePreviewModalProps> = ({
  template,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'voice' | 'conversation'>('conversation');
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
  const recognitionRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const silenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      if (recognitionRef.current) {
        recognitionRef.current.stop();
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

  // Backend STT recording functions
  const startBackendRecording = async () => {
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
          await transcribeAudio(audioBlob);
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
  };

  const stopBackendRecording = () => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const transcribeAudio = async (audioBlob: Blob) => {
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

      if (text && text.trim()) {
        handleUserMessage(text.trim());
      } else {
        setIsProcessing(false);
        if (callActive) {
          startBackendRecording();
        }
      }
    } catch (error: any) {
      console.error('Transcription error:', error);
      setCurrentTranscript('');
      setIsProcessing(false);
      toast.error('Failed to transcribe. Please try again.');
      if (callActive) {
        startBackendRecording();
      }
    }
  };

  const handlePlayVoice = async (text?: string) => {
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
    } catch (error: any) {
      console.error('Error playing voice:', error);
      toast.error(error.response?.data?.message || 'Failed to play voice preview');
    } finally {
      setIsLoadingAudio(false);
    }
  };

  const handleStopVoice = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const handleUserMessage = async (userText: string) => {
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

      if (audioUrl) {
        if (audioRef.current) {
          audioRef.current.pause();
        }
        audioRef.current = new Audio(audioUrl);
        audioRef.current.onended = () => {
          setIsPlaying(false);
          if (callActive) {
            startBackendRecording();
          }
        };

        setIsPlaying(true);
        await audioRef.current.play();
      } else {
        if (callActive) {
          startBackendRecording();
        }
      }

    } catch (error: any) {
      console.error('Error in conversation:', error);
      toast.error(error.response?.data?.message || 'Failed to get response');
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' },
      ]);
      if (callActive) {
        startBackendRecording();
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const startCall = async () => {
    setCallActive(true);
    setMessages([]);

    const defaultGreeting = template.greeting || template.greetings?.default ||
      `Hello! Welcome to ${template.name}. How can I help you today?`;

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

    } catch (error: any) {
      console.error('Error starting call:', error);
      toast.error('Failed to start call');
      setCallActive(false);
    }
  };

  const endCall = () => {
    setCallActive(false);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
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
  };

  const replayMessage = async (audioUrl: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    audioRef.current = new Audio(audioUrl);
    audioRef.current.onended = () => setIsPlaying(false);
    setIsPlaying(true);
    await audioRef.current.play();
  };

  const defaultGreeting = template.greeting || template.greetings?.default ||
    `Hello! Welcome to ${template.name}. How can I help you today?`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

        {/* Header */}
        <div
          className="px-6 py-4 text-white"
          style={{ background: `linear-gradient(135deg, ${template.color || '#3B82F6'}, ${template.color || '#3B82F6'}dd)` }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl">
                {template.icon || '🤖'}
              </div>
              <div>
                <h2 className="font-semibold text-lg">{template.name}</h2>
                <p className="text-white/80 text-sm">{template.industry || 'AI Voice Agent'}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-gray-50">
          <button
            onClick={() => setActiveTab('conversation')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors relative ${
              activeTab === 'conversation'
                ? 'text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <PhoneIcon className="w-4 h-4 inline-block mr-2" />
            Test Call
            {activeTab === 'conversation' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('voice')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors relative ${
              activeTab === 'voice'
                ? 'text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <SpeakerWaveIcon className="w-4 h-4 inline-block mr-2" />
            Voice Preview
            {activeTab === 'voice' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
            )}
          </button>
        </div>

        {/* Content */}
        <div className="h-[480px] overflow-hidden">
          {activeTab === 'conversation' ? (
            <div className="h-full flex flex-col">
              {!callActive ? (
                /* Start Call Screen */
                <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gradient-to-b from-gray-50 to-white">
                  <div className="relative mb-6">
                    <div className="w-28 h-28 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30">
                      <PhoneIconSolid className="w-14 h-14 text-white" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow text-xl">
                      {template.icon || '🤖'}
                    </div>
                  </div>

                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Test Voice Call
                  </h3>
                  <p className="text-gray-500 text-center mb-8 max-w-xs">
                    Experience a real conversation with the AI agent. Speak naturally and the AI will respond.
                  </p>

                  <button
                    onClick={startCall}
                    className="px-8 py-4 bg-green-500 text-white rounded-full hover:bg-green-600 transition-all hover:scale-105 shadow-lg shadow-green-500/30 flex items-center gap-3 font-medium"
                  >
                    <PhoneIconSolid className="w-5 h-5" />
                    Start Test Call
                  </button>

                  <p className="text-xs text-gray-400 mt-6 text-center">
                    Requires microphone permission
                  </p>
                </div>
              ) : (
                /* Active Call Screen */
                <div className="flex-1 flex flex-col bg-gray-900">
                  {/* Call Header */}
                  <div className="px-4 py-3 bg-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-lg">
                        {template.icon || '🤖'}
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">{template.name}</p>
                        <p className="text-green-400 text-xs flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                          {formatDuration(callDuration)}
                        </p>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      isPlaying
                        ? 'bg-blue-500/20 text-blue-400'
                        : isRecording
                          ? 'bg-red-500/20 text-red-400'
                          : isProcessing
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-green-500/20 text-green-400'
                    }`}>
                      {isPlaying ? '🔊 Speaking' : isRecording ? '🎤 Listening' : isProcessing ? '⏳ Processing' : '👂 Ready'}
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {messages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                            msg.role === 'user'
                              ? 'bg-blue-500 text-white rounded-br-md'
                              : 'bg-gray-700 text-gray-100 rounded-bl-md'
                          }`}
                        >
                          <p className="text-sm leading-relaxed">{msg.content}</p>
                          {msg.audioUrl && msg.role === 'assistant' && (
                            <button
                              onClick={() => replayMessage(msg.audioUrl!)}
                              className="mt-1.5 text-xs flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity"
                            >
                              <PlayIcon className="w-3 h-3" />
                              Replay
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    {currentTranscript && (
                      <div className="flex justify-end">
                        <div className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5 bg-blue-500/50 text-white/80 italic">
                          <p className="text-sm">{currentTranscript}</p>
                        </div>
                      </div>
                    )}

                    {isProcessing && !currentTranscript && (
                      <div className="flex justify-start">
                        <div className="bg-gray-700 rounded-2xl rounded-bl-md px-4 py-3">
                          <div className="flex gap-1.5">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Call Controls */}
                  <div className="p-4 bg-gray-800 border-t border-gray-700">
                    <div className="flex items-center justify-center gap-6">
                      {/* Mic Button */}
                      {isRecording ? (
                        <button
                          onClick={stopBackendRecording}
                          className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 transition-all flex items-center justify-center shadow-lg shadow-red-500/30 animate-pulse"
                          title="Click to stop & send"
                        >
                          <StopIcon className="w-7 h-7 text-white" />
                        </button>
                      ) : (
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                          isPlaying || isProcessing ? 'bg-gray-600' : 'bg-gray-600'
                        }`}>
                          <MicrophoneIcon className={`w-7 h-7 ${
                            isPlaying || isProcessing ? 'text-gray-400' : 'text-gray-300'
                          }`} />
                        </div>
                      )}

                      {/* End Call Button */}
                      <button
                        onClick={endCall}
                        className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 transition-all flex items-center justify-center shadow-lg"
                        title="End call"
                      >
                        <PhoneXMarkIcon className="w-7 h-7 text-white" />
                      </button>
                    </div>

                    <p className="text-center text-gray-400 text-xs mt-3">
                      {isRecording
                        ? 'Tap the red button when done speaking'
                        : isPlaying
                          ? 'AI is responding...'
                          : isProcessing
                            ? 'Processing your message...'
                            : 'Speak when the mic activates'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Voice Preview Tab */
            <div className="p-6 space-y-6 overflow-y-auto h-full">
              {/* Greeting Preview */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <SpeakerWaveIcon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Greeting Message</h3>
                    <p className="text-sm text-gray-500">How the AI introduces itself</p>
                  </div>
                </div>
                <p className="text-gray-700 text-sm mb-4 leading-relaxed bg-white/50 rounded-lg p-3">
                  "{defaultGreeting}"
                </p>
                <button
                  onClick={() => handlePlayVoice(defaultGreeting)}
                  disabled={isLoadingAudio}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all text-sm font-medium"
                >
                  {isLoadingAudio ? (
                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  ) : isPlaying ? (
                    <PauseIcon className="w-4 h-4" />
                  ) : (
                    <PlayIcon className="w-4 h-4" />
                  )}
                  {isLoadingAudio ? 'Loading...' : isPlaying ? 'Playing...' : 'Play Greeting'}
                </button>
                {isPlaying && (
                  <button
                    onClick={handleStopVoice}
                    className="ml-2 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                  >
                    Stop
                  </button>
                )}
              </div>

              {/* Custom Text */}
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                    <MicrophoneIcon className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Custom Text</h3>
                    <p className="text-sm text-gray-500">Type anything to hear the AI voice</p>
                  </div>
                </div>
                <textarea
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="Enter any text to hear how the AI sounds..."
                  className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                  rows={3}
                />
                <button
                  onClick={() => handlePlayVoice()}
                  disabled={isLoadingAudio || !customText.trim()}
                  className="mt-3 inline-flex items-center gap-2 px-4 py-2.5 bg-gray-800 text-white rounded-lg hover:bg-gray-900 disabled:opacity-50 transition-all text-sm font-medium"
                >
                  {isLoadingAudio ? (
                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  ) : (
                    <PlayIcon className="w-4 h-4" />
                  )}
                  Play Text
                </button>
              </div>

              {/* Voice Info */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-5 border border-purple-100">
                <h3 className="font-medium text-gray-900 mb-3">Voice Configuration</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/60 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Voice</p>
                    <p className="font-medium text-gray-900">{template.voiceId || 'Default'}</p>
                  </div>
                  <div className="bg-white/60 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Language</p>
                    <p className="font-medium text-gray-900">{template.language || 'en-IN'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Preview mode • Deploy to create a live agent
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TemplatePreviewModal;
