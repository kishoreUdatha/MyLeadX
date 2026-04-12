const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const user = await prisma.user.findFirst({
    where: { email: 'srinivas@ghanasyamedu.com' },
    select: { id: true, firstName: true, organizationId: true }
  });
  console.log('User:', user.firstName, '| ID:', user.id);

  // Check raw import records assigned to srinivas
  const rawRecords = await prisma.rawImportRecord.findMany({
    where: { assignedToId: user.id },
    select: { id: true, firstName: true, lastName: true, status: true, notes: true, interestLevel: true }
  });
  console.log('\nRaw records assigned to srinivas:', rawRecords.length);
  rawRecords.forEach(r => {
    console.log('  -', r.firstName, r.lastName, '| Status:', r.status, '| Interest:', r.interestLevel);
  });

  // Check calling queue for srinivas
  const queueItems = await prisma.callingQueueItem.findMany({
    where: { telecallerId: user.id },
    select: { id: true, status: true, scheduledAt: true, rawRecordId: true, leadId: true }
  });
  console.log('\nCalling queue items for srinivas:', queueItems.length);
  queueItems.forEach(q => {
    console.log('  - Status:', q.status, '| Scheduled:', q.scheduledAt);
  });

  // Check if RawImportRecord has any records with FOLLOW_UP or similar status
  const followUpRecords = await prisma.rawImportRecord.findMany({
    where: {
      organizationId: user.organizationId,
      status: { in: ['FOLLOW_UP', 'CALLBACK', 'INTERESTED'] }
    },
    select: { id: true, firstName: true, lastName: true, status: true, assignedTo: { select: { firstName: true } } },
    take: 10
  });
  console.log('\nRaw records with follow-up/callback status in org:', followUpRecords.length);
  followUpRecords.forEach(r => {
    console.log('  -', r.firstName, r.lastName, '| Status:', r.status, '| Assigned to:', r.assignedTo?.firstName);
  });
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
