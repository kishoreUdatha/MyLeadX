/**
 * Inbound Analytics Constants and Utility Functions
 */

import React from 'react';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { LiveDashboardData, AnalyticsSummary } from './inbound-analytics.types';

export const INITIAL_LIVE_DATA: LiveDashboardData = {
  activeCalls: 0,
  callsInQueue: 0,
  availableAgents: 0,
  avgWaitTime: 0,
  longestWaitTime: 0,
  callsToday: 0,
  answeredToday: 0,
  abandonedToday: 0,
};

export const INITIAL_SUMMARY: AnalyticsSummary = {
  totalCalls: 0,
  answeredCalls: 0,
  missedCalls: 0,
  voicemails: 0,
  avgWaitTime: 0,
  avgHandleTime: 0,
  serviceLevelPercent: 0,
  abandonmentRate: 0,
  callsChange: 0,
  answeredChange: 0,
  waitTimeChange: 0,
  handleTimeChange: 0,
};

export const LIVE_DATA_REFRESH_INTERVAL = 10000;

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function getChangeIcon(change: number): React.ReactNode {
  if (change > 0) return React.createElement(ArrowUp, { className: 'w-4 h-4 text-green-500' });
  if (change < 0) return React.createElement(ArrowDown, { className: 'w-4 h-4 text-red-500' });
  return React.createElement(Minus, { className: 'w-4 h-4 text-gray-400' });
}

export function getChangeColor(change: number, inverse = false): string {
  if (change === 0) return 'text-gray-500';
  const isPositive = inverse ? change < 0 : change > 0;
  return isPositive ? 'text-green-600' : 'text-red-600';
}

export function getDateParams(
  dateRange: string,
  startDate: string,
  endDate: string
): string {
  const params = new URLSearchParams();
  const now = new Date();

  if (dateRange === 'today') {
    params.set('startDate', now.toISOString().split('T')[0]);
    params.set('endDate', now.toISOString().split('T')[0]);
  } else if (dateRange === '7days') {
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    params.set('startDate', start.toISOString().split('T')[0]);
    params.set('endDate', now.toISOString().split('T')[0]);
  } else if (dateRange === '30days') {
    const start = new Date(now);
    start.setDate(start.getDate() - 30);
    params.set('startDate', start.toISOString().split('T')[0]);
    params.set('endDate', now.toISOString().split('T')[0]);
  } else if (dateRange === 'custom' && startDate && endDate) {
    params.set('startDate', startDate);
    params.set('endDate', endDate);
  }

  return params.toString();
}
