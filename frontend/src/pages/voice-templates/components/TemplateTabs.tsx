/**
 * Template Editor Tab Components
 */

import React from 'react';
import {
  PlusIcon,
  TrashIcon,
  QuestionMarkCircleIcon,
  DocumentIcon,
} from '@heroicons/react/24/outline';
import { TemplateFormData, Question, FAQ, TemplateDocument } from '../edit-template.types';
import {
  FIELD_OPTIONS,
  LANGUAGE_OPTIONS,
  VOICE_OPTIONS,
  INDUSTRY_OPTIONS,
} from '../edit-template.constants';

interface TabProps {
  formData: TemplateFormData;
  setFormData: React.Dispatch<React.SetStateAction<TemplateFormData>>;
}

// Basic Info Tab
export const BasicInfoTab: React.FC<TabProps> = ({ formData, setFormData }) => (
  <div className="space-y-6">
    <h2 className="text-lg font-semibold">Basic Information</h2>

    <div className="grid grid-cols-2 gap-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Template Name *
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., SRM Admissions Template"
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Industry *
        </label>
        <select
          value={formData.industry}
          onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {INDUSTRY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.icon} {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Category
        </label>
        <input
          type="text"
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          placeholder="e.g., Admissions, Support, Sales"
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Default Language
        </label>
        <select
          value={formData.language}
          onChange={(e) => setFormData({ ...formData, language: e.target.value })}
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {LANGUAGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.flag} {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Description
      </label>
      <textarea
        value={formData.description}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        rows={3}
        placeholder="Describe what this template is used for..."
        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  </div>
);

// System Prompt Tab
export const SystemPromptTab: React.FC<TabProps> = ({ formData, setFormData }) => (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <h2 className="text-lg font-semibold">System Prompt</h2>
      <span className="text-sm text-gray-500">
        {formData.systemPrompt.length} characters
      </span>
    </div>
    <p className="text-sm text-gray-600">
      Define how the AI agent should behave, its role, and conversation guidelines.
    </p>
    <textarea
      value={formData.systemPrompt}
      onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
      rows={20}
      placeholder={`You are an experienced admissions counselor...`}
      className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
    />
  </div>
);

// Knowledge Base Tab
export const KnowledgeBaseTab: React.FC<TabProps> = ({ formData, setFormData }) => (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <h2 className="text-lg font-semibold">Knowledge Base</h2>
      <span className="text-sm text-gray-500">
        {formData.knowledgeBase.length} characters
      </span>
    </div>
    <p className="text-sm text-gray-600">
      Add detailed information about your organization, products, services, pricing, etc.
    </p>
    <textarea
      value={formData.knowledgeBase}
      onChange={(e) => setFormData({ ...formData, knowledgeBase: e.target.value })}
      rows={25}
      placeholder={`## ORGANIZATION NAME\n\n### ABOUT\n- Founded: 1985...`}
      className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
    />
  </div>
);

// Questions Tab
interface QuestionsTabProps extends TabProps {
  addQuestion: () => void;
  updateQuestion: (index: number, updates: Partial<Question>) => void;
  removeQuestion: (index: number) => void;
}

export const QuestionsTab: React.FC<QuestionsTabProps> = ({
  formData,
  addQuestion,
  updateQuestion,
  removeQuestion,
}) => (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <div>
        <h2 className="text-lg font-semibold">Qualification Questions</h2>
        <p className="text-sm text-gray-600">
          Questions the AI will ask to collect lead information
        </p>
      </div>
      <button
        onClick={addQuestion}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
      >
        <PlusIcon className="w-5 h-5" />
        Add Question
      </button>
    </div>

    {formData.questions.length === 0 ? (
      <div className="text-center py-12 border-2 border-dashed rounded-lg">
        <QuestionMarkCircleIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" />
        <p className="text-gray-500">No questions added yet</p>
        <button onClick={addQuestion} className="mt-3 text-blue-600 hover:underline">
          Add your first question
        </button>
      </div>
    ) : (
      <div className="space-y-4">
        {formData.questions.map((q, index) => (
          <div key={q.id} className="border rounded-lg p-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Question</label>
                <input
                  type="text"
                  value={q.question}
                  onChange={(e) => updateQuestion(index, { question: e.target.value })}
                  placeholder="e.g., May I know your name?"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="w-48">
                <label className="block text-sm font-medium text-gray-700 mb-1">Map to Field</label>
                <select
                  value={q.field}
                  onChange={(e) => updateQuestion(index, { field: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  {FIELD_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end gap-2">
                <label className="flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={q.required}
                    onChange={(e) => updateQuestion(index, { required: e.target.checked })}
                  />
                  <span className="text-sm">Required</span>
                </label>
                <button onClick={() => removeQuestion(index)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

// FAQs Tab
interface FAQsTabProps extends TabProps {
  addFAQ: () => void;
  updateFAQ: (index: number, updates: Partial<FAQ>) => void;
  removeFAQ: (index: number) => void;
}

export const FAQsTab: React.FC<FAQsTabProps> = ({
  formData,
  addFAQ,
  updateFAQ,
  removeFAQ,
}) => (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <div>
        <h2 className="text-lg font-semibold">FAQs</h2>
        <p className="text-sm text-gray-600">Common questions and answers the AI can use</p>
      </div>
      <button onClick={addFAQ} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
        <PlusIcon className="w-5 h-5" />
        Add FAQ
      </button>
    </div>

    {formData.faqs.length === 0 ? (
      <div className="text-center py-12 border-2 border-dashed rounded-lg">
        <QuestionMarkCircleIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" />
        <p className="text-gray-500">No FAQs added yet</p>
        <button onClick={addFAQ} className="mt-3 text-blue-600 hover:underline">
          Add your first FAQ
        </button>
      </div>
    ) : (
      <div className="space-y-4">
        {formData.faqs.map((faq, index) => (
          <div key={faq.id} className="border rounded-lg p-4">
            <div className="flex justify-between items-start mb-3">
              <span className="text-sm font-medium text-gray-500">FAQ #{index + 1}</span>
              <button onClick={() => removeFAQ(index)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Question</label>
                <input
                  type="text"
                  value={faq.question}
                  onChange={(e) => updateFAQ(index, { question: e.target.value })}
                  placeholder="e.g., What are the fees?"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Answer</label>
                <textarea
                  value={faq.answer}
                  onChange={(e) => updateFAQ(index, { answer: e.target.value })}
                  rows={3}
                  placeholder="Provide a detailed answer..."
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

// Messages Tab
export const MessagesTab: React.FC<TabProps> = ({ formData, setFormData }) => (
  <div className="space-y-6">
    <h2 className="text-lg font-semibold">Conversation Messages</h2>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Greeting Message</label>
      <textarea
        value={formData.greeting}
        onChange={(e) => setFormData({ ...formData, greeting: e.target.value })}
        rows={3}
        placeholder="Hello! Welcome to our organization. How can I help you today?"
        className="w-full px-4 py-2 border rounded-lg"
      />
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Fallback Message</label>
      <textarea
        value={formData.fallbackMessage}
        onChange={(e) => setFormData({ ...formData, fallbackMessage: e.target.value })}
        rows={2}
        placeholder="I'm sorry, I didn't understand that. Could you please repeat?"
        className="w-full px-4 py-2 border rounded-lg"
      />
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Transfer Message</label>
      <textarea
        value={formData.transferMessage}
        onChange={(e) => setFormData({ ...formData, transferMessage: e.target.value })}
        rows={2}
        placeholder="Let me connect you with a human agent. Please hold."
        className="w-full px-4 py-2 border rounded-lg"
      />
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">End Message</label>
      <textarea
        value={formData.endMessage}
        onChange={(e) => setFormData({ ...formData, endMessage: e.target.value })}
        rows={2}
        placeholder="Thank you for your time. Have a great day!"
        className="w-full px-4 py-2 border rounded-lg"
      />
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">After Hours Message</label>
      <textarea
        value={formData.afterHoursMessage}
        onChange={(e) => setFormData({ ...formData, afterHoursMessage: e.target.value })}
        rows={2}
        placeholder="We're currently closed. Our working hours are 9 AM to 6 PM."
        className="w-full px-4 py-2 border rounded-lg"
      />
    </div>
  </div>
);

// Voice Settings Tab
export const VoiceSettingsTab: React.FC<TabProps> = ({ formData, setFormData }) => (
  <div className="space-y-6">
    <h2 className="text-lg font-semibold">Voice Settings</h2>

    <div className="grid grid-cols-2 gap-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Voice</label>
        <select
          value={formData.voiceId}
          onChange={(e) => setFormData({ ...formData, voiceId: e.target.value })}
          className="w-full px-4 py-2 border rounded-lg"
        >
          {VOICE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label} ({opt.provider})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Personality</label>
        <select
          value={formData.personality}
          onChange={(e) => setFormData({ ...formData, personality: e.target.value })}
          className="w-full px-4 py-2 border rounded-lg"
        >
          <option value="professional">Professional</option>
          <option value="friendly">Friendly</option>
          <option value="casual">Casual</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Response Speed</label>
        <select
          value={formData.responseSpeed}
          onChange={(e) => setFormData({ ...formData, responseSpeed: e.target.value })}
          className="w-full px-4 py-2 border rounded-lg"
        >
          <option value="fast">Fast</option>
          <option value="normal">Normal</option>
          <option value="thoughtful">Thoughtful</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Temperature (Creativity): {formData.temperature}
        </label>
        <input
          type="range"
          min="0"
          max="2"
          step="0.1"
          value={formData.temperature}
          onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Focused</span>
          <span>Creative</span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Max Duration (seconds)</label>
        <input
          type="number"
          value={formData.maxDuration}
          onChange={(e) => setFormData({ ...formData, maxDuration: parseInt(e.target.value) })}
          min={60}
          max={1800}
          className="w-full px-4 py-2 border rounded-lg"
        />
        <p className="text-xs text-gray-500 mt-1">{Math.floor(formData.maxDuration / 60)} minutes</p>
      </div>
    </div>
  </div>
);

// Settings Tab
export const SettingsTab: React.FC<TabProps> = ({ formData, setFormData }) => (
  <div className="space-y-6">
    <h2 className="text-lg font-semibold">Additional Settings</h2>

    {/* Working Hours */}
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-medium">Working Hours</h3>
          <p className="text-sm text-gray-500">Restrict calls to specific hours</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={formData.workingHoursEnabled}
            onChange={(e) => setFormData({ ...formData, workingHoursEnabled: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>

      {formData.workingHoursEnabled && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
            <input
              type="time"
              value={formData.workingHoursStart}
              onChange={(e) => setFormData({ ...formData, workingHoursStart: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
            <input
              type="time"
              value={formData.workingHoursEnd}
              onChange={(e) => setFormData({ ...formData, workingHoursEnd: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>
      )}
    </div>

    {/* Lead Settings */}
    <div className="border rounded-lg p-4">
      <h3 className="font-medium mb-4">Lead Settings</h3>
      <div className="space-y-3">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={formData.autoCreateLeads}
            onChange={(e) => setFormData({ ...formData, autoCreateLeads: e.target.checked })}
            className="w-4 h-4 rounded"
          />
          <span>Auto-create leads from calls</span>
        </label>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={formData.deduplicateByPhone}
            onChange={(e) => setFormData({ ...formData, deduplicateByPhone: e.target.checked })}
            className="w-4 h-4 rounded"
          />
          <span>Deduplicate leads by phone number</span>
        </label>
      </div>
    </div>

    {/* Appointment Settings */}
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-medium">Appointment Booking</h3>
          <p className="text-sm text-gray-500">Allow AI to book appointments</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={formData.appointmentEnabled}
            onChange={(e) => setFormData({ ...formData, appointmentEnabled: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>

      {formData.appointmentEnabled && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Appointment Type</label>
            <input
              type="text"
              value={formData.appointmentType}
              onChange={(e) => setFormData({ ...formData, appointmentType: e.target.value })}
              placeholder="e.g., Campus Tour"
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
            <input
              type="number"
              value={formData.appointmentDuration}
              onChange={(e) => setFormData({ ...formData, appointmentDuration: parseInt(e.target.value) })}
              min={15}
              max={180}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  </div>
);

// Documents Tab
interface DocumentsTabProps extends TabProps {
  addDocument: () => void;
  updateDocument: (index: number, updates: Partial<TemplateDocument>) => void;
  removeDocument: (index: number) => void;
}

export const DocumentsTab: React.FC<DocumentsTabProps> = ({
  formData,
  addDocument,
  updateDocument,
  removeDocument,
}) => (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <div>
        <h2 className="text-lg font-semibold">Documents</h2>
        <p className="text-sm text-gray-600">Documents that can be shared via WhatsApp during calls</p>
      </div>
      <button onClick={addDocument} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
        <PlusIcon className="w-5 h-5" />
        Add Document
      </button>
    </div>

    {formData.documents.length === 0 ? (
      <div className="text-center py-12 border-2 border-dashed rounded-lg">
        <DocumentIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" />
        <p className="text-gray-500">No documents added yet</p>
        <button onClick={addDocument} className="mt-3 text-blue-600 hover:underline">
          Add your first document
        </button>
      </div>
    ) : (
      <div className="space-y-4">
        {formData.documents.map((doc, index) => (
          <div key={doc.id} className="border rounded-lg p-4">
            <div className="flex justify-between items-start mb-3">
              <span className="text-sm font-medium text-gray-500">Document #{index + 1}</span>
              <button onClick={() => removeDocument(index)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={doc.name}
                  onChange={(e) => updateDocument(index, { name: e.target.value })}
                  placeholder="e.g., Fee Structure 2024"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={doc.type}
                  onChange={(e) => updateDocument(index, { type: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="pdf">PDF</option>
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                <input
                  type="url"
                  value={doc.url}
                  onChange={(e) => updateDocument(index, { url: e.target.value })}
                  placeholder="https://example.com/document.pdf"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Keywords (comma separated)</label>
                <input
                  type="text"
                  value={doc.keywords.join(', ')}
                  onChange={(e) => updateDocument(index, {
                    keywords: e.target.value.split(',').map(k => k.trim()).filter(Boolean)
                  })}
                  placeholder="fees, cost, price, charges"
                  className="w-full px-3 py-2 border rounded-lg"
                />
                <p className="text-xs text-gray-500 mt-1">AI will send this document when user mentions these keywords</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);
