import { useState, useEffect } from 'react';
import {
  RectangleGroupIcon,
  PlayIcon,
  PauseIcon,
  PlusIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import api from '../../services/api';

interface WorkflowStats {
  totalWorkflows: number;
  activeWorkflows: number;
  templateCount: number;
  executions30d: number;
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description?: string;
  trigger: string;
  isActive: boolean;
  isTemplate: boolean;
  definition: any;
  createdAt: string;
}

interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  error?: string;
  workflow?: {
    name: string;
  };
}

export default function WorkflowsPage() {
  const [stats, setStats] = useState<WorkflowStats | null>(null);
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'templates' | 'executions' | 'stats'>('templates');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    trigger: 'manual',
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeTab === 'templates') {
      fetchTemplates();
    } else if (activeTab === 'executions') {
      fetchExecutions();
    }
  }, [activeTab, page]);

  const fetchData = async () => {
    try {
      const res = await api.get('/super-admin/workflows/stats');
      setStats(res.data.data);
    } catch (error) {
      console.error('Failed to fetch workflow stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await api.get('/super-admin/workflows/templates', {
        params: { page, limit: 10 },
      });
      setTemplates(res.data.data || []);
      setTotalPages(res.data.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  };

  const fetchExecutions = async () => {
    try {
      const res = await api.get('/super-admin/workflows/executions', {
        params: { page, limit: 15 },
      });
      setExecutions(res.data.data || []);
      setTotalPages(res.data.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Failed to fetch executions:', error);
    }
  };

  const handleCreateTemplate = async () => {
    try {
      await api.post('/super-admin/workflows/templates', {
        ...newTemplate,
        definition: { steps: [] },
      });
      setShowCreateModal(false);
      setNewTemplate({ name: '', description: '', trigger: 'manual' });
      fetchTemplates();
      fetchData();
    } catch (error) {
      console.error('Failed to create template:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'success':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'failed':
      case 'error':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      case 'running':
      case 'in_progress':
        return <ArrowPathIcon className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <ClockIcon className="w-5 h-5 text-slate-400" />;
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
          <h1 className="text-2xl font-bold text-slate-900">Workflows</h1>
          <p className="text-slate-500">Manage platform workflow templates</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          <PlusIcon className="w-5 h-5" />
          Create Template
        </button>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <RectangleGroupIcon className="w-10 h-10 text-purple-500" />
              <div>
                <p className="text-sm text-slate-500">Total Workflows</p>
                <p className="text-2xl font-bold text-slate-900">{stats.totalWorkflows}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <PlayIcon className="w-10 h-10 text-green-500" />
              <div>
                <p className="text-sm text-slate-500">Active Workflows</p>
                <p className="text-2xl font-bold text-slate-900">{stats.activeWorkflows}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <RectangleGroupIcon className="w-10 h-10 text-blue-500" />
              <div>
                <p className="text-sm text-slate-500">Templates</p>
                <p className="text-2xl font-bold text-slate-900">{stats.templateCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <ArrowPathIcon className="w-10 h-10 text-amber-500" />
              <div>
                <p className="text-sm text-slate-500">Executions (30d)</p>
                <p className="text-2xl font-bold text-slate-900">{stats.executions30d}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="border-b border-slate-200">
          <div className="flex">
            {(['templates', 'executions'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setPage(1); }}
                className={`px-6 py-3 text-sm font-medium border-b-2 ${
                  activeTab === tab
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab === 'templates' ? 'Templates' : 'Execution History'}
              </button>
            ))}
          </div>
        </div>

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((template) => (
                <div key={template.id} className="border border-slate-200 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        template.isActive ? 'bg-green-100' : 'bg-slate-100'
                      }`}>
                        <RectangleGroupIcon className={`w-6 h-6 ${
                          template.isActive ? 'text-green-600' : 'text-slate-400'
                        }`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">{template.name}</h3>
                        <p className="text-sm text-slate-500">Trigger: {template.trigger}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded ${
                      template.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {template.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {template.description && (
                    <p className="text-sm text-slate-600 mb-3">{template.description}</p>
                  )}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <span className="text-xs text-slate-500">
                      Created: {new Date(template.createdAt).toLocaleDateString()}
                    </span>
                    <div className="flex items-center gap-2">
                      <button className="text-sm text-purple-600 hover:text-purple-700">Edit</button>
                    </div>
                  </div>
                </div>
              ))}
              {templates.length === 0 && (
                <div className="col-span-2 text-center py-8 text-slate-500">
                  No workflow templates found. Create one to get started.
                </div>
              )}
            </div>
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
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
        )}

        {/* Executions Tab */}
        {activeTab === 'executions' && (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left py-3 px-4 text-slate-500 font-medium">Workflow</th>
                    <th className="text-left py-3 px-4 text-slate-500 font-medium">Status</th>
                    <th className="text-left py-3 px-4 text-slate-500 font-medium">Started</th>
                    <th className="text-left py-3 px-4 text-slate-500 font-medium">Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {executions.map((exec) => (
                    <tr key={exec.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-900">
                          {exec.workflow?.name || 'Unknown'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(exec.status)}
                          <span className="capitalize text-slate-700">{exec.status}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {new Date(exec.startedAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {exec.completedAt ? new Date(exec.completedAt).toLocaleString() : '-'}
                      </td>
                    </tr>
                  ))}
                  {executions.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-500">
                        No workflow executions found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
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
        )}
      </div>

      {/* Create Template Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Create Workflow Template</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input
                  type="text"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., Lead Follow-up"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                  rows={3}
                  placeholder="Describe what this workflow does..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Trigger</label>
                <select
                  value={newTemplate.trigger}
                  onChange={(e) => setNewTemplate({ ...newTemplate, trigger: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="manual">Manual</option>
                  <option value="lead_created">Lead Created</option>
                  <option value="lead_updated">Lead Updated</option>
                  <option value="call_completed">Call Completed</option>
                  <option value="scheduled">Scheduled</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTemplate}
                disabled={!newTemplate.name}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                Create Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
