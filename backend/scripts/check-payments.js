const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const admission = await prisma.admission.findFirst({
    where: { admissionNumber: 'ADM-2026-00002' },
    include: {
      payments: {
        include: {
          receivedBy: { select: { firstName: true, lastName: true } }
        },
        orderBy: { paidAt: 'desc' }
      },
      lead: { select: { firstName: true, lastName: true, phone: true, email: true } },
      university: { select: { name: true, shortName: true } }
    }
  });

  console.log('Admission ID:', admission.id);
  console.log('Payments:', admission.payments?.length || 0);
  if (admission.payments) {
    admission.payments.forEach(p => {
      console.log('Payment:', p.amount, p.paymentType, p.paymentMode, p.paidAt);
      console.log('  ReceivedBy:', p.receivedBy?.firstName, p.receivedBy?.lastName);
    });
  }
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
