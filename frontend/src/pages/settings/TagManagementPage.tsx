/**
 * Tag Management Page
 * Create, edit, and delete lead tags
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import {
  ArrowLeftIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  TagIcon,
  SparklesIcon,
  XMarkIcon,
  AcademicCapIcon,
  BuildingOfficeIcon,
  HeartIcon,
  ShieldCheckIcon,
  BanknotesIcon,
  ComputerDesktopIcon,
  ShoppingCartIcon,
  CubeIcon,
} from '@heroicons/react/24/outline';
import leadTagsService, { LeadTag, CreateTagData, UpdateTagData } from '../../services/lead-tags.service';

// Industry configuration with icons and tag previews
const INDUSTRY_CONFIG: Record<string, {
  name: string;
  icon: React.ComponentType<any>;
  color: string;
  tags: string[];
}> = {
  EDUCATION: {
    name: 'Education',
    icon: AcademicCapIcon,
    color: 'text-blue-600 bg-blue-50',
    tags: ['Scholarship Required', 'Hostel Needed', 'Parent Follow-up', 'Campus Visit Done', 'Documents Pending', 'Fee Negotiation'],
  },
  REAL_ESTATE: {
    name: 'Real Estate',
    icon: BuildingOfficeIcon,
    color: 'text-emerald-600 bg-emerald-50',
    tags: ['Site Visit Done', 'Site Visit Scheduled', 'Loan Required', 'NRI Buyer', 'Ready to Move', 'Price Negotiation'],
  },
  HEALTHCARE: {
    name: 'Healthcare',
    icon: HeartIcon,
    color: 'text-red-600 bg-red-50',
    tags: ['Insurance Patient', 'Emergency', 'Second Opinion', 'Surgery Required', 'Follow-up Care', 'Reports Pending'],
  },
  INSURANCE: {
    name: 'Insurance',
    icon: ShieldCheckIcon,
    color: 'text-indigo-600 bg-indigo-50',
    tags: ['Policy Renewal', 'Claim Pending', 'High Coverage', 'Family Floater', 'Documents Pending', 'Medical Done'],
  },
  FINANCE: {
    name: 'Finance',
    icon: BanknotesIcon,
    color: 'text-yellow-600 bg-yellow-50',
    tags: ['High Net Worth', 'Loan Approved', 'KYC Pending', 'CIBIL Issue', 'Documents Pending', 'Disbursement Ready'],
  },
  IT_RECRUITMENT: {
    name: 'IT / Recruitment',
    icon: ComputerDesktopIcon,
    color: 'text-purple-600 bg-purple-50',
    tags: ['Immediate Joiner', 'Notice Period', 'Remote Preferred', 'Salary Negotiation', 'Interview Scheduled', 'Offer Released'],
  },
  ECOMMERCE: {
    name: 'E-commerce',
    icon: ShoppingCartIcon,
    color: 'text-orange-600 bg-orange-50',
    tags: ['Repeat Customer', 'Cart Abandoned', 'Bulk Order', 'COD Preferred', 'Return Request', 'Loyalty Member'],
  },
  GENERAL: {
    name: 'General',
    icon: CubeIcon,
    color: 'text-gray-600 bg-gray-50',
    tags: ['Documents Pending', 'Payment Pending', 'Meeting Scheduled', 'Proposal Sent', 'Decision Maker', 'Budget Constraint'],
  },
};

const COMMON_TAGS = ['Hot Lead', 'VIP', 'Follow Up', 'Not Interested', 'Callback'];

// Predefined color options
const COLOR_OPTIONS = [
  { name: 'Red', value: '#EF4444' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Amber', value: '#F59E0B' },
  { name: 'Yellow', value: '#EAB308' },
  { name: 'Lime', value: '#84CC16' },
  { name: 'Green', value: '#22C55E' },
  { name: 'Emerald', value: '#10B981' },
  { name: 'Teal', value: '#14B8A6' },
  { name: 'Cyan', value: '#06B6D4' },
  { name: 'Sky', value: '#0EA5E9' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Indigo', value: '#6366F1' },
  { name: 'Violet', value: '#8B5CF6' },
  { name: 'Purple', value: '#A855F7' },
  { name: 'Fuchsia', value: '#D946EF' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Rose', value: '#F43F5E' },
  { name: 'Gray', value: '#6B7280' },
];

const TagManagementPage: React.FC = () => {
  const [tags, setTags] = useState<LeadTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTag, setEditingTag] = useState<LeadTag | null>(null);
  const [formData, setFormData] = useState<CreateTagData>({
    name: '',
    color: '#3B82F6',
    description: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Get organization industry from Redux store
  const { user } = useSelector((state: RootState) => state.auth);
  const orgIndustry = user?.organization?.industry || 'GENERAL';
  const industryConfig = INDUSTRY_CONFIG[orgIndustry] || INDUSTRY_CONFIG.GENERAL;
  const IndustryIcon = industryConfig.icon;

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      setLoading(true);
      const data = await leadTagsService.getTags(true);
      setTags(data.tags || []);
    } catch (err) {
      console.error('Failed to fetch tags:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDefaults = async () => {
    try {
      setSaving(true);
      await leadTagsService.createDefaultTags();
      await fetchTags();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create default tags');
    } finally {
      setSaving(false);
    }
  };

  const openCreateModal = () => {
    setEditingTag(null);
    setFormData({ name: '', color: '#3B82F6', description: '' });
    setError('');
    setShowModal(true);
  };

  const openEditModal = (tag: LeadTag) => {
    setEditingTag(tag);
    setFormData({
      name: tag.name,
      color: tag.color,
      description: tag.description || '',
    });
    setError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingTag(null);
    setFormData({ name: '', color: '#3B82F6', description: '' });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Tag name is required');
      return;
    }

    try {
      setSaving(true);
      setError('');

      if (editingTag) {
        await leadTagsService.updateTag(editingTag.id, formData as UpdateTagData);
      } else {
        await leadTagsService.createTag(formData);
      }

      await fetchTags();
      closeModal();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save tag');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tagId: string) => {
    try {
      setSaving(true);
      await leadTagsService.deleteTag(tagId);
      await fetchTags();
      setDeleteConfirm(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete tag');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/settings" className="p-1.5 hover:bg-gray-100 rounded-lg">
              <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold text-gray-800">Tag Management</h1>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${industryConfig.color}`}>
                  <IndustryIcon className="w-3 h-3" />
                  {industryConfig.name}
                </span>
              </div>
              <p className="text-sm text-gray-500">Create and manage lead tags for better organization</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {tags.length === 0 && (
              <button
                onClick={handleCreateDefaults}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 disabled:opacity-50"
              >
                <SparklesIcon className="w-4 h-4" />
                Create Industry Tags
              </button>
            )}
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
            >
              <PlusIcon className="w-4 h-4" />
              New Tag
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {tags.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            {/* Industry Header */}
            <div className="text-center mb-6">
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${industryConfig.color} mb-4`}>
                <IndustryIcon className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                {industryConfig.name} Industry Tags
              </h3>
              <p className="text-sm text-gray-500">
                Create tags customized for your {industryConfig.name.toLowerCase()} business
              </p>
            </div>

            {/* Tag Preview */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Tags that will be created ({COMMON_TAGS.length + industryConfig.tags.length} total)
              </h4>

              {/* Common Tags */}
              <div className="mb-3">
                <p className="text-xs text-gray-400 mb-2">Common Tags:</p>
                <div className="flex flex-wrap gap-2">
                  {COMMON_TAGS.map((tag) => (
                    <span key={tag} className="px-2 py-1 text-xs font-medium bg-white border border-gray-200 rounded-full text-gray-700">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Industry-Specific Tags */}
              <div>
                <p className="text-xs text-gray-400 mb-2">{industryConfig.name} Specific:</p>
                <div className="flex flex-wrap gap-2">
                  {industryConfig.tags.map((tag) => (
                    <span key={tag} className={`px-2 py-1 text-xs font-medium rounded-full ${industryConfig.color}`}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={handleCreateDefaults}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                <SparklesIcon className="w-4 h-4" />
                {saving ? 'Creating...' : `Create ${industryConfig.name} Tags`}
              </button>
              <button
                onClick={openCreateModal}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
              >
                <PlusIcon className="w-4 h-4" />
                Create Custom Tag
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                All Tags ({tags.length})
              </h2>
            </div>
            <div className="divide-y divide-gray-100">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className="px-6 py-4 flex items-center justify-between hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4">
                    <span
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: tag.color }}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{tag.name}</span>
                        {tag.isSystem && (
                          <span className="px-2 py-0.5 text-xs font-medium text-gray-500 bg-gray-100 rounded">
                            System
                          </span>
                        )}
                      </div>
                      {tag.description && (
                        <p className="text-sm text-gray-500 mt-0.5">{tag.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Link
                      to={`/leads?tag=${tag.id}`}
                      className="text-sm text-gray-500 hover:text-indigo-600"
                    >
                      {tag._count?.leadAssignments || 0} leads
                    </Link>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(tag)}
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                        title="Edit tag"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      {!tag.isSystem && (
                        <>
                          {deleteConfirm === tag.id ? (
                            <div className="flex items-center gap-1 ml-2">
                              <button
                                onClick={() => handleDelete(tag.id)}
                                disabled={saving}
                                className="px-2 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(tag.id)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                              title="Delete tag"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingTag ? 'Edit Tag' : 'Create New Tag'}
              </h3>
              <button
                onClick={closeModal}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="px-6 py-4 space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tag Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Hot Lead, VIP, Follow-up"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Color
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_OPTIONS.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, color: color.value })}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          formData.color === color.value
                            ? 'border-gray-900 scale-110'
                            : 'border-transparent hover:scale-105'
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (optional)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of when to use this tag"
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                {/* Preview */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preview
                  </label>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium text-white"
                      style={{ backgroundColor: formData.color }}
                    >
                      {formData.name || 'Tag Name'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !formData.name.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingTag ? 'Update Tag' : 'Create Tag'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TagManagementPage;
