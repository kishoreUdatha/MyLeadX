import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Search,
  Edit,
  Trash2,
  Copy,
  Eye,
  Building2,
  GraduationCap,
  BookOpen,
  ToggleLeft,
  ToggleRight,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { collegeAdmissionFormService, CollegeAdmissionForm } from '../../services/college-admission-form.service';
import { toast } from 'react-hot-toast';

const CollegeFormsPage: React.FC = () => {
  const navigate = useNavigate();
  const [forms, setForms] = useState<CollegeAdmissionForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<boolean | undefined>(undefined);

  // Clone modal state
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [cloneSource, setCloneSource] = useState<CollegeAdmissionForm | null>(null);
  const [cloneFormName, setCloneFormName] = useState('');

  // Delete confirmation
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CollegeAdmissionForm | null>(null);

  useEffect(() => {
    fetchForms();
  }, [pagination.page, filterActive]);

  const fetchForms = async () => {
    try {
      setLoading(true);
      const result = await collegeAdmissionFormService.listForms({
        page: pagination.page,
        limit: pagination.limit,
        isActive: filterActive,
      });
      setForms(result.forms);
      setPagination((prev) => ({ ...prev, ...result.pagination }));
    } catch (error) {
      console.error('Error fetching forms:', error);
      toast.error('Failed to load forms');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (form: CollegeAdmissionForm) => {
    try {
      await collegeAdmissionFormService.updateForm(form.id, { isActive: !form.isActive });
      toast.success(`Form ${form.isActive ? 'deactivated' : 'activated'} successfully`);
      fetchForms();
    } catch (error) {
      toast.error('Failed to update form status');
    }
  };

  const handleClone = async () => {
    if (!cloneSource || !cloneFormName.trim()) {
      toast.error('Please enter a form name');
      return;
    }

    try {
      await collegeAdmissionFormService.cloneForm(cloneSource.id, {
        formName: cloneFormName,
      });
      toast.success('Form cloned successfully');
      setShowCloneModal(false);
      setCloneSource(null);
      setCloneFormName('');
      fetchForms();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to clone form');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await collegeAdmissionFormService.deleteForm(deleteTarget.id);
      toast.success('Form deleted successfully');
      setShowDeleteModal(false);
      setDeleteTarget(null);
      fetchForms();
    } catch (error) {
      toast.error('Failed to delete form');
    }
  };

  const filteredForms = forms.filter(
    (form) =>
      form.formName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      form.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getFormLevel = (form: CollegeAdmissionForm) => {
    if (form.courseId) return { label: 'Course', color: 'bg-purple-100 text-purple-700', icon: BookOpen };
    if (form.collegeId) return { label: 'College', color: 'bg-blue-100 text-blue-700', icon: GraduationCap };
    return { label: 'University', color: 'bg-green-100 text-green-700', icon: Building2 };
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">College Admission Forms</h1>
          <p className="text-gray-600 mt-1">Manage application forms for different colleges and courses</p>
        </div>
        <button
          onClick={() => navigate('/admission-partners/forms/new')}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Form
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[250px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search forms..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          <select
            value={filterActive === undefined ? '' : filterActive ? 'active' : 'inactive'}
            onChange={(e) => {
              if (e.target.value === '') setFilterActive(undefined);
              else setFilterActive(e.target.value === 'active');
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Forms List */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : filteredForms.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <FileText className="w-12 h-12 mb-4 text-gray-300" />
            <p className="text-lg font-medium">No forms found</p>
            <p className="text-sm">Create your first college admission form</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Form Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fields
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Updated
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredForms.map((form) => {
                const level = getFormLevel(form);
                const LevelIcon = level.icon;

                return (
                  <tr key={form.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{form.formName}</div>
                        {form.description && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">{form.description}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${level.color}`}>
                        <LevelIcon className="w-3 h-3" />
                        {level.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">{form.formFields?.length || 0} fields</span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleActive(form)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                          form.isActive
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {form.isActive ? (
                          <>
                            <ToggleRight className="w-4 h-4" /> Active
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="w-4 h-4" /> Inactive
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-500">
                        {new Date(form.updatedAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/admission-partners/forms/${form.id}`)}
                          className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => navigate(`/admission-partners/forms/${form.id}/edit`)}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setCloneSource(form);
                            setCloneFormName(`${form.formName} (Copy)`);
                            setShowCloneModal(true);
                          }}
                          className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Clone"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setDeleteTarget(form);
                            setShowDeleteModal(true);
                          }}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <div className="text-sm text-gray-600">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} forms
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-gray-600">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === pagination.totalPages}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Clone Modal */}
      {showCloneModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Clone Form</h3>
            <p className="text-sm text-gray-600 mb-4">
              Create a copy of "{cloneSource?.formName}"
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">New Form Name</label>
              <input
                type="text"
                value={cloneFormName}
                onChange={(e) => setCloneFormName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter form name"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCloneModal(false);
                  setCloneSource(null);
                  setCloneFormName('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClone}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Clone Form
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Delete Form</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete "{deleteTarget?.formName}"? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteTarget(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollegeFormsPage;
