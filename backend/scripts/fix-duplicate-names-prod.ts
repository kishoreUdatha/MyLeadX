/**
 * Fix Duplicate Names - Production
 *
 * Run with: DATABASE_URL=<your-db-url> npx ts-node scripts/fix-duplicate-names-prod.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixDuplicateNames() {
  console.log('Connecting to production database...\n');

  const leads = await prisma.lead.findMany({
    where: {
      firstName: { not: null },
      lastName: { not: null },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  });

  console.log(`Found ${leads.length} leads with both firstName and lastName\n`);

  let fixedCount = 0;

  for (const lead of leads) {
    if (!lead.firstName || !lead.lastName) continue;

    const firstNameUpper = lead.firstName.toUpperCase().trim();
    const lastNameUpper = lead.lastName.toUpperCase().trim();

    if (firstNameUpper.includes(lastNameUpper) || firstNameUpper.endsWith(lastNameUpper)) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: { lastName: null },
      });
      console.log(`✓ Fixed: "${lead.firstName} ${lead.lastName}" -> "${lead.firstName}"`);
      fixedCount++;
    }
    else if (lastNameUpper.includes(firstNameUpper) && lastNameUpper.length > firstNameUpper.length) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: { firstName: lead.lastName, lastName: null },
      });
      console.log(`✓ Fixed: "${lead.firstName} ${lead.lastName}" -> "${lead.lastName}"`);
      fixedCount++;
    }
  }

  console.log(`\n--- Summary ---`);
  console.log(`Total leads checked: ${leads.length}`);
  console.log(`Fixed: ${fixedCount}`);
}

fixDuplicateNames()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
