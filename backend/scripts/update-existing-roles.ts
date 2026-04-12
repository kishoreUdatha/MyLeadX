import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Default system roles with comprehensive permissions
const defaultSystemRoles: Array<{ name: string; slug: string; permissions: string[] }> = [
  {
    name: 'Org Admin',
    slug: 'org_admin',
    permissions: [
      // All permissions - full access
      'roles_view', 'roles_create', 'roles_edit', 'roles_delete',
      'leads_view', 'leads_create', 'leads_edit', 'leads_delete', 'leads_import', 'leads_export', 'leads_assign', 'leads_transfer', 'leads_bulk_update', 'leads_view_all',
      'pipeline_view', 'pipeline_manage_stages', 'pipeline_move_leads', 'pipeline_configure',
      'calls_view', 'calls_make', 'calls_receive', 'calls_record', 'calls_delete', 'calls_monitor', 'calls_barge', 'calls_whisper',
      'voice_ai_view', 'voice_ai_create', 'voice_ai_edit', 'voice_ai_deploy', 'voice_ai_analytics',
      'ivr_view', 'ivr_create', 'ivr_edit', 'ivr_delete', 'ivr_publish',
      'followups_view', 'followups_create', 'followups_edit', 'followups_delete', 'followups_view_team',
      'tasks_view', 'tasks_create', 'tasks_edit', 'tasks_delete', 'tasks_assign', 'tasks_view_team',
      'campaigns_view', 'campaigns_create', 'campaigns_edit', 'campaigns_delete', 'campaigns_launch', 'campaigns_analytics',
      'admissions_view', 'admissions_create', 'admissions_edit', 'admissions_approve', 'admissions_cancel',
      'fees_view', 'fees_collect', 'fees_edit', 'fees_refund', 'fees_reports', 'fees_configure',
      'courses_view', 'courses_create', 'courses_edit', 'courses_delete',
      'field_view', 'field_checkin', 'field_visits', 'field_expenses', 'field_tracking', 'field_view_team',
      'quotations_view', 'quotations_create', 'quotations_edit', 'quotations_send', 'quotations_approve',
      'whatsapp_view', 'whatsapp_send', 'whatsapp_bulk', 'whatsapp_templates', 'whatsapp_chatbot',
      'email_view', 'email_send', 'email_bulk', 'email_templates', 'email_sequences',
      'sms_view', 'sms_send', 'sms_bulk', 'sms_templates',
      'live_chat_view', 'live_chat_respond', 'live_chat_transfer', 'live_chat_configure',
      'reports_view', 'reports_export', 'reports_user', 'reports_campaign', 'reports_call', 'reports_admission', 'reports_payment', 'reports_custom',
      'analytics_view', 'analytics_ai_scoring', 'analytics_sentiment', 'analytics_predictive', 'analytics_export',
      'dashboard_view', 'dashboard_analytics', 'dashboard_team', 'dashboard_customize',
      'team_view', 'team_create', 'team_edit', 'team_monitor', 'team_targets',
      'users_view', 'users_create', 'users_edit', 'users_delete', 'users_activate', 'users_reset_password',
      'integrations_view', 'integrations_facebook', 'integrations_google', 'integrations_indiamart', 'integrations_justdial', 'integrations_zapier', 'integrations_api',
      'workflows_view', 'workflows_create', 'workflows_edit', 'workflows_delete', 'workflows_activate',
      'gamification_view', 'gamification_configure', 'gamification_rewards',
      'compliance_view', 'compliance_edit', 'audit_logs_view', 'audit_logs_export',
      'settings_view', 'settings_general', 'settings_lead_sources', 'settings_lead_stages', 'settings_custom_fields', 'settings_templates', 'settings_notifications',
      'data_import', 'data_export', 'data_bulk_delete', 'data_deduplication', 'data_backup',
    ],
  },
  {
    name: 'Manager',
    slug: 'manager',
    permissions: [
      'roles_view',
      'leads_view', 'leads_create', 'leads_edit', 'leads_import', 'leads_export', 'leads_assign', 'leads_transfer', 'leads_view_all',
      'pipeline_view', 'pipeline_move_leads',
      'calls_view', 'calls_make', 'calls_receive', 'calls_record', 'calls_monitor',
      'voice_ai_view', 'voice_ai_analytics',
      'ivr_view',
      'followups_view', 'followups_create', 'followups_edit', 'followups_view_team',
      'tasks_view', 'tasks_create', 'tasks_edit', 'tasks_assign', 'tasks_view_team',
      'campaigns_view', 'campaigns_create', 'campaigns_edit', 'campaigns_analytics',
      'admissions_view', 'admissions_create', 'admissions_edit', 'admissions_approve',
      'fees_view', 'fees_collect', 'fees_edit', 'fees_reports',
      'courses_view',
      'field_view', 'field_view_team',
      'quotations_view', 'quotations_create', 'quotations_edit', 'quotations_send',
      'whatsapp_view', 'whatsapp_send', 'whatsapp_bulk',
      'email_view', 'email_send', 'email_bulk',
      'sms_view', 'sms_send',
      'live_chat_view', 'live_chat_respond', 'live_chat_transfer',
      'reports_view', 'reports_export', 'reports_user', 'reports_campaign', 'reports_call', 'reports_admission', 'reports_payment',
      'analytics_view', 'analytics_ai_scoring',
      'dashboard_view', 'dashboard_analytics', 'dashboard_team',
      'team_view', 'team_monitor', 'team_targets',
      'users_view',
      'integrations_view',
      'workflows_view',
      'gamification_view',
      'compliance_view', 'audit_logs_view',
      'settings_view',
      'data_import', 'data_export',
    ],
  },
  {
    name: 'Team Leader',
    slug: 'team_lead',
    permissions: [
      'leads_view', 'leads_create', 'leads_edit', 'leads_assign', 'leads_view_all',
      'pipeline_view', 'pipeline_move_leads',
      'calls_view', 'calls_make', 'calls_receive', 'calls_record', 'calls_monitor',
      'voice_ai_view',
      'followups_view', 'followups_create', 'followups_edit', 'followups_view_team',
      'tasks_view', 'tasks_create', 'tasks_edit', 'tasks_assign', 'tasks_view_team',
      'campaigns_view',
      'admissions_view', 'admissions_create', 'admissions_edit',
      'fees_view', 'fees_collect',
      'field_view', 'field_view_team',
      'quotations_view', 'quotations_create', 'quotations_send',
      'whatsapp_view', 'whatsapp_send',
      'email_view', 'email_send',
      'sms_view', 'sms_send',
      'live_chat_view', 'live_chat_respond',
      'reports_view', 'reports_user', 'reports_call',
      'dashboard_view', 'dashboard_team',
      'team_view', 'team_monitor',
      'gamification_view',
    ],
  },
  {
    name: 'Tele Caller',
    slug: 'telecaller',
    permissions: [
      'leads_view', 'leads_edit',
      'pipeline_view', 'pipeline_move_leads',
      'calls_view', 'calls_make', 'calls_receive', 'calls_record',
      'followups_view', 'followups_create', 'followups_edit',
      'tasks_view', 'tasks_create', 'tasks_edit',
      'admissions_view', 'admissions_create',
      'fees_view',
      'whatsapp_view', 'whatsapp_send',
      'email_view', 'email_send',
      'sms_view', 'sms_send',
      'live_chat_view', 'live_chat_respond',
      'dashboard_view',
      'gamification_view',
    ],
  },
  {
    name: 'Field Executive',
    slug: 'field_executive',
    permissions: [
      'leads_view', 'leads_edit',
      'pipeline_view', 'pipeline_move_leads',
      'calls_view', 'calls_make', 'calls_receive',
      'followups_view', 'followups_create', 'followups_edit',
      'tasks_view', 'tasks_create', 'tasks_edit',
      'admissions_view', 'admissions_create',
      'fees_view', 'fees_collect',
      'field_view', 'field_checkin', 'field_visits', 'field_expenses', 'field_tracking',
      'quotations_view', 'quotations_create', 'quotations_send',
      'whatsapp_view', 'whatsapp_send',
      'sms_view', 'sms_send',
      'dashboard_view',
      'gamification_view',
    ],
  },
  {
    name: 'Counselor',
    slug: 'counselor',
    permissions: [
      'leads_view', 'leads_create', 'leads_edit',
      'pipeline_view', 'pipeline_move_leads',
      'calls_view', 'calls_make', 'calls_receive', 'calls_record',
      'followups_view', 'followups_create', 'followups_edit',
      'tasks_view', 'tasks_create', 'tasks_edit',
      'admissions_view', 'admissions_create', 'admissions_edit',
      'fees_view', 'fees_collect',
      'courses_view',
      'whatsapp_view', 'whatsapp_send',
      'email_view', 'email_send',
      'sms_view', 'sms_send',
      'dashboard_view',
      'gamification_view',
    ],
  },
  {
    name: 'Accounts',
    slug: 'accounts',
    permissions: [
      'leads_view',
      'admissions_view',
      'fees_view', 'fees_collect', 'fees_edit', 'fees_refund', 'fees_reports', 'fees_configure',
      'reports_view', 'reports_export', 'reports_payment', 'reports_admission',
      'dashboard_view',
      'data_export',
    ],
  },
];

// Mapping from old slugs to new role config
const slugMapping: Record<string, string> = {
  'admin': 'org_admin',
  'org_admin': 'org_admin',
  'manager': 'manager',
  'team_lead': 'team_lead',
  'team_leader': 'team_lead',
  'telecaller': 'telecaller',
  'tele_caller': 'telecaller',
  'field_executive': 'field_executive',
  'counselor': 'counselor',
  'accounts': 'accounts',
  'sales_rep': 'telecaller', // Map sales_rep to telecaller permissions
  'support': 'accounts', // Map support to accounts permissions
};

async function updateExistingRoles() {
  console.log('Starting role migration...\n');

  // Get all organizations
  const organizations = await prisma.organization.findMany({
    select: { id: true, name: true },
  });

  console.log(`Found ${organizations.length} organizations\n`);

  for (const org of organizations) {
    console.log(`\nProcessing organization: ${org.name} (${org.id})`);

    // Get existing roles for this organization
    const existingRoles = await prisma.role.findMany({
      where: { organizationId: org.id },
      include: { users: { select: { id: true } } },
    });

    console.log(`  Found ${existingRoles.length} existing roles`);

    // Update existing roles with new permissions
    for (const existingRole of existingRoles) {
      const mappedSlug = slugMapping[existingRole.slug.toLowerCase()];
      const roleConfig = defaultSystemRoles.find(r => r.slug === mappedSlug);

      if (roleConfig) {
        console.log(`  Updating role: ${existingRole.name} (${existingRole.slug}) -> ${roleConfig.permissions.length} permissions`);

        await prisma.role.update({
          where: { id: existingRole.id },
          data: {
            permissions: roleConfig.permissions,
            isSystem: true,
          },
        });
      } else {
        console.log(`  Skipping role: ${existingRole.name} (${existingRole.slug}) - no mapping found`);
      }
    }

    // Check for missing default roles and create them
    const existingSlugs = existingRoles.map(r => slugMapping[r.slug.toLowerCase()] || r.slug.toLowerCase());

    for (const roleConfig of defaultSystemRoles) {
      if (!existingSlugs.includes(roleConfig.slug)) {
        console.log(`  Creating missing role: ${roleConfig.name} (${roleConfig.slug})`);

        await prisma.role.create({
          data: {
            organizationId: org.id,
            name: roleConfig.name,
            slug: roleConfig.slug,
            permissions: roleConfig.permissions,
            isSystem: true,
          },
        });
      }
    }

    console.log(`  Done processing ${org.name}`);
  }

  console.log('\n\nRole migration completed!');
}

updateExistingRoles()
  .catch((e) => {
    console.error('Error during migration:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
