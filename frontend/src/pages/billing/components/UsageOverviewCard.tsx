/**
 * UsageOverviewCard - Progress bars for all usage limits
 */
import {
  UsersIcon,
  UserGroupIcon,
  PhoneIcon,
  ChatBubbleLeftRightIcon,
  EnvelopeIcon,
  CloudIcon,
  ExclamationTriangleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { Subscription } from '../../../services/subscription.service';
import { getUsageBarColor, getUsageBarBgColor } from '../billing.types';

interface UsageOverviewCardProps {
  subscription: Subscription | null;
  onUpgradeClick: () => void;
}

interface UsageItemProps {
  label: string;
  used: number;
  limit: number;
  icon: React.ComponentType<{ className?: string }>;
  unit?: string;
}

function UsageItem({ label, used, limit, icon: Icon, unit = '' }: UsageItemProps) {
  const isUnlimited = limit === -1;
  const percentage = isUnlimited ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const barColor = getUsageBarColor(percentage);
  const barBgColor = getUsageBarBgColor(percentage);
  const isNearLimit = percentage >= 90;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-700">{label}</span>
        </div>
        <span className="text-sm text-slate-600">
          {used.toLocaleString('en-IN')}{unit} / {isUnlimited ? 'Unlimited' : `${limit.toLocaleString('en-IN')}${unit}`}
        </span>
      </div>
      <div className={`h-2 rounded-full ${barBgColor}`}>
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: isUnlimited ? '0%' : `${percentage}%` }}
        />
      </div>
      {isNearLimit && (
        <div className="flex items-center gap-1 text-xs text-red-600">
          <ExclamationTriangleIcon className="w-3 h-3" />
          <span>Near limit - consider upgrading</span>
        </div>
      )}
    </div>
  );
}

export function UsageOverviewCard({ subscription, onUpgradeClick }: UsageOverviewCardProps) {
  const usage = subscription?.usage;
  const features = subscription?.plan?.features;

  if (!usage || !features) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <p className="text-slate-500">Usage data not available</p>
      </div>
    );
  }

  const usageItems = [
    {
      label: 'Leads',
      used: usage.leadsCount || 0,
      limit: features.maxLeads || 100,
      icon: UserGroupIcon,
    },
    {
      label: 'Users',
      used: usage.usersCount || 0,
      limit: features.maxUsers || 1,
      icon: UsersIcon,
    },
    {
      label: 'AI Minutes',
      used: Math.round((usage as any).voiceMinutesUsed || 0),
      limit: (features as any).voiceMinutesPerMonth || 0,
      icon: ClockIcon,
      unit: ' min',
    },
    {
      label: 'AI Calls',
      used: usage.aiCallsCount || 0,
      limit: features.aiCallsPerMonth || 0,
      icon: PhoneIcon,
    },
    {
      label: 'SMS',
      used: usage.smsCount || 0,
      limit: features.smsPerMonth || 0,
      icon: ChatBubbleLeftRightIcon,
    },
    {
      label: 'Emails',
      used: usage.emailsCount || 0,
      limit: features.emailsPerMonth || 0,
      icon: EnvelopeIcon,
    },
    {
      label: 'Storage',
      used: Math.round(usage.storageUsedMb || 0),
      limit: ((features as any).storageGb || 1) * 1024,
      icon: CloudIcon,
      unit: ' MB',
    },
  ];

  // Check if any usage is near limit
  const hasNearLimit = usageItems.some(item => {
    if (item.limit === -1) return false;
    const percentage = Math.round((item.used / item.limit) * 100);
    return percentage >= 70;
  });

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-900">Usage Overview</h3>
          <p className="text-sm text-slate-500">Current billing period usage</p>
        </div>
        {hasNearLimit && (
          <button
            onClick={onUpgradeClick}
            className="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-100 transition-colors"
          >
            Upgrade for more
          </button>
        )}
      </div>

      {/* Usage Grid */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {usageItems.map((item) => (
            <UsageItem key={item.label} {...item} />
          ))}
        </div>
      </div>

      {/* WhatsApp indicator */}
      {features.hasWhatsApp && (
        <div className="px-6 py-3 bg-green-50 border-t border-green-100">
          <div className="flex items-center gap-2">
            <ChatBubbleLeftRightIcon className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-700 font-medium">WhatsApp enabled</span>
            <span className="text-sm text-green-600">
              {usage.whatsappCount?.toLocaleString('en-IN') || 0} messages sent
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
