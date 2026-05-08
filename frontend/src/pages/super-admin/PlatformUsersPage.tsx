import { useState, useEffect } from 'react';
import {
  UsersIcon,
  UserPlusIcon,
  ShieldCheckIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  PencilIcon,
} from '@heroicons/react/24/outline';
import api from '../../services/api';

interface SuperAdmin {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  createdAt: string;
  lastLoginAt?: string;
}

interface PlatformUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
  role?: { name: string; slug: string };
  organization?: { id: string; name: string; slug: string };
}

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  recentLogins: number;
  byRole: Array<{ role: string; count: number }>;
}

export default function PlatformUsersPage() {
  const [superAdmins, setSuperAdmins] = useState<{ dedicated: SuperAdmin[]; roleBasedUsers: SuperAdmin[] }>({
    dedicated: [],
    roleBasedUsers: [],
  });
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'admins' | 'users' | 'stats'>('admins');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAdmin, setNewAdmin] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [search, page, activeTab]);

  const fetchData = async () => {
    try {
      const [adminsRes, statsRes] = await Promise.all([
        api.get('/super-admin/users/super-admins'),
        api.get('/super-admin/users/stats'),
      ]);
      setSuperAdmins(adminsRes.data.data || { dedicated: [], roleBasedUsers: [] });
      setStats(statsRes.data.data);
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/super-admin/users/all', {
        params: { page, limit: 15, search: search || undefined },
      });
      setUsers(res.data.data || []);
      setTotalPages(res.data.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const handleCreateAdmin = async () => {
    try {
      await api.post('/super-admin/users/super-admins', newAdmin);
      setShowCreateModal(false);
      setNewAdmin({ email: '', password: '', firstName: '', lastName: '' });
      fetchData();
    } catch (error) {
      console.error('Failed to create admin:', error);
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
          <h1 className="text-2xl font-bold text-slate-900">Platform Users</h1>
          <p className="text-slate-500">Manage super admins and view all platform users</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          <UserPlusIcon className="w-5 h-5" />
          Create Admin
        </button>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <UsersIcon className="w-10 h-10 text-purple-500" />
              <div>
                <p className="text-sm text-slate-500">Total Users</p>
                <p className="text-2xl font-bold text-slate-900">{stats.totalUsers.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <CheckCircleIcon className="w-10 h-10 text-green-500" />
              <div>
                <p className="text-sm text-slate-500">Active Users</p>
                <p className="text-2xl font-bold text-slate-900">{stats.activeUsers.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <XCircleIcon className="w-10 h-10 text-red-500" />
              <div>
                <p className="text-sm text-slate-500">Inactive Users</p>
                <p className="text-2xl font-bold text-slate-900">{stats.inactiveUsers.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <ShieldCheckIcon className="w-10 h-10 text-amber-500" />
              <div>
                <p className="text-sm text-slate-500">Logins (7 days)</p>
                <p className="text-2xl font-bold text-slate-900">{stats.recentLogins.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="border-b border-slate-200">
          <div className="flex">
            {(['admins', 'users', 'stats'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 text-sm font-medium border-b-2 ${
                  activeTab === tab
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab === 'admins' ? 'Super Admins' : tab === 'users' ? 'All Users' : 'By Role'}
              </button>
            ))}
          </div>
        </div>

        {/* Super Admins Tab */}
        {activeTab === 'admins' && (
          <div className="p-6">
            {superAdmins.dedicated.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-slate-500 mb-3">Dedicated Super Admins</h3>
                <div className="space-y-3">
                  {superAdmins.dedicated.map((admin) => (
                    <div
                      key={admin.id}
                      className="flex items-center justify-between p-4 border border-slate-200 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                          <span className="text-purple-700 font-semibold">
                            {admin.firstName[0]}{admin.lastName[0]}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">
                            {admin.firstName} {admin.lastName}
                          </p>
                          <p className="text-sm text-slate-500">{admin.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-500">
                          Last login: {admin.lastLoginAt ? new Date(admin.lastLoginAt).toLocaleDateString() : 'Never'}
                        </p>
                        <p className="text-xs text-slate-400">
                          Created: {new Date(admin.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {superAdmins.roleBasedUsers.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-slate-500 mb-3">Role-Based Admins</h3>
                <div className="space-y-3">
                  {superAdmins.roleBasedUsers.map((admin: any) => (
                    <div
                      key={admin.id}
                      className="flex items-center justify-between p-4 border border-slate-200 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-blue-700 font-semibold">
                            {admin.firstName[0]}{admin.lastName[0]}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">
                            {admin.firstName} {admin.lastName}
                          </p>
                          <p className="text-sm text-slate-500">{admin.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                          {admin.role?.name || 'Super Admin'}
                        </span>
                        <p className="text-xs text-slate-400 mt-1">
                          Last login: {admin.lastLoginAt ? new Date(admin.lastLoginAt).toLocaleDateString() : 'Never'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {superAdmins.dedicated.length === 0 && superAdmins.roleBasedUsers.length === 0 && (
              <p className="text-center text-slate-500 py-8">No super admins found</p>
            )}
          </div>
        )}

        {/* All Users Tab */}
        {activeTab === 'users' && (
          <div>
            <div className="p-4 border-b border-slate-200">
              <div className="relative">
                <MagnifyingGlassIcon className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search users by name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left py-3 px-4 text-slate-500 font-medium">User</th>
                    <th className="text-left py-3 px-4 text-slate-500 font-medium">Organization</th>
                    <th className="text-left py-3 px-4 text-slate-500 font-medium">Role</th>
                    <th className="text-left py-3 px-4 text-slate-500 font-medium">Status</th>
                    <th className="text-left py-3 px-4 text-slate-500 font-medium">Last Login</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-slate-900">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="text-xs text-slate-500">{user.email}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {user.organization ? (
                          <span className="text-slate-700">{user.organization.name}</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded">
                          {user.role?.name || '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {user.isActive ? (
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">Active</span>
                        ) : (
                          <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded">Inactive</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                      </td>
                    </tr>
                  ))}
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

        {/* Stats Tab */}
        {activeTab === 'stats' && stats && (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Users by Role</h3>
            <div className="space-y-3">
              {stats.byRole.map((item) => (
                <div key={item.role} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                  <span className="font-medium text-slate-900">{item.role}</span>
                  <span className="text-slate-600">{item.count.toLocaleString()} users</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create Admin Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Create Super Admin</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                  <input
                    type="text"
                    value={newAdmin.firstName}
                    onChange={(e) => setNewAdmin({ ...newAdmin, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={newAdmin.lastName}
                    onChange={(e) => setNewAdmin({ ...newAdmin, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={newAdmin.email}
                  onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  value={newAdmin.password}
                  onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-xs text-slate-500 mt-1">Min 12 characters with uppercase, lowercase, number, and special char</p>
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
                onClick={handleCreateAdmin}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Create Admin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
