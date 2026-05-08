import React, { useState, useEffect } from 'react';
import {
  WalletIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  BanknotesIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface WalletData {
  balance: number;
  pendingBalance: number;
  totalEarnings: number;
  totalWithdrawn: number;
  transactions: Transaction[];
}

interface Transaction {
  id: string;
  type: 'COMMISSION' | 'WITHDRAWAL' | 'BONUS' | 'ADJUSTMENT';
  amount: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  description: string;
  createdAt: string;
}

interface Payout {
  id: string;
  amount: number;
  status: 'PENDING' | 'PROCESSED' | 'REJECTED';
  paymentMethod: string;
  createdAt: string;
  processedAt?: string;
  notes?: string;
}

export const AdmissionPartnerWalletPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutNotes, setPayoutNotes] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [activeTab, setActiveTab] = useState<'transactions' | 'payouts'>('transactions');

  useEffect(() => {
    fetchWallet();
    fetchPayouts();
  }, []);

  const fetchWallet = async () => {
    try {
      const token = localStorage.getItem('admission_partner_token');
      const response = await fetch('/api/partner-portal/wallet', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch wallet');

      const data = await response.json();
      setWallet(data.data);
    } catch (error) {
      toast.error('Failed to load wallet');
    } finally {
      setLoading(false);
    }
  };

  const fetchPayouts = async () => {
    try {
      const token = localStorage.getItem('admission_partner_token');
      const response = await fetch('/api/partner-portal/payouts', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch payouts');

      const data = await response.json();
      setPayouts(data.data);
    } catch (error) {
      console.error('Failed to load payouts:', error);
    }
  };

  const handleRequestPayout = async () => {
    const amount = parseFloat(payoutAmount);
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (amount < 1000) {
      toast.error('Minimum payout amount is Rs. 1,000');
      return;
    }

    if (wallet && amount > wallet.balance) {
      toast.error('Insufficient balance');
      return;
    }

    setRequesting(true);
    try {
      const token = localStorage.getItem('admission_partner_token');
      const response = await fetch('/api/partner-portal/payouts/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount, notes: payoutNotes }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to request payout');
      }

      toast.success('Payout request submitted');
      setShowPayoutModal(false);
      setPayoutAmount('');
      setPayoutNotes('');
      fetchWallet();
      fetchPayouts();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setRequesting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Wallet & Payouts</h1>
          <p className="text-gray-600">Manage your earnings and withdrawals</p>
        </div>
        <button
          onClick={() => setShowPayoutModal(true)}
          disabled={!wallet || wallet.balance < 1000}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <BanknotesIcon className="h-5 w-5" />
          Request Payout
        </button>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Available Balance</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(wallet?.balance || 0)}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <WalletIcon className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Ready for withdrawal</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending Balance</p>
              <p className="text-2xl font-bold text-orange-600">
                {formatCurrency(wallet?.pendingBalance || 0)}
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <ClockIcon className="h-6 w-6 text-orange-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Awaiting approval</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Earnings</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(wallet?.totalEarnings || 0)}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <ArrowUpIcon className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">All time earnings</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Withdrawn</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(wallet?.totalWithdrawn || 0)}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <ArrowDownIcon className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">All time withdrawals</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="border-b">
          <div className="flex">
            <button
              onClick={() => setActiveTab('transactions')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'transactions'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Transactions
            </button>
            <button
              onClick={() => setActiveTab('payouts')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'payouts'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Payout History
            </button>
          </div>
        </div>

        <div className="p-4">
          {activeTab === 'transactions' ? (
            <div className="space-y-3">
              {!wallet?.transactions?.length ? (
                <p className="text-center text-gray-500 py-8">No transactions yet</p>
              ) : (
                wallet.transactions.map((txn) => (
                  <div
                    key={txn.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        txn.type === 'COMMISSION' || txn.type === 'BONUS'
                          ? 'bg-green-100'
                          : 'bg-red-100'
                      }`}>
                        {txn.type === 'COMMISSION' || txn.type === 'BONUS' ? (
                          <ArrowUpIcon className="h-5 w-5 text-green-600" />
                        ) : (
                          <ArrowDownIcon className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{txn.description}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(txn.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${
                        txn.amount > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {txn.amount > 0 ? '+' : ''}{formatCurrency(txn.amount)}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        txn.status === 'COMPLETED'
                          ? 'bg-green-100 text-green-700'
                          : txn.status === 'PENDING'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {txn.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {!payouts.length ? (
                <p className="text-center text-gray-500 py-8">No payout requests yet</p>
              ) : (
                payouts.map((payout) => (
                  <div
                    key={payout.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        payout.status === 'PROCESSED'
                          ? 'bg-green-100'
                          : payout.status === 'REJECTED'
                          ? 'bg-red-100'
                          : 'bg-yellow-100'
                      }`}>
                        {payout.status === 'PROCESSED' ? (
                          <CheckCircleIcon className="h-5 w-5 text-green-600" />
                        ) : payout.status === 'REJECTED' ? (
                          <XCircleIcon className="h-5 w-5 text-red-600" />
                        ) : (
                          <ClockIcon className="h-5 w-5 text-yellow-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          Payout Request - {payout.paymentMethod}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(payout.createdAt).toLocaleDateString('en-IN')}
                          {payout.processedAt && (
                            <> | Processed: {new Date(payout.processedAt).toLocaleDateString('en-IN')}</>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{formatCurrency(payout.amount)}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        payout.status === 'PROCESSED'
                          ? 'bg-green-100 text-green-700'
                          : payout.status === 'REJECTED'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {payout.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Payout Modal */}
      {showPayoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Request Payout</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (Min: Rs. 1,000)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Rs.</span>
                  <input
                    type="number"
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    max={wallet?.balance || 0}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="Enter amount"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Available: {formatCurrency(wallet?.balance || 0)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={payoutNotes}
                  onChange={(e) => setPayoutNotes(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Any additional notes..."
                />
              </div>

              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
                <p>Payout will be processed to your registered bank account within 2-3 business days.</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowPayoutModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestPayout}
                disabled={requesting}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {requesting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdmissionPartnerWalletPage;
