package com.telecallerapptemp.callrecording;

import android.media.MediaRecorder;
import android.util.Log;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;

import java.io.File;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class CallRecordingModule extends ReactContextBaseJavaModule {
    private static final String TAG = "CallRecordingModule";
    private static final String MODULE_NAME = "CallRecording";

    private MediaRecorder mediaRecorder;
    private String currentRecordingPath;
    private boolean isRecording = false;
    private long recordingStartTime;

    public CallRecordingModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return MODULE_NAME;
    }

    @ReactMethod
    public void startRecording(String callId, Promise promise) {
        if (isRecording) {
            promise.reject("ALREADY_RECORDING", "A recording is already in progress");
            return;
        }

        try {
            File recordingsDir = new File(getReactApplicationContext().getFilesDir(), "recordings");
            if (!recordingsDir.exists()) {
                recordingsDir.mkdirs();
            }

            String timestamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(new Date());
            String filename = "call_" + callId + "_" + timestamp + ".m4a";
            File recordingFile = new File(recordingsDir, filename);
            currentRecordingPath = recordingFile.getAbsolutePath();

            mediaRecorder = new MediaRecorder();
            mediaRecorder.setAudioSource(MediaRecorder.AudioSource.MIC);
            mediaRecorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4);
            mediaRecorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC);
            mediaRecorder.setAudioSamplingRate(44100);
            mediaRecorder.setAudioEncodingBitRate(128000);
            mediaRecorder.setOutputFile(currentRecordingPath);

            mediaRecorder.prepare();
            mediaRecorder.start();

            isRecording = true;
            recordingStartTime = System.currentTimeMillis();

            Log.d(TAG, "Recording started: " + currentRecordingPath);
            promise.resolve(currentRecordingPath);

        } catch (IOException e) {
            Log.e(TAG, "Failed to start recording", e);
            cleanupRecorder();
            promise.reject("RECORDING_ERROR", "Failed to start recording: " + e.getMessage());
        } catch (Exception e) {
            Log.e(TAG, "Unexpected error starting recording", e);
            cleanupRecorder();
            promise.reject("RECORDING_ERROR", "Unexpected error: " + e.getMessage());
        }
    }

    @ReactMethod
    public void stopRecording(Promise promise) {
        if (!isRecording || mediaRecorder == null) {
            promise.reject("NOT_RECORDING", "No recording in progress");
            return;
        }

        try {
            mediaRecorder.stop();
            mediaRecorder.release();
            mediaRecorder = null;
            isRecording = false;

            long duration = (System.currentTimeMillis() - recordingStartTime) / 1000;

            WritableMap result = Arguments.createMap();
            result.putString("path", currentRecordingPath);
            result.putDouble("duration", duration);

            Log.d(TAG, "Recording stopped. Duration: " + duration + "s");
            promise.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "Failed to stop recording", e);
            cleanupRecorder();
            promise.reject("STOP_ERROR", "Failed to stop recording: " + e.getMessage());
        }
    }

    @ReactMethod
    public void isRecording(Promise promise) {
        promise.resolve(isRecording);
    }

    @ReactMethod
    public void getRecordingPath(Promise promise) {
        if (currentRecordingPath != null && isRecording) {
            promise.resolve(currentRecordingPath);
        } else {
            promise.resolve(null);
        }
    }

    private void cleanupRecorder() {
        if (mediaRecorder != null) {
            try {
                mediaRecorder.release();
            } catch (Exception e) {
                // Ignore
            }
            mediaRecorder = null;
        }
        isRecording = false;
    }
}
