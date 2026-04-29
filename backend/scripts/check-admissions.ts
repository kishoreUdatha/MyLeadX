/**
 * Check admissions in production database
 *
 * Run with: DATABASE_URL=<your-db-url> npx ts-node scripts/check-admissions.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAdmissions() {
  try {
    console.log('Connecting to production database...');

    const count = await prisma.admission.count();
    console.log('\nTotal admissions:', count);

    if (count > 0) {
      const recent = await prisma.admission.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          admissionNumber: true,
          status: true,
          academicYear: true,
          createdAt: true,
          lead: { select: { firstName: true, lastName: true, phone: true } }
        }
      });

      console.log('\nRecent admissions:');
      recent.forEach(a => {
        console.log(`- ${a.admissionNumber} | ${a.lead?.firstName} ${a.lead?.lastName} | ${a.lead?.phone} | ${a.status} | ${a.academicYear} | ${a.createdAt}`);
      });
    }

    // Check for the specific lead
    const leadAdmissions = await prisma.admission.findMany({
      where: {
        lead: {
          OR: [
            { firstName: { contains: 'YATHIRAJULA', mode: 'insensitive' } },
            { firstName: { contains: 'ABHIRAM', mode: 'insensitive' } },
          ]
        }
      },
      include: {
        lead: { select: { firstName: true, lastName: true, phone: true } }
      }
    });

    console.log('\nAdmissions for YATHIRAJULA ABHIRAM:');
    if (leadAdmissions.length === 0) {
      console.log('No admissions found for this lead.');
    } else {
      leadAdmissions.forEach(a => {
        console.log(`- ${a.admissionNumber} | ${a.status} | ${a.academicYear}`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdmissions();
