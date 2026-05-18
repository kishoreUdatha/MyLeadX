import { prisma } from '../src/config/database';

async function main() {
  const email = 'chandanacareerplus@gmail.com';

  const user = await prisma.user.findFirst({
    where: { email },
    select: { id: true, firstName: true, lastName: true, email: true, organizationId: true, role: { select: { slug: true, name: true } }, isActive: true },
  });

  const leadsWithEmail = await prisma.lead.findMany({
    where: { email },
    select: { id: true, firstName: true, lastName: true, phone: true, organizationId: true, stageId: true, createdAt: true },
    take: 20,
  });

  let assignedLeads: any[] = [];
  if (user) {
    assignedLeads = await prisma.leadAssignment.findMany({
      where: { assignedToId: user.id, isActive: true },
      select: { id: true, leadId: true, assignedAt: true, lead: { select: { firstName: true, lastName: true, phone: true, stageId: true } } },
      take: 20,
    });
  }

  console.log(JSON.stringify({
    user,
    leadsWhereThisIsTheLeadsEmail: { count: leadsWithEmail.length, sample: leadsWithEmail },
    leadsAssignedToThisUser: { count: assignedLeads.length, sample: assignedLeads },
  }, null, 2));
}

main().catch(e => { console.error('ERROR:', e?.message || e); process.exit(1); }).finally(() => process.exit(0));
