const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const user = await prisma.user.findFirst({
    where: { email: 'srinivas@ghanasyamedu.com' },
    select: { id: true, organizationId: true }
  });

  const targetUserIds = [user.id];
  const organizationId = user.organizationId;

  // Get all leads with their stages
  const leads = await prisma.lead.findMany({
    where: {
      organizationId,
      assignments: { some: { assignedToId: { in: targetUserIds }, isActive: true } }
    },
    select: {
      firstName: true,
      lastName: true,
      stage: { select: { name: true } },
      isConverted: true,
      admissions: { select: { id: true, status: true } }
    }
  });

  console.log('All leads for srinivas:');
  leads.forEach(l => {
    console.log('  -', l.firstName, l.lastName);
    console.log('    Stage:', l.stage?.name, '| isConverted:', l.isConverted);
    console.log('    Admissions:', l.admissions.length);
  });

  // Won leads (Admitted, Enrolled, Won or isConverted)
  const wonLeads = await prisma.lead.count({
    where: {
      organizationId,
      assignments: { some: { assignedToId: { in: targetUserIds }, isActive: true } },
      OR: [
        { stage: { name: { in: ['Won', 'WON', 'Enrolled', 'ENROLLED', 'Admitted', 'ADMITTED'] } } },
        { isConverted: true },
      ],
    },
  });

  // Converted leads (not in initial stages)
  const initialStages = ['New', 'NEW', 'new', 'Inquiry', 'INQUIRY', 'inquiry'];
  const convertedLeads = await prisma.lead.count({
    where: {
      organizationId,
      assignments: { some: { assignedToId: { in: targetUserIds }, isActive: true } },
      OR: [
        { stage: { name: { notIn: initialStages } } },
        { isConverted: true },
      ],
    },
  });

  const totalLeads = leads.length;
  const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;
  const winRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

  console.log('\n=== Dashboard Metrics ===');
  console.log('Total Leads:', totalLeads);
  console.log('Won Leads:', wonLeads);
  console.log('Converted Leads:', convertedLeads);
  console.log('Win Rate:', winRate + '%');
  console.log('Conversion Rate:', conversionRate + '%');
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
