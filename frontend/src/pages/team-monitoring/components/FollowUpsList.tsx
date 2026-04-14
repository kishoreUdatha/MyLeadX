/**
 * Follow-Ups List Component
 * Displays pending follow-ups grouped by assignee
 */

import React, { useState } from 'react';
import { Clock, AlertTriangle, ChevronDown, ChevronRight, Phone, User } from 'lucide-react';
import { PendingFollowUpsData, FollowUpsByAssignee } from '../team-monitoring.types';

interface FollowUpsListProps {
  data: PendingFollowUpsData | null;
  loading: boolean;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffMs < 0) {
    // Overdue
    if (diffHours > -24) {
      return `${Math.abs(diffHours)}h overdue`;
    }
    return `${Math.abs(diffDays)}d overdue`;
  }

  // Upcoming
  if (diffHours < 24) {
    return `in ${diffHours}h`;
  }
  return `in ${diffDays}d`;
}

function AssigneeCard({ assignee }: { assignee: FollowUpsByAssignee }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-slate-100 rounded-lg overflow-hidden">
      <button
        className="w-full px-4 py-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
            <span className="text-sm font-medium text-primary-600">
              {assignee.assigneeName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="text-left">
            <p className="font-medium text-slate-800 text-sm">{assignee.assigneeName}</p>
            <p className="text-xs text-slate-500">
              {assignee.upcoming + assignee.overdue} follow-ups
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {assignee.overdue > 0 && (
            <span className="px-2 py-1 bg-red-100 text-red-600 text-xs rounded-full flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {assignee.overdue} overdue
            </span>
          )}
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="divide-y divide-slate-100">
          {assignee.followUps.slice(0, 5).map((followUp) => (
            <div
              key={followUp.id}
              className={`px-4 py-3 ${followUp.status === 'OVERDUE' ? 'bg-red-50' : 'bg-white'}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-slate-100 rounded-lg">
                    <User className="w-4 h-4 text-slate-500" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-800 text-sm">{followUp.leadName}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                      <Phone className="w-3 h-3" />
                      {followUp.leadPhone}
                    </div>
                    {followUp.message && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-1">{followUp.message}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`text-xs font-medium ${
                      followUp.status === 'OVERDUE' ? 'text-red-600' : 'text-amber-600'
                    }`}
                  >
                    {formatDate(followUp.scheduledAt)}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {assignee.followUps.length > 5 && (
            <div className="px-4 py-2 text-center text-xs text-slate-500 bg-slate-50">
              +{assignee.followUps.length - 5} more follow-ups
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function FollowUpsList({ data, loading }: FollowUpsListProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
        <div className="animate-pulse">
          <div className="h-5 bg-slate-200 rounded w-40 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-slate-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.totalPending === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-slate-400" />
          <h3 className="font-semibold text-slate-800">Pending Follow-ups</h3>
        </div>
        <div className="text-center py-8 text-slate-500">
          <Clock className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p>No pending follow-ups</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-slate-400" />
          <h3 className="font-semibold text-slate-800">Pending Follow-ups</h3>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-500">{data.totalPending} total</span>
          {data.totalOverdue > 0 && (
            <span className="px-2 py-1 bg-red-100 text-red-600 rounded-full text-xs flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {data.totalOverdue} overdue
            </span>
          )}
        </div>
      </div>

      {/* Summary bar */}
      <div className="h-2 bg-slate-100 rounded-full mb-4 overflow-hidden">
        <div className="h-full flex">
          <div
            className="bg-amber-400 h-full"
            style={{ width: `${(data.totalUpcoming / data.totalPending) * 100}%` }}
            title={`${data.totalUpcoming} upcoming`}
          />
          <div
            className="bg-red-500 h-full"
            style={{ width: `${(data.totalOverdue / data.totalPending) * 100}%` }}
            title={`${data.totalOverdue} overdue`}
          />
        </div>
      </div>

      {/* Assignee list */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {data.byAssignee.map((assignee) => (
          <AssigneeCard key={assignee.assigneeId} assignee={assignee} />
        ))}
      </div>
    </div>
  );
}
