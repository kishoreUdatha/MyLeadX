import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

interface ScheduledCall {
  id: string;
  agentId: string;
  phoneNumber: string;
  contactName?: string;
  scheduledAt: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'FAILED' | 'RESCHEDULED';
  callType: string;
  priority: number;
  notes?: string;
  lead?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export default function ScheduledCallsPage() {
  const [calls, setCalls] = useState<ScheduledCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    agentId: '',
    phoneNumber: '',
    contactName: '',
    scheduledAt: '',
    callType: 'FOLLOW_UP',
    priority: 5,
    notes: '',
  });

  useEffect(() => {
    fetchCalls();
  }, [filter]);

  const fetchCalls = async () => {
    setLoading(true);
    try {
      const params = filter !== 'all' ? `?status=${filter}` : '';
      const response = await api.get(`/advanced/scheduled-calls${params}`);
      setCalls(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch scheduled calls:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleCall = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/advanced/scheduled-calls', formData);
      setShowModal(false);
      setFormData({
        agentId: '',
        phoneNumber: '',
        contactName: '',
        scheduledAt: '',
        callType: 'FOLLOW_UP',
        priority: 5,
        notes: '',
      });
      fetchCalls();
    } catch (error) {
      console.error('Failed to schedule call:', error);
      alert('Failed to schedule call');
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this scheduled call?')) return;
    try {
      await api.put(`/advanced/scheduled-calls/${id}/cancel`);
      fetchCalls();
    } catch (error) {
      console.error('Failed to cancel call:', error);
    }
  };

  const handleReschedule = async (id: string) => {
    const newTime = prompt('Enter new time (YYYY-MM-DD HH:MM):');
    if (!newTime) return;
    try {
      await api.put(`/advanced/scheduled-calls/${id}/reschedule`, {
        newTime: new Date(newTime).toISOString(),
      });
      fetchCalls();
    } catch (error) {
      console.error('Failed to reschedule call:', error);
      alert('Failed to reschedule call');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      IN_PROGRESS: 'bg-blue-100 text-blue-800',
      COMPLETED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-gray-100 text-gray-800',
      FAILED: 'bg-red-100 text-red-800',
      RESCHEDULED: 'bg-purple-100 text-purple-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityLabel = (priority: number) => {
    if (priority <= 2) return { label: 'High', color: 'text-red-600' };
    if (priority <= 4) return { label: 'Medium', color: 'text-yellow-600' };
    return { label: 'Low', color: 'text-gray-600' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <Link to="/advanced" className="text-blue-600 hover:underline text-sm">
            &larr; Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Scheduled Calls</h1>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Schedule New Call
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-2">
        {['all', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg ${
              filter === status
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {status === 'all' ? 'All' : status.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Calls List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Phone
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Scheduled
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Priority
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {calls.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  No scheduled calls found
                </td>
              </tr>
            ) : (
              calls.map((call) => {
                const priority = getPriorityLabel(call.priority);
                return (
                  <tr key={call.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">
                        {call.contactName ||
                          (call.lead
                            ? `${call.lead.firstName} ${call.lead.lastName}`
                            : 'Unknown')}
                      </div>
                      {call.lead && (
                        <div className="text-sm text-gray-500">{call.lead.email}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-900">{call.phoneNumber}</td>
                    <td className="px-6 py-4">
                      <div className="text-gray-900">
                        {new Date(call.scheduledAt).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(call.scheduledAt).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-900">{call.callType.replace('_', ' ')}</td>
                    <td className="px-6 py-4">
                      <span className={`font-medium ${priority.color}`}>{priority.label}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          call.status
                        )}`}
                      >
                        {call.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {call.status === 'PENDING' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleReschedule(call.id)}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            Reschedule
                          </button>
                          <button
                            onClick={() => handleCancel(call.id)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Schedule Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Schedule New Call</h2>
            <form onSubmit={handleScheduleCall} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Agent ID</label>
                <input
                  type="text"
                  value={formData.agentId}
                  onChange={(e) => setFormData({ ...formData, agentId: e.target.value })}
                  className="mt-1 block w-full border rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="mt-1 block w-full border rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Contact Name</label>
                <input
                  type="text"
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  className="mt-1 block w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Scheduled Time</label>
                <input
                  type="datetime-local"
                  value={formData.scheduledAt}
                  onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                  className="mt-1 block w-full border rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Call Type</label>
                <select
                  value={formData.callType}
                  onChange={(e) => setFormData({ ...formData, callType: e.target.value })}
                  className="mt-1 block w-full border rounded-lg px-3 py-2"
                >
                  <option value="FOLLOW_UP">Follow Up</option>
                  <option value="SALES">Sales</option>
                  <option value="SUPPORT">Support</option>
                  <option value="CALLBACK">Callback</option>
                  <option value="REMINDER">Reminder</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Priority (1-10, lower is higher)
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })}
                  className="mt-1 block w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="mt-1 block w-full border rounded-lg px-3 py-2"
                  rows={3}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
