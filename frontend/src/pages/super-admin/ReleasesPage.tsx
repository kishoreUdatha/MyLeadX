import { useState, useEffect } from 'react';
import {
  RocketLaunchIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  TagIcon,
} from '@heroicons/react/24/outline';
import api from '../../services/api';

interface ReleaseStats {
  total: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
}

interface Release {
  id: string;
  version: string;
  title: string;
  description: string;
  type: 'MAJOR' | 'MINOR' | 'PATCH' | 'HOTFIX';
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  features: string[];
  publishedAt?: string;
  createdAt: string;
}

export default function ReleasesPage() {
  const [stats, setStats] = useState<ReleaseStats | null>(null);
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingRelease, setEditingRelease] = useState<Release | null>(null);
  const [formData, setFormData] = useState({
    version: '',
    title: '',
    description: '',
    type: 'MINOR' as Release['type'],
    features: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchReleases();
  }, [page, statusFilter]);

  const fetchData = async () => {
    try {
      const res = await api.get('/super-admin/releases/stats');
      setStats(res.data.data);
    } catch (error) {
      console.error('Failed to fetch release stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReleases = async () => {
    try {
      const res = await api.get('/super-admin/releases', {
        params: { page, limit: 10, status: statusFilter || undefined },
      });
      setReleases(res.data.data || []);
      setTotalPages(res.data.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Failed to fetch releases:', error);
    }
  };

  const handleSubmit = async () => {
    try {
      const payload = {
        ...formData,
        features: formData.features.split('\n').filter(f => f.trim()),
      };

      if (editingRelease) {
        await api.patch(`/super-admin/releases/${editingRelease.id}`, payload);
      } else {
        await api.post('/super-admin/releases', payload);
      }

      setShowModal(false);
      setEditingRelease(null);
      setFormData({ version: '', title: '', description: '', type: 'MINOR', features: '' });
      fetchReleases();
      fetchData();
    } catch (error) {
      console.error('Failed to save release:', error);
    }
  };

  const handleEdit = (release: Release) => {
    setEditingRelease(release);
    setFormData({
      version: release.version,
      title: release.title,
      description: release.description,
      type: release.type,
      features: (release.features || []).join('\n'),
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this release?')) return;
    try {
      await api.delete(`/super-admin/releases/${id}`);
      fetchReleases();
      fetchData();
    } catch (error) {
      console.error('Failed to delete release:', error);
    }
  };

  const handlePublish = async (release: Release) => {
    try {
      await api.patch(`/super-admin/releases/${release.id}`, {
        status: release.status === 'PUBLISHED' ? 'ARCHIVED' : 'PUBLISHED',
      });
      fetchReleases();
      fetchData();
    } catch (error) {
      console.error('Failed to update release status:', error);
    }
  };

  const getTypeColor = (type: Release['type']) => {
    switch (type) {
      case 'MAJOR': return 'bg-red-100 text-red-700';
      case 'MINOR': return 'bg-blue-100 text-blue-700';
      case 'PATCH': return 'bg-green-100 text-green-700';
      case 'HOTFIX': return 'bg-amber-100 text-amber-700';
    }
  };

  const getStatusColor = (status: Release['status']) => {
    switch (status) {
      case 'PUBLISHED': return 'bg-green-100 text-green-700';
      case 'DRAFT': return 'bg-slate-100 text-slate-600';
      case 'ARCHIVED': return 'bg-purple-100 text-purple-700';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Releases</h1>
          <p className="text-slate-500">Manage releases, changelogs, and feature announcements</p>
        </div>
        <button
          onClick={() => {
            setEditingRelease(null);
            setFormData({ version: '', title: '', description: '', type: 'MINOR', features: '' });
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          <PlusIcon className="w-5 h-5" />
          New Release
        </button>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <RocketLaunchIcon className="w-10 h-10 text-purple-500" />
              <div>
                <p className="text-sm text-slate-500">Total Releases</p>
                <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <CheckCircleIcon className="w-10 h-10 text-green-500" />
              <div>
                <p className="text-sm text-slate-500">Published</p>
                <p className="text-2xl font-bold text-slate-900">{stats.byStatus?.PUBLISHED || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <DocumentTextIcon className="w-10 h-10 text-slate-400" />
              <div>
                <p className="text-sm text-slate-500">Drafts</p>
                <p className="text-2xl font-bold text-slate-900">{stats.byStatus?.DRAFT || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <TagIcon className="w-10 h-10 text-red-500" />
              <div>
                <p className="text-sm text-slate-500">Major Releases</p>
                <p className="text-2xl font-bold text-slate-900">{stats.byType?.MAJOR || 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Releases List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">All Releases</h2>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>

        <div className="divide-y divide-slate-100">
          {releases.map((release) => (
            <div key={release.id} className="p-4 hover:bg-slate-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-lg font-semibold text-slate-900">v{release.version}</span>
                    <span className={`px-2 py-0.5 text-xs rounded ${getTypeColor(release.type)}`}>
                      {release.type}
                    </span>
                    <span className={`px-2 py-0.5 text-xs rounded ${getStatusColor(release.status)}`}>
                      {release.status}
                    </span>
                  </div>
                  <h3 className="font-medium text-slate-800 mb-1">{release.title}</h3>
                  {release.description && (
                    <p className="text-sm text-slate-600 mb-2">{release.description}</p>
                  )}
                  {release.features && release.features.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-slate-500 mb-1">Features:</p>
                      <ul className="text-sm text-slate-600 space-y-1">
                        {release.features.slice(0, 3).map((feature, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-purple-500 mt-1">-</span>
                            <span>{feature}</span>
                          </li>
                        ))}
                        {release.features.length > 3 && (
                          <li className="text-slate-400">+{release.features.length - 3} more</li>
                        )}
                      </ul>
                    </div>
                  )}
                  <div className="mt-3 text-xs text-slate-500">
                    Created: {new Date(release.createdAt).toLocaleDateString()}
                    {release.publishedAt && (
                      <span className="ml-4">
                        Published: {new Date(release.publishedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {release.status === 'DRAFT' && (
                    <button
                      onClick={() => handlePublish(release)}
                      className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Publish
                    </button>
                  )}
                  {release.status === 'PUBLISHED' && (
                    <button
                      onClick={() => handlePublish(release)}
                      className="px-3 py-1.5 text-sm border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50"
                    >
                      Archive
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(release)}
                    className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                  >
                    <PencilIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(release.id)}
                    className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {releases.length === 0 && (
            <div className="py-12 text-center text-slate-500">
              No releases found. Create your first release to get started.
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 flex items-center justify-between">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              {editingRelease ? 'Edit Release' : 'Create Release'}
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Version</label>
                  <input
                    type="text"
                    value={formData.version}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="e.g., 2.1.0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as Release['type'] })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="MAJOR">Major</option>
                    <option value="MINOR">Minor</option>
                    <option value="PATCH">Patch</option>
                    <option value="HOTFIX">Hotfix</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="Release title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                  rows={3}
                  placeholder="Brief description of this release..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Features (one per line)
                </label>
                <textarea
                  value={formData.features}
                  onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                  rows={5}
                  placeholder="New dashboard design&#10;Improved performance&#10;Bug fixes for login flow"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingRelease(null);
                }}
                className="px-4 py-2 text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!formData.version || !formData.title}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {editingRelease ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
