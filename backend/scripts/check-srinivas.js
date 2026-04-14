const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  // Get srinivas user
  const user = await prisma.user.findFirst({
    where: { email: 'srinivas@ghanasyamedu.com' },
    select: { id: true, firstName: true, organizationId: true, role: { select: { name: true, slug: true } } }
  });
  console.log('User:', user.firstName, '| Role:', user.role?.name);
  console.log('User ID:', user.id);

  // Get leads assigned to srinivas
  const leads = await prisma.lead.findMany({
    where: {
      organizationId: user.organizationId,
      assignments: {
        some: { assignedToId: user.id, isActive: true }
      }
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      stage: { select: { name: true } },
      isConverted: true,
      admissions: { select: { id: true, status: true } }
    }
  });
  console.log('\nLeads assigned to srinivas:', leads.length);
  leads.forEach(l => {
    console.log('  -', l.firstName, l.lastName);
    console.log('    Stage:', l.stage?.name, '| Converted:', l.isConverted);
    console.log('    Admissions:', l.admissions.length);
  });

  // Get stages for the org
  const stages = await prisma.leadStage.findMany({
    where: { organizationId: user.organizationId },
    select: { id: true, name: true }
  });
  console.log('\nOrg stages:', stages.map(s => s.name).join(', '));

  // Count leads by stage for this user
  const byStage = await prisma.lead.groupBy({
    by: ['stageId'],
    where: {
      organizationId: user.organizationId,
      assignments: {
        some: { assignedToId: user.id, isActive: true }
      }
    },
    _count: true
  });

  console.log('\nLeads by stage for srinivas:');
  for (const item of byStage) {
    const stage = stages.find(s => s.id === item.stageId);
    console.log('  ' + (stage?.name || 'No Stage') + ': ' + item._count);
  }
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
