const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const roles = await prisma.role.findMany({
    select: { id: true, name: true, slug: true }
  });
  console.log('All roles:');
  roles.forEach(r => console.log('  -', r.name, '| slug:', r.slug));

  const users = await prisma.user.findMany({
    where: { organizationId: '8bd8d25d-827b-416d-81a6-3010a66204e6' },
    select: {
      firstName: true,
      lastName: true,
      isActive: true,
      role: { select: { name: true, slug: true } }
    }
  });
  console.log('\nUsers in org:');
  users.forEach(u => console.log('  -', u.firstName, u.lastName, '| role:', u.role?.name, '| slug:', u.role?.slug, '| active:', u.isActive));

  await prisma.$disconnect();
}
check().catch(console.error);
