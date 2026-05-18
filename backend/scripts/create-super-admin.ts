import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const orgSlug = 'smartgrow-info-tech';
  const adminEmail = 'udathak@gmail.com';
  const adminPassword = 'Admin@123';

  console.log('Creating SMARTGROW INFOTECH org + super admin...');

  const org = await prisma.organization.upsert({
    where: { slug: orgSlug },
    update: {},
    create: {
      name: 'SMARTGROW INFOTECH PRIVATE LIMITED',
      slug: orgSlug,
      email: adminEmail,
      phone: '+91-9999999999',
      address: 'India',
      isActive: true,
      activePlanId: 'enterprise',
      settings: { timezone: 'Asia/Kolkata', currency: 'INR' },
    },
  });
  console.log('Org:', org.name, '(slug:', org.slug + ')');

  const superAdminRole = await prisma.role.upsert({
    where: {
      organizationId_slug: { organizationId: org.id, slug: 'super-admin' },
    },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Super Admin',
      slug: 'super-admin',
      permissions: ['*'],
    },
  });
  console.log('Role:', superAdminRole.name);

  const hashedPassword = await bcrypt.hash(adminPassword, 12);

  const user = await prisma.user.upsert({
    where: {
      organizationId_email: { organizationId: org.id, email: adminEmail },
    },
    update: { password: hashedPassword, roleId: superAdminRole.id },
    create: {
      organizationId: org.id,
      email: adminEmail,
      password: hashedPassword,
      firstName: 'Kishore',
      lastName: 'Udatha',
      roleId: superAdminRole.id,
      isActive: true,
    },
  });

  console.log('User:', user.email);
  console.log('');
  console.log('=== LOGIN CREDENTIALS ===');
  console.log('URL:      http://smartgrow-info-tech.localhost:5173');
  console.log('          (or http://localhost:5173/super-admin/login)');
  console.log('Email:    ', adminEmail);
  console.log('Password: ', adminPassword);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
