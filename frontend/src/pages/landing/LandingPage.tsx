/**
 * Landing Page
 * Marketing homepage for VoiceCRM
 */

import {
  Navigation,
  HeroSection,
  DifferentiatorsSection,
  IndustriesSection,
  FeaturesSection,
  HowItWorksSection,
  PricingPreviewSection,
  CTASection,
  Footer,
} from './components';
import {
  STATS,
  DIFFERENTIATORS,
  INDUSTRIES,
  FEATURES,
  PRICING_TIERS,
  STEPS,
  FOOTER_SECTIONS,
} from './landing.constants';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <HeroSection stats={STATS} />
      <DifferentiatorsSection differentiators={DIFFERENTIATORS} />
      <IndustriesSection industries={INDUSTRIES} />
      <FeaturesSection features={FEATURES} />
      <HowItWorksSection steps={STEPS} />
      <PricingPreviewSection tiers={PRICING_TIERS} />
      <CTASection />
      <Footer sections={FOOTER_SECTIONS} />
    </div>
  );
}
