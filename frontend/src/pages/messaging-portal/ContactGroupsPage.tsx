import { useState, useEffect } from 'react';
import {
  PlusIcon,
  FolderIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  UsersIcon,
  UserPlusIcon,
} from '@heroicons/react/24/outline';
import { contactsApi, MessagingContactGroup, MessagingContact } from '../../services/messaging.service';

const ContactGroupsPage = () => {
  const [groups, setGroups] = useState<MessagingContactGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<MessagingContactGroup | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [showManageModal, setShowManageModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<MessagingContactGroup | null>(null);
  const [allContacts, setAllContacts] = useState<MessagingContact[]>([]);
  const [groupContactIds, setGroupContactIds] = useState<string[]>([]);
  const [contactSearch, setContactSearch] = useState('');

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      const groups = await contactsApi.listGroups();
      setGroups(groups);
    } catch (error) {
      console.error('Failed to load groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddGroup = async () => {
    try {
      await contactsApi.createGroup(formData);
      setShowAddModal(false);
      setFormData({ name: '', description: '' });
      loadGroups();
    } catch (error) {
      console.error('Failed to create group:', error);
    }
  };

  const handleUpdateGroup = async () => {
    if (!editingGroup) return;
    try {
      await contactsApi.updateGroup(editingGroup.id, formData);
      setEditingGroup(null);
      setFormData({ name: '', description: '' });
      loadGroups();
    } catch (error) {
      console.error('Failed to update group:', error);
    }
  };

  const handleDeleteGroup = async (id: string) => {
    if (!confirm('Are you sure you want to delete this group?')) return;
    try {
      await contactsApi.deleteGroup(id);
      loadGroups();
    } catch (error) {
      console.error('Failed to delete group:', error);
    }
  };

  const openEditModal = (group: MessagingContactGroup) => {
    setEditingGroup(group);
    setFormData({ name: group.name, description: group.description || '' });
  };

  const openManageModal = async (group: MessagingContactGroup) => {
    setSelectedGroup(group);
    setShowManageModal(true);
    try {
      const [contactsResponse, groupContactsResponse] = await Promise.all([
        contactsApi.getContacts({ limit: 1000 }),
        contactsApi.getGroupContacts(group.id),
      ]);
      setAllContacts(contactsResponse.contacts);
      setGroupContactIds(groupContactsResponse.contacts.map((c: MessagingContact) => c.id));
    } catch (error) {
      console.error('Failed to load contacts:', error);
    }
  };

  const handleToggleContact = async (contactId: string) => {
    if (!selectedGroup) return;
    const isInGroup = groupContactIds.includes(contactId);
    try {
      if (isInGroup) {
        await contactsApi.removeContactFromGroup(selectedGroup.id, contactId);
        setGroupContactIds(groupContactIds.filter((id) => id !== contactId));
      } else {
        await contactsApi.addContactToGroup(selectedGroup.id, contactId);
        setGroupContactIds([...groupContactIds, contactId]);
      }
      loadGroups();
    } catch (error) {
      console.error('Failed to update group membership:', error);
    }
  };

  const filteredContacts = allContacts.filter(
    (contact) =>
      contact.phone.toLowerCase().includes(contactSearch.toLowerCase()) ||
      (contact.name && contact.name.toLowerCase().includes(contactSearch.toLowerCase()))
  );

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
          <h1 className="text-2xl font-bold text-gray-900">Contact Groups</h1>
          <p className="text-gray-600">Organize your contacts into groups for easier campaign targeting</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Create Group
        </button>
      </div>

      {/* Groups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups.length > 0 ? (
          groups.map((group) => (
            <div
              key={group.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className="p-3 bg-primary-100 rounded-lg">
                    <FolderIcon className="h-6 w-6 text-primary-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900">{group.name}</h3>
                    <p className="text-sm text-gray-500">{group._count?.contacts || 0} contacts</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => openEditModal(group)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteGroup(group.id)}
                    className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {group.description && (
                <p className="text-sm text-gray-600 mb-4">{group.description}</p>
              )}

              <button
                onClick={() => openManageModal(group)}
                className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <UserPlusIcon className="h-5 w-5 mr-2" />
                Manage Contacts
              </button>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
            <FolderIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No groups yet</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 text-primary-600 hover:text-primary-700"
            >
              Create your first group
            </button>
          </div>
        )}
      </div>

      {/* Add/Edit Group Modal */}
      {(showAddModal || editingGroup) && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => { setShowAddModal(false); setEditingGroup(null); }} />
            <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingGroup ? 'Edit Group' : 'Create Group'}
                </h3>
                <button onClick={() => { setShowAddModal(false); setEditingGroup(null); }}>
                  <XMarkIcon className="h-6 w-6 text-gray-400" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Group Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="VIP Customers"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="High-value customers for premium offers"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => { setShowAddModal(false); setEditingGroup(null); }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={editingGroup ? handleUpdateGroup : handleAddGroup}
                  disabled={!formData.name}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg disabled:opacity-50"
                >
                  {editingGroup ? 'Update' : 'Create Group'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manage Contacts Modal */}
      {showManageModal && selectedGroup && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowManageModal(false)} />
            <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[80vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Manage Contacts</h3>
                  <p className="text-sm text-gray-500">{selectedGroup.name} - {groupContactIds.length} contacts selected</p>
                </div>
                <button onClick={() => setShowManageModal(false)}>
                  <XMarkIcon className="h-6 w-6 text-gray-400" />
                </button>
              </div>

              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search contacts..."
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div className="flex-1 overflow-y-auto border rounded-lg">
                {filteredContacts.length > 0 ? (
                  <div className="divide-y divide-gray-200">
                    {filteredContacts.map((contact) => (
                      <div
                        key={contact.id}
                        className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
                      >
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <UsersIcon className="h-5 w-5 text-gray-500" />
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">{contact.name || contact.phone}</p>
                            <p className="text-xs text-gray-500">{contact.phone}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleToggleContact(contact.id)}
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            groupContactIds.includes(contact.id)
                              ? 'bg-primary-100 text-primary-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {groupContactIds.includes(contact.id) ? 'Remove' : 'Add'}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    No contacts found
                  </div>
                )}
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setShowManageModal(false)}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactGroupsPage;
