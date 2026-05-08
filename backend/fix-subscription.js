const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const email = process.argv[2] || 'laxmiambati@cucom.org';

async function fixSubscription() {
  console.log('Looking up user:', email);

  const user = await p.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
    include: { organization: true }
  });

  if (!user) {
    console.log('User not found!');
    return;
  }

  console.log('\n--- USER ---');
  console.log('Name:', user.firstName, user.lastName);
  console.log('Email:', user.email);
  console.log('Role:', user.roleSlug);
  console.log('Is Active:', user.isActive);

  console.log('\n--- ORGANIZATION ---');
  console.log('ID:', user.organization.id);
  console.log('Name:', user.organization.name);
  console.log('Subscription Status:', user.organization.subscriptionStatus);
  console.log('Subscription Plan:', user.organization.subscriptionPlan);
  console.log('Subscription End:', user.organization.subscriptionEndDate);

  if (user.organization.subscriptionStatus !== 'ACTIVE') {
    console.log('\n--- ACTIVATING SUBSCRIPTION ---');

    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1); // 1 year from now

    await p.organization.update({
      where: { id: user.organization.id },
      data: {
        subscriptionStatus: 'ACTIVE',
        subscriptionPlan: 'ENTERPRISE',
        subscriptionEndDate: endDate,
      }
    });

    console.log('Subscription activated!');
    console.log('Plan: ENTERPRISE');
    console.log('End Date:', endDate);
  } else {
    console.log('\nSubscription is already ACTIVE');
  }
}

fixSubscription().finally(() => p.$disconnect());
