/**
 * Commission Dashboard Page
 * Commission tracking, rules management, and payout processing
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import {
  CurrencyRupeeIcon,
  PlusIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  BanknotesIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ArrowPathIcon,
  FunnelIcon,
  EllipsisVerticalIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import {
  commissionService,
  Commission,
  CommissionRule,
  CommissionStats,
  CommissionStatus,
  CommissionType,
} from '../../services/commission.service';
import { RootState } from '../../store';

const STATUS_COLORS: Record<CommissionStatus, { bg: string; text: string; icon: React.ElementType }> = {
  PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: ClockIcon },
  APPROVED: { bg: 'bg-blue-100', text: 'text-blue-800', icon: CheckCircleIcon },
  REJECTED: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircleIcon },
  PAID: { bg: 'bg-green-100', text: 'text-green-800', icon: BanknotesIcon },
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

// Roles that can manage commissions (view all, approve, reject, etc.)
const ADMIN_ROLES = ['superadmin', 'admin'];

export default function CommissionDashboardPage() {
  const { user } = useSelector((state: RootState) => state.auth);
  // Role can be a string or object with slug - handle both cases
  const rawRole = typeof user?.role === 'string' ? user.role : (user?.role as any)?.slug || '';
  const userRole = rawRole.toLowerCase().trim().replace(/[_-]/g, '');
  const isAdmin = ADMIN_ROLES.includes(userRole);

  const [activeTab, setActiveTab] = useState<'commissions' | 'rules'>('commissions');
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [rules, setRules] = useState<CommissionRule[]>([]);
  const [stats, setStats] = useState<CommissionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<CommissionStatus | ''>('');
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [selectedCommission, setSelectedCommission] = useState<Commission | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // New rule form
  const [newRule, setNewRule] = useState<{
    name: string;
    description: string;
    type: CommissionType;
    rate: number;
    minValue: number;
    maxValue: number;
  }>({
    name: '',
    description: '',
    type: 'PERCENTAGE',
    rate: 10,
    minValue: 0,
    maxValue: 0,
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Admin users see all commissions; others see only their own
      const commissionsPromise = isAdmin
        ? commissionService.getAllCommissions({
            status: statusFilter || undefined,
            limit: 50,
          })
        : commissionService.getMyCommissions({
            status: statusFilter || undefined,
            limit: 50,
          });

      // Only admins can manage rules
      const rulesPromise = isAdmin ? commissionService.getRules() : Promise.resolve([]);

      // Stats: admin sees org stats, others see their own stats
      const statsPromise = isAdmin
        ? commissionService.getStats()
        : commissionService.getStats(user?.id);

      const [commissionsData, rulesData, statsData] = await Promise.all([
        commissionsPromise,
        rulesPromise,
        statsPromise,
      ]);

      setCommissions(commissionsData.commissions);
      setRules(rulesData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to fetch commission data:', error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, isAdmin, user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApprove = async (commission: Commission) => {
    try {
      setActionLoading(commission.id);
      await commissionService.approve(commission.id);
      await fetchData();
    } catch (error) {
      console.error('Failed to approve commission:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (commission: Commission, notes: string) => {
    try {
      setActionLoading(commission.id);
      await commissionService.reject(commission.id, notes);
      await fetchData();
      setSelectedCommission(null);
    } catch (error) {
      console.error('Failed to reject commission:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkAsPaid = async (commission: Commission) => {
    try {
      setActionLoading(commission.id);
      await commissionService.markAsPaid(commission.id);
      await fetchData();
    } catch (error) {
      console.error('Failed to mark commission as paid:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateRule = async () => {
    if (!newRule.name || newRule.rate <= 0) return;

    try {
      await commissionService.createRule({
        name: newRule.name,
        description: newRule.description || undefined,
        type: newRule.type,
        rate: newRule.rate,
        minValue: newRule.minValue || undefined,
        maxValue: newRule.maxValue || undefined,
      });
      setShowRuleModal(false);
      setNewRule({
        name: '',
        description: '',
        type: 'PERCENTAGE',
        rate: 10,
        minValue: 0,
        maxValue: 0,
      });
      await fetchData();
    } catch (error) {
      console.error('Failed to create rule:', error);
    }
  };

  const toggleRuleStatus = async (rule: CommissionRule) => {
    try {
      await commissionService.updateRule(rule.id, { isActive: !rule.isActive });
      await fetchData();
    } catch (error) {
      console.error('Failed to toggle rule status:', error);
    }
  };

  return (
    <div className="p-4">
      {/* Header Row - Title + Stats */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <CurrencyRupeeIcon className="h-5 w-5 text-green-600" />
          Commissions
        </h1>
        {stats && (
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500">Total:</span>
              <span className="font-semibold text-gray-900">{formatCurrency(stats.totalEarned)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-yellow-400"></span>
              <span className="text-gray-600">Pending: {formatCurrency(stats.pending.amount)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-400"></span>
              <span className="text-gray-600">Approved: {formatCurrency(stats.approved.amount)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-green-400"></span>
              <span className="text-gray-600">Paid: {formatCurrency(stats.paid.amount)}</span>
            </div>
            <button
              onClick={() => fetchData()}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
            >
              <ArrowPathIcon className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Tabs + Filter Row */}
      <div className="flex items-center justify-between mb-3 border-b border-gray-200">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab('commissions')}
            className={`pb-2 text-sm font-medium border-b-2 ${
              activeTab === 'commissions'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {isAdmin ? 'All Commissions' : 'My Commissions'}
          </button>
          {isAdmin && (
          <button
            onClick={() => setActiveTab('rules')}
            className={`pb-2 text-sm font-medium border-b-2 ${
              activeTab === 'rules'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Rules
          </button>
          )}
        </nav>
        {activeTab === 'commissions' && (
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as CommissionStatus | '')}
            className="border border-gray-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-green-500 focus:border-green-500 mb-2"
          >
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="PAID">Paid</option>
          </select>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <ArrowPathIcon className="h-6 w-6 text-gray-400 animate-spin" />
        </div>
      ) : activeTab === 'commissions' ? (
        <>
          {/* Commissions Table */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <table className="w-full divide-y divide-gray-200 table-fixed">
              <thead className="bg-gray-50">
                <tr>
                  {isAdmin && (
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-[15%]">
                    User
                  </th>
                  )}
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-[22%]">
                    Student / Admission
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-[12%]">
                    Base Value
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-[6%]">
                    Rate
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-[10%]">
                    Commission
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-[10%]">
                    Status
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-[10%]">
                    Date
                  </th>
                  {isAdmin && (
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase w-[15%]">
                    Actions
                  </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {commissions.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 8 : 6} className="px-3 py-8 text-center text-gray-500 text-sm">
                      No commissions found
                    </td>
                  </tr>
                ) : (
                  commissions.map(commission => {
                    const statusConfig = STATUS_COLORS[commission.status];
                    const StatusIcon = statusConfig.icon;

                    return (
                      <tr key={commission.id} className="hover:bg-gray-50">
                        {isAdmin && (
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                              <UserIcon className="h-3 w-3 text-green-600" />
                            </div>
                            <span className="text-sm text-gray-900 truncate">
                              {commission.user ? `${commission.user.firstName} ${commission.user.lastName}` : 'Unknown'}
                            </span>
                          </div>
                        </td>
                        )}
                        <td className="px-3 py-2">
                          {commission.admission ? (
                            <div>
                              <p className="text-sm text-gray-900 truncate">
                                {commission.admission.lead?.firstName} {commission.admission.lead?.lastName}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {commission.admission.admissionNumber}
                              </p>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900">
                          {formatCurrency(commission.baseValue)}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-500">
                          {commission.rate}%
                        </td>
                        <td className="px-3 py-2 text-sm font-medium text-green-600">
                          {formatCurrency(commission.amount)}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}
                          >
                            {commission.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-500">
                          {new Date(commission.createdAt).toLocaleDateString()}
                        </td>
                        {isAdmin && (
                        <td className="px-3 py-2 text-right">
                          {commission.status === 'PENDING' && (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleApprove(commission)}
                                disabled={actionLoading === commission.id}
                                className="px-2 py-0.5 text-xs text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => setSelectedCommission(commission)}
                                disabled={actionLoading === commission.id}
                                className="px-2 py-0.5 text-xs text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                          {commission.status === 'APPROVED' && (
                            <button
                              onClick={() => handleMarkAsPaid(commission)}
                              disabled={actionLoading === commission.id}
                              className="px-2 py-0.5 text-xs text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
                            >
                              Mark Paid
                            </button>
                          )}
                        </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          {/* Rules Header */}
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowRuleModal(true)}
              className="flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700"
            >
              <PlusIcon className="h-4 w-4" />
              Add Rule
            </button>
          </div>

          {/* Rules Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {rules.length === 0 ? (
              <div className="col-span-full text-center py-8 bg-gray-50 rounded-lg">
                <Cog6ToothIcon className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No commission rules configured</p>
              </div>
            ) : (
              rules.map(rule => (
                <div
                  key={rule.id}
                  className={`bg-white border rounded-lg p-4 ${
                    rule.isActive ? 'border-green-200' : 'border-gray-200 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-medium text-gray-900 text-sm">{rule.name}</h3>
                      {rule.description && (
                        <p className="text-xs text-gray-500 mt-0.5">{rule.description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => toggleRuleStatus(rule)}
                      className="relative"
                    >
                      <div
                        className={`w-9 h-5 rounded-full transition-colors ${
                          rule.isActive ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      >
                        <div
                          className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                            rule.isActive ? 'translate-x-4' : 'translate-x-0.5'
                          }`}
                        />
                      </div>
                    </button>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-gray-500">Type: <span className="text-gray-900">{rule.type}</span></span>
                    <span className="text-gray-500">Rate: <span className="text-green-600 font-medium">
                      {rule.type === 'PERCENTAGE' ? `${rule.rate}%` : formatCurrency(rule.rate)}
                    </span></span>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Create Rule Modal */}
      {showRuleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Create Commission Rule</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rule Name</label>
                <input
                  type="text"
                  value={newRule.name}
                  onChange={e => setNewRule(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="e.g., Sales Commission"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newRule.description}
                  onChange={e => setNewRule(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  rows={2}
                  placeholder="Optional description..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={newRule.type}
                    onChange={e => setNewRule(prev => ({ ...prev, type: e.target.value as CommissionType }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="PERCENTAGE">Percentage</option>
                    <option value="FIXED">Fixed Amount</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rate {newRule.type === 'PERCENTAGE' ? '(%)' : '(₹)'}
                  </label>
                  <input
                    type="number"
                    value={newRule.rate}
                    onChange={e => setNewRule(prev => ({ ...prev, rate: parseFloat(e.target.value) || 0 }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    min={0}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Value (₹)</label>
                  <input
                    type="number"
                    value={newRule.minValue}
                    onChange={e => setNewRule(prev => ({ ...prev, minValue: parseFloat(e.target.value) || 0 }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    min={0}
                    placeholder="0 = No minimum"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Value (₹)</label>
                  <input
                    type="number"
                    value={newRule.maxValue}
                    onChange={e => setNewRule(prev => ({ ...prev, maxValue: parseFloat(e.target.value) || 0 }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    min={0}
                    placeholder="0 = No maximum"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowRuleModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRule}
                disabled={!newRule.name || newRule.rate <= 0}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Rule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {selectedCommission && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Reject Commission</h2>
            <p className="text-sm text-gray-500 mb-4">
              Please provide a reason for rejecting this commission of{' '}
              <span className="font-semibold">{formatCurrency(selectedCommission.amount)}</span>
            </p>

            <textarea
              id="reject-notes"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
              rows={3}
              placeholder="Reason for rejection..."
            />

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setSelectedCommission(null)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const notes = (document.getElementById('reject-notes') as HTMLTextAreaElement).value;
                  handleReject(selectedCommission, notes);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
