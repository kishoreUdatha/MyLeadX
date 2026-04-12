const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  // Check all users and their organizations
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      firstName: true,
      organizationId: true,
      role: { select: { name: true, slug: true } },
      organization: { select: { name: true } }
    }
  });
  
  console.log('All users:');
  users.forEach(u => {
    console.log('  -', u.email, '| org:', u.organization?.name || 'NO ORG', '| orgId:', u.organizationId || 'NULL', '| role:', u.role?.slug);
  });
  
  await prisma.$disconnect();
}
check().catch(console.error);
