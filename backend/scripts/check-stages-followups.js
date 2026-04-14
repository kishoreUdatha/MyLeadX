const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const orgId = '8bd8d25d-827b-416d-81a6-3010a66204e6';
  
  // Check pipeline stages through pipeline
  const stages = await prisma.pipelineStage.findMany({
    where: { pipeline: { organizationId: orgId } },
    select: { name: true }
  });
  console.log('Pipeline stages:', stages.map(s => s.name).join(', '));
  
  // Check leads with their stages
  const leads = await prisma.lead.findMany({
    where: { organizationId: orgId },
    select: { 
      firstName: true, 
      lastName: true, 
      stage: { select: { name: true } },
      lastContactedAt: true,
      createdAt: true
    }
  });
  console.log('\nLeads with stages:');
  leads.forEach(l => console.log('  -', l.firstName, l.lastName, '| stage:', l.stage?.name, '| lastContacted:', l.lastContactedAt));
  
  // Check follow-ups with status
  const followUps = await prisma.followUp.findMany({
    where: { lead: { organizationId: orgId } },
    select: {
      status: true,
      scheduledAt: true,
      assignee: { select: { firstName: true, lastName: true } },
      lead: { select: { firstName: true, lastName: true } }
    }
  });
  console.log('\nFollow-ups:', followUps.length);
  followUps.forEach(f => console.log('  -', f.lead.firstName, f.lead.lastName, '| status:', f.status, '| assignee:', f.assignee?.firstName));
  
  await prisma.$disconnect();
}
check().catch(console.error);
