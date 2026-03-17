/**
 * Flow Builder Modal Components
 * Templates modal and Test mode modal
 */

import React from 'react';
import { Node } from 'reactflow';
import {
  X,
  Play,
  FileText,
  Phone,
  Volume2,
  VolumeX,
  CheckCircle,
  MessageSquare,
  Sparkles,
  Mic,
  MicOff,
} from 'lucide-react';
import { FlowTemplate } from '../call-flow-builder.types';
import { flowTemplates } from '../call-flow-builder.constants';

// Templates Modal Props
interface TemplatesModalProps {
  onClose: () => void;
  onLoadTemplate: (template: FlowTemplate) => void;
  onStartFromScratch: () => void;
}

// Templates Modal
export const TemplatesModal: React.FC<TemplatesModalProps> = ({
  onClose,
  onLoadTemplate,
  onStartFromScratch,
}) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
      <div className="p-6 border-b flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Choose a Template</h2>
          <p className="text-sm text-gray-500 mt-1">Start with a pre-built flow or create from scratch</p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
          <X size={20} />
        </button>
      </div>

      <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
        {/* Blank template */}
        <button
          onClick={onStartFromScratch}
          className="w-full p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition text-left"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gray-100 rounded-lg">
              <FileText size={24} className="text-gray-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Start from Scratch</p>
              <p className="text-sm text-gray-500">Create a custom flow</p>
            </div>
          </div>
        </button>

        {/* Pre-built templates */}
        {flowTemplates.map((template) => (
          <button
            key={template.id}
            onClick={() => onLoadTemplate(template)}
            className="w-full p-4 border border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Play size={24} className="text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{template.name}</p>
                <p className="text-sm text-gray-500">{template.description}</p>
              </div>
              <div className="text-xs text-gray-400">{template.nodes.length} nodes</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  </div>
);

// Test Mode Modal Props
interface TestModeModalProps {
  testPath: Node[];
  testStep: number;
  testInput: string;
  testVariables: Record<string, string>;
  voiceEnabled: boolean;
  isSpeaking: boolean;
  isListening: boolean;
  onClose: () => void;
  onToggleVoice: () => void;
  onStopSpeaking: () => void;
  onSetTestInput: (input: string) => void;
  onNextStep: () => void;
  onStartListening: () => void;
  onStopListening: () => void;
  onReset: () => void;
  getNodeMessage: (node: Node) => string;
}

// Test Mode Modal
export const TestModeModal: React.FC<TestModeModalProps> = ({
  testPath,
  testStep,
  testInput,
  testVariables,
  voiceEnabled,
  isSpeaking,
  isListening,
  onClose,
  onToggleVoice,
  onStopSpeaking,
  onSetTestInput,
  onNextStep,
  onStartListening,
  onStopListening,
  onReset,
  getNodeMessage,
}) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-teal-500 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3 text-white">
          <div className={`w-10 h-10 bg-white/20 rounded-full flex items-center justify-center ${isSpeaking ? 'animate-pulse' : ''}`}>
            {isSpeaking ? <Volume2 size={20} /> : <Phone size={20} />}
          </div>
          <div>
            <p className="font-semibold">Test Call Simulation</p>
            <p className="text-xs text-white/80">
              {isSpeaking ? 'Speaking...' : `Step ${testStep + 1} of ${testPath.length}`}
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            onToggleVoice();
            if (voiceEnabled) onStopSpeaking();
          }}
          className="p-2 hover:bg-white/20 rounded-lg transition"
          title={voiceEnabled ? 'Mute voice' : 'Enable voice'}
        >
          {voiceEnabled ? <Volume2 size={20} className="text-white" /> : <VolumeX size={20} className="text-white" />}
        </button>
        <button
          onClick={() => {
            onStopSpeaking();
            onClose();
          }}
          className="p-2 hover:bg-white/20 rounded-lg transition"
        >
          <X size={20} className="text-white" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-200">
        <div
          className="h-full bg-green-500 transition-all duration-300"
          style={{ width: `${((testStep + 1) / testPath.length) * 100}%` }}
        />
      </div>

      {/* Chat simulation */}
      <div className="p-4 h-72 overflow-y-auto bg-gray-50">
        <div className="space-y-3">
          {testPath.slice(0, testStep + 1).map((node) => (
            <div key={node.id} className="animate-in fade-in slide-in-from-bottom-2">
              {/* AI Message */}
              <div className="flex gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                  <Sparkles size={14} className="text-white" />
                </div>
                <div className="bg-white rounded-xl rounded-tl-none px-3 py-2 shadow-sm max-w-[85%]">
                  <p className="text-sm text-gray-700">{getNodeMessage(node)}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{node.data.label}</p>
                </div>
              </div>

              {/* User response (if variable was captured) */}
              {node.type === 'question' && node.data.variableName && testVariables[node.data.variableName] && (
                <div className="flex gap-2 justify-end">
                  <div className="bg-blue-500 text-white rounded-xl rounded-tr-none px-3 py-2 shadow-sm max-w-[85%]">
                    <p className="text-sm">{testVariables[node.data.variableName]}</p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                    <MessageSquare size={14} className="text-white" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Input area */}
      <div className="p-4 border-t bg-white">
        {testPath[testStep]?.type === 'question' && testStep < testPath.length - 1 ? (
          <div className="space-y-3">
            {/* Big Mic Button - Center */}
            <div className="flex justify-center">
              <button
                onClick={isListening ? onStopListening : onStartListening}
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all transform hover:scale-105 ${
                  isListening
                    ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-200'
                    : 'bg-green-500 text-white hover:bg-green-600 shadow-lg shadow-green-200'
                }`}
                title={isListening ? 'Tap to stop' : 'Tap to speak'}
              >
                {isListening ? <MicOff size={28} /> : <Mic size={28} />}
              </button>
            </div>

            {/* Status text */}
            <p className="text-center text-sm text-gray-500">
              {isListening ? (
                <span className="text-red-500 font-medium flex items-center justify-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                  Listening... Speak now
                </span>
              ) : (
                'Tap mic to speak or type below'
              )}
            </p>

            {/* Text input row */}
            <div className="flex gap-2">
              <input
                type="text"
                value={testInput}
                onChange={(e) => onSetTestInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && testInput && onNextStep()}
                placeholder="Or type your response here..."
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-full focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
              />
              <button
                onClick={() => {
                  if (testInput) {
                    onStopListening();
                    onNextStep();
                  }
                }}
                disabled={!testInput}
                className="px-5 py-2.5 bg-green-500 text-white rounded-full hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
              >
                Send
              </button>
            </div>
          </div>
        ) : testStep < testPath.length - 1 ? (
          <button
            onClick={onNextStep}
            className="w-full py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 font-medium transition flex items-center justify-center gap-2"
          >
            Continue
            <Play size={16} />
          </button>
        ) : (
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-green-600 mb-3">
              <CheckCircle size={20} />
              <span className="font-medium">Test Complete!</span>
            </div>
            {Object.keys(testVariables).length > 0 && (
              <div className="text-left bg-gray-50 rounded-lg p-3 mb-3">
                <p className="text-xs font-medium text-gray-500 mb-2">Collected Data:</p>
                {Object.entries(testVariables).map(([key, value]) => (
                  <p key={key} className="text-sm text-gray-700">
                    <span className="font-medium">{key}:</span> {value}
                  </p>
                ))}
              </div>
            )}
            <button
              onClick={onReset}
              className="text-sm text-green-600 hover:text-green-700 font-medium"
            >
              Run Again
            </button>
          </div>
        )}
      </div>
    </div>
  </div>
);
