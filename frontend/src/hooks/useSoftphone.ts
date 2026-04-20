/**
 * useSoftphone Hook
 * Manages browser-based softphone calling via Socket.IO + Plivo WebRTC
 *
 * Flow:
 * 1. Telecaller registers softphone session on page load
 * 2. Plivo WebRTC SDK is initialized with token
 * 3. Telecaller clicks "Call" → Backend calls customer via Plivo
 * 4. Customer answers → joins conference
 * 5. Telecaller auto-joins same conference via WebRTC
 * 6. Two-way audio between browser and customer phone
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { socketService } from '../services/socket.service';
import api from '../services/api';

// Plivo Browser SDK types
declare global {
  interface Window {
    Plivo: any;
  }
}

export type SoftphoneStatus =
  | 'idle'
  | 'registering'
  | 'ready'
  | 'initiating'
  | 'ringing'
  | 'connected'
  | 'ended'
  | 'failed'
  | 'error';

export interface SoftphoneCall {
  id: string;
  phoneNumber: string;
  contactName?: string;
  status: SoftphoneStatus;
  startedAt: Date;
  connectedAt?: Date;
  endedAt?: Date;
  duration?: number;
  error?: string;
  conferenceName?: string;
}

export interface CustomerSpeech {
  text: string;
  timestamp: string;
}

export interface SoftphoneState {
  isRegistered: boolean;
  sessionId: string | null;
  status: SoftphoneStatus;
  currentCall: SoftphoneCall | null;
  customerSpeech: CustomerSpeech[];
  error: string | null;
  webrtcReady: boolean;
  isMuted: boolean;
}

interface UseSoftphoneOptions {
  autoRegister?: boolean;
  onCallStart?: (callId: string) => void;
  onCallEnd?: (callId: string, duration?: number) => void;
  onCustomerSpeech?: (speech: CustomerSpeech) => void;
  onError?: (error: string) => void;
}

export function useSoftphone(options: UseSoftphoneOptions = {}) {
  const {
    autoRegister = true,
    onCallStart,
    onCallEnd,
    onCustomerSpeech,
    onError,
  } = options;

  const socketRef = useRef<Socket | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const plivoRef = useRef<any>(null);
  const webrtcTokenRef = useRef<string | null>(null);
  const isOnCallRef = useRef<boolean>(false);

  const [state, setState] = useState<SoftphoneState>({
    isRegistered: false,
    sessionId: null,
    status: 'idle',
    currentCall: null,
    customerSpeech: [],
    error: null,
    webrtcReady: false,
    isMuted: false,
  });

  // Update state helper
  const updateState = useCallback((updates: Partial<SoftphoneState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  // Initialize Plivo WebRTC SDK
  const initializeWebRTC = useCallback(async () => {
    try {
      // Get WebRTC token from backend
      const response = await api.get('/softphone/webrtc-token');
      if (!response.data.success || !response.data.data.token) {
        console.warn('[Softphone] WebRTC token not available');
        return false;
      }

      webrtcTokenRef.current = response.data.data.token;

      // Load Plivo Browser SDK if not already loaded
      if (!window.Plivo) {
        // Dynamically load the SDK
        const script = document.createElement('script');
        script.src = 'https://cdn.plivo.com/sdk/browser/v2/plivo.min.js';
        script.async = true;
        await new Promise<void>((resolve, reject) => {
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load Plivo SDK'));
          document.head.appendChild(script);
        });
      }

      // Initialize Plivo client
      const plivoOptions = {
        debug: 'ERROR',
        permOnClick: true,
        enableTracking: false,
        closeProtection: false,
        maxAverageBitrate: 48000,
      };

      plivoRef.current = new window.Plivo(plivoOptions);

      // Set up Plivo event handlers
      plivoRef.current.client.on('onWebrtcNotSupported', () => {
        console.error('[Softphone] WebRTC not supported in this browser');
        updateState({ error: 'WebRTC not supported in this browser' });
      });

      plivoRef.current.client.on('onLogin', () => {
        console.log('[Softphone] Plivo WebRTC logged in');
        updateState({ webrtcReady: true });
      });

      plivoRef.current.client.on('onLoginFailed', (error: any) => {
        console.error('[Softphone] Plivo login failed:', error);
        updateState({ error: 'WebRTC login failed', webrtcReady: false });
      });

      plivoRef.current.client.on('onCallRemoteRinging', () => {
        console.log('[Softphone] WebRTC call ringing');
      });

      plivoRef.current.client.on('onCallAnswered', () => {
        console.log('[Softphone] WebRTC call answered - audio connected');
      });

      plivoRef.current.client.on('onCallTerminated', () => {
        console.log('[Softphone] WebRTC call terminated');
      });

      plivoRef.current.client.on('onMediaPermission', (granted: boolean) => {
        if (!granted) {
          console.error('[Softphone] Microphone permission denied');
          updateState({ error: 'Microphone permission denied' });
        }
      });

      // Login with JWT token
      plivoRef.current.client.login(webrtcTokenRef.current);
      console.log('[Softphone] Plivo WebRTC initialized');

      return true;
    } catch (error) {
      console.error('[Softphone] WebRTC initialization error:', error);
      return false;
    }
  }, [updateState]);

  // Join conference via WebRTC
  const joinConference = useCallback(async (conferenceName: string) => {
    if (!plivoRef.current || !state.webrtcReady) {
      console.warn('[Softphone] WebRTC not ready, cannot join conference');
      return false;
    }

    try {
      console.log(`[Softphone] Joining conference via WebRTC: ${conferenceName}`);

      // Make outbound call to conference
      // The destination is the conference name which Plivo will route correctly
      const extraHeaders = {
        'X-PH-conferenceName': conferenceName,
        'X-PH-Role': 'telecaller',
      };

      plivoRef.current.client.call(`sip:${conferenceName}@phone.plivo.com`, extraHeaders);

      return true;
    } catch (error) {
      console.error('[Softphone] Error joining conference:', error);
      return false;
    }
  }, [state.webrtcReady]);

  // Leave conference
  const leaveConference = useCallback(() => {
    if (plivoRef.current) {
      try {
        plivoRef.current.client.hangup();
      } catch (error) {
        console.error('[Softphone] Error leaving conference:', error);
      }
    }
  }, []);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (plivoRef.current) {
      if (state.isMuted) {
        plivoRef.current.client.unmute();
      } else {
        plivoRef.current.client.mute();
      }
      updateState({ isMuted: !state.isMuted });
    }
  }, [state.isMuted, updateState]);

  // Setup socket event listeners
  const setupListeners = useCallback(
    (socket: Socket) => {
      // Remove existing listeners to avoid duplicates
      socket.off('softphone:registered');
      socket.off('softphone:call_status');
      socket.off('softphone:customer_speech');
      socket.off('softphone:error');

      // Handle registration success
      socket.on('softphone:registered', (data: { sessionId: string; status: string }) => {
        console.log('[Softphone] Registered:', data.sessionId);
        sessionIdRef.current = data.sessionId;
        updateState({
          isRegistered: true,
          sessionId: data.sessionId,
          status: 'ready',
          error: null,
        });

        // Initialize WebRTC after socket registration
        initializeWebRTC();
      });

      // Handle call status updates
      socket.on(
        'softphone:call_status',
        (data: {
          callId: string;
          status: string;
          phoneNumber?: string;
          contactName?: string;
          conferenceName?: string;
          error?: string;
          reason?: string;
          duration?: number;
          recordingUrl?: string;
        }) => {
          console.log('[Softphone] Call status:', data.status, data);

          const newStatus = data.status as SoftphoneStatus;

          if (newStatus === 'initiating' || newStatus === 'ringing') {
            const call: SoftphoneCall = {
              id: data.callId,
              phoneNumber: data.phoneNumber || '',
              contactName: data.contactName,
              status: newStatus,
              startedAt: new Date(),
              conferenceName: data.conferenceName,
            };
            isOnCallRef.current = true;
            updateState({
              status: newStatus,
              currentCall: call,
              customerSpeech: [],
              error: null,
            });
          } else if (newStatus === 'connected') {
            setState((prev) => {
              // If we don't have a current call, create one from the event data
              const call: SoftphoneCall = prev.currentCall
                ? {
                    ...prev.currentCall,
                    status: 'connected',
                    connectedAt: new Date(),
                    conferenceName: data.conferenceName || prev.currentCall.conferenceName,
                  }
                : {
                    // Fallback: create call from event data if currentCall is missing
                    id: data.callId,
                    phoneNumber: data.phoneNumber || '',
                    contactName: data.contactName,
                    status: 'connected',
                    startedAt: new Date(),
                    connectedAt: new Date(),
                    conferenceName: data.conferenceName,
                  };

              return {
                ...prev,
                status: 'connected',
                currentCall: call,
              };
            });
            onCallStart?.(data.callId);

            // Auto-join conference via WebRTC when customer answers
            if (data.conferenceName && state.webrtcReady) {
              console.log('[Softphone] Customer answered, joining conference via WebRTC');
              joinConference(data.conferenceName);
            }
          } else if (newStatus === 'ended') {
            // Leave WebRTC conference
            leaveConference();
            isOnCallRef.current = false;

            setState((prev) => ({
              ...prev,
              status: 'ready',
              currentCall: prev.currentCall
                ? {
                    ...prev.currentCall,
                    status: 'ended',
                    endedAt: new Date(),
                    duration: data.duration,
                  }
                : null,
              isMuted: false,
            }));
            onCallEnd?.(data.callId, data.duration);

            // Clear call after a short delay
            setTimeout(() => {
              updateState({ currentCall: null, customerSpeech: [] });
            }, 2000);
          } else if (newStatus === 'failed') {
            leaveConference();
            isOnCallRef.current = false;

            const errorMsg = data.error || data.reason || 'Call failed';
            setState((prev) => ({
              ...prev,
              status: 'ready',
              currentCall: prev.currentCall
                ? {
                    ...prev.currentCall,
                    status: 'failed',
                    error: errorMsg,
                  }
                : null,
              error: errorMsg,
              isMuted: false,
            }));
            onError?.(errorMsg);

            // Clear call after a short delay
            setTimeout(() => {
              updateState({ currentCall: null, error: null });
            }, 3000);
          }
        }
      );

      // Handle customer speech transcription
      socket.on(
        'softphone:customer_speech',
        (data: { callId: string; text: string; timestamp: string }) => {
          console.log('[Softphone] Customer speech:', data.text);
          const speech: CustomerSpeech = {
            text: data.text,
            timestamp: data.timestamp,
          };
          setState((prev) => ({
            ...prev,
            customerSpeech: [...prev.customerSpeech, speech],
          }));
          onCustomerSpeech?.(speech);
        }
      );

      // Handle errors
      socket.on('softphone:error', (data: { message: string }) => {
        console.error('[Softphone] Error:', data.message);
        updateState({ error: data.message, status: 'error' });
        onError?.(data.message);
      });
    },
    [updateState, onCallStart, onCallEnd, onCustomerSpeech, onError, initializeWebRTC, joinConference, leaveConference, state.webrtcReady]
  );

  // Register softphone session
  const register = useCallback(async () => {
    try {
      updateState({ status: 'registering', error: null });

      // Connect to socket
      const socket = await socketService.connectAsync();
      if (!socket) {
        throw new Error('Failed to connect to server');
      }

      socketRef.current = socket;
      setupListeners(socket);

      // Register softphone session
      socket.emit('softphone:register', {});
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Registration failed';
      updateState({ status: 'error', error: errorMsg });
      onError?.(errorMsg);
    }
  }, [setupListeners, updateState, onError]);

  // Unregister softphone session
  const unregister = useCallback((force = false) => {
    // Don't unregister if there's an active call (unless forced)
    if (!force && isOnCallRef.current) {
      console.log('[Softphone] Skipping unregister - call in progress');
      return;
    }

    isOnCallRef.current = false;
    // Leave any active conference
    leaveConference();

    // Logout from Plivo WebRTC
    if (plivoRef.current) {
      try {
        plivoRef.current.client.logout();
      } catch (e) {
        // Ignore logout errors
      }
      plivoRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.emit('softphone:unregister');
      socketRef.current.off('softphone:registered');
      socketRef.current.off('softphone:call_status');
      socketRef.current.off('softphone:customer_speech');
      socketRef.current.off('softphone:error');
    }
    sessionIdRef.current = null;
    webrtcTokenRef.current = null;
    updateState({
      isRegistered: false,
      sessionId: null,
      status: 'idle',
      currentCall: null,
      customerSpeech: [],
      webrtcReady: false,
      isMuted: false,
    });
  }, [updateState, leaveConference]);

  // Initiate a call
  const initiateCall = useCallback(
    async (params: {
      phoneNumber: string;
      contactName?: string;
      leadId?: string;
      campaignId?: string;
      contactId?: string;
    }) => {
      const currentSessionId = sessionIdRef.current;

      if (!currentSessionId) {
        const error = 'Softphone not registered';
        updateState({ error });
        onError?.(error);
        return { success: false, error };
      }

      if (state.currentCall) {
        const error = 'Already on a call';
        updateState({ error });
        onError?.(error);
        return { success: false, error };
      }

      // Check WebRTC readiness - warn but don't block
      if (!state.webrtcReady) {
        console.warn('[Softphone] WebRTC not ready - call will proceed but audio may not work');
      }

      try {
        updateState({ status: 'initiating', error: null });

        console.log('[Softphone] Initiating call with sessionId:', currentSessionId);
        const response = await api.post('/softphone/call', {
          ...params,
          sessionId: currentSessionId,
        });

        if (response.data.success) {
          return {
            success: true,
            callId: response.data.data.callId,
            conferenceName: response.data.data.conferenceName,
          };
        } else {
          const error = response.data.message || 'Failed to initiate call';
          updateState({ status: 'ready', error });
          onError?.(error);
          return { success: false, error };
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to initiate call';
        updateState({ status: 'ready', error: errorMsg });
        onError?.(errorMsg);
        return { success: false, error: errorMsg };
      }
    },
    [state.currentCall, state.webrtcReady, updateState, onError]
  );

  // End current call
  const endCall = useCallback(async () => {
    const currentSessionId = sessionIdRef.current;
    if (!state.currentCall || !currentSessionId) {
      return;
    }

    // Leave WebRTC conference first
    leaveConference();

    try {
      await api.post(`/softphone/call/${state.currentCall.id}/end`, {
        sessionId: currentSessionId,
      });
    } catch (error) {
      console.error('[Softphone] Error ending call:', error);
    }
  }, [state.currentCall, leaveConference]);

  // Auto-register on mount if enabled
  useEffect(() => {
    if (autoRegister) {
      register();
    }

    return () => {
      unregister();
    };
  }, [autoRegister]); // eslint-disable-line react-hooks/exhaustive-deps

  // Get formatted call duration
  const getCallDuration = useCallback(() => {
    if (!state.currentCall?.connectedAt) {
      return '00:00';
    }

    const endTime = state.currentCall.endedAt || new Date();
    const durationSec = Math.floor(
      (endTime.getTime() - state.currentCall.connectedAt.getTime()) / 1000
    );
    const minutes = Math.floor(durationSec / 60);
    const seconds = durationSec % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [state.currentCall]);

  return {
    // State
    isRegistered: state.isRegistered,
    sessionId: state.sessionId,
    status: state.status,
    currentCall: state.currentCall,
    customerSpeech: state.customerSpeech,
    error: state.error,
    webrtcReady: state.webrtcReady,
    isMuted: state.isMuted,

    // Computed
    isOnCall: !!state.currentCall && ['connected', 'ringing'].includes(state.currentCall.status),
    canCall: state.isRegistered && state.status === 'ready' && !state.currentCall,

    // Actions
    register,
    unregister,
    initiateCall,
    endCall,
    toggleMute,
    getCallDuration,

    // Helpers
    clearError: () => updateState({ error: null }),
  };
}

export default useSoftphone;
