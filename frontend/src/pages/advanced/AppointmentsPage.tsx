import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

interface Appointment {
  id: string;
  contactName: string;
  contactPhone: string;
  contactEmail?: string;
  appointmentType: string;
  scheduledAt: string;
  duration: number;
  status: 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  notes?: string;
  location?: string;
  meetingLink?: string;
  lead?: {
    firstName: string;
    lastName: string;
  };
  createdAt: string;
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    appointmentType: 'CONSULTATION',
    scheduledAt: '',
    duration: 30,
    notes: '',
    location: '',
    meetingLink: '',
  });

  useEffect(() => {
    fetchAppointments();
  }, [filter]);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const params = filter !== 'all' ? `?status=${filter}` : '';
      const response = await api.get(`/advanced/appointments${params}`);
      setAppointments(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/advanced/appointments', formData);
      setShowModal(false);
      setFormData({
        contactName: '',
        contactPhone: '',
        contactEmail: '',
        appointmentType: 'CONSULTATION',
        scheduledAt: '',
        duration: 30,
        notes: '',
        location: '',
        meetingLink: '',
      });
      fetchAppointments();
    } catch (error) {
      console.error('Failed to create appointment:', error);
      alert('Failed to create appointment');
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await api.put(`/advanced/appointments/${id}/status`, { status });
      fetchAppointments();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      SCHEDULED: 'bg-blue-100 text-blue-800',
      CONFIRMED: 'bg-green-100 text-green-800',
      COMPLETED: 'bg-gray-100 text-gray-800',
      CANCELLED: 'bg-red-100 text-red-800',
      NO_SHOW: 'bg-orange-100 text-orange-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      CONSULTATION: 'Consultation',
      DEMO: 'Demo',
      FOLLOW_UP: 'Follow Up',
      SALES_CALL: 'Sales Call',
      ONBOARDING: 'Onboarding',
      SUPPORT: 'Support',
    };
    return labels[type] || type;
  };

  const upcomingCount = appointments.filter(
    (a) =>
      ['SCHEDULED', 'CONFIRMED'].includes(a.status) &&
      new Date(a.scheduledAt) > new Date()
  ).length;

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
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Appointments</h1>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
        >
          Book Appointment
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="text-2xl font-bold text-blue-600">{upcomingCount}</div>
          <div className="text-gray-500 text-sm">Upcoming</div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="text-2xl font-bold text-green-600">
            {appointments.filter((a) => a.status === 'CONFIRMED').length}
          </div>
          <div className="text-gray-500 text-sm">Confirmed</div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="text-2xl font-bold text-gray-600">
            {appointments.filter((a) => a.status === 'COMPLETED').length}
          </div>
          <div className="text-gray-500 text-sm">Completed</div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="text-2xl font-bold text-orange-600">
            {appointments.filter((a) => a.status === 'NO_SHOW').length}
          </div>
          <div className="text-gray-500 text-sm">No Shows</div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-2">
        {['all', 'SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg ${
              filter === status
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {status === 'all' ? 'All' : status.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Appointments List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Date & Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Duration
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
            {appointments.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  No appointments found
                </td>
              </tr>
            ) : (
              appointments.map((apt) => (
                <tr key={apt.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{apt.contactName}</div>
                    <div className="text-sm text-gray-500">{apt.contactPhone}</div>
                    {apt.contactEmail && (
                      <div className="text-sm text-gray-500">{apt.contactEmail}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-900">{getTypeLabel(apt.appointmentType)}</td>
                  <td className="px-6 py-4">
                    <div className="text-gray-900">
                      {new Date(apt.scheduledAt).toLocaleDateString()}
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(apt.scheduledAt).toLocaleTimeString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-900">{apt.duration} min</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        apt.status
                      )}`}
                    >
                      {apt.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          handleStatusChange(apt.id, e.target.value);
                        }
                      }}
                      className="border rounded px-2 py-1 text-sm"
                    >
                      <option value="">Update...</option>
                      <option value="CONFIRMED">Confirm</option>
                      <option value="COMPLETED">Complete</option>
                      <option value="CANCELLED">Cancel</option>
                      <option value="NO_SHOW">No Show</option>
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto py-8">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4">
            <h2 className="text-xl font-bold mb-4">Book Appointment</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Contact Name</label>
                <input
                  type="text"
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  className="mt-1 block w-full border rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <input
                    type="tel"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    className="mt-1 block w-full border rounded-lg px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    className="mt-1 block w-full border rounded-lg px-3 py-2"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Type</label>
                  <select
                    value={formData.appointmentType}
                    onChange={(e) =>
                      setFormData({ ...formData, appointmentType: e.target.value })
                    }
                    className="mt-1 block w-full border rounded-lg px-3 py-2"
                  >
                    <option value="CONSULTATION">Consultation</option>
                    <option value="DEMO">Demo</option>
                    <option value="FOLLOW_UP">Follow Up</option>
                    <option value="SALES_CALL">Sales Call</option>
                    <option value="ONBOARDING">Onboarding</option>
                    <option value="SUPPORT">Support</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Duration (min)</label>
                  <select
                    value={formData.duration}
                    onChange={(e) =>
                      setFormData({ ...formData, duration: Number(e.target.value) })
                    }
                    className="mt-1 block w-full border rounded-lg px-3 py-2"
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>1 hour</option>
                    <option value={90}>1.5 hours</option>
                    <option value={120}>2 hours</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Date & Time</label>
                <input
                  type="datetime-local"
                  value={formData.scheduledAt}
                  onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                  className="mt-1 block w-full border rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="mt-1 block w-full border rounded-lg px-3 py-2"
                  placeholder="Office, Phone, etc."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Meeting Link</label>
                <input
                  type="url"
                  value={formData.meetingLink}
                  onChange={(e) => setFormData({ ...formData, meetingLink: e.target.value })}
                  className="mt-1 block w-full border rounded-lg px-3 py-2"
                  placeholder="https://zoom.us/..."
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
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Book
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
