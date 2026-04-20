/**
 * CurrentPlanCard - Display current subscription plan
 */
import {
  SparklesIcon,
  RocketLaunchIcon,
  ArrowTrendingUpIcon,
  BuildingOfficeIcon,
  BuildingOffice2Icon,
  CalendarDaysIcon,
  UsersIcon,
  ArrowUpIcon,
  UserPlusIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { Subscription } from '../../../services/subscription.service';
import { STATUS_COLORS, PLAN_COLORS } from '../billing.types';

interface CurrentPlanCardProps {
  subscription: Subscription | null;
  onUpgradeClick: () => void;
  onAddUsersClick: () => void;
  onCancelClick: () => void;
  onReactivateClick?: () => void;
}

const PLAN_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  free: SparklesIcon,
  starter: RocketLaunchIcon,
  growth: ArrowTrendingUpIcon,
  business: BuildingOfficeIcon,
  enterprise: BuildingOffice2Icon,
};

export function CurrentPlanCard({ subscription, onUpgradeClick, onAddUsersClick, onCancelClick, onReactivateClick }: CurrentPlanCardProps) {
  if (!subscription) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <p className="text-slate-500">No active subscription</p>
      </div>
    );
  }

  const planId = subscription.planId || 'free';
  const PlanIcon = PLAN_ICON_MAP[planId] || SparklesIcon;
  const planColor = PLAN_COLORS[planId] || 'slate';
  const statusColors = STATUS_COLORS[subscription.status] || STATUS_COLORS.PENDING;

  // Calculate days until renewal
  const periodEnd = new Date(subscription.currentPeriodEnd);
  const now = new Date();
  const daysUntilRenewal = Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Format renewal date
  const renewalDate = periodEnd.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const isFreePlan = planId === 'free';
  const isEnterprise = planId === 'enterprise';

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className={`px-6 py-4 bg-${planColor}-50 border-b border-${planColor}-100`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-${planColor}-100`}>
              <PlanIcon className={`w-6 h-6 text-${planColor}-600`} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">
                {subscription.plan?.name || planId.charAt(0).toUpperCase() + planId.slice(1)} Plan
              </h3>
              <p className="text-sm text-slate-500 capitalize">
                {subscription.billingCycle} billing
              </p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors.bg} ${statusColors.text}`}>
            {subscription.status}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Users */}
          <div className="flex items-center gap-3">
            <UsersIcon className="w-5 h-5 text-slate-400" />
            <div>
              <p className="text-sm text-slate-500">Users</p>
              <p className="font-medium text-slate-900">
                {subscription.usage?.usersCount || 0} / {subscription.plan?.features?.maxUsers === -1 ? 'Unlimited' : subscription.plan?.features?.maxUsers || 1}
              </p>
            </div>
          </div>

          {/* Renewal */}
          <div className="flex items-center gap-3">
            <CalendarDaysIcon className="w-5 h-5 text-slate-400" />
            <div>
              <p className="text-sm text-slate-500">Renewal</p>
              <p className="font-medium text-slate-900">{renewalDate}</p>
              {daysUntilRenewal > 0 && daysUntilRenewal <= 7 && (
                <p className="text-xs text-amber-600">{daysUntilRenewal} days left</p>
              )}
            </div>
          </div>

          {/* Amount */}
          <div>
            <p className="text-sm text-slate-500">Amount</p>
            <p className="font-medium text-slate-900">
              {isFreePlan ? 'Free' : `${subscription.currency} ${subscription.amount.toLocaleString('en-IN')}`}
            </p>
          </div>

          {/* User Count */}
          <div>
            <p className="text-sm text-slate-500">Licensed Users</p>
            <p className="font-medium text-slate-900">{subscription.userCount}</p>
          </div>
        </div>

        {/* Cancelled Banner */}
        {subscription.status === 'CANCELLED' && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-700">
              Your subscription has been cancelled. Access continues until{' '}
              <span className="font-medium">{renewalDate}</span>.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {subscription.status === 'CANCELLED' && onReactivateClick ? (
              <button
                onClick={onReactivateClick}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
              >
                <ArrowPathIcon className="w-4 h-4" />
                Reactivate Subscription
              </button>
            ) : (
              <>
                {!isEnterprise && (
                  <button
                    onClick={onUpgradeClick}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
                  >
                    <ArrowUpIcon className="w-4 h-4" />
                    {isFreePlan ? 'Start Subscription' : 'Upgrade Plan'}
                  </button>
                )}
                {!isFreePlan && subscription.status === 'ACTIVE' && (
                  <button
                    onClick={onAddUsersClick}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
                  >
                    <UserPlusIcon className="w-4 h-4" />
                    Add Users
                  </button>
                )}
              </>
            )}
          </div>
          {!isFreePlan && subscription.status === 'ACTIVE' && (
            <button
              onClick={onCancelClick}
              className="text-sm text-slate-500 hover:text-red-600 transition-colors"
            >
              Cancel subscription
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
