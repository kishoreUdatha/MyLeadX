const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  // Get stages for the org
  const stages = await prisma.leadStage.findMany({
    where: { organizationId: '8bd8d25d-827b-416d-81a6-3010a66204e6' },
    select: { id: true, name: true }
  });
  console.log('Stages:', stages.map(s => s.name).join(', '));

  // Get lead count by stage
  const byStage = await prisma.lead.groupBy({
    by: ['stageId'],
    where: { organizationId: '8bd8d25d-827b-416d-81a6-3010a66204e6' },
    _count: true
  });

  console.log('\nLeads by Stage:');
  for (const item of byStage) {
    const stage = stages.find(s => s.id === item.stageId);
    console.log('  ' + (stage?.name || 'NULL/Unassigned') + ': ' + item._count);
  }

  // Check leads with Inquiry stage specifically
  const inquiryStage = stages.find(s => s.name.toLowerCase() === 'inquiry');
  if (inquiryStage) {
    const inquiryLeads = await prisma.lead.findMany({
      where: { stageId: inquiryStage.id, organizationId: '8bd8d25d-827b-416d-81a6-3010a66204e6' },
      select: { id: true, firstName: true, lastName: true, phone: true }
    });
    console.log('\nLeads in Inquiry stage:', inquiryLeads.length);
    inquiryLeads.forEach(l => console.log('  -', l.firstName, l.lastName, l.phone));
  }
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
