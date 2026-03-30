import React, { useRef, useState, useEffect } from 'react';
import { Plus, ChevronDown, Mic } from 'lucide-react';
import type { AgentFormData } from '../types/voiceAgent.types';
import { availableVariables, voiceOptions, languageOptions } from '../constants/voiceAgent.constants';

interface ConfigureTabContentProps {
  formData: AgentFormData;
  onUpdateFormData: (updates: Partial<AgentFormData>) => void;
  onOpenVoicePanel: () => void;
  onOpenLanguagePanel: () => void;
}

export const ConfigureTabContent: React.FC<ConfigureTabContentProps> = ({
  formData,
  onUpdateFormData,
  onOpenVoicePanel,
  onOpenLanguagePanel,
}) => {
  const promptTextareaRef = useRef<HTMLTextAreaElement>(null);
  const greetingTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [showVariableDropdown, setShowVariableDropdown] = useState<'prompt' | 'greeting' | null>(null);

  const selectedVoice = voiceOptions.find(v => v.id === formData.voiceId);
  const selectedLanguage = languageOptions.find(l => l.id === formData.language);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showVariableDropdown) {
        const target = e.target as HTMLElement;
        if (!target.closest('.variable-dropdown-container')) {
          setShowVariableDropdown(null);
        }
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showVariableDropdown]);

  const insertVariable = (field: 'prompt' | 'greeting', variableKey: string) => {
    const ref = field === 'prompt' ? promptTextareaRef : greetingTextareaRef;
    const textarea = ref.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentValue = field === 'prompt' ? formData.systemPrompt : formData.greeting;
    const variable = `{{${variableKey}}}`;

    const newValue = currentValue.substring(0, start) + variable + currentValue.substring(end);

    if (field === 'prompt') {
      onUpdateFormData({ systemPrompt: newValue });
    } else {
      onUpdateFormData({ greeting: newValue });
    }

    setShowVariableDropdown(null);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + variable.length, start + variable.length);
    }, 0);
  };

  const VariableDropdown = ({ field }: { field: 'prompt' | 'greeting' }) => (
    <div className="absolute right-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
      <div className="px-3 py-2 text-xs font-medium text-gray-500 border-b">
        Insert Variable
      </div>
      {availableVariables.map((variable) => (
        <button
          key={variable.key}
          onClick={() => insertVariable(field, variable.key)}
          className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center justify-between"
        >
          <span className="text-sm text-gray-900">{variable.label}</span>
          <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
            {`{{${variable.key}}}`}
          </code>
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Agent Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Agent Name
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => onUpdateFormData({ name: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="e.g., Sales Assistant"
        />
      </div>

      {/* Voice & Language Selection */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Voice
          </label>
          <button
            onClick={onOpenVoicePanel}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-left flex items-center justify-between hover:border-gray-400 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Mic className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-medium text-gray-900">
                  {selectedVoice?.name || formData.voiceName}
                </div>
                <div className="text-sm text-gray-500">
                  {selectedVoice?.description || 'Select voice'}
                </div>
              </div>
            </div>
            <ChevronDown className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Language
          </label>
          <button
            onClick={onOpenLanguagePanel}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-left flex items-center justify-between hover:border-gray-400 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{selectedLanguage?.flag || '🌐'}</span>
              <span className="font-medium text-gray-900">
                {selectedLanguage?.name || 'Select language'}
              </span>
            </div>
            <ChevronDown className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Greeting Message */}
      <div className="variable-dropdown-container relative">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Greeting Message
          </label>
          <button
            onClick={() => setShowVariableDropdown(showVariableDropdown === 'greeting' ? null : 'greeting')}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Insert Variable
          </button>
        </div>
        {showVariableDropdown === 'greeting' && <VariableDropdown field="greeting" />}
        <textarea
          ref={greetingTextareaRef}
          value={formData.greeting}
          onChange={(e) => onUpdateFormData({ greeting: e.target.value })}
          rows={3}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Hello! Welcome to our service. How can I help you today?"
        />
        <p className="mt-1 text-xs text-gray-500">
          This is the first message the agent will say when answering a call.
        </p>
      </div>

      {/* System Prompt */}
      <div className="variable-dropdown-container relative">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            System Prompt / Instructions
          </label>
          <button
            onClick={() => setShowVariableDropdown(showVariableDropdown === 'prompt' ? null : 'prompt')}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Insert Variable
          </button>
        </div>
        {showVariableDropdown === 'prompt' && <VariableDropdown field="prompt" />}
        <textarea
          ref={promptTextareaRef}
          value={formData.systemPrompt}
          onChange={(e) => onUpdateFormData({ systemPrompt: e.target.value })}
          rows={8}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
          placeholder="You are a helpful AI assistant for [Company Name]..."
        />
        <p className="mt-1 text-xs text-gray-500">
          Define how the agent should behave, what information to collect, and how to handle different scenarios.
        </p>
      </div>

      {/* Widget Customization */}
      <div className="border-t pt-6">
        <h3 className="font-medium text-gray-900 mb-4">Widget Appearance</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Widget Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={formData.widgetColor}
                onChange={(e) => onUpdateFormData({ widgetColor: e.target.value })}
                className="w-12 h-12 rounded-lg cursor-pointer border-0"
              />
              <input
                type="text"
                value={formData.widgetColor}
                onChange={(e) => onUpdateFormData({ widgetColor: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Widget Title
            </label>
            <input
              type="text"
              value={formData.widgetTitle}
              onChange={(e) => onUpdateFormData({ widgetTitle: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Chat with us"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
