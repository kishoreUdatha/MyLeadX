const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  // Find Padhma
  const user = await prisma.user.findFirst({
    where: { firstName: { contains: 'padhma', mode: 'insensitive' } },
    select: { id: true, firstName: true, lastName: true, organizationId: true }
  });

  if (!user) {
    console.log('User Padhma not found');
    await prisma.$disconnect();
    return;
  }

  console.log('User:', user.firstName, user.lastName);
  console.log('User ID:', user.id);
  console.log('Org ID:', user.organizationId);

  // Check active session
  const session = await prisma.workSession.findFirst({
    where: {
      userId: user.id,
      status: { in: ['ACTIVE', 'ON_BREAK'] }
    },
    include: {
      breaks: {
        where: { endedAt: null }
      }
    }
  });

  if (!session) {
    console.log('\nNo active session found for Padhma');
  } else {
    console.log('\nSession:');
    console.log('  ID:', session.id);
    console.log('  Status:', session.status);
    console.log('  Started:', session.startedAt);
    console.log('  Total Break Time:', session.totalBreakTime, 'seconds');
    console.log('  Active Breaks:', session.breaks.length);
    if (session.breaks.length > 0) {
      session.breaks.forEach(b => {
        console.log('    - Break ID:', b.id);
        console.log('      Type:', b.breakType);
        console.log('      Started:', b.startedAt);
      });
    }
  }

  // Check all breaks for today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const breaks = await prisma.userBreak.findMany({
    where: {
      userId: user.id,
      startedAt: { gte: today }
    },
    orderBy: { startedAt: 'desc' }
  });

  console.log('\nAll breaks today:', breaks.length);
  breaks.forEach(b => {
    console.log('  -', b.breakType, '| Started:', b.startedAt, '| Ended:', b.endedAt, '| Duration:', b.duration);
  });

  await prisma.$disconnect();
}

check();
