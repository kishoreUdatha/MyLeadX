const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  // Get srinivas user
  const user = await prisma.user.findFirst({
    where: { email: 'srinivas@ghanasyamedu.com' },
    select: { id: true, firstName: true, organizationId: true }
  });
  console.log('User:', user.firstName, '| ID:', user.id);

  // Get all follow-ups assigned to srinivas
  const followUps = await prisma.followUp.findMany({
    where: { assigneeId: user.id },
    select: {
      id: true,
      status: true,
      scheduledAt: true,
      notes: true,
      lead: { select: { firstName: true, lastName: true } }
    }
  });
  console.log('\nAll follow-ups for srinivas:', followUps.length);
  followUps.forEach(f => {
    console.log('  -', f.lead?.firstName, f.lead?.lastName);
    console.log('    Status:', f.status, '| Scheduled:', f.scheduledAt);
  });

  // Get follow-ups by status
  const byStatus = await prisma.followUp.groupBy({
    by: ['status'],
    where: { assigneeId: user.id },
    _count: true
  });
  console.log('\nFollow-ups by status:');
  byStatus.forEach(s => console.log('  ' + s.status + ': ' + s._count));

  // Check if there are any follow-ups in the org
  const orgFollowUps = await prisma.followUp.findMany({
    where: { lead: { organizationId: user.organizationId } },
    select: {
      id: true,
      status: true,
      assigneeId: true,
      scheduledAt: true,
      lead: { select: { firstName: true, lastName: true } },
      assignee: { select: { firstName: true, lastName: true } }
    },
    take: 10
  });
  console.log('\nAll follow-ups in org (first 10):', orgFollowUps.length);
  orgFollowUps.forEach(f => {
    console.log('  -', f.lead?.firstName, f.lead?.lastName);
    console.log('    Assigned to:', f.assignee?.firstName, '| Status:', f.status);
    console.log('    Scheduled:', f.scheduledAt);
  });

  // Check the FollowUp status enum values in use
  const allStatuses = await prisma.followUp.groupBy({
    by: ['status'],
    _count: true
  });
  console.log('\nAll follow-up statuses in system:');
  allStatuses.forEach(s => console.log('  ' + s.status + ': ' + s._count));
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
