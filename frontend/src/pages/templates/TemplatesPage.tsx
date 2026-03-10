import { useState, useEffect } from 'react';
import {
  DocumentTextIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  DocumentDuplicateIcon,
  EyeIcon,
  ChatBubbleLeftIcon,
  EnvelopeIcon,
  DevicePhoneMobileIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import api from '../../services/api';

interface Template {
  id: string;
  name: string;
  type: 'SMS' | 'EMAIL' | 'WHATSAPP';
  category: string | null;
  subject: string | null;
  content: string;
  htmlContent: string | null;
  variables: string[];
  sampleValues: Record<string, string>;
  whatsappStatus: string;
  isActive: boolean;
  isDefault: boolean;
  usageCount: number;
  lastUsedAt: string | null;
  createdAt: string;
}

interface Variable {
  key: string;
  variable: string;
  description: string;
}

const typeIcons = {
  SMS: DevicePhoneMobileIcon,
  EMAIL: EnvelopeIcon,
  WHATSAPP: ChatBubbleLeftIcon,
};

const typeColors = {
  SMS: 'bg-blue-100 text-blue-700',
  EMAIL: 'bg-purple-100 text-purple-700',
  WHATSAPP: 'bg-green-100 text-green-700',
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [variables, setVariables] = useState<Variable[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'SMS' as 'SMS' | 'EMAIL' | 'WHATSAPP',
    category: '',
    subject: '',
    content: '',
    htmlContent: '',
    sampleValues: {} as Record<string, string>,
  });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [smsInfo, setSmsInfo] = useState<any>(null);

  useEffect(() => {
    fetchTemplates();
    fetchVariables();
    fetchCategories();
  }, [typeFilter, categoryFilter, searchQuery]);

  const fetchTemplates = async () => {
    try {
      const params = new URLSearchParams();
      if (typeFilter) params.append('type', typeFilter);
      if (categoryFilter) params.append('category', categoryFilter);
      if (searchQuery) params.append('search', searchQuery);

      const response = await api.get(`/templates?${params.toString()}`);
      setTemplates(response.data.data);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVariables = async () => {
    try {
      const response = await api.get('/templates/variables');
      setVariables(response.data.data);
    } catch (error) {
      console.error('Failed to fetch variables:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/templates/categories');
      setCategories(response.data.data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const handleCreateOrUpdate = async () => {
    if (!formData.name || !formData.content) {
      setFormError('Name and content are required');
      return;
    }

    if (formData.type === 'EMAIL' && !formData.subject) {
      setFormError('Subject is required for email templates');
      return;
    }

    setSaving(true);
    setFormError('');

    try {
      if (isEditing && selectedTemplate) {
        await api.put(`/templates/${selectedTemplate.id}`, formData);
      } else {
        await api.post('/templates', formData);
      }
      fetchTemplates();
      resetForm();
      setShowCreateModal(false);
    } catch (error: any) {
      setFormError(error.response?.data?.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      await api.delete(`/templates/${id}`);
      fetchTemplates();
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await api.post(`/templates/${id}/duplicate`);
      fetchTemplates();
    } catch (error) {
      console.error('Failed to duplicate template:', error);
    }
  };

  const handlePreview = async (template: Template) => {
    try {
      const response = await api.get(`/templates/${template.id}/preview`);
      setPreviewData(response.data.data);
      setSelectedTemplate(template);
      setShowPreviewModal(true);
    } catch (error) {
      console.error('Failed to preview template:', error);
    }
  };

  const handleEdit = (template: Template) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      type: template.type,
      category: template.category || '',
      subject: template.subject || '',
      content: template.content,
      htmlContent: template.htmlContent || '',
      sampleValues: template.sampleValues || {},
    });
    setIsEditing(true);
    setShowCreateModal(true);
  };

  const handleToggleDefault = async (template: Template) => {
    try {
      await api.put(`/templates/${template.id}`, { isDefault: !template.isDefault });
      fetchTemplates();
    } catch (error) {
      console.error('Failed to toggle default:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'SMS',
      category: '',
      subject: '',
      content: '',
      htmlContent: '',
      sampleValues: {},
    });
    setSelectedTemplate(null);
    setIsEditing(false);
    setFormError('');
    setSmsInfo(null);
  };

  const insertVariable = (variable: string) => {
    setFormData(prev => ({
      ...prev,
      content: prev.content + variable,
    }));
  };

  const updateSmsInfo = async (content: string) => {
    if (formData.type !== 'SMS') {
      setSmsInfo(null);
      return;
    }
    try {
      const response = await api.post('/templates/sms-info', { content });
      setSmsInfo(response.data.data);
    } catch (error) {
      console.error('Failed to get SMS info:', error);
    }
  };

  const extractVariablesFromContent = (content: string): string[] => {
    const regex = /\{\{(\w+)\}\}/g;
    const vars: string[] = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
      if (!vars.includes(match[1])) {
        vars.push(match[1]);
      }
    }
    return vars;
  };

  const getWhatsAppStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <span className="badge badge-success">Approved</span>;
      case 'REJECTED':
        return <span className="badge badge-danger">Rejected</span>;
      case 'PENDING':
        return <span className="badge badge-warning">Pending</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Message Templates</h1>
          <p className="text-sm text-slate-600 mt-1">
            Create and manage templates for SMS, Email, and WhatsApp messages
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className="btn btn-primary"
        >
          <PlusIcon className="h-5 w-5" />
          <span>Create Template</span>
        </button>
      </div>

      {/* Filters */}
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
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Templates Grid */}
      {templates.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <DocumentTextIcon className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No Templates Yet</h3>
          <p className="text-sm text-slate-600 mb-4">
            Create your first message template to streamline your communications
          </p>
          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="btn btn-primary"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Create Template</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => {
            const TypeIcon = typeIcons[template.type];
            return (
              <div
                key={template.id}
                className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow"
              >
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
                            <span>·</span>
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
                  <p className="text-sm font-medium text-slate-700 mb-2 truncate">
                    {template.subject}
                  </p>
                )}

                <p className="text-sm text-slate-600 line-clamp-3 mb-3">
                  {template.content}
                </p>

                {template.type === 'WHATSAPP' && (
                  <div className="mb-3">
                    {getWhatsAppStatusBadge(template.whatsappStatus)}
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
                  <span>Used {template.usageCount} times</span>
                  {template.lastUsedAt && (
                    <span>Last: {new Date(template.lastUsedAt).toLocaleDateString()}</span>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-3 border-t">
                  <button
                    onClick={() => handlePreview(template)}
                    className="btn btn-ghost btn-sm flex-1"
                    title="Preview"
                  >
                    <EyeIcon className="h-4 w-4" />
                    <span>Preview</span>
                  </button>
                  <button
                    onClick={() => handleEdit(template)}
                    className="btn btn-ghost btn-sm"
                    title="Edit"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDuplicate(template.id)}
                    className="btn btn-ghost btn-sm"
                    title="Duplicate"
                  >
                    <DocumentDuplicateIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="btn btn-ghost btn-sm text-danger-600"
                    title="Delete"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
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
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  placeholder="e.g., Welcome Message"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Type *
                </label>
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
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Category
                </label>
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Subject *
                  </label>
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
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Content *
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => {
                  setFormData({ ...formData, content: e.target.value });
                  updateSmsInfo(e.target.value);
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
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Insert Variable
              </label>
              <div className="flex flex-wrap gap-2">
                {variables.slice(0, 12).map((v) => (
                  <button
                    key={v.key}
                    onClick={() => insertVariable(v.variable)}
                    className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                    title={v.description}
                  >
                    {v.variable}
                  </button>
                ))}
              </div>
            </div>

            {/* Sample Values */}
            {extractVariablesFromContent(formData.content).length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Sample Values (for preview)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {extractVariablesFromContent(formData.content).map((v) => (
                    <div key={v} className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 w-24 truncate">{`{{${v}}}`}</span>
                      <input
                        type="text"
                        value={formData.sampleValues[v] || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          sampleValues: { ...formData.sampleValues, [v]: e.target.value }
                        })}
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
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateOrUpdate}
                disabled={saving}
                className="btn btn-primary"
              >
                {saving ? 'Saving...' : isEditing ? 'Update Template' : 'Create Template'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && previewData && selectedTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                Preview: {selectedTemplate.name}
              </h3>
              <button
                onClick={() => {
                  setShowPreviewModal(false);
                  setPreviewData(null);
                  setSelectedTemplate(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
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
              <button
                onClick={() => {
                  setShowPreviewModal(false);
                  setPreviewData(null);
                  setSelectedTemplate(null);
                }}
                className="btn btn-primary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
