import { useState, useEffect, useCallback, useRef } from 'react';
import { NativeModules, NativeEventEmitter, Linking, Platform, Alert } from 'react-native';
import { useAppDispatch, useAppSelector } from '../store';
import {
  startCall,
  updateCall,
  uploadRecording,
  setIsRecording,
  setCallDuration,
  incrementCallDuration,
  resetCallState,
  addPendingUpload,
} from '../store/slices/callsSlice';
import { requestCallPermissions } from '../utils/permissions';
import { Lead, CallOutcome, StartCallPayload, UpdateCallPayload } from '../types';

// Native module interface (will be implemented in Java)
interface CallRecordingModuleType {
  startRecording: (callId: string) => Promise<string>;
  stopRecording: () => Promise<{ path: string; duration: number }>;
  isRecording: () => Promise<boolean>;
  getRecordingPath: () => Promise<string | null>;
}

// Get native module (fallback to mock for development)
const CallRecordingModule: CallRecordingModuleType = NativeModules.CallRecording || {
  startRecording: async () => '/mock/recording/path.m4a',
  stopRecording: async () => ({ path: '/mock/recording/path.m4a', duration: 0 }),
  isRecording: async () => false,
  getRecordingPath: async () => null,
};

interface UseCallRecordingReturn {
  currentCall: any;
  isRecording: boolean;
  callDuration: number;
  isLoading: boolean;
  error: string | null;
  recordingPath: string | null;
  initiateCall: (lead: Lead) => Promise<boolean>;
  endCall: () => Promise<void>;
  submitOutcome: (outcome: CallOutcome, notes?: string) => Promise<boolean>;
  cancelCall: () => void;
}

export const useCallRecording = (): UseCallRecordingReturn => {
  const dispatch = useAppDispatch();
  const { currentCall, isRecording, callDuration, isLoading, error } = useAppSelector(
    (state) => state.calls
  );

  const [recordingPath, setRecordingPath] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const callStartTimeRef = useRef<number | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Start call duration timer
  const startTimer = useCallback(() => {
    callStartTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      dispatch(incrementCallDuration());
    }, 1000);
  }, [dispatch]);

  // Stop call duration timer
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Initiate a call
  const initiateCall = useCallback(
    async (lead: Lead): Promise<boolean> => {
      try {
        // Request permissions first
        const hasPermissions = await requestCallPermissions();
        if (!hasPermissions) {
          Alert.alert(
            'Permissions Required',
            'Please grant the required permissions to make calls and record.',
          );
          return false;
        }

        // Create call record in backend
        const payload: StartCallPayload = {
          leadId: lead.id,
          phoneNumber: lead.phone,
        };

        const call = await dispatch(startCall(payload)).unwrap();

        // Start recording
        try {
          const path = await CallRecordingModule.startRecording(call.id);
          setRecordingPath(path);
          dispatch(setIsRecording(true));
        } catch (recordingError) {
          console.warn('Failed to start recording:', recordingError);
          // Continue without recording
        }

        // Open phone dialer
        const phoneUrl = Platform.select({
          android: `tel:${lead.phone}`,
          ios: `tel://${lead.phone}`,
          default: `tel:${lead.phone}`,
        });

        const canOpen = await Linking.canOpenURL(phoneUrl);
        if (canOpen) {
          await Linking.openURL(phoneUrl);
        } else {
          Alert.alert('Error', 'Cannot open phone dialer');
          return false;
        }

        // Start timer
        startTimer();

        return true;
      } catch (err) {
        console.error('Error initiating call:', err);
        Alert.alert('Error', 'Failed to initiate call. Please try again.');
        return false;
      }
    },
    [dispatch, startTimer]
  );

  // End call (stop recording, stop timer)
  const endCall = useCallback(async (): Promise<void> => {
    // Stop timer
    stopTimer();

    // Stop recording
    if (isRecording) {
      try {
        const result = await CallRecordingModule.stopRecording();
        setRecordingPath(result.path);
        dispatch(setIsRecording(false));
      } catch (err) {
        console.warn('Failed to stop recording:', err);
      }
    }
  }, [dispatch, isRecording, stopTimer]);

  // Submit call outcome
  const submitOutcome = useCallback(
    async (outcome: CallOutcome, notes?: string): Promise<boolean> => {
      if (!currentCall) {
        console.error('No current call to submit outcome for');
        return false;
      }

      try {
        const payload: UpdateCallPayload = {
          outcome,
          notes,
          duration: callDuration,
        };

        await dispatch(updateCall({ callId: currentCall.id, payload })).unwrap();

        // Upload recording in background if available
        if (recordingPath) {
          dispatch(
            addPendingUpload({
              callId: currentCall.id,
              recordingPath,
            })
          );

          // Try to upload immediately
          dispatch(
            uploadRecording({
              callId: currentCall.id,
              recordingPath,
            })
          ).catch((err) => {
            console.warn('Recording upload failed, will retry later:', err);
          });
        }

        // Reset state
        dispatch(resetCallState());
        setRecordingPath(null);

        return true;
      } catch (err) {
        console.error('Error submitting outcome:', err);
        Alert.alert('Error', 'Failed to save call outcome. Please try again.');
        return false;
      }
    },
    [currentCall, callDuration, recordingPath, dispatch]
  );

  // Cancel call without saving
  const cancelCall = useCallback(() => {
    stopTimer();
    dispatch(resetCallState());
    setRecordingPath(null);
  }, [dispatch, stopTimer]);

  return {
    currentCall,
    isRecording,
    callDuration,
    isLoading,
    error,
    recordingPath,
    initiateCall,
    endCall,
    submitOutcome,
    cancelCall,
  };
};

export default useCallRecording;
