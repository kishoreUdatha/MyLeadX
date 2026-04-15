/**
 * Migration Script: Move customFields data to proper lead fields
 *
 * This script migrates data from customFields (JSON blob) to proper lead table columns.
 * Run with: node scripts/migrate-custom-fields.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Mapping from customField keys to lead table columns
const fieldMappings = {
  // Father's name
  FNAME: 'fatherName',
  fname: 'fatherName',
  'father name': 'fatherName',
  father_name: 'fatherName',
  fatherName: 'fatherName',

  // Mother's name
  MNAME: 'motherName',
  mname: 'motherName',
  'mother name': 'motherName',
  mother_name: 'motherName',
  motherName: 'motherName',

  // Address fields
  HNO: 'address',
  hno: 'address',
  STREET: 'address',
  street: 'address',
  STU_ADDRESS: 'address',
  stu_address: 'address',

  // Pincode
  PINCODE: 'pincode',
  pincode: 'pincode',
  'pin code': 'pincode',

  // City/District
  STU_DIST_NAME: 'city',
  stu_dist_name: 'city',
  district: 'city',
  DISTRICT: 'city',

  // College/Company
  COLLEGENAME: 'companyName',
  collegename: 'companyName',
  'college name': 'companyName',
  college_name: 'companyName',

  // Gender
  GENDER: 'gender',
  gender: 'gender',
};

// Fields to remove from customFields (technical/internal codes)
const fieldsToRemove = [
  'COLLEGE_CODE', 'college_code', 'collegecode',
  'NEW_COLL_CODE', 'new_coll_code', 'newcollcode',
  'COLLEGEDISTRICT', 'collegedistrict', 'college_district',
  'ROLLNO', 'rollno', 'roll_no', 'roll no',
  'CATEGORY', 'category',
  'COURSE_NAME', 'course_name', // Keep only if not mapping to course
  'ADMISSION_NO', 'admission_no',
  'SERIAL', 'serial', 'SR_NO', 'sr_no', 'SL_NO', 'sl_no',
];

async function migrateLeads() {
  console.log('Starting migration of customFields to proper lead fields...\n');

  let processedCount = 0;
  let updatedCount = 0;
  let errorCount = 0;

  const batchSize = 100;
  let skip = 0;
  let hasMore = true;

  while (hasMore) {
    // Fetch leads with customFields
    const leads = await prisma.lead.findMany({
      where: {
        customFields: {
          not: null,
        },
      },
      select: {
        id: true,
        customFields: true,
        fatherName: true,
        motherName: true,
        address: true,
        city: true,
        pincode: true,
        companyName: true,
        gender: true,
      },
      skip,
      take: batchSize,
    });

    if (leads.length === 0) {
      hasMore = false;
      break;
    }

    for (const lead of leads) {
      processedCount++;

      try {
        const customFields = lead.customFields || {};
        if (typeof customFields !== 'object' || Object.keys(customFields).length === 0) {
          continue;
        }

        const updates = {};
        const newCustomFields = { ...customFields };
        let hasChanges = false;

        // Map fields to proper columns
        for (const [customKey, leadField] of Object.entries(fieldMappings)) {
          if (customFields[customKey] && !lead[leadField]) {
            // Handle address concatenation
            if (leadField === 'address' && updates.address) {
              updates.address = `${updates.address}, ${customFields[customKey]}`;
            } else {
              updates[leadField] = String(customFields[customKey]).trim();
            }
            delete newCustomFields[customKey];
            hasChanges = true;
          }
        }

        // Remove technical fields from customFields
        for (const fieldToRemove of fieldsToRemove) {
          if (newCustomFields[fieldToRemove] !== undefined) {
            delete newCustomFields[fieldToRemove];
            hasChanges = true;
          }
        }

        if (hasChanges) {
          // Update the lead
          await prisma.lead.update({
            where: { id: lead.id },
            data: {
              ...updates,
              customFields: Object.keys(newCustomFields).length > 0 ? newCustomFields : {},
            },
          });
          updatedCount++;

          if (updatedCount % 50 === 0) {
            console.log(`Progress: ${updatedCount} leads updated...`);
          }
        }
      } catch (error) {
        errorCount++;
        console.error(`Error updating lead ${lead.id}:`, error.message);
      }
    }

    skip += batchSize;
  }

  console.log('\n--- Migration Complete ---');
  console.log(`Total leads processed: ${processedCount}`);
  console.log(`Leads updated: ${updatedCount}`);
  console.log(`Errors: ${errorCount}`);
}

// Run migration
migrateLeads()
  .then(() => {
    console.log('\nMigration finished successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
