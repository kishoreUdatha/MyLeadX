/**
 * WalletTopUpModal - Amount selection + payment
 */
import { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import {
  XMarkIcon,
  WalletIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { subscriptionService } from '../../../services/subscription.service';
import api from '../../../services/api';

interface WalletTopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  presets: number[];
  onSuccess: () => void;
}

type ModalState = 'select' | 'processing' | 'success' | 'error';

export function WalletTopUpModal({ isOpen, onClose, presets, onSuccess }: WalletTopUpModalProps) {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [modalState, setModalState] = useState<ModalState>('select');
  const [error, setError] = useState<string | null>(null);

  const getAmount = (): number => {
    if (selectedAmount) return selectedAmount;
    if (customAmount) return parseInt(customAmount);
    return 0;
  };

  const handlePresetClick = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    setSelectedAmount(null);
  };

  const handleTopUp = async () => {
    const amount = getAmount();
    if (amount < 100 || amount > 100000) {
      setError('Amount must be between ₹100 and ₹1,00,000');
      return;
    }

    try {
      setModalState('processing');
      setError(null);

      // Create top-up order
      const response = await api.post('/wallet/topup', { amount });
      const { orderId, keyId } = response.data.data;

      // Open Razorpay checkout
      await subscriptionService.openCheckout(
        {
          id: orderId,
          amount: amount * 100,
          currency: 'INR',
          receipt: `topup_${Date.now()}`,
        },
        keyId,
        {
          name: '', // Will be filled by Razorpay
          email: '',
        },
        async (paymentResponse) => {
          // Verify payment
          try {
            await api.post('/wallet/topup/verify', {
              razorpayOrderId: paymentResponse.razorpay_order_id,
              razorpayPaymentId: paymentResponse.razorpay_payment_id,
              razorpaySignature: paymentResponse.razorpay_signature,
            });
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
      setError(err.response?.data?.message || 'Failed to create top-up order');
      setModalState('error');
    }
  };

  const resetModal = () => {
    setSelectedAmount(null);
    setCustomAmount('');
    setModalState('select');
    setError(null);
  };

  const handleClose = () => {
    if (modalState !== 'processing') {
      resetModal();
      onClose();
    }
  };

  const amount = getAmount();
  const isValidAmount = amount >= 100 && amount <= 100000;

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
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-indigo-100">
                      <WalletIcon className="w-6 h-6 text-indigo-600" />
                    </div>
                    <Dialog.Title className="text-lg font-semibold text-slate-900">
                      Top Up Wallet
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
                {modalState === 'select' && (
                  <div className="space-y-6">
                    {/* Preset amounts */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-3">
                        Select Amount
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {presets.map((preset) => (
                          <button
                            key={preset}
                            onClick={() => handlePresetClick(preset)}
                            className={`py-3 px-4 rounded-lg border-2 font-medium transition-all ${
                              selectedAmount === preset
                                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                : 'border-slate-200 hover:border-slate-300 text-slate-700'
                            }`}
                          >
                            ₹{preset.toLocaleString('en-IN')}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Custom amount */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Or Enter Custom Amount
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">₹</span>
                        <input
                          type="number"
                          min="100"
                          max="100000"
                          placeholder="Enter amount"
                          value={customAmount}
                          onChange={(e) => handleCustomAmountChange(e.target.value)}
                          className={`w-full pl-8 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                            customAmount ? 'border-indigo-300' : 'border-slate-300'
                          }`}
                        />
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Min ₹100 - Max ₹1,00,000</p>
                    </div>

                    {error && (
                      <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                        <ExclamationCircleIcon className="w-5 h-5 flex-shrink-0" />
                        {error}
                      </div>
                    )}

                    {/* Action */}
                    <button
                      onClick={handleTopUp}
                      disabled={!isValidAmount}
                      className={`w-full py-3 rounded-lg font-medium transition-colors ${
                        isValidAmount
                          ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {isValidAmount ? `Pay ₹${amount.toLocaleString('en-IN')}` : 'Select an amount'}
                    </button>
                  </div>
                )}

                {modalState === 'processing' && (
                  <div className="py-8 text-center">
                    <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-600">Processing payment...</p>
                    <p className="text-sm text-slate-500 mt-1">Please complete the payment in the popup</p>
                  </div>
                )}

                {modalState === 'success' && (
                  <div className="py-8 text-center">
                    <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <p className="text-lg font-medium text-slate-900">Payment Successful!</p>
                    <p className="text-slate-600 mt-1">₹{amount.toLocaleString('en-IN')} added to your wallet</p>
                  </div>
                )}

                {modalState === 'error' && (
                  <div className="py-8 text-center">
                    <ExclamationCircleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <p className="text-lg font-medium text-slate-900">Payment Failed</p>
                    <p className="text-slate-600 mt-1">{error}</p>
                    <button
                      onClick={() => setModalState('select')}
                      className="mt-4 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                    >
                      Try Again
                    </button>
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
