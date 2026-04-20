/**
 * AddUsersModal - Add users with proration
 */
import { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import {
  XMarkIcon,
  UserPlusIcon,
  MinusIcon,
  PlusIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { subscriptionService, Subscription } from '../../../services/subscription.service';

interface AddUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSubscription: Subscription | null;
  onSuccess: () => void;
}

type ModalState = 'select' | 'processing' | 'success' | 'error';

export function AddUsersModal({ isOpen, onClose, currentSubscription, onSuccess }: AddUsersModalProps) {
  const [additionalUsers, setAdditionalUsers] = useState(1);
  const [modalState, setModalState] = useState<ModalState>('select');
  const [error, setError] = useState<string | null>(null);

  const currentUserCount = currentSubscription?.userCount || 1;
  const maxUsers = currentSubscription?.plan?.features?.maxUsers || 10;
  const isUnlimitedUsers = maxUsers === -1;
  const remainingSlots = isUnlimitedUsers ? 999 : Math.max(0, maxUsers - currentUserCount);

  // Calculate price per user based on billing cycle
  const pricePerUser = currentSubscription?.plan
    ? currentSubscription.billingCycle === 'annual'
      ? currentSubscription.plan.annualPrice / 12
      : currentSubscription.plan.monthlyPrice
    : 0;

  const totalAmount = pricePerUser * additionalUsers;

  const handleIncrement = () => {
    if (isUnlimitedUsers || additionalUsers < remainingSlots) {
      setAdditionalUsers(prev => prev + 1);
    }
  };

  const handleDecrement = () => {
    if (additionalUsers > 1) {
      setAdditionalUsers(prev => prev - 1);
    }
  };

  const handleAddUsers = async () => {
    try {
      setModalState('processing');
      setError(null);

      // Get add users order
      const result = await subscriptionService.addUsers(additionalUsers);

      // Open Razorpay checkout
      await subscriptionService.openCheckout(
        result.order,
        result.keyId,
        { name: '', email: '' },
        async (paymentResponse) => {
          try {
            await subscriptionService.verifyAddOnPayment(
              paymentResponse.razorpay_order_id,
              paymentResponse.razorpay_payment_id,
              paymentResponse.razorpay_signature
            );
            setModalState('success');
            setTimeout(() => {
              onSuccess();
              resetModal();
            }, 2000);
          } catch (err: any) {
            setError(err.response?.data?.message || 'Payment verification failed');
            setModalState('error');
          }
        },
        (err) => {
          setError(err.message || 'Payment failed');
          setModalState('error');
        }
      );
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to process request');
      setModalState('error');
    }
  };

  const resetModal = () => {
    setAdditionalUsers(1);
    setModalState('select');
    setError(null);
  };

  const handleClose = () => {
    if (modalState !== 'processing') {
      resetModal();
      onClose();
    }
  };

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
                    <div className="p-2 rounded-lg bg-green-100">
                      <UserPlusIcon className="w-6 h-6 text-green-600" />
                    </div>
                    <Dialog.Title className="text-lg font-semibold text-slate-900">
                      Add Users
                    </Dialog.Title>
                  </div>
                  <button
                    onClick={handleClose}
                    className="p-1 rounded-lg hover:bg-slate-100 transition-colors"
                    disabled={modalState === 'processing'}
                  >
                    <XMarkIcon className="w-5 h-5 text-slate-500" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-6">
                  {modalState === 'select' && (
                    <div className="space-y-6">
                      {/* Current users */}
                      <div className="bg-slate-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-slate-600">Current users</span>
                          <span className="font-medium text-slate-900">{currentUserCount}</span>
                        </div>
                        {!isUnlimitedUsers && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600">Plan limit</span>
                            <span className="font-medium text-slate-900">{maxUsers}</span>
                          </div>
                        )}
                      </div>

                      {/* User selector */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-3">
                          How many users to add?
                        </label>
                        <div className="flex items-center justify-center gap-4">
                          <button
                            onClick={handleDecrement}
                            disabled={additionalUsers <= 1}
                            className="p-3 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <MinusIcon className="w-5 h-5 text-slate-600" />
                          </button>
                          <div className="w-24 text-center">
                            <span className="text-4xl font-bold text-slate-900">{additionalUsers}</span>
                            <p className="text-sm text-slate-500">user{additionalUsers > 1 ? 's' : ''}</p>
                          </div>
                          <button
                            onClick={handleIncrement}
                            disabled={!isUnlimitedUsers && additionalUsers >= remainingSlots}
                            className="p-3 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <PlusIcon className="w-5 h-5 text-slate-600" />
                          </button>
                        </div>
                        {!isUnlimitedUsers && remainingSlots < 10 && (
                          <p className="text-sm text-slate-500 text-center mt-2">
                            {remainingSlots} slot{remainingSlots !== 1 ? 's' : ''} remaining in plan
                          </p>
                        )}
                      </div>

                      {/* Pricing breakdown */}
                      <div className="border-t border-slate-100 pt-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-slate-600">Price per user</span>
                          <span className="text-sm text-slate-900">
                            ₹{pricePerUser.toLocaleString('en-IN')}/month
                          </span>
                        </div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-slate-600">Users to add</span>
                          <span className="text-sm text-slate-900">x {additionalUsers}</span>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                          <span className="font-medium text-slate-900">Total (prorated)</span>
                          <span className="text-lg font-bold text-slate-900">
                            ₹{totalAmount.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Prorated for remaining billing period
                        </p>
                      </div>

                      {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                          <ExclamationCircleIcon className="w-5 h-5 flex-shrink-0" />
                          {error}
                        </div>
                      )}

                      {/* Action */}
                      <button
                        onClick={handleAddUsers}
                        disabled={additionalUsers < 1 || (!isUnlimitedUsers && additionalUsers > remainingSlots)}
                        className="w-full py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
                      >
                        Add {additionalUsers} User{additionalUsers > 1 ? 's' : ''} - ₹{totalAmount.toLocaleString('en-IN')}
                      </button>
                    </div>
                  )}

                  {modalState === 'processing' && (
                    <div className="py-12 text-center">
                      <div className="w-16 h-16 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4" />
                      <p className="text-slate-600">Processing payment...</p>
                      <p className="text-sm text-slate-500 mt-1">Please complete the payment in the popup</p>
                    </div>
                  )}

                  {modalState === 'success' && (
                    <div className="py-12 text-center">
                      <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
                      <p className="text-lg font-medium text-slate-900">Users Added!</p>
                      <p className="text-slate-600 mt-1">
                        {additionalUsers} user{additionalUsers > 1 ? 's have' : ' has'} been added to your subscription
                      </p>
                    </div>
                  )}

                  {modalState === 'error' && (
                    <div className="py-12 text-center">
                      <ExclamationCircleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
                      <p className="text-lg font-medium text-slate-900">Failed to Add Users</p>
                      <p className="text-slate-600 mt-1">{error}</p>
                      <button
                        onClick={() => setModalState('select')}
                        className="mt-4 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                      >
                        Try Again
                      </button>
                    </div>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
