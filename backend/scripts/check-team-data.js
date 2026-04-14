const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const orgId = '8bd8d25d-827b-416d-81a6-3010a66204e6';
  
  // Check telecaller calls
  const calls = await prisma.telecallerCall.count({ where: { organizationId: orgId } });
  console.log('TelecallerCall records:', calls);
  
  // Check follow-ups
  const followUps = await prisma.followUp.count({
    where: { lead: { organizationId: orgId } }
  });
  console.log('FollowUp records:', followUps);
  
  // Check leads
  const leads = await prisma.lead.count({ where: { organizationId: orgId } });
  console.log('Lead records:', leads);
  
  // Check telecaller performance daily
  const perfDaily = await prisma.telecallerPerformanceDaily.count({ where: { organizationId: orgId } });
  console.log('TelecallerPerformanceDaily records:', perfDaily);
  
  // Check users with telecaller/counselor role
  const telecallers = await prisma.user.findMany({
    where: { 
      organizationId: orgId,
      isActive: true,
      role: { slug: { in: ['telecaller', 'counselor'] } }
    },
    select: { id: true, firstName: true, lastName: true, role: { select: { slug: true } } }
  });
  console.log('\nTelecaller/Counselor users:', telecallers.length);
  telecallers.forEach(u => console.log('  -', u.firstName, u.lastName, '| role:', u.role?.slug));
  
  await prisma.$disconnect();
}
check().catch(console.error);
