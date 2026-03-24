/**
 * Step 4: Ground Your Agent (Knowledge Base)
 */

import React, { useCallback, useState } from 'react';
import { ArrowLeft, Upload, Link, FileText, X, Loader2 } from 'lucide-react';
import { AgentFormData, KnowledgeBaseItem } from '../types';

interface Props {
  formData: AgentFormData;
  onUpdate: (updates: Partial<AgentFormData>) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export function StepKnowledgeBase({ formData, onUpdate, onNext, onBack, onSkip }: Props) {
  const [urlInput, setUrlInput] = useState('');
  const [textInput, setTextInput] = useState('');
  const [textName, setTextName] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newItems: KnowledgeBaseItem[] = Array.from(files).map((file, idx) => ({
      id: `file-${Date.now()}-${idx}`,
      type: 'file',
      name: file.name,
      status: 'pending',
    }));

    onUpdate({
      knowledgeBase: [...formData.knowledgeBase, ...newItems],
    });

    // Simulate processing
    setTimeout(() => {
      onUpdate({
        knowledgeBase: formData.knowledgeBase.map(item =>
          newItems.find(n => n.id === item.id) ? { ...item, status: 'ready' } : item
        ),
      });
    }, 2000);
  }, [formData.knowledgeBase, onUpdate]);

  const handleAddUrl = useCallback(() => {
    if (!urlInput.trim()) return;

    const newItem: KnowledgeBaseItem = {
      id: `url-${Date.now()}`,
      type: 'url',
      name: urlInput,
      url: urlInput,
      status: 'pending',
    };

    onUpdate({
      knowledgeBase: [...formData.knowledgeBase, newItem],
    });

    setUrlInput('');
    setShowUrlInput(false);

    // Simulate processing
    setTimeout(() => {
      onUpdate({
        knowledgeBase: formData.knowledgeBase.map(item =>
          item.id === newItem.id ? { ...item, status: 'ready' } : item
        ),
      });
    }, 2000);
  }, [urlInput, formData.knowledgeBase, onUpdate]);

  const handleAddText = useCallback(() => {
    if (!textInput.trim() || !textName.trim()) return;

    const newItem: KnowledgeBaseItem = {
      id: `text-${Date.now()}`,
      type: 'text',
      name: textName,
      content: textInput,
      status: 'ready',
    };

    onUpdate({
      knowledgeBase: [...formData.knowledgeBase, newItem],
    });

    setTextInput('');
    setTextName('');
    setShowTextInput(false);
  }, [textInput, textName, formData.knowledgeBase, onUpdate]);

  const handleRemoveItem = useCallback((id: string) => {
    onUpdate({
      knowledgeBase: formData.knowledgeBase.filter(item => item.id !== id),
    });
  }, [formData.knowledgeBase, onUpdate]);

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Ground your agent</h1>
      <p className="text-gray-600 mb-8">
        Add tools and knowledge base documents to ground your agent's responses
      </p>

      {/* Upload Options */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {/* File Upload */}
        <label className="p-6 border-2 border-dashed border-gray-300 rounded-xl text-center cursor-pointer hover:border-gray-400 transition-colors">
          <input
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.txt,.csv"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <div className="font-medium text-gray-700">Upload Files</div>
          <div className="text-sm text-gray-500">PDF, DOC, TXT, CSV</div>
        </label>

        {/* URL Input */}
        <button
          onClick={() => setShowUrlInput(true)}
          className="p-6 border-2 border-gray-200 rounded-xl text-center hover:border-gray-400 transition-colors"
        >
          <Link className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <div className="font-medium text-gray-700">Add URL</div>
          <div className="text-sm text-gray-500">Website or document URL</div>
        </button>

        {/* Text Input */}
        <button
          onClick={() => setShowTextInput(true)}
          className="p-6 border-2 border-gray-200 rounded-xl text-center hover:border-gray-400 transition-colors"
        >
          <FileText className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <div className="font-medium text-gray-700">Add Text</div>
          <div className="text-sm text-gray-500">Paste custom content</div>
        </button>
      </div>

      {/* URL Input Modal */}
      {showUrlInput && (
        <div className="mb-6 p-4 bg-gray-50 rounded-xl">
          <div className="flex gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com/document"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
            <button
              onClick={handleAddUrl}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
            >
              Add
            </button>
            <button
              onClick={() => setShowUrlInput(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Text Input Modal */}
      {showTextInput && (
        <div className="mb-6 p-4 bg-gray-50 rounded-xl space-y-3">
          <input
            type="text"
            value={textName}
            onChange={(e) => setTextName(e.target.value)}
            placeholder="Name this content (e.g., FAQ, Product Info)"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Paste your content here..."
            rows={5}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setShowTextInput(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={handleAddText}
              disabled={!textInput.trim() || !textName.trim()}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Knowledge Base Items */}
      {formData.knowledgeBase.length > 0 && (
        <div className="mb-8 space-y-2">
          <h3 className="font-medium text-gray-900 mb-3">Added Knowledge</h3>
          {formData.knowledgeBase.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg"
            >
              {item.type === 'file' && <FileText className="w-5 h-5 text-gray-400" />}
              {item.type === 'url' && <Link className="w-5 h-5 text-gray-400" />}
              {item.type === 'text' && <FileText className="w-5 h-5 text-gray-400" />}
              <span className="flex-1 text-gray-700 truncate">{item.name}</span>
              {item.status === 'pending' && (
                <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
              )}
              {item.status === 'ready' && (
                <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">Ready</span>
              )}
              <button
                onClick={() => handleRemoveItem(item.id)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="flex gap-3">
          <button
            onClick={onSkip}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Skip
          </button>
          <button
            onClick={onNext}
            className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

export default StepKnowledgeBase;
