/**
 * Payment Service
 * Handles payment creation, confirmation, and management
 * Following SOLID principles: Single Responsibility
 */

import { PrismaClient, Payment } from "@prisma/client";
import { addMonths, isBefore, isAfter } from "date-fns";
import {
  CreatePaymentDTO,
  ConfirmPaymentDTO,
  PaymentStatus,
  PaymentMethod,
} from "../types/subscription.types";
import { AppError } from "../errors/AppError";
import { SubscriptionService } from "./subscription.service";

export class PaymentService {
  private subscriptionService: SubscriptionService;

  constructor(private prisma: PrismaClient) {
    this.subscriptionService = new SubscriptionService(prisma);
  }

  /**
   * Create a new payment (manual)
   */
  async createPayment(data: CreatePaymentDTO): Promise<Payment> {
    // Validate user exists
    const user = await this.prisma.user.findUnique({
      where: { id: data.userId },
    });

    if (!user) {
      throw new AppError("Usuário não encontrado", 404);
    }

    // Check if there's already a pending payment for this user
    const existingPayment = await this.prisma.payment.findFirst({
      where: {
        userId: data.userId,
        status: { in: [PaymentStatus.PENDING, PaymentStatus.OVERDUE] },
        dueDate: data.dueDate,
      },
    });

    if (existingPayment) {
      throw new AppError("Já existe um pagamento pendente para esta data", 400);
    }

    // Create payment
    const payment = await this.prisma.payment.create({
      data: {
        id: `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        amount: data.amount,
        currency: data.currency || "BRL",
        dueDate: data.dueDate,
        status: PaymentStatus.PENDING,
        stripePaymentId: `manual_${Date.now()}`,
        metadata: data.metadata || {},
        createdAt: new Date(),
        updatedAt: new Date(),
        whatlead_users: {
          connect: { id: data.userId },
        },
      },
    });

    return payment;
  }

  /**
   * Confirm payment manually (admin action)
   */
  async confirmPayment(data: ConfirmPaymentDTO): Promise<Payment> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: data.paymentId },
      include: { whatlead_users: true },
    });

    if (!payment) {
      throw new AppError("Pagamento não encontrado", 404);
    }

    if (payment.status === PaymentStatus.COMPLETED) {
      throw new AppError("Pagamento já foi confirmado", 400);
    }

    // Update payment
    const updatedPayment = await this.prisma.payment.update({
      where: { id: data.paymentId },
      data: {
        status: PaymentStatus.COMPLETED,
        metadata: {
          ...((payment.metadata as object) || {}),
          ...(data.metadata || {}),
        },
      },
    });

    // Activate user subscription
    if (payment.userId) {
      await this.subscriptionService.activateSubscription(payment.userId, 1);
    }

    return updatedPayment;
  }

  /**
   * Cancel a payment
   */
  async cancelPayment(paymentId: string, reason?: string): Promise<Payment> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new AppError("Pagamento não encontrado", 404);
    }

    if (payment.status === PaymentStatus.COMPLETED) {
      throw new AppError(
        "Não é possível cancelar um pagamento já concluído",
        400
      );
    }

    const updatedPayment = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.CANCELLED,
        cancelReason: reason,
      },
    });

    return updatedPayment;
  }

  /**
   * Get payment by ID
   */
  async getPaymentById(paymentId: string): Promise<Payment | null> {
    return await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        whatlead_users: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });
  }

  /**
   * Get user payments
   */
  async getUserPayments(userId: string): Promise<Payment[]> {
    return await this.prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Get pending payments
   */
  async getPendingPayments(): Promise<Payment[]> {
    return await this.prisma.payment.findMany({
      where: {
        status: PaymentStatus.PENDING,
        dueDate: { lte: new Date() },
      },
      include: {
        whatlead_users: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: { dueDate: "asc" },
    });
  }

  /**
   * Get overdue payments
   */
  async getOverduePayments(): Promise<any[]> {
    return await this.prisma.payment.findMany({
      where: {
        status: { in: [PaymentStatus.PENDING, PaymentStatus.OVERDUE] },
        dueDate: { lt: new Date() },
      },
      include: {
        whatlead_users: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: { dueDate: "asc" },
    });
  }

  /**
   * Mark payments as overdue
   */
  async markOverduePayments(): Promise<number> {
    const result = await this.prisma.payment.updateMany({
      where: {
        status: PaymentStatus.PENDING,
        dueDate: { lt: new Date() },
      },
      data: {
        status: PaymentStatus.OVERDUE,
      },
    });

    return result.count;
  }

  /**
   * Update payment reminder count
   */
  async updatePaymentReminder(paymentId: string): Promise<Payment> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new AppError("Pagamento não encontrado", 404);
    }

    return await this.prisma.payment.update({
      where: { id: paymentId },
      data: {},
    });
  }

  /**
   * Get payment statistics
   */
  async getPaymentStatistics(startDate?: Date, endDate?: Date): Promise<any> {
    const dateFilter =
      startDate && endDate
        ? {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          }
        : {};

    const [
      totalPayments,
      completedPayments,
      pendingPayments,
      overduePayments,
      cancelledPayments,
      totalRevenue,
    ] = await Promise.all([
      this.prisma.payment.count({ where: dateFilter }),
      this.prisma.payment.count({
        where: { ...dateFilter, status: PaymentStatus.COMPLETED },
      }),
      this.prisma.payment.count({
        where: { ...dateFilter, status: PaymentStatus.PENDING },
      }),
      this.prisma.payment.count({
        where: { ...dateFilter, status: PaymentStatus.OVERDUE },
      }),
      this.prisma.payment.count({
        where: { ...dateFilter, status: PaymentStatus.CANCELLED },
      }),
      this.prisma.payment.aggregate({
        where: { ...dateFilter, status: PaymentStatus.COMPLETED },
        _sum: { amount: true },
      }),
    ]);

    return {
      totalPayments,
      completedPayments,
      pendingPayments,
      overduePayments,
      cancelledPayments,
      totalRevenue: totalRevenue._sum.amount || 0,
      successRate:
        totalPayments > 0
          ? ((completedPayments / totalPayments) * 100).toFixed(2)
          : 0,
    };
  }

  /**
   * Get payments requiring notification
   */
  async getPaymentsRequiringNotification(
    daysBeforeDue: number
  ): Promise<any[]> {
    const targetDate = addMonths(new Date(), 0);
    targetDate.setDate(targetDate.getDate() + daysBeforeDue);

    return await this.prisma.payment.findMany({
      where: {
        status: PaymentStatus.PENDING,
        dueDate: {
          lte: targetDate,
          gte: new Date(),
        },
      },
      include: {
        whatlead_users: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });
  }
}
