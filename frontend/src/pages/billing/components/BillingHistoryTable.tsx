/**
 * BillingHistoryTable - Invoice list with download
 */
import {
  DocumentArrowDownIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import type { BillingHistoryItem } from '../billing.types';

interface BillingHistoryTableProps {
  history: BillingHistoryItem[];
  onDownloadInvoice: (subscriptionId: string) => void;
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { icon: React.ComponentType<{ className?: string }>; bg: string; text: string }> = {
    ACTIVE: { icon: CheckCircleIcon, bg: 'bg-green-100', text: 'text-green-700' },
    COMPLETED: { icon: CheckCircleIcon, bg: 'bg-green-100', text: 'text-green-700' },
    PENDING: { icon: ClockIcon, bg: 'bg-yellow-100', text: 'text-yellow-700' },
    CANCELLED: { icon: XCircleIcon, bg: 'bg-slate-100', text: 'text-slate-700' },
    FAILED: { icon: XCircleIcon, bg: 'bg-red-100', text: 'text-red-700' },
    PAST_DUE: { icon: ExclamationCircleIcon, bg: 'bg-red-100', text: 'text-red-700' },
    EXPIRED: { icon: ExclamationCircleIcon, bg: 'bg-amber-100', text: 'text-amber-700' },
  };

  const statusConfig = config[status] || config.PENDING;
  const Icon = statusConfig.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
      <Icon className="w-3 h-3" />
      {status}
    </span>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatCurrency(amount: number, currency: string = 'INR'): string {
  const symbol = currency === 'INR' ? '₹' : '$';
  return `${symbol}${amount.toLocaleString('en-IN')}`;
}

export function BillingHistoryTable({ history, onDownloadInvoice }: BillingHistoryTableProps) {
  if (history.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">Billing History</h3>
        </div>
        <div className="p-12 text-center">
          <DocumentArrowDownIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No billing history yet</p>
          <p className="text-sm text-slate-400 mt-1">Your invoices will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100">
        <h3 className="font-semibold text-slate-900">Billing History</h3>
        <p className="text-sm text-slate-500 mt-0.5">Your past invoices and payments</p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Plan
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Cycle
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                Invoice
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {history.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                  {formatDate(item.activatedAt || item.createdAt)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-medium text-slate-900">
                    {item.planName}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 capitalize">
                  {item.billingCycle}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                  {formatCurrency(item.amount, item.currency)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadge status={item.status} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  {['ACTIVE', 'COMPLETED', 'CANCELLED', 'EXPIRED'].includes(item.status) && (
                    <button
                      onClick={() => onDownloadInvoice(item.id)}
                      className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium"
                    >
                      <DocumentArrowDownIcon className="w-4 h-4" />
                      Download
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
