const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  // Check for CALLBACK_REQUESTED records
  const callbacks = await prisma.rawImportRecord.findMany({
    where: { status: 'CALLBACK_REQUESTED' },
    select: {
      firstName: true,
      lastName: true,
      status: true,
      assignedTo: { select: { firstName: true } }
    }
  });
  console.log('CALLBACK_REQUESTED records:', callbacks.length);
  callbacks.forEach(r => console.log('  -', r.firstName, r.lastName, '-> Assigned to:', r.assignedTo?.firstName));

  // Check all raw record statuses in use
  const statuses = await prisma.rawImportRecord.groupBy({
    by: ['status'],
    _count: true
  });
  console.log('\nAll raw record statuses:');
  statuses.forEach(s => console.log('  ' + s.status + ':', s._count));
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
