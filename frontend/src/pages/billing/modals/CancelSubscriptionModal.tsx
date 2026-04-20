/**
 * CancelSubscriptionModal - Cancel subscription with reason
 */
import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import {
  XMarkIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { subscriptionService, Subscription } from '../../../services/subscription.service';

interface CancelSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscription: Subscription | null;
  onSuccess: () => void;
}

const CANCEL_REASONS = [
  { value: 'too_expensive', label: 'Too expensive' },
  { value: 'not_using', label: 'Not using the features' },
  { value: 'switching_competitor', label: 'Switching to a competitor' },
  { value: 'missing_features', label: 'Missing features I need' },
  { value: 'temporary_pause', label: 'Temporary pause in business' },
  { value: 'other', label: 'Other reason' },
];

export function CancelSubscriptionModal({
  isOpen,
  onClose,
  subscription,
  onSuccess,
}: CancelSubscriptionModalProps) {
  const [selectedReason, setSelectedReason] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState('');

  const handleCancel = async () => {
    if (confirmText !== 'CANCEL') {
      setError('Please type CANCEL to confirm');
      return;
    }

    const reason = selectedReason === 'other' ? otherReason : selectedReason;
    if (!reason) {
      setError('Please select a reason');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await subscriptionService.cancelSubscription(reason);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to cancel subscription');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedReason('');
    setOtherReason('');
    setConfirmText('');
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!subscription) return null;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
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
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
                    </div>
                    <Dialog.Title className="text-lg font-semibold text-slate-900">
                      Cancel Subscription
                    </Dialog.Title>
                  </div>
                  <button
                    onClick={handleClose}
                    className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                {/* Content */}
                <div className="px-6 py-4 space-y-4">
                  {/* Warning */}
                  <div className="p-4 bg-red-50 border border-red-100 rounded-lg">
                    <p className="text-sm text-red-700">
                      Your subscription will remain active until{' '}
                      <span className="font-semibold">
                        {new Date(subscription.currentPeriodEnd).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </span>
                      . After that, you'll lose access to premium features.
                    </p>
                  </div>

                  {/* Reason selection */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Why are you cancelling?
                    </label>
                    <div className="space-y-2">
                      {CANCEL_REASONS.map((reason) => (
                        <label
                          key={reason.value}
                          className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedReason === reason.value
                              ? 'border-red-500 bg-red-50'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="cancelReason"
                            value={reason.value}
                            checked={selectedReason === reason.value}
                            onChange={(e) => setSelectedReason(e.target.value)}
                            className="w-4 h-4 text-red-600 border-slate-300 focus:ring-red-500"
                          />
                          <span className="ml-3 text-sm text-slate-700">{reason.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Other reason input */}
                  {selectedReason === 'other' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Please specify
                      </label>
                      <textarea
                        value={otherReason}
                        onChange={(e) => setOtherReason(e.target.value)}
                        placeholder="Tell us more..."
                        rows={3}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                  )}

                  {/* Confirmation */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Type <span className="font-mono text-red-600">CANCEL</span> to confirm
                    </label>
                    <input
                      type="text"
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                      placeholder="Type CANCEL"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>

                  {/* Error */}
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-600">{error}</p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
                  >
                    Keep Subscription
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={loading || confirmText !== 'CANCEL' || !selectedReason}
                    className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? 'Cancelling...' : 'Cancel Subscription'}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
