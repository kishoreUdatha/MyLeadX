/**
 * Billing Dashboard Page - Main billing hub
 */
import { useState, useEffect } from 'react';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

import { CurrentPlanCard } from './components/CurrentPlanCard';
import { UsageOverviewCard } from './components/UsageOverviewCard';
import { WalletBalanceCard } from './components/WalletBalanceCard';
import { BillingHistoryTable } from './components/BillingHistoryTable';
import { BillingDetailsCard } from './components/BillingDetailsCard';
import { WalletTopUpModal } from './modals/WalletTopUpModal';
import { PlanUpgradeModal } from './modals/PlanUpgradeModal';
import { AddUsersModal } from './modals/AddUsersModal';
import { InvoiceViewModal } from './modals/InvoiceViewModal';
import { CancelSubscriptionModal } from './modals/CancelSubscriptionModal';

import { subscriptionService, Subscription, Plan } from '../../services/subscription.service';
import type { WalletBalance, WalletTransaction, BillingHistoryItem, Invoice } from './billing.types';
import api from '../../services/api';

export default function BillingDashboardPage() {
  // State
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [walletBalance, setWalletBalance] = useState<WalletBalance | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<WalletTransaction[]>([]);
  const [billingHistory, setBillingHistory] = useState<BillingHistoryItem[]>([]);
  const [billingDetails, setBillingDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [topUpModalOpen, setTopUpModalOpen] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [addUsersModalOpen, setAddUsersModalOpen] = useState(false);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Fetch data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [subscriptionData, plansData, walletData, transactionsData, historyData, detailsData] = await Promise.all([
        subscriptionService.getCurrentSubscription(),
        subscriptionService.getPlans(),
        api.get('/wallet/balance').then(res => res.data.data),
        api.get('/wallet/recent').then(res => res.data.data),
        subscriptionService.getBillingHistory(),
        api.get('/organization/billing-details').then(res => res.data.data).catch(() => null),
      ]);

      setSubscription(subscriptionData);
      setPlans(plansData.plans);
      setWalletBalance(walletData);
      setRecentTransactions(transactionsData);
      setBillingHistory(historyData);
      setBillingDetails(detailsData);
    } catch (err: any) {
      console.error('Error fetching billing data:', err);
      setError(err.message || 'Failed to load billing data');
    } finally {
      setLoading(false);
    }
  };

  const handleTopUpSuccess = () => {
    setTopUpModalOpen(false);
    // Refresh wallet balance
    api.get('/wallet/balance').then(res => setWalletBalance(res.data.data));
    api.get('/wallet/recent').then(res => setRecentTransactions(res.data.data));
  };

  const handleUpgradeSuccess = () => {
    setUpgradeModalOpen(false);
    // Refresh subscription data
    fetchData();
  };

  const handleAddUsersSuccess = () => {
    setAddUsersModalOpen(false);
    // Refresh subscription data
    fetchData();
  };

  const handleCancelSuccess = () => {
    setCancelModalOpen(false);
    // Refresh subscription data
    fetchData();
  };

  const handleReactivate = async () => {
    try {
      await subscriptionService.reactivateSubscription();
      fetchData();
    } catch (err: any) {
      console.error('Error reactivating subscription:', err);
      setError(err.message || 'Failed to reactivate subscription');
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-48"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-48 bg-slate-200 rounded-lg"></div>
            <div className="h-48 bg-slate-200 rounded-lg"></div>
          </div>
          <div className="h-64 bg-slate-200 rounded-lg"></div>
          <div className="h-96 bg-slate-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
          <button
            onClick={fetchData}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/settings"
          className="inline-flex items-center text-sm text-slate-500 hover:text-slate-700 mb-2"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-1" />
          Back to Settings
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Billing & Subscription</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your subscription, top-up wallet, and view billing history
        </p>
      </div>

      {/* Main Grid */}
      <div className="space-y-6">
        {/* Top Row - Plan & Wallet */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Current Plan - spans 2 columns */}
          <div className="lg:col-span-2">
            <CurrentPlanCard
              subscription={subscription}
              onUpgradeClick={() => setUpgradeModalOpen(true)}
              onAddUsersClick={() => setAddUsersModalOpen(true)}
              onCancelClick={() => setCancelModalOpen(true)}
              onReactivateClick={handleReactivate}
            />
          </div>

          {/* Wallet Balance */}
          <div>
            <WalletBalanceCard
              balance={walletBalance}
              recentTransactions={recentTransactions}
              onTopUpClick={() => setTopUpModalOpen(true)}
            />
          </div>
        </div>

        {/* Usage Overview */}
        <UsageOverviewCard
          subscription={subscription}
          onUpgradeClick={() => setUpgradeModalOpen(true)}
        />

        {/* Billing Details */}
        <BillingDetailsCard
          details={billingDetails}
          onUpdate={fetchData}
        />

        {/* Billing History */}
        <BillingHistoryTable
          history={billingHistory}
          onDownloadInvoice={async (subscriptionId) => {
            try {
              const invoice = await subscriptionService.generateInvoice(subscriptionId);
              setSelectedInvoice(invoice);
              setInvoiceModalOpen(true);
            } catch (err) {
              console.error('Error generating invoice:', err);
            }
          }}
        />
      </div>

      {/* Modals */}
      <WalletTopUpModal
        isOpen={topUpModalOpen}
        onClose={() => setTopUpModalOpen(false)}
        presets={walletBalance?.presets || [500, 1000, 2000, 5000]}
        onSuccess={handleTopUpSuccess}
      />

      <PlanUpgradeModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        currentSubscription={subscription}
        plans={plans}
        onSuccess={handleUpgradeSuccess}
      />

      <AddUsersModal
        isOpen={addUsersModalOpen}
        onClose={() => setAddUsersModalOpen(false)}
        currentSubscription={subscription}
        onSuccess={handleAddUsersSuccess}
      />

      <InvoiceViewModal
        isOpen={invoiceModalOpen}
        onClose={() => {
          setInvoiceModalOpen(false);
          setSelectedInvoice(null);
        }}
        invoice={selectedInvoice}
      />

      <CancelSubscriptionModal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        subscription={subscription}
        onSuccess={handleCancelSuccess}
      />
    </div>
  );
}
