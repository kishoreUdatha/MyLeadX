/**
 * WalletBalanceCard - Display wallet balance and recent transactions
 */
import {
  WalletIcon,
  PlusIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import type { WalletBalance, WalletTransaction } from '../billing.types';

interface WalletBalanceCardProps {
  balance: WalletBalance | null;
  recentTransactions: WalletTransaction[];
  onTopUpClick: () => void;
}

function TransactionIcon({ type }: { type: string }) {
  switch (type) {
    case 'CREDIT':
      return <ArrowDownIcon className="w-4 h-4 text-green-600" />;
    case 'DEBIT':
      return <ArrowUpIcon className="w-4 h-4 text-red-600" />;
    case 'REFUND':
      return <ArrowPathIcon className="w-4 h-4 text-blue-600" />;
    default:
      return <WalletIcon className="w-4 h-4 text-slate-400" />;
  }
}

function formatAmount(amount: number, type: string): string {
  const prefix = type === 'DEBIT' ? '-' : '+';
  const absAmount = Math.abs(amount);
  return `${prefix}${absAmount.toLocaleString('en-IN')}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
}

const LOW_BALANCE_THRESHOLD = 500; // INR

export function WalletBalanceCard({ balance, recentTransactions, onTopUpClick }: WalletBalanceCardProps) {
  const walletAmount = balance?.balance || 0;
  const currency = balance?.currency || 'INR';
  const isLowBalance = walletAmount < LOW_BALANCE_THRESHOLD;

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden h-full">
      {/* Low Balance Warning */}
      {isLowBalance && (
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
          <ExclamationTriangleIcon className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span className="text-xs text-amber-700">
            Low balance! Top up to avoid service interruption.
          </span>
        </div>
      )}

      {/* Header */}
      <div className={`px-4 py-3 bg-gradient-to-br ${isLowBalance ? 'from-amber-500 to-orange-600' : 'from-indigo-500 to-purple-600'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <WalletIcon className="w-5 h-5 text-white/80" />
            <span className="text-sm font-medium text-white/80">Wallet Balance</span>
          </div>
        </div>
        <div className="mt-2">
          <span className="text-3xl font-bold text-white">
            {currency === 'INR' ? '₹' : '$'}{walletAmount.toLocaleString('en-IN')}
          </span>
        </div>
        <button
          onClick={onTopUpClick}
          className={`mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-white rounded-lg hover:bg-opacity-90 transition-colors text-sm font-medium ${isLowBalance ? 'text-amber-600' : 'text-indigo-600'}`}
        >
          <PlusIcon className="w-4 h-4" />
          {isLowBalance ? 'Top Up Now' : 'Top Up Wallet'}
        </button>
      </div>

      {/* Recent Transactions */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-slate-700">Recent Transactions</span>
          <Link
            to="/settings/billing/transactions"
            className="text-xs text-primary-600 hover:text-primary-700"
          >
            View all
          </Link>
        </div>

        {recentTransactions.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">No recent transactions</p>
        ) : (
          <div className="space-y-2">
            {recentTransactions.slice(0, 3).map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-full bg-slate-100">
                    <TransactionIcon type={tx.type} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700 line-clamp-1">
                      {tx.description}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatDate(tx.createdAt)}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-sm font-medium ${
                    tx.type === 'DEBIT' ? 'text-red-600' : 'text-green-600'
                  }`}
                >
                  {formatAmount(tx.amount, tx.type)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
