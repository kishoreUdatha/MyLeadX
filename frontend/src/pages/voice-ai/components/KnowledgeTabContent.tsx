import React from 'react';
import { Brain, FileText, Image, Play, Upload, Trash2, Plus, Loader2, Check } from 'lucide-react';
import type { AgentDocument, FAQItem, ConversationExample } from '../types/voiceAgent.types';

interface KnowledgeTabContentProps {
  documents: AgentDocument[];
  onUpdateDocuments: (docs: AgentDocument[]) => void;
  faqs: FAQItem[];
  onUpdateFaqs: (faqs: FAQItem[]) => void;
  conversationExamples: ConversationExample[];
  onUpdateConversationExamples: (examples: ConversationExample[]) => void;
  // Document upload state
  newDocument: {
    name: string;
    type: 'pdf' | 'image' | 'video' | 'document';
    url: string;
    description: string;
    keywords: string;
  };
  onUpdateNewDocument: (doc: { name: string; type: 'pdf' | 'image' | 'video' | 'document'; url: string; description: string; keywords: string }) => void;
  isUploading: boolean;
  uploadProgress: number;
  selectedFile: File | null;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFileDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onClearFile: () => void;
  // FAQ state
  newFaq: { question: string; answer: string };
  onUpdateNewFaq: (faq: { question: string; answer: string }) => void;
}

export const KnowledgeTabContent: React.FC<KnowledgeTabContentProps> = ({
  documents,
  onUpdateDocuments,
  faqs,
  onUpdateFaqs,
  conversationExamples,
  onUpdateConversationExamples,
  newDocument,
  onUpdateNewDocument,
  isUploading,
  uploadProgress,
  selectedFile,
  onFileSelect,
  onFileDrop,
  onClearFile,
  newFaq,
  onUpdateNewFaq,
}) => {
  const addDocument = () => {
    if (newDocument.name.trim()) {
      const doc: AgentDocument = {
        id: Date.now().toString(),
        name: newDocument.name.trim(),
        type: newDocument.type,
        url: newDocument.url.trim(),
        description: newDocument.description.trim(),
        keywords: newDocument.keywords.split(',').map(k => k.trim()).filter(k => k),
      };
      onUpdateDocuments([...documents, doc]);
      onUpdateNewDocument({ name: '', type: 'pdf', url: '', description: '', keywords: '' });
      onClearFile();
    }
  };

  const removeDocument = (idx: number) => {
    onUpdateDocuments(documents.filter((_, i) => i !== idx));
  };

  const addFaq = () => {
    if (newFaq.question && newFaq.answer) {
      onUpdateFaqs([...faqs, { id: Date.now().toString(), ...newFaq }]);
      onUpdateNewFaq({ question: '', answer: '' });
    }
  };

  const removeFaq = (idx: number) => {
    onUpdateFaqs(faqs.filter((_, i) => i !== idx));
  };

  const addConversationExample = () => {
    onUpdateConversationExamples([
      ...conversationExamples,
      {
        id: Date.now().toString(),
        title: 'New Conversation',
        conversation: [
          { role: 'user', content: 'Hi, I want to know about your courses' },
          { role: 'assistant', content: 'Hello! I would be happy to help you learn about our courses. What field are you interested in?' },
        ],
      },
    ]);
  };

  const removeConversationExample = (idx: number) => {
    onUpdateConversationExamples(conversationExamples.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <Brain className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
        <div>
          <p className="text-sm font-medium text-blue-800">Knowledge Base</p>
          <p className="text-xs text-blue-700 mt-1">
            Add documents, FAQs, and conversation examples to enhance your AI agent's knowledge.
            Documents can be shared via WhatsApp during calls.
          </p>
        </div>
      </div>

      {/* Existing Documents */}
      <div className="flex items-start gap-8">
        <div className="w-48 flex-shrink-0">
          <label className="text-sm font-medium text-gray-900">Documents</label>
          <p className="text-xs text-gray-500 mt-0.5">Files that can be shared via WhatsApp during calls.</p>
        </div>
        <div className="flex-1">
          {documents.length > 0 ? (
            <div className="space-y-3">
              {documents.map((doc, idx) => (
                <div key={doc.id || idx} className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg group hover:bg-gray-100 transition">
                  <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                    {doc.type === 'pdf' && <FileText size={20} className="text-red-500" />}
                    {doc.type === 'image' && <Image size={20} className="text-blue-500" />}
                    {doc.type === 'video' && <Play size={20} className="text-purple-500" />}
                    {doc.type === 'document' && <FileText size={20} className="text-gray-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{doc.name}</p>
                    <p className="text-sm text-gray-500 truncate">{doc.description}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {doc.keywords.map((kw, i) => (
                        <span key={i} className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => removeDocument(idx)}
                    className="p-2 hover:bg-red-100 rounded opacity-0 group-hover:opacity-100 transition"
                  >
                    <Trash2 size={16} className="text-red-500" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 text-center">
              <Upload size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">No documents added yet</p>
              <p className="text-xs text-gray-400 mt-1">Add documents below to enable WhatsApp sharing</p>
            </div>
          )}
        </div>
      </div>

      {/* Add New Document Form */}
      <div className="flex items-start gap-8">
        <div className="w-48 flex-shrink-0">
          <label className="text-sm font-medium text-gray-900">Add Document</label>
          <p className="text-xs text-gray-500 mt-0.5">Upload or link a document.</p>
        </div>
        <div className="flex-1">
          <div className="border border-gray-200 rounded-lg p-4 bg-white space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Document Name *</label>
                <input
                  type="text"
                  value={newDocument.name}
                  onChange={e => onUpdateNewDocument({ ...newDocument, name: e.target.value })}
                  placeholder="e.g., Fee Structure 2024"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Type</label>
                <select
                  value={newDocument.type}
                  onChange={e => onUpdateNewDocument({ ...newDocument, type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm bg-white"
                >
                  <option value="pdf">PDF Document</option>
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                  <option value="document">Other Document</option>
                </select>
              </div>
            </div>

            {/* File Upload Section */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Upload File</label>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={onFileDrop}
                className={`relative border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                  isUploading
                    ? 'border-teal-400 bg-teal-50'
                    : selectedFile || newDocument.url
                    ? 'border-green-400 bg-green-50'
                    : 'border-gray-300 hover:border-teal-400 hover:bg-gray-50'
                }`}
              >
                {isUploading ? (
                  <div className="py-2">
                    <Loader2 className="animate-spin mx-auto text-teal-500 mb-2" size={24} />
                    <p className="text-sm text-teal-600">Uploading... {uploadProgress}%</p>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                      <div
                        className="bg-teal-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                ) : selectedFile || newDocument.url ? (
                  <div className="py-2">
                    <div className="flex items-center justify-center gap-2 text-green-600">
                      <Check size={20} />
                      <span className="text-sm font-medium">
                        {selectedFile ? selectedFile.name : 'File linked'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={onClearFile}
                      className="mt-2 text-xs text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="py-2">
                    <Upload className="mx-auto text-gray-400 mb-2" size={24} />
                    <p className="text-sm text-gray-600">
                      Drag & drop a file here, or{' '}
                      <label className="text-teal-600 hover:text-teal-700 cursor-pointer font-medium">
                        browse
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.mp4,.webm"
                          onChange={onFileSelect}
                        />
                      </label>
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      PDF, DOC, XLS, Images, Videos (max 10MB)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* OR Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 border-t border-gray-200" />
              <span className="text-xs text-gray-400 font-medium">OR</span>
              <div className="flex-1 border-t border-gray-200" />
            </div>

            {/* URL Input */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Document URL</label>
              <input
                type="url"
                value={newDocument.url}
                onChange={e => onUpdateNewDocument({ ...newDocument, url: e.target.value })}
                placeholder="https://example.com/document.pdf"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                disabled={!!selectedFile}
              />
              <p className="text-xs text-gray-400 mt-1">Or paste a publicly accessible URL</p>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">Description</label>
              <input
                type="text"
                value={newDocument.description}
                onChange={e => onUpdateNewDocument({ ...newDocument, description: e.target.value })}
                placeholder="e.g., Complete fee breakdown for all courses"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">Keywords (comma separated)</label>
              <input
                type="text"
                value={newDocument.keywords}
                onChange={e => onUpdateNewDocument({ ...newDocument, keywords: e.target.value })}
                placeholder="e.g., fees, cost, price, tuition, charges"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">AI uses these to match user requests</p>
            </div>

            <button
              onClick={addDocument}
              disabled={!newDocument.name.trim() || isUploading}
              className="w-full px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm font-medium flex items-center justify-center gap-2"
            >
              <Plus size={16} />
              Add Document
            </button>
          </div>
        </div>
      </div>

      {/* Example Keywords */}
      <div className="flex items-start gap-8">
        <div className="w-48 flex-shrink-0">
          <label className="text-sm font-medium text-gray-900">Example Triggers</label>
          <p className="text-xs text-gray-500 mt-0.5">Phrases that trigger document sharing.</p>
        </div>
        <div className="flex-1">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-600 mb-2">The AI will send documents when callers say things like:</p>
            <div className="flex flex-wrap gap-2">
              {['Send me the brochure', 'Fee structure bhej do', 'Can I see campus photos?', 'Share syllabus on WhatsApp', 'Fees details pampandi'].map((phrase, i) => (
                <span key={i} className="text-xs bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-full">
                  "{phrase}"
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 my-6"></div>

      {/* FAQ Section */}
      <div className="flex items-start gap-8">
        <div className="w-48 flex-shrink-0">
          <label className="text-sm font-medium text-gray-900">FAQ</label>
          <p className="text-xs text-gray-500 mt-0.5">Common questions and answers the AI should know.</p>
        </div>
        <div className="flex-1">
          {faqs.length > 0 ? (
            <div className="space-y-3 mb-4">
              {faqs.map((faq, idx) => (
                <div key={faq.id} className="p-4 bg-gray-50 rounded-lg group hover:bg-gray-100 transition">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Q: {faq.question}</p>
                      <p className="text-sm text-gray-600 mt-1">A: {faq.answer}</p>
                    </div>
                    <button
                      onClick={() => removeFaq(idx)}
                      className="p-1.5 hover:bg-red-100 rounded opacity-0 group-hover:opacity-100 transition"
                    >
                      <Trash2 size={14} className="text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 text-center mb-4">
              <p className="text-sm text-gray-400">No FAQ entries yet</p>
            </div>
          )}

          {/* Add FAQ Form */}
          <div className="border border-gray-200 rounded-lg p-4 bg-white space-y-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Question</label>
              <input
                type="text"
                value={newFaq.question}
                onChange={e => onUpdateNewFaq({ ...newFaq, question: e.target.value })}
                placeholder="e.g., What are your office hours?"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Answer</label>
              <textarea
                value={newFaq.answer}
                onChange={e => onUpdateNewFaq({ ...newFaq, answer: e.target.value })}
                placeholder="e.g., Our office is open Monday to Friday, 9 AM to 6 PM."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm resize-none"
              />
            </div>
            <button
              onClick={addFaq}
              disabled={!newFaq.question || !newFaq.answer}
              className="px-4 py-2 text-sm bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Add FAQ
            </button>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 my-6"></div>

      {/* Conversation Examples */}
      <div className="flex items-start gap-8">
        <div className="w-48 flex-shrink-0">
          <label className="text-sm font-medium text-gray-900">Conversation Examples</label>
          <p className="text-xs text-gray-500 mt-0.5">Sample conversations to train the AI on expected behavior.</p>
        </div>
        <div className="flex-1">
          {conversationExamples.length > 0 ? (
            <div className="space-y-3 mb-4">
              {conversationExamples.map((example, idx) => (
                <div key={example.id} className="p-4 bg-gray-50 rounded-lg group hover:bg-gray-100 transition">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm font-medium text-gray-900">{example.title}</p>
                    <button
                      onClick={() => removeConversationExample(idx)}
                      className="p-1.5 hover:bg-red-100 rounded opacity-0 group-hover:opacity-100 transition"
                    >
                      <Trash2 size={14} className="text-red-500" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    {example.conversation.map((msg, i) => (
                      <div key={i} className={`text-xs ${msg.role === 'user' ? 'text-blue-600' : 'text-green-600'}`}>
                        <span className="font-medium">{msg.role === 'user' ? 'User' : 'AI'}:</span> {msg.content}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 text-center mb-4">
              <p className="text-sm text-gray-400">No conversation examples yet</p>
              <p className="text-xs text-gray-400 mt-1">Add sample dialogues to improve AI responses</p>
            </div>
          )}

          {/* Add Example Button */}
          <button
            onClick={addConversationExample}
            className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-teal-400 hover:text-teal-600 hover:bg-teal-50 transition flex items-center justify-center gap-2"
          >
            <Plus size={16} />
            Add Conversation Example
          </button>
        </div>
      </div>
    </div>
  );
};
