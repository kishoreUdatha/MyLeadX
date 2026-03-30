import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import subscriptionService, { Plan } from '../../services/subscription.service';
import {
  CheckIcon,
  MinusIcon,
  PlusIcon,
  ShieldCheckIcon,
  CreditCardIcon,
} from '@heroicons/react/24/outline';

export default function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);

  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [userCount, setUserCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const planId = searchParams.get('plan') || 'growth';
  const billing = searchParams.get('billing') as 'monthly' | 'annual' || 'annual';

  useEffect(() => {
    loadPlans();
  }, []);

  useEffect(() => {
    if (plans.length > 0) {
      const plan = plans.find((p) => p.id === planId);
      if (plan) {
        setSelectedPlan(plan);
        setBillingCycle(billing);

        // Set minimum users based on plan
        const minUsers = plan.id === 'free' ? 1 :
                        plan.id === 'starter' ? 1 :
                        plan.id === 'growth' ? 3 :
                        plan.id === 'business' ? 5 : 10;
        setUserCount(minUsers);
      }
    }
  }, [plans, planId, billing]);

  const loadPlans = async () => {
    try {
      const data = await subscriptionService.getPlans();
      setPlans(data.plans);
    } catch (err) {
      setError('Failed to load plans');
    }
  };

  const calculateTotal = () => {
    if (!selectedPlan) return 0;

    const pricePerUser = billingCycle === 'annual'
      ? selectedPlan.annualPrice / 12
      : selectedPlan.monthlyPrice;

    return pricePerUser * userCount;
  };

  const calculateAnnualTotal = () => {
    if (!selectedPlan) return 0;

    const monthlyTotal = calculateTotal();
    return billingCycle === 'annual' ? monthlyTotal * 12 : monthlyTotal;
  };

  const calculateSavings = () => {
    if (!selectedPlan || billingCycle !== 'annual') return 0;

    const monthlyPrice = selectedPlan.monthlyPrice * userCount * 12;
    const annualPrice = selectedPlan.annualPrice * userCount;
    return monthlyPrice - annualPrice;
  };

  const handleCheckout = async () => {
    if (!selectedPlan) return;

    setLoading(true);
    setError('');

    try {
      const { razorpayOrder, keyId } = await subscriptionService.createSubscription(
        selectedPlan.id,
        billingCycle,
        userCount
      );

      await subscriptionService.openCheckout(
        razorpayOrder,
        keyId,
        {
          name: `${user?.firstName} ${user?.lastName}`,
          email: user?.email || '',
          contact: user?.phone,
        },
        async (response) => {
          try {
            await subscriptionService.verifyPayment(
              response.razorpay_order_id,
              response.razorpay_payment_id,
              response.razorpay_signature
            );
            navigate('/subscription/success');
          } catch (err) {
            setError('Payment verification failed. Please contact support.');
          }
        },
        (error) => {
          setError(error.message || 'Payment failed');
        }
      );
    } catch (err: any) {
      setError(err.message || 'Failed to initiate checkout');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getMinUsers = () => {
    if (!selectedPlan) return 1;
    return selectedPlan.id === 'free' ? 1 :
           selectedPlan.id === 'starter' ? 1 :
           selectedPlan.id === 'growth' ? 3 :
           selectedPlan.id === 'business' ? 5 : 10;
  };

  const getMaxUsers = () => {
    if (!selectedPlan) return 100;
    return selectedPlan.features.maxUsers === -1 ? 1000 : selectedPlan.features.maxUsers;
  };

  if (!selectedPlan) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Complete Your Purchase</h1>
          <p className="text-slate-600 mt-2">You're subscribing to the {selectedPlan.name} plan</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
            {error}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Plan Configuration */}
          <div className="lg:col-span-2 space-y-6">
            {/* Plan Selection */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Selected Plan</h2>

              <div className="grid sm:grid-cols-2 gap-4">
                {plans.filter(p => p.id !== 'enterprise' && p.id !== 'free').map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => {
                      setSelectedPlan(plan);
                      const minUsers = plan.id === 'starter' ? 1 :
                                      plan.id === 'growth' ? 3 :
                                      plan.id === 'business' ? 5 : 10;
                      if (userCount < minUsers) setUserCount(minUsers);
                    }}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      selectedPlan.id === plan.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-slate-900">{plan.name}</h3>
                        <p className="text-sm text-slate-500 mt-1">
                          {formatCurrency(billingCycle === 'annual' ? plan.annualPrice / 12 : plan.monthlyPrice)}/user/month
                        </p>
                      </div>
                      {selectedPlan.id === plan.id && (
                        <CheckIcon className="w-5 h-5 text-primary-500" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Billing Cycle */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Billing Cycle</h2>

              <div className="grid sm:grid-cols-2 gap-4">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    billingCycle === 'monthly'
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-slate-900">Monthly</h3>
                      <p className="text-sm text-slate-500">Pay month-to-month</p>
                    </div>
                    {billingCycle === 'monthly' && (
                      <CheckIcon className="w-5 h-5 text-primary-500" />
                    )}
                  </div>
                </button>

                <button
                  onClick={() => setBillingCycle('annual')}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    billingCycle === 'annual'
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        Annual
                        <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                          Save 20%
                        </span>
                      </h3>
                      <p className="text-sm text-slate-500">Billed annually</p>
                    </div>
                    {billingCycle === 'annual' && (
                      <CheckIcon className="w-5 h-5 text-primary-500" />
                    )}
                  </div>
                </button>
              </div>
            </div>

            {/* User Count */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Number of Users</h2>

              <div className="flex items-center gap-4">
                <button
                  onClick={() => setUserCount(Math.max(getMinUsers(), userCount - 1))}
                  disabled={userCount <= getMinUsers()}
                  className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
                >
                  <MinusIcon className="w-5 h-5" />
                </button>

                <input
                  type="number"
                  value={userCount}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || getMinUsers();
                    setUserCount(Math.max(getMinUsers(), Math.min(getMaxUsers(), value)));
                  }}
                  min={getMinUsers()}
                  max={getMaxUsers()}
                  className="w-24 text-center text-2xl font-bold border border-slate-200 rounded-lg py-2"
                />

                <button
                  onClick={() => setUserCount(Math.min(getMaxUsers(), userCount + 1))}
                  disabled={userCount >= getMaxUsers()}
                  className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
                >
                  <PlusIcon className="w-5 h-5" />
                </button>
              </div>

              <p className="text-sm text-slate-500 mt-2">
                Minimum {getMinUsers()} users for {selectedPlan.name} plan
              </p>
            </div>

            {/* Features */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">What's Included</h2>

              <div className="grid sm:grid-cols-2 gap-3">
                <Feature text={`Up to ${selectedPlan.features.maxLeads === -1 ? 'Unlimited' : selectedPlan.features.maxLeads.toLocaleString()} leads`} />
                <Feature text={`${selectedPlan.features.maxForms === -1 ? 'Unlimited' : selectedPlan.features.maxForms} forms`} />
                <Feature text={`${selectedPlan.features.aiCallsPerMonth === -1 ? 'Unlimited' : selectedPlan.features.aiCallsPerMonth} AI calls/month`} available={selectedPlan.features.aiCallsPerMonth > 0} />
                <Feature text={`${selectedPlan.features.voiceAgents === -1 ? 'Unlimited' : selectedPlan.features.voiceAgents} Voice AI agent${selectedPlan.features.voiceAgents !== 1 ? 's' : ''}`} available={selectedPlan.features.voiceAgents > 0} />
                <Feature text={`${selectedPlan.features.smsPerMonth === -1 ? 'Unlimited' : selectedPlan.features.smsPerMonth.toLocaleString()} SMS/month`} available={selectedPlan.features.smsPerMonth > 0} />
                <Feature text="WhatsApp Campaigns" available={selectedPlan.features.hasWhatsApp} />
                <Feature text="Telecaller Queue" available={selectedPlan.features.hasTelecallerQueue} />
                <Feature text="Social Media Ads" available={selectedPlan.features.hasSocialMediaAds} />
                <Feature text="Lead Scoring" available={selectedPlan.features.hasLeadScoring} />
                <Feature text="API Access" available={selectedPlan.features.hasApiAccess} />
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Order Summary</h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">{selectedPlan.name} Plan</span>
                  <span className="text-slate-900">
                    {formatCurrency(billingCycle === 'annual' ? selectedPlan.annualPrice / 12 : selectedPlan.monthlyPrice)}/user
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-600">Users</span>
                  <span className="text-slate-900">× {userCount}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-600">Billing</span>
                  <span className="text-slate-900 capitalize">{billingCycle}</span>
                </div>

                {billingCycle === 'annual' && calculateSavings() > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Annual Savings</span>
                    <span>-{formatCurrency(calculateSavings())}</span>
                  </div>
                )}

                <hr className="my-4" />

                <div className="flex justify-between text-base">
                  <span className="text-slate-600">Monthly Total</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(calculateTotal())}</span>
                </div>

                <div className="flex justify-between text-lg font-bold">
                  <span className="text-slate-900">
                    {billingCycle === 'annual' ? 'Annual' : 'Monthly'} Total
                  </span>
                  <span className="text-primary-600">
                    {formatCurrency(calculateAnnualTotal())}
                  </span>
                </div>

                <p className="text-xs text-slate-500 mt-2">
                  + 18% GST applicable
                </p>
              </div>

              <button
                onClick={handleCheckout}
                disabled={loading}
                className="w-full mt-6 btn btn-primary py-3 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCardIcon className="w-5 h-5" />
                    Pay {formatCurrency(calculateAnnualTotal())}
                  </>
                )}
              </button>

              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-500">
                <ShieldCheckIcon className="w-4 h-4" />
                <span>Secure payment via Razorpay</span>
              </div>

              <div className="mt-4 text-center">
                <p className="text-xs text-slate-500">
                  14-day free trial • Cancel anytime • 30-day money-back guarantee
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Feature({ text, available = true }: { text: string; available?: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${available ? 'text-slate-700' : 'text-slate-400'}`}>
      {available ? (
        <CheckIcon className="w-5 h-5 text-green-500" />
      ) : (
        <span className="w-5 h-5 text-slate-300">—</span>
      )}
      <span className="text-sm">{text}</span>
    </div>
  );
}
