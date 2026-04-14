const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  // Get an admission with payments
  const admission = await prisma.admission.findFirst({
    where: { admissionNumber: 'ADM-2026-00002' },
    include: {
      payments: {
        orderBy: { createdAt: 'desc' },
        include: {
          receivedBy: {
            select: { firstName: true, lastName: true },
          },
        },
      },
      lead: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
        },
      },
      university: {
        select: {
          id: true,
          name: true,
          shortName: true,
        },
      },
    },
  });

  console.log('Admission ID:', admission?.id);
  console.log('Admission Number:', admission?.admissionNumber);
  console.log('Organization ID:', admission?.organizationId);
  console.log('Payments count:', admission?.payments?.length);
  console.log('Payments:', JSON.stringify(admission?.payments, null, 2));
}

test()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
