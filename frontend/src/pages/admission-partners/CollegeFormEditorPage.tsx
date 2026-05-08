import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  GripVertical,
  Settings,
  Eye,
  ChevronDown,
  ChevronUp,
  Type,
  AlignLeft,
  Hash,
  Mail,
  Phone,
  Calendar,
  List,
  CheckSquare,
  Upload,
  CircleDot,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  collegeAdmissionFormService,
  FormField,
  FormSection,
  CollegeAdmissionForm,
} from '../../services/college-admission-form.service';

const FIELD_TYPES = [
  { type: 'text', label: 'Text', icon: Type },
  { type: 'textarea', label: 'Text Area', icon: AlignLeft },
  { type: 'number', label: 'Number', icon: Hash },
  { type: 'email', label: 'Email', icon: Mail },
  { type: 'phone', label: 'Phone', icon: Phone },
  { type: 'date', label: 'Date', icon: Calendar },
  { type: 'select', label: 'Dropdown', icon: List },
  { type: 'radio', label: 'Radio', icon: CircleDot },
  { type: 'checkbox', label: 'Checkbox', icon: CheckSquare },
  { type: 'file', label: 'File Upload', icon: Upload },
];

const CollegeFormEditorPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = id && id !== 'new';

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form metadata
  const [formName, setFormName] = useState('');
  const [description, setDescription] = useState('');
  const [universityId, setUniversityId] = useState('');
  const [collegeId, setCollegeId] = useState('');
  const [courseId, setCourseId] = useState('');

  // Form fields
  const [fields, setFields] = useState<FormField[]>([]);
  const [sections, setSections] = useState<FormSection[]>([]);

  // UI State
  const [selectedFieldIndex, setSelectedFieldIndex] = useState<number | null>(null);
  const [showFieldPalette, setShowFieldPalette] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set([0]));

  // Universities/Colleges for dropdowns (you should fetch these from API)
  const [universities, setUniversities] = useState<any[]>([]);
  const [colleges, setColleges] = useState<any[]>([]);

  useEffect(() => {
    if (isEditMode) {
      fetchForm();
    } else {
      loadDefaultTemplate();
    }
    fetchUniversities();
  }, [id]);

  const fetchForm = async () => {
    try {
      setLoading(true);
      const form = await collegeAdmissionFormService.getFormById(id!);
      setFormName(form.formName);
      setDescription(form.description || '');
      setUniversityId(form.universityId);
      setCollegeId(form.collegeId || '');
      setCourseId(form.courseId || '');
      setFields(form.formFields || []);
      setSections(form.sections || []);
    } catch (error) {
      toast.error('Failed to load form');
      navigate('/admission-partners/forms');
    } finally {
      setLoading(false);
    }
  };

  const loadDefaultTemplate = async () => {
    try {
      const template = await collegeAdmissionFormService.getTemplate();
      setFields(template.formFields);
      setSections(template.sections);
    } catch (error) {
      console.error('Failed to load template:', error);
    }
  };

  const fetchUniversities = async () => {
    // TODO: Fetch universities from API
    // For now, using placeholder
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error('Please enter a form name');
      return;
    }

    if (!universityId) {
      toast.error('Please select a university');
      return;
    }

    if (fields.length === 0) {
      toast.error('Please add at least one field');
      return;
    }

    try {
      setSaving(true);

      if (isEditMode) {
        await collegeAdmissionFormService.updateForm(id!, {
          formName,
          description,
          formFields: fields,
          sections,
        });
        toast.success('Form updated successfully');
      } else {
        await collegeAdmissionFormService.createForm({
          universityId,
          collegeId: collegeId || undefined,
          courseId: courseId || undefined,
          formName,
          description,
          formFields: fields,
          sections,
        });
        toast.success('Form created successfully');
      }

      navigate('/admission-partners/forms');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save form');
    } finally {
      setSaving(false);
    }
  };

  const addField = (type: string) => {
    const fieldType = type as FormField['fieldType'];
    const newField: FormField = {
      key: `field_${Date.now()}`,
      label: `New ${type.charAt(0).toUpperCase() + type.slice(1)} Field`,
      fieldType,
      required: false,
      options: ['select', 'radio', 'checkbox'].includes(type) ? ['Option 1', 'Option 2'] : undefined,
    };
    setFields([...fields, newField]);
    setSelectedFieldIndex(fields.length);
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], ...updates };
    setFields(newFields);
  };

  const removeField = (index: number) => {
    const newFields = fields.filter((_, i) => i !== index);
    setFields(newFields);
    setSelectedFieldIndex(null);
  };

  const moveField = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= fields.length) return;
    const newFields = [...fields];
    const [moved] = newFields.splice(fromIndex, 1);
    newFields.splice(toIndex, 0, moved);
    setFields(newFields);
    setSelectedFieldIndex(toIndex);
  };

  const getFieldIcon = (type: string) => {
    const fieldType = FIELD_TYPES.find((f) => f.type === type);
    return fieldType?.icon || Type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admission-partners/forms')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {isEditMode ? 'Edit Form' : 'Create New Form'}
            </h1>
            <p className="text-sm text-gray-500">Design your college admission form</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFieldPalette(!showFieldPalette)}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Fields
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Form'}
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Field Palette */}
        {showFieldPalette && (
          <div className="w-64 bg-white border-r p-4 overflow-y-auto">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Field Types</h3>
            <div className="space-y-2">
              {FIELD_TYPES.map((field) => {
                const Icon = field.icon;
                return (
                  <button
                    key={field.type}
                    onClick={() => addField(field.type)}
                    className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg transition-colors"
                  >
                    <Icon className="w-4 h-4" />
                    {field.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Form Builder */}
        <div className="flex-1 p-6 overflow-y-auto">
          {/* Form Settings */}
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Form Settings</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Form Name *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g., Engineering Admission Form"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Brief description of this form"
                />
              </div>

              {!isEditMode && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">University *</label>
                    <input
                      type="text"
                      value={universityId}
                      onChange={(e) => setUniversityId(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Enter University ID"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">College (Optional)</label>
                    <input
                      type="text"
                      value={collegeId}
                      onChange={(e) => setCollegeId(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Enter College ID (optional)"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Fields List */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Form Fields ({fields.length})</h3>
            </div>

            {fields.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Plus className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No fields added yet</p>
                <p className="text-sm">Click "Add Fields" to start building your form</p>
              </div>
            ) : (
              <div className="space-y-3">
                {fields.map((field, index) => {
                  const FieldIcon = getFieldIcon(field.fieldType);
                  const isSelected = selectedFieldIndex === index;

                  return (
                    <div
                      key={field.key}
                      className={`border rounded-lg transition-all ${
                        isSelected ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div
                        className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                        onClick={() => setSelectedFieldIndex(isSelected ? null : index)}
                      >
                        <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />
                        <FieldIcon className="w-4 h-4 text-gray-500" />
                        <div className="flex-1">
                          <span className="font-medium text-gray-900">{field.label}</span>
                          <span className="ml-2 text-xs text-gray-500">({field.fieldType})</span>
                          {field.required && (
                            <span className="ml-2 text-xs text-red-500">*Required</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              moveField(index, index - 1);
                            }}
                            disabled={index === 0}
                            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              moveField(index, index + 1);
                            }}
                            disabled={index === fields.length - 1}
                            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeField(index);
                            }}
                            className="p-1 text-gray-400 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Field Settings (Expanded) */}
                      {isSelected && (
                        <div className="border-t px-4 py-4 bg-gray-50">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Field Key</label>
                              <input
                                type="text"
                                value={field.key}
                                onChange={(e) => updateField(index, { key: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                placeholder="e.g., studentName"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
                              <input
                                type="text"
                                value={field.label}
                                onChange={(e) => updateField(index, { label: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                placeholder="e.g., Student Name"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Placeholder</label>
                              <input
                                type="text"
                                value={field.placeholder || ''}
                                onChange={(e) => updateField(index, { placeholder: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                placeholder="e.g., Enter full name"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Grid Span</label>
                              <select
                                value={field.gridSpan || 1}
                                onChange={(e) => updateField(index, { gridSpan: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                              >
                                <option value={1}>Half Width</option>
                                <option value={2}>Full Width</option>
                              </select>
                            </div>

                            <div className="col-span-2">
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={field.required}
                                  onChange={(e) => updateField(index, { required: e.target.checked })}
                                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="text-sm font-medium text-gray-700">Required Field</span>
                              </label>
                            </div>

                            {/* Options for select/radio/checkbox */}
                            {['select', 'radio', 'checkbox'].includes(field.fieldType) && (
                              <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Options (one per line)
                                </label>
                                <textarea
                                  value={(field.options || []).join('\n')}
                                  onChange={(e) =>
                                    updateField(index, {
                                      options: e.target.value.split('\n').filter((o) => o.trim()),
                                    })
                                  }
                                  rows={4}
                                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                  placeholder="Option 1&#10;Option 2&#10;Option 3"
                                />
                              </div>
                            )}

                            <div className="col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-1">Help Text</label>
                              <input
                                type="text"
                                value={field.helpText || ''}
                                onChange={(e) => updateField(index, { helpText: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                placeholder="Additional help text for this field"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Preview Panel */}
        <div className="w-96 bg-white border-l p-6 overflow-y-auto hidden xl:block">
          <div className="flex items-center gap-2 mb-4">
            <Eye className="w-5 h-5 text-gray-500" />
            <h3 className="text-lg font-semibold text-gray-900">Preview</h3>
          </div>

          <div className="border rounded-lg p-4">
            <h4 className="text-lg font-semibold text-gray-900 mb-2">{formName || 'Form Title'}</h4>
            {description && <p className="text-sm text-gray-600 mb-4">{description}</p>}

            <div className="space-y-4">
              {fields.map((field) => (
                <div key={field.key} className={field.gridSpan === 2 ? 'col-span-2' : ''}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>

                  {field.fieldType === 'text' && (
                    <input
                      type="text"
                      placeholder={field.placeholder}
                      disabled
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-50"
                    />
                  )}

                  {field.fieldType === 'textarea' && (
                    <textarea
                      placeholder={field.placeholder}
                      disabled
                      rows={3}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-50"
                    />
                  )}

                  {field.fieldType === 'select' && (
                    <select disabled className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-50">
                      <option>{field.placeholder || 'Select...'}</option>
                      {field.options?.map((opt) => (
                        <option key={opt}>{opt}</option>
                      ))}
                    </select>
                  )}

                  {field.fieldType === 'radio' && (
                    <div className="space-y-2">
                      {field.options?.map((opt) => (
                        <label key={opt} className="flex items-center gap-2 text-sm text-gray-700">
                          <input type="radio" disabled className="text-indigo-600" />
                          {opt}
                        </label>
                      ))}
                    </div>
                  )}

                  {field.fieldType === 'checkbox' && (
                    <div className="space-y-2">
                      {field.options?.map((opt) => (
                        <label key={opt} className="flex items-center gap-2 text-sm text-gray-700">
                          <input type="checkbox" disabled className="rounded text-indigo-600" />
                          {opt}
                        </label>
                      ))}
                    </div>
                  )}

                  {['number', 'email', 'phone', 'date'].includes(field.fieldType) && (
                    <input
                      type={field.fieldType === 'phone' ? 'tel' : field.fieldType}
                      placeholder={field.placeholder}
                      disabled
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-50"
                    />
                  )}

                  {field.fieldType === 'file' && (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center text-sm text-gray-500">
                      Click to upload file
                    </div>
                  )}

                  {field.helpText && <p className="mt-1 text-xs text-gray-500">{field.helpText}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollegeFormEditorPage;
