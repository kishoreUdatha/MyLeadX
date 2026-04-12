/**
 * Seed System Fields
 * Creates default system field configurations for all organizations
 * Admin can enable/disable and mark as required via Settings > Custom Contact Property
 */

import { PrismaClient, FieldType } from '@prisma/client';

const prisma = new PrismaClient();

interface SystemFieldDefinition {
  name: string;
  slug: string;
  columnName: string;
  fieldType: FieldType;
  category: string;
  order: number;
  options?: Array<{ value: string; label: string }>;
}

// System fields that map to actual database columns
const SYSTEM_FIELDS: SystemFieldDefinition[] = [
  // Family Details
  {
    name: "Father's Name",
    slug: 'fatherName',
    columnName: 'fatherName',
    fieldType: 'TEXT',
    category: 'family',
    order: 1,
  },
  {
    name: "Father's Phone",
    slug: 'fatherPhone',
    columnName: 'fatherPhone',
    fieldType: 'PHONE',
    category: 'family',
    order: 2,
  },
  {
    name: "Mother's Name",
    slug: 'motherName',
    columnName: 'motherName',
    fieldType: 'TEXT',
    category: 'family',
    order: 3,
  },
  {
    name: "Mother's Phone",
    slug: 'motherPhone',
    columnName: 'motherPhone',
    fieldType: 'PHONE',
    category: 'family',
    order: 4,
  },
  // Contact Preferences
  {
    name: 'WhatsApp Number',
    slug: 'whatsapp',
    columnName: 'whatsapp',
    fieldType: 'PHONE',
    category: 'contact',
    order: 5,
  },
  {
    name: 'Preferred Contact Method',
    slug: 'preferredContactMethod',
    columnName: 'preferredContactMethod',
    fieldType: 'SELECT',
    category: 'contact',
    order: 6,
    options: [
      { value: 'phone', label: 'Phone Call' },
      { value: 'whatsapp', label: 'WhatsApp' },
      { value: 'email', label: 'Email' },
      { value: 'sms', label: 'SMS' },
    ],
  },
  {
    name: 'Preferred Contact Time',
    slug: 'preferredContactTime',
    columnName: 'preferredContactTime',
    fieldType: 'SELECT',
    category: 'contact',
    order: 7,
    options: [
      { value: 'morning', label: 'Morning (9 AM - 12 PM)' },
      { value: 'afternoon', label: 'Afternoon (12 PM - 5 PM)' },
      { value: 'evening', label: 'Evening (5 PM - 9 PM)' },
      { value: 'anytime', label: 'Anytime' },
    ],
  },
  // Professional
  {
    name: 'Occupation',
    slug: 'occupation',
    columnName: 'occupation',
    fieldType: 'TEXT',
    category: 'work',
    order: 8,
  },
  {
    name: 'Budget',
    slug: 'budget',
    columnName: 'budget',
    fieldType: 'NUMBER',
    category: 'work',
    order: 9,
  },
];

async function seedSystemFields() {
  console.log('Seeding system fields for all organizations...');

  // Get all organizations
  const organizations = await prisma.organization.findMany({
    select: { id: true, name: true },
  });

  console.log(`Found ${organizations.length} organizations`);

  let created = 0;
  let skipped = 0;

  for (const org of organizations) {
    console.log(`\nProcessing: ${org.name} (${org.id})`);

    for (const field of SYSTEM_FIELDS) {
      // Check if field already exists
      const existing = await prisma.customField.findFirst({
        where: {
          organizationId: org.id,
          slug: field.slug,
        },
      });

      if (existing) {
        // Update to mark as system field if not already
        if (!existing.isSystemField) {
          await prisma.customField.update({
            where: { id: existing.id },
            data: {
              isSystemField: true,
              columnName: field.columnName,
              category: field.category,
            },
          });
          console.log(`  Updated: ${field.name} (marked as system field)`);
        } else {
          skipped++;
        }
        continue;
      }

      // Create the system field
      await prisma.customField.create({
        data: {
          organizationId: org.id,
          name: field.name,
          slug: field.slug,
          fieldType: field.fieldType,
          options: field.options || [],
          isRequired: false,
          isActive: true, // Enabled by default
          order: field.order,
          isSystemField: true,
          columnName: field.columnName,
          category: field.category,
        },
      });

      created++;
      console.log(`  Created: ${field.name}`);
    }
  }

  console.log(`\n========================================`);
  console.log(`System fields seeded successfully!`);
  console.log(`Created: ${created}`);
  console.log(`Skipped (already exists): ${skipped}`);
  console.log(`========================================`);
}

seedSystemFields()
  .catch((error) => {
    console.error('Error seeding system fields:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
