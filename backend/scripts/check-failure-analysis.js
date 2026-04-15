const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Check OutboundCall table for failure analysis using ORM
  const callsWithAnalysis = await prisma.outboundCall.findMany({
    where: { failurePrimaryReason: { not: null } },
    select: { id: true, outcome: true, failurePrimaryReason: true },
    take: 5
  });
  console.log('OutboundCalls with failure analysis:', callsWithAnalysis.length);
  callsWithAnalysis.forEach(c => {
    console.log('  Call ID:', c.id, '| Outcome:', c.outcome, '| Reason:', c.failurePrimaryReason);
  });

  // Check TelecallerCall table
  const telecallerWithAnalysis = await prisma.telecallerCall.findMany({
    where: { failurePrimaryReason: { not: null } },
    select: { id: true, outcome: true, failurePrimaryReason: true },
    take: 5
  });
  console.log('\nTelecallerCalls with failure analysis:', telecallerWithAnalysis.length);
  telecallerWithAnalysis.forEach(c => {
    console.log('  ID:', c.id, '| Outcome:', c.outcome);
  });

  // Check non-won calls without analysis
  const nonWonNoAnalysis = await prisma.outboundCall.findMany({
    where: {
      outcome: { in: ['NOT_INTERESTED', 'NEEDS_FOLLOWUP', 'CALLBACK_REQUESTED', 'NO_ANSWER'] },
      failurePrimaryReason: null
    },
    select: { id: true, outcome: true },
    take: 3
  });
  console.log('\nNon-won calls WITHOUT analysis (need processing):', nonWonNoAnalysis.length);
  nonWonNoAnalysis.forEach(c => console.log('  ID:', c.id, '| Outcome:', c.outcome));
}

main().catch(console.error).finally(() => prisma.$disconnect());
