const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const user = await prisma.user.findFirst({
    where: { email: 'srinivas@ghanasyamedu.com' },
    select: { id: true, organizationId: true }
  });

  const completedStages = ['Admitted', 'ADMITTED', 'Enrolled', 'ENROLLED', 'Won', 'WON', 'Dropped', 'DROPPED', 'Lost', 'LOST', 'Closed', 'CLOSED'];

  // Get all leads with their stages
  const leads = await prisma.lead.findMany({
    where: {
      organizationId: user.organizationId,
      assignments: { some: { assignedToId: user.id, isActive: true } }
    },
    select: { id: true, firstName: true, lastName: true, stage: { select: { name: true } }, nextFollowUpAt: true }
  });

  console.log('All leads for srinivas:', leads.length);
  leads.forEach(l => {
    const stageName = l.stage?.name || 'NO STAGE';
    const isCompleted = completedStages.includes(stageName);
    console.log('  -', l.firstName, l.lastName, '| Stage:', stageName, '| Completed:', isCompleted, '| NextFollowUp:', l.nextFollowUpAt);
  });

  // Count leads in NON-completed stages
  const activeLeads = leads.filter(l => {
    const stageName = l.stage?.name || '';
    return !completedStages.includes(stageName);
  });
  console.log('\nLeads in active stages (should count as needing follow-up):', activeLeads.length);
  activeLeads.forEach(l => console.log('  -', l.firstName, l.lastName, '| Stage:', l.stage?.name || 'NO STAGE'));

  // Check what the actual Prisma query returns
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayEnd = new Date(today);
  todayEnd.setHours(23, 59, 59, 999);

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
  console.log('\nPrisma query result (leadsNeedingFollowUp):', leadsNeedingFollowUp);

  // Check leads with null stage
  const leadsWithNullStage = leads.filter(l => !l.stage);
  console.log('\nLeads with NULL stage:', leadsWithNullStage.length);
  leadsWithNullStage.forEach(l => console.log('  -', l.firstName, l.lastName));
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
