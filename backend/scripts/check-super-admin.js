const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  // Check if there are any super_admin users
  const superAdmins = await prisma.user.findMany({
    where: { role: { slug: 'super_admin' } },
    select: { 
      email: true, 
      firstName: true, 
      organizationId: true,
      role: { select: { slug: true } }
    }
  });
  
  console.log('Super Admin users:');
  if (superAdmins.length === 0) {
    console.log('  None found');
  } else {
    superAdmins.forEach(u => console.log('  -', u.email, '| orgId:', u.organizationId || 'NULL'));
  }
  
  // Check all roles
  const roles = await prisma.role.findMany({
    select: { slug: true, name: true }
  });
  console.log('\nAll roles:');
  roles.forEach(r => console.log('  -', r.slug, '|', r.name));
  
  await prisma.$disconnect();
}
check().catch(console.error);
