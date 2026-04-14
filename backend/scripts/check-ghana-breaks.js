const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  // Find Ghana Syam
  const user = await prisma.user.findFirst({
    where: { firstName: { contains: 'ghana', mode: 'insensitive' } },
    select: { id: true, firstName: true, lastName: true }
  });

  console.log('User:', user.firstName, user.lastName);
  console.log('User ID:', user.id);

  // Check session
  const session = await prisma.workSession.findFirst({
    where: { userId: user.id, status: { in: ['ACTIVE', 'ON_BREAK'] } }
  });

  console.log('\nSession:');
  console.log('  Status:', session.status);
  console.log('  Total Break Time:', session.totalBreakTime, 'seconds');

  // Check breaks
  const breaks = await prisma.userBreak.findMany({
    where: { userId: user.id }
  });

  console.log('\nBreaks recorded:', breaks.length);
  breaks.forEach(b => {
    console.log('  -', b.breakType, '| Started:', b.startedAt, '| Ended:', b.endedAt, '| Duration:', b.duration);
  });

  await prisma.$disconnect();
}

check();
