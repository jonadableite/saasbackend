/**
 * Subscription Controller
 * Handles HTTP requests for subscription management
 * Following SOLID principles: Single Responsibility
 */

import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { SubscriptionService } from "../services/subscription.service";
import { PaymentService } from "../services/payment.service";
import { BillingService } from "../services/billing.service";
import { NotificationService } from "../services/notification.service";
import { AppError } from "../errors/AppError";
import { PaymentMethod } from "../types/subscription.types";

const subscriptionService = new SubscriptionService(prisma);
const paymentService = new PaymentService(prisma);
const billingService = new BillingService(prisma);
const notificationService = new NotificationService();

export class SubscriptionController {
  /**
   * Get ALL users with subscription details (Admin only)
   * GET /api/subscription/admin/users
   */
  getAllUsers = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        page = 1,
        limit = 50,
        search = "",
        plan = "",
        status = "",
        trialOnly = "false",
        expiringSoon = "false",
      } = req.query;

      const skip = (Number(page) - 1) * Number(limit);

      // Construir filtros dinâmicos
      const where: any = {};

      // Busca por nome ou email
      if (search) {
        where.OR = [
          { name: { contains: search as string, mode: "insensitive" } },
          { email: { contains: search as string, mode: "insensitive" } },
        ];
      }

      // Filtrar por plano
      if (plan) {
        where.plan = plan;
      }

      // Filtrar por status
      if (status) {
        where.subscriptionStatus = status;
      }

      // Filtrar apenas trials
      if (trialOnly === "true") {
        where.trialEndDate = { not: null };
      }

      // Filtrar expi rating em breve (próximos 7 dias)
      if (expiringSoon === "true") {
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

        where.subscriptionEndDate = {
          lte: sevenDaysFromNow,
          gte: new Date(),
        };
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: Number(limit),
          include: {
            Payment: {
              orderBy: { dueDate: "desc" },
              take: 5,
            },
            company: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        }),
        prisma.user.count({ where }),
      ]);

      // Calcular informações adicionais para cada usuário
      const usersWithDetails = users.map((user) => {
        const now = new Date();
        const subscriptionEndDate = user.subscriptionEndDate
          ? new Date(user.subscriptionEndDate)
          : null;
        const trialEndDate = user.trialEndDate
          ? new Date(user.trialEndDate)
          : null;

        let daysUntilExpiration = null;
        if (subscriptionEndDate) {
          daysUntilExpiration = Math.ceil(
            (subscriptionEndDate.getTime() - now.getTime()) /
              (1000 * 60 * 60 * 24)
          );
        }

        let daysUntilTrialEnd = null;
        let isInTrial = false;
        if (trialEndDate && trialEndDate > now) {
          daysUntilTrialEnd = Math.ceil(
            (trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );
          isInTrial = true;
        }

        const hasOverduePayment = user.Payment.some(
          (p) => p.status === "overdue"
        );
        const hasPendingPayment = user.Payment.some(
          (p) => p.status === "pending"
        );

        return {
          ...user,
          daysUntilExpiration,
          daysUntilTrialEnd,
          isInTrial,
          hasOverduePayment,
          hasPendingPayment,
          isExpiringSoon:
            daysUntilExpiration !== null &&
            daysUntilExpiration <= 7 &&
            daysUntilExpiration > 0,
        };
      });

      res.status(200).json({
        success: true,
        data: {
          users: usersWithDetails,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages: Math.ceil(total / Number(limit)),
          },
        },
      });
    } catch (error) {
      console.error("Erro ao buscar todos os usuários:", error);
      res.status(500).json({ error: "Erro ao buscar usuários" });
    }
  };

  /**
   * Update user subscription details (Admin only)
   * PUT /api/subscription/admin/users/:userId
   */
  updateUserSubscription = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { userId } = req.params;
      const {
        plan,
        subscriptionStatus,
        subscriptionEndDate,
        trialEndDate,
        isActive,
        maxInstances,
        messagesPerDay,
        features,
      } = req.body;

      // Validações
      if (!userId) {
        res.status(400).json({ error: "ID do usuário é obrigatório" });
        return;
      }

      // Verificar se usuário existe
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        res.status(404).json({ error: "Usuário não encontrado" });
        return;
      }

      // Construir objeto de atualização
      const updateData: any = {};

      if (plan !== undefined) updateData.plan = plan;
      if (subscriptionStatus !== undefined)
        updateData.subscriptionStatus = subscriptionStatus;
      if (subscriptionEndDate !== undefined)
        updateData.subscriptionEndDate = new Date(subscriptionEndDate);
      if (trialEndDate !== undefined)
        updateData.trialEndDate = trialEndDate ? new Date(trialEndDate) : null;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (maxInstances !== undefined) updateData.maxInstances = maxInstances;
      if (messagesPerDay !== undefined)
        updateData.messagesPerDay = messagesPerDay;
      if (features !== undefined) updateData.features = features;

      // Atualizar usuário
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        include: {
          Payment: {
            orderBy: { dueDate: "desc" },
            take: 5,
          },
        },
      });

      res.status(200).json({
        success: true,
        message: "Usuário atualizado com sucesso",
        data: updatedUser,
      });
    } catch (error) {
      console.error("Erro ao atualizar usuário:", error);
      res.status(500).json({ error: "Erro ao atualizar usuário" });
    }
  };

  /**
   * Get current user's subscription info
   * GET /api/subscription/me
   */
  getMySubscription = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.id || (req as any).userId;

      if (!userId) {
        res.status(401).json({ error: "Usuário não autenticado" });
        return;
      }

      const subscriptionInfo = await subscriptionService.getSubscriptionInfo(
        userId
      );

      res.status(200).json({
        success: true,
        data: subscriptionInfo,
      });
    } catch (error) {
      console.error("Erro ao buscar informações de assinatura:", error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      res
        .status(500)
        .json({ error: "Erro ao buscar informações de assinatura" });
    }
  };

  /**
   * Get user's payment history
   * GET /api/subscription/payments
   */
  getMyPayments = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.id || (req as any).userId;

      if (!userId) {
        res.status(401).json({ error: "Usuário não autenticado" });
        return;
      }

      const payments = await paymentService.getUserPayments(userId);

      res.status(200).json({
        success: true,
        data: payments,
      });
    } catch (error) {
      console.error("Erro ao buscar histórico de pagamentos:", error);
      res.status(500).json({ error: "Erro ao buscar histórico de pagamentos" });
    }
  };

  /**
   * Create a new payment for current user (admin only)
   * POST /api/subscription/payments
   */
  createPayment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId, amount, dueDate, paymentMethod, pixCode, pixQRCode } =
        req.body;

      if (!userId || !amount || !dueDate) {
        res.status(400).json({ error: "Dados incompletos" });
        return;
      }

      const payment = await paymentService.createPayment({
        userId,
        amount,
        dueDate: new Date(dueDate),
        paymentMethod: paymentMethod || PaymentMethod.PIX,
        pixCode,
        pixQRCode,
        currency: "BRL",
      });

      res.status(201).json({
        success: true,
        message: "Pagamento criado com sucesso",
        data: payment,
      });
    } catch (error) {
      console.error("Erro ao criar pagamento:", error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: "Erro ao criar pagamento" });
    }
  };

  /**
   * Confirm a payment (admin only)
   * POST /api/subscription/payments/:paymentId/confirm
   */
  confirmPayment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { paymentId } = req.params;
      const confirmedBy = (req as any).user?.id || (req as any).userId;
      const { paidAt } = req.body;

      if (!paymentId) {
        res.status(400).json({ error: "ID do pagamento não fornecido" });
        return;
      }

      const payment = await paymentService.confirmPayment({
        paymentId,
        confirmedBy,
        paidAt: paidAt ? new Date(paidAt) : undefined,
      });

      // Send confirmation notification
      const user = await prisma.user.findUnique({
        where: { id: payment.userId || "" },
      });
      if (user) {
        try {
          await notificationService.sendSubscriptionActivated(user, payment);
        } catch (notifError) {
          console.error(
            "Erro ao enviar notificação de confirmação:",
            notifError
          );
        }
      }

      res.status(200).json({
        success: true,
        message: "Pagamento confirmado com sucesso",
        data: payment,
      });
    } catch (error) {
      console.error("Erro ao confirmar pagamento:", error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: "Erro ao confirmar pagamento" });
    }
  };

  /**
   * Cancel a payment (admin only)
   * POST /api/subscription/payments/:paymentId/cancel
   */
  cancelPayment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { paymentId } = req.params;
      const { reason } = req.body;

      if (!paymentId) {
        res.status(400).json({ error: "ID do pagamento não fornecido" });
        return;
      }

      const payment = await paymentService.cancelPayment(paymentId, reason);

      res.status(200).json({
        success: true,
        message: "Pagamento cancelado com sucesso",
        data: payment,
      });
    } catch (error) {
      console.error("Erro ao cancelar pagamento:", error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: "Erro ao cancelar pagamento" });
    }
  };

  /**
   * Cancel current user's subscription
   * POST /api/subscription/cancel
   */
  cancelSubscription = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.id || (req as any).userId;
      const { reason } = req.body;

      if (!userId) {
        res.status(401).json({ error: "Usuário não autenticado" });
        return;
      }

      await subscriptionService.cancelSubscription(userId, reason);

      // Cancel pending bills
      await billingService.cancelUserPendingBills(
        userId,
        "Assinatura cancelada"
      );

      res.status(200).json({
        success: true,
        message: "Assinatura cancelada com sucesso",
      });
    } catch (error) {
      console.error("Erro ao cancelar assinatura:", error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: "Erro ao cancelar assinatura" });
    }
  };

  /**
   * Generate billing for user (admin only)
   * POST /api/subscription/billing/generate/:userId
   */
  generateBillingForUser = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({ error: "ID do usuário não fornecido" });
        return;
      }

      const payment = await billingService.generateMonthlyBilling(userId);

      // Send notification
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        try {
          await notificationService.sendNewBillingNotification(user, payment);
        } catch (notifError) {
          console.error("Erro ao enviar notificação de cobrança:", notifError);
        }
      }

      res.status(201).json({
        success: true,
        message: "Cobrança gerada com sucesso",
        data: payment,
      });
    } catch (error) {
      console.error("Erro ao gerar cobrança:", error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: "Erro ao gerar cobrança" });
    }
  };

  /**
   * Get subscription statistics (admin only)
   * GET /api/subscription/admin/statistics
   */
  getSubscriptionStatistics = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const statistics = await subscriptionService.getSubscriptionStatistics();

      res.status(200).json({
        success: true,
        data: statistics,
      });
    } catch (error) {
      console.error("Erro ao buscar estatísticas de assinatura:", error);
      res.status(500).json({ error: "Erro ao buscar estatísticas" });
    }
  };

  /**
   * Get payment statistics (admin only)
   * GET /api/subscription/admin/payment-statistics
   */
  getPaymentStatistics = async (req: Request, res: Response): Promise<void> => {
    try {
      const { startDate, endDate } = req.query;

      const statistics = await paymentService.getPaymentStatistics(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.status(200).json({
        success: true,
        data: statistics,
      });
    } catch (error) {
      console.error("Erro ao buscar estatísticas de pagamento:", error);
      res.status(500).json({ error: "Erro ao buscar estatísticas" });
    }
  };

  /**
   * Get all pending payments (admin only)
   * GET /api/subscription/admin/pending-payments
   */
  getPendingPayments = async (req: Request, res: Response): Promise<void> => {
    try {
      const payments = await paymentService.getPendingPayments();

      res.status(200).json({
        success: true,
        data: payments,
      });
    } catch (error) {
      console.error("Erro ao buscar pagamentos pendentes:", error);
      res.status(500).json({ error: "Erro ao buscar pagamentos pendentes" });
    }
  };

  /**
   * Get all overdue payments (admin only)
   * GET /api/subscription/admin/overdue-payments
   */
  getOverduePayments = async (req: Request, res: Response): Promise<void> => {
    try {
      const payments = await paymentService.getOverduePayments();

      res.status(200).json({
        success: true,
        data: payments,
      });
    } catch (error) {
      console.error("Erro ao buscar pagamentos vencidos:", error);
      res.status(500).json({ error: "Erro ao buscar pagamentos vencidos" });
    }
  };

  /**
   * Suspend user subscription (admin only)
   * POST /api/subscription/admin/:userId/suspend
   */
  suspendUserSubscription = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { userId } = req.params;
      const { reason } = req.body;

      if (!userId) {
        res.status(400).json({ error: "ID do usuário não fornecido" });
        return;
      }

      await subscriptionService.suspendSubscription(userId, reason);

      // Send suspension notification
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        try {
          await notificationService.sendSubscriptionSuspended(user);
        } catch (notifError) {
          console.error("Erro ao enviar notificação de suspensão:", notifError);
        }
      }

      res.status(200).json({
        success: true,
        message: "Usuário suspenso com sucesso",
      });
    } catch (error) {
      console.error("Erro ao suspender usuário:", error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: "Erro ao suspender usuário" });
    }
  };

  /**
   * Activate user subscription (admin only)
   * POST /api/subscription/admin/:userId/activate
   */
  activateUserSubscription = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { userId } = req.params;
      const { durationMonths } = req.body;

      if (!userId) {
        res.status(400).json({ error: "ID do usuário não fornecido" });
        return;
      }

      await subscriptionService.activateSubscription(
        userId,
        durationMonths || 1
      );

      res.status(200).json({
        success: true,
        message: "Usuário ativado com sucesso",
      });
    } catch (error) {
      console.error("Erro ao ativar usuário:", error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: "Erro ao ativar usuário" });
    }
  };
}

const subscriptionController = new SubscriptionController();
export { subscriptionController };
