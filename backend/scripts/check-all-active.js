const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const user = await prisma.user.findFirst({
    where: { email: 'srinivas@ghanasyamedu.com' },
    select: { id: true, organizationId: true }
  });

  const completedStages = ['Admitted', 'ADMITTED', 'Enrolled', 'ENROLLED', 'Won', 'WON', 'Dropped', 'DROPPED', 'Lost', 'LOST', 'Closed', 'CLOSED'];

  // ALL leads assigned to srinivas
  const allLeads = await prisma.lead.findMany({
    where: {
      organizationId: user.organizationId,
      assignments: { some: { assignedToId: user.id, isActive: true } }
    },
    select: { id: true, firstName: true, lastName: true, stage: { select: { name: true } } }
  });
  console.log('Total leads assigned to srinivas:', allLeads.length);

  // Group by stage
  const byStage = {};
  allLeads.forEach(l => {
    const stage = l.stage?.name || 'NO STAGE';
    byStage[stage] = (byStage[stage] || 0) + 1;
  });
  console.log('By stage:', byStage);

  // Active leads (needing follow-up)
  const activeLeads = allLeads.filter(l => !completedStages.includes(l.stage?.name || ''));
  console.log('\nActive leads (need follow-up):', activeLeads.length);
  activeLeads.forEach(l => console.log('  -', l.firstName, l.lastName, '| Stage:', l.stage?.name || 'NO STAGE'));

  // Also check if there are leads with NULL stage
  const nullStageLeads = allLeads.filter(l => !l.stage);
  console.log('\nLeads with NULL stage:', nullStageLeads.length);
  nullStageLeads.forEach(l => console.log('  -', l.firstName, l.lastName));

  // Run the exact query from the API
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayEnd = new Date(today);
  todayEnd.setHours(23, 59, 59, 999);

  const queryResult = await prisma.lead.count({
    where: {
      organizationId: user.organizationId,
      assignments: { some: { assignedToId: user.id, isActive: true } },
      OR: [
        { nextFollowUpAt: { lte: todayEnd } },
        { stage: { name: { notIn: completedStages } } }
      ]
    },
  });
  console.log('\nExact API query result:', queryResult);
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
