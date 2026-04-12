const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function endBreak() {
  try {
    // Find user padhma
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { firstName: { contains: 'padhma', mode: 'insensitive' } },
          { email: { contains: 'padhma', mode: 'insensitive' } }
        ]
      },
      select: { id: true, firstName: true, lastName: true, organizationId: true }
    });

    if (!user) {
      console.log('User padhma not found');
      return;
    }

    console.log('Found user:', user.firstName, user.lastName);

    // Find active session
    const session = await prisma.workSession.findFirst({
      where: {
        userId: user.id,
        status: 'ON_BREAK'
      },
      orderBy: { startedAt: 'desc' }
    });

    if (!session) {
      console.log('No active break session found');
      return;
    }

    console.log('Session ID:', session.id);

    // Find active break
    const activeBreak = await prisma.userBreak.findFirst({
      where: {
        userId: user.id,
        workSessionId: session.id,
        endedAt: null
      },
      orderBy: { startedAt: 'desc' }
    });

    if (!activeBreak) {
      console.log('No active break found');
      return;
    }

    console.log('Break ID:', activeBreak.id);
    console.log('Started At:', activeBreak.startedAt);

    const endedAt = new Date();
    const duration = Math.floor((endedAt.getTime() - activeBreak.startedAt.getTime()) / 1000);

    // Update break record
    await prisma.userBreak.update({
      where: { id: activeBreak.id },
      data: {
        endedAt,
        duration
      }
    });

    // Update session
    await prisma.workSession.update({
      where: { id: session.id },
      data: {
        status: 'ACTIVE',
        totalBreakTime: { increment: duration }
      }
    });

    console.log('\n✅ Break ended!');
    console.log('Duration:', duration, 'seconds');
    console.log('Ended At:', endedAt);

    // Show updated session
    const updatedSession = await prisma.workSession.findUnique({
      where: { id: session.id }
    });
    console.log('\nUpdated Session:');
    console.log('Total Break Time:', updatedSession.totalBreakTime, 'seconds');
    console.log('Status:', updatedSession.status);

  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

endBreak();
