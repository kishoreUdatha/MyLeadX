const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const user = await prisma.user.findFirst({
    where: { email: 'srinivas@ghanasyamedu.com' },
    select: { id: true, firstName: true, organizationId: true }
  });
  console.log('User:', user.firstName, '| ID:', user.id);

  // Check raw import records with ASSIGNED status (pending calls)
  const pendingRaw = await prisma.rawImportRecord.findMany({
    where: { assignedToId: user.id, status: 'ASSIGNED' },
    select: { id: true, firstName: true, lastName: true, status: true }
  });
  console.log('\nPending raw records (ASSIGNED):', pendingRaw.length);
  pendingRaw.forEach(r => console.log('  -', r.firstName, r.lastName));

  // Check raw records with CALLBACK or FOLLOW_UP status
  const callbackRaw = await prisma.rawImportRecord.findMany({
    where: {
      assignedToId: user.id,
      status: { in: ['CALLBACK', 'FOLLOW_UP', 'INTERESTED', 'NOT_INTERESTED'] }
    },
    select: { id: true, firstName: true, lastName: true, status: true }
  });
  console.log('\nCallback/Follow-up raw records:', callbackRaw.length);
  callbackRaw.forEach(r => console.log('  -', r.firstName, r.lastName, '| Status:', r.status));

  // Check leads with follow-up status or needs attention
  const leads = await prisma.lead.findMany({
    where: {
      organizationId: user.organizationId,
      assignments: { some: { assignedToId: user.id, isActive: true } }
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      status: true,
      nextFollowUpAt: true,
      stage: { select: { name: true } }
    }
  });
  console.log('\nAll leads assigned to srinivas:', leads.length);
  leads.forEach(l => {
    console.log('  -', l.firstName, l.lastName);
    console.log('    Status:', l.status, '| Stage:', l.stage?.name);
    console.log('    Next Follow-up:', l.nextFollowUpAt);
  });

  // Check FollowUp count by status in the org
  const followUpsByStatus = await prisma.followUp.groupBy({
    by: ['status'],
    where: { lead: { organizationId: user.organizationId } },
    _count: true
  });
  console.log('\nFollow-ups in org by status:');
  if (followUpsByStatus.length === 0) {
    console.log('  No follow-up records found in organization');
  } else {
    followUpsByStatus.forEach(f => console.log('  ' + f.status + ':', f._count));
  }
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
