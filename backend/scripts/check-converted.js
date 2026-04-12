const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  // Get all CONVERTED raw records
  const converted = await prisma.rawImportRecord.findMany({
    where: { status: 'CONVERTED' },
    select: {
      firstName: true,
      lastName: true,
      convertedLeadId: true,
      assignedTo: { select: { firstName: true } }
    }
  });
  console.log('CONVERTED raw records:', converted.length);
  converted.forEach(r => console.log('  -', r.firstName, r.lastName, '| Lead ID:', r.convertedLeadId, '| Assigned to:', r.assignedTo?.firstName));

  // Get leads with admissions (truly converted)
  const leadsWithAdmissions = await prisma.lead.findMany({
    where: { admissions: { some: {} } },
    select: {
      firstName: true,
      lastName: true,
      isConverted: true,
      admissions: { select: { id: true, status: true } }
    }
  });
  console.log('\nLeads with admissions (truly converted):', leadsWithAdmissions.length);
  leadsWithAdmissions.forEach(l => console.log('  -', l.firstName, l.lastName, '| isConverted:', l.isConverted, '| Admissions:', l.admissions.length));

  // Get leads with isConverted = true
  const convertedLeads = await prisma.lead.findMany({
    where: { isConverted: true },
    select: { firstName: true, lastName: true }
  });
  console.log('\nLeads with isConverted=true:', convertedLeads.length);
  convertedLeads.forEach(l => console.log('  -', l.firstName, l.lastName));
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
