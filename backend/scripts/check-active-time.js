const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const sessions = await prisma.workSession.findMany({
    where: { status: 'ACTIVE' },
    include: { user: { select: { firstName: true, lastName: true } } }
  });

  const now = new Date();
  console.log('=== Active Sessions (Dynamic Calculation) ===\n');

  sessions.forEach(s => {
    const sessionDuration = Math.floor((now.getTime() - s.startedAt.getTime()) / 1000);
    const activeTime = sessionDuration - (s.totalBreakTime || 0);
    const activeMin = Math.floor(activeTime / 60);
    const breakMin = Math.floor((s.totalBreakTime || 0) / 60);

    console.log(`${s.user.firstName} ${s.user.lastName}`);
    console.log(`  Login: ${s.startedAt.toISOString()}`);
    console.log(`  Session Duration: ${Math.floor(sessionDuration / 60)} min`);
    console.log(`  Break Time: ${breakMin} min`);
    console.log(`  Active Time: ${activeMin} min`);
    console.log('---');
  });

  await prisma.$disconnect();
}

check();
