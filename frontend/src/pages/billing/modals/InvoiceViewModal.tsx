/**
 * InvoiceViewModal - View and print invoice
 */
import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import {
  XMarkIcon,
  PrinterIcon,
  DocumentArrowDownIcon,
} from '@heroicons/react/24/outline';
import type { Invoice } from '../billing.types';

interface InvoiceViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatCurrency(amount: number, currency: string = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function InvoiceViewModal({ isOpen, onClose, invoice }: InvoiceViewModalProps) {
  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 print:hidden">
                  <Dialog.Title className="text-lg font-semibold text-slate-900">
                    Invoice {invoice.invoiceNumber}
                  </Dialog.Title>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handlePrint}
                      className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Print Invoice"
                    >
                      <PrinterIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={onClose}
                      className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Invoice Content */}
                <div className="p-8" id="invoice-content">
                  {/* Company Header */}
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <h1 className="text-2xl font-bold text-slate-900">MyLeadX</h1>
                      <p className="text-sm text-slate-500 mt-1">AI-Powered CRM Platform</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-slate-900">INVOICE</div>
                      <div className="text-sm text-slate-500 mt-1">#{invoice.invoiceNumber}</div>
                    </div>
                  </div>

                  {/* Billing Details */}
                  <div className="grid grid-cols-2 gap-8 mb-8">
                    <div>
                      <h3 className="text-sm font-medium text-slate-500 uppercase mb-2">Bill To</h3>
                      <p className="font-medium text-slate-900">{(invoice as any).organization?.name || 'Customer'}</p>
                      {(invoice as any).organization?.email && (
                        <p className="text-sm text-slate-600">{(invoice as any).organization.email}</p>
                      )}
                      {(invoice as any).organization?.gstin && (
                        <p className="text-sm text-slate-600">GSTIN: {(invoice as any).organization.gstin}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="mb-2">
                        <span className="text-sm text-slate-500">Invoice Date:</span>
                        <span className="ml-2 font-medium">{formatDate(invoice.date)}</span>
                      </div>
                      <div>
                        <span className="text-sm text-slate-500">Status:</span>
                        <span className={`ml-2 px-2 py-0.5 rounded text-sm font-medium ${
                          invoice.status === 'ACTIVE' || invoice.status === 'PAID'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {invoice.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Line Items */}
                  <table className="w-full mb-8">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 text-sm font-medium text-slate-500">Description</th>
                        <th className="text-center py-3 text-sm font-medium text-slate-500">Qty</th>
                        <th className="text-right py-3 text-sm font-medium text-slate-500">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-100">
                        <td className="py-4">
                          <div className="font-medium text-slate-900">{invoice.plan} Plan</div>
                          <div className="text-sm text-slate-500 capitalize">{invoice.billingCycle} subscription</div>
                        </td>
                        <td className="py-4 text-center text-slate-600">{invoice.userCount} users</td>
                        <td className="py-4 text-right font-medium text-slate-900">
                          {formatCurrency(invoice.subtotal, invoice.currency)}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Totals */}
                  <div className="border-t border-slate-200 pt-4">
                    <div className="flex justify-end">
                      <div className="w-64 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Subtotal</span>
                          <span className="font-medium">{formatCurrency(invoice.subtotal, invoice.currency)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">GST (18%)</span>
                          <span className="font-medium">{formatCurrency(invoice.gst, invoice.currency)}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-slate-200">
                          <span className="font-semibold text-slate-900">Total</span>
                          <span className="font-bold text-lg text-slate-900">
                            {formatCurrency(invoice.total, invoice.currency)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment Info */}
                  {invoice.paymentId && (
                    <div className="mt-8 p-4 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-2 text-green-700">
                        <DocumentArrowDownIcon className="w-5 h-5" />
                        <span className="font-medium">Payment Received</span>
                      </div>
                      <p className="text-sm text-green-600 mt-1">
                        Payment ID: {invoice.paymentId}
                      </p>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="mt-8 pt-8 border-t border-slate-200 text-center text-sm text-slate-500">
                    <p>Thank you for your business!</p>
                    <p className="mt-1">For questions about this invoice, contact support@myleadx.com</p>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
