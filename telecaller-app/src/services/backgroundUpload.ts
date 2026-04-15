import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';

const { BackgroundUpload } = NativeModules;

interface UploadSuccessEvent {
  callId: string;
  recordingUrl: string;
}

interface UploadErrorEvent {
  callId: string;
  error: string;
}

interface UploadProgressEvent {
  callId: string;
  progress: number;
}

type UploadCallback = {
  onSuccess?: (callId: string, recordingUrl: string) => void;
  onError?: (callId: string, error: string) => void;
  onProgress?: (callId: string, progress: number) => void;
};

class BackgroundUploadService {
  private eventEmitter: NativeEventEmitter | null = null;
  private callbacks: Map<string, UploadCallback> = new Map();
  private isInitialized = false;

  constructor() {
    if (Platform.OS === 'android' && BackgroundUpload) {
      this.eventEmitter = new NativeEventEmitter(BackgroundUpload);
      this.setupListeners();
      this.isInitialized = true;
      console.log('[BackgroundUpload] Service initialized');
    } else {
      console.warn('[BackgroundUpload] Native module not available');
    }
  }

  private setupListeners() {
    if (!this.eventEmitter) return;

    this.eventEmitter.addListener('onUploadSuccess', (event: UploadSuccessEvent) => {
      console.log('[BackgroundUpload] Upload success:', event.callId, event.recordingUrl);
      const callback = this.callbacks.get(event.callId);
      if (callback?.onSuccess) {
        callback.onSuccess(event.callId, event.recordingUrl);
      }
      this.callbacks.delete(event.callId);
    });

    this.eventEmitter.addListener('onUploadError', (event: UploadErrorEvent) => {
      console.log('[BackgroundUpload] Upload error:', event.callId, event.error);
      const callback = this.callbacks.get(event.callId);
      if (callback?.onError) {
        callback.onError(event.callId, event.error);
      }
      this.callbacks.delete(event.callId);
    });

    this.eventEmitter.addListener('onUploadProgress', (event: UploadProgressEvent) => {
      console.log('[BackgroundUpload] Upload progress:', event.callId, event.progress + '%');
      const callback = this.callbacks.get(event.callId);
      if (callback?.onProgress) {
        callback.onProgress(event.callId, event.progress);
      }
    });
  }

  async uploadRecording(
    filePath: string,
    callId: string,
    dataId: string | null,
    duration: number,
    callback?: UploadCallback
  ): Promise<boolean> {
    if (!this.isInitialized || !BackgroundUpload) {
      console.warn('[BackgroundUpload] Service not available, falling back to normal upload');
      return false;
    }

    try {
      // Get auth token (using the same key as the rest of the app)
      const authToken = await AsyncStorage.getItem('@telecaller/auth_token');
      if (!authToken) {
        console.error('[BackgroundUpload] No auth token found');
        return false;
      }

      // Get API base URL (remove /api suffix for the native module)
      const apiUrl = API_URL;

      console.log('[BackgroundUpload] Starting background upload:');
      console.log('  File:', filePath);
      console.log('  Call ID:', callId);
      console.log('  Data ID:', dataId);
      console.log('  Duration:', duration);
      console.log('  API URL:', apiUrl);

      // Store callback
      if (callback) {
        this.callbacks.set(callId, callback);
      }

      // Start background upload
      await BackgroundUpload.uploadRecording(
        filePath,
        callId,
        dataId || '',
        Math.round(duration),
        apiUrl,
        authToken
      );

      console.log('[BackgroundUpload] Background upload started successfully');
      return true;

    } catch (error) {
      console.error('[BackgroundUpload] Failed to start upload:', error);
      return false;
    }
  }

  isAvailable(): boolean {
    return this.isInitialized && BackgroundUpload !== null;
  }
}

export const backgroundUploadService = new BackgroundUploadService();
export default backgroundUploadService;
