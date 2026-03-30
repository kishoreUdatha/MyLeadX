const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addLeads() {
  const user = await prisma.user.findFirst({ where: { email: 'telecaller2@demo.com' } });
  if (!user) {
    console.log('User not found');
    return;
  }
  console.log('Found user:', user.email, 'Org:', user.organizationId);

  const leads = [
    { firstName: 'Rahul', lastName: 'Sharma', phone: '+919876543210', email: 'rahul@test.com' },
    { firstName: 'Priya', lastName: 'Patel', phone: '+919876543211', email: 'priya@test.com' },
    { firstName: 'Amit', lastName: 'Kumar', phone: '+919876543212', email: 'amit@test.com' },
    { firstName: 'Sneha', lastName: 'Gupta', phone: '+919876543213', email: 'sneha@test.com' },
    { firstName: 'Vikram', lastName: 'Singh', phone: '+919876543214', email: 'vikram@test.com' },
    { firstName: 'Neha', lastName: 'Verma', phone: '+919876543215', email: 'neha@test.com' },
    { firstName: 'Arjun', lastName: 'Reddy', phone: '+919876543216', email: 'arjun@test.com' },
    { firstName: 'Kavya', lastName: 'Nair', phone: '+919876543217', email: 'kavya@test.com' },
    { firstName: 'Ravi', lastName: 'Menon', phone: '+919876543218', email: 'ravi@test.com' },
    { firstName: 'Anita', lastName: 'Das', phone: '+919876543219', email: 'anita@test.com' },
  ];

  for (const lead of leads) {
    try {
      const created = await prisma.lead.create({
        data: {
          ...lead,
          organizationId: user.organizationId,
          source: 'MANUAL',
          priority: 'MEDIUM',
        }
      });

      await prisma.leadAssignment.create({
        data: {
          leadId: created.id,
          assignedToId: user.id,
          isActive: true,
        }
      });
      console.log('Created:', lead.firstName, lead.lastName);
    } catch (e) {
      console.log('Skip (exists):', lead.firstName);
    }
  }
  console.log('Done!');
}

addLeads().catch(console.error).finally(() => prisma.$disconnect());
