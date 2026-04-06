import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

interface DNCEntry {
  id: string;
  phoneNumber: string;
  reason: string;
  notes?: string;
  isActive: boolean;
  expiresAt?: string;
  createdAt: string;
  addedBy?: {
    firstName: string;
    lastName: string;
  };
}

export default function DNCListPage() {
  const [entries, setEntries] = useState<DNCEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [checkNumber, setCheckNumber] = useState('');
  const [checkResult, setCheckResult] = useState<{ checked: boolean; isDNC: boolean } | null>(null);
  const [formData, setFormData] = useState({
    phoneNumber: '',
    reason: 'CUSTOMER_REQUEST',
    notes: '',
    expiresAt: '',
  });
  const [importData, setImportData] = useState({
    phoneNumbers: '',
    reason: 'CUSTOMER_REQUEST',
  });

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const response = await api.get('/advanced/dnc-list');
      setEntries(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch DNC list:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/advanced/dnc-list', {
        ...formData,
        expiresAt: formData.expiresAt || undefined,
      });
      setShowAddModal(false);
      setFormData({
        phoneNumber: '',
        reason: 'CUSTOMER_REQUEST',
        notes: '',
        expiresAt: '',
      });
      fetchEntries();
    } catch (error) {
      console.error('Failed to add to DNC list:', error);
      alert('Failed to add to DNC list');
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const phoneNumbers = importData.phoneNumbers
        .split('\n')
        .map((n) => n.trim())
        .filter((n) => n);
      await api.post('/advanced/dnc-list/import', {
        phoneNumbers,
        reason: importData.reason,
      });
      setShowImportModal(false);
      setImportData({ phoneNumbers: '', reason: 'CUSTOMER_REQUEST' });
      fetchEntries();
    } catch (error) {
      console.error('Failed to import DNC list:', error);
      alert('Failed to import DNC list');
    }
  };

  const handleRemove = async (phoneNumber: string) => {
    if (!confirm('Are you sure you want to remove this number from DNC list?')) return;
    try {
      await api.delete(`/advanced/dnc-list/${encodeURIComponent(phoneNumber)}`);
      fetchEntries();
    } catch (error) {
      console.error('Failed to remove from DNC list:', error);
    }
  };

  const handleCheck = async () => {
    if (!checkNumber) return;
    try {
      const response = await api.get(
        `/advanced/dnc-list/check/${encodeURIComponent(checkNumber)}`
      );
      setCheckResult({ checked: true, isDNC: response.data.data.isDNC });
    } catch (error) {
      console.error('Failed to check number:', error);
    }
  };

  const getReasonLabel = (reason: string) => {
    const labels: Record<string, string> = {
      CUSTOMER_REQUEST: 'Customer Request',
      LEGAL_REQUIREMENT: 'Legal Requirement',
      INVALID_NUMBER: 'Invalid Number',
      FRAUD: 'Fraud',
      COMPLAINT: 'Complaint',
      OTHER: 'Other',
    };
    return labels[reason] || reason;
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
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Do Not Call List</h1>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowImportModal(true)}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200"
          >
            Import List
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            Add Number
          </button>
        </div>
      </div>

      {/* Quick Check */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
        <h2 className="text-lg font-semibold mb-3">Quick Number Check</h2>
        <div className="flex gap-3">
          <input
            type="tel"
            value={checkNumber}
            onChange={(e) => {
              setCheckNumber(e.target.value);
              setCheckResult(null);
            }}
            placeholder="Enter phone number to check"
            className="flex-1 border rounded-lg px-3 py-2"
          />
          <button
            onClick={handleCheck}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Check
          </button>
        </div>
        {checkResult?.checked && (
          <div className={`mt-3 p-3 rounded-lg ${checkResult.isDNC ? 'bg-red-100' : 'bg-green-100'}`}>
            {checkResult.isDNC ? (
              <span className="text-red-800 font-medium">
                This number IS on the Do Not Call list
              </span>
            ) : (
              <span className="text-green-800 font-medium">
                This number is NOT on the Do Not Call list
              </span>
            )}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="text-2xl font-bold text-red-600">{entries.length}</div>
          <div className="text-gray-500 text-sm">Total Numbers</div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="text-2xl font-bold text-green-600">
            {entries.filter((e) => e.isActive).length}
          </div>
          <div className="text-gray-500 text-sm">Active</div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="text-2xl font-bold text-yellow-600">
            {entries.filter((e) => e.expiresAt).length}
          </div>
          <div className="text-gray-500 text-sm">With Expiry</div>
        </div>
      </div>

      {/* DNC List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Phone Number
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Reason
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Notes
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Added
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Expires
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {entries.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  No numbers in DNC list
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{entry.phoneNumber}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                      {getReasonLabel(entry.reason)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-sm">{entry.notes || '-'}</td>
                  <td className="px-6 py-4 text-sm">
                    <div className="text-gray-900">
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </div>
                    {entry.addedBy && (
                      <div className="text-gray-500">
                        by {entry.addedBy.firstName} {entry.addedBy.lastName}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {entry.expiresAt ? new Date(entry.expiresAt).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleRemove(entry.phoneNumber)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add to DNC List</h2>
            <form onSubmit={handleAdd} className="space-y-4">
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
                <label className="block text-sm font-medium text-gray-700">Reason</label>
                <select
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="mt-1 block w-full border rounded-lg px-3 py-2"
                >
                  <option value="CUSTOMER_REQUEST">Customer Request</option>
                  <option value="LEGAL_REQUIREMENT">Legal Requirement</option>
                  <option value="INVALID_NUMBER">Invalid Number</option>
                  <option value="FRAUD">Fraud</option>
                  <option value="COMPLAINT">Complaint</option>
                  <option value="OTHER">Other</option>
                </select>
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
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Expires At (optional)
                </label>
                <input
                  type="date"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                  className="mt-1 block w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Add to DNC
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Import DNC List</h2>
            <form onSubmit={handleImport} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Phone Numbers (one per line)
                </label>
                <textarea
                  value={importData.phoneNumbers}
                  onChange={(e) =>
                    setImportData({ ...importData, phoneNumbers: e.target.value })
                  }
                  className="mt-1 block w-full border rounded-lg px-3 py-2"
                  rows={8}
                  placeholder="+1234567890&#10;+0987654321&#10;..."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Reason</label>
                <select
                  value={importData.reason}
                  onChange={(e) => setImportData({ ...importData, reason: e.target.value })}
                  className="mt-1 block w-full border rounded-lg px-3 py-2"
                >
                  <option value="CUSTOMER_REQUEST">Customer Request</option>
                  <option value="LEGAL_REQUIREMENT">Legal Requirement</option>
                  <option value="INVALID_NUMBER">Invalid Number</option>
                  <option value="FRAUD">Fraud</option>
                  <option value="COMPLAINT">Complaint</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Import
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
