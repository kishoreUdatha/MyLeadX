/**
 * Fix Duplicate Names Script
 *
 * This script finds leads where lastName is already contained in firstName
 * and clears the lastName to prevent display like "JOHN DOE DOE"
 *
 * Run with: npx ts-node scripts/fix-duplicate-names.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixDuplicateNames() {
  console.log('Starting duplicate name fix...\n');

  // Find all leads with both firstName and lastName
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
  const fixed: string[] = [];

  for (const lead of leads) {
    if (!lead.firstName || !lead.lastName) continue;

    const firstNameUpper = lead.firstName.toUpperCase().trim();
    const lastNameUpper = lead.lastName.toUpperCase().trim();

    // Check if lastName is already contained in firstName
    if (firstNameUpper.includes(lastNameUpper) || firstNameUpper.endsWith(lastNameUpper)) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: { lastName: null },
      });

      fixed.push(`"${lead.firstName} ${lead.lastName}" -> "${lead.firstName}"`);
      fixedCount++;
    }
    // Check reverse: if firstName is contained in lastName
    else if (lastNameUpper.includes(firstNameUpper) && lastNameUpper.length > firstNameUpper.length) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          firstName: lead.lastName,
          lastName: null,
        },
      });

      fixed.push(`"${lead.firstName} ${lead.lastName}" -> "${lead.lastName}"`);
      fixedCount++;
    }
  }

  console.log('--- Fixed Names ---');
  if (fixed.length > 0) {
    fixed.forEach(f => console.log(`  ✓ ${f}`));
  } else {
    console.log('  No duplicate names found.');
  }

  console.log(`\n--- Summary ---`);
  console.log(`Total leads checked: ${leads.length}`);
  console.log(`Fixed: ${fixedCount}`);
}

async function main() {
  try {
    await fixDuplicateNames();
  } catch (error) {
    console.error('Script failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
