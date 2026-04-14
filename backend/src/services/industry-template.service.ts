import { prisma } from '../config/database';
import { IndustryType } from '@prisma/client';
import { createIndustryFields, deleteIndustryFields } from './industry-fields.service';

// ==================== INDUSTRY TEMPLATES ====================

// Get all industry templates
export const getAllTemplates = async () => {
  return prisma.industryTemplate.findMany({
    orderBy: [
      { isPopular: 'desc' },
      { usageCount: 'desc' },
      { name: 'asc' },
    ],
  });
};

// Get templates by industry
export const getTemplatesByIndustry = async (industry: IndustryType) => {
  return prisma.industryTemplate.findMany({
    where: { industry },
    orderBy: { usageCount: 'desc' },
  });
};

// Get single template by ID
export const getTemplateById = async (id: string) => {
  return prisma.industryTemplate.findUnique({
    where: { id },
  });
};

// Get template by slug
export const getTemplateBySlug = async (slug: string) => {
  return prisma.industryTemplate.findUnique({
    where: { slug },
  });
};

// Create industry template (admin only)
export const createTemplate = async (data: {
  name: string;
  slug: string;
  description?: string;
  industry: IndustryType;
  icon?: string;
  thumbnail?: string;
  defaultLabels: any;
  defaultPipeline: any;
  defaultFields: any;
  defaultRoles: any;
  defaultWorkflows?: any;
  defaultAIScripts?: any;
  enabledFeatures?: any;
  isSystem?: boolean;
  isPopular?: boolean;
}) => {
  return prisma.industryTemplate.create({
    data,
  });
};

// Update industry template
export const updateTemplate = async (id: string, data: any) => {
  return prisma.industryTemplate.update({
    where: { id },
    data,
  });
};

// Delete template
export const deleteTemplate = async (id: string) => {
  const template = await prisma.industryTemplate.findUnique({
    where: { id },
  });

  if (template?.isSystem) {
    throw new Error('Cannot delete system templates');
  }

  return prisma.industryTemplate.delete({
    where: { id },
  });
};

// Increment usage count
export const incrementUsageCount = async (id: string) => {
  return prisma.industryTemplate.update({
    where: { id },
    data: {
      usageCount: { increment: 1 },
    },
  });
};

// ==================== PIPELINE PRESETS ====================

export const getPipelinePresets = async (industry: IndustryType) => {
  return prisma.industryPipelinePreset.findMany({
    where: { industry },
    orderBy: { isDefault: 'desc' },
  });
};

export const getDefaultPipelinePreset = async (industry: IndustryType) => {
  return prisma.industryPipelinePreset.findFirst({
    where: { industry, isDefault: true },
  });
};

export const createPipelinePreset = async (data: {
  industry: IndustryType;
  name: string;
  description?: string;
  stages: any;
  isDefault?: boolean;
}) => {
  return prisma.industryPipelinePreset.create({
    data,
  });
};

// ==================== FIELD PRESETS ====================

export const getFieldPresets = async (industry: IndustryType) => {
  return prisma.industryFieldPreset.findMany({
    where: { industry },
    orderBy: { isDefault: 'desc' },
  });
};

export const getDefaultFieldPreset = async (industry: IndustryType) => {
  return prisma.industryFieldPreset.findFirst({
    where: { industry, isDefault: true },
  });
};

export const createFieldPreset = async (data: {
  industry: IndustryType;
  name: string;
  description?: string;
  fields: any;
  isDefault?: boolean;
}) => {
  return prisma.industryFieldPreset.create({
    data,
  });
};

// ==================== AI SCRIPT TEMPLATES ====================

export const getAIScriptTemplates = async (industry: IndustryType, purpose?: string) => {
  const where: any = { industry };
  if (purpose) where.purpose = purpose;

  return prisma.industryAIScriptTemplate.findMany({
    where,
    orderBy: { isDefault: 'desc' },
  });
};

export const createAIScriptTemplate = async (data: {
  industry: IndustryType;
  name: string;
  description?: string;
  purpose: string;
  greeting: string;
  questions: any;
  objectionHandling?: any;
  closingScript?: string;
  voiceId?: string;
  language?: string;
  isDefault?: boolean;
}) => {
  return prisma.industryAIScriptTemplate.create({
    data,
  });
};

// ==================== ROLE TEMPLATES ====================

export const getRoleTemplates = async (industry: IndustryType) => {
  return prisma.industryRoleTemplate.findMany({
    where: { industry },
    orderBy: { isDefault: 'desc' },
  });
};

export const createRoleTemplate = async (data: {
  industry: IndustryType;
  roleName: string;
  description?: string;
  permissions: any;
  isDefault?: boolean;
}) => {
  return prisma.industryRoleTemplate.create({
    data,
  });
};

// ==================== APPLY TEMPLATE TO ORGANIZATION ====================

export const applyTemplateToOrganization = async (
  organizationId: string,
  templateId: string
) => {
  const template = await prisma.industryTemplate.findUnique({
    where: { id: templateId },
  });

  if (!template) {
    throw new Error('Template not found');
  }

  // Start a transaction
  await prisma.$transaction(async (tx) => {
    // 1. Create or update tenant configuration
    const config = await tx.tenantConfiguration.upsert({
      where: { organizationId },
      create: {
        organizationId,
        industry: template.industry,
        templateId: template.id,
        isConfigured: true,
        configuredAt: new Date(),
        enabledModules: template.enabledFeatures || [],
      },
      update: {
        industry: template.industry,
        templateId: template.id,
        isConfigured: true,
        configuredAt: new Date(),
        enabledModules: template.enabledFeatures || [],
      },
    });

    // 2. Create tenant labels from template
    const labels = template.defaultLabels as Record<string, { singular: string; plural: string; icon?: string }>;
    if (labels && typeof labels === 'object') {
      // Delete existing labels
      await tx.tenantLabel.deleteMany({
        where: { configId: config.id },
      });

      // Create new labels
      const labelEntries = Object.entries(labels);
      for (const [entityKey, labelData] of labelEntries) {
        await tx.tenantLabel.create({
          data: {
            configId: config.id,
            entityKey,
            singularLabel: labelData.singular,
            pluralLabel: labelData.plural,
            icon: labelData.icon,
          },
        });
      }
    }

    // 3. Create lead stages from template pipeline
    const pipeline = template.defaultPipeline as Array<{
      name: string;
      order: number;
      color: string;
      probability?: number;
      journeyOrder?: number;
      autoSyncStatus?: string;
    }>;
    if (Array.isArray(pipeline)) {
      // Check for existing stages
      const existingStages = await tx.leadStage.findMany({
        where: { organizationId },
      });

      // Only create stages if none exist
      if (existingStages.length === 0) {
        for (const stage of pipeline) {
          await tx.leadStage.create({
            data: {
              organizationId,
              name: stage.name,
              order: stage.order,
              journeyOrder: stage.journeyOrder ?? stage.order, // Use journeyOrder or fallback to order
              color: stage.color || '#6B7280',
              autoSyncStatus: stage.autoSyncStatus || null,
              isSystemStage: true,
              templateSlug: template.slug,
            },
          });
        }
      }
    }

    // 4. Create custom fields from template
    const fields = template.defaultFields as Array<{
      name: string;
      label: string;
      type: string;
      options?: string[];
      required?: boolean;
    }>;
    if (Array.isArray(fields)) {
      for (const field of fields) {
        // Check if field already exists
        const existing = await tx.customField.findFirst({
          where: { organizationId, name: field.name },
        });

        if (!existing) {
          await tx.customField.create({
            data: {
              organizationId,
              name: field.name,
              label: field.label,
              type: field.type as any,
              options: field.options || [],
              isRequired: field.required || false,
              showInTable: true,
            },
          });
        }
      }
    }

    // 5. Create roles from template
    const roles = template.defaultRoles as Array<{
      name: string;
      description?: string;
      permissions: string[];
    }>;
    if (Array.isArray(roles)) {
      for (const role of roles) {
        // Check if role already exists
        const existing = await tx.role.findFirst({
          where: { organizationId, name: role.name },
        });

        if (!existing) {
          await tx.role.create({
            data: {
              organizationId,
              name: role.name,
              description: role.description,
              permissions: role.permissions,
              isSystem: false,
            },
          });
        }
      }
    }

    // 6. Update organization's industry
    await tx.organization.update({
      where: { id: organizationId },
      data: {
        industry: template.industry as any,
      },
    });

    // 7. Increment template usage count
    await tx.industryTemplate.update({
      where: { id: templateId },
      data: {
        usageCount: { increment: 1 },
      },
    });

    return config;
  });

  // 8. Create dynamic field definitions for this industry (outside transaction)
  // Delete existing industry fields first
  await deleteIndustryFields(organizationId);
  // Create new fields based on industry
  await createIndustryFields(organizationId, template.industry);

  // Return the tenant config
  return prisma.tenantConfiguration.findUnique({
    where: { organizationId },
    include: { labels: true },
  });
};

// ==================== SEED DEFAULT TEMPLATES ====================

export const seedDefaultTemplates = async () => {
  const templates = [
    {
      name: 'Education CRM',
      slug: 'education',
      description: 'Complete CRM solution for educational institutions, coaching centers, and edtech companies. Track student inquiries, manage admissions, and automate follow-ups.',
      industry: IndustryType.EDUCATION,
      icon: 'AcademicCapIcon',
      isSystem: true,
      isPopular: true,
      defaultLabels: {
        lead: { singular: 'Student', plural: 'Students' },
        deal: { singular: 'Admission', plural: 'Admissions' },
        followUp: { singular: 'Counseling', plural: 'Counselings' },
        payment: { singular: 'Fee', plural: 'Fees' },
        agent: { singular: 'Counselor', plural: 'Counselors' },
      },
      defaultPipeline: [
        { name: 'New Inquiry', order: 1, journeyOrder: 1, color: '#6B7280', probability: 10 },
        { name: 'Contacted', order: 2, journeyOrder: 2, color: '#3B82F6', probability: 20 },
        { name: 'Interested', order: 3, journeyOrder: 3, color: '#8B5CF6', probability: 30 },
        { name: 'Qualified', order: 4, journeyOrder: 4, color: '#06B6D4', probability: 40 },
        { name: 'Visit Scheduled', order: 5, journeyOrder: 5, color: '#F59E0B', probability: 50 },
        { name: 'Visit Completed', order: 6, journeyOrder: 6, color: '#A855F7', probability: 60 },
        { name: 'Documents Pending', order: 7, journeyOrder: 7, color: '#F97316', probability: 70 },
        { name: 'Processing', order: 8, journeyOrder: 8, color: '#EAB308', probability: 80 },
        { name: 'Payment Pending', order: 9, journeyOrder: 9, color: '#F59E0B', probability: 85 },
        { name: 'Admitted', order: 10, journeyOrder: 10, color: '#22C55E', probability: 100, autoSyncStatus: 'WON' },
        { name: 'Dropped', order: 11, journeyOrder: -1, color: '#EF4444', probability: 0, autoSyncStatus: 'LOST' },
      ],
      defaultFields: [
        { name: 'course', label: 'Course Interested', type: 'SELECT', options: ['B.Tech', 'MBA', 'BBA', 'B.Com', 'Other'], required: true },
        { name: 'class_12_percentage', label: '12th Percentage', type: 'NUMBER', required: false },
        { name: 'parent_name', label: 'Parent Name', type: 'TEXT', required: false },
        { name: 'parent_phone', label: 'Parent Phone', type: 'PHONE', required: false },
        { name: 'preferred_intake', label: 'Preferred Intake', type: 'SELECT', options: ['2024', '2025', '2026'], required: false },
      ],
      defaultRoles: [
        { name: 'Counselor', description: 'Student counselor', permissions: ['leads.view', 'leads.create', 'leads.edit', 'calls.make', 'followups.manage'] },
        { name: 'Admission Officer', description: 'Handles admissions', permissions: ['leads.view', 'leads.edit', 'admissions.manage', 'payments.view', 'reports.view'] },
        { name: 'Branch Manager', description: 'Branch head', permissions: ['leads.view', 'leads.edit', 'users.view', 'reports.view', 'analytics.view'] },
      ],
      enabledFeatures: ['leads', 'calls', 'followups', 'admissions', 'fees', 'campus_visits', 'reports'],
    },
    {
      name: 'Real Estate CRM',
      slug: 'real-estate',
      description: 'Powerful CRM for real estate agents, brokers, and property developers. Manage property listings, client inquiries, site visits, and deal closures.',
      industry: IndustryType.REAL_ESTATE,
      icon: 'BuildingOfficeIcon',
      isSystem: true,
      isPopular: true,
      defaultLabels: {
        lead: { singular: 'Buyer', plural: 'Buyers' },
        deal: { singular: 'Booking', plural: 'Bookings' },
        followUp: { singular: 'Site Visit', plural: 'Site Visits' },
        payment: { singular: 'Payment', plural: 'Payments' },
        agent: { singular: 'Agent', plural: 'Agents' },
      },
      defaultPipeline: [
        { name: 'New Lead', order: 1, journeyOrder: 1, color: '#6B7280', probability: 10 },
        { name: 'Qualified', order: 2, journeyOrder: 2, color: '#3B82F6', probability: 25 },
        { name: 'Site Visit Scheduled', order: 3, journeyOrder: 3, color: '#8B5CF6', probability: 40 },
        { name: 'Site Visit Done', order: 4, journeyOrder: 4, color: '#F59E0B', probability: 55 },
        { name: 'Negotiation', order: 5, journeyOrder: 5, color: '#EF4444', probability: 70 },
        { name: 'Booking', order: 6, journeyOrder: 6, color: '#10B981', probability: 90 },
        { name: 'Registration', order: 7, journeyOrder: 7, color: '#22C55E', probability: 100, autoSyncStatus: 'WON' },
        { name: 'Lost', order: 8, journeyOrder: -1, color: '#DC2626', probability: 0, autoSyncStatus: 'LOST' },
      ],
      defaultFields: [
        { name: 'property_type', label: 'Property Type', type: 'SELECT', options: ['Apartment', 'Villa', 'Plot', 'Commercial', 'Office'], required: true },
        { name: 'budget_min', label: 'Budget Min (Lakhs)', type: 'NUMBER', required: false },
        { name: 'budget_max', label: 'Budget Max (Lakhs)', type: 'NUMBER', required: false },
        { name: 'preferred_location', label: 'Preferred Location', type: 'TEXT', required: false },
        { name: 'possession_timeline', label: 'Possession Timeline', type: 'SELECT', options: ['Ready to Move', '6 Months', '1 Year', '2+ Years'], required: false },
      ],
      defaultRoles: [
        { name: 'Sales Agent', description: 'Property sales agent', permissions: ['leads.view', 'leads.create', 'leads.edit', 'calls.make', 'site_visits.manage'] },
        { name: 'Channel Partner', description: 'External broker', permissions: ['leads.view', 'leads.create', 'site_visits.view'] },
        { name: 'Sales Manager', description: 'Sales team manager', permissions: ['leads.view', 'leads.edit', 'users.view', 'reports.view', 'analytics.view'] },
      ],
      enabledFeatures: ['leads', 'calls', 'site_visits', 'bookings', 'payments', 'inventory', 'reports'],
    },
    {
      name: 'Healthcare CRM',
      slug: 'healthcare',
      description: 'HIPAA-compliant CRM for hospitals, clinics, and healthcare providers. Manage patient inquiries, appointments, and follow-up care.',
      industry: IndustryType.HEALTHCARE,
      icon: 'HeartIcon',
      isSystem: true,
      isPopular: true,
      defaultLabels: {
        lead: { singular: 'Patient', plural: 'Patients' },
        deal: { singular: 'Treatment', plural: 'Treatments' },
        followUp: { singular: 'Appointment', plural: 'Appointments' },
        payment: { singular: 'Bill', plural: 'Bills' },
        agent: { singular: 'Staff', plural: 'Staff' },
      },
      defaultPipeline: [
        { name: 'New Inquiry', order: 1, color: '#6B7280', probability: 10 },
        { name: 'Consultation Scheduled', order: 2, color: '#3B82F6', probability: 30 },
        { name: 'Consultation Done', order: 3, color: '#8B5CF6', probability: 50 },
        { name: 'Treatment Plan', order: 4, color: '#F59E0B', probability: 70 },
        { name: 'Treatment Started', order: 5, color: '#10B981', probability: 85 },
        { name: 'Treatment Completed', order: 6, color: '#22C55E', probability: 100 },
        { name: 'Follow-up Care', order: 7, color: '#059669', probability: 100 },
      ],
      defaultFields: [
        { name: 'department', label: 'Department', type: 'SELECT', options: ['Cardiology', 'Orthopedics', 'General', 'Pediatrics', 'Dental'], required: true },
        { name: 'symptoms', label: 'Symptoms', type: 'TEXTAREA', required: false },
        { name: 'preferred_doctor', label: 'Preferred Doctor', type: 'TEXT', required: false },
        { name: 'insurance_provider', label: 'Insurance Provider', type: 'TEXT', required: false },
        { name: 'emergency_contact', label: 'Emergency Contact', type: 'PHONE', required: false },
      ],
      defaultRoles: [
        { name: 'Receptionist', description: 'Front desk staff', permissions: ['leads.view', 'leads.create', 'appointments.manage'] },
        { name: 'Doctor', description: 'Medical doctor', permissions: ['leads.view', 'leads.edit', 'treatments.manage', 'reports.view'] },
        { name: 'Admin', description: 'Hospital admin', permissions: ['leads.view', 'leads.edit', 'users.manage', 'reports.view', 'billing.manage'] },
      ],
      enabledFeatures: ['leads', 'appointments', 'treatments', 'billing', 'prescriptions', 'reports'],
    },
    {
      name: 'Insurance CRM',
      slug: 'insurance',
      description: 'Complete CRM for insurance agents and companies. Manage policy inquiries, renewals, and claims processing.',
      industry: IndustryType.INSURANCE,
      icon: 'ShieldCheckIcon',
      isSystem: true,
      isPopular: false,
      defaultLabels: {
        lead: { singular: 'Prospect', plural: 'Prospects' },
        deal: { singular: 'Policy', plural: 'Policies' },
        followUp: { singular: 'Meeting', plural: 'Meetings' },
        payment: { singular: 'Premium', plural: 'Premiums' },
        agent: { singular: 'Advisor', plural: 'Advisors' },
      },
      defaultPipeline: [
        { name: 'New Lead', order: 1, color: '#6B7280', probability: 10 },
        { name: 'Needs Analysis', order: 2, color: '#3B82F6', probability: 25 },
        { name: 'Proposal Sent', order: 3, color: '#8B5CF6', probability: 45 },
        { name: 'Negotiation', order: 4, color: '#F59E0B', probability: 65 },
        { name: 'Application', order: 5, color: '#10B981', probability: 80 },
        { name: 'Underwriting', order: 6, color: '#EAB308', probability: 90 },
        { name: 'Policy Issued', order: 7, color: '#22C55E', probability: 100 },
      ],
      defaultFields: [
        { name: 'insurance_type', label: 'Insurance Type', type: 'SELECT', options: ['Life', 'Health', 'Motor', 'Home', 'Travel', 'Business'], required: true },
        { name: 'sum_assured', label: 'Sum Assured', type: 'NUMBER', required: false },
        { name: 'annual_income', label: 'Annual Income', type: 'NUMBER', required: false },
        { name: 'existing_policies', label: 'Existing Policies', type: 'TEXTAREA', required: false },
        { name: 'nominee_name', label: 'Nominee Name', type: 'TEXT', required: false },
      ],
      defaultRoles: [
        { name: 'Insurance Agent', description: 'Field agent', permissions: ['leads.view', 'leads.create', 'leads.edit', 'policies.create', 'calls.make'] },
        { name: 'Underwriter', description: 'Risk assessor', permissions: ['leads.view', 'policies.review', 'policies.approve'] },
        { name: 'Branch Manager', description: 'Branch head', permissions: ['leads.view', 'users.manage', 'reports.view', 'analytics.view'] },
      ],
      enabledFeatures: ['leads', 'policies', 'renewals', 'claims', 'premiums', 'reports'],
    },
    {
      name: 'Automotive CRM',
      slug: 'automotive',
      description: 'CRM for car dealerships, showrooms, and automobile service centers. Track test drives, bookings, and service appointments.',
      industry: IndustryType.AUTOMOTIVE,
      icon: 'TruckIcon',
      isSystem: true,
      isPopular: false,
      defaultLabels: {
        lead: { singular: 'Customer', plural: 'Customers' },
        deal: { singular: 'Booking', plural: 'Bookings' },
        followUp: { singular: 'Test Drive', plural: 'Test Drives' },
        payment: { singular: 'Payment', plural: 'Payments' },
        agent: { singular: 'Sales Executive', plural: 'Sales Executives' },
      },
      defaultPipeline: [
        { name: 'Inquiry', order: 1, color: '#6B7280', probability: 10 },
        { name: 'Showroom Visit', order: 2, color: '#3B82F6', probability: 25 },
        { name: 'Test Drive', order: 3, color: '#8B5CF6', probability: 45 },
        { name: 'Quotation', order: 4, color: '#F59E0B', probability: 60 },
        { name: 'Negotiation', order: 5, color: '#EF4444', probability: 75 },
        { name: 'Booking', order: 6, color: '#10B981', probability: 90 },
        { name: 'Delivery', order: 7, color: '#22C55E', probability: 100 },
      ],
      defaultFields: [
        { name: 'vehicle_model', label: 'Vehicle Model', type: 'SELECT', options: [], required: true },
        { name: 'variant', label: 'Variant', type: 'TEXT', required: false },
        { name: 'budget', label: 'Budget', type: 'NUMBER', required: false },
        { name: 'exchange_vehicle', label: 'Exchange Vehicle', type: 'TEXT', required: false },
        { name: 'finance_required', label: 'Finance Required', type: 'SELECT', options: ['Yes', 'No', 'Maybe'], required: false },
      ],
      defaultRoles: [
        { name: 'Sales Executive', description: 'Showroom sales', permissions: ['leads.view', 'leads.create', 'leads.edit', 'test_drives.manage'] },
        { name: 'Sales Manager', description: 'Sales team lead', permissions: ['leads.view', 'leads.edit', 'users.view', 'reports.view', 'discounts.approve'] },
        { name: 'Finance Executive', description: 'Handles financing', permissions: ['leads.view', 'finance.manage', 'documents.verify'] },
      ],
      enabledFeatures: ['leads', 'test_drives', 'bookings', 'inventory', 'finance', 'service', 'reports'],
    },
    {
      name: 'IT Services CRM',
      slug: 'it-services',
      description: 'CRM for IT companies, software agencies, and tech consultants. Manage project inquiries, proposals, and client relationships.',
      industry: IndustryType.IT_SERVICES,
      icon: 'ComputerDesktopIcon',
      isSystem: true,
      isPopular: false,
      defaultLabels: {
        lead: { singular: 'Prospect', plural: 'Prospects' },
        deal: { singular: 'Project', plural: 'Projects' },
        followUp: { singular: 'Meeting', plural: 'Meetings' },
        payment: { singular: 'Invoice', plural: 'Invoices' },
        agent: { singular: 'BDE', plural: 'BDEs' },
      },
      defaultPipeline: [
        { name: 'New Lead', order: 1, color: '#6B7280', probability: 10 },
        { name: 'Discovery Call', order: 2, color: '#3B82F6', probability: 20 },
        { name: 'Requirements', order: 3, color: '#8B5CF6', probability: 35 },
        { name: 'Proposal', order: 4, color: '#F59E0B', probability: 50 },
        { name: 'Negotiation', order: 5, color: '#EF4444', probability: 70 },
        { name: 'Contract', order: 6, color: '#10B981', probability: 90 },
        { name: 'Won', order: 7, color: '#22C55E', probability: 100 },
      ],
      defaultFields: [
        { name: 'service_type', label: 'Service Type', type: 'SELECT', options: ['Web Development', 'Mobile App', 'Cloud Services', 'Consulting', 'Support'], required: true },
        { name: 'project_budget', label: 'Project Budget', type: 'NUMBER', required: false },
        { name: 'timeline', label: 'Expected Timeline', type: 'TEXT', required: false },
        { name: 'tech_stack', label: 'Tech Stack', type: 'TEXTAREA', required: false },
        { name: 'company_size', label: 'Company Size', type: 'SELECT', options: ['1-10', '11-50', '51-200', '200+'], required: false },
      ],
      defaultRoles: [
        { name: 'BDE', description: 'Business Development Executive', permissions: ['leads.view', 'leads.create', 'leads.edit', 'proposals.create'] },
        { name: 'Project Manager', description: 'Handles projects', permissions: ['leads.view', 'projects.manage', 'reports.view'] },
        { name: 'Sales Head', description: 'Sales team lead', permissions: ['leads.view', 'leads.edit', 'users.manage', 'reports.view', 'analytics.view'] },
      ],
      enabledFeatures: ['leads', 'proposals', 'projects', 'invoices', 'contracts', 'reports'],
    },
  ];

  for (const template of templates) {
    const existing = await prisma.industryTemplate.findUnique({
      where: { slug: template.slug },
    });

    if (!existing) {
      await prisma.industryTemplate.create({
        data: template,
      });
    }
  }

  return { message: 'Default templates seeded successfully' };
};

export const industryTemplateService = {
  getAllTemplates,
  getTemplatesByIndustry,
  getTemplateById,
  getTemplateBySlug,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  incrementUsageCount,
  getPipelinePresets,
  getDefaultPipelinePreset,
  createPipelinePreset,
  getFieldPresets,
  getDefaultFieldPreset,
  createFieldPreset,
  getAIScriptTemplates,
  createAIScriptTemplate,
  getRoleTemplates,
  createRoleTemplate,
  applyTemplateToOrganization,
  seedDefaultTemplates,
};
