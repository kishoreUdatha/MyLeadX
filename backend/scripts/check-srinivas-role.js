const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const user = await prisma.user.findFirst({
    where: { email: 'srinivas@ghanasyamedu.com' },
    select: { id: true, firstName: true, organizationId: true, role: { select: { name: true, slug: true } } }
  });
  console.log('User:', user.firstName);
  console.log('Role:', user.role?.name, '| Slug:', user.role?.slug);

  const normalizedRole = user.role?.slug?.toLowerCase().replace('_', '');
  console.log('Normalized role:', normalizedRole);

  // Check if srinivas is a team lead with team members
  if (normalizedRole === 'teamlead' || normalizedRole === 'team_lead') {
    const teamMembers = await prisma.user.findMany({
      where: { organizationId: user.organizationId, managerId: user.id, isActive: true },
      select: { id: true, firstName: true, lastName: true }
    });
    console.log('\nTeam members under srinivas:', teamMembers.length);
    teamMembers.forEach(m => console.log('  -', m.firstName, m.lastName));

    // Check leads assigned to team members
    const completedStages = ['Admitted', 'ADMITTED', 'Enrolled', 'ENROLLED', 'Won', 'WON', 'Dropped', 'DROPPED', 'Lost', 'LOST', 'Closed', 'CLOSED'];
    for (const member of teamMembers) {
      const memberLeads = await prisma.lead.findMany({
        where: {
          organizationId: user.organizationId,
          assignments: { some: { assignedToId: member.id, isActive: true } },
          stage: { name: { notIn: completedStages } }
        },
        select: { firstName: true, lastName: true, stage: { select: { name: true } } }
      });
      console.log('\n  Leads needing follow-up for', member.firstName + ':', memberLeads.length);
      memberLeads.forEach(l => console.log('    -', l.firstName, l.lastName, '| Stage:', l.stage?.name));
    }
  }
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
