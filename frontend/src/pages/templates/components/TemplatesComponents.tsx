/**
 * Templates Components
 * TemplateCard, CreateEditModal, PreviewModal, EmptyState
 */

import React from 'react';
import {
  DocumentTextIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  DocumentDuplicateIcon,
  EyeIcon,
  XCircleIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import {
  Template,
  Variable,
  TemplateFormData,
  PreviewData,
  SmsInfo,
} from '../templates.types';
import {
  typeIcons,
  typeColors,
  getWhatsAppStatusBadge,
  extractVariablesFromContent,
} from '../templates.constants';

// Filters Bar
interface FiltersBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  typeFilter: string;
  setTypeFilter: (filter: string) => void;
  categoryFilter: string;
  setCategoryFilter: (filter: string) => void;
  categories: string[];
}

export const FiltersBar: React.FC<FiltersBarProps> = ({
  searchQuery,
  setSearchQuery,
  typeFilter,
  setTypeFilter,
  categoryFilter,
  setCategoryFilter,
  categories,
}) => (
  <div className="bg-white rounded-xl border border-slate-200 p-4">
    <div className="flex flex-wrap gap-4">
      <div className="flex-1 min-w-[200px]">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10"
          />
        </div>
      </div>
      <select
        value={typeFilter}
        onChange={(e) => setTypeFilter(e.target.value)}
        className="input w-40"
      >
        <option value="">All Types</option>
        <option value="SMS">SMS</option>
        <option value="EMAIL">Email</option>
        <option value="WHATSAPP">WhatsApp</option>
      </select>
      <select
        value={categoryFilter}
        onChange={(e) => setCategoryFilter(e.target.value)}
        className="input w-40"
      >
        <option value="">All Categories</option>
        {categories.map((cat) => (
          <option key={cat} value={cat}>
            {cat}
          </option>
        ))}
      </select>
    </div>
  </div>
);

// Template Card
interface TemplateCardProps {
  template: Template;
  onPreview: (template: Template) => void;
  onEdit: (template: Template) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

export const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  onPreview,
  onEdit,
  onDuplicate,
  onDelete,
}) => {
  const TypeIcon = typeIcons[template.type];
  const statusBadge = getWhatsAppStatusBadge(template.whatsappStatus);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${typeColors[template.type]}`}>
            <TypeIcon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">{template.name}</h3>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>{template.type}</span>
              {template.category && (
                <>
                  <span>\u00B7</span>
                  <span className="capitalize">{template.category}</span>
                </>
              )}
            </div>
          </div>
        </div>
        {template.isDefault && (
          <span className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs font-medium rounded-full">
            Default
          </span>
        )}
      </div>

      {template.subject && (
        <p className="text-sm font-medium text-slate-700 mb-2 truncate">{template.subject}</p>
      )}

      <p className="text-sm text-slate-600 line-clamp-3 mb-3">{template.content}</p>

      {template.type === 'WHATSAPP' && (
        <div className="mb-3">
          <span className={statusBadge.className}>{statusBadge.label}</span>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
        <span>Used {template.usageCount} times</span>
        {template.lastUsedAt && (
          <span>Last: {new Date(template.lastUsedAt).toLocaleDateString()}</span>
        )}
      </div>

      <div className="flex items-center gap-2 pt-3 border-t">
        <button onClick={() => onPreview(template)} className="btn btn-ghost btn-sm flex-1">
          <EyeIcon className="h-4 w-4" />
          <span>Preview</span>
        </button>
        <button onClick={() => onEdit(template)} className="btn btn-ghost btn-sm" title="Edit">
          <PencilIcon className="h-4 w-4" />
        </button>
        <button
          onClick={() => onDuplicate(template.id)}
          className="btn btn-ghost btn-sm"
          title="Duplicate"
        >
          <DocumentDuplicateIcon className="h-4 w-4" />
        </button>
        <button
          onClick={() => onDelete(template.id)}
          className="btn btn-ghost btn-sm text-danger-600"
          title="Delete"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

// Empty State
interface EmptyStateProps {
  onCreateClick: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onCreateClick }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
    <DocumentTextIcon className="h-12 w-12 text-slate-400 mx-auto mb-4" />
    <h3 className="text-lg font-medium text-slate-900 mb-2">No Templates Yet</h3>
    <p className="text-sm text-slate-600 mb-4">
      Create your first message template to streamline your communications
    </p>
    <button onClick={onCreateClick} className="btn btn-primary">
      <PlusIcon className="h-5 w-5" />
      <span>Create Template</span>
    </button>
  </div>
);

// Create/Edit Modal
interface CreateEditModalProps {
  isOpen: boolean;
  isEditing: boolean;
  formData: TemplateFormData;
  setFormData: React.Dispatch<React.SetStateAction<TemplateFormData>>;
  formError: string;
  saving: boolean;
  categories: string[];
  variables: Variable[];
  smsInfo: SmsInfo | null;
  onClose: () => void;
  onSubmit: () => void;
  onInsertVariable: (variable: string) => void;
  onUpdateSmsInfo: (content: string) => void;
}

export const CreateEditModal: React.FC<CreateEditModalProps> = ({
  isOpen,
  isEditing,
  formData,
  setFormData,
  formError,
  saving,
  categories,
  variables,
  smsInfo,
  onClose,
  onSubmit,
  onInsertVariable,
  onUpdateSmsInfo,
}) => {
  if (!isOpen) return null;

  const contentVariables = extractVariablesFromContent(formData.content);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">
          {isEditing ? 'Edit Template' : 'Create Template'}
        </h3>

        {formError && (
          <div className="mb-4 p-3 bg-danger-50 border border-danger-200 rounded-lg text-danger-700 text-sm">
            {formError}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Template Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input"
              placeholder="e.g., Welcome Message"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Type *</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              className="input"
              disabled={isEditing}
            >
              <option value="SMS">SMS</option>
              <option value="EMAIL">Email</option>
              <option value="WHATSAPP">WhatsApp</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
            <input
              type="text"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="input"
              placeholder="e.g., marketing, reminder"
              list="categories"
            />
            <datalist id="categories">
              {categories.map((cat) => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
          </div>
          {formData.type === 'EMAIL' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Subject *</label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="input"
                placeholder="Email subject line"
              />
            </div>
          )}
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-1">Content *</label>
          <textarea
            value={formData.content}
            onChange={(e) => {
              setFormData({ ...formData, content: e.target.value });
              onUpdateSmsInfo(e.target.value);
            }}
            className="input min-h-[150px] font-mono text-sm"
            placeholder="Type your message here. Use {{variableName}} for dynamic content."
          />
          {formData.type === 'SMS' && smsInfo && (
            <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
              <span>Characters: {smsInfo.length}</span>
              <span>Segments: {smsInfo.segments}</span>
              <span>Encoding: {smsInfo.encoding}</span>
            </div>
          )}
        </div>

        {/* Variables */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">Insert Variable</label>
          <div className="flex flex-wrap gap-2">
            {variables.slice(0, 12).map((v) => (
              <button
                key={v.key}
                onClick={() => onInsertVariable(v.variable)}
                className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                title={v.description}
              >
                {v.variable}
              </button>
            ))}
          </div>
        </div>

        {/* Sample Values */}
        {contentVariables.length > 0 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Sample Values (for preview)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {contentVariables.map((v) => (
                <div key={v} className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 w-24 truncate">{`{{${v}}}`}</span>
                  <input
                    type="text"
                    value={formData.sampleValues[v] || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        sampleValues: { ...formData.sampleValues, [v]: e.target.value },
                      })
                    }
                    className="input text-sm flex-1"
                    placeholder={`Sample ${v}`}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {formData.type === 'EMAIL' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              HTML Content (optional)
            </label>
            <textarea
              value={formData.htmlContent}
              onChange={(e) => setFormData({ ...formData, htmlContent: e.target.value })}
              className="input min-h-[100px] font-mono text-sm"
              placeholder="<html>...</html>"
            />
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button onClick={onSubmit} disabled={saving} className="btn btn-primary">
            {saving ? 'Saving...' : isEditing ? 'Update Template' : 'Create Template'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Preview Modal
interface PreviewModalProps {
  isOpen: boolean;
  template: Template | null;
  previewData: PreviewData | null;
  onClose: () => void;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({
  isOpen,
  template,
  previewData,
  onClose,
}) => {
  if (!isOpen || !previewData || !template) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Preview: {template.name}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <XCircleIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Original */}
          <div>
            <h4 className="text-sm font-medium text-slate-700 mb-2">Original Template</h4>
            <div className="bg-slate-50 rounded-lg p-4">
              {previewData.original.subject && (
                <p className="text-sm font-medium mb-2">
                  <span className="text-slate-500">Subject:</span> {previewData.original.subject}
                </p>
              )}
              <p className="text-sm whitespace-pre-wrap font-mono">{previewData.original.content}</p>
            </div>
          </div>

          {/* Rendered */}
          <div>
            <h4 className="text-sm font-medium text-slate-700 mb-2">Rendered Preview</h4>
            <div className="bg-primary-50 rounded-lg p-4 border border-primary-200">
              {previewData.rendered.subject && (
                <p className="text-sm font-medium mb-2">
                  <span className="text-primary-600">Subject:</span> {previewData.rendered.subject}
                </p>
              )}
              <p className="text-sm whitespace-pre-wrap">{previewData.rendered.content}</p>
            </div>
          </div>

          {/* Variables Used */}
          {previewData.variables.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-slate-700 mb-2">Variables</h4>
              <div className="flex flex-wrap gap-2">
                {previewData.variables.map((v: string) => (
                  <span key={v} className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded">
                    {`{{${v}}}`} = {previewData.sampleValues[v] || '(empty)'}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end mt-6">
          <button onClick={onClose} className="btn btn-primary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
