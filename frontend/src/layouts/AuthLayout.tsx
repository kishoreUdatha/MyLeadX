import React from 'react';
import { SparklesIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  const { t } = useTranslation(['auth']);

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-primary-500 rounded-full filter blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary-600 rounded-full filter blur-3xl translate-x-1/2 translate-y-1/2"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 lg:px-16 xl:px-24">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/25">
              <SparklesIcon className="w-7 h-7 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">CRM Pro</span>
          </div>

          {/* Hero text */}
          <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-6">
            {t('auth:branding.tagline')}
            <span className="block text-gradient bg-gradient-to-r from-primary-400 to-primary-300 bg-clip-text text-transparent">
              {t('auth:branding.taglineHighlight')}
            </span>
          </h1>

          <p className="text-lg text-slate-400 mb-12 max-w-md">
            {t('auth:branding.description')}
          </p>

          {/* Features */}
          <div className="space-y-4">
            <Feature text={t('auth:branding.features.scoring')} />
            <Feature text={t('auth:branding.features.automation')} />
            <Feature text={t('auth:branding.features.analytics')} />
            <Feature text={t('auth:branding.features.voiceAi')} />
          </div>

          {/* Stats */}
          <div className="flex gap-12 mt-16">
            <Stat value="10K+" label={t('auth:branding.stats.leadsManaged')} />
            <Stat value="95%" label={t('auth:branding.stats.satisfaction')} />
            <Stat value="24/7" label={t('auth:branding.stats.aiSupport')} />
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex flex-col py-12 px-4 sm:px-6 lg:px-12 xl:px-24 bg-slate-50 relative">
        {/* Language Switcher - Top Right */}
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
          <LanguageSwitcher />
        </div>

        <div className="flex-1 flex flex-col justify-center">
        <div className="w-full max-w-md mx-auto">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/25">
              <SparklesIcon className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900">CRM Pro</span>
          </div>

          {/* Form card */}
          <div className="bg-white rounded-2xl shadow-soft p-8 sm:p-10 border border-slate-200/60">
            {children}
          </div>

          {/* Footer */}
          <p className="mt-8 text-center text-sm text-slate-500">
            {t('auth:terms.agreement')}{' '}
            <a href="#" className="text-primary-600 hover:text-primary-700 font-medium">
              {t('auth:terms.termsOfService')}
            </a>{' '}
            {t('auth:terms.and')}{' '}
            <a href="#" className="text-primary-600 hover:text-primary-700 font-medium">
              {t('auth:terms.privacyPolicy')}
            </a>
          </p>
        </div>
        </div>
      </div>
    </div>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-5 h-5 rounded-full bg-primary-500/20 flex items-center justify-center flex-shrink-0">
        <svg className="w-3 h-3 text-primary-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      </div>
      <span className="text-slate-300">{text}</span>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-sm text-slate-400">{label}</p>
    </div>
  );
}
