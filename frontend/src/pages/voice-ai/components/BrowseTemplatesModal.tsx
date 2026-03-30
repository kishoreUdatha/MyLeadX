/**
 * Browse Templates Modal Component
 * Modal for browsing and selecting voice agent templates
 */

import React from 'react';
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlayIcon,
  PauseIcon,
  SpeakerWaveIcon,
  PaperAirplaneIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { VoiceTemplate, ChatMessage } from '../voice-agents.types';
import {
  industryLabels,
  industryIcons,
  industryColors,
  categoryFilters,
  industryWorkflowContent,
  getQuestions,
  getFaqs,
} from '../voice-agents.constants';

interface BrowseTemplatesModalProps {
  templates: VoiceTemplate[];
  filteredTemplates: VoiceTemplate[];
  selectedTemplate: VoiceTemplate | null;
  templateSearch: string;
  selectedCategory: string;
  previewTab: 'workflow' | 'preview';
  previewLoading: boolean;
  isPlayingGreeting: boolean;
  chatMessages: ChatMessage[];
  chatInput: string;
  isSendingMessage: boolean;
  audioRef: React.RefObject<HTMLAudioElement>;
  chatEndRef: React.RefObject<HTMLDivElement>;
  onClose: () => void;
  onTemplateSearch: (search: string) => void;
  onCategoryChange: (category: string) => void;
  onTemplateSelect: (template: VoiceTemplate) => void;
  onPreviewTabChange: (tab: 'workflow' | 'preview') => void;
  onUseTemplate: (template: VoiceTemplate) => void;
  onViewDetails: (template: VoiceTemplate) => void;
  onPlayGreeting: () => void;
  onChatInputChange: (input: string) => void;
  onSendMessage: () => void;
  onInitializeTemplates: () => void;
}

export const BrowseTemplatesModal: React.FC<BrowseTemplatesModalProps> = ({
  templates,
  filteredTemplates,
  selectedTemplate,
  templateSearch,
  selectedCategory,
  previewTab,
  previewLoading,
  isPlayingGreeting,
  chatMessages,
  chatInput,
  isSendingMessage,
  audioRef,
  chatEndRef,
  onClose,
  onTemplateSearch,
  onCategoryChange,
  onTemplateSelect,
  onPreviewTabChange,
  onUseTemplate,
  onViewDetails,
  onPlayGreeting,
  onChatInputChange,
  onSendMessage,
  onInitializeTemplates,
}) => {
  const workflowContent = selectedTemplate
    ? industryWorkflowContent[selectedTemplate.industry] || industryWorkflowContent.CUSTOMER_CARE
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl flex" style={{ height: '85vh' }}>
        {/* Left Panel - Template List */}
        <div className="w-1/2 border-r border-gray-200 flex flex-col" style={{ height: '100%' }}>
          {/* Header */}
          <div className="p-6 border-b border-gray-100 flex-shrink-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Browse templates</h2>
            </div>

            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search templates"
                value={templateSearch}
                onChange={(e) => onTemplateSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-transparent"
              />
            </div>
          </div>

          {/* Category Filters */}
          <div className="px-6 py-3 border-b border-gray-100 flex-shrink-0">
            <div
              className="flex items-center gap-2 pb-1"
              style={{ overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {categoryFilters.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => onCategoryChange(cat.key)}
                  className={`px-3 py-1.5 text-sm rounded-full whitespace-nowrap flex-shrink-0 transition-colors ${
                    selectedCategory === cat.key
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Scroll indicator */}
            <div className="flex items-center justify-center gap-2 mt-2">
              <ChevronLeftIcon className="w-4 h-4 text-gray-400" />
              <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                <div className="w-3/5 h-full bg-gray-400 rounded-full"></div>
              </div>
              <ChevronRightIcon className="w-4 h-4 text-gray-400" />
            </div>
          </div>

          {/* Template List */}
          <div className="flex-1 p-4" style={{ overflowY: 'auto', minHeight: 0 }}>
            {templates.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-gray-500 mb-4">No templates available.</p>
                <button
                  onClick={onInitializeTemplates}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm font-medium"
                >
                  Load default templates
                </button>
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-gray-500">No templates match your search.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {filteredTemplates.map((template) => (
                  <div
                    key={template.id}
                    onClick={() => onTemplateSelect(template)}
                    className={`p-4 border rounded-xl cursor-pointer transition-all ${
                      selectedTemplate?.id === template.id
                        ? 'border-gray-900 bg-gray-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{template.icon || industryIcons[template.industry] || '🤖'}</span>
                      <span className="font-medium text-gray-900 text-sm truncate">
                        {template.name}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2">
                      {template.description || 'No description'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Preview */}
        <div className="w-1/2 flex flex-col bg-gray-50" style={{ height: '100%' }}>
          {/* Preview Header */}
          <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-1">
              <button
                onClick={() => onPreviewTabChange('workflow')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  previewTab === 'workflow'
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Workflow
              </button>
              <button
                onClick={() => onPreviewTabChange('preview')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  previewTab === 'preview'
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Preview
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => selectedTemplate && onUseTemplate(selectedTemplate)}
                disabled={!selectedTemplate}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Use template
              </button>
              <button
                onClick={() => selectedTemplate && onViewDetails(selectedTemplate)}
                disabled={!selectedTemplate}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                View details
              </button>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Preview Content */}
          <div className="flex-1 overflow-y-auto p-4" style={{ minHeight: 0 }}>
            {!selectedTemplate ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500 text-sm">Select a template to preview</p>
              </div>
            ) : previewLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-gray-600"></div>
              </div>
            ) : previewTab === 'workflow' ? (
              <WorkflowPreview
                template={selectedTemplate}
                workflowContent={workflowContent}
              />
            ) : (
              <VoicePreview
                template={selectedTemplate}
                isPlayingGreeting={isPlayingGreeting}
                chatMessages={chatMessages}
                chatInput={chatInput}
                isSendingMessage={isSendingMessage}
                chatEndRef={chatEndRef}
                onPlayGreeting={onPlayGreeting}
                onChatInputChange={onChatInputChange}
                onSendMessage={onSendMessage}
              />
            )}
          </div>
        </div>
      </div>

      {/* Hidden audio element */}
      <audio ref={audioRef} className="hidden" />
    </div>
  );
};

// Workflow Preview Sub-component
interface WorkflowPreviewProps {
  template: VoiceTemplate;
  workflowContent: typeof industryWorkflowContent[string] | null;
}

const WorkflowPreview: React.FC<WorkflowPreviewProps> = ({ template, workflowContent }) => {
  if (!workflowContent) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500 text-sm">No workflow available</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-full flex flex-col items-center py-4">
      {/* Start Node */}
      <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm">
        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
        </svg>
        <span className="text-sm font-medium text-gray-700">Start</span>
      </div>
      <div className="w-0.5 h-6 bg-gray-300"></div>

      {/* Welcome Node */}
      <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center">
          <span className="text-blue-600 text-xs">{template.icon || industryIcons[template.industry] || '👋'}</span>
        </div>
        <span className="text-sm font-medium text-gray-700">{workflowContent.welcomeLabel}</span>
      </div>
      <div className="w-0.5 h-6 bg-gray-300"></div>

      {/* Branch Conditions */}
      <div className="flex flex-col items-center w-full">
        <div className="flex gap-2 mb-2 flex-wrap justify-center">
          <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full">
            <span className="text-xs text-amber-700">{workflowContent.branches.left}</span>
          </div>
          <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full">
            <span className="text-xs text-amber-700">{workflowContent.branches.right}</span>
          </div>
        </div>

        {/* Branch Lines */}
        <div className="relative w-48 h-8">
          <svg className="absolute inset-0" width="100%" height="100%">
            <path d="M 96 0 L 96 10 L 48 10 L 48 32" stroke="#D1D5DB" strokeWidth="2" fill="none" />
            <path d="M 96 0 L 96 10 L 144 10 L 144 32" stroke="#D1D5DB" strokeWidth="2" fill="none" />
          </svg>
        </div>

        {/* Branch Nodes */}
        <div className="flex gap-6 mt-1">
          {/* Left Branch */}
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center text-xs">
                {workflowContent.leftBranch.icon}
              </div>
              <span className="text-xs font-medium text-gray-700">{workflowContent.leftBranch.label}</span>
            </div>
            <div className="w-0.5 h-5 bg-gray-300"></div>
            <div className="px-2 py-1 bg-green-50 border border-green-200 rounded-full">
              <span className="text-xs text-green-700 flex items-center gap-1">
                <CheckCircleIcon className="w-3 h-3" />
                {workflowContent.leftBranch.result}
              </span>
            </div>
          </div>

          {/* Right Branch */}
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-xs">
                {workflowContent.rightBranch.icon}
              </div>
              <span className="text-xs font-medium text-gray-700">{workflowContent.rightBranch.label}</span>
            </div>
            <div className="w-0.5 h-5 bg-gray-300"></div>
            <div className="px-2 py-1 bg-green-50 border border-green-200 rounded-full">
              <span className="text-xs text-green-700 flex items-center gap-1">
                <CheckCircleIcon className="w-3 h-3" />
                {workflowContent.rightBranch.result}
              </span>
            </div>
          </div>
        </div>

        {/* Merge Lines */}
        <div className="relative w-48 h-8">
          <svg className="absolute inset-0" width="100%" height="100%">
            <path d="M 48 0 L 48 22 L 96 22 L 96 32" stroke="#D1D5DB" strokeWidth="2" fill="none" />
            <path d="M 144 0 L 144 22 L 96 22 L 96 32" stroke="#D1D5DB" strokeWidth="2" fill="none" />
          </svg>
        </div>
      </div>

      {/* Collect Information Node */}
      <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
          <span className="text-green-600 text-xs">📝</span>
        </div>
        <span className="text-sm font-medium text-gray-700">{workflowContent.collectLabel}</span>
      </div>
      <div className="w-0.5 h-6 bg-gray-300"></div>

      {/* Action Options */}
      <div className="flex gap-3 flex-wrap justify-center">
        {workflowContent.actions.map((action, i) => (
          <div key={i} className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full">
            <span className="text-xs text-amber-700">{action}</span>
          </div>
        ))}
      </div>
      <div className="w-0.5 h-6 bg-gray-300"></div>

      {/* Confirm & Close Node */}
      <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center">
          <span className="text-indigo-600 text-xs">✓</span>
        </div>
        <span className="text-sm font-medium text-gray-700">Confirm & Close</span>
      </div>
      <div className="w-0.5 h-6 bg-gray-300"></div>

      {/* Success Condition */}
      <div className="px-3 py-1.5 bg-green-50 border border-green-200 rounded-full mb-2">
        <span className="text-xs text-green-700 flex items-center gap-1">
          <CheckCircleIcon className="w-3 h-3" />
          Caller satisfied
        </span>
      </div>
      <div className="w-0.5 h-5 bg-gray-300"></div>

      {/* End Node */}
      <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm">
        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
        </svg>
        <span className="text-sm font-medium text-gray-700">End</span>
      </div>

      {/* Questions Summary */}
      {getQuestions(template).length > 0 && (
        <div className="mt-6 w-full max-w-sm bg-white border border-gray-200 rounded-lg p-3">
          <p className="text-xs font-medium text-gray-500 mb-2">QUALIFICATION QUESTIONS</p>
          <ul className="space-y-1">
            {getQuestions(template).slice(0, 4).map((q: any, i: number) => (
              <li key={i} className="text-xs text-gray-600 flex items-start gap-2">
                <span className="text-gray-400">{i + 1}.</span>
                <span className="line-clamp-1">{q.question || q.text || q}</span>
              </li>
            ))}
            {getQuestions(template).length > 4 && (
              <li className="text-xs text-gray-400">+{getQuestions(template).length - 4} more</li>
            )}
          </ul>
        </div>
      )}

      {/* FAQs Summary */}
      {getFaqs(template).length > 0 && (
        <div className="mt-3 w-full max-w-sm bg-white border border-gray-200 rounded-lg p-3">
          <p className="text-xs font-medium text-gray-500 mb-2">KNOWLEDGE BASE</p>
          <ul className="space-y-1">
            {getFaqs(template).slice(0, 3).map((faq: any, i: number) => (
              <li key={i} className="text-xs text-gray-600 line-clamp-1">
                Q: {faq.question || faq.q}
              </li>
            ))}
            {getFaqs(template).length > 3 && (
              <li className="text-xs text-gray-400">+{getFaqs(template).length - 3} more FAQs</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

// Voice Preview Sub-component
interface VoicePreviewProps {
  template: VoiceTemplate;
  isPlayingGreeting: boolean;
  chatMessages: ChatMessage[];
  chatInput: string;
  isSendingMessage: boolean;
  chatEndRef: React.RefObject<HTMLDivElement>;
  onPlayGreeting: () => void;
  onChatInputChange: (input: string) => void;
  onSendMessage: () => void;
}

const VoicePreview: React.FC<VoicePreviewProps> = ({
  template,
  isPlayingGreeting,
  chatMessages,
  chatInput,
  isSendingMessage,
  chatEndRef,
  onPlayGreeting,
  onChatInputChange,
  onSendMessage,
}) => {
  const colors = industryColors[template.industry] || industryColors.CUSTOM;

  return (
    <div className="flex flex-col h-full">
      {/* Voice Preview Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {/* Header with icon and name */}
        <div className="flex items-center gap-4 mb-6">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl"
            style={{ backgroundColor: `${colors.accent}15` }}
          >
            {template.icon || industryIcons[template.industry] || '🤖'}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{template.name}</h3>
            <p className="text-sm text-gray-500">{industryLabels[template.industry] || template.industry}</p>
          </div>
        </div>

        {/* Waveform Player */}
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="flex items-center gap-4">
            {/* Play Button */}
            <button
              onClick={onPlayGreeting}
              className="w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-105"
              style={{ backgroundColor: colors.accent }}
            >
              {isPlayingGreeting ? (
                <PauseIcon className="w-5 h-5 text-white" />
              ) : (
                <PlayIcon className="w-5 h-5 text-white ml-0.5" />
              )}
            </button>

            {/* Waveform Visualization */}
            <div className="flex-1 flex items-center gap-[2px] h-10">
              {[...Array(40)].map((_, i) => {
                const baseHeight = Math.sin(i * 0.3) * 0.5 + 0.5;
                const height = isPlayingGreeting
                  ? Math.random() * 100
                  : baseHeight * 60 + 20;
                return (
                  <div
                    key={i}
                    className="flex-1 rounded-full transition-all duration-75"
                    style={{
                      height: `${height}%`,
                      backgroundColor: colors.accent,
                      opacity: isPlayingGreeting ? 0.8 : 0.4,
                    }}
                  />
                );
              })}
            </div>

            {/* Duration */}
            <span className="text-sm text-gray-500 font-mono w-12 text-right">
              {isPlayingGreeting ? '0:02' : '0:05'}
            </span>
          </div>
        </div>

        {/* Voice Info */}
        <div className="mt-4 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <SpeakerWaveIcon className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">Voice: {template.voiceId || 'Rachel'}</span>
          </div>
          <span className="text-gray-400">English</span>
        </div>
      </div>

      {/* Greeting Text */}
      <div className="mt-4 bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Greeting Message</p>
        <p className="text-sm text-gray-700 leading-relaxed">
          {template.greeting ||
           (template.greetings && Object.values(template.greetings)[0]) ||
           'Hello! How can I help you today?'}
        </p>
      </div>

      {/* Test Chat Section */}
      <div className="mt-4 bg-white rounded-xl border border-gray-200 flex-1 flex flex-col overflow-hidden" style={{ minHeight: '200px' }}>
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <ChatBubbleLeftRightIcon className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Test Chat</span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ minHeight: 0 }}>
          {chatMessages.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-gray-400">Send a message to test</p>
            </div>
          ) : (
            chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                    msg.role === 'user'
                      ? 'text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                  style={msg.role === 'user' ? { backgroundColor: colors.accent } : {}}
                >
                  {msg.content}
                </div>
              </div>
            ))
          )}
          {isSendingMessage && (
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t border-gray-100">
          <div className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => onChatInputChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSendMessage()}
              placeholder="Type a message..."
              className="flex-1 px-3 py-2 bg-gray-50 border-0 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
            />
            <button
              onClick={onSendMessage}
              disabled={!chatInput.trim() || isSendingMessage}
              className="px-3 py-2 rounded-lg text-white disabled:opacity-50"
              style={{ backgroundColor: colors.accent }}
            >
              <PaperAirplaneIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrowseTemplatesModal;
