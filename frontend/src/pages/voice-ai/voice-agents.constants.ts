/**
 * Voice Agents Constants
 * Shared configuration data for voice agents page
 */

import { IndustryColors, CategoryFilter } from './voice-agents.types';

export const industryLabels: Record<string, string> = {
  EDUCATION: 'Education',
  IT_RECRUITMENT: 'IT Recruitment',
  REAL_ESTATE: 'Real Estate',
  CUSTOMER_CARE: 'Customer Support',
  TECHNICAL_INTERVIEW: 'Technical Interview',
  HEALTHCARE: 'Healthcare',
  FINANCE: 'Finance',
  ECOMMERCE: 'E-Commerce',
  CUSTOM: 'Custom',
};

export const industryIcons: Record<string, string> = {
  EDUCATION: '🎓',
  IT_RECRUITMENT: '💼',
  REAL_ESTATE: '🏠',
  CUSTOMER_CARE: '📞',
  TECHNICAL_INTERVIEW: '💻',
  HEALTHCARE: '🏥',
  FINANCE: '💰',
  ECOMMERCE: '🛒',
  CUSTOM: '⚙️',
};

export const industryColors: Record<string, IndustryColors> = {
  EDUCATION: { bg: 'from-violet-500 to-purple-600', accent: '#8B5CF6', wave: '#A78BFA', text: 'text-violet-600', light: 'bg-violet-50' },
  IT_RECRUITMENT: { bg: 'from-blue-500 to-indigo-600', accent: '#3B82F6', wave: '#60A5FA', text: 'text-blue-600', light: 'bg-blue-50' },
  REAL_ESTATE: { bg: 'from-emerald-500 to-teal-600', accent: '#10B981', wave: '#34D399', text: 'text-emerald-600', light: 'bg-emerald-50' },
  CUSTOMER_CARE: { bg: 'from-orange-500 to-amber-600', accent: '#F97316', wave: '#FB923C', text: 'text-orange-600', light: 'bg-orange-50' },
  TECHNICAL_INTERVIEW: { bg: 'from-cyan-500 to-blue-600', accent: '#06B6D4', wave: '#22D3EE', text: 'text-cyan-600', light: 'bg-cyan-50' },
  HEALTHCARE: { bg: 'from-rose-500 to-pink-600', accent: '#F43F5E', wave: '#FB7185', text: 'text-rose-600', light: 'bg-rose-50' },
  FINANCE: { bg: 'from-green-500 to-emerald-600', accent: '#22C55E', wave: '#4ADE80', text: 'text-green-600', light: 'bg-green-50' },
  ECOMMERCE: { bg: 'from-purple-500 to-fuchsia-600', accent: '#A855F7', wave: '#C084FC', text: 'text-purple-600', light: 'bg-purple-50' },
  CUSTOM: { bg: 'from-gray-500 to-slate-600', accent: '#6B7280', wave: '#9CA3AF', text: 'text-gray-600', light: 'bg-gray-50' },
};

export const categoryFilters: CategoryFilter[] = [
  { key: 'ALL', label: 'All' },
  { key: 'CUSTOMER_CARE', label: 'Customer Support' },
  { key: 'EDUCATION', label: 'Education' },
  { key: 'IT_RECRUITMENT', label: 'Outreach' },
  { key: 'HEALTHCARE', label: 'Receptionist' },
  { key: 'REAL_ESTATE', label: 'Real Estate' },
  { key: 'ECOMMERCE', label: 'E-Commerce' },
];

// Industry-specific workflow content
export const industryWorkflowContent: Record<string, {
  welcomeLabel: string;
  branches: { left: string; right: string };
  leftBranch: { icon: string; label: string; result: string };
  rightBranch: { icon: string; label: string; result: string };
  collectLabel: string;
  actions: string[];
}> = {
  EDUCATION: {
    welcomeLabel: 'Welcome & Identify Student',
    branches: { left: 'New admission inquiry', right: 'Current student' },
    leftBranch: { icon: '📚', label: 'Course Info', result: 'Interested' },
    rightBranch: { icon: '❓', label: 'Answer FAQs', result: 'Answered' },
    collectLabel: 'Collect Student Details',
    actions: ['Schedule campus tour', 'Send brochure'],
  },
  REAL_ESTATE: {
    welcomeLabel: 'Welcome & Identify Caller',
    branches: { left: 'Current tenant', right: 'Prospective tenant' },
    leftBranch: { icon: '🔧', label: 'Maintenance', result: 'Submitted' },
    rightBranch: { icon: '🏠', label: 'Schedule Show', result: 'Scheduled' },
    collectLabel: 'Collect Contact Info',
    actions: ['Schedule viewing', 'Send to maintenance'],
  },
  HEALTHCARE: {
    welcomeLabel: 'Welcome & Identify Patient',
    branches: { left: 'Book appointment', right: 'Medical query' },
    leftBranch: { icon: '📅', label: 'Appointment', result: 'Booked' },
    rightBranch: { icon: '💊', label: 'Medical Info', result: 'Provided' },
    collectLabel: 'Collect Patient Info',
    actions: ['Confirm appointment', 'Transfer to nurse'],
  },
  CUSTOMER_CARE: {
    welcomeLabel: 'Welcome & Identify Customer',
    branches: { left: 'Technical issue', right: 'General inquiry' },
    leftBranch: { icon: '🛠️', label: 'Troubleshoot', result: 'Resolved' },
    rightBranch: { icon: '📋', label: 'Escalate', result: 'Transferred' },
    collectLabel: 'Log Issue Details',
    actions: ['Create ticket', 'Transfer to agent'],
  },
  IT_RECRUITMENT: {
    welcomeLabel: 'Welcome & Identify Candidate',
    branches: { left: 'New candidate', right: 'Follow-up' },
    leftBranch: { icon: '📝', label: 'Screen Skills', result: 'Qualified' },
    rightBranch: { icon: '📞', label: 'Schedule Call', result: 'Scheduled' },
    collectLabel: 'Collect Candidate Info',
    actions: ['Schedule interview', 'Send job details'],
  },
  ECOMMERCE: {
    welcomeLabel: 'Welcome & Identify Shopper',
    branches: { left: 'Order inquiry', right: 'Return/Refund' },
    leftBranch: { icon: '📦', label: 'Track Order', result: 'Found' },
    rightBranch: { icon: '↩️', label: 'Process Return', result: 'Initiated' },
    collectLabel: 'Verify Order Details',
    actions: ['Generate return label', 'Process refund'],
  },
  FINANCE: {
    welcomeLabel: 'Welcome & Verify Identity',
    branches: { left: 'Account inquiry', right: 'New application' },
    leftBranch: { icon: '💳', label: 'Account Help', result: 'Verified' },
    rightBranch: { icon: '📄', label: 'New Account', result: 'Submitted' },
    collectLabel: 'Verify Account Info',
    actions: ['Verify documents', 'Transfer to advisor'],
  },
};

// Helper functions
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

export const getQuestions = (template: { questions?: any[] }): any[] => {
  if (!template.questions) return [];
  if (Array.isArray(template.questions)) return template.questions;
  return [];
};

export const getFaqs = (template: { faqs?: any[] }): any[] => {
  if (!template.faqs) return [];
  if (Array.isArray(template.faqs)) return template.faqs;
  return [];
};
