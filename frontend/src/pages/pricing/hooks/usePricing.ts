/**
 * Pricing Page Hook
 * Manages billing toggle, plan category, and plan selection logic
 */

import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store';
import { PlanCategory } from '../pricing.types';
import { CRM_ONLY_PLANS, CRM_AI_VOICE_PLANS } from '../pricing.constants';

export function usePricing() {
  const [isAnnual, setIsAnnual] = useState(true);
  const [showComparison, setShowComparison] = useState(false);
  const [planCategory, setPlanCategory] = useState<PlanCategory>('crm-ai-voice');
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  // Get plans based on selected category
  const currentPlans = useMemo(() => {
    return planCategory === 'crm-only' ? CRM_ONLY_PLANS : CRM_AI_VOICE_PLANS;
  }, [planCategory]);

  const handleSelectPlan = useCallback((planId: string) => {
    if (planId === 'enterprise') {
      window.location.href = 'mailto:sales@myleadx.ai?subject=Enterprise Plan Inquiry';
      return;
    }
    const billingParam = isAnnual ? 'annual' : 'monthly';
    if (isAuthenticated) {
      navigate(`/subscription/checkout?plan=${planId}&billing=${billingParam}`);
    } else {
      navigate(`/register?plan=${planId}&billing=${billingParam}`);
    }
  }, [isAnnual, isAuthenticated, navigate]);

  const toggleBilling = useCallback((annual: boolean) => {
    setIsAnnual(annual);
  }, []);

  const toggleComparison = useCallback(() => {
    setShowComparison(prev => !prev);
  }, []);

  const toggleCategory = useCallback((category: PlanCategory) => {
    setPlanCategory(category);
  }, []);

  return {
    isAnnual,
    showComparison,
    planCategory,
    currentPlans,
    toggleBilling,
    toggleComparison,
    toggleCategory,
    handleSelectPlan,
  };
}
