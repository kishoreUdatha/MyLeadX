import { useState, useEffect } from 'react';
import {
  PlusIcon,
  DocumentTextIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  ChatBubbleLeftRightIcon,
  DevicePhoneMobileIcon,
} from '@heroicons/react/24/outline';
import { templatesApi, MessageTemplate } from '../../services/messaging.service';

// WhatsApp Icon
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

type Channel = 'sms' | 'whatsapp' | 'rcs';

interface TemplateFormData {
  name: string;
  channel: Channel;
  content: string;
  dltTemplateId: string;
  whatsappTemplateId: string;
  variables: string[];
  useOwnDlt: boolean;
}

const TemplatesPage = () => {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Channel | 'all'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [formData, setFormData] = useState<TemplateFormData>({
    name: '',
    channel: 'sms',
    content: '',
    dltTemplateId: '',
    whatsappTemplateId: '',
    variables: [],
    useOwnDlt: false,
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const templates = await templatesApi.listTemplates();
      setTemplates(templates);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTemplate = async () => {
    try {
      await templatesApi.createTemplate({
        name: formData.name,
        channel: formData.channel,
        content: formData.content,
        dltTemplateId: formData.dltTemplateId || undefined,
        whatsappTemplateId: formData.whatsappTemplateId || undefined,
        variables: formData.variables,
      });
      setShowAddModal(false);
      resetForm();
      loadTemplates();
    } catch (error) {
      console.error('Failed to create template:', error);
    }
  };

  const handleUpdateTemplate = async () => {
    if (!editingTemplate) return;
    try {
      await templatesApi.updateTemplate(editingTemplate.id, {
        name: formData.name,
        content: formData.content,
        dltTemplateId: formData.dltTemplateId || undefined,
        whatsappTemplateId: formData.whatsappTemplateId || undefined,
        variables: formData.variables,
      });
      setEditingTemplate(null);
      resetForm();
      loadTemplates();
    } catch (error) {
      console.error('Failed to update template:', error);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      await templatesApi.deleteTemplate(id);
      loadTemplates();
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  };

  const openEditModal = (template: MessageTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      channel: template.type?.toLowerCase() as Channel,
      content: template.content,
      dltTemplateId: template.dltTemplateId || '',
      whatsappTemplateId: template.whatsappTemplateId || '',
      variables: (template.variables as string[]) || [],
      useOwnDlt: Boolean(template.dltTemplateId),
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      channel: 'sms',
      content: '',
      dltTemplateId: '',
      whatsappTemplateId: '',
      variables: [],
      useOwnDlt: false,
    });
  };

  const extractVariables = (content: string) => {
    const matches = content.match(/\{([^}]+)\}/g);
    if (!matches) return [];
    return [...new Set(matches.map((m) => m.slice(1, -1)))];
  };

  const handleContentChange = (content: string) => {
    setFormData({
      ...formData,
      content,
      variables: extractVariables(content),
    });
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'sms':
        return <ChatBubbleLeftRightIcon className="h-5 w-5 text-blue-600" />;
      case 'whatsapp':
        return <WhatsAppIcon className="h-5 w-5 text-green-600" />;
      case 'rcs':
        return <DevicePhoneMobileIcon className="h-5 w-5 text-purple-600" />;
      default:
        return <DocumentTextIcon className="h-5 w-5 text-gray-600" />;
    }
  };

  const filteredTemplates = activeTab === 'all'
    ? templates
    : templates.filter((t) => t.type?.toLowerCase() === activeTab);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Message Templates</h1>
          <p className="text-gray-600">Create and manage reusable message templates</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Create Template
        </button>
      </div>

      {/* Channel Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="flex border-b border-gray-200">
          {[
            { key: 'all', label: 'All' },
            { key: 'sms', label: 'SMS' },
            { key: 'whatsapp', label: 'WhatsApp' },
            { key: 'rcs', label: 'RCS' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as Channel | 'all')}
              className={`px-6 py-3 text-sm font-medium border-b-2 -mb-px ${
                activeTab === tab.key
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.length > 0 ? (
          filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    {getChannelIcon(template.type?.toLowerCase())}
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-semibold text-gray-900">{template.name}</h3>
                    <p className="text-xs text-gray-500 capitalize">{template.type?.toLowerCase()}</p>
                  </div>
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => openEditModal(template)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <p className="text-sm text-gray-600 line-clamp-3 mb-4">{template.content}</p>

              {template.variables && (template.variables as string[]).length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {(template.variables as string[]).map((variable) => (
                    <span
                      key={variable}
                      className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600"
                    >
                      {`{${variable}}`}
                    </span>
                  ))}
                </div>
              )}

              {template.type?.toLowerCase() === 'sms' && template.dltTemplateId && (
                <p className="text-xs text-gray-400 mt-3">DLT: {template.dltTemplateId}</p>
              )}
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
            <DocumentTextIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No templates yet</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 text-primary-600 hover:text-primary-700"
            >
              Create your first template
            </button>
          </div>
        )}
      </div>

      {/* Add/Edit Template Modal */}
      {(showAddModal || editingTemplate) && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => { setShowAddModal(false); setEditingTemplate(null); resetForm(); }} />
            <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingTemplate ? 'Edit Template' : 'Create Template'}
                </h3>
                <button onClick={() => { setShowAddModal(false); setEditingTemplate(null); resetForm(); }}>
                  <XMarkIcon className="h-6 w-6 text-gray-400" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Template Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Welcome Message"
                  />
                </div>

                {!editingTemplate && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Channel *</label>
                    <select
                      value={formData.channel}
                      onChange={(e) => setFormData({ ...formData, channel: e.target.value as Channel })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="sms">SMS</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="rcs">RCS</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message Content *</label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => handleContentChange(e.target.value)}
                    rows={5}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Hi {name}, welcome to our service!"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Use {'{variableName}'} for dynamic content
                  </p>
                </div>

                {formData.variables.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Variables Found</label>
                    <div className="flex flex-wrap gap-2">
                      {formData.variables.map((variable) => (
                        <span
                          key={variable}
                          className="px-2 py-1 bg-primary-100 text-primary-700 rounded text-sm"
                        >
                          {`{${variable}}`}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {formData.channel === 'sms' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">DLT Registration</label>
                    <div className="space-y-2 mb-4">
                      <label className="flex items-start p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="radio"
                          checked={!formData.useOwnDlt}
                          onChange={() => setFormData({ ...formData, useOwnDlt: false, dltTemplateId: '' })}
                          className="mt-0.5 h-4 w-4 text-primary-600 focus:ring-primary-500"
                        />
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">Use Platform DLT (Recommended)</p>
                          <p className="text-xs text-gray-500">We handle DLT compliance for you. No registration needed.</p>
                        </div>
                      </label>
                      <label className="flex items-start p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="radio"
                          checked={formData.useOwnDlt}
                          onChange={() => setFormData({ ...formData, useOwnDlt: true })}
                          className="mt-0.5 h-4 w-4 text-primary-600 focus:ring-primary-500"
                        />
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">I have my own DLT registration</p>
                          <p className="text-xs text-gray-500">Enter your DLT Template ID from JIO/Airtel/BSNL portal</p>
                        </div>
                      </label>
                    </div>

                    {formData.useOwnDlt && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">DLT Template ID *</label>
                        <input
                          type="text"
                          value={formData.dltTemplateId}
                          onChange={(e) => setFormData({ ...formData, dltTemplateId: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          placeholder="1107XXXXXXXXXXXX"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Get this from your DLT portal after template approval
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {formData.channel === 'whatsapp' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Template ID</label>
                    <input
                      type="text"
                      value={formData.whatsappTemplateId}
                      onChange={(e) => setFormData({ ...formData, whatsappTemplateId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="template_id"
                    />
                    <p className="text-xs text-gray-500 mt-1">Pre-approved WhatsApp template ID</p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => { setShowAddModal(false); setEditingTemplate(null); resetForm(); }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={editingTemplate ? handleUpdateTemplate : handleAddTemplate}
                  disabled={!formData.name || !formData.content || (formData.channel === 'sms' && formData.useOwnDlt && !formData.dltTemplateId)}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg disabled:opacity-50"
                >
                  {editingTemplate ? 'Update' : 'Create Template'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplatesPage;
