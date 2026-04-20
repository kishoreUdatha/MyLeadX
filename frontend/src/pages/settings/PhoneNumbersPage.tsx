/**
 * Phone Numbers Management Page
 * Manage virtual phone numbers and assign to telecallers
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import {
  PhoneIcon,
  ShoppingCartIcon,
  TrashIcon,
  UserIcon,
  ArrowPathIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface PhoneNumber {
  id: string;
  number: string;
  displayNumber?: string;
  friendlyName?: string;
  status: string;
  assignedToUserId?: string;
  assignedUser?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  assignedAgent?: {
    id: string;
    name: string;
  };
  createdAt: string;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export default function PhoneNumbersPage() {
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedNumber, setSelectedNumber] = useState<PhoneNumber | null>(null);
  const [selectedUserId, setSelectedUserId] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [numbersRes, usersRes] = await Promise.all([
        api.get('/phone-numbers'),
        api.get('/users'),
      ]);
      // Get phone numbers from the response
      const numbers = numbersRes.data?.data || [];
      setPhoneNumbers(numbers);

      // Get users - filter to telecallers, team leads, and managers who can make calls
      const allUsers = usersRes.data?.data || usersRes.data?.users || [];
      const callableUsers = allUsers.filter((u: any) =>
        ['telecaller', 'team_lead', 'manager', 'counselor'].includes(u.role?.slug || u.roleSlug || '')
      );
      setUsers(callableUsers);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedNumber || !selectedUserId) return;

    try {
      await api.post(`/phone-numbers/${selectedNumber.id}/assign-user`, {
        userId: selectedUserId,
      });
      setShowAssignModal(false);
      setSelectedNumber(null);
      setSelectedUserId('');
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to assign phone number');
    }
  };

  const handleUnassign = async (numberId: string) => {
    if (!confirm('Remove assignment from this phone number?')) return;

    try {
      await api.post(`/phone-numbers/${numberId}/unassign-user`);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to unassign');
    }
  };

  const handleDelete = async (numberId: string) => {
    if (!confirm('Delete this phone number?')) return;

    try {
      await api.delete(`/phone-numbers/${numberId}`);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete');
    }
  };

  const openAssignModal = (number: PhoneNumber) => {
    setSelectedNumber(number);
    setSelectedUserId(number.assignedToUserId || '');
    setShowAssignModal(true);
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen -m-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Phone Numbers</h1>
          <p className="text-sm text-slate-500">
            Assign phone numbers to telecallers for outbound calls
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchData}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-white rounded-lg transition-all shadow-sm bg-white"
            title="Refresh"
          >
            <ArrowPathIcon className="w-4 h-4" />
          </button>
          <Link
            to="/numbers-shop"
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <ShoppingCartIcon className="w-4 h-4" />
            Buy Numbers
          </Link>
        </div>
      </div>

      {/* Phone Numbers List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading...</div>
        ) : phoneNumbers.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <PhoneIcon className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="font-medium">No phone numbers found</p>
            <p className="text-sm mt-1 mb-4">Purchase numbers from the Numbers Shop first</p>
            <Link
              to="/numbers-shop"
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <ShoppingCartIcon className="w-4 h-4" />
              Go to Numbers Shop
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">
                  Phone Number
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">
                  Name
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">
                  Assigned To
                </th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">
                  Status
                </th>
                <th className="text-right text-xs font-medium text-slate-500 uppercase px-4 py-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {phoneNumbers.map((num) => (
                <tr key={num.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <PhoneIcon className="w-4 h-4 text-slate-400" />
                      <span className="font-mono text-sm">{num.displayNumber || num.number}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-slate-600">
                      {num.friendlyName || '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {num.assignedUser ? (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center">
                          <UserIcon className="w-3 h-3 text-indigo-600" />
                        </div>
                        <span className="text-sm">
                          {num.assignedUser.firstName} {num.assignedUser.lastName}
                        </span>
                      </div>
                    ) : num.assignedAgent ? (
                      <span className="text-sm text-purple-600">
                        AI: {num.assignedAgent.name}
                      </span>
                    ) : (
                      <span className="text-sm text-slate-400">Unassigned (Pool)</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        num.status === 'AVAILABLE'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {num.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openAssignModal(num)}
                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                        title="Assign to User"
                      >
                        <UserIcon className="w-4 h-4" />
                      </button>
                      {num.assignedToUserId && (
                        <button
                          onClick={() => handleUnassign(num.id)}
                          className="p-1.5 text-amber-600 hover:bg-amber-50 rounded transition-colors"
                          title="Remove Assignment"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(num.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-lg">
        <h3 className="font-medium text-blue-800 mb-2">How it works</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• <strong>Assigned numbers:</strong> Telecaller uses their assigned number for outbound calls</li>
          <li>• <strong>Pool numbers:</strong> Unassigned numbers are used as fallback for all telecallers</li>
          <li>• <strong>Tracking:</strong> Every call is logged with which number was used and who made the call</li>
        </ul>
      </div>

      {/* Assign Modal */}
      {showAssignModal && selectedNumber && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">
              Assign Number to Telecaller
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              Number: <strong>{selectedNumber.displayNumber || selectedNumber.number}</strong>
            </p>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Select Telecaller
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">-- Select User --</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName} ({user.email})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedNumber(null);
                }}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                disabled={!selectedUserId}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
