/**
 * Billing Service
 * Handles automatic billing cycle generation
 * Following SOLID principles: Single Responsibility
 */

import { PrismaClient, User, Payment } from "@prisma/client";
import { addMonths, addDays, startOfDay } from "date-fns";
import {
  PaymentMethod,
  PaymentStatus,
  PLAN_PRICES,
  SubscriptionStatus,
} from "../types/subscription.types";
import { AppError } from "../errors/AppError";
import { PaymentService } from "./payment.service";

export class BillingService {
  private paymentService: PaymentService;

  constructor(private prisma: PrismaClient) {
    this.paymentService = new PaymentService(prisma);
  }

  /**
   * Generate monthly billing for a user
   */
  async generateMonthlyBilling(userId: string): Promise<Payment> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        Payment: {
          where: {
            status: { in: [PaymentStatus.PENDING, PaymentStatus.OVERDUE] },
          },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!user) {
      throw new AppError("Usuário não encontrado", 404);
    }

    // Don't generate billing for free plan
    if (user.plan === "free") {
      throw new AppError("Usuário no plano gratuito não requer cobrança", 400);
    }

    // Check if user already has a pending payment
    if (user.Payment.length > 0) {
      throw new AppError("Usuário já possui uma cobrança pendente", 400);
    }

    // Get plan price
    const amount = PLAN_PRICES[user.plan] || 0;

    if (amount === 0) {
      throw new AppError("Plano inválido ou sem valor definido", 400);
    }

    // Calculate due date (next month from subscription end date or now)
    const baseDate = user.subscriptionEndDate || new Date();
    const dueDate = startOfDay(addDays(baseDate, 1));

    // Create payment
    const payment = await this.paymentService.createPayment({
      userId: user.id,
      amount,
      currency: "BRL",
      dueDate,
      paymentMethod: PaymentMethod.PIX,
      metadata: {
        plan: user.plan,
        generatedAt: new Date(),
        billingCycle: "monthly",
      },
    });

    return payment;
  }

  /**
   * Generate billing for all active users
   */
  async generateBillingForAllUsers(): Promise<{
    generated: number;
    errors: string[];
  }> {
    const activeUsers = await this.prisma.user.findMany({
      where: {
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        plan: { not: "free" },
        isActive: true,
        subscriptionEndDate: {
          lte: addDays(new Date(), 5), // Generate 5 days before expiration
        },
      },
      include: {
        Payment: {
          where: {
            status: { in: [PaymentStatus.PENDING, PaymentStatus.OVERDUE] },
          },
        },
      },
    });

    let generated = 0;
    const errors: string[] = [];

    for (const user of activeUsers) {
      // Skip if user already has pending payment
      if (user.Payment.length > 0) {
        continue;
      }

      try {
        await this.generateMonthlyBilling(user.id);
        generated++;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        errors.push(`User ${user.id} (${user.email}): ${errorMessage}`);
      }
    }

    return { generated, errors };
  }

  /**
   * Generate billing for users with expiring subscriptions
   */
  async generateBillingForExpiringSubscriptions(
    daysBeforeExpiration: number = 5
  ): Promise<number> {
    const targetDate = addDays(new Date(), daysBeforeExpiration);

    const users = await this.prisma.user.findMany({
      where: {
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        plan: { not: "free" },
        isActive: true,
        subscriptionEndDate: {
          lte: targetDate,
          gte: new Date(),
        },
      },
      include: {
        Payment: {
          where: {
            status: { in: [PaymentStatus.PENDING, PaymentStatus.OVERDUE] },
          },
        },
      },
    });

    let generated = 0;

    for (const user of users) {
      // Skip if user already has pending payment
      if (user.Payment.length > 0) {
        continue;
      }

      try {
        await this.generateMonthlyBilling(user.id);
        generated++;
      } catch (error) {
        console.error(`Failed to generate billing for user ${user.id}:`, error);
      }
    }

    return generated;
  }

  /**
   * Calculate prorated amount for plan upgrade/downgrade
   */
  calculateProratedAmount(
    currentPlan: string,
    newPlan: string,
    daysRemaining: number,
    daysInMonth: number = 30
  ): number {
    const currentAmount = PLAN_PRICES[currentPlan] || 0;
    const newAmount = PLAN_PRICES[newPlan] || 0;

    const dailyCurrentRate = currentAmount / daysInMonth;
    const dailyNewRate = newAmount / daysInMonth;

    const refund = dailyCurrentRate * daysRemaining;
    const charge = dailyNewRate * daysRemaining;

    return Math.max(0, charge - refund);
  }

  /**
   * Process plan change with prorated billing
   */
  async processPlanChange(
    userId: string,
    newPlan: string,
    daysRemaining: number
  ): Promise<Payment | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError("Usuário não encontrado", 404);
    }

    const proratedAmount = this.calculateProratedAmount(
      user.plan,
      newPlan,
      daysRemaining
    );

    // If downgrade or no charge needed, just update the plan
    if (proratedAmount <= 0) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { plan: newPlan },
      });
      return null;
    }

    // Create prorated payment
    const payment = await this.paymentService.createPayment({
      userId: user.id,
      amount: proratedAmount,
      currency: "BRL",
      dueDate: new Date(),
      paymentMethod: PaymentMethod.PIX,
      metadata: {
        type: "plan_change",
        oldPlan: user.plan,
        newPlan: newPlan,
        daysRemaining,
        prorated: true,
      },
    });

    return payment;
  }

  /**
   * Get billing history for a user
   */
  async getUserBillingHistory(userId: string): Promise<Payment[]> {
    return await this.prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Get upcoming bills
   */
  async getUpcomingBills(days: number = 30): Promise<User[]> {
    const targetDate = addDays(new Date(), days);

    return await this.prisma.user.findMany({
      where: {
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        plan: { not: "free" },
        isActive: true,
        subscriptionEndDate: {
          lte: targetDate,
          gte: new Date(),
        },
      },
      include: {
        Payment: {
          where: {
            status: { in: [PaymentStatus.PENDING, PaymentStatus.OVERDUE] },
          },
          orderBy: { dueDate: "asc" },
        },
      },
    });
  }

  /**
   * Cancel pending bills for a user
   */
  async cancelUserPendingBills(
    userId: string,
    reason: string = "Cancelamento solicitado"
  ): Promise<number> {
    const result = await this.prisma.payment.updateMany({
      where: {
        userId,
        status: { in: [PaymentStatus.PENDING, PaymentStatus.OVERDUE] },
      },
      data: {
        status: PaymentStatus.CANCELLED,
        cancelReason: reason,
      },
    });

    return result.count;
  }
}
