const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const organizationId = '8bd8d25d-827b-416d-81a6-3010a66204e6';
  const now = new Date();
  
  // Simulate "Today" filter
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = now;
  
  console.log('Testing Team Monitoring API simulation');
  console.log('Organization:', organizationId);
  console.log('Date range:', todayStart.toISOString(), 'to', todayEnd.toISOString());
  console.log('');
  
  // 1. Team Members (telecaller/counselor roles)
  const teamMembers = await prisma.user.findMany({
    where: {
      organizationId,
      isActive: true,
      role: { slug: { in: ['telecaller', 'counselor'] } }
    },
    select: { id: true, firstName: true, lastName: true, role: { select: { slug: true } } }
  });
  console.log('Team Members:', teamMembers.length);
  teamMembers.forEach(m => console.log('  -', m.firstName, m.lastName, '|', m.role?.slug));
  
  // 2. Total Leads in date range
  const totalLeads = await prisma.lead.count({
    where: {
      organizationId,
      createdAt: { gte: todayStart, lte: todayEnd }
    }
  });
  console.log('\nTotal Leads (today):', totalLeads);
  
  // 3. Converted Leads
  const convertedLeads = await prisma.lead.count({
    where: {
      organizationId,
      createdAt: { gte: todayStart, lte: todayEnd },
      OR: [
        { isConverted: true },
        { stage: { name: { in: ['Converted', 'Won', 'Closed Won', 'Admitted', 'Enrolled'] } } }
      ]
    }
  });
  console.log('Converted Leads (today):', convertedLeads);
  
  // 4. Pending Follow-ups
  const teamMemberIds = teamMembers.map(m => m.id);
  const pendingFollowUps = await prisma.followUp.count({
    where: {
      assigneeId: { in: teamMemberIds },
      status: 'UPCOMING',
      lead: { organizationId }
    }
  });
  console.log('\nPending Follow-ups:', pendingFollowUps);
  
  // 5. All leads (no date filter)
  const allLeads = await prisma.lead.count({
    where: { organizationId }
  });
  console.log('\nAll Leads (no date filter):', allLeads);
  
  await prisma.$disconnect();
}
test().catch(console.error);
