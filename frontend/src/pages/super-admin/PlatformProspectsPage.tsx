import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  FunnelIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import {
  platformProspectService,
  PlatformProspect,
  ProspectSource,
  ProspectStage,
  PROSPECT_SOURCE_LABELS,
  PROSPECT_STAGE_LABELS,
  PROSPECT_STAGE_COLORS,
} from '../../services/platform-prospect.service';

const STAGE_OPTIONS: ProspectStage[] = [
  'NEW',
  'MQL',
  'SQL',
  'DEMO_SCHEDULED',
  'DEMO_DONE',
  'PROPOSAL_SENT',
  'NEGOTIATING',
  'TRIAL_STARTED',
  'CONVERTED',
  'LOST',
  'UNRESPONSIVE',
];

interface AssignableUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export default function PlatformProspectsPage() {
  const [prospects, setProspects] = useState<PlatformProspect[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<ProspectSource | ''>('');
  const [stageFilter, setStageFilter] = useState<ProspectStage | ''>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [assignableUsers, setAssignableUsers] = useState<AssignableUser[]>([]);

  useEffect(() => {
    platformProspectService
      .assignableUsers()
      .then(setAssignableUsers)
      .catch(() => setAssignableUsers([]));
  }, []);

  const fetchProspects = useCallback(async () => {
    setLoading(true);
    try {
      const result = await platformProspectService.list({
        page,
        pageSize: 25,
        search: search || undefined,
        source: sourceFilter || undefined,
        stage: stageFilter || undefined,
      });
      setProspects(result.items);
      setTotalPages(result.totalPages);
      setTotal(result.total);
    } catch (error) {
      console.error('Failed to fetch prospects:', error);
    } finally {
      setLoading(false);
    }
  }, [page, search, sourceFilter, stageFilter]);

  useEffect(() => {
    fetchProspects();
  }, [fetchProspects]);

  const daysSince = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const clearFilters = () => {
    setSearch('');
    setSourceFilter('');
    setStageFilter('');
    setPage(1);
  };

  const hasActiveFilters = search || sourceFilter || stageFilter;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Prospects</h1>
          <p className="text-sm text-gray-600 mt-1">
            Pre-tenant leads from MyLeadX marketing campaigns and outbound sales
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors text-sm font-medium"
        >
          <PlusIcon className="w-4 h-4 mr-2" />
          Add Prospect
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-[200px] relative">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name, email, phone, or company"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm"
            />
          </div>
          <select
            value={sourceFilter}
            onChange={(e) => {
              setSourceFilter(e.target.value as ProspectSource | '');
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 text-sm"
          >
            <option value="">All sources</option>
            {Object.entries(PROSPECT_SOURCE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={stageFilter}
            onChange={(e) => {
              setStageFilter(e.target.value as ProspectStage | '');
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 text-sm"
          >
            <option value="">All stages</option>
            {Object.entries(PROSPECT_STAGE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 text-sm"
            >
              <XMarkIcon className="w-4 h-4 mr-1" />
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
          </div>
        ) : prospects.length === 0 ? (
          <div className="text-center py-20">
            <FunnelIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-gray-900 font-medium mb-1">No prospects found</h3>
            <p className="text-sm text-gray-500">
              {hasActiveFilters
                ? 'Try clearing your filters'
                : 'Prospects will appear here as your marketing campaigns generate leads'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                    Name
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                    Company
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                    Source
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                    Stage
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                    Assigned
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                    Score
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                    Age
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {prospects.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <Link
                        to={`/super-admin/prospects/${p.id}`}
                        className="text-cyan-600 hover:text-cyan-700 font-medium"
                      >
                        {p.fullName}
                      </Link>
                      <div className="text-xs text-gray-500 mt-0.5">{p.email}</div>
                      <div className="text-xs text-gray-500">{p.phone}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{p.companyName || '—'}</div>
                      {p.industry && (
                        <div className="text-xs text-gray-500 mt-0.5">{p.industry}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-700">
                        {PROSPECT_SOURCE_LABELS[p.source]}
                      </span>
                      {p.campaign && (
                        <div className="text-xs text-gray-500 mt-0.5">{p.campaign}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <StageDropdown
                        prospect={p}
                        onChanged={(newStage) => {
                          setProspects((prev) =>
                            prev.map((row) => (row.id === p.id ? { ...row, stage: newStage } : row)),
                          );
                        }}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <AssignDropdown
                        prospect={p}
                        users={assignableUsers}
                        onChanged={(user) => {
                          setProspects((prev) =>
                            prev.map((row) =>
                              row.id === p.id
                                ? {
                                    ...row,
                                    assignedToId: user?.id,
                                    assignedTo: user
                                      ? {
                                          id: user.id,
                                          firstName: user.firstName,
                                          lastName: user.lastName,
                                          email: user.email,
                                        }
                                      : undefined,
                                  }
                                : row,
                            ),
                          );
                        }}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-gray-900">{p.score}</span>
                      <span className="text-xs text-gray-400">/100</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-700">
                        {daysSince(p.createdAt)}d
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && prospects.length > 0 && (
          <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex justify-between items-center">
            <div className="text-sm text-gray-700">
              Showing page {page} of {totalPages} ({total} total prospects)
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 hover:bg-white"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 hover:bg-white"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {showCreateModal && (
        <AddProspectModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchProspects();
          }}
        />
      )}
    </div>
  );
}

function AddProspectModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    companyName: '',
    designation: '',
    teamSize: '',
    industry: '',
    source: 'MANUAL' as ProspectSource,
    eventName: '',
    referrerName: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.fullName || !form.email || !form.phone) {
      setError('Full name, email, and phone are required');
      return;
    }
    setSaving(true);
    try {
      await platformProspectService.create(form);
      onSuccess();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Failed to add prospect');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Add Prospect</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Full Name *">
              <input
                type="text"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                className="input"
                required
              />
            </Field>
            <Field label="Email *">
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input"
                required
              />
            </Field>
            <Field label="Phone *">
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="input"
                required
              />
            </Field>
            <Field label="Company">
              <input
                type="text"
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                className="input"
              />
            </Field>
            <Field label="Designation">
              <input
                type="text"
                value={form.designation}
                onChange={(e) => setForm({ ...form, designation: e.target.value })}
                className="input"
              />
            </Field>
            <Field label="Team Size">
              <select
                value={form.teamSize}
                onChange={(e) => setForm({ ...form, teamSize: e.target.value })}
                className="input"
              >
                <option value="">—</option>
                <option value="1-10">1-10</option>
                <option value="11-50">11-50</option>
                <option value="51-200">51-200</option>
                <option value="200+">200+</option>
              </select>
            </Field>
            <Field label="Industry">
              <input
                type="text"
                value={form.industry}
                onChange={(e) => setForm({ ...form, industry: e.target.value })}
                className="input"
              />
            </Field>
            <Field label="Source">
              <select
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value as ProspectSource })}
                className="input"
              >
                {Object.entries(PROSPECT_SOURCE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
            {form.source === 'EVENT' && (
              <Field label="Event Name">
                <input
                  type="text"
                  value={form.eventName}
                  onChange={(e) => setForm({ ...form, eventName: e.target.value })}
                  className="input"
                />
              </Field>
            )}
            {form.source === 'REFERRAL' && (
              <Field label="Referrer Name">
                <input
                  type="text"
                  value={form.referrerName}
                  onChange={(e) => setForm({ ...form, referrerName: e.target.value })}
                  className="input"
                />
              </Field>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-cyan-600 text-white rounded text-sm hover:bg-cyan-700 disabled:opacity-50"
            >
              {saving ? 'Adding...' : 'Add Prospect'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

function AssignDropdown({
  prospect,
  users,
  onChanged,
}: {
  prospect: PlatformProspect;
  users: AssignableUser[];
  onChanged: (user: AssignableUser | null) => void;
}) {
  const [updating, setUpdating] = useState(false);
  const currentId = prospect.assignedToId || '';

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const userId = e.target.value || null;
    if (userId === (prospect.assignedToId || null)) return;
    setUpdating(true);
    const newUser = userId ? users.find((u) => u.id === userId) || null : null;
    onChanged(newUser);
    try {
      await platformProspectService.assign(prospect.id, userId);
      toast.success(newUser ? `Assigned to ${newUser.firstName}` : 'Unassigned');
    } catch {
      onChanged(prospect.assignedTo ? {
        id: prospect.assignedToId!,
        firstName: prospect.assignedTo.firstName,
        lastName: prospect.assignedTo.lastName,
        email: prospect.assignedTo.email,
      } : null);
      toast.error('Failed to assign');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <select
      value={currentId}
      onChange={handleChange}
      disabled={updating || users.length === 0}
      onClick={(e) => e.stopPropagation()}
      className={`text-sm px-2 py-1 rounded border border-gray-200 bg-white cursor-pointer focus:ring-2 focus:ring-cyan-500 ${updating ? 'opacity-50' : ''} ${currentId ? 'text-gray-900' : 'text-gray-400'}`}
    >
      <option value="">Unassigned</option>
      {users.map((u) => (
        <option key={u.id} value={u.id}>
          {u.firstName} {u.lastName}
        </option>
      ))}
    </select>
  );
}

function StageDropdown({
  prospect,
  onChanged,
}: {
  prospect: PlatformProspect;
  onChanged: (newStage: ProspectStage) => void;
}) {
  const [updating, setUpdating] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value as ProspectStage;
    if (next === prospect.stage) return;
    setUpdating(true);
    onChanged(next);
    try {
      await platformProspectService.changeStage(prospect.id, next);
      toast.success(`Moved to ${PROSPECT_STAGE_LABELS[next]}`);
    } catch {
      onChanged(prospect.stage);
      toast.error('Failed to change stage');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <select
      value={prospect.stage}
      onChange={handleChange}
      disabled={updating}
      onClick={(e) => e.stopPropagation()}
      className={`text-xs font-medium px-2 py-1 rounded border-0 cursor-pointer focus:ring-2 focus:ring-cyan-500 ${PROSPECT_STAGE_COLORS[prospect.stage]} ${updating ? 'opacity-50' : ''}`}
    >
      {STAGE_OPTIONS.map((s) => (
        <option key={s} value={s}>
          {PROSPECT_STAGE_LABELS[s]}
        </option>
      ))}
    </select>
  );
}
