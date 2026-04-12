const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  // Find Padhma
  const user = await prisma.user.findFirst({
    where: { firstName: { contains: 'padhma', mode: 'insensitive' } },
    select: { id: true, firstName: true, organizationId: true }
  });

  console.log('User:', user.firstName);
  console.log('User ID:', user.id);
  console.log('Org ID:', user.organizationId);

  // Get ALL sessions for this user (active or on_break)
  const sessions = await prisma.workSession.findMany({
    where: {
      userId: user.id,
      status: { in: ['ACTIVE', 'ON_BREAK'] }
    },
    include: {
      breaks: {
        where: { endedAt: null }
      }
    },
    orderBy: { startedAt: 'desc' }
  });

  console.log('\n=== All Active/On-Break Sessions ===');
  console.log('Total sessions:', sessions.length);

  sessions.forEach((s, i) => {
    console.log(`\nSession ${i + 1}:`);
    console.log('  ID:', s.id);
    console.log('  Status:', s.status);
    console.log('  Started:', s.startedAt);
    console.log('  Org ID:', s.organizationId);
    console.log('  Active Breaks:', s.breaks.length);
    s.breaks.forEach(b => {
      console.log('    - Break:', b.id, 'started:', b.startedAt);
    });
  });

  await prisma.$disconnect();
}

check();
