/**
 * Subscription Guard Middleware
 * Blocks access for users without active subscription
 * Following SOLID principles: Single Responsibility
 */

import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { SubscriptionService } from "../services/subscription.service";
import { AppError } from "../errors/AppError";

const subscriptionService = new SubscriptionService(prisma);

/**
 * Middleware to check if user has an active subscription
 * Blocks access if subscription is expired or suspended
 */
export const requireActiveSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get user ID from request (set by authenticate middleware)
    const userId = (req as any).user?.id || (req as any).userId;

    if (!userId) {
      res.status(401).json({
        error: "Autenticação necessária",
        message: "Usuário não autenticado",
      });
      return;
    }

    // Check if subscription is valid
    const isValid = await subscriptionService.isSubscriptionValid(userId);

    if (!isValid) {
      // Get subscription info for detailed error message
      const subscriptionInfo = await subscriptionService.getSubscriptionInfo(
        userId
      );

      let message = "Sua assinatura está inativa";
      let reason = "";

      if (subscriptionInfo.status === "SUSPENDED") {
        message = "Sua conta está suspensa";
        reason = "Pagamento em atraso";
      } else if (subscriptionInfo.status === "CANCELLED") {
        message = "Sua assinatura foi cancelada";
        reason = "Entre em contato com o suporte";
      } else if (subscriptionInfo.status === "EXPIRED") {
        message = "Sua assinatura expirou";
        reason = "Renove sua assinatura para continuar";
      } else if (subscriptionInfo.hasOverduePayment) {
        message = "Você possui pagamentos pendentes";
        reason = "Regularize seus pagamentos para continuar";
      }

      res.status(403).json({
        error: "Assinatura inativa",
        message,
        reason,
        subscriptionStatus: subscriptionInfo.status,
        subscriptionEndDate: subscriptionInfo.subscriptionEndDate,
        hasOverduePayment: subscriptionInfo.hasOverduePayment,
        nextPaymentDate: subscriptionInfo.nextPaymentDate,
      });
      return;
    }

    // Subscription is valid, continue
    next();
  } catch (error) {
    console.error("Erro no middleware de verificação de assinatura:", error);
    res.status(500).json({
      error: "Erro interno",
      message: "Erro ao verificar status da assinatura",
    });
  }
};

/**
 * Middleware to check subscription with grace period
 * Allows access but warns user if subscription is about to expire
 */
export const checkSubscriptionWithGracePeriod = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).user?.id || (req as any).userId;

    if (!userId) {
      next();
      return;
    }

    const subscriptionInfo = await subscriptionService.getSubscriptionInfo(
      userId
    );

    // Add subscription info to response headers for frontend
    if (subscriptionInfo.daysUntilExpiration !== null) {
      res.setHeader(
        "X-Subscription-Days-Remaining",
        subscriptionInfo.daysUntilExpiration.toString()
      );
      res.setHeader("X-Subscription-Status", subscriptionInfo.status);
      res.setHeader(
        "X-Subscription-Has-Overdue",
        subscriptionInfo.hasOverduePayment.toString()
      );
    }

    // Warning if less than 7 days remaining
    if (
      subscriptionInfo.daysUntilExpiration !== null &&
      subscriptionInfo.daysUntilExpiration <= 7
    ) {
      res.setHeader("X-Subscription-Warning", "true");
      res.setHeader(
        "X-Subscription-Warning-Message",
        `Sua assinatura expira em ${subscriptionInfo.daysUntilExpiration} dia(s)`
      );
    }

    next();
  } catch (error) {
    console.error("Erro no middleware de verificação de assinatura:", error);
    // Don't block on error, just log
    next();
  }
};

/**
 * Middleware to allow only free plan users (for promotional routes)
 */
export const requireFreePlan = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).user?.id || (req as any).userId;

    if (!userId) {
      res.status(401).json({
        error: "Autenticação necessária",
        message: "Usuário não autenticado",
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });

    if (!user) {
      res.status(404).json({
        error: "Usuário não encontrado",
      });
      return;
    }

    if (user.plan !== "free") {
      res.status(403).json({
        error: "Acesso negado",
        message:
          "Esta funcionalidade é exclusiva para usuários do plano gratuito",
      });
      return;
    }

    next();
  } catch (error) {
    console.error("Erro no middleware de verificação de plano:", error);
    res.status(500).json({
      error: "Erro interno",
      message: "Erro ao verificar plano do usuário",
    });
  }
};

/**
 * Middleware to require specific plan or higher
 */
export const requirePlan = (requiredPlan: string) => {
  const planHierarchy: Record<string, number> = {
    free: 0,
    basic: 1,
    pro: 2,
    enterprise: 3,
  };

  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = (req as any).user?.id || (req as any).userId;

      if (!userId) {
        res.status(401).json({
          error: "Autenticação necessária",
          message: "Usuário não autenticado",
        });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { plan: true, subscriptionStatus: true },
      });

      if (!user) {
        res.status(404).json({
          error: "Usuário não encontrado",
        });
        return;
      }

      const userPlanLevel = planHierarchy[user.plan] || 0;
      const requiredPlanLevel = planHierarchy[requiredPlan] || 0;

      if (userPlanLevel < requiredPlanLevel) {
        res.status(403).json({
          error: "Plano insuficiente",
          message: `Esta funcionalidade requer o plano ${requiredPlan.toUpperCase()} ou superior`,
          currentPlan: user.plan,
          requiredPlan,
        });
        return;
      }

      next();
    } catch (error) {
      console.error("Erro no middleware de verificação de plano:", error);
      res.status(500).json({
        error: "Erro interno",
        message: "Erro ao verificar plano do usuário",
      });
    }
  };
};
