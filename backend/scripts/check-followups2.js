const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  // Get srinivas user
  const user = await prisma.user.findFirst({
    where: { email: 'srinivas@ghanasyamedu.com' },
    select: { id: true, firstName: true, organizationId: true }
  });
  console.log('User:', user.firstName, '| ID:', user.id);

  // Get leads with nextFollowUpAt for srinivas
  const leadsWithFollowUp = await prisma.lead.findMany({
    where: {
      organizationId: user.organizationId,
      assignments: { some: { assignedToId: user.id, isActive: true } },
      nextFollowUpAt: { not: null }
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      nextFollowUpAt: true
    }
  });
  console.log('\nLeads with nextFollowUpAt for srinivas:', leadsWithFollowUp.length);
  leadsWithFollowUp.forEach(l => {
    console.log('  -', l.firstName, l.lastName);
    console.log('    Next Follow-up:', l.nextFollowUpAt);
  });

  // Check all leads in the org with nextFollowUpAt
  const allLeadsWithFollowUp = await prisma.lead.findMany({
    where: {
      organizationId: user.organizationId,
      nextFollowUpAt: { not: null }
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      nextFollowUpAt: true,
      assignments: {
        where: { isActive: true },
        select: { assignedTo: { select: { firstName: true } } }
      }
    }
  });
  console.log('\nAll leads in org with nextFollowUpAt:', allLeadsWithFollowUp.length);
  allLeadsWithFollowUp.forEach(l => {
    const assignee = l.assignments[0]?.assignedTo?.firstName || 'Unassigned';
    console.log('  -', l.firstName, l.lastName, '| Assigned to:', assignee);
    console.log('    Next Follow-up:', l.nextFollowUpAt);
  });

  // Check RawImportRecord assigned to srinivas
  const rawRecords = await prisma.rawImportRecord.findMany({
    where: {
      organizationId: user.organizationId,
      assignedToId: user.id
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      status: true,
      nextFollowUpDate: true
    }
  });
  console.log('\nRaw records assigned to srinivas:', rawRecords.length);
  rawRecords.forEach(r => {
    console.log('  -', r.firstName, r.lastName, '| Status:', r.status);
    console.log('    Follow-up:', r.nextFollowUpDate);
  });

  // Check if there are any raw records with follow-up dates in the org
  const allRawWithFollowUp = await prisma.rawImportRecord.findMany({
    where: {
      organizationId: user.organizationId,
      nextFollowUpDate: { not: null }
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      nextFollowUpDate: true,
      assignedTo: { select: { firstName: true } }
    },
    take: 10
  });
  console.log('\nAll raw records in org with follow-up date:', allRawWithFollowUp.length);
  allRawWithFollowUp.forEach(r => {
    console.log('  -', r.firstName, r.lastName, '| Assigned to:', r.assignedTo?.firstName);
    console.log('    Follow-up:', r.nextFollowUpDate);
  });
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
