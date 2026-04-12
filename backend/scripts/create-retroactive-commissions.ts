/**
 * Script to create commissions for existing admissions
 * based on the lead's assigned telecaller
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createMissingCommissions() {
  // Get the organization (using srinivas as reference)
  const srinivas = await prisma.user.findFirst({
    where: { email: 'srinivas@ghanasyamedu.com' }
  });

  if (!srinivas) {
    console.log('Reference user not found');
    return;
  }

  const orgId = srinivas.organizationId;
  console.log('Organization ID:', orgId);

  // Get all active admissions in the org
  const admissions = await prisma.admission.findMany({
    where: { organizationId: orgId, status: 'ACTIVE' },
    include: {
      lead: {
        include: {
          assignments: {
            where: { isActive: true },
            orderBy: { assignedAt: 'desc' },
            take: 1,
            include: {
              user: {
                include: {
                  role: true,
                  manager: {
                    include: { manager: true }
                  }
                }
              }
            }
          }
        }
      }
    }
  });

  console.log('\nFound', admissions.length, 'admissions');

  for (const admission of admissions) {
    console.log('\n--- Processing:', admission.admissionNumber, '---');

    // Check existing commissions for this admission
    const existingCommissions = await prisma.commission.findMany({
      where: { admissionId: admission.id },
      include: { user: { select: { email: true } } }
    });

    console.log('Existing commissions:', existingCommissions.length);
    existingCommissions.forEach(c => console.log('  -', c.user?.email, c.amount, c.notes));

    // Get commission config
    const config = await prisma.commissionConfig.findUnique({
      where: {
        organizationId_admissionType: {
          organizationId: orgId,
          admissionType: admission.admissionType
        }
      }
    });

    if (!config) {
      console.log('No commission config for', admission.admissionType);
      continue;
    }

    // Get the assigned telecaller
    const assignment = admission.lead?.assignments?.[0];
    const assignedUser = assignment?.user;

    if (!assignedUser) {
      console.log('No telecaller assigned to this lead');
      continue;
    }

    const role = assignedUser.role?.slug?.toLowerCase() || '';
    console.log('Lead assigned to:', (assignedUser as any).email || assignedUser.id, 'role:', role);

    // Check if telecaller/counselor
    if (!['telecaller', 'counselor'].includes(role)) {
      console.log('Assigned user is not a telecaller/counselor');
      continue;
    }

    // Check if telecaller already has commission for this admission
    const telecallerHasCommission = existingCommissions.some(c => c.userId === assignedUser.id);

    if (telecallerHasCommission) {
      console.log('Telecaller already has commission');
      continue;
    }

    // Create commission for telecaller
    const telecallerAmount = Number(config.telecallerAmount) || 0;
    if (telecallerAmount > 0) {
      await prisma.commission.create({
        data: {
          organizationId: orgId,
          userId: assignedUser.id,
          leadId: admission.leadId,
          admissionId: admission.id,
          amount: telecallerAmount,
          rate: 0,
          baseValue: Number(admission.totalFee),
          status: 'PENDING',
          notes: 'Telecaller commission (retroactive)'
        }
      });
      console.log('Created telecaller commission - Rs.', telecallerAmount);
    }

    // Team lead commission (if manager exists and doesn't have commission)
    if (assignedUser.managerId) {
      const tlHasCommission = existingCommissions.some(c => c.userId === assignedUser.managerId);
      if (!tlHasCommission) {
        const teamLeadAmount = Number(config.teamLeadAmount) || 0;
        if (teamLeadAmount > 0) {
          await prisma.commission.create({
            data: {
              organizationId: orgId,
              userId: assignedUser.managerId,
              leadId: admission.leadId,
              admissionId: admission.id,
              amount: teamLeadAmount,
              rate: 0,
              baseValue: Number(admission.totalFee),
              status: 'PENDING',
              notes: 'Team Lead commission (retroactive)'
            }
          });
          console.log('Created team lead commission - Rs.', teamLeadAmount);
        }
      }

      // Manager commission
      const manager = assignedUser.manager as any;
      if (manager?.managerId) {
        const mgrHasCommission = existingCommissions.some(c => c.userId === manager.managerId);
        if (!mgrHasCommission) {
          const managerAmount = Number(config.managerAmount) || 0;
          if (managerAmount > 0) {
            await prisma.commission.create({
              data: {
                organizationId: orgId,
                userId: manager.managerId,
                leadId: admission.leadId,
                admissionId: admission.id,
                amount: managerAmount,
                rate: 0,
                baseValue: Number(admission.totalFee),
                status: 'PENDING',
                notes: 'Manager commission (retroactive)'
              }
            });
            console.log('Created manager commission - Rs.', managerAmount);
          }
        }
      }
    }
  }

  console.log('\n=== Done ===');

  // Show updated commissions
  const allCommissions = await prisma.commission.findMany({
    where: { organizationId: orgId },
    include: { user: { select: { email: true, firstName: true } } }
  });

  console.log('\nAll commissions now:');
  allCommissions.forEach(c => console.log('-', c.user?.email, '| Rs.', c.amount, '|', c.status, '|', c.notes));
}

createMissingCommissions()
  .then(() => console.log('\nScript completed'))
  .catch(e => console.error('Error:', e))
  .finally(() => prisma.$disconnect());
