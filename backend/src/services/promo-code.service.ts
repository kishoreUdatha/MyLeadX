/**
 * Promo Code Service - Handles promo code validation and redemption
 */

import { prisma } from '../config/database';
import { AppError } from '../utils/errors';
import { DiscountType } from '@prisma/client';

export interface PromoCodeValidation {
  valid: boolean;
  code: string;
  discountType: DiscountType;
  discountValue: number;
  discountAmount: number;
  finalAmount: number;
  message: string;
}

export interface ValidatePromoCodeInput {
  code: string;
  organizationId: string;
  planId: string;
  amount: number;
}

export interface RedeemPromoCodeInput {
  code: string;
  organizationId: string;
  subscriptionId?: string;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
}

class PromoCodeService {
  /**
   * Validate a promo code
   */
  async validatePromoCode(input: ValidatePromoCodeInput): Promise<PromoCodeValidation> {
    const { code, organizationId, planId, amount } = input;

    // Find the promo code
    const promoCode = await prisma.promoCode.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        redemptions: {
          where: { organizationId },
        },
      },
    });

    // Check if code exists
    if (!promoCode) {
      return {
        valid: false,
        code,
        discountType: 'PERCENTAGE',
        discountValue: 0,
        discountAmount: 0,
        finalAmount: amount,
        message: 'Invalid promo code',
      };
    }

    // Check if code is active
    if (!promoCode.isActive) {
      return {
        valid: false,
        code,
        discountType: promoCode.discountType,
        discountValue: promoCode.discountValue,
        discountAmount: 0,
        finalAmount: amount,
        message: 'This promo code is no longer active',
      };
    }

    // Check validity period
    const now = new Date();
    if (promoCode.validFrom > now) {
      return {
        valid: false,
        code,
        discountType: promoCode.discountType,
        discountValue: promoCode.discountValue,
        discountAmount: 0,
        finalAmount: amount,
        message: 'This promo code is not yet valid',
      };
    }

    if (promoCode.validUntil && promoCode.validUntil < now) {
      return {
        valid: false,
        code,
        discountType: promoCode.discountType,
        discountValue: promoCode.discountValue,
        discountAmount: 0,
        finalAmount: amount,
        message: 'This promo code has expired',
      };
    }

    // Check max uses
    if (promoCode.maxUses && promoCode.usedCount >= promoCode.maxUses) {
      return {
        valid: false,
        code,
        discountType: promoCode.discountType,
        discountValue: promoCode.discountValue,
        discountAmount: 0,
        finalAmount: amount,
        message: 'This promo code has reached its usage limit',
      };
    }

    // Check max uses per organization
    if (promoCode.redemptions.length >= promoCode.maxUsesPerOrg) {
      return {
        valid: false,
        code,
        discountType: promoCode.discountType,
        discountValue: promoCode.discountValue,
        discountAmount: 0,
        finalAmount: amount,
        message: 'You have already used this promo code',
      };
    }

    // Check minimum amount
    if (promoCode.minAmount && amount < promoCode.minAmount) {
      return {
        valid: false,
        code,
        discountType: promoCode.discountType,
        discountValue: promoCode.discountValue,
        discountAmount: 0,
        finalAmount: amount,
        message: `Minimum order amount is ₹${promoCode.minAmount.toLocaleString('en-IN')}`,
      };
    }

    // Check applicable plans
    if (promoCode.applicablePlans.length > 0 && !promoCode.applicablePlans.includes(planId)) {
      return {
        valid: false,
        code,
        discountType: promoCode.discountType,
        discountValue: promoCode.discountValue,
        discountAmount: 0,
        finalAmount: amount,
        message: 'This promo code is not valid for the selected plan',
      };
    }

    // Check new customers only
    if (promoCode.newCustomersOnly) {
      const existingSubscription = await prisma.subscription.findFirst({
        where: {
          organizationId,
          status: { in: ['ACTIVE', 'CANCELLED', 'EXPIRED'] },
        },
      });

      if (existingSubscription) {
        return {
          valid: false,
          code,
          discountType: promoCode.discountType,
          discountValue: promoCode.discountValue,
          discountAmount: 0,
          finalAmount: amount,
          message: 'This promo code is for new customers only',
        };
      }
    }

    // Calculate discount
    let discountAmount: number;
    if (promoCode.discountType === 'PERCENTAGE') {
      discountAmount = Math.round(amount * (promoCode.discountValue / 100));
      // Apply max discount cap if set
      if (promoCode.maxDiscount && discountAmount > promoCode.maxDiscount) {
        discountAmount = promoCode.maxDiscount;
      }
    } else {
      // Fixed discount
      discountAmount = Math.min(promoCode.discountValue, amount);
    }

    const finalAmount = amount - discountAmount;

    return {
      valid: true,
      code: promoCode.code,
      discountType: promoCode.discountType,
      discountValue: promoCode.discountValue,
      discountAmount,
      finalAmount,
      message: promoCode.discountType === 'PERCENTAGE'
        ? `${promoCode.discountValue}% discount applied!`
        : `₹${promoCode.discountValue.toLocaleString('en-IN')} discount applied!`,
    };
  }

  /**
   * Redeem a promo code (called after successful payment)
   */
  async redeemPromoCode(input: RedeemPromoCodeInput): Promise<void> {
    const { code, organizationId, subscriptionId, originalAmount, discountAmount, finalAmount } = input;

    const promoCode = await prisma.promoCode.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!promoCode) {
      throw new AppError('Promo code not found', 404);
    }

    await prisma.$transaction([
      // Create redemption record
      prisma.promoCodeRedemption.create({
        data: {
          promoCodeId: promoCode.id,
          organizationId,
          subscriptionId,
          discountAmount,
          originalAmount,
          finalAmount,
        },
      }),
      // Increment used count
      prisma.promoCode.update({
        where: { id: promoCode.id },
        data: {
          usedCount: { increment: 1 },
        },
      }),
    ]);
  }

  /**
   * Create a new promo code (admin only)
   */
  async createPromoCode(data: {
    code: string;
    description?: string;
    discountType: DiscountType;
    discountValue: number;
    maxUses?: number;
    maxUsesPerOrg?: number;
    minAmount?: number;
    maxDiscount?: number;
    validFrom?: Date;
    validUntil?: Date;
    applicablePlans?: string[];
    newCustomersOnly?: boolean;
  }) {
    // Check if code already exists
    const existing = await prisma.promoCode.findUnique({
      where: { code: data.code.toUpperCase() },
    });

    if (existing) {
      throw new AppError('Promo code already exists', 400);
    }

    return prisma.promoCode.create({
      data: {
        code: data.code.toUpperCase(),
        description: data.description,
        discountType: data.discountType,
        discountValue: data.discountValue,
        maxUses: data.maxUses,
        maxUsesPerOrg: data.maxUsesPerOrg || 1,
        minAmount: data.minAmount,
        maxDiscount: data.maxDiscount,
        validFrom: data.validFrom || new Date(),
        validUntil: data.validUntil,
        applicablePlans: data.applicablePlans || [],
        newCustomersOnly: data.newCustomersOnly || false,
      },
    });
  }

  /**
   * Get all promo codes (admin only)
   */
  async getPromoCodes(activeOnly: boolean = false) {
    return prisma.promoCode.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      include: {
        _count: {
          select: { redemptions: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Deactivate a promo code
   */
  async deactivatePromoCode(id: string) {
    return prisma.promoCode.update({
      where: { id },
      data: { isActive: false },
    });
  }
}

export const promoCodeService = new PromoCodeService();
export default promoCodeService;
