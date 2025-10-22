/**
 * Subscription Service
 * Handles all subscription-related business logic
 * Following SOLID principles: Single Responsibility
 */

import { PrismaClient, User } from "@prisma/client";
import {
  addMonths,
  addDays,
  differenceInDays,
  isBefore,
  isAfter,
} from "date-fns";
import {
  SubscriptionStatus,
  SubscriptionInfo,
  GRACE_PERIOD_DAYS,
} from "../types/subscription.types";
import { AppError } from "../errors/AppError";

export class SubscriptionService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get subscription information for a user
   */
  async getSubscriptionInfo(userId: string): Promise<SubscriptionInfo> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          Payment: {
            where: {
              status: { in: ["pending", "overdue"] },
            },
            orderBy: { dueDate: "desc" },
            take: 1,
          },
        },
      });

      if (!user) {
        throw new AppError("Usuário não encontrado", 404);
      }

      // Safe access to Payment array
      const payments = user.Payment || [];
      const hasOverduePayment = payments.some((p) => p.status === "overdue");
      const nextPayment = payments[0];

      let daysUntilExpiration: number | null = null;
      if (user.subscriptionEndDate) {
        daysUntilExpiration = differenceInDays(
          user.subscriptionEndDate,
          new Date()
        );
      }

      return {
        userId: user.id,
        plan: user.plan,
        status:
          (user.subscriptionStatus as SubscriptionStatus) ||
          SubscriptionStatus.PENDING,
        subscriptionEndDate: user.subscriptionEndDate,
        isActive: user.isActive ?? false,
        daysUntilExpiration,
        hasOverduePayment,
        nextPaymentDate: nextPayment?.dueDate || null,
      };
    } catch (error) {
      console.error("Erro ao buscar informações de assinatura:", error);
      throw error;
    }
  }

  /**
   * Activate subscription after payment
   */
  async activateSubscription(
    userId: string,
    durationMonths: number = 1
  ): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError("Usuário não encontrado", 404);
    }

    const now = new Date();
    const newEndDate =
      user.subscriptionEndDate && isAfter(user.subscriptionEndDate, now)
        ? addMonths(user.subscriptionEndDate, durationMonths)
        : addMonths(now, durationMonths);

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        subscriptionEndDate: newEndDate,
        isActive: true,
        active: true,
        updatedAt: new Date(),
      },
    });

    return updatedUser;
  }

  /**
   * Suspend subscription (overdue payment)
   */
  async suspendSubscription(
    userId: string,
    reason: string = "Pagamento em atraso"
  ): Promise<User> {
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionStatus: SubscriptionStatus.SUSPENDED,
        isActive: false,
        active: false,
        updatedAt: new Date(),
      },
    });

    return updatedUser;
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(userId: string, reason?: string): Promise<User> {
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionStatus: SubscriptionStatus.CANCELLED,
        isActive: false,
        active: false,
        updatedAt: new Date(),
      },
    });

    return updatedUser;
  }

  /**
   * Check if user subscription is valid and active
   */
  async isSubscriptionValid(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        subscriptionStatus: true,
        subscriptionEndDate: true,
        isActive: true,
        active: true,
      },
    });

    if (!user) {
      return false;
    }

    // Check if user is active
    if (!user.isActive || !user.active) {
      return false;
    }

    // Check subscription status
    if (user.subscriptionStatus !== SubscriptionStatus.ACTIVE) {
      return false;
    }

    // Check expiration date
    if (
      user.subscriptionEndDate &&
      isBefore(user.subscriptionEndDate, new Date())
    ) {
      return false;
    }

    return true;
  }

  /**
   * Get all users with expiring subscriptions
   */
  async getUsersWithExpiringSubscriptions(
    daysBeforeExpiration: number
  ): Promise<User[]> {
    const targetDate = addDays(new Date(), daysBeforeExpiration);

    const users = await this.prisma.user.findMany({
      where: {
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        subscriptionEndDate: {
          lte: targetDate,
          gte: new Date(),
        },
      },
      include: {
        Payment: {
          where: {
            status: { in: ["pending", "overdue"] },
            dueDate: {
              lte: targetDate,
            },
          },
        },
      },
    });

    return users;
  }

  /**
   * Get all users with expired subscriptions
   */
  async getUsersWithExpiredSubscriptions(): Promise<User[]> {
    const gracePeriodDate = addDays(new Date(), -GRACE_PERIOD_DAYS);

    const users = await this.prisma.user.findMany({
      where: {
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        subscriptionEndDate: {
          lt: gracePeriodDate,
        },
      },
    });

    return users;
  }

  /**
   * Process expired subscriptions (suspend users)
   */
  async processExpiredSubscriptions(): Promise<number> {
    const expiredUsers = await this.getUsersWithExpiredSubscriptions();

    let suspendedCount = 0;

    for (const user of expiredUsers) {
      try {
        await this.suspendSubscription(user.id, "Assinatura expirada");
        suspendedCount++;
      } catch (error) {
        console.error(`Failed to suspend user ${user.id}:`, error);
      }
    }

    return suspendedCount;
  }

  /**
   * Renew subscription manually
   */
  async renewSubscription(
    userId: string,
    durationMonths: number = 1
  ): Promise<User> {
    return await this.activateSubscription(userId, durationMonths);
  }

  /**
   * Get subscription statistics for admin dashboard
   */
  async getSubscriptionStatistics(): Promise<any> {
    const [
      totalUsers,
      activeSubscriptions,
      suspendedSubscriptions,
      cancelledSubscriptions,
      expiringIn7Days,
      expiringIn3Days,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({
        where: { subscriptionStatus: SubscriptionStatus.ACTIVE },
      }),
      this.prisma.user.count({
        where: { subscriptionStatus: SubscriptionStatus.SUSPENDED },
      }),
      this.prisma.user.count({
        where: { subscriptionStatus: SubscriptionStatus.CANCELLED },
      }),
      this.prisma.user.count({
        where: {
          subscriptionStatus: SubscriptionStatus.ACTIVE,
          subscriptionEndDate: {
            lte: addDays(new Date(), 7),
            gte: new Date(),
          },
        },
      }),
      this.prisma.user.count({
        where: {
          subscriptionStatus: SubscriptionStatus.ACTIVE,
          subscriptionEndDate: {
            lte: addDays(new Date(), 3),
            gte: new Date(),
          },
        },
      }),
    ]);

    return {
      totalUsers,
      activeSubscriptions,
      suspendedSubscriptions,
      cancelledSubscriptions,
      expiringIn7Days,
      expiringIn3Days,
      churnRate:
        totalUsers > 0
          ? ((cancelledSubscriptions / totalUsers) * 100).toFixed(2)
          : 0,
    };
  }
}
