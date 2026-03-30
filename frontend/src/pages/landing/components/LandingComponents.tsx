/**
 * Landing Page Components
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, ArrowRight, CheckCircle, Check } from 'lucide-react';
import {
  Stat,
  Differentiator,
  Industry,
  Feature,
  PricingTier,
  Step,
  FooterSection,
} from '../landing.types';

// Navigation
export const Navigation: React.FC = () => (
  <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm border-b">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center h-16">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Phone className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900">VoiceCRM</span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-gray-600 hover:text-gray-900">Features</a>
          <a href="#industries" className="text-gray-600 hover:text-gray-900">Industries</a>
          <Link to="/pricing" className="text-gray-600 hover:text-gray-900">Pricing</Link>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/login" className="text-gray-600 hover:text-gray-900 font-medium">
            Sign In
          </Link>
          <Link
            to="/register?plan=starter"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
          >
            Start Free Trial
          </Link>
        </div>
      </div>
    </div>
  </nav>
);

// Hero Section
interface HeroSectionProps {
  stats: Stat[];
}

export const HeroSection: React.FC<HeroSectionProps> = ({ stats }) => (
  <section className="pt-32 pb-20 px-4 bg-gradient-to-b from-blue-50 to-white">
    <div className="max-w-7xl mx-auto">
      <div className="text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
          <span className="w-4 h-4">₹</span>
          Made for India | AI Voice + WhatsApp + CRM in One
        </div>
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
          Let <span className="text-blue-600">AI Call Your Leads</span>
          <br />While You Close Deals
        </h1>
        <p className="text-xl text-gray-600 mb-4 max-w-2xl mx-auto">
          India's first CRM with built-in AI voice agents. Make thousands of calls,
          send WhatsApp campaigns, and convert leads faster - all from one platform.
        </p>
        <p className="text-lg text-blue-600 font-semibold mb-8">
          No more juggling 5 different tools. No more expensive integrations.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/register?plan=starter"
            className="w-full sm:w-auto bg-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2"
          >
            Start Free Trial
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            to="/pricing"
            className="w-full sm:w-auto bg-white border-2 border-gray-200 text-gray-900 px-8 py-4 rounded-xl font-semibold hover:bg-gray-50 transition flex items-center justify-center gap-2"
          >
            View Pricing
          </Link>
        </div>
        <p className="text-sm text-gray-500 mt-4">
          Free plan available. No credit card required.
        </p>
      </div>

      {/* Stats */}
      <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
        {stats.map((stat, index) => (
          <div key={index} className="text-center p-6 bg-white rounded-2xl shadow-sm">
            <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-sm text-gray-600 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

// Differentiators Section
interface DifferentiatorsSectionProps {
  differentiators: Differentiator[];
}

export const DifferentiatorsSection: React.FC<DifferentiatorsSectionProps> = ({ differentiators }) => (
  <section className="py-20 bg-white">
    <div className="max-w-7xl mx-auto px-4">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          What Makes Us <span className="text-blue-600">Different</span>
        </h2>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {differentiators.map((diff) => {
          const Icon = diff.icon;
          return (
            <div key={diff.id} className={`bg-gradient-to-br ${diff.gradient} rounded-3xl p-8`}>
              <div className={`w-16 h-16 ${diff.iconBg} rounded-2xl flex items-center justify-center mb-6`}>
                <Icon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">{diff.title}</h3>
              <p className="text-gray-600 mb-4">{diff.description}</p>
              <ul className="space-y-2">
                {diff.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm text-gray-700">
                    <CheckCircle className={`w-4 h-4 ${diff.checkColor}`} />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  </section>
);

// Industries Section
interface IndustriesSectionProps {
  industries: Industry[];
}

export const IndustriesSection: React.FC<IndustriesSectionProps> = ({ industries }) => (
  <section id="industries" className="py-20 bg-gray-50">
    <div className="max-w-7xl mx-auto px-4">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          Perfect for <span className="text-blue-600">Your Industry</span>
        </h2>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Tailored solutions for high-volume lead businesses
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {industries.map((industry) => {
          const Icon = industry.icon;
          return (
            <div key={industry.id} className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition group">
              <div className={`w-14 h-14 ${industry.iconBg} rounded-xl flex items-center justify-center mb-4 ${industry.hoverBg} transition`}>
                <Icon className="w-7 h-7 text-current group-hover:text-white transition" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{industry.title}</h3>
              <p className="text-gray-600 text-sm mb-4">{industry.description}</p>
              <ul className="space-y-2 text-sm text-gray-600">
                {industry.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  </section>
);

// Features Section
interface FeaturesSectionProps {
  features: Feature[];
}

export const FeaturesSection: React.FC<FeaturesSectionProps> = ({ features }) => (
  <section id="features" className="py-20 bg-white">
    <div className="max-w-7xl mx-auto px-4">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          Powerful Features, <span className="text-blue-600">Simple to Use</span>
        </h2>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Everything you need to capture, nurture, and convert leads
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <div key={feature.id} className={`bg-gray-50 rounded-2xl p-6 ${feature.hoverBg} transition`}>
              <Icon className={`w-10 h-10 ${feature.iconColor} mb-4`} />
              <h4 className="font-semibold text-gray-900 mb-2">{feature.title}</h4>
              <p className="text-sm text-gray-600">{feature.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  </section>
);

// How It Works Section
interface HowItWorksSectionProps {
  steps: Step[];
}

export const HowItWorksSection: React.FC<HowItWorksSectionProps> = ({ steps }) => (
  <section className="py-20 bg-gray-50">
    <div className="max-w-7xl mx-auto px-4">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          Get Started in <span className="text-blue-600">3 Simple Steps</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
        {steps.map((step) => (
          <div key={step.number} className="text-center">
            <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              {step.number}
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{step.title}</h3>
            <p className="text-gray-600">{step.description}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

// Pricing Preview Section
interface PricingPreviewSectionProps {
  tiers: PricingTier[];
}

export const PricingPreviewSection: React.FC<PricingPreviewSectionProps> = ({ tiers }) => (
  <section className="py-20 bg-white">
    <div className="max-w-7xl mx-auto px-4">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          Simple, Transparent <span className="text-blue-600">Pricing</span>
        </h2>
        <p className="text-xl text-gray-600">Start free, upgrade as you grow</p>
      </div>

      <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
        {tiers.map((tier) => (
          <div
            key={tier.id}
            className={`rounded-2xl p-6 text-center relative ${
              tier.isPopular ? 'bg-blue-600 text-white' : 'bg-gray-50'
            }`}
          >
            {tier.isPopular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                POPULAR
              </div>
            )}
            <h3 className={`font-bold mb-2 ${tier.isPopular ? 'text-white' : 'text-gray-900'}`}>
              {tier.name}
            </h3>
            <div className={`text-3xl font-bold mb-2 ${tier.isPopular ? 'text-white' : tier.id === 'free' ? 'text-green-600' : 'text-gray-900'}`}>
              {tier.price}
              {tier.period && <span className="text-sm font-normal">{tier.period}</span>}
            </div>
            <p className={`text-sm mb-4 ${tier.isPopular ? 'text-blue-100' : 'text-gray-600'}`}>
              {tier.description}
            </p>
            <Link
              to={tier.link}
              className={`font-medium text-sm hover:underline ${
                tier.isPopular ? 'text-white' : 'text-blue-600'
              }`}
            >
              {tier.id === 'free' ? 'Get Started →' : 'View Details →'}
            </Link>
          </div>
        ))}
      </div>

      <div className="text-center mt-8">
        <Link
          to="/pricing"
          className="inline-flex items-center gap-2 text-blue-600 font-semibold hover:underline"
        >
          See full pricing & comparison
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  </section>
);

// CTA Section
export const CTASection: React.FC = () => (
  <section className="py-20 bg-blue-600">
    <div className="max-w-4xl mx-auto text-center px-4">
      <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
        Ready to 3x Your Lead Conversions?
      </h2>
      <p className="text-xl text-blue-100 mb-8">
        Join hundreds of Indian businesses using AI to scale their sales.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <Link
          to="/register?plan=starter"
          className="w-full sm:w-auto bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold hover:bg-blue-50 transition flex items-center justify-center gap-2"
        >
          Start Free Trial
          <ArrowRight className="w-5 h-5" />
        </Link>
        <a
          href="mailto:sales@voicecrm.in"
          className="w-full sm:w-auto border-2 border-white text-white px-8 py-4 rounded-xl font-semibold hover:bg-white/10 transition"
        >
          Talk to Sales
        </a>
      </div>
      <p className="text-blue-200 text-sm mt-6">
        No credit card required. 14-day free trial on all paid plans.
      </p>
    </div>
  </section>
);

// Footer
interface FooterProps {
  sections: FooterSection[];
}

export const Footer: React.FC<FooterProps> = ({ sections }) => (
  <footer className="bg-gray-900 text-gray-400 py-12">
    <div className="max-w-7xl mx-auto px-4">
      <div className="grid md:grid-cols-4 gap-8 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Phone className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">VoiceCRM</span>
          </div>
          <p className="text-sm">
            India's first CRM with built-in AI voice agents.
          </p>
        </div>
        {sections.map((section) => (
          <div key={section.title}>
            <h4 className="font-semibold text-white mb-4">{section.title}</h4>
            <ul className="space-y-2 text-sm">
              {section.links.map((link) => (
                <li key={link.label}>
                  {link.href.startsWith('/') ? (
                    <Link to={link.href} className="hover:text-white">{link.label}</Link>
                  ) : (
                    <a href={link.href} className="hover:text-white">{link.label}</a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center text-sm">
        <p>&copy; {new Date().getFullYear()} VoiceCRM. All rights reserved.</p>
        <p className="mt-2 md:mt-0">Made with love in India</p>
      </div>
    </div>
  </footer>
);
