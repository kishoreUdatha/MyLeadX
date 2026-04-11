/**
 * Commission Config Service
 * Manages fixed commission amounts per admission type per role
 */

import { prisma } from '../config/database';
import { AdmissionType } from '@prisma/client';

export interface CommissionConfigInput {
  admissionType: AdmissionType;
  telecallerAmount: number;
  teamLeadAmount: number;
  managerAmount: number;
}

class CommissionConfigService {
  /**
   * Get all commission configs for an organization
   */
  async getAll(organizationId: string) {
    return prisma.commissionConfig.findMany({
      where: { organizationId },
      orderBy: { admissionType: 'asc' },
    });
  }

  /**
   * Get commission config for a specific admission type
   */
  async getByAdmissionType(organizationId: string, admissionType: AdmissionType) {
    return prisma.commissionConfig.findUnique({
      where: {
        organizationId_admissionType: {
          organizationId,
          admissionType,
        },
      },
    });
  }

  /**
   * Create or update commission config
   */
  async upsert(organizationId: string, data: CommissionConfigInput) {
    return prisma.commissionConfig.upsert({
      where: {
        organizationId_admissionType: {
          organizationId,
          admissionType: data.admissionType,
        },
      },
      update: {
        telecallerAmount: data.telecallerAmount,
        teamLeadAmount: data.teamLeadAmount,
        managerAmount: data.managerAmount,
      },
      create: {
        organizationId,
        admissionType: data.admissionType,
        telecallerAmount: data.telecallerAmount,
        teamLeadAmount: data.teamLeadAmount,
        managerAmount: data.managerAmount,
      },
    });
  }

  /**
   * Bulk update commission configs
   */
  async bulkUpsert(organizationId: string, configs: CommissionConfigInput[]) {
    const results = await Promise.all(
      configs.map(config => this.upsert(organizationId, config))
    );
    return results;
  }

  /**
   * Initialize default configs for all admission types
   */
  async initializeDefaults(organizationId: string) {
    const admissionTypes: AdmissionType[] = ['DONATION', 'NON_DONATION', 'NRI', 'SCHOLARSHIP'];

    const existingConfigs = await this.getAll(organizationId);
    const existingTypes = existingConfigs.map(c => c.admissionType);

    const missingTypes = admissionTypes.filter(type => !existingTypes.includes(type));

    if (missingTypes.length > 0) {
      await prisma.commissionConfig.createMany({
        data: missingTypes.map(type => ({
          organizationId,
          admissionType: type,
          telecallerAmount: 0,
          teamLeadAmount: 0,
          managerAmount: 0,
        })),
        skipDuplicates: true,
      });
    }

    return this.getAll(organizationId);
  }
}

export const commissionConfigService = new CommissionConfigService();
