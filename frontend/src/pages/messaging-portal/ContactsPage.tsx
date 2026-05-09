import { useState, useEffect, useRef } from 'react';
import {
  PlusIcon,
  ArrowUpTrayIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  DocumentArrowDownIcon,
} from '@heroicons/react/24/outline';
import { contactsApi, MessagingContact } from '../../services/messaging.service';

interface ContactFormData {
  phone: string;
  name: string;
  email: string;
  customFields: Record<string, string>;
}

interface UploadMapping {
  phone: string;
  name: string;
  email: string;
}

const ContactsPage = () => {
  const [contacts, setContacts] = useState<MessagingContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingContact, setEditingContact] = useState<MessagingContact | null>(null);
  const [formData, setFormData] = useState<ContactFormData>({
    phone: '',
    name: '',
    email: '',
    customFields: {},
  });
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [uploadMapping, setUploadMapping] = useState<UploadMapping>({ phone: '', name: '', email: '' });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0 });

  useEffect(() => {
    loadContacts();
  }, [pagination.page, search]);

  const loadContacts = async () => {
    try {
      const response = await contactsApi.listContacts(
        pagination.page,
        pagination.limit,
        { search: search || undefined }
      );
      setContacts(response.contacts);
      setPagination((prev) => ({ ...prev, total: response.pagination.total }));
    } catch (error) {
      console.error('Failed to load contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddContact = async () => {
    try {
      await contactsApi.createContact(formData);
      setShowAddModal(false);
      setFormData({ phone: '', name: '', email: '', customFields: {} });
      loadContacts();
    } catch (error) {
      console.error('Failed to add contact:', error);
    }
  };

  const handleUpdateContact = async () => {
    if (!editingContact) return;
    try {
      await contactsApi.updateContact(editingContact.id, formData);
      setEditingContact(null);
      setFormData({ phone: '', name: '', email: '', customFields: {} });
      loadContacts();
    } catch (error) {
      console.error('Failed to update contact:', error);
    }
  };

  const handleDeleteContact = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;
    try {
      await contactsApi.deleteContact(id);
      loadContacts();
    } catch (error) {
      console.error('Failed to delete contact:', error);
    }
  };

  const handleDeleteSelected = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedContacts.length} contacts?`)) return;
    try {
      await Promise.all(selectedContacts.map((id) => contactsApi.deleteContact(id)));
      setSelectedContacts([]);
      loadContacts();
    } catch (error) {
      console.error('Failed to delete contacts:', error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter((line) => line.trim());
      const headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''));
      const data = lines.slice(1).map((line) => {
        const values: string[] = [];
        let current = '';
        let inQuotes = false;
        for (const char of line) {
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        values.push(current.trim());
        return values;
      });

      setCsvHeaders(headers);
      setCsvData(data);
      setUploadMapping({
        phone: headers.find((h) => h.toLowerCase().includes('phone')) || '',
        name: headers.find((h) => h.toLowerCase().includes('name')) || '',
        email: headers.find((h) => h.toLowerCase().includes('email')) || '',
      });
      setShowUploadModal(true);
    };
    reader.readAsText(file);
  };

  const handleUploadContacts = async () => {
    if (!uploadMapping.phone) {
      alert('Please map the phone number column');
      return;
    }

    setUploading(true);
    try {
      const phoneIndex = csvHeaders.indexOf(uploadMapping.phone);
      const nameIndex = uploadMapping.name ? csvHeaders.indexOf(uploadMapping.name) : -1;
      const emailIndex = uploadMapping.email ? csvHeaders.indexOf(uploadMapping.email) : -1;

      const contactsToUpload = csvData.map((row) => ({
        phone: row[phoneIndex] || '',
        name: nameIndex >= 0 ? row[nameIndex] || '' : '',
        email: emailIndex >= 0 ? row[emailIndex] || '' : '',
      })).filter((c) => c.phone);

      const result = await contactsApi.bulkCreate(contactsToUpload);
      alert(`Created ${result.created} contacts, skipped ${result.skipped} duplicates`);
      setShowUploadModal(false);
      setCsvData([]);
      setCsvHeaders([]);
      loadContacts();
    } catch (error) {
      console.error('Failed to upload contacts:', error);
    } finally {
      setUploading(false);
    }
  };

  const openEditModal = (contact: MessagingContact) => {
    setEditingContact(contact);
    setFormData({
      phone: contact.phone,
      name: contact.name || '',
      email: contact.email || '',
      customFields: (contact.customFields as Record<string, string>) || {},
    });
  };

  const toggleSelectAll = () => {
    if (selectedContacts.length === contacts.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(contacts.map((c) => c.id));
    }
  };

  const toggleSelectContact = (id: string) => {
    if (selectedContacts.includes(id)) {
      setSelectedContacts(selectedContacts.filter((i) => i !== id));
    } else {
      setSelectedContacts([...selectedContacts, id]);
    }
  };

  const downloadSampleCsv = () => {
    const csv = 'Phone,Name,Email\n+919876543210,John Doe,john@example.com\n+919876543211,Jane Smith,jane@example.com';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contacts_sample.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <p className="text-gray-600">Manage your contact list for messaging campaigns</p>
        </div>
        <div className="flex space-x-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".csv"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <ArrowUpTrayIcon className="h-5 w-5 mr-2" />
            Upload CSV
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Contact
          </button>
        </div>
      </div>

      {/* Search and Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="p-4 flex items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          {selectedContacts.length > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="ml-4 flex items-center px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
            >
              <TrashIcon className="h-5 w-5 mr-2" />
              Delete ({selectedContacts.length})
            </button>
          )}
        </div>
      </div>

      {/* Contacts Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 w-12">
                <input
                  type="checkbox"
                  checked={selectedContacts.length === contacts.length && contacts.length > 0}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Phone
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {contacts.length > 0 ? (
              contacts.map((contact) => (
                <tr key={contact.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedContacts.includes(contact.id)}
                      onChange={() => toggleSelectContact(contact.id)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {contact.phone}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {contact.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {contact.email || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(contact.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => openEditModal(contact)}
                      className="text-primary-600 hover:text-primary-900 mr-3"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteContact(contact.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <p className="text-gray-500">No contacts found</p>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="mt-4 text-primary-600 hover:text-primary-700"
                  >
                    Add your first contact
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {pagination.total > pagination.limit && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} contacts
            </p>
            <div className="flex space-x-2">
              <button
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page * pagination.limit >= pagination.total}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Contact Modal */}
      {(showAddModal || editingContact) && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => { setShowAddModal(false); setEditingContact(null); }} />
            <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingContact ? 'Edit Contact' : 'Add Contact'}
                </h3>
                <button onClick={() => { setShowAddModal(false); setEditingContact(null); }}>
                  <XMarkIcon className="h-6 w-6 text-gray-400" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="+91 98765 43210"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="john@example.com"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => { setShowAddModal(false); setEditingContact(null); }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={editingContact ? handleUpdateContact : handleAddContact}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg"
                >
                  {editingContact ? 'Update' : 'Add Contact'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload CSV Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowUploadModal(false)} />
            <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Map CSV Columns</h3>
                <button onClick={() => setShowUploadModal(false)}>
                  <XMarkIcon className="h-6 w-6 text-gray-400" />
                </button>
              </div>

              <p className="text-sm text-gray-500 mb-4">
                Found {csvData.length} rows. Map the columns to contact fields:
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number Column *</label>
                  <select
                    value={uploadMapping.phone}
                    onChange={(e) => setUploadMapping({ ...uploadMapping, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Select column</option>
                    {csvHeaders.map((header) => (
                      <option key={header} value={header}>{header}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name Column (optional)</label>
                  <select
                    value={uploadMapping.name}
                    onChange={(e) => setUploadMapping({ ...uploadMapping, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Select column</option>
                    {csvHeaders.map((header) => (
                      <option key={header} value={header}>{header}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Column (optional)</label>
                  <select
                    value={uploadMapping.email}
                    onChange={(e) => setUploadMapping({ ...uploadMapping, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Select column</option>
                    {csvHeaders.map((header) => (
                      <option key={header} value={header}>{header}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Preview */}
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Preview (first 3 rows)</h4>
                <div className="border rounded-lg overflow-auto max-h-40">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        {csvHeaders.map((header) => (
                          <th key={header} className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {csvData.slice(0, 3).map((row, i) => (
                        <tr key={i}>
                          {row.map((cell, j) => (
                            <td key={j} className="px-3 py-2 text-gray-700">{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <button
                  onClick={downloadSampleCsv}
                  className="flex items-center text-sm text-primary-600 hover:text-primary-700"
                >
                  <DocumentArrowDownIcon className="h-5 w-5 mr-1" />
                  Download Sample CSV
                </button>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowUploadModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUploadContacts}
                    disabled={uploading || !uploadMapping.phone}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg disabled:opacity-50"
                  >
                    {uploading ? 'Uploading...' : `Upload ${csvData.length} Contacts`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactsPage;
