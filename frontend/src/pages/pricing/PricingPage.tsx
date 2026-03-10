import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import {
  CheckIcon,
  XMarkIcon,
  PhoneIcon,
  ArrowLeftIcon,
  SparklesIcon,
  UserGroupIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/solid';

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    subtitle: 'For small teams',
    monthlyPrice: 1999,
    annualPrice: 1599,
    popular: false,
    icon: SparklesIcon,
    color: 'from-blue-500 to-blue-600',
    lightColor: 'bg-blue-50',
    textColor: 'text-blue-600',
    metrics: {
      minutes: '100',
      numbers: '1',
      agents: '5',
      users: '5',
      leads: '1,000',
    },
    features: [
      'Full CRM Features',
      'Call Recording & Summary',
      'Multilingual (5 languages)',
      'WhatsApp & Email',
      'Email Support',
    ],
    extraRate: 8,
  },
  {
    id: 'pro',
    name: 'Pro',
    subtitle: 'For growing teams',
    monthlyPrice: 6999,
    annualPrice: 5599,
    popular: true,
    icon: ChartBarIcon,
    color: 'from-primary-500 to-primary-600',
    lightColor: 'bg-primary-50',
    textColor: 'text-primary-600',
    metrics: {
      minutes: '500',
      numbers: '3',
      agents: '15',
      users: '15',
      leads: '5,000',
    },
    features: [
      'Everything in Starter',
      'IVR Builder & Call Queues',
      'Advanced Analytics',
      'API Access & Webhooks',
      'Priority Support',
    ],
    extraRate: 6,
  },
  {
    id: 'business',
    name: 'Business',
    subtitle: 'For scaling teams',
    monthlyPrice: 14999,
    annualPrice: 11999,
    popular: false,
    icon: UserGroupIcon,
    color: 'from-purple-500 to-purple-600',
    lightColor: 'bg-purple-50',
    textColor: 'text-purple-600',
    metrics: {
      minutes: '2,000',
      numbers: '10',
      agents: '50',
      users: '50',
      leads: '25,000',
    },
    features: [
      'Everything in Pro',
      'Call Transfer & Routing',
      'White Label Option',
      'Voicemail System',
      'Dedicated Manager',
    ],
    extraRate: 5,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    subtitle: 'Custom solution',
    monthlyPrice: 0,
    annualPrice: 0,
    popular: false,
    customPricing: true,
    icon: ShieldCheckIcon,
    color: 'from-slate-700 to-slate-800',
    lightColor: 'bg-slate-100',
    textColor: 'text-slate-700',
    metrics: {
      minutes: '10,000+',
      numbers: 'Unlimited',
      agents: 'Unlimited',
      users: 'Unlimited',
      leads: 'Unlimited',
    },
    features: [
      'Everything in Business',
      'Custom Integrations',
      'Call Monitoring',
      '99.9% SLA Guarantee',
      'Account Manager',
    ],
    extraRate: 4,
  },
];

interface SimplePlanFeature {
  name: string;
  starter: boolean | string;
  pro: boolean | string;
  business: boolean | string;
  enterprise: boolean | string;
}

const featureComparison: SimplePlanFeature[] = [
  // Usage Limits
  { name: 'Voice Minutes/month', starter: '100', pro: '500', business: '2,000', enterprise: '10,000+' },
  { name: 'Extra Minute Rate', starter: '₹8', pro: '₹6', business: '₹5', enterprise: '₹4' },
  { name: 'Phone Numbers', starter: '1', pro: '3', business: '10', enterprise: 'Unlimited' },
  { name: 'AI Voice Agents', starter: '5', pro: '15', business: '50', enterprise: 'Unlimited' },
  { name: 'Concurrent Calls', starter: '1', pro: '5', business: '25', enterprise: 'Unlimited' },
  { name: 'Users', starter: '5', pro: '15', business: '50', enterprise: 'Unlimited' },
  { name: 'Leads Capacity', starter: '1,000', pro: '5,000', business: '25,000', enterprise: 'Unlimited' },
  // Voice Features
  { name: 'Call Recording & Summary', starter: true, pro: true, business: true, enterprise: true },
  { name: 'Multilingual TTS', starter: true, pro: true, business: true, enterprise: true },
  { name: 'IVR Builder', starter: false, pro: true, business: true, enterprise: true },
  { name: 'Call Queues', starter: false, pro: true, business: true, enterprise: true },
  { name: 'Voicemail System', starter: false, pro: false, business: true, enterprise: true },
  { name: 'Call Transfer & Routing', starter: false, pro: false, business: true, enterprise: true },
  { name: 'Call Monitoring', starter: false, pro: false, business: false, enterprise: true },
  // Integration Features
  { name: 'API Access', starter: false, pro: true, business: true, enterprise: true },
  { name: 'Webhooks', starter: false, pro: true, business: true, enterprise: true },
  { name: 'Advanced Analytics', starter: false, pro: true, business: true, enterprise: true },
  { name: 'White Labeling', starter: false, pro: false, business: true, enterprise: true },
  { name: 'Custom Integrations', starter: false, pro: false, business: false, enterprise: true },
  // Support
  { name: 'Support Level', starter: 'Email', pro: 'Priority', business: 'Dedicated', enterprise: 'Account Manager' },
  { name: 'SLA Guarantee', starter: '-', pro: '99%', business: '99.5%', enterprise: '99.9%' },
];

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(true);
  const [showComparison, setShowComparison] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  const handleSelectPlan = (planId: string) => {
    if (planId === 'enterprise') {
      window.location.href = 'mailto:sales@voicecrm.com?subject=Enterprise Plan Inquiry';
      return;
    }
    if (isAuthenticated) {
      navigate(`/subscription/checkout?plan=${planId}&billing=${isAnnual ? 'annual' : 'monthly'}`);
    } else {
      navigate(`/register?plan=${planId}&billing=${isAnnual ? 'annual' : 'monthly'}`);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20">
                <PhoneIcon className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">VoiceCRM</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-1 text-slate-600 hover:text-slate-900 text-sm">
                <ArrowLeftIcon className="w-4 h-4" />
                Home
              </Link>
              <Link to="/login" className="text-slate-600 hover:text-slate-900 font-medium text-sm">
                Sign In
              </Link>
              <Link
                to="/register"
                className="bg-gradient-to-r from-primary-500 to-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:from-primary-600 hover:to-primary-700 transition-all shadow-lg shadow-primary-500/20 text-sm"
              >
                Get Started Free
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative pt-24 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-primary-900"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50"></div>

        <div className="relative max-w-7xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 mb-6">
            <StarIcon className="w-4 h-4 text-yellow-400" />
            <span className="text-white/90 text-sm font-medium">14-Day Free Trial on All Plans</span>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
            Simple, Transparent
            <span className="block bg-gradient-to-r from-primary-400 to-cyan-400 bg-clip-text text-transparent">
              Pricing
            </span>
          </h1>

          <p className="text-lg text-slate-300 max-w-2xl mx-auto mb-10">
            CRM + AI Voice Agent in one platform. Choose the plan that fits your team.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-2">
            <button
              onClick={() => setIsAnnual(false)}
              className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-all ${
                !isAnnual
                  ? 'bg-white text-slate-900 shadow-lg'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                isAnnual
                  ? 'bg-white text-slate-900 shadow-lg'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Annual
              <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                -20%
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto px-4 -mt-10 relative z-10 pb-20">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {plans.map((plan) => {
            const IconComponent = plan.icon;
            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${
                  plan.popular ? 'ring-2 ring-primary-500 lg:scale-[1.02]' : 'border border-slate-200'
                }`}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="bg-primary-500 text-white text-center py-2 text-sm font-semibold">
                    MOST POPULAR
                  </div>
                )}

                <div className="p-6 flex flex-col flex-1">
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${plan.color} flex items-center justify-center`}>
                      <IconComponent className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                      <p className="text-xs text-slate-500">{plan.subtitle}</p>
                    </div>
                  </div>

                  {/* Price - PROMINENT */}
                  <div className="mb-5 pb-5 border-b-2 border-slate-100">
                    {(plan as any).customPricing ? (
                      <div>
                        <div className="text-4xl font-extrabold text-slate-900">Custom</div>
                        <p className="text-sm text-slate-500 mt-1">Contact for pricing</p>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-baseline">
                          <span className="text-4xl font-extrabold text-slate-900">
                            {formatPrice(isAnnual ? plan.annualPrice : plan.monthlyPrice)}
                          </span>
                          <span className="text-slate-500 ml-1">/month</span>
                        </div>
                        {isAnnual && (
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-sm text-slate-400 line-through">
                              {formatPrice(plan.monthlyPrice)}
                            </span>
                            <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded">
                              SAVE 20%
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Key Limits - CLEAR & VISIBLE */}
                  <div className="space-y-3 mb-5 pb-5 border-b-2 border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 flex items-center gap-2">
                        <ClockIcon className="w-4 h-4 text-primary-500" />
                        Voice Minutes
                      </span>
                      <span className="font-bold text-slate-900">{plan.metrics.minutes}/mo</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 flex items-center gap-2">
                        <PhoneIcon className="w-4 h-4 text-primary-500" />
                        Phone Numbers
                      </span>
                      <span className="font-bold text-slate-900">{plan.metrics.numbers}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 flex items-center gap-2">
                        <SparklesIcon className="w-4 h-4 text-primary-500" />
                        AI Voice Agents
                      </span>
                      <span className="font-bold text-slate-900">{plan.metrics.agents}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 flex items-center gap-2">
                        <UserGroupIcon className="w-4 h-4 text-primary-500" />
                        Team Members
                      </span>
                      <span className="font-bold text-slate-900">{plan.metrics.users}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 flex items-center gap-2">
                        <ChartBarIcon className="w-4 h-4 text-primary-500" />
                        Leads Capacity
                      </span>
                      <span className="font-bold text-slate-900">{plan.metrics.leads}</span>
                    </div>
                  </div>

                  {/* Features - CLEAR LIST */}
                  <div className="flex-1 mb-5">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Features Included:</p>
                    <ul className="space-y-2">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <CheckIcon className="w-5 h-5 text-green-500 flex-shrink-0" />
                          <span className="text-sm text-slate-700">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* CTA Button */}
                  <button
                    onClick={() => handleSelectPlan(plan.id)}
                    className={`w-full py-3.5 px-4 rounded-xl font-bold text-base transition-all ${
                      plan.popular
                        ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-lg shadow-primary-500/30'
                        : plan.id === 'enterprise'
                        ? 'bg-slate-800 text-white hover:bg-slate-900'
                        : 'bg-slate-900 text-white hover:bg-slate-800'
                    }`}
                  >
                    {plan.id === 'enterprise' ? 'Contact Sales' : 'Start Free Trial'}
                  </button>

                  {/* Extra Rate */}
                  <p className="text-xs text-slate-400 text-center mt-3">
                    Extra minutes: <span className="font-semibold text-slate-600">₹{plan.extraRate}/min</span>
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Trust Badges */}
      <div className="bg-white border-y border-slate-200 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-slate-900">500+</div>
              <div className="text-sm text-slate-500 mt-1">Active Companies</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-slate-900">1M+</div>
              <div className="text-sm text-slate-500 mt-1">AI Calls Made</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-slate-900">99.9%</div>
              <div className="text-sm text-slate-500 mt-1">Uptime SLA</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-slate-900">24/7</div>
              <div className="text-sm text-slate-500 mt-1">Support Available</div>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Comparison Toggle */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <button
          onClick={() => setShowComparison(!showComparison)}
          className="w-full py-4 text-center text-primary-600 font-semibold hover:text-primary-700 flex items-center justify-center gap-2"
        >
          <span>{showComparison ? 'Hide' : 'Show'} Full Feature Comparison</span>
          <svg className={`w-5 h-5 transition-transform ${showComparison ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Feature Comparison Table */}
      {showComparison && (
        <div className="max-w-6xl mx-auto px-4 pb-16">
          <h3 className="text-2xl font-bold text-slate-900 text-center mb-8">Compare All Features</h3>
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="px-6 py-5 text-left text-sm font-bold sticky left-0 bg-slate-900 min-w-[200px]">Feature</th>
                    <th className="px-6 py-5 text-center text-sm font-bold min-w-[130px]">
                      <div>Starter</div>
                      <div className="text-xs font-normal text-slate-300 mt-1">₹1,999/mo</div>
                    </th>
                    <th className="px-6 py-5 text-center text-sm font-bold bg-primary-600 min-w-[130px]">
                      <div className="flex items-center justify-center gap-1">
                        Pro
                        <span className="bg-white text-primary-600 text-[10px] px-1.5 py-0.5 rounded font-bold">POPULAR</span>
                      </div>
                      <div className="text-xs font-normal text-primary-100 mt-1">₹6,999/mo</div>
                    </th>
                    <th className="px-6 py-5 text-center text-sm font-bold min-w-[130px]">
                      <div>Business</div>
                      <div className="text-xs font-normal text-slate-300 mt-1">₹14,999/mo</div>
                    </th>
                    <th className="px-6 py-5 text-center text-sm font-bold min-w-[130px]">
                      <div>Enterprise</div>
                      <div className="text-xs font-normal text-slate-300 mt-1">Custom</div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {featureComparison.map((feature, idx) => (
                    <tr key={idx} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-blue-50 transition-colors`}>
                      <td className={`px-6 py-4 text-sm text-slate-800 font-semibold sticky left-0 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                        {feature.name}
                      </td>
                      {(['starter', 'pro', 'business', 'enterprise'] as const).map((plan) => (
                        <td
                          key={plan}
                          className={`px-6 py-4 text-center ${plan === 'pro' ? 'bg-primary-50' : ''}`}
                        >
                          {typeof feature[plan] === 'boolean' ? (
                            feature[plan] ? (
                              <div className="flex justify-center">
                                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                                  <CheckIcon className="w-4 h-4 text-green-600" />
                                </div>
                              </div>
                            ) : (
                              <div className="flex justify-center">
                                <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center">
                                  <XMarkIcon className="w-4 h-4 text-slate-400" />
                                </div>
                              </div>
                            )
                          ) : (
                            <span className="text-slate-900 font-bold text-sm">{feature[plan]}</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* FAQ Section */}
      <div className="bg-slate-100 py-20">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-slate-600">Everything you need to know about our pricing</p>
          </div>

          <div className="space-y-4">
            {[
              {
                q: 'Can I change plans later?',
                a: 'Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we\'ll prorate the difference.',
              },
              {
                q: 'What payment methods do you accept?',
                a: 'We accept UPI, Credit/Debit Cards, Net Banking, and Bank Transfers. EMI options are available for annual plans.',
              },
              {
                q: 'Is there a free trial?',
                a: 'Yes! All plans come with a 14-day free trial. No credit card required to start.',
              },
              {
                q: 'What happens if I exceed my limits?',
                a: 'You can purchase add-ons for extra minutes, numbers, or agents. We\'ll notify you when you\'re approaching your limits.',
              },
              {
                q: 'Do you offer refunds?',
                a: 'Yes, we offer a 30-day money-back guarantee. If you\'re not satisfied, contact us for a full refund.',
              },
            ].map((faq, idx) => (
              <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-semibold text-slate-900 mb-2">{faq.q}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600 to-primary-800"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50"></div>

        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <ChatBubbleLeftRightIcon className="w-16 h-16 text-white/20 mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to transform your sales?
          </h2>
          <p className="text-primary-100 mb-8 text-lg max-w-2xl mx-auto">
            Join 500+ companies using VoiceCRM to automate calls and close more deals.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => handleSelectPlan('pro')}
              className="px-8 py-4 bg-white text-primary-600 font-semibold rounded-xl hover:bg-primary-50 transition-all shadow-xl"
            >
              Start 14-Day Free Trial
            </button>
            <button
              onClick={() => handleSelectPlan('enterprise')}
              className="px-8 py-4 bg-primary-700/50 text-white font-semibold rounded-xl hover:bg-primary-700 transition-all border border-white/20"
            >
              Talk to Sales
            </button>
          </div>
          <p className="text-primary-200 text-sm mt-6">No credit card required</p>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-slate-900 text-slate-400 py-8 px-4 text-center text-sm">
        <p>All prices are in INR and exclude GST (18%)</p>
        <p className="mt-2">
          Questions? Email us at{' '}
          <a href="mailto:support@voicecrm.com" className="text-primary-400 hover:text-primary-300">
            support@voicecrm.com
          </a>
        </p>
      </div>
    </div>
  );
}
