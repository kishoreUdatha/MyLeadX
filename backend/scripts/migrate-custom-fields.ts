/**
 * Data Migration Script: Migrate customFields JSON to new Lead columns
 *
 * Run with: npx ts-node scripts/migrate-custom-fields.ts
 */

import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

interface CustomFields {
  father_name?: string;
  fatherName?: string;
  father_phone?: string;
  fatherPhone?: string;
  mother_name?: string;
  motherName?: string;
  mother_phone?: string;
  motherPhone?: string;
  occupation?: string;
  budget?: number | string;
  whatsapp?: string;
  preferred_contact_method?: string;
  preferredContactMethod?: string;
  preferred_contact_time?: string;
  preferredContactTime?: string;
  [key: string]: any;
}

async function migrateCustomFields() {
  console.log('Starting custom fields migration...\n');

  // Get all leads with customFields
  const leads = await prisma.lead.findMany({
    where: {
      customFields: {
        not: Prisma.DbNull,
      },
    },
    select: {
      id: true,
      customFields: true,
      // Check if already migrated
      fatherName: true,
      motherName: true,
    },
  });

  console.log(`Found ${leads.length} leads with customFields\n`);

  let migratedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const lead of leads) {
    try {
      const cf = lead.customFields as CustomFields;
      if (!cf || typeof cf !== 'object') {
        skippedCount++;
        continue;
      }

      // Prepare update data - only include fields that exist in customFields
      const updateData: any = {};
      const fieldsToRemove: string[] = [];

      // Father Name (check multiple variations)
      const fatherName = cf.father_name || cf.fatherName;
      if (fatherName && !lead.fatherName) {
        updateData.fatherName = fatherName;
        fieldsToRemove.push('father_name', 'fatherName');
      }

      // Father Phone
      const fatherPhone = cf.father_phone || cf.fatherPhone;
      if (fatherPhone) {
        updateData.fatherPhone = fatherPhone;
        fieldsToRemove.push('father_phone', 'fatherPhone');
      }

      // Mother Name
      const motherName = cf.mother_name || cf.motherName;
      if (motherName && !lead.motherName) {
        updateData.motherName = motherName;
        fieldsToRemove.push('mother_name', 'motherName');
      }

      // Mother Phone
      const motherPhone = cf.mother_phone || cf.motherPhone;
      if (motherPhone) {
        updateData.motherPhone = motherPhone;
        fieldsToRemove.push('mother_phone', 'motherPhone');
      }

      // Occupation
      if (cf.occupation) {
        updateData.occupation = cf.occupation;
        fieldsToRemove.push('occupation');
      }

      // Budget
      if (cf.budget !== undefined && cf.budget !== null) {
        const budgetValue = typeof cf.budget === 'string' ? parseFloat(cf.budget) : cf.budget;
        if (!isNaN(budgetValue)) {
          updateData.budget = budgetValue;
          fieldsToRemove.push('budget');
        }
      }

      // WhatsApp
      if (cf.whatsapp) {
        updateData.whatsapp = cf.whatsapp;
        fieldsToRemove.push('whatsapp');
      }

      // Preferred Contact Method
      const preferredContactMethod = cf.preferred_contact_method || cf.preferredContactMethod;
      if (preferredContactMethod) {
        updateData.preferredContactMethod = preferredContactMethod;
        fieldsToRemove.push('preferred_contact_method', 'preferredContactMethod');
      }

      // Preferred Contact Time
      const preferredContactTime = cf.preferred_contact_time || cf.preferredContactTime;
      if (preferredContactTime) {
        updateData.preferredContactTime = preferredContactTime;
        fieldsToRemove.push('preferred_contact_time', 'preferredContactTime');
      }

      // Skip if nothing to migrate
      if (Object.keys(updateData).length === 0) {
        skippedCount++;
        continue;
      }

      // Clean up customFields - remove migrated fields
      const newCustomFields = { ...cf };
      for (const field of fieldsToRemove) {
        delete newCustomFields[field];
      }

      // Only update customFields if we actually removed something
      if (fieldsToRemove.some(f => cf[f] !== undefined)) {
        updateData.customFields = Object.keys(newCustomFields).length > 0 ? newCustomFields : {};
      }

      // Update the lead
      await prisma.lead.update({
        where: { id: lead.id },
        data: updateData,
      });

      migratedCount++;

      if (migratedCount % 100 === 0) {
        console.log(`Migrated ${migratedCount} leads...`);
      }
    } catch (error) {
      errorCount++;
      console.error(`Error migrating lead ${lead.id}:`, error);
    }
  }

  console.log('\n=== Migration Complete ===');
  console.log(`Migrated: ${migratedCount}`);
  console.log(`Skipped: ${skippedCount}`);
  console.log(`Errors: ${errorCount}`);
}

migrateCustomFields()
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
