const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  // Find Padhma's user ID
  const user = await prisma.user.findFirst({
    where: { firstName: { contains: 'padhma', mode: 'insensitive' } },
    select: { id: true, firstName: true, organizationId: true }
  });

  if (!user) {
    console.log('User not found');
    await prisma.$disconnect();
    return;
  }

  console.log('Testing for user:', user.firstName);
  console.log('User ID:', user.id);
  console.log('Org ID:', user.organizationId);

  // Simulate the getActiveSession function
  const session = await prisma.workSession.findFirst({
    where: {
      userId: user.id,
      organizationId: user.organizationId,
      status: { in: ['ACTIVE', 'ON_BREAK'] },
    },
    orderBy: { startedAt: 'desc' },
    include: {
      breaks: {
        where: { endedAt: null },
      },
    },
  });

  console.log('\n=== API Response (what frontend should receive) ===');
  console.log(JSON.stringify(session, null, 2));

  await prisma.$disconnect();
}

test();
