import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import phoneNumberService, { PhoneNumber, PhoneNumberStats } from '../../services/phone-number.service';
import {
  PhoneIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  UserPlusIcon,
  UserMinusIcon,
  ArrowPathIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

export default function PhoneNumbersPage() {
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [stats, setStats] = useState<PhoneNumberStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedNumber, setSelectedNumber] = useState<PhoneNumber | null>(null);
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    loadData();
    loadAgents();
  }, [statusFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [numbers, statsData] = await Promise.all([
        phoneNumberService.getPhoneNumbers({ status: statusFilter || undefined }),
        phoneNumberService.getStats(),
      ]);
      setPhoneNumbers(numbers);
      setStats(statsData);
    } catch (error) {
      toast.error('Failed to load phone numbers');
    } finally {
      setLoading(false);
    }
  };

  const loadAgents = async () => {
    try {
      const response = await fetch('/api/voice-ai/agents', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setAgents(data.data.map((a: any) => ({ id: a.id, name: a.name })));
      }
    } catch (error) {
      console.error('Failed to load agents:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this phone number?')) return;

    try {
      await phoneNumberService.deletePhoneNumber(id);
      toast.success('Phone number deleted');
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete phone number');
    }
  };

  const handleAssign = async (phoneNumberId: string, agentId: string) => {
    try {
      await phoneNumberService.assignToAgent(phoneNumberId, agentId);
      toast.success('Phone number assigned to agent');
      setShowAssignModal(false);
      setSelectedNumber(null);
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to assign phone number');
    }
  };

  const handleUnassign = async (phoneNumberId: string) => {
    try {
      await phoneNumberService.unassignFromAgent(phoneNumberId);
      toast.success('Phone number unassigned');
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to unassign phone number');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'ASSIGNED':
        return <UserPlusIcon className="w-5 h-5 text-blue-500" />;
      case 'DISABLED':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      case 'PENDING':
        return <ClockIcon className="w-5 h-5 text-yellow-500" />;
      default:
        return <ExclamationCircleIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-green-100 text-green-700';
      case 'ASSIGNED':
        return 'bg-blue-100 text-blue-700';
      case 'DISABLED':
        return 'bg-red-100 text-red-700';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const filteredNumbers = phoneNumbers.filter(
    (pn) =>
      pn.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pn.friendlyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pn.assignedAgent?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Phone Numbers</h1>
          <p className="text-slate-500">Manage phone numbers for your voice AI agents</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Add Phone Number
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <PhoneIcon className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                <p className="text-sm text-slate-500">Total Numbers</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircleIcon className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.available}</p>
                <p className="text-sm text-slate-500">Available</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <UserPlusIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{stats.assigned}</p>
                <p className="text-sm text-slate-500">Assigned</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <PhoneIcon className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">{stats.monthlyStats.totalMinutes}</p>
                <p className="text-sm text-slate-500">Minutes Used</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 border border-slate-200">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by number, name, or agent..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <FunnelIcon className="w-5 h-5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Status</option>
              <option value="AVAILABLE">Available</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="DISABLED">Disabled</option>
              <option value="PENDING">Pending</option>
            </select>
          </div>

          <button
            onClick={loadData}
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowPathIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Phone Numbers Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
          </div>
        ) : filteredNumbers.length === 0 ? (
          <div className="text-center py-12">
            <PhoneIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-1">No phone numbers found</h3>
            <p className="text-slate-500 mb-4">Add your first phone number to get started</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn btn-primary"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Add Phone Number
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Phone Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Assigned To
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Provider
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredNumbers.map((pn) => (
                <tr key={pn.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-slate-900">
                        {pn.displayNumber || phoneNumberService.formatPhoneNumber(pn.number)}
                      </p>
                      {pn.friendlyName && (
                        <p className="text-sm text-slate-500">{pn.friendlyName}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(
                        pn.status
                      )}`}
                    >
                      {getStatusIcon(pn.status)}
                      {pn.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {pn.assignedAgent ? (
                      <Link
                        to={`/voice-ai/agents/${pn.assignedAgent.id}`}
                        className="text-primary-600 hover:text-primary-700"
                      >
                        {pn.assignedAgent.name}
                      </Link>
                    ) : (
                      <span className="text-slate-400">Not assigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {phoneNumberService.getProviderName(pn.provider)}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{pn.type}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {pn.status === 'AVAILABLE' ? (
                        <button
                          onClick={() => {
                            setSelectedNumber(pn);
                            setShowAssignModal(true);
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Assign to Agent"
                        >
                          <UserPlusIcon className="w-5 h-5" />
                        </button>
                      ) : pn.status === 'ASSIGNED' ? (
                        <button
                          onClick={() => handleUnassign(pn.id)}
                          className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                          title="Unassign"
                        >
                          <UserMinusIcon className="w-5 h-5" />
                        </button>
                      ) : null}

                      <button
                        onClick={() => {
                          setSelectedNumber(pn);
                          setShowAddModal(true);
                        }}
                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <PencilIcon className="w-5 h-5" />
                      </button>

                      <button
                        onClick={() => handleDelete(pn.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <AddPhoneNumberModal
          phoneNumber={selectedNumber}
          onClose={() => {
            setShowAddModal(false);
            setSelectedNumber(null);
          }}
          onSuccess={() => {
            setShowAddModal(false);
            setSelectedNumber(null);
            loadData();
          }}
        />
      )}

      {/* Assign Modal */}
      {showAssignModal && selectedNumber && (
        <AssignAgentModal
          phoneNumber={selectedNumber}
          agents={agents}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedNumber(null);
          }}
          onAssign={handleAssign}
        />
      )}
    </div>
  );
}

// Add/Edit Phone Number Modal
function AddPhoneNumberModal({
  phoneNumber,
  onClose,
  onSuccess,
}: {
  phoneNumber: PhoneNumber | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    number: phoneNumber?.number || '',
    friendlyName: phoneNumber?.friendlyName || '',
    provider: phoneNumber?.provider || 'MANUAL',
    type: phoneNumber?.type || 'LOCAL',
    monthlyRent: phoneNumber?.monthlyRent || 0,
    perMinuteRate: phoneNumber?.perMinuteRate || 0,
    region: phoneNumber?.region || '',
    city: phoneNumber?.city || '',
    notes: phoneNumber?.notes || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (phoneNumber) {
        await phoneNumberService.updatePhoneNumber(phoneNumber.id, formData);
        toast.success('Phone number updated');
      } else {
        await phoneNumberService.createPhoneNumber(formData);
        toast.success('Phone number added');
      }
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save phone number');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">
            {phoneNumber ? 'Edit Phone Number' : 'Add Phone Number'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Phone Number *
            </label>
            <input
              type="text"
              value={formData.number}
              onChange={(e) => setFormData({ ...formData, number: e.target.value })}
              placeholder="+91 98765 43210"
              className="input"
              required
              disabled={!!phoneNumber}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Friendly Name
            </label>
            <input
              type="text"
              value={formData.friendlyName}
              onChange={(e) => setFormData({ ...formData, friendlyName: e.target.value })}
              placeholder="Sales Line, Support, etc."
              className="input"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Provider
              </label>
              <select
                value={formData.provider}
                onChange={(e) => setFormData({ ...formData, provider: e.target.value as any })}
                className="input"
              >
                <option value="MANUAL">Manual</option>
                <option value="EXOTEL">Exotel</option>
                <option value="TWILIO">Twilio</option>
                <option value="PLIVO">Plivo</option>
                <option value="MSG91">MSG91</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="input"
              >
                <option value="LOCAL">Local</option>
                <option value="TOLL_FREE">Toll-Free</option>
                <option value="MOBILE">Mobile</option>
                <option value="VIRTUAL">Virtual</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Monthly Rent (INR)
              </label>
              <input
                type="number"
                value={formData.monthlyRent}
                onChange={(e) => setFormData({ ...formData, monthlyRent: parseFloat(e.target.value) || 0 })}
                className="input"
                min="0"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Per Minute Rate (INR)
              </label>
              <input
                type="number"
                value={formData.perMinuteRate}
                onChange={(e) => setFormData({ ...formData, perMinuteRate: parseFloat(e.target.value) || 0 })}
                className="input"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Region
              </label>
              <input
                type="text"
                value={formData.region}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                placeholder="IN, US, etc."
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                City
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Mumbai, Delhi, etc."
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes..."
              className="input"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? 'Saving...' : phoneNumber ? 'Update' : 'Add Phone Number'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Assign Agent Modal
function AssignAgentModal({
  phoneNumber,
  agents,
  onClose,
  onAssign,
}: {
  phoneNumber: PhoneNumber;
  agents: { id: string; name: string }[];
  onClose: () => void;
  onAssign: (phoneNumberId: string, agentId: string) => void;
}) {
  const [selectedAgent, setSelectedAgent] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">Assign to Agent</h2>
          <p className="text-sm text-slate-500 mt-1">
            Assign {phoneNumber.displayNumber || phoneNumber.number} to a voice agent
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Select Agent
            </label>
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="input"
            >
              <option value="">Choose an agent...</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={() => onAssign(phoneNumber.id, selectedAgent)}
              disabled={!selectedAgent}
              className="btn btn-primary"
            >
              Assign
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
