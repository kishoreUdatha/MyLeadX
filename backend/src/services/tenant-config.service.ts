import prisma from '../config/database';
import { IndustryType } from '@prisma/client';

// Default labels used when no custom labels are configured
const DEFAULT_LABELS = {
  lead: { singular: 'Lead', plural: 'Leads', icon: 'UserGroupIcon' },
  deal: { singular: 'Deal', plural: 'Deals', icon: 'BriefcaseIcon' },
  followUp: { singular: 'Follow-up', plural: 'Follow-ups', icon: 'PhoneIcon' },
  payment: { singular: 'Payment', plural: 'Payments', icon: 'CurrencyRupeeIcon' },
  agent: { singular: 'Agent', plural: 'Agents', icon: 'UserIcon' },
  call: { singular: 'Call', plural: 'Calls', icon: 'PhoneIcon' },
  appointment: { singular: 'Appointment', plural: 'Appointments', icon: 'CalendarIcon' },
  task: { singular: 'Task', plural: 'Tasks', icon: 'ClipboardIcon' },
  campaign: { singular: 'Campaign', plural: 'Campaigns', icon: 'MegaphoneIcon' },
  report: { singular: 'Report', plural: 'Reports', icon: 'ChartBarIcon' },
};

// ==================== TENANT CONFIGURATION ====================

// Get tenant configuration
export const getTenantConfig = async (organizationId: string) => {
  let config = await prisma.tenantConfiguration.findUnique({
    where: { organizationId },
    include: {
      labels: true,
      template: true,
    },
  });

  // Create default config if not exists
  if (!config) {
    config = await prisma.tenantConfiguration.create({
      data: {
        organizationId,
        industry: IndustryType.CUSTOM,
        enabledModules: ['leads', 'calls', 'followups', 'payments', 'reports'],
      },
      include: {
        labels: true,
        template: true,
      },
    });
  }

  return config;
};

// Update tenant configuration
export const updateTenantConfig = async (
  organizationId: string,
  data: {
    industry?: IndustryType;
    enabledModules?: string[];
    accentColor?: string;
    logoUrl?: string;
    faviconUrl?: string;
    currency?: string;
    timezone?: string;
    dateFormat?: string;
  }
) => {
  return prisma.tenantConfiguration.upsert({
    where: { organizationId },
    create: {
      organizationId,
      ...data,
    },
    update: data,
    include: {
      labels: true,
      template: true,
    },
  });
};

// ==================== TENANT LABELS ====================

// Get all labels for a tenant
export const getTenantLabels = async (organizationId: string) => {
  const config = await prisma.tenantConfiguration.findUnique({
    where: { organizationId },
    include: { labels: true },
  });

  if (!config || config.labels.length === 0) {
    // Return default labels
    return Object.entries(DEFAULT_LABELS).map(([key, value]) => ({
      entityKey: key,
      singularLabel: value.singular,
      pluralLabel: value.plural,
      icon: value.icon,
      isDefault: true,
    }));
  }

  // Merge with defaults for any missing labels
  const labelMap = new Map(config.labels.map((l) => [l.entityKey, l]));
  const mergedLabels = Object.entries(DEFAULT_LABELS).map(([key, value]) => {
    const customLabel = labelMap.get(key);
    if (customLabel) {
      return {
        id: customLabel.id,
        entityKey: customLabel.entityKey,
        singularLabel: customLabel.singularLabel,
        pluralLabel: customLabel.pluralLabel,
        icon: customLabel.icon || value.icon,
        isDefault: false,
      };
    }
    return {
      entityKey: key,
      singularLabel: value.singular,
      pluralLabel: value.plural,
      icon: value.icon,
      isDefault: true,
    };
  });

  return mergedLabels;
};

// Get a specific label
export const getLabel = async (organizationId: string, entityKey: string) => {
  const config = await prisma.tenantConfiguration.findUnique({
    where: { organizationId },
    include: { labels: true },
  });

  const customLabel = config?.labels.find((l) => l.entityKey === entityKey);
  if (customLabel) {
    return {
      entityKey: customLabel.entityKey,
      singularLabel: customLabel.singularLabel,
      pluralLabel: customLabel.pluralLabel,
      icon: customLabel.icon,
      isDefault: false,
    };
  }

  // Return default
  const defaultLabel = DEFAULT_LABELS[entityKey as keyof typeof DEFAULT_LABELS];
  if (defaultLabel) {
    return {
      entityKey,
      singularLabel: defaultLabel.singular,
      pluralLabel: defaultLabel.plural,
      icon: defaultLabel.icon,
      isDefault: true,
    };
  }

  return null;
};

// Update or create a label
export const upsertLabel = async (
  organizationId: string,
  data: {
    entityKey: string;
    singularLabel: string;
    pluralLabel: string;
    icon?: string;
  }
) => {
  // Ensure tenant config exists
  let config = await prisma.tenantConfiguration.findUnique({
    where: { organizationId },
  });

  if (!config) {
    config = await prisma.tenantConfiguration.create({
      data: {
        organizationId,
        industry: IndustryType.CUSTOM,
        enabledModules: ['leads', 'calls', 'followups', 'payments', 'reports'],
      },
    });
  }

  return prisma.tenantLabel.upsert({
    where: {
      configId_entityKey: {
        configId: config.id,
        entityKey: data.entityKey,
      },
    },
    create: {
      configId: config.id,
      entityKey: data.entityKey,
      singularLabel: data.singularLabel,
      pluralLabel: data.pluralLabel,
      icon: data.icon,
    },
    update: {
      singularLabel: data.singularLabel,
      pluralLabel: data.pluralLabel,
      icon: data.icon,
    },
  });
};

// Bulk update labels
export const bulkUpdateLabels = async (
  organizationId: string,
  labels: Array<{
    entityKey: string;
    singularLabel: string;
    pluralLabel: string;
    icon?: string;
  }>
) => {
  // Ensure tenant config exists
  let config = await prisma.tenantConfiguration.findUnique({
    where: { organizationId },
  });

  if (!config) {
    config = await prisma.tenantConfiguration.create({
      data: {
        organizationId,
        industry: IndustryType.CUSTOM,
        enabledModules: ['leads', 'calls', 'followups', 'payments', 'reports'],
      },
    });
  }

  // Use transaction for bulk update
  return prisma.$transaction(
    labels.map((label) =>
      prisma.tenantLabel.upsert({
        where: {
          configId_entityKey: {
            configId: config!.id,
            entityKey: label.entityKey,
          },
        },
        create: {
          configId: config!.id,
          entityKey: label.entityKey,
          singularLabel: label.singularLabel,
          pluralLabel: label.pluralLabel,
          icon: label.icon,
        },
        update: {
          singularLabel: label.singularLabel,
          pluralLabel: label.pluralLabel,
          icon: label.icon,
        },
      })
    )
  );
};

// Reset label to default
export const resetLabel = async (organizationId: string, entityKey: string) => {
  const config = await prisma.tenantConfiguration.findUnique({
    where: { organizationId },
  });

  if (!config) return null;

  return prisma.tenantLabel.deleteMany({
    where: {
      configId: config.id,
      entityKey,
    },
  });
};

// Reset all labels to defaults
export const resetAllLabels = async (organizationId: string) => {
  const config = await prisma.tenantConfiguration.findUnique({
    where: { organizationId },
  });

  if (!config) return null;

  return prisma.tenantLabel.deleteMany({
    where: { configId: config.id },
  });
};

// ==================== ENABLED MODULES ====================

// Get enabled modules
export const getEnabledModules = async (organizationId: string) => {
  const config = await prisma.tenantConfiguration.findUnique({
    where: { organizationId },
  });

  return (config?.enabledModules as string[]) || [
    'leads',
    'calls',
    'followups',
    'payments',
    'reports',
  ];
};

// Update enabled modules
export const updateEnabledModules = async (
  organizationId: string,
  modules: string[]
) => {
  return prisma.tenantConfiguration.upsert({
    where: { organizationId },
    create: {
      organizationId,
      enabledModules: modules,
    },
    update: {
      enabledModules: modules,
    },
  });
};

// ==================== INDUSTRY HELPERS ====================

// Get industry-specific labels
export const getIndustryLabels = (industry: IndustryType) => {
  const industryLabels: Record<IndustryType, typeof DEFAULT_LABELS> = {
    EDUCATION: {
      lead: { singular: 'Student', plural: 'Students', icon: 'AcademicCapIcon' },
      deal: { singular: 'Admission', plural: 'Admissions', icon: 'DocumentTextIcon' },
      followUp: { singular: 'Counseling', plural: 'Counselings', icon: 'ChatBubbleIcon' },
      payment: { singular: 'Fee', plural: 'Fees', icon: 'CurrencyRupeeIcon' },
      agent: { singular: 'Counselor', plural: 'Counselors', icon: 'UserIcon' },
      call: { singular: 'Call', plural: 'Calls', icon: 'PhoneIcon' },
      appointment: { singular: 'Campus Visit', plural: 'Campus Visits', icon: 'BuildingOfficeIcon' },
      task: { singular: 'Task', plural: 'Tasks', icon: 'ClipboardIcon' },
      campaign: { singular: 'Campaign', plural: 'Campaigns', icon: 'MegaphoneIcon' },
      report: { singular: 'Report', plural: 'Reports', icon: 'ChartBarIcon' },
    },
    REAL_ESTATE: {
      lead: { singular: 'Buyer', plural: 'Buyers', icon: 'UserGroupIcon' },
      deal: { singular: 'Booking', plural: 'Bookings', icon: 'HomeIcon' },
      followUp: { singular: 'Site Visit', plural: 'Site Visits', icon: 'MapPinIcon' },
      payment: { singular: 'Payment', plural: 'Payments', icon: 'CurrencyRupeeIcon' },
      agent: { singular: 'Agent', plural: 'Agents', icon: 'UserIcon' },
      call: { singular: 'Call', plural: 'Calls', icon: 'PhoneIcon' },
      appointment: { singular: 'Site Visit', plural: 'Site Visits', icon: 'BuildingOfficeIcon' },
      task: { singular: 'Task', plural: 'Tasks', icon: 'ClipboardIcon' },
      campaign: { singular: 'Campaign', plural: 'Campaigns', icon: 'MegaphoneIcon' },
      report: { singular: 'Report', plural: 'Reports', icon: 'ChartBarIcon' },
    },
    HEALTHCARE: {
      lead: { singular: 'Patient', plural: 'Patients', icon: 'UserIcon' },
      deal: { singular: 'Treatment', plural: 'Treatments', icon: 'HeartIcon' },
      followUp: { singular: 'Appointment', plural: 'Appointments', icon: 'CalendarIcon' },
      payment: { singular: 'Bill', plural: 'Bills', icon: 'CurrencyRupeeIcon' },
      agent: { singular: 'Staff', plural: 'Staff', icon: 'UserGroupIcon' },
      call: { singular: 'Call', plural: 'Calls', icon: 'PhoneIcon' },
      appointment: { singular: 'Consultation', plural: 'Consultations', icon: 'ClipboardDocumentIcon' },
      task: { singular: 'Task', plural: 'Tasks', icon: 'ClipboardIcon' },
      campaign: { singular: 'Campaign', plural: 'Campaigns', icon: 'MegaphoneIcon' },
      report: { singular: 'Report', plural: 'Reports', icon: 'ChartBarIcon' },
    },
    INSURANCE: {
      lead: { singular: 'Prospect', plural: 'Prospects', icon: 'UserGroupIcon' },
      deal: { singular: 'Policy', plural: 'Policies', icon: 'ShieldCheckIcon' },
      followUp: { singular: 'Meeting', plural: 'Meetings', icon: 'CalendarIcon' },
      payment: { singular: 'Premium', plural: 'Premiums', icon: 'CurrencyRupeeIcon' },
      agent: { singular: 'Advisor', plural: 'Advisors', icon: 'UserIcon' },
      call: { singular: 'Call', plural: 'Calls', icon: 'PhoneIcon' },
      appointment: { singular: 'Meeting', plural: 'Meetings', icon: 'CalendarIcon' },
      task: { singular: 'Task', plural: 'Tasks', icon: 'ClipboardIcon' },
      campaign: { singular: 'Campaign', plural: 'Campaigns', icon: 'MegaphoneIcon' },
      report: { singular: 'Report', plural: 'Reports', icon: 'ChartBarIcon' },
    },
    AUTOMOTIVE: {
      lead: { singular: 'Customer', plural: 'Customers', icon: 'UserGroupIcon' },
      deal: { singular: 'Booking', plural: 'Bookings', icon: 'TruckIcon' },
      followUp: { singular: 'Test Drive', plural: 'Test Drives', icon: 'MapPinIcon' },
      payment: { singular: 'Payment', plural: 'Payments', icon: 'CurrencyRupeeIcon' },
      agent: { singular: 'Sales Executive', plural: 'Sales Executives', icon: 'UserIcon' },
      call: { singular: 'Call', plural: 'Calls', icon: 'PhoneIcon' },
      appointment: { singular: 'Test Drive', plural: 'Test Drives', icon: 'TruckIcon' },
      task: { singular: 'Task', plural: 'Tasks', icon: 'ClipboardIcon' },
      campaign: { singular: 'Campaign', plural: 'Campaigns', icon: 'MegaphoneIcon' },
      report: { singular: 'Report', plural: 'Reports', icon: 'ChartBarIcon' },
    },
    FINANCE: DEFAULT_LABELS,
    TRAVEL: DEFAULT_LABELS,
    HOSPITALITY: DEFAULT_LABELS,
    RETAIL: DEFAULT_LABELS,
    MANUFACTURING: DEFAULT_LABELS,
    IT_SERVICES: {
      lead: { singular: 'Prospect', plural: 'Prospects', icon: 'UserGroupIcon' },
      deal: { singular: 'Project', plural: 'Projects', icon: 'ComputerDesktopIcon' },
      followUp: { singular: 'Meeting', plural: 'Meetings', icon: 'CalendarIcon' },
      payment: { singular: 'Invoice', plural: 'Invoices', icon: 'DocumentTextIcon' },
      agent: { singular: 'BDE', plural: 'BDEs', icon: 'UserIcon' },
      call: { singular: 'Call', plural: 'Calls', icon: 'PhoneIcon' },
      appointment: { singular: 'Demo', plural: 'Demos', icon: 'PresentationChartLineIcon' },
      task: { singular: 'Task', plural: 'Tasks', icon: 'ClipboardIcon' },
      campaign: { singular: 'Campaign', plural: 'Campaigns', icon: 'MegaphoneIcon' },
      report: { singular: 'Report', plural: 'Reports', icon: 'ChartBarIcon' },
    },
    LEGAL: DEFAULT_LABELS,
    CONSULTING: DEFAULT_LABELS,
    FITNESS: DEFAULT_LABELS,
    RECRUITMENT: {
      lead: { singular: 'Candidate', plural: 'Candidates', icon: 'UserGroupIcon' },
      deal: { singular: 'Placement', plural: 'Placements', icon: 'BriefcaseIcon' },
      followUp: { singular: 'Interview', plural: 'Interviews', icon: 'CalendarIcon' },
      payment: { singular: 'Fee', plural: 'Fees', icon: 'CurrencyRupeeIcon' },
      agent: { singular: 'Recruiter', plural: 'Recruiters', icon: 'UserIcon' },
      call: { singular: 'Call', plural: 'Calls', icon: 'PhoneIcon' },
      appointment: { singular: 'Interview', plural: 'Interviews', icon: 'CalendarIcon' },
      task: { singular: 'Task', plural: 'Tasks', icon: 'ClipboardIcon' },
      campaign: { singular: 'Job Opening', plural: 'Job Openings', icon: 'MegaphoneIcon' },
      report: { singular: 'Report', plural: 'Reports', icon: 'ChartBarIcon' },
    },
    EVENTS: DEFAULT_LABELS,
    CUSTOM: DEFAULT_LABELS,
  };

  return industryLabels[industry] || DEFAULT_LABELS;
};

export const tenantConfigService = {
  getTenantConfig,
  updateTenantConfig,
  getTenantLabels,
  getLabel,
  upsertLabel,
  bulkUpdateLabels,
  resetLabel,
  resetAllLabels,
  getEnabledModules,
  updateEnabledModules,
  getIndustryLabels,
  DEFAULT_LABELS,
};
