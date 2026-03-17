/**
 * Template Preview Components
 * UI components for template preview modal
 */

import React, { RefObject } from 'react';
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
import { Message, TemplateData, ActiveTab } from '../template-preview.types';

// Modal Header
interface ModalHeaderProps {
  template: TemplateData;
  onClose: () => void;
}

export const ModalHeader: React.FC<ModalHeaderProps> = ({ template, onClose }) => (
  <div
    className="px-6 py-4 text-white"
    style={{ background: `linear-gradient(135deg, ${template.color || '#3B82F6'}, ${template.color || '#3B82F6'}dd)` }}
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl">
          {template.icon || '?'}
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
);

// Tab Bar
interface TabBarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}

export const TabBar: React.FC<TabBarProps> = ({ activeTab, onTabChange }) => (
  <div className="flex border-b bg-gray-50">
    <button
      onClick={() => onTabChange('conversation')}
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
      onClick={() => onTabChange('voice')}
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
);

// Start Call Screen
interface StartCallScreenProps {
  template: TemplateData;
  onStartCall: () => void;
}

export const StartCallScreen: React.FC<StartCallScreenProps> = ({ template, onStartCall }) => (
  <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gradient-to-b from-gray-50 to-white">
    <div className="relative mb-6">
      <div className="w-28 h-28 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30">
        <PhoneIconSolid className="w-14 h-14 text-white" />
      </div>
      <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow text-xl">
        {template.icon || '?'}
      </div>
    </div>

    <h3 className="text-xl font-semibold text-gray-900 mb-2">
      Test Voice Call
    </h3>
    <p className="text-gray-500 text-center mb-8 max-w-xs">
      Experience a real conversation with the AI agent. Speak naturally and the AI will respond.
    </p>

    <button
      onClick={onStartCall}
      className="px-8 py-4 bg-green-500 text-white rounded-full hover:bg-green-600 transition-all hover:scale-105 shadow-lg shadow-green-500/30 flex items-center gap-3 font-medium"
    >
      <PhoneIconSolid className="w-5 h-5" />
      Start Test Call
    </button>

    <p className="text-xs text-gray-400 mt-6 text-center">
      Requires microphone permission
    </p>
  </div>
);

// Active Call Header
interface ActiveCallHeaderProps {
  template: TemplateData;
  callDuration: number;
  isPlaying: boolean;
  isRecording: boolean;
  isProcessing: boolean;
  formatDuration: (seconds: number) => string;
}

export const ActiveCallHeader: React.FC<ActiveCallHeaderProps> = ({
  template,
  callDuration,
  isPlaying,
  isRecording,
  isProcessing,
  formatDuration,
}) => (
  <div className="px-4 py-3 bg-gray-800 flex items-center justify-between">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-lg">
        {template.icon || '?'}
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
      {isPlaying ? 'Speaking' : isRecording ? 'Listening' : isProcessing ? 'Processing' : 'Ready'}
    </div>
  </div>
);

// Messages List
interface MessagesListProps {
  messages: Message[];
  currentTranscript: string;
  isProcessing: boolean;
  chatEndRef: RefObject<HTMLDivElement>;
  onReplayMessage: (audioUrl: string) => void;
}

export const MessagesList: React.FC<MessagesListProps> = ({
  messages,
  currentTranscript,
  isProcessing,
  chatEndRef,
  onReplayMessage,
}) => (
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
              onClick={() => onReplayMessage(msg.audioUrl!)}
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
);

// Call Controls
interface CallControlsProps {
  isRecording: boolean;
  isPlaying: boolean;
  isProcessing: boolean;
  onStopRecording: () => void;
  onEndCall: () => void;
}

export const CallControls: React.FC<CallControlsProps> = ({
  isRecording,
  isPlaying,
  isProcessing,
  onStopRecording,
  onEndCall,
}) => (
  <div className="p-4 bg-gray-800 border-t border-gray-700">
    <div className="flex items-center justify-center gap-6">
      {/* Mic Button */}
      {isRecording ? (
        <button
          onClick={onStopRecording}
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
        onClick={onEndCall}
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
);

// Voice Preview Tab
interface VoicePreviewTabProps {
  template: TemplateData;
  defaultGreeting: string;
  customText: string;
  isLoadingAudio: boolean;
  isPlaying: boolean;
  onCustomTextChange: (text: string) => void;
  onPlayVoice: (text?: string) => void;
  onStopVoice: () => void;
}

export const VoicePreviewTab: React.FC<VoicePreviewTabProps> = ({
  template,
  defaultGreeting,
  customText,
  isLoadingAudio,
  isPlaying,
  onCustomTextChange,
  onPlayVoice,
  onStopVoice,
}) => (
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
        onClick={() => onPlayVoice(defaultGreeting)}
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
          onClick={onStopVoice}
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
        onChange={(e) => onCustomTextChange(e.target.value)}
        placeholder="Enter any text to hear how the AI sounds..."
        className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
        rows={3}
      />
      <button
        onClick={() => onPlayVoice()}
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
);

// Modal Footer
interface ModalFooterProps {
  onClose: () => void;
}

export const ModalFooter: React.FC<ModalFooterProps> = ({ onClose }) => (
  <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between">
    <p className="text-xs text-gray-500">
      Preview mode - Deploy to create a live agent
    </p>
    <button
      onClick={onClose}
      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
    >
      Close
    </button>
  </div>
);
