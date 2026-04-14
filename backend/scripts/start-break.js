const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function startBreak() {
  try {
    // Find user padhma
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { firstName: { contains: 'padhma', mode: 'insensitive' } },
          { lastName: { contains: 'padhma', mode: 'insensitive' } },
          { email: { contains: 'padhma', mode: 'insensitive' } }
        ]
      },
      select: { id: true, firstName: true, lastName: true, email: true, organizationId: true }
    });

    if (!user) {
      console.log('User padhma not found');
      return;
    }

    console.log('Found user:', user.firstName, user.lastName, '(', user.email, ')');
    console.log('User ID:', user.id);
    console.log('Org ID:', user.organizationId);

    // Check for active session
    let session = await prisma.workSession.findFirst({
      where: {
        userId: user.id,
        organizationId: user.organizationId,
        status: { in: ['ACTIVE', 'ON_BREAK'] }
      },
      orderBy: { startedAt: 'desc' }
    });

    if (!session) {
      console.log('No active session found. Creating one...');
      session = await prisma.workSession.create({
        data: {
          userId: user.id,
          organizationId: user.organizationId,
          status: 'ACTIVE'
        }
      });
      console.log('Created session:', session.id);
    } else {
      console.log('Active session found:', session.id, 'Status:', session.status);

      if (session.status === 'ON_BREAK') {
        console.log('User is already on break!');
        return;
      }
    }

    // Update session to ON_BREAK
    await prisma.workSession.update({
      where: { id: session.id },
      data: { status: 'ON_BREAK' }
    });

    // Create break record
    const breakRecord = await prisma.userBreak.create({
      data: {
        userId: user.id,
        organizationId: user.organizationId,
        workSessionId: session.id,
        breakType: 'SHORT',
        reason: 'Tea break'
      }
    });

    console.log('\n✅ Break started!');
    console.log('Break ID:', breakRecord.id);
    console.log('Break Type:', breakRecord.breakType);
    console.log('Started At:', breakRecord.startedAt);

  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

startBreak();
