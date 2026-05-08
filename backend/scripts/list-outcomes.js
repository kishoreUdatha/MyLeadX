const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

p.customCallOutcome.findMany({
  where: { organization: { name: { contains: "Career Plus" } }, isActive: true },
  orderBy: { order: "asc" },
  select: { name: true, slug: true, isSystem: true, requiresSubOption: true, subOptions: true }
}).then(r => {
  console.log("Total:", r.length, "outcomes\n");
  r.forEach((o, i) => {
    let line = (i+1) + ". " + o.name;
    line += o.isSystem ? " (system)" : " (CUSTOM)";
    if (o.requiresSubOption && o.subOptions && o.subOptions.length > 0) {
      line += " -> " + o.subOptions.join(", ");
    }
    console.log(line);
  });
}).finally(() => p.$disconnect());
