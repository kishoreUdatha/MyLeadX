import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'superadmin@voicebridge.ai';
  const password = 'Admin@123';
  const hashed = await bcrypt.hash(password, 12);

  const admin = await prisma.superAdmin.upsert({
    where: { email },
    update: { password: hashed, isActive: true },
    create: {
      email,
      password: hashed,
      firstName: 'Super',
      lastName: 'Admin',
      isActive: true,
    },
  });

  console.log('Platform super admin created:');
  console.log('  Email:    ', admin.email);
  console.log('  Password: ', password);
  console.log('  URL:      http://localhost:5173/super-admin/login');

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
