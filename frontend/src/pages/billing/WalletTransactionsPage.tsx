/**
 * WalletTransactionsPage - Full transaction history
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeftIcon,
  WalletIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowPathIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import { subscriptionService } from '../../services/subscription.service';
import type { WalletTransaction } from './billing.types';

type FilterType = 'ALL' | 'CREDIT' | 'DEBIT' | 'REFUND';

function TransactionIcon({ type }: { type: string }) {
  switch (type) {
    case 'CREDIT':
      return (
        <div className="p-2 rounded-full bg-green-100">
          <ArrowDownIcon className="w-4 h-4 text-green-600" />
        </div>
      );
    case 'DEBIT':
      return (
        <div className="p-2 rounded-full bg-red-100">
          <ArrowUpIcon className="w-4 h-4 text-red-600" />
        </div>
      );
    case 'REFUND':
      return (
        <div className="p-2 rounded-full bg-blue-100">
          <ArrowPathIcon className="w-4 h-4 text-blue-600" />
        </div>
      );
    default:
      return (
        <div className="p-2 rounded-full bg-slate-100">
          <WalletIcon className="w-4 h-4 text-slate-600" />
        </div>
      );
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatAmount(amount: number, type: string): string {
  const prefix = type === 'DEBIT' ? '-' : '+';
  const absAmount = Math.abs(amount);
  return `${prefix}₹${absAmount.toLocaleString('en-IN')}`;
}

export default function WalletTransactionsPage() {
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchTransactions();
  }, [filter, page]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const result = await subscriptionService.getWalletTransactions(
        page,
        20,
        filter === 'ALL' ? undefined : filter
      );
      setTransactions(result.transactions as WalletTransaction[]);
      setTotalPages(result.totalPages);
      setTotal(result.total);
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterOptions: { value: FilterType; label: string }[] = [
    { value: 'ALL', label: 'All Transactions' },
    { value: 'CREDIT', label: 'Credits Only' },
    { value: 'DEBIT', label: 'Debits Only' },
    { value: 'REFUND', label: 'Refunds Only' },
  ];

  const exportToCSV = async () => {
    try {
      // Fetch all transactions for export
      const result = await subscriptionService.getWalletTransactions(1, 1000, filter === 'ALL' ? undefined : filter);
      const allTransactions = result.transactions as WalletTransaction[];

      // Build CSV content
      const headers = ['Date', 'Type', 'Description', 'Amount', 'Balance After'];
      const rows = allTransactions.map((tx) => [
        new Date(tx.createdAt).toLocaleDateString('en-IN'),
        tx.type,
        `"${tx.description.replace(/"/g, '""')}"`,
        tx.amount.toString(),
        tx.balanceAfter.toString(),
      ]);

      const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

      // Download file
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `wallet-transactions-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting transactions:', err);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/settings/billing"
          className="inline-flex items-center text-sm text-slate-500 hover:text-slate-700 mb-2"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-1" />
          Back to Billing
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Transaction History</h1>
            <p className="text-sm text-slate-500 mt-1">
              {total} total transactions
            </p>
          </div>
          <button
            onClick={exportToCSV}
            disabled={transactions.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
        <div className="flex items-center gap-4">
          <FunnelIcon className="w-5 h-5 text-slate-400" />
          <div className="flex gap-2">
            {filterOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  setFilter(option.value);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === option.value
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-primary-600 rounded-full animate-spin mx-auto" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center">
            <WalletIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No transactions found</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <TransactionIcon type={tx.type} />
                  <div>
                    <p className="font-medium text-slate-900">{tx.description}</p>
                    <p className="text-sm text-slate-500">{formatDate(tx.createdAt)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`font-semibold ${
                      tx.type === 'DEBIT' ? 'text-red-600' : 'text-green-600'
                    }`}
                  >
                    {formatAmount(tx.amount, tx.type)}
                  </p>
                  <p className="text-sm text-slate-500">
                    Balance: ₹{tx.balanceAfter.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
