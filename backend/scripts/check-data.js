const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  // Check organization industry
  const orgs = await prisma.organization.findMany({
    select: { id: true, name: true, industry: true }
  });
  console.log('=== ORGANIZATIONS ===');
  orgs.forEach(o => console.log(o.name + ' | Industry: ' + o.industry));

  // Check lead stages for the org
  const stages = await prisma.leadStage.findMany({
    where: { organizationId: orgs[0]?.id },
    orderBy: { order: 'asc' },
    select: { name: true, order: true, autoSyncStatus: true, isSystemStage: true, templateSlug: true }
  });
  console.log('\n=== LEAD STAGES (org-specific) ===');
  stages.forEach(s => console.log(s.order + '. ' + s.name + ' | WON/LOST: ' + (s.autoSyncStatus || '-') + ' | System: ' + s.isSystemStage));

  // Check pipeline stages if they exist
  try {
    const pipelineStages = await prisma.pipelineStage.findMany({
      where: { organizationId: orgs[0]?.id },
      orderBy: { order: 'asc' },
      select: { name: true, order: true, stageType: true }
    });
    console.log('\n=== PIPELINE STAGES ===');
    pipelineStages.forEach(s => console.log(s.order + '. ' + s.name + ' | Type: ' + s.stageType));
  } catch (e) {
    console.log('\n=== PIPELINE STAGES === (not found)');
  }

  await prisma.$disconnect();
}

check().catch(e => { console.error(e); process.exit(1); });
