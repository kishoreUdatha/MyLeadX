const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const orgId = '8bd8d25d-827b-416d-81a6-3010a66204e6';

  // Test 1: All leads
  const allLeads = await prisma.lead.findMany({
    where: { organizationId: orgId },
    select: { firstName: true, lastName: true, isConverted: true }
  });
  console.log('All leads in org:', allLeads.length);
  allLeads.forEach(l => console.log('  -', l.firstName, l.lastName, '| isConverted:', l.isConverted));

  // Test 2: Only converted leads
  const convertedLeads = await prisma.lead.findMany({
    where: { organizationId: orgId, isConverted: true },
    select: { firstName: true, lastName: true, isConverted: true }
  });
  console.log('\nConverted leads (isConverted=true):', convertedLeads.length);
  convertedLeads.forEach(l => console.log('  -', l.firstName, l.lastName));

  // Test 3: Non-converted leads
  const nonConverted = await prisma.lead.findMany({
    where: { organizationId: orgId, isConverted: false },
    select: { firstName: true, lastName: true, isConverted: true }
  });
  console.log('\nNon-converted leads (isConverted=false):', nonConverted.length);
  nonConverted.forEach(l => console.log('  -', l.firstName, l.lastName));
}

test()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
