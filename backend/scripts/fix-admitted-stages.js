const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
  // Get all organizations
  const orgs = await prisma.organization.findMany({ select: { id: true, name: true } });

  for (const org of orgs) {
    console.log('\nOrganization:', org.name);

    // Find "Admitted" stage
    const admittedStage = await prisma.leadStage.findFirst({
      where: {
        organizationId: org.id,
        name: { in: ['Admitted', 'ADMITTED', 'admitted'] },
      },
    });

    if (!admittedStage) {
      console.log('  No "Admitted" stage found, skipping');
      continue;
    }

    console.log('  Admitted stage ID:', admittedStage.id);

    // Find all leads with active admissions that are NOT in "Admitted" stage
    const leadsWithAdmissions = await prisma.lead.findMany({
      where: {
        organizationId: org.id,
        admissions: {
          some: { status: 'ACTIVE' }
        },
        stageId: { not: admittedStage.id }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        stageId: true,
        stage: { select: { name: true } }
      }
    });

    console.log('  Leads with admissions not in Admitted stage:', leadsWithAdmissions.length);

    for (const lead of leadsWithAdmissions) {
      console.log('    -', lead.firstName, lead.lastName, 'currently in:', lead.stage?.name || 'No stage');

      await prisma.lead.update({
        where: { id: lead.id },
        data: { stageId: admittedStage.id }
      });

      console.log('      Updated to Admitted');
    }
  }

  console.log('\nDone!');
}

fix()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
