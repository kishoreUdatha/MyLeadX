/**
 * Telecaller Queue Page Components
 */

import React from 'react';
import {
  PhoneIcon,
  UserIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  PlayIcon,
  ForwardIcon,
  ChatBubbleLeftRightIcon,
  FireIcon,
  ExclamationTriangleIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';
import { TelecallerQueueItem, QueueStats } from '../../../services/telecallerQueue.service';
import { CompleteFormData } from '../telecaller-queue.types';
import { OUTCOME_LABELS, getSentimentClasses, formatCallDuration } from '../telecaller-queue.constants';

// Header Component
interface HeaderProps {
  onRefresh: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onRefresh }) => (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Telecaller Queue</h1>
      <p className="text-slate-500 mt-1">AI-qualified leads ready for your call</p>
    </div>
    <button onClick={onRefresh} className="btn btn-secondary">
      <ArrowPathIcon className="h-4 w-4" />
      Refresh
    </button>
  </div>
);

// Stats Cards Component
interface StatsCardsProps {
  stats: QueueStats;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
    <StatCard icon={ClockIcon} iconBg="bg-primary-100" iconColor="text-primary-600" value={stats.totalPending} label="Pending" />
    <StatCard icon={FireIcon} iconBg="bg-danger-100" iconColor="text-danger-600" value={stats.highPriority} label="Hot Leads" />
    <StatCard icon={PhoneIcon} iconBg="bg-warning-100" iconColor="text-warning-600" value={stats.myItems} label="My Items" />
    <StatCard icon={CheckCircleIcon} iconBg="bg-success-100" iconColor="text-success-600" value={stats.totalCompleted} label="Completed Today" />
    <StatCard icon={CalendarIcon} iconBg="bg-purple-100" iconColor="text-purple-600" value={stats.totalCallback} label="Callbacks" />
    <StatCard icon={UserIcon} iconBg="bg-slate-100" iconColor="text-slate-600" value={stats.totalClaimed} label="In Progress" />
  </div>
);

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  value: number;
  label: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, iconBg, iconColor, value, label }) => (
  <div className="card p-4">
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-lg ${iconBg}`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  </div>
);

// Priority Badge Component
export const PriorityBadge: React.FC<{ priority: number }> = ({ priority }) => {
  if (priority <= 2) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-danger-100 text-danger-700">
        <FireIcon className="w-3 h-3" />
        Hot
      </span>
    );
  }
  if (priority <= 4) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-warning-100 text-warning-700">
        High
      </span>
    );
  }
  return null;
};

// Queue Item Component
interface QueueItemProps {
  item: TelecallerQueueItem;
  isSelected: boolean;
  isOwned: boolean;
  onSelect: (item: TelecallerQueueItem) => void;
  onClaim: (item: TelecallerQueueItem) => void;
  onCall: (phoneNumber: string) => void;
}

export const QueueItem: React.FC<QueueItemProps> = ({
  item,
  isSelected,
  isOwned,
  onSelect,
  onClaim,
  onCall,
}) => {
  const sentimentClasses = getSentimentClasses(item.aiCallSentiment);

  return (
    <div
      className={`p-4 hover:bg-slate-50 cursor-pointer transition-colors ${
        isSelected ? 'bg-primary-50 border-l-4 border-primary-500' : ''
      } ${isOwned ? 'bg-warning-50/50' : ''}`}
      onClick={() => onSelect(item)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-medium text-slate-900 truncate">
              {item.contactName || 'Unknown Contact'}
            </p>
            <PriorityBadge priority={item.priority} />
            {isOwned && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-warning-100 text-warning-700">
                Claimed
              </span>
            )}
          </div>
          <p className="text-sm text-slate-600">{item.phoneNumber}</p>
          {item.reason && <p className="text-xs text-slate-500 mt-1">{item.reason}</p>}
          {item.aiCallSentiment && (
            <span className={`inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium ${sentimentClasses.bg} ${sentimentClasses.text}`}>
              {item.aiCallSentiment} sentiment
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {item.status === 'PENDING' && (
            <button
              onClick={(e) => { e.stopPropagation(); onClaim(item); }}
              className="btn btn-primary btn-sm"
            >
              <PlayIcon className="w-4 h-4" />
              Claim
            </button>
          )}
          {isOwned && (
            <button
              onClick={(e) => { e.stopPropagation(); onCall(item.phoneNumber); }}
              className="btn btn-success btn-sm"
            >
              <PhoneIcon className="w-4 h-4" />
              Call
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Queue List Component
interface QueueListProps {
  items: TelecallerQueueItem[];
  isLoading: boolean;
  selectedItemId: string | null;
  userId: string | undefined;
  onSelectItem: (item: TelecallerQueueItem) => void;
  onClaim: (item: TelecallerQueueItem) => void;
  onCall: (phoneNumber: string) => void;
}

export const QueueList: React.FC<QueueListProps> = ({
  items,
  isLoading,
  selectedItemId,
  userId,
  onSelectItem,
  onClaim,
  onCall,
}) => (
  <div className="card">
    <div className="card-header">
      <h3 className="card-title">Queue Items</h3>
    </div>
    <div className="divide-y divide-slate-100">
      {isLoading ? (
        <div className="p-8 text-center">
          <span className="spinner spinner-lg"></span>
          <p className="mt-2 text-slate-500">Loading queue...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="p-8 text-center">
          <CheckCircleIcon className="w-12 h-12 mx-auto text-success-500" />
          <p className="mt-2 text-slate-600 font-medium">Queue is empty!</p>
          <p className="text-sm text-slate-500">No leads waiting for calls.</p>
        </div>
      ) : (
        items.map((item) => (
          <QueueItem
            key={item.id}
            item={item}
            isSelected={selectedItemId === item.id}
            isOwned={item.assignedToId === userId}
            onSelect={onSelectItem}
            onClaim={onClaim}
            onCall={onCall}
          />
        ))
      )}
    </div>
  </div>
);

// Lead Details Panel Component
interface LeadDetailsPanelProps {
  item: TelecallerQueueItem | null;
  userId: string | undefined;
  onCall: (phoneNumber: string) => void;
  onComplete: () => void;
  onSkip: (item: TelecallerQueueItem) => void;
  onRelease: (item: TelecallerQueueItem) => void;
  onClaim: (item: TelecallerQueueItem) => void;
}

export const LeadDetailsPanel: React.FC<LeadDetailsPanelProps> = ({
  item,
  userId,
  onCall,
  onComplete,
  onSkip,
  onRelease,
  onClaim,
}) => (
  <div className="card sticky top-4">
    <div className="card-header">
      <h3 className="card-title">Lead Details</h3>
    </div>
    {item ? (
      <div className="card-body space-y-4">
        {/* Contact Info */}
        <div>
          <h4 className="text-sm font-medium text-slate-500 mb-2">Contact</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-slate-400" />
              <span className="text-slate-900">{item.contactName || 'Unknown'}</span>
            </div>
            <div className="flex items-center gap-2">
              <PhoneIcon className="w-4 h-4 text-slate-400" />
              <a href={`tel:${item.phoneNumber}`} className="text-primary-600 hover:underline">
                {item.phoneNumber}
              </a>
            </div>
            {item.email && (
              <div className="flex items-center gap-2">
                <span className="text-slate-400">@</span>
                <span className="text-slate-600">{item.email}</span>
              </div>
            )}
          </div>
        </div>

        {/* AI Call Summary */}
        {item.aiCallSummary && (
          <div>
            <h4 className="text-sm font-medium text-slate-500 mb-2">
              <ChatBubbleLeftRightIcon className="w-4 h-4 inline mr-1" />
              AI Call Summary
            </h4>
            <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">
              {item.aiCallSummary}
            </p>
          </div>
        )}

        {/* AI Call Stats */}
        <div className="grid grid-cols-2 gap-3">
          {item.aiCallDuration && (
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500">Call Duration</p>
              <p className="text-lg font-semibold text-slate-900">
                {formatCallDuration(item.aiCallDuration)}
              </p>
            </div>
          )}
          {item.aiCallOutcome && (
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500">AI Outcome</p>
              <p className="text-sm font-semibold text-slate-900">
                {item.aiCallOutcome.replace('_', ' ')}
              </p>
            </div>
          )}
        </div>

        {/* Qualification Data */}
        {item.qualification && Object.keys(item.qualification).length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-slate-500 mb-2">Qualification Data</h4>
            <div className="bg-slate-50 rounded-lg p-3 space-y-1">
              {Object.entries(item.qualification).map(([key, value]) => (
                <div key={key} className="flex justify-between text-sm">
                  <span className="text-slate-500 capitalize">{key.replace(/_/g, ' ')}:</span>
                  <span className="text-slate-900 font-medium">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="pt-4 border-t border-slate-200 space-y-2">
          {item.assignedToId === userId ? (
            <>
              <button onClick={() => onCall(item.phoneNumber)} className="btn btn-success w-full">
                <PhoneIcon className="w-4 h-4" />
                Call Now
              </button>
              <button onClick={onComplete} className="btn btn-primary w-full">
                <CheckCircleIcon className="w-4 h-4" />
                Mark Complete
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => onSkip(item)} className="btn btn-secondary">
                  <ForwardIcon className="w-4 h-4" />
                  Skip
                </button>
                <button onClick={() => onRelease(item)} className="btn btn-secondary">
                  <XCircleIcon className="w-4 h-4" />
                  Release
                </button>
              </div>
            </>
          ) : item.status === 'PENDING' ? (
            <button onClick={() => onClaim(item)} className="btn btn-primary w-full">
              <PlayIcon className="w-4 h-4" />
              Claim This Lead
            </button>
          ) : (
            <div className="text-center py-4">
              <ExclamationTriangleIcon className="w-8 h-8 mx-auto text-warning-500" />
              <p className="text-sm text-slate-600 mt-2">
                This item is claimed by another telecaller
              </p>
            </div>
          )}
        </div>
      </div>
    ) : (
      <div className="card-body text-center py-12">
        <UserIcon className="w-12 h-12 mx-auto text-slate-300" />
        <p className="mt-2 text-slate-500">Select a lead to view details</p>
      </div>
    )}
  </div>
);

// Complete Modal Component
interface CompleteModalProps {
  item: TelecallerQueueItem;
  formData: CompleteFormData;
  onFormChange: (updates: Partial<CompleteFormData>) => void;
  onComplete: () => void;
  onClose: () => void;
}

export const CompleteModal: React.FC<CompleteModalProps> = ({
  item,
  formData,
  onFormChange,
  onComplete,
  onClose,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center">
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
    <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">
        Complete Call with {item.contactName || item.phoneNumber}
      </h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Outcome *</label>
          <select
            value={formData.outcome}
            onChange={(e) => onFormChange({ outcome: e.target.value })}
            className="input w-full"
          >
            <option value="">Select outcome...</option>
            {Object.entries(OUTCOME_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {formData.outcome === 'CALLBACK_SET' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Callback Date</label>
              <input
                type="date"
                value={formData.callbackDate}
                onChange={(e) => onFormChange({ callbackDate: e.target.value })}
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Time</label>
              <input
                type="time"
                value={formData.callbackTime}
                onChange={(e) => onFormChange({ callbackTime: e.target.value })}
                className="input w-full"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => onFormChange({ notes: e.target.value })}
            className="input w-full"
            rows={3}
            placeholder="Add any notes about the call..."
          />
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <button onClick={onClose} className="btn btn-secondary flex-1">Cancel</button>
        <button onClick={onComplete} className="btn btn-primary flex-1">Complete</button>
      </div>
    </div>
  </div>
);
