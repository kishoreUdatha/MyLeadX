const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function addOutcomes() {
  const org = await p.organization.findFirst({
    where: { name: { contains: "Career Plus", mode: "insensitive" } },
    select: { id: true, name: true }
  });

  console.log("Adding outcomes for:", org.name);

  const maxOrder = await p.customCallOutcome.aggregate({
    where: { organizationId: org.id },
    _max: { order: true }
  });
  let nextOrder = (maxOrder._max.order || 0) + 1;

  const newOutcomes = [
    { name: "Not Reachable", slug: "not_reachable", icon: "phone-off", color: "#6B7280", requiresFollowUp: true },
    { name: "Switch Off", slug: "switch_off", icon: "power-off", color: "#374151", requiresFollowUp: true },
    { name: "Temporarily Out of Station", slug: "out_of_station", icon: "map-marker-off", color: "#7C3AED", requiresFollowUp: true }
  ];

  for (const outcome of newOutcomes) {
    const exists = await p.customCallOutcome.findFirst({
      where: { organizationId: org.id, slug: outcome.slug }
    });

    if (exists) {
      console.log("Already exists:", outcome.name);
      continue;
    }

    await p.customCallOutcome.create({
      data: {
        organizationId: org.id,
        name: outcome.name,
        slug: outcome.slug,
        icon: outcome.icon,
        color: outcome.color,
        requiresFollowUp: outcome.requiresFollowUp,
        requiresSubOption: false,
        subOptions: [],
        isSystem: false,
        isActive: true,
        order: nextOrder++
      }
    });
    console.log("Added:", outcome.name);
  }

  const total = await p.customCallOutcome.count({
    where: { organizationId: org.id, isActive: true }
  });
  console.log("\nTotal outcomes now:", total);
}

addOutcomes().catch(console.error).finally(() => p.$disconnect());
