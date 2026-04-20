/**
 * Pricing Page
 * Displays pricing plans with feature comparison
 */

import { usePricing } from './hooks';
import {
  Navigation,
  HeroSection,
  PricingCards,
  TrustBadges,
  ComparisonToggle,
  CategoryComparisonTable,
  WalletRatesSection,
  AddOnsSection,
  FAQSection,
  CTASection,
  Footer,
} from './components';
import { FEATURE_CATEGORIES, FAQ_ITEMS, TRUST_BADGES, ADD_ONS, WALLET_RATES } from './pricing.constants';

export default function PricingPage() {
  const {
    isAnnual,
    showComparison,
    planCategory,
    currentPlans,
    toggleBilling,
    toggleComparison,
    toggleCategory,
    handleSelectPlan,
  } = usePricing();

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />

      <HeroSection
        isAnnual={isAnnual}
        onToggleBilling={toggleBilling}
        planCategory={planCategory}
        onToggleCategory={toggleCategory}
      />

      <PricingCards
        plans={currentPlans}
        isAnnual={isAnnual}
        onSelectPlan={handleSelectPlan}
      />

      <TrustBadges badges={TRUST_BADGES} />

      <WalletRatesSection rates={WALLET_RATES} />

      <ComparisonToggle
        showComparison={showComparison}
        onToggle={toggleComparison}
      />

      {showComparison && <CategoryComparisonTable categories={FEATURE_CATEGORIES} />}

      <AddOnsSection addOns={ADD_ONS} />

      <FAQSection items={FAQ_ITEMS} />

      <CTASection onSelectPlan={handleSelectPlan} />

      <Footer />
    </div>
  );
}
