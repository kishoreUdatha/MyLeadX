const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log('=== DATABASE CHECK ===\n');

    // Count records
    const leads = await prisma.lead.count();
    const rawImports = await prisma.rawImportRecord.count();

    console.log('Record Counts:');
    console.log('  Leads:', leads);
    console.log('  Raw Imports:', rawImports);

    // Check pipelines
    const pipelines = await prisma.pipeline.findMany({
      where: { isActive: true },
      include: {
        stages: {
          where: { isActive: true },
          orderBy: { order: 'asc' }
        }
      }
    });

    console.log('\nPipelines:', pipelines.length);

    if (pipelines.length > 0) {
      for (const p of pipelines) {
        console.log(`\n  [${p.isDefault ? 'DEFAULT' : ''}] ${p.name} (${p.entityType})`);
        console.log('  Stages:', p.stages?.length || 0);

        if (p.stages && p.stages.length > 0) {
          for (const s of p.stages) {
            // Count leads in this stage
            const stageLeadCount = await prisma.lead.count({
              where: { pipelineStageId: s.id }
            });
            console.log(`    - ${s.name} (${stageLeadCount} leads)`);
          }
        }
      }
    } else {
      console.log('  NO PIPELINES CONFIGURED!');
      console.log('  Go to Settings > Pipeline Settings to create one');
    }

    // Check lead sources
    if (leads > 0) {
      const sources = await prisma.lead.groupBy({
        by: ['source'],
        _count: { id: true }
      });
      console.log('\nLead Sources:');
      sources.forEach(s => console.log(`  - ${s.source}: ${s._count.id}`));
    } else {
      console.log('\nNo leads - Lead Sources chart will be empty');
    }

    // Check raw import status breakdown
    if (rawImports > 0) {
      const statuses = await prisma.rawImportRecord.groupBy({
        by: ['status'],
        _count: { id: true }
      });
      console.log('\nRaw Import Status Breakdown:');
      statuses.forEach(s => console.log(`  - ${s.status}: ${s._count.id}`));
    }

  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
