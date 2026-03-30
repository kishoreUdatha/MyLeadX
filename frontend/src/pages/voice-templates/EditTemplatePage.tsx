/**
 * Edit Template Page
 * Multi-tab form for creating/editing voice agent templates
 * Refactored to use extracted hooks and components (SOLID principles)
 */

import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

// Local imports - extracted components and hooks
import { useTemplateForm } from './hooks';
import { TEMPLATE_TABS } from './edit-template.constants';
import {
  BasicInfoTab,
  SystemPromptTab,
  KnowledgeBaseTab,
  QuestionsTab,
  FAQsTab,
  MessagesTab,
  VoiceSettingsTab,
  SettingsTab,
  DocumentsTab,
} from './components';

const EditTemplatePage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const [activeTab, setActiveTab] = useState('basic');

  // Use the extracted form hook
  const {
    formData,
    loading,
    saving,
    setFormData,
    handleSave,
    addQuestion,
    updateQuestion,
    removeQuestion,
    addFAQ,
    updateFAQ,
    removeFAQ,
    addDocument,
    updateDocument,
    removeDocument,
  } = useTemplateForm(id);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/voice-templates')}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeftIcon className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {isEditing ? 'Edit Template' : 'Create Template'}
                </h1>
                <p className="text-sm text-gray-500">
                  {isEditing ? formData.name : 'Configure your voice agent template'}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/voice-templates')}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Template'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex gap-6">
          {/* Sidebar Tabs */}
          <div className="w-64 shrink-0">
            <nav className="bg-white rounded-lg border shadow-sm p-2 sticky top-24">
              {TEMPLATE_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 bg-white rounded-lg border shadow-sm p-6">
            {activeTab === 'basic' && (
              <BasicInfoTab formData={formData} setFormData={setFormData} />
            )}

            {activeTab === 'prompt' && (
              <SystemPromptTab formData={formData} setFormData={setFormData} />
            )}

            {activeTab === 'knowledge' && (
              <KnowledgeBaseTab formData={formData} setFormData={setFormData} />
            )}

            {activeTab === 'questions' && (
              <QuestionsTab
                formData={formData}
                setFormData={setFormData}
                addQuestion={addQuestion}
                updateQuestion={updateQuestion}
                removeQuestion={removeQuestion}
              />
            )}

            {activeTab === 'faqs' && (
              <FAQsTab
                formData={formData}
                setFormData={setFormData}
                addFAQ={addFAQ}
                updateFAQ={updateFAQ}
                removeFAQ={removeFAQ}
              />
            )}

            {activeTab === 'messages' && (
              <MessagesTab formData={formData} setFormData={setFormData} />
            )}

            {activeTab === 'voice' && (
              <VoiceSettingsTab formData={formData} setFormData={setFormData} />
            )}

            {activeTab === 'settings' && (
              <SettingsTab formData={formData} setFormData={setFormData} />
            )}

            {activeTab === 'documents' && (
              <DocumentsTab
                formData={formData}
                setFormData={setFormData}
                addDocument={addDocument}
                updateDocument={updateDocument}
                removeDocument={removeDocument}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditTemplatePage;
