/**
 * PlanUpgradeModal - Compare plans + checkout
 */
import { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import {
  XMarkIcon,
  CheckIcon,
  SparklesIcon,
  RocketLaunchIcon,
  ArrowTrendingUpIcon,
  BuildingOfficeIcon,
  BuildingOffice2Icon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  TagIcon,
} from '@heroicons/react/24/outline';
import { subscriptionService, Subscription, Plan } from '../../../services/subscription.service';
import api from '../../../services/api';

interface PlanUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSubscription: Subscription | null;
  plans: Plan[];
  onSuccess: () => void;
}

type ModalState = 'select' | 'confirm' | 'processing' | 'success' | 'error';

const PLAN_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  free: SparklesIcon,
  starter: RocketLaunchIcon,
  growth: ArrowTrendingUpIcon,
  business: BuildingOfficeIcon,
  enterprise: BuildingOffice2Icon,
};

const PLAN_COLORS: Record<string, string> = {
  free: 'slate',
  starter: 'blue',
  growth: 'indigo',
  business: 'purple',
  enterprise: 'amber',
};

export function PlanUpgradeModal({ isOpen, onClose, currentSubscription, plans, onSuccess }: PlanUpgradeModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [modalState, setModalState] = useState<ModalState>('select');
  const [error, setError] = useState<string | null>(null);
  const [prorationData, setProrationData] = useState<{
    proratedCredit: number;
    newAmount: number;
    finalAmount: number;
  } | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoDiscountAmount, setPromoDiscountAmount] = useState(0);
  const [promoMessage, setPromoMessage] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);

  const currentPlanId = currentSubscription?.planId || 'free';

  // Filter plans to show only upgrades
  const availablePlans = plans.filter(plan => {
    const planOrder = ['free', 'starter', 'growth', 'business', 'enterprise'];
    const currentIndex = planOrder.indexOf(currentPlanId);
    const planIndex = planOrder.indexOf(plan.id);
    return planIndex > currentIndex;
  });

  useEffect(() => {
    if (availablePlans.length > 0 && !selectedPlan) {
      setSelectedPlan(availablePlans[0].id);
    }
  }, [availablePlans, selectedPlan]);

  const selectedPlanData = plans.find(p => p.id === selectedPlan);
  const planPrice = selectedPlanData
    ? billingCycle === 'annual'
      ? selectedPlanData.annualPrice
      : selectedPlanData.monthlyPrice
    : 0;

  const handleProceed = async () => {
    if (!selectedPlan) return;

    try {
      setModalState('processing');
      setError(null);

      // Get upgrade details
      const upgradeData = await subscriptionService.upgradePlan(selectedPlan, billingCycle);

      setProrationData({
        proratedCredit: upgradeData.proratedCredit,
        newAmount: upgradeData.newAmount,
        finalAmount: upgradeData.finalAmount,
      });

      // Open Razorpay checkout
      await subscriptionService.openCheckout(
        upgradeData.order,
        upgradeData.keyId,
        { name: '', email: '' },
        async (paymentResponse) => {
          try {
            await subscriptionService.verifyPayment(
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
      setError(err.response?.data?.message || 'Failed to process upgrade');
      setModalState('error');
    }
  };

  const resetModal = () => {
    setSelectedPlan(availablePlans.length > 0 ? availablePlans[0].id : null);
    setBillingCycle('annual');
    setModalState('select');
    setError(null);
    setProrationData(null);
    setPromoCode('');
    setPromoApplied(false);
    setPromoDiscount(0);
    setPromoDiscountAmount(0);
    setPromoMessage('');
  };

  const handleApplyPromoCode = async () => {
    if (!promoCode || !selectedPlan) return;

    try {
      setPromoLoading(true);
      const response = await api.post('/promo-codes/validate', {
        code: promoCode,
        planId: selectedPlan,
        amount: planPrice,
      });

      const data = response.data.data;
      if (data.valid) {
        setPromoApplied(true);
        setPromoDiscount(data.discountValue);
        setPromoDiscountAmount(data.discountAmount);
        setPromoMessage(data.message);
      } else {
        setPromoMessage(data.message);
        setPromoApplied(false);
      }
    } catch (err: any) {
      setPromoMessage(err.response?.data?.message || 'Failed to validate promo code');
      setPromoApplied(false);
    } finally {
      setPromoLoading(false);
    }
  };

  const handleRemovePromoCode = () => {
    setPromoCode('');
    setPromoApplied(false);
    setPromoDiscount(0);
    setPromoDiscountAmount(0);
    setPromoMessage('');
  };

  const handleClose = () => {
    if (modalState !== 'processing') {
      resetModal();
      onClose();
    }
  };

  const annualSavings = selectedPlanData
    ? Math.round(((selectedPlanData.monthlyPrice * 12 - selectedPlanData.annualPrice) / (selectedPlanData.monthlyPrice * 12)) * 100)
    : 0;

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
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                  <Dialog.Title className="text-lg font-semibold text-slate-900">
                    Upgrade Your Plan
                  </Dialog.Title>
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
                      {/* Billing cycle toggle */}
                      <div className="flex items-center justify-center gap-4 p-1 bg-slate-100 rounded-lg w-fit mx-auto">
                        <button
                          onClick={() => setBillingCycle('monthly')}
                          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            billingCycle === 'monthly'
                              ? 'bg-white text-slate-900 shadow-sm'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Monthly
                        </button>
                        <button
                          onClick={() => setBillingCycle('annual')}
                          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            billingCycle === 'annual'
                              ? 'bg-white text-slate-900 shadow-sm'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Annual
                          {annualSavings > 0 && (
                            <span className="ml-2 px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                              Save {annualSavings}%
                            </span>
                          )}
                        </button>
                      </div>

                      {/* Plans grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {availablePlans.map((plan) => {
                          const Icon = PLAN_ICONS[plan.id] || SparklesIcon;
                          const color = PLAN_COLORS[plan.id] || 'slate';
                          const price = billingCycle === 'annual' ? plan.annualPrice : plan.monthlyPrice;
                          const isSelected = selectedPlan === plan.id;

                          return (
                            <button
                              key={plan.id}
                              onClick={() => setSelectedPlan(plan.id)}
                              className={`p-4 rounded-lg border-2 text-left transition-all ${
                                isSelected
                                  ? `border-${color}-500 bg-${color}-50`
                                  : 'border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <div className="flex items-center gap-3 mb-3">
                                <div className={`p-2 rounded-lg bg-${color}-100`}>
                                  <Icon className={`w-5 h-5 text-${color}-600`} />
                                </div>
                                <div>
                                  <h4 className="font-semibold text-slate-900">{plan.name}</h4>
                                  <p className="text-lg font-bold text-slate-900">
                                    ₹{price.toLocaleString('en-IN')}
                                    <span className="text-sm font-normal text-slate-500">
                                      /{billingCycle === 'annual' ? 'year' : 'month'}
                                    </span>
                                  </p>
                                </div>
                                {isSelected && (
                                  <CheckCircleIcon className={`w-6 h-6 text-${color}-600 ml-auto`} />
                                )}
                              </div>
                              <div className="space-y-1 text-sm text-slate-600">
                                <div className="flex items-center gap-2">
                                  <CheckIcon className="w-4 h-4 text-green-500" />
                                  {plan.features.maxUsers === -1 ? 'Unlimited' : plan.features.maxUsers} Users
                                </div>
                                <div className="flex items-center gap-2">
                                  <CheckIcon className="w-4 h-4 text-green-500" />
                                  {plan.features.maxLeads === -1 ? 'Unlimited' : plan.features.maxLeads.toLocaleString()} Leads
                                </div>
                                <div className="flex items-center gap-2">
                                  <CheckIcon className="w-4 h-4 text-green-500" />
                                  {plan.features.aiCallsPerMonth === -1 ? 'Unlimited' : plan.features.aiCallsPerMonth.toLocaleString()} AI Calls/mo
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {availablePlans.length === 0 && (
                        <div className="text-center py-8">
                          <p className="text-slate-500">You're already on the highest plan!</p>
                        </div>
                      )}

                      {/* Promo Code */}
                      {availablePlans.length > 0 && (
                        <div className="border border-slate-200 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <TagIcon className="w-4 h-4 text-slate-500" />
                            <span className="text-sm font-medium text-slate-700">Have a promo code?</span>
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={promoCode}
                              onChange={(e) => {
                                setPromoCode(e.target.value.toUpperCase());
                                setPromoMessage('');
                              }}
                              placeholder="Enter code"
                              disabled={promoApplied || promoLoading}
                              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-slate-100"
                            />
                            {promoApplied ? (
                              <button
                                onClick={handleRemovePromoCode}
                                className="px-4 py-2 text-sm text-red-600 hover:text-red-700"
                              >
                                Remove
                              </button>
                            ) : (
                              <button
                                onClick={handleApplyPromoCode}
                                disabled={!promoCode || promoLoading}
                                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {promoLoading ? 'Checking...' : 'Apply'}
                              </button>
                            )}
                          </div>
                          {promoMessage && (
                            <p className={`mt-2 text-sm flex items-center gap-1 ${promoApplied ? 'text-green-600' : 'text-red-600'}`}>
                              {promoApplied ? <CheckCircleIcon className="w-4 h-4" /> : <ExclamationCircleIcon className="w-4 h-4" />}
                              {promoMessage}
                            </p>
                          )}
                        </div>
                      )}

                      {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                          <ExclamationCircleIcon className="w-5 h-5 flex-shrink-0" />
                          {error}
                        </div>
                      )}
                    </div>
                  )}

                  {modalState === 'processing' && (
                    <div className="py-12 text-center">
                      <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
                      <p className="text-slate-600">Processing upgrade...</p>
                      <p className="text-sm text-slate-500 mt-1">Please complete the payment in the popup</p>
                    </div>
                  )}

                  {modalState === 'success' && (
                    <div className="py-12 text-center">
                      <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
                      <p className="text-lg font-medium text-slate-900">Upgrade Successful!</p>
                      <p className="text-slate-600 mt-1">
                        You're now on the {selectedPlanData?.name} plan
                      </p>
                    </div>
                  )}

                  {modalState === 'error' && (
                    <div className="py-12 text-center">
                      <ExclamationCircleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
                      <p className="text-lg font-medium text-slate-900">Upgrade Failed</p>
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

                {/* Footer */}
                {modalState === 'select' && availablePlans.length > 0 && (
                  <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">Selected plan</p>
                      <div className="flex items-center gap-2">
                        {promoApplied && promoDiscountAmount > 0 ? (
                          <>
                            <p className="font-medium text-slate-900">
                              {selectedPlanData?.name} - ₹{(planPrice - promoDiscountAmount).toLocaleString('en-IN')}/{billingCycle === 'annual' ? 'year' : 'month'}
                            </p>
                            <span className="text-sm text-slate-400 line-through">
                              ₹{planPrice.toLocaleString('en-IN')}
                            </span>
                            <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                              -₹{promoDiscountAmount.toLocaleString('en-IN')}
                            </span>
                          </>
                        ) : (
                          <p className="font-medium text-slate-900">
                            {selectedPlanData?.name} - ₹{planPrice.toLocaleString('en-IN')}/{billingCycle === 'annual' ? 'year' : 'month'}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={handleProceed}
                      disabled={!selectedPlan}
                      className="px-6 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
                    >
                      Proceed to Payment
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
