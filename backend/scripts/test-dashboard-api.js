const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  // Get srinivas user
  const user = await prisma.user.findFirst({
    where: { email: 'srinivas@ghanasyamedu.com' },
    select: { id: true, firstName: true, organizationId: true }
  });
  console.log('User:', user.firstName, '| ID:', user.id);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayEnd = new Date(today);
  todayEnd.setHours(23, 59, 59, 999);

  const targetUserIds = [user.id];

  // Simulate the dashboard API queries
  const [
    assignedLeadsCount,
    assignedRawRecordsCount,
    totalRawRecordsAssigned,
    todayFollowUpsTarget,
    pendingFollowUps,
  ] = await Promise.all([
    prisma.leadAssignment.count({
      where: { assignedToId: { in: targetUserIds }, isActive: true },
    }),
    prisma.rawImportRecord.count({
      where: {
        assignedToId: { in: targetUserIds },
        status: { in: ['ASSIGNED', 'PENDING'] },
      },
    }),
    prisma.rawImportRecord.count({
      where: { assignedToId: { in: targetUserIds } },
    }),
    prisma.followUp.count({
      where: {
        assigneeId: { in: targetUserIds },
        status: 'UPCOMING',
        scheduledAt: { gte: today, lte: todayEnd },
      },
    }),
    prisma.followUp.count({
      where: {
        assigneeId: { in: targetUserIds },
        status: 'UPCOMING',
      },
    }),
  ]);

  console.log('\n=== Dashboard Data for Srinivas ===');
  console.log('Assigned Leads:', assignedLeadsCount);
  console.log('Raw Records (ASSIGNED/PENDING):', assignedRawRecordsCount);
  console.log('Total Raw Records:', totalRawRecordsAssigned);
  console.log('Today Follow-ups Target:', todayFollowUpsTarget);
  console.log('Pending Follow-ups (all):', pendingFollowUps);

  // Check leads with stages
  const leadsWithStages = await prisma.lead.findMany({
    where: {
      organizationId: user.organizationId,
      assignments: { some: { assignedToId: { in: targetUserIds }, isActive: true } },
    },
    select: { stage: { select: { name: true } } },
  });

  const leadsByStage = {};
  leadsWithStages.forEach(lead => {
    const stageName = lead.stage?.name || 'New';
    leadsByStage[stageName] = (leadsByStage[stageName] || 0) + 1;
  });

  console.log('\n=== Leads by Stage ===');
  console.log(leadsByStage);

  console.log('\n=== What Dashboard Should Show ===');
  console.log('KPI Cards:');
  console.log('  Leads:', leadsWithStages.length);
  console.log('  Follow-ups: 0 +', pendingFollowUps);
  console.log('Assigned Data:');
  console.log('  Total Assigned:', totalRawRecordsAssigned);
  console.log('  Pending Calls:', assignedRawRecordsCount);
  console.log('Lead Pipeline:', JSON.stringify(leadsByStage, null, 2));

  // Check inquiry leads
  const inquiryLeads = await prisma.lead.findMany({
    where: {
      organizationId: user.organizationId,
      assignments: { some: { assignedToId: user.id, isActive: true } },
      stage: { name: { contains: 'Inquiry', mode: 'insensitive' } }
    },
    select: { id: true, firstName: true, lastName: true, nextFollowUpAt: true, createdAt: true }
  });
  console.log('\n=== Inquiry Stage Leads ===');
  inquiryLeads.forEach(l => {
    console.log('  -', l.firstName, l.lastName);
    console.log('    Next Follow-up:', l.nextFollowUpAt);
    console.log('    Created:', l.createdAt);
  });

  // New query: leads needing follow-up
  const completedStages = ['Admitted', 'ADMITTED', 'Enrolled', 'ENROLLED', 'Won', 'WON', 'Dropped', 'DROPPED', 'Lost', 'LOST', 'Closed', 'CLOSED'];
  const leadsNeedingFollowUp = await prisma.lead.count({
    where: {
      organizationId: user.organizationId,
      assignments: { some: { assignedToId: user.id, isActive: true } },
      OR: [
        { nextFollowUpAt: { lte: todayEnd } },
        { stage: { name: { notIn: completedStages } } }
      ]
    },
  });
  console.log('\n=== NEW: Leads Needing Follow-up ===');
  console.log('Count:', leadsNeedingFollowUp);
  console.log('Total Pending Follow-ups (FollowUp table + leads needing attention):', pendingFollowUps + leadsNeedingFollowUp);
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
