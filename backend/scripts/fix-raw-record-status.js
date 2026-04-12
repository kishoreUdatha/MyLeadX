const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
  // Find raw records marked as CONVERTED but their leads are NOT actually converted
  const wronglyConverted = await prisma.rawImportRecord.findMany({
    where: { status: 'CONVERTED' },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      convertedLeadId: true,
      convertedLead: {
        select: {
          id: true,
          isConverted: true,
          stage: { select: { name: true } },
          admissions: { select: { id: true } }
        }
      }
    }
  });

  console.log('Checking', wronglyConverted.length, 'CONVERTED raw records...\n');

  for (const record of wronglyConverted) {
    const lead = record.convertedLead;
    const isActuallyConverted = lead?.isConverted || (lead?.admissions && lead.admissions.length > 0);
    const stageName = lead?.stage?.name || 'No Stage';

    if (!isActuallyConverted) {
      console.log('FIXING:', record.firstName, record.lastName);
      console.log('  Lead stage:', stageName, '| isConverted:', lead?.isConverted);
      console.log('  Admissions:', lead?.admissions?.length || 0);

      // Update raw record status back to INTERESTED (since lead was created but not converted)
      await prisma.rawImportRecord.update({
        where: { id: record.id },
        data: { status: 'INTERESTED' }
      });
      console.log('  -> Changed status to INTERESTED\n');
    } else {
      console.log('OK:', record.firstName, record.lastName, '- Actually converted');
    }
  }

  console.log('\nDone!');
}

fix()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
