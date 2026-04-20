/**
 * Wallet Service - Handles wallet top-ups, balance, and transactions
 */

import { prisma } from '../config/database';
import { paymentGateway } from './payment-gateway.service';
import { AppError } from '../utils/errors';
import { WalletTransactionType, WalletTransactionStatus } from '@prisma/client';

// Top-up presets in INR
export const TOPUP_PRESETS = [500, 1000, 2000, 5000];

export interface TopUpInput {
  organizationId: string;
  amount: number; // In INR
  currency?: string;
}

export interface WalletBalance {
  balance: number;
  currency: string;
  presets: number[];
  lastTransaction?: {
    type: string;
    amount: number;
    description: string;
    createdAt: Date;
  };
}

export interface TransactionHistoryParams {
  organizationId: string;
  page?: number;
  limit?: number;
  type?: WalletTransactionType;
}

class WalletService {
  /**
   * Get current wallet balance for an organization
   */
  async getBalance(organizationId: string): Promise<WalletBalance> {
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        subscriptionWalletBalance: true,
        subscriptionWalletCurrency: true,
      },
    });

    if (!organization) {
      throw new AppError('Organization not found', 404);
    }

    // Get last transaction
    const lastTransaction = await prisma.walletTransaction.findFirst({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      select: {
        type: true,
        amount: true,
        description: true,
        createdAt: true,
      },
    });

    return {
      balance: organization.subscriptionWalletBalance || 0,
      currency: organization.subscriptionWalletCurrency || 'INR',
      presets: TOPUP_PRESETS,
      lastTransaction: lastTransaction ? {
        type: lastTransaction.type,
        amount: lastTransaction.amount,
        description: lastTransaction.description,
        createdAt: lastTransaction.createdAt,
      } : undefined,
    };
  }

  /**
   * Create a top-up order using Razorpay
   */
  async createTopUp(input: TopUpInput): Promise<{
    orderId: string;
    amount: number;
    currency: string;
    keyId: string | undefined;
  }> {
    const { organizationId, amount, currency = 'INR' } = input;

    if (amount < 100) {
      throw new AppError('Minimum top-up amount is ₹100', 400);
    }

    if (amount > 100000) {
      throw new AppError('Maximum top-up amount is ₹1,00,000', 400);
    }

    // Create Razorpay order
    const order = await paymentGateway.createOrder({
      amount: amount * 100, // Convert to paise
      currency,
      receipt: `topup_${organizationId}_${Date.now()}`,
      notes: {
        organizationId,
        type: 'wallet_topup',
        amount: amount.toString(),
      },
    });

    // Create pending wallet transaction
    const currentBalance = await this.getCurrentBalance(organizationId);

    await prisma.walletTransaction.create({
      data: {
        organizationId,
        type: WalletTransactionType.CREDIT,
        amount,
        currency,
        balanceBefore: currentBalance,
        balanceAfter: currentBalance, // Will be updated on verification
        referenceType: 'razorpay_topup',
        referenceId: order.id,
        description: `Wallet top-up of ₹${amount.toLocaleString('en-IN')}`,
        razorpayOrderId: order.id,
        status: WalletTransactionStatus.PENDING,
      },
    });

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: paymentGateway.getPublicKey(),
    };
  }

  /**
   * Verify top-up payment and credit wallet
   */
  async verifyTopUp(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string
  ): Promise<{
    success: boolean;
    newBalance: number;
    transactionId: string;
  }> {
    // Verify payment signature
    const isValid = paymentGateway.verifyPayment({
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature,
    });

    if (!isValid) {
      // Update transaction status to failed
      await prisma.walletTransaction.updateMany({
        where: { razorpayOrderId },
        data: { status: WalletTransactionStatus.FAILED },
      });
      throw new AppError('Invalid payment signature', 400);
    }

    // Get the pending transaction
    const transaction = await prisma.walletTransaction.findFirst({
      where: { razorpayOrderId, status: WalletTransactionStatus.PENDING },
    });

    if (!transaction) {
      throw new AppError('Transaction not found or already processed', 404);
    }

    // Use atomic transaction to update balance and transaction
    const result = await prisma.$transaction(async (tx) => {
      // Get current balance with lock
      const org = await tx.organization.findUnique({
        where: { id: transaction.organizationId },
        select: { subscriptionWalletBalance: true },
      });

      const currentBalance = org?.subscriptionWalletBalance || 0;
      const newBalance = currentBalance + transaction.amount;

      // Update organization wallet balance
      await tx.organization.update({
        where: { id: transaction.organizationId },
        data: {
          subscriptionWalletBalance: newBalance,
          subscriptionWalletCurrency: transaction.currency,
        },
      });

      // Update transaction with payment details
      const updatedTransaction = await tx.walletTransaction.update({
        where: { id: transaction.id },
        data: {
          razorpayPaymentId,
          balanceBefore: currentBalance,
          balanceAfter: newBalance,
          status: WalletTransactionStatus.COMPLETED,
        },
      });

      return { newBalance, transactionId: updatedTransaction.id };
    });

    return {
      success: true,
      newBalance: result.newBalance,
      transactionId: result.transactionId,
    };
  }

  /**
   * Get transaction history for an organization
   */
  async getTransactions(params: TransactionHistoryParams): Promise<{
    transactions: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { organizationId, page = 1, limit = 20, type } = params;

    const where: any = {
      organizationId,
      status: WalletTransactionStatus.COMPLETED,
    };

    if (type) {
      where.type = type;
    }

    const [transactions, total] = await Promise.all([
      prisma.walletTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          type: true,
          amount: true,
          currency: true,
          balanceBefore: true,
          balanceAfter: true,
          description: true,
          referenceType: true,
          referenceId: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.walletTransaction.count({ where }),
    ]);

    return {
      transactions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Debit wallet for a purchase (e.g., phone number purchase)
   */
  async debitWallet(
    organizationId: string,
    amount: number,
    description: string,
    referenceType: string,
    referenceId: string,
    metadata?: Record<string, any>
  ): Promise<{
    success: boolean;
    newBalance: number;
    transactionId: string;
  }> {
    const currentBalance = await this.getCurrentBalance(organizationId);

    if (currentBalance < amount) {
      throw new AppError('Insufficient wallet balance', 400);
    }

    const result = await prisma.$transaction(async (tx) => {
      const newBalance = currentBalance - amount;

      // Update organization wallet balance
      await tx.organization.update({
        where: { id: organizationId },
        data: { subscriptionWalletBalance: newBalance },
      });

      // Create debit transaction
      const transaction = await tx.walletTransaction.create({
        data: {
          organizationId,
          type: WalletTransactionType.DEBIT,
          amount: -amount, // Negative for debit
          currency: 'INR',
          balanceBefore: currentBalance,
          balanceAfter: newBalance,
          description,
          referenceType,
          referenceId,
          metadata,
          status: WalletTransactionStatus.COMPLETED,
        },
      });

      return { newBalance, transactionId: transaction.id };
    });

    return {
      success: true,
      newBalance: result.newBalance,
      transactionId: result.transactionId,
    };
  }

  /**
   * Credit wallet (e.g., refund)
   */
  async creditWallet(
    organizationId: string,
    amount: number,
    description: string,
    referenceType: string,
    referenceId: string,
    metadata?: Record<string, any>
  ): Promise<{
    success: boolean;
    newBalance: number;
    transactionId: string;
  }> {
    const currentBalance = await this.getCurrentBalance(organizationId);

    const result = await prisma.$transaction(async (tx) => {
      const newBalance = currentBalance + amount;

      // Update organization wallet balance
      await tx.organization.update({
        where: { id: organizationId },
        data: { subscriptionWalletBalance: newBalance },
      });

      // Create credit transaction
      const transaction = await tx.walletTransaction.create({
        data: {
          organizationId,
          type: WalletTransactionType.CREDIT,
          amount,
          currency: 'INR',
          balanceBefore: currentBalance,
          balanceAfter: newBalance,
          description,
          referenceType,
          referenceId,
          metadata,
          status: WalletTransactionStatus.COMPLETED,
        },
      });

      return { newBalance, transactionId: transaction.id };
    });

    return {
      success: true,
      newBalance: result.newBalance,
      transactionId: result.transactionId,
    };
  }

  /**
   * Get current wallet balance (helper)
   */
  private async getCurrentBalance(organizationId: string): Promise<number> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { subscriptionWalletBalance: true },
    });
    return org?.subscriptionWalletBalance || 0;
  }

  /**
   * Get recent transactions (last 3)
   */
  async getRecentTransactions(organizationId: string, count: number = 3) {
    return prisma.walletTransaction.findMany({
      where: {
        organizationId,
        status: WalletTransactionStatus.COMPLETED,
      },
      orderBy: { createdAt: 'desc' },
      take: count,
      select: {
        id: true,
        type: true,
        amount: true,
        description: true,
        createdAt: true,
      },
    });
  }
}

export const walletService = new WalletService();
export default walletService;
