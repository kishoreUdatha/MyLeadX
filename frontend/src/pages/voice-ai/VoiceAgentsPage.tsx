/**
 * Voice Agents Page
 * Main page for managing AI voice agents
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useVoiceAgents, useTemplates } from './hooks';
import { AgentsTable, BrowseTemplatesModal } from './components';
import TemplatePreviewModal from '../voice-templates/TemplatePreviewModal';

export const VoiceAgentsPage: React.FC = () => {
  const navigate = useNavigate();

  // Agents state and actions
  const {
    loading,
    searchQuery,
    openMenuId,
    copiedId,
    filterCreator,
    filterArchived,
    filteredAgents,
    setSearchQuery,
    setOpenMenuId,
    setFilterCreator,
    setFilterArchived,
    toggleAgent,
    deleteAgent,
    copyEmbedCode,
  } = useVoiceAgents();

  // Templates state and actions
  const {
    templates,
    showTemplatesModal,
    templateSearch,
    selectedCategory,
    selectedTemplate,
    previewTemplate,
    previewTab,
    previewLoading,
    filteredTemplates,
    isPlayingGreeting,
    chatMessages,
    chatInput,
    isSendingMessage,
    audioRef,
    chatEndRef,
    setShowTemplatesModal,
    setTemplateSearch,
    setSelectedCategory,
    setSelectedTemplate,
    setPreviewTemplate,
    setPreviewTab,
    setPreviewLoading,
    setChatInput,
    initializeTemplates,
    useTemplate,
    playGreeting,
    sendMessage,
    closeTemplatesModal,
  } = useTemplates();

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="px-8 py-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Agents</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowTemplatesModal(true)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700"
            >
              Browse templates
            </button>
            <button
              onClick={() => navigate('/voice-ai/new')}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 flex items-center gap-2 text-sm font-medium"
            >
              <PlusIcon className="w-4 h-4" />
              New agent
            </button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-8 pb-4">
        <div className="relative">
          <MagnifyingGlassIcon className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search agents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-transparent bg-white"
          />
        </div>
      </div>

      {/* Filter chips */}
      <div className="px-8 pb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterCreator(!filterCreator)}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              filterCreator
                ? 'bg-gray-100 border-gray-300 text-gray-900'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            + Creator
          </button>
          <button
            onClick={() => setFilterArchived(!filterArchived)}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              filterArchived
                ? 'bg-gray-100 border-gray-300 text-gray-900'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            + Archived
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="px-8">
        <AgentsTable
          agents={filteredAgents}
          loading={loading}
          openMenuId={openMenuId}
          copiedId={copiedId}
          onMenuToggle={setOpenMenuId}
          onToggleAgent={toggleAgent}
          onDeleteAgent={deleteAgent}
          onCopyEmbedCode={copyEmbedCode}
        />
      </div>

      {/* Browse Templates Modal */}
      {showTemplatesModal && (
        <BrowseTemplatesModal
          templates={templates}
          filteredTemplates={filteredTemplates}
          selectedTemplate={selectedTemplate}
          templateSearch={templateSearch}
          selectedCategory={selectedCategory}
          previewTab={previewTab}
          previewLoading={previewLoading}
          isPlayingGreeting={isPlayingGreeting}
          chatMessages={chatMessages}
          chatInput={chatInput}
          isSendingMessage={isSendingMessage}
          audioRef={audioRef}
          chatEndRef={chatEndRef}
          onClose={closeTemplatesModal}
          onTemplateSearch={setTemplateSearch}
          onCategoryChange={setSelectedCategory}
          onTemplateSelect={(template) => {
            setSelectedTemplate(template);
            setPreviewLoading(true);
            setTimeout(() => setPreviewLoading(false), 300);
          }}
          onPreviewTabChange={setPreviewTab}
          onUseTemplate={useTemplate}
          onViewDetails={setPreviewTemplate}
          onPlayGreeting={playGreeting}
          onChatInputChange={setChatInput}
          onSendMessage={sendMessage}
          onInitializeTemplates={initializeTemplates}
        />
      )}

      {/* Full Preview Modal */}
      {previewTemplate && (
        <TemplatePreviewModal
          template={previewTemplate}
          onClose={() => setPreviewTemplate(null)}
        />
      )}
    </div>
  );
};

export default VoiceAgentsPage;
