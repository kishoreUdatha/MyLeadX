/**
 * LeadStageService — cross-tenant FollowUpConfig validation
 *
 * Verifies that a tenant cannot point a LeadStage at another tenant's
 * FollowUpConfig via either createCustomStage or updateStage. The DB FK
 * alone does not enforce this — the service must scope the lookup by
 * organizationId.
 */

jest.mock('../config/database', () => ({
  prisma: {
    followUpConfig: { findFirst: jest.fn() },
    leadStage: { create: jest.fn(), update: jest.fn() },
  },
}));

import { prisma } from '../config/database';
import { leadStageService } from '../services/lead-stage.service';

const followUpConfigFindFirst = prisma.followUpConfig.findFirst as jest.Mock;
const leadStageCreate = prisma.leadStage.create as jest.Mock;
const leadStageUpdate = prisma.leadStage.update as jest.Mock;

const ORG_A = 'org-a';
const ORG_B = 'org-b';
const CONFIG_IN_ORG_A = 'cfg-in-a';
const STAGE_IN_ORG_B = 'stage-in-b';

describe('LeadStageService follow-up config tenant isolation', () => {
  describe('createCustomStage', () => {
    it('rejects when followUpConfigId belongs to a different org', async () => {
      followUpConfigFindFirst.mockResolvedValue(null);

      await expect(
        leadStageService.createCustomStage(ORG_B, {
          name: 'Custom',
          followUpConfigId: CONFIG_IN_ORG_A,
        })
      ).rejects.toThrow('Follow-up config not found in this organization');

      expect(followUpConfigFindFirst).toHaveBeenCalledWith({
        where: { id: CONFIG_IN_ORG_A, organizationId: ORG_B },
        select: { id: true },
      });
      expect(leadStageCreate).not.toHaveBeenCalled();
    });

    it('creates the stage when followUpConfigId is in the same org', async () => {
      followUpConfigFindFirst.mockResolvedValue({ id: CONFIG_IN_ORG_A });
      leadStageCreate.mockResolvedValue({ id: 'new-stage' });

      await leadStageService.createCustomStage(ORG_A, {
        name: 'Custom',
        followUpConfigId: CONFIG_IN_ORG_A,
      });

      expect(followUpConfigFindFirst).toHaveBeenCalledWith({
        where: { id: CONFIG_IN_ORG_A, organizationId: ORG_A },
        select: { id: true },
      });
      expect(leadStageCreate).toHaveBeenCalledTimes(1);
      expect(leadStageCreate.mock.calls[0][0].data.followUpConfigId).toBe(
        CONFIG_IN_ORG_A
      );
    });

    it('skips the lookup when followUpConfigId is omitted', async () => {
      leadStageCreate.mockResolvedValue({ id: 'new-stage' });

      await leadStageService.createCustomStage(ORG_A, { name: 'Custom' });

      expect(followUpConfigFindFirst).not.toHaveBeenCalled();
      expect(leadStageCreate.mock.calls[0][0].data.followUpConfigId).toBeNull();
    });
  });

  describe('updateStage', () => {
    it('rejects when followUpConfigId belongs to a different org', async () => {
      followUpConfigFindFirst.mockResolvedValue(null);

      await expect(
        leadStageService.updateStage(STAGE_IN_ORG_B, ORG_B, {
          followUpConfigId: CONFIG_IN_ORG_A,
        })
      ).rejects.toThrow('Follow-up config not found in this organization');

      expect(followUpConfigFindFirst).toHaveBeenCalledWith({
        where: { id: CONFIG_IN_ORG_A, organizationId: ORG_B },
        select: { id: true },
      });
      expect(leadStageUpdate).not.toHaveBeenCalled();
    });

    it('updates when followUpConfigId is in the same org', async () => {
      followUpConfigFindFirst.mockResolvedValue({ id: CONFIG_IN_ORG_A });
      leadStageUpdate.mockResolvedValue({ id: 'stage-in-a' });

      await leadStageService.updateStage('stage-in-a', ORG_A, {
        followUpConfigId: CONFIG_IN_ORG_A,
      });

      expect(leadStageUpdate).toHaveBeenCalledTimes(1);
      expect(leadStageUpdate.mock.calls[0][0].data.followUpConfigId).toBe(
        CONFIG_IN_ORG_A
      );
    });

    it('skips the lookup when clearing followUpConfigId to null', async () => {
      leadStageUpdate.mockResolvedValue({ id: 'stage-in-a' });

      await leadStageService.updateStage('stage-in-a', ORG_A, {
        followUpConfigId: null,
      });

      expect(followUpConfigFindFirst).not.toHaveBeenCalled();
      expect(leadStageUpdate.mock.calls[0][0].data.followUpConfigId).toBeNull();
    });
  });
});
