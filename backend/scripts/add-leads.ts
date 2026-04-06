import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const contacts = [
  { firstName: 'Baaji', phone: '+91-9493324795' },
  { firstName: 'Karthik', phone: '+91-8522945416' },
];

async function main() {
  const telecaller = await prisma.user.findFirst({ where: { email: 'telecaller@demo.com' } });
  if (!telecaller) throw new Error('telecaller@demo.com not found - seed first');
  const orgId = telecaller.organizationId;

  const newStage = await prisma.leadStage.findFirst({ where: { organizationId: orgId, slug: 'new' } });
  const channel = await prisma.channel.findFirst({ where: { organizationId: orgId } });

  for (const c of contacts) {
    const existing = await prisma.lead.findFirst({ where: { organizationId: orgId, phone: c.phone } });
    if (existing) {
      console.log(`skip (exists): ${c.firstName} ${c.phone}`);
      continue;
    }
    await prisma.lead.create({
      data: {
        organizationId: orgId,
        firstName: c.firstName,
        phone: c.phone,
        source: 'MANUAL',
        priority: 'MEDIUM',
        stageId: newStage?.id,
        channelId: channel?.id,
        assignedToId: telecaller.id,
      },
    });
    console.log(`added: ${c.firstName} ${c.phone}`);
  }
}

main().finally(() => prisma.$disconnect());
