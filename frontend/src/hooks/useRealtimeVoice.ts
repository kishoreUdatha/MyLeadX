import { useEffect, useRef, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { socketService } from '../services/socket.service';
import {
  VoiceSessionMode,
  TranscriptEntry,
  RealtimeStartPayload,
  RealtimeStartedPayload,
  RealtimeTranscriptionPayload,
  RealtimeAudioResponsePayload,
  RealtimeStatusPayload,
  RealtimeErrorPayload,
  RealtimeEndedPayload,
  RealtimeVoiceState,
  DEFAULT_AUDIO_CONFIG,
} from '../types/realtime.types';

interface UseRealtimeVoiceOptions {
  agentId: string;
  mode?: VoiceSessionMode;
  autoStart?: boolean;
  onSessionEnd?: (result: RealtimeEndedPayload) => void;
  onError?: (error: RealtimeErrorPayload) => void;
  onTranscription?: (transcription: RealtimeTranscriptionPayload) => void;
}

export function useRealtimeVoice(options: UseRealtimeVoiceOptions) {
  const { agentId, mode = 'REALTIME', autoStart = false, onSessionEnd, onError, onTranscription } = options;

  const socketRef = useRef<Socket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const playbackContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioQueueRef = useRef<ArrayBuffer[]>([]);
  const isPlayingRef = useRef(false);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const vadIntervalRef = useRef<number | null>(null);
  const lastSpeechTimeRef = useRef<number>(0);
  const statusRef = useRef<string>('idle'); // Track status for VAD callback
  // Refs for functions that need to be called from callbacks (to avoid circular dependencies)
  const playAudioChunkRef = useRef<(base64Audio: string, format: string) => void>(() => {});
  const playNextChunkRef = useRef<() => void>(() => {});
  const stopRecordingRef = useRef<() => void>(() => {});

  const [state, setState] = useState<RealtimeVoiceState>({
    isConnected: false,
    status: 'idle',
    sessionId: null,
    mode,
    transcripts: [],
    currentUserText: '',
    currentAssistantText: '',
    error: null,
    isRecording: false,
    isMuted: false,
    volume: 1.0,
  });

  // Update state helper
  const updateState = useCallback((updates: Partial<RealtimeVoiceState>) => {
    setState(prev => {
      const newState = { ...prev, ...updates };
      // Keep ref in sync for VAD callback
      if (updates.status !== undefined) {
        statusRef.current = updates.status;
      }
      return newState;
    });
  }, []);

  // Helper to set up realtime event listeners on a socket
  const setupRealtimeListeners = useCallback((socket: Socket) => {
    // First, remove any existing listeners to avoid duplicates
    socket.off('realtime:started');
    socket.off('realtime:transcription');
    socket.off('realtime:audio');
    socket.off('realtime:status');
    socket.off('realtime:interrupted');
    socket.off('realtime:stop_audio');
    socket.off('realtime:error');
    socket.off('realtime:ended');

    // Realtime events
    socket.on('realtime:started', (data: RealtimeStartedPayload) => {
      console.log('[RealtimeVoice] Session started:', data.sessionId);
      updateState({
        sessionId: data.sessionId,
        mode: data.mode,
        status: 'connected',
      });

      // Add greeting as first transcript if present
      if (data.greeting) {
        const greetingEntry: TranscriptEntry = {
          id: `greeting-${Date.now()}`,
          role: 'assistant',
          text: data.greeting,
          timestamp: new Date(),
          isFinal: true,
        };
        setState(prev => ({
          ...prev,
          transcripts: [...prev.transcripts, greetingEntry],
        }));
      }
    });

    socket.on('realtime:transcription', (data: RealtimeTranscriptionPayload) => {
      console.log(`[RealtimeVoice] Transcription received: role=${data.role}, text="${data.text}", isFinal=${data.isFinal}`);
      if (data.role === 'user') {
        updateState({ currentUserText: data.text });
        if (data.isFinal) {
          const entry: TranscriptEntry = {
            id: data.itemId || `user-${Date.now()}`,
            role: 'user',
            text: data.text,
            timestamp: new Date(),
            isFinal: true,
          };
          setState(prev => ({
            ...prev,
            transcripts: [...prev.transcripts, entry],
            currentUserText: '',
          }));
        }
      } else {
        updateState({ currentAssistantText: data.text });
        if (data.isFinal) {
          const entry: TranscriptEntry = {
            id: data.itemId || `assistant-${Date.now()}`,
            role: 'assistant',
            text: data.text,
            timestamp: new Date(),
            isFinal: true,
          };
          setState(prev => ({
            ...prev,
            transcripts: [...prev.transcripts, entry],
            currentAssistantText: '',
          }));
        }
      }
      onTranscription?.(data);
    });

    socket.on('realtime:audio', (data: RealtimeAudioResponsePayload) => {
      playAudioChunkRef.current(data.audio, data.format);
    });

    socket.on('realtime:status', (data: RealtimeStatusPayload) => {
      console.log('[RealtimeVoice] Status update:', data.status);
      statusRef.current = data.status; // Update ref immediately for VAD
      updateState({ status: data.status });
    });

    // Handle interruption - stop audio playback immediately
    socket.on('realtime:interrupted', () => {
      console.log('[RealtimeVoice] User interrupted - stopping audio playback immediately');
      audioQueueRef.current = [];
      isPlayingRef.current = false;
      // Close playback context to stop any playing audio
      if (playbackContextRef.current && playbackContextRef.current.state !== 'closed') {
        playbackContextRef.current.close();
        playbackContextRef.current = null;
      }
    });

    socket.on('realtime:stop_audio', () => {
      console.log('[RealtimeVoice] Stop audio signal received - stopping immediately');
      audioQueueRef.current = [];
      isPlayingRef.current = false;
      // Close playback context to stop any playing audio
      if (playbackContextRef.current && playbackContextRef.current.state !== 'closed') {
        playbackContextRef.current.close();
        playbackContextRef.current = null;
      }
    });

    socket.on('realtime:error', (data: RealtimeErrorPayload) => {
      console.error('[RealtimeVoice] Error:', data);
      updateState({ error: data.message });
      onError?.(data);
    });

    socket.on('realtime:ended', (data: RealtimeEndedPayload) => {
      console.log('[RealtimeVoice] Session ended - stopping all audio:', data);
      // Clear audio queue immediately
      audioQueueRef.current = [];
      isPlayingRef.current = false;
      updateState({
        status: 'disconnected',
        sessionId: null,
        isRecording: false,
      });
      stopRecordingRef.current();
      onSessionEnd?.(data);
    });
  }, [updateState, onSessionEnd, onError, onTranscription]);

  // Connect to socket - reuse the shared socket service
  const connect = useCallback(async () => {
    // Check if we already have a connected socket from our ref
    if (socketRef.current?.connected) {
      console.log('[RealtimeVoice] Already connected via ref, ensuring listeners are set up');
      setupRealtimeListeners(socketRef.current);
      return;
    }

    // Try to get the shared socket from socketService
    let socket = socketService.getSocket();

    if (socket?.connected) {
      console.log('[RealtimeVoice] Reusing existing socket connection:', socket.id);
      socketRef.current = socket;
      updateState({ isConnected: true, error: null });
      // IMPORTANT: Set up listeners even when reusing existing socket
      setupRealtimeListeners(socket);
      return;
    }

    // If no existing connection, connect via socketService
    console.log('[RealtimeVoice] No existing socket, connecting via socketService...');
    socket = await socketService.connectAsync();

    if (!socket) {
      console.error('[RealtimeVoice] Failed to get socket from socketService');
      updateState({ error: 'Authentication required' });
      return;
    }

    console.log('[RealtimeVoice] Socket obtained from socketService:', socket.id);
    socketRef.current = socket;

    // Update connected state
    if (socket.connected) {
      updateState({ isConnected: true, error: null });
    }

    // Set up realtime-specific event listeners
    setupRealtimeListeners(socket);
  }, [updateState, setupRealtimeListeners]);

  // Start session
  const startSession = useCallback(async (visitorInfo?: { name?: string; email?: string; phone?: string }) => {
    console.log('[RealtimeVoice] startSession called, connected:', socketRef.current?.connected);

    if (!socketRef.current?.connected) {
      console.log('[RealtimeVoice] Not connected, calling connect()...');
      await connect();
    }

    // After connect, check if we're connected
    if (!socketRef.current?.connected) {
      console.error('[RealtimeVoice] Failed to connect');
      updateState({ error: 'Failed to connect' });
      return;
    }

    console.log('[RealtimeVoice] Connected! Starting session...');
    updateState({ status: 'connecting', error: null });

    const payload: RealtimeStartPayload = {
      agentId,
      mode,
      visitorInfo,
    };

    console.log('[RealtimeVoice] Emitting realtime:start with payload:', payload);
    socketRef.current.emit('realtime:start', payload);
  }, [connect, agentId, mode, updateState]);

  // Start recording with client-side VAD for interruption detection
  const startRecording = useCallback(async () => {
    try {
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: DEFAULT_AUDIO_CONFIG.sampleRate,
          channelCount: DEFAULT_AUDIO_CONFIG.channelCount,
          echoCancellation: DEFAULT_AUDIO_CONFIG.echoCancellation,
          noiseSuppression: DEFAULT_AUDIO_CONFIG.noiseSuppression,
          autoGainControl: DEFAULT_AUDIO_CONFIG.autoGainControl,
        },
      });

      mediaStreamRef.current = stream;

      // Create audio context
      const audioContext = new AudioContext({
        sampleRate: DEFAULT_AUDIO_CONFIG.sampleRate,
      });
      audioContextRef.current = audioContext;

      // Create source from stream
      const source = audioContext.createMediaStreamSource(stream);

      // Create analyser for VAD (Voice Activity Detection)
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.3;
      analyserRef.current = analyser;
      source.connect(analyser);

      // Start VAD interval to detect user speech during assistant speaking
      const vadDataArray = new Uint8Array(analyser.frequencyBinCount);
      const VAD_THRESHOLD = 30; // Adjust based on testing (lower = more sensitive)
      const SPEECH_DEBOUNCE_MS = 150; // Debounce to avoid false positives

      vadIntervalRef.current = window.setInterval(() => {
        if (!analyserRef.current) return;

        analyserRef.current.getByteFrequencyData(vadDataArray);

        // Calculate average volume
        let sum = 0;
        for (let i = 0; i < vadDataArray.length; i++) {
          sum += vadDataArray[i];
        }
        const avgVolume = sum / vadDataArray.length;

        // If user is speaking and assistant is currently speaking, interrupt
        if (avgVolume > VAD_THRESHOLD) {
          const now = Date.now();
          if (now - lastSpeechTimeRef.current > SPEECH_DEBOUNCE_MS) {
            lastSpeechTimeRef.current = now;

            // Check if assistant is speaking using ref (not state - stale closure issue)
            if (statusRef.current === 'speaking') {
              console.log('[RealtimeVoice] Client VAD detected speech during assistant speaking - interrupting');
              socketRef.current?.emit('realtime:interrupt');
              // Clear local audio queue immediately
              audioQueueRef.current = [];
              isPlayingRef.current = false;
              // Close playback context to stop any playing audio
              if (playbackContextRef.current && playbackContextRef.current.state !== 'closed') {
                playbackContextRef.current.close();
                playbackContextRef.current = null;
              }
            }
          }
        }
      }, 50); // Check every 50ms

      // Create script processor for audio processing
      // Note: AudioWorklet would be better but requires more setup
      const processor = audioContext.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (event) => {
        if (state.isMuted || !socketRef.current?.connected) return;

        // ECHO SUPPRESSION: Don't send audio when the AI is speaking
        // This prevents the microphone from picking up the speaker output
        // and having it transcribed as user input
        if (statusRef.current === 'speaking') {
          return; // Skip sending audio during AI speech
        }

        const inputData = event.inputBuffer.getChannelData(0);

        // Convert float32 to int16 PCM
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // Convert to base64
        const base64 = arrayBufferToBase64(pcm16.buffer);

        // Send to server
        socketRef.current?.emit('realtime:audio', { audio: base64 });
      };

      source.connect(processor);
      // Connect to destination through a zero-gain node to keep processor active
      // The ScriptProcessor needs to be in the active audio graph to process
      // Using gain=0 prevents hearing your own voice (echo)
      const silentGain = audioContext.createGain();
      silentGain.gain.value = 0; // Mute output so user doesn't hear themselves
      processor.connect(silentGain);
      silentGain.connect(audioContext.destination);

      updateState({ isRecording: true });
      console.log('[RealtimeVoice] Recording started with client-side VAD - audio will be sent to server');
    } catch (error) {
      console.error('[RealtimeVoice] Failed to start recording:', error);
      updateState({ error: 'Microphone access denied' });
    }
  }, [state.isMuted, updateState]);

  // Stop recording
  const stopRecording = useCallback(() => {
    // Clear VAD interval
    if (vadIntervalRef.current) {
      clearInterval(vadIntervalRef.current);
      vadIntervalRef.current = null;
    }

    // Clear analyser
    analyserRef.current = null;

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (playbackContextRef.current) {
      playbackContextRef.current.close();
      playbackContextRef.current = null;
    }

    updateState({ isRecording: false });
    console.log('[RealtimeVoice] Recording stopped');
  }, [updateState]);

  // Keep ref in sync for use in socket callbacks
  stopRecordingRef.current = stopRecording;

  // Play next chunk from the queue (defined first as it's used by playAudioChunk)
  const playNextChunk = useCallback(async () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      return;
    }

    isPlayingRef.current = true;
    const audioData = audioQueueRef.current.shift()!;

    try {
      // Use separate playback context so we can close it independently for interruption
      if (!playbackContextRef.current || playbackContextRef.current.state === 'closed') {
        playbackContextRef.current = new AudioContext({ sampleRate: 24000 });
      }

      // Convert PCM16 to Float32
      const pcm16 = new Int16Array(audioData);
      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / 32768;
      }

      // Create audio buffer
      const audioBuffer = playbackContextRef.current.createBuffer(1, float32.length, 24000);
      audioBuffer.getChannelData(0).set(float32);

      // Play
      const source = playbackContextRef.current.createBufferSource();
      source.buffer = audioBuffer;

      const gainNode = playbackContextRef.current.createGain();
      gainNode.gain.value = state.volume;

      source.connect(gainNode);
      gainNode.connect(playbackContextRef.current.destination);

      source.onended = () => {
        // Use ref to call itself to avoid stale closure
        playNextChunkRef.current();
      };

      source.start();
    } catch (error) {
      console.error('[RealtimeVoice] Audio playback error:', error);
      // Use ref to call itself
      playNextChunkRef.current();
    }
  }, [state.volume]);

  // Keep ref in sync
  playNextChunkRef.current = playNextChunk;

  // Play audio chunk - adds to queue and starts playback if not already playing
  const playAudioChunk = useCallback(async (base64Audio: string, _format: string) => {
    const audioData = base64ToArrayBuffer(base64Audio);
    audioQueueRef.current.push(audioData);

    if (!isPlayingRef.current) {
      // Use ref to call playNextChunk (in case this callback is stale)
      playNextChunkRef.current();
    }
  }, []);

  // Keep refs in sync with the actual functions (for use in socket callbacks)
  playAudioChunkRef.current = playAudioChunk;

  // Interrupt - stop assistant and start listening
  const interrupt = useCallback(() => {
    console.log('[RealtimeVoice] Manual interrupt triggered');
    socketRef.current?.emit('realtime:interrupt');
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    // Close playback context to immediately stop any playing audio
    if (playbackContextRef.current && playbackContextRef.current.state !== 'closed') {
      playbackContextRef.current.close();
      playbackContextRef.current = null;
    }
  }, []);

  // End session
  const endSession = useCallback((reason: 'user' | 'timeout' | 'error' = 'user') => {
    console.log('[RealtimeVoice] Ending session - clearing all audio');
    // Clear VAD interval
    if (vadIntervalRef.current) {
      clearInterval(vadIntervalRef.current);
      vadIntervalRef.current = null;
    }
    // Clear audio queue immediately
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    // Close playback context to stop any playing audio
    if (playbackContextRef.current && playbackContextRef.current.state !== 'closed') {
      playbackContextRef.current.close();
      playbackContextRef.current = null;
    }
    socketRef.current?.emit('realtime:end', { reason });
    stopRecording();
  }, [stopRecording]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    setState(prev => ({ ...prev, isMuted: !prev.isMuted }));
  }, []);

  // Set volume
  const setVolume = useCallback((volume: number) => {
    setState(prev => ({ ...prev, volume: Math.max(0, Math.min(1, volume)) }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('[RealtimeVoice] Component unmounting - full cleanup');
      // Clear VAD interval
      if (vadIntervalRef.current) {
        clearInterval(vadIntervalRef.current);
        vadIntervalRef.current = null;
      }
      // Clear all audio
      audioQueueRef.current = [];
      isPlayingRef.current = false;
      // Close audio contexts
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      if (playbackContextRef.current && playbackContextRef.current.state !== 'closed') {
        playbackContextRef.current.close();
        playbackContextRef.current = null;
      }
      stopRecording();
      // Remove realtime-specific listeners (don't disconnect shared socket)
      if (socketRef.current) {
        socketRef.current.off('realtime:started');
        socketRef.current.off('realtime:transcription');
        socketRef.current.off('realtime:audio');
        socketRef.current.off('realtime:status');
        socketRef.current.off('realtime:interrupted');
        socketRef.current.off('realtime:stop_audio');
        socketRef.current.off('realtime:error');
        socketRef.current.off('realtime:ended');
      }
    };
  }, [stopRecording]);

  // Auto-start if enabled
  useEffect(() => {
    if (autoStart) {
      connect();
    }
  }, [autoStart, connect]);

  return {
    ...state,
    connect,
    startSession,
    startRecording,
    stopRecording,
    interrupt,
    endSession,
    toggleMute,
    setVolume,
  };
}

// Utility functions
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
