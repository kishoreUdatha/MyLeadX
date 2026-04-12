const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const orgId = '8bd8d25d-827b-416d-81a6-3010a66204e6';
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  console.log('Now:', now.toISOString());
  console.log('30 days ago:', thirtyDaysAgo.toISOString());
  
  const leads = await prisma.lead.findMany({
    where: { organizationId: orgId },
    select: { firstName: true, lastName: true, createdAt: true, isConverted: true }
  });
  
  console.log('\nAll leads:');
  leads.forEach(l => {
    const isInRange = l.createdAt >= thirtyDaysAgo;
    console.log('  -', l.firstName, l.lastName, '| created:', l.createdAt.toISOString(), '| in 30d range:', isInRange);
  });
  
  // Count leads in range
  const leadsInRange = await prisma.lead.count({
    where: { 
      organizationId: orgId,
      createdAt: { gte: thirtyDaysAgo, lte: now }
    }
  });
  console.log('\nLeads in 30-day range:', leadsInRange);
  
  // Check converted leads
  const convertedInRange = await prisma.lead.count({
    where: {
      organizationId: orgId,
      createdAt: { gte: thirtyDaysAgo, lte: now },
      OR: [
        { isConverted: true },
        { stage: { name: { in: ['Converted', 'Won', 'Admitted', 'Enrolled'] } } }
      ]
    }
  });
  console.log('Converted leads in 30-day range:', convertedInRange);
  
  await prisma.$disconnect();
}
check().catch(console.error);
