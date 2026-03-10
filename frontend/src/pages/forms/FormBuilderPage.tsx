import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  PlusIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  EyeIcon,
  CodeBracketIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { formService, FormField } from '../../services/form.service';

const fieldTypes = [
  { value: 'text', label: 'Text Input' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'select', label: 'Dropdown' },
  { value: 'radio', label: 'Radio Buttons' },
  { value: 'checkbox', label: 'Checkbox' },
];

export default function FormBuilderPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;

  const [formId, setFormId] = useState<string | null>(id || null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [fields, setFields] = useState<FormField[]>([
    { id: '1', type: 'text', label: 'Full Name', required: true },
    { id: '2', type: 'email', label: 'Email', required: true },
    { id: '3', type: 'phone', label: 'Phone', required: true },
  ]);
  const [showPreview, setShowPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(isEditing);

  // Load form data if editing
  useEffect(() => {
    if (id) {
      loadForm(id);
    }
  }, [id]);

  const loadForm = async (formId: string) => {
    try {
      setIsLoading(true);
      const form = await formService.getById(formId);
      setFormName(form.name);
      setFormDescription(form.description || '');
      setFields(form.fields);
      setFormId(form.id);
    } catch (error) {
      toast.error('Failed to load form');
      navigate('/forms');
    } finally {
      setIsLoading(false);
    }
  };

  const addField = () => {
    const newField: FormField = {
      id: Date.now().toString(),
      type: 'text',
      label: 'New Field',
      required: false,
    };
    setFields([...fields, newField]);
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    setFields(fields.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  const deleteField = (id: string) => {
    setFields(fields.filter((f) => f.id !== id));
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error('Please enter a form name');
      return;
    }

    if (fields.length === 0) {
      toast.error('Please add at least one field');
      return;
    }

    setIsSaving(true);
    try {
      const formData = {
        name: formName.trim(),
        description: formDescription.trim() || undefined,
        fields: fields,
      };

      if (formId) {
        // Update existing form
        await formService.update(formId, formData);
        toast.success('Form updated successfully');
      } else {
        // Create new form
        const newForm = await formService.create(formData);
        setFormId(newForm.id);
        toast.success('Form created successfully');
        // Navigate to edit mode with the new form ID
        navigate(`/forms/${newForm.id}/edit`, { replace: true });
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to save form';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const getEmbedCode = () => {
    const embedId = formId || 'FORM_ID';
    return `<iframe src="${window.location.origin}/embed/form/${embedId}" width="100%" height="600" frameborder="0"></iframe>`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Form Builder</h1>
          <p className="text-gray-600">Create custom lead capture forms.</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="btn btn-secondary"
          >
            <EyeIcon className="h-5 w-5 mr-2" />
            Preview
          </button>
          <button
            onClick={handleSave}
            className="btn btn-primary"
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : (formId ? 'Update Form' : 'Save Form')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Settings */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-medium">Form Settings</h2>
            </div>
            <div className="card-body space-y-4">
              <div>
                <label className="label">Form Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Contact Form"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Brief description of this form"
                  rows={2}
                  className="input"
                />
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="card">
            <div className="card-header flex justify-between items-center">
              <h2 className="text-lg font-medium">Form Fields</h2>
              <button onClick={addField} className="btn btn-secondary btn-sm">
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Field
              </button>
            </div>
            <div className="card-body space-y-4">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="border rounded-lg p-4 bg-gray-50"
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-sm font-medium text-gray-500">
                      Field {index + 1}
                    </span>
                    <button
                      onClick={() => deleteField(field.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Label</label>
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) =>
                          updateField(field.id, { label: e.target.value })
                        }
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">Type</label>
                      <select
                        value={field.type}
                        onChange={(e) =>
                          updateField(field.id, { type: e.target.value })
                        }
                        className="input"
                      >
                        {fieldTypes.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">Placeholder</label>
                      <input
                        type="text"
                        value={field.placeholder || ''}
                        onChange={(e) =>
                          updateField(field.id, { placeholder: e.target.value })
                        }
                        className="input"
                      />
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) =>
                            updateField(field.id, { required: e.target.checked })
                          }
                          className="h-4 w-4 text-primary-600 rounded border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-700">Required</span>
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Preview */}
          {showPreview && (
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-medium">Preview</h2>
              </div>
              <div className="card-body">
                <form className="space-y-4">
                  {fields.map((field) => (
                    <div key={field.id}>
                      <label className="label">
                        {field.label}
                        {field.required && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </label>
                      {field.type === 'textarea' ? (
                        <textarea
                          placeholder={field.placeholder}
                          className="input"
                          rows={3}
                        />
                      ) : field.type === 'select' ? (
                        <select className="input">
                          <option>Select...</option>
                        </select>
                      ) : (
                        <input
                          type={field.type}
                          placeholder={field.placeholder}
                          className="input"
                        />
                      )}
                    </div>
                  ))}
                  <button type="button" className="w-full btn btn-primary">
                    Submit
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Embed Code */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-medium flex items-center">
                <CodeBracketIcon className="h-5 w-5 mr-2" />
                Embed Code
              </h2>
            </div>
            <div className="card-body">
              <p className="text-sm text-gray-600 mb-3">
                Copy this code to embed the form on your website.
              </p>
              <div className="bg-gray-900 text-gray-100 p-3 rounded-lg text-xs overflow-x-auto">
                <code>{getEmbedCode()}</code>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(getEmbedCode());
                  toast.success('Copied to clipboard');
                }}
                className="mt-3 btn btn-secondary w-full"
              >
                <DocumentDuplicateIcon className="h-4 w-4 mr-2" />
                Copy Code
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
