const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function disable() {
  const result = await p.customCallOutcome.updateMany({
    where: {
      slug: "converted",
      organization: { name: { contains: "Career Plus" } }
    },
    data: { isActive: false }
  });
  console.log("Disabled: Converted");

  const outcomes = await p.customCallOutcome.findMany({
    where: { organization: { name: { contains: "Career Plus" } }, isActive: true },
    orderBy: { order: "asc" },
    select: { name: true, isSystem: true }
  });

  console.log("\nActive outcomes now:", outcomes.length);
  outcomes.forEach((o, i) => console.log((i+1) + ".", o.name, o.isSystem ? "(system)" : "(CUSTOM)"));
}

disable().finally(() => p.$disconnect());
