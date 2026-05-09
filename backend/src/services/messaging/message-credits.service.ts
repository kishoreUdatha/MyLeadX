/**
 * Message Credits Service
 * Manages messaging credits for SMS, WhatsApp, and RCS channels
 */

import { prisma } from '../../config/database';
import { MessageChannel, MessageCreditTransactionType, MessagePurchaseStatus } from '@prisma/client';
import { paymentGateway, CreateOrderParams } from '../payment-gateway.service';
import Decimal from 'decimal.js';

export interface MessageBalance {
  smsCredits: number;
  whatsappCredits: number;
  rcsCredits: number;
}

export interface MessagePricing {
  smsPrice: number;
  whatsappPrice: number;
  rcsPrice: number;
  smsBulkDiscount: Record<string, number>;
  whatsappBulkDiscount: Record<string, number>;
  rcsBulkDiscount: Record<string, number>;
  minPurchase: number;
}

export interface CreatePurchaseOrderParams {
  organizationId: string;
  userId: string;
  channel: MessageChannel;
  quantity: number;
}

export interface PurchaseOrderResult {
  success: boolean;
  purchaseId?: string;
  razorpayOrderId?: string;
  amount?: number;
  currency?: string;
  error?: string;
}

export interface ConfirmPurchaseParams {
  purchaseId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

class MessageCreditsService {
  /**
   * Get or create message balance for an organization
   */
  async getBalance(organizationId: string): Promise<MessageBalance> {
    let balance = await prisma.messageBalance.findUnique({
      where: { organizationId },
    });

    if (!balance) {
      balance = await prisma.messageBalance.create({
        data: {
          organizationId,
          smsCredits: 0,
          whatsappCredits: 0,
          rcsCredits: 0,
        },
      });
    }

    return {
      smsCredits: balance.smsCredits,
      whatsappCredits: balance.whatsappCredits,
      rcsCredits: balance.rcsCredits,
    };
  }

  /**
   * Get pricing for an organization (or default pricing)
   */
  async getPricing(organizationId?: string): Promise<MessagePricing> {
    // First try to get organization-specific pricing
    let pricing = organizationId
      ? await prisma.messagePricing.findUnique({
          where: { organizationId },
        })
      : null;

    // Fall back to default pricing (organizationId = null)
    if (!pricing) {
      pricing = await prisma.messagePricing.findFirst({
        where: { organizationId: null, isActive: true },
      });
    }

    // If no pricing exists, create default pricing
    if (!pricing) {
      pricing = await prisma.messagePricing.create({
        data: {
          organizationId: null,
          smsPrice: new Decimal(0.25),
          whatsappPrice: new Decimal(0.75),
          rcsPrice: new Decimal(0.60),
          minPurchase: 100,
          isActive: true,
        },
      });
    }

    return {
      smsPrice: Number(pricing.smsPrice),
      whatsappPrice: Number(pricing.whatsappPrice),
      rcsPrice: Number(pricing.rcsPrice),
      smsBulkDiscount: (pricing.smsBulkDiscount as Record<string, number>) || {},
      whatsappBulkDiscount: (pricing.whatsappBulkDiscount as Record<string, number>) || {},
      rcsBulkDiscount: (pricing.rcsBulkDiscount as Record<string, number>) || {},
      minPurchase: pricing.minPurchase,
    };
  }

  /**
   * Calculate price for a quantity with bulk discounts
   */
  calculatePrice(
    basePrice: number,
    quantity: number,
    bulkDiscounts: Record<string, number>
  ): { pricePerUnit: number; totalAmount: number } {
    let pricePerUnit = basePrice;

    // Find applicable bulk discount (highest quantity tier that applies)
    const tiers = Object.keys(bulkDiscounts)
      .map(Number)
      .sort((a, b) => b - a);

    for (const tier of tiers) {
      if (quantity >= tier) {
        pricePerUnit = bulkDiscounts[tier.toString()];
        break;
      }
    }

    return {
      pricePerUnit,
      totalAmount: pricePerUnit * quantity,
    };
  }

  /**
   * Create a purchase order for message credits
   */
  async createPurchaseOrder(params: CreatePurchaseOrderParams): Promise<PurchaseOrderResult> {
    const { organizationId, userId, channel, quantity } = params;

    // Get pricing
    const pricing = await this.getPricing(organizationId);

    // Check minimum purchase
    if (quantity < pricing.minPurchase) {
      return {
        success: false,
        error: `Minimum purchase quantity is ${pricing.minPurchase}`,
      };
    }

    // Calculate price based on channel
    let basePrice: number;
    let bulkDiscounts: Record<string, number>;

    switch (channel) {
      case MessageChannel.SMS:
        basePrice = pricing.smsPrice;
        bulkDiscounts = pricing.smsBulkDiscount;
        break;
      case MessageChannel.WHATSAPP:
        basePrice = pricing.whatsappPrice;
        bulkDiscounts = pricing.whatsappBulkDiscount;
        break;
      case MessageChannel.RCS:
        basePrice = pricing.rcsPrice;
        bulkDiscounts = pricing.rcsBulkDiscount;
        break;
      default:
        return { success: false, error: 'Invalid channel' };
    }

    const { pricePerUnit, totalAmount } = this.calculatePrice(basePrice, quantity, bulkDiscounts);

    // Create Razorpay order
    if (!paymentGateway.isConfigured()) {
      // For development/testing: Add credits directly without payment
      const result = await this.adjustCredits(
        organizationId,
        channel,
        quantity,
        'Test purchase (payment gateway not configured)',
        userId
      );

      return {
        success: true,
        amount: totalAmount,
        currency: 'INR',
        testMode: true,
        message: `Credits added (test mode). New balance: ${result.newBalance}`,
      };
    }

    const orderParams: CreateOrderParams = {
      amount: Math.round(totalAmount * 100), // Convert to paise
      currency: 'INR',
      receipt: `msg_${channel.toLowerCase()}_${Date.now()}`,
      notes: {
        organizationId,
        userId,
        channel,
        quantity: quantity.toString(),
        pricePerUnit: pricePerUnit.toString(),
      },
    };

    const order = await paymentGateway.createOrder(orderParams);

    // Create purchase record
    const purchase = await prisma.messagePurchase.create({
      data: {
        organizationId,
        userId,
        channel,
        quantity,
        pricePerUnit: new Decimal(pricePerUnit),
        totalAmount: new Decimal(totalAmount),
        razorpayOrderId: order.id,
        status: MessagePurchaseStatus.PENDING,
      },
    });

    return {
      success: true,
      purchaseId: purchase.id,
      razorpayOrderId: order.id,
      amount: totalAmount,
      currency: 'INR',
    };
  }

  /**
   * Confirm a purchase after successful payment
   */
  async confirmPurchase(params: ConfirmPurchaseParams): Promise<{ success: boolean; error?: string }> {
    const { purchaseId, razorpayPaymentId, razorpaySignature } = params;

    const purchase = await prisma.messagePurchase.findUnique({
      where: { id: purchaseId },
    });

    if (!purchase) {
      return { success: false, error: 'Purchase not found' };
    }

    if (purchase.status !== MessagePurchaseStatus.PENDING) {
      return { success: false, error: 'Purchase already processed' };
    }

    // Verify payment signature
    const isValid = paymentGateway.verifyPayment({
      orderId: purchase.razorpayOrderId!,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature,
    });

    if (!isValid) {
      await prisma.messagePurchase.update({
        where: { id: purchaseId },
        data: { status: MessagePurchaseStatus.FAILED },
      });
      return { success: false, error: 'Payment verification failed' };
    }

    // Update purchase and add credits in a transaction
    await prisma.$transaction(async (tx) => {
      // Update purchase status
      await tx.messagePurchase.update({
        where: { id: purchaseId },
        data: {
          razorpayPaymentId,
          razorpaySignature,
          status: MessagePurchaseStatus.COMPLETED,
        },
      });

      // Get or create balance
      let balance = await tx.messageBalance.findUnique({
        where: { organizationId: purchase.organizationId },
      });

      if (!balance) {
        balance = await tx.messageBalance.create({
          data: {
            organizationId: purchase.organizationId,
            smsCredits: 0,
            whatsappCredits: 0,
            rcsCredits: 0,
          },
        });
      }

      // Add credits based on channel
      const updateData: Record<string, number> = {};
      let newBalance = 0;

      switch (purchase.channel) {
        case MessageChannel.SMS:
          newBalance = balance.smsCredits + purchase.quantity;
          updateData.smsCredits = newBalance;
          break;
        case MessageChannel.WHATSAPP:
          newBalance = balance.whatsappCredits + purchase.quantity;
          updateData.whatsappCredits = newBalance;
          break;
        case MessageChannel.RCS:
          newBalance = balance.rcsCredits + purchase.quantity;
          updateData.rcsCredits = newBalance;
          break;
      }

      await tx.messageBalance.update({
        where: { organizationId: purchase.organizationId },
        data: updateData,
      });

      // Log transaction
      await tx.messageCreditTransaction.create({
        data: {
          organizationId: purchase.organizationId,
          channel: purchase.channel,
          transactionType: MessageCreditTransactionType.CREDIT,
          amount: purchase.quantity,
          balanceAfter: newBalance,
          referenceType: 'PURCHASE',
          referenceId: purchase.id,
          description: `Purchased ${purchase.quantity} ${purchase.channel} credits`,
          userId: purchase.userId,
        },
      });
    });

    return { success: true };
  }

  /**
   * Deduct credits when sending messages
   */
  async deductCredits(
    organizationId: string,
    channel: MessageChannel,
    count: number,
    referenceId?: string,
    userId?: string
  ): Promise<{ success: boolean; error?: string }> {
    const balance = await this.getBalance(organizationId);

    let currentBalance: number;
    switch (channel) {
      case MessageChannel.SMS:
        currentBalance = balance.smsCredits;
        break;
      case MessageChannel.WHATSAPP:
        currentBalance = balance.whatsappCredits;
        break;
      case MessageChannel.RCS:
        currentBalance = balance.rcsCredits;
        break;
      default:
        return { success: false, error: 'Invalid channel' };
    }

    if (currentBalance < count) {
      return { success: false, error: `Insufficient ${channel} credits` };
    }

    await prisma.$transaction(async (tx) => {
      const updateData: Record<string, { decrement: number }> = {};
      const newBalance = currentBalance - count;

      switch (channel) {
        case MessageChannel.SMS:
          updateData.smsCredits = { decrement: count };
          break;
        case MessageChannel.WHATSAPP:
          updateData.whatsappCredits = { decrement: count };
          break;
        case MessageChannel.RCS:
          updateData.rcsCredits = { decrement: count };
          break;
      }

      await tx.messageBalance.update({
        where: { organizationId },
        data: updateData,
      });

      await tx.messageCreditTransaction.create({
        data: {
          organizationId,
          channel,
          transactionType: MessageCreditTransactionType.DEBIT,
          amount: -count,
          balanceAfter: newBalance,
          referenceType: referenceId ? 'BULK_JOB' : 'SINGLE_MESSAGE',
          referenceId,
          description: `Deducted ${count} ${channel} credits`,
          userId,
        },
      });
    });

    return { success: true };
  }

  /**
   * Refund credits for failed messages
   */
  async refundCredits(
    organizationId: string,
    channel: MessageChannel,
    count: number,
    referenceId?: string,
    userId?: string
  ): Promise<{ success: boolean }> {
    await prisma.$transaction(async (tx) => {
      const balance = await tx.messageBalance.findUnique({
        where: { organizationId },
      });

      if (!balance) return;

      const updateData: Record<string, { increment: number }> = {};
      let newBalance = 0;

      switch (channel) {
        case MessageChannel.SMS:
          newBalance = balance.smsCredits + count;
          updateData.smsCredits = { increment: count };
          break;
        case MessageChannel.WHATSAPP:
          newBalance = balance.whatsappCredits + count;
          updateData.whatsappCredits = { increment: count };
          break;
        case MessageChannel.RCS:
          newBalance = balance.rcsCredits + count;
          updateData.rcsCredits = { increment: count };
          break;
      }

      await tx.messageBalance.update({
        where: { organizationId },
        data: updateData,
      });

      await tx.messageCreditTransaction.create({
        data: {
          organizationId,
          channel,
          transactionType: MessageCreditTransactionType.REFUND,
          amount: count,
          balanceAfter: newBalance,
          referenceType: 'REFUND',
          referenceId,
          description: `Refunded ${count} ${channel} credits for failed messages`,
          userId,
        },
      });
    });

    return { success: true };
  }

  /**
   * Admin: manually adjust credits
   */
  async adjustCredits(
    organizationId: string,
    channel: MessageChannel,
    amount: number,
    reason: string,
    adjustedById: string
  ): Promise<{ success: boolean; newBalance: number }> {
    let newBalance = 0;

    await prisma.$transaction(async (tx) => {
      let balance = await tx.messageBalance.findUnique({
        where: { organizationId },
      });

      if (!balance) {
        balance = await tx.messageBalance.create({
          data: {
            organizationId,
            smsCredits: 0,
            whatsappCredits: 0,
            rcsCredits: 0,
          },
        });
      }

      const updateData: Record<string, number> = {};

      switch (channel) {
        case MessageChannel.SMS:
          newBalance = Math.max(0, balance.smsCredits + amount);
          updateData.smsCredits = newBalance;
          break;
        case MessageChannel.WHATSAPP:
          newBalance = Math.max(0, balance.whatsappCredits + amount);
          updateData.whatsappCredits = newBalance;
          break;
        case MessageChannel.RCS:
          newBalance = Math.max(0, balance.rcsCredits + amount);
          updateData.rcsCredits = newBalance;
          break;
      }

      await tx.messageBalance.update({
        where: { organizationId },
        data: updateData,
      });

      // Create purchase record for audit
      await tx.messagePurchase.create({
        data: {
          organizationId,
          userId: adjustedById,
          channel,
          quantity: Math.abs(amount),
          pricePerUnit: new Decimal(0),
          totalAmount: new Decimal(0),
          status: MessagePurchaseStatus.COMPLETED,
          isManualAdjustment: true,
          adjustmentReason: reason,
          adjustedById,
        },
      });

      await tx.messageCreditTransaction.create({
        data: {
          organizationId,
          channel,
          transactionType: MessageCreditTransactionType.ADJUSTMENT,
          amount,
          balanceAfter: newBalance,
          referenceType: 'ADJUSTMENT',
          description: reason,
          userId: adjustedById,
        },
      });
    });

    return { success: true, newBalance };
  }

  /**
   * Get purchase history for an organization
   */
  async getPurchaseHistory(
    organizationId: string,
    options: { page?: number; limit?: number; channel?: MessageChannel } = {}
  ) {
    const { page = 1, limit = 20, channel } = options;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { organizationId };
    if (channel) {
      where.channel = channel;
    }

    const [purchases, total] = await Promise.all([
      prisma.messagePurchase.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      prisma.messagePurchase.count({ where }),
    ]);

    return {
      purchases,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get credit transactions for an organization
   */
  async getTransactionHistory(
    organizationId: string,
    options: { page?: number; limit?: number; channel?: MessageChannel } = {}
  ) {
    const { page = 1, limit = 50, channel } = options;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { organizationId };
    if (channel) {
      where.channel = channel;
    }

    const [transactions, total] = await Promise.all([
      prisma.messageCreditTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.messageCreditTransaction.count({ where }),
    ]);

    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Check if organization has sufficient credits
   */
  async hasCredits(organizationId: string, channel: MessageChannel, count: number): Promise<boolean> {
    const balance = await this.getBalance(organizationId);

    switch (channel) {
      case MessageChannel.SMS:
        return balance.smsCredits >= count;
      case MessageChannel.WHATSAPP:
        return balance.whatsappCredits >= count;
      case MessageChannel.RCS:
        return balance.rcsCredits >= count;
      default:
        return false;
    }
  }
}

export const messageCreditsService = new MessageCreditsService();
