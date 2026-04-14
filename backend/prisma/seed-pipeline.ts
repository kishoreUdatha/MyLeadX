/**
 * Seed Generic Pipeline
 * Run with: npx ts-node prisma/seed-pipeline.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedGenericPipeline() {
  console.log('Seeding generic pipeline...');

  // Get all organizations
  const organizations = await prisma.organization.findMany({
    where: { isActive: true },
  });

  if (organizations.length === 0) {
    console.log('No organizations found. Please create an organization first.');
    return;
  }

  for (const org of organizations) {
    console.log(`\nProcessing organization: ${org.name} (${org.id})`);

    // Check if pipeline already exists
    const existingPipeline = await prisma.pipeline.findFirst({
      where: {
        organizationId: org.id,
        slug: 'sales-pipeline',
      },
    });

    if (existingPipeline) {
      console.log(`  Pipeline already exists for ${org.name}, skipping...`);
      continue;
    }

    // Create the generic sales pipeline
    const pipeline = await prisma.pipeline.create({
      data: {
        organizationId: org.id,
        name: 'Sales Pipeline',
        slug: 'sales-pipeline',
        description: 'Generic sales pipeline for tracking leads through the sales process',
        entityType: 'LEAD',
        color: '#3B82F6',
        isDefault: true,
        isActive: true,
        autoMoveOnStale: null, // null means disabled
        staleAlertDays: 7,
        allowMultiple: false,
      },
    });

    console.log(`  Created pipeline: ${pipeline.name} (${pipeline.id})`);

    // Define stages
    const stages = [
      { name: 'New Lead', slug: 'new-lead', color: '#6B7280', stageType: 'entry', probability: 10, order: 1, expectedDays: 1, slaHours: 24 },
      { name: 'Contacted', slug: 'contacted', color: '#3B82F6', stageType: 'active', probability: 20, order: 2, expectedDays: 3, slaHours: 48 },
      { name: 'Qualified', slug: 'qualified', color: '#8B5CF6', stageType: 'active', probability: 40, order: 3, expectedDays: 5, slaHours: 72 },
      { name: 'Proposal Sent', slug: 'proposal-sent', color: '#F59E0B', stageType: 'active', probability: 60, order: 4, expectedDays: 7, slaHours: 120 },
      { name: 'Negotiation', slug: 'negotiation', color: '#EC4899', stageType: 'active', probability: 80, order: 5, expectedDays: 7, slaHours: 168 },
      { name: 'Won', slug: 'won', color: '#10B981', stageType: 'won', probability: 100, order: 6, expectedDays: null, slaHours: null },
      { name: 'Lost', slug: 'lost', color: '#EF4444', stageType: 'lost', probability: 0, order: 7, expectedDays: null, slaHours: null },
    ];

    // Create stages
    const createdStages: any[] = [];
    for (const stage of stages) {
      const created = await prisma.pipelineStage.create({
        data: {
          pipelineId: pipeline.id,
          name: stage.name,
          slug: stage.slug,
          color: stage.color,
          stageType: stage.stageType,
          probability: stage.probability,
          order: stage.order,
          expectedDays: stage.expectedDays,
          slaHours: stage.slaHours,
          isActive: true,
          requiredFields: [],
          autoActions: {},
          exitActions: {},
        },
      });
      createdStages.push(created);
      console.log(`    Created stage: ${created.name}`);
    }

    // Create transitions (each stage can move to the next, or to Won/Lost)
    const wonStage = createdStages.find(s => s.stageType === 'won');
    const lostStage = createdStages.find(s => s.stageType === 'lost');
    const activeStages = createdStages.filter(s => s.stageType === 'entry' || s.stageType === 'active');

    for (let i = 0; i < activeStages.length; i++) {
      const currentStage = activeStages[i];

      // Can move to next stage
      if (i < activeStages.length - 1) {
        await prisma.pipelineStageTransition.create({
          data: {
            fromStageId: currentStage.id,
            toStageId: activeStages[i + 1].id,
            isAllowed: true,
            requiresApproval: false,
            autoTrigger: false,
            conditions: {},
            triggerActions: {},
            notifyOnTransition: [],
          },
        });
      }

      // Can move to Won
      if (wonStage) {
        await prisma.pipelineStageTransition.create({
          data: {
            fromStageId: currentStage.id,
            toStageId: wonStage.id,
            isAllowed: true,
            requiresApproval: currentStage.order < 4, // Require approval for early wins
            autoTrigger: false,
            conditions: {},
            triggerActions: {},
            notifyOnTransition: [],
          },
        });
      }

      // Can move to Lost
      if (lostStage) {
        await prisma.pipelineStageTransition.create({
          data: {
            fromStageId: currentStage.id,
            toStageId: lostStage.id,
            isAllowed: true,
            requiresApproval: false,
            autoTrigger: false,
            conditions: {},
            triggerActions: {},
            notifyOnTransition: [],
          },
        });
      }
    }

    console.log(`  Created transitions for ${org.name}`);
  }

  console.log('\nGeneric pipeline seeding completed!');
}

seedGenericPipeline()
  .catch((e) => {
    console.error('Error seeding pipeline:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
