/**
 * Script to create test custom fields for lekhanavasthalayam organization
 * Uses the CustomField model (for Settings > Custom Contact Property)
 */

import { PrismaClient, FieldType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Find the organization
  const org = await prisma.organization.findFirst({
    where: { name: { contains: 'lekhanavasthalayam', mode: 'insensitive' } },
  });

  if (!org) {
    console.log('Organization not found');
    return;
  }

  console.log(`Found organization: ${org.name} (${org.id})`);

  // Create test custom fields (using CustomField model)
  const fieldsToCreate = [
    {
      name: 'Father Name',
      slug: 'father_name',
      fieldType: FieldType.TEXT,
      isRequired: false,
      order: 1,
    },
    {
      name: 'Mother Name',
      slug: 'mother_name',
      fieldType: FieldType.TEXT,
      isRequired: false,
      order: 2,
    },
    {
      name: 'Occupation',
      slug: 'occupation',
      fieldType: FieldType.SELECT,
      isRequired: false,
      order: 3,
      options: [
        { value: 'business', label: 'Business' },
        { value: 'salaried', label: 'Salaried' },
        { value: 'self_employed', label: 'Self Employed' },
        { value: 'retired', label: 'Retired' },
        { value: 'student', label: 'Student' },
      ]
    },
    {
      name: 'Annual Income',
      slug: 'annual_income',
      fieldType: FieldType.NUMBER,
      isRequired: false,
      order: 4,
    },
    {
      name: 'Preferred Contact Time',
      slug: 'preferred_contact_time',
      fieldType: FieldType.SELECT,
      isRequired: false,
      order: 5,
      options: [
        { value: 'morning', label: 'Morning (9AM - 12PM)' },
        { value: 'afternoon', label: 'Afternoon (12PM - 5PM)' },
        { value: 'evening', label: 'Evening (5PM - 8PM)' },
      ]
    },
  ];

  for (const field of fieldsToCreate) {
    // Check if field already exists
    const existing = await prisma.customField.findFirst({
      where: {
        organizationId: org.id,
        slug: field.slug,
      },
    });

    if (existing) {
      console.log(`Field "${field.name}" already exists, skipping...`);
      continue;
    }

    const created = await prisma.customField.create({
      data: {
        organizationId: org.id,
        name: field.name,
        slug: field.slug,
        fieldType: field.fieldType,
        options: field.options || [],
        isRequired: field.isRequired,
        order: field.order,
        isActive: true,
      },
    });

    console.log(`Created field: ${created.name} (${created.slug})`);
  }

  console.log('\nDone! Custom fields created successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
