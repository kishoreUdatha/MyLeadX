const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function check() {
  const org = await p.organization.findFirst({
    where: { name: { contains: 'SmartGrow', mode: 'insensitive' } },
    include: {
      whatsappConfig: true,
      users: {
        where: { role: 'ADMIN' },
        select: { email: true, firstName: true, lastName: true, phone: true }
      }
    }
  });

  console.log('=== SmartGrow InfoTech Details ===');
  console.log('Organization ID:', org?.id);
  console.log('Name:', org?.name);
  console.log('Status:', org?.subscriptionStatus);
  console.log('\n--- Admin Users ---');
  org?.users?.forEach(u => {
    console.log(`  ${u.firstName} ${u.lastName} - ${u.email} - ${u.phone || 'No phone'}`);
  });
  console.log('\n--- WhatsApp Config ---');
  if (org?.whatsappConfig) {
    console.log('  Provider:', org.whatsappConfig.provider);
    console.log('  Phone Number ID:', org.whatsappConfig.phoneNumberId);
    console.log('  Business Account ID:', org.whatsappConfig.businessAccountId);
    console.log('  Is Active:', org.whatsappConfig.isActive);
  } else {
    console.log('  No WhatsApp configuration found');
  }
}

check().finally(() => p.$disconnect());
