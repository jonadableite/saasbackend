/**
 * Hotmart Subscription Check Job
 * 
 * Verifica diariamente assinaturas Hotmart expiradas e marca usuários como inativos
 * Impede login e navegação na plataforma se pagamento atrasado/cancelado
 * 
 * Seguindo princípios SOLID: Single Responsibility
 */

import cron from "node-cron";
import { prisma } from "../lib/prisma";
import { logger } from "../utils/logger";

const jobLogger = logger.setContext("HotmartSubscriptionCheckJob");

/**
 * Verifica e suspende usuários com assinaturas Hotmart expiradas
 * Roda diariamente às 03:00 AM
 */
export const startHotmartSubscriptionCheckJob = () => {
  cron.schedule("0 3 * * *", async () => {
    jobLogger.info("Iniciando verificação de assinaturas Hotmart expiradas...");

    try {
      const now = new Date();

      // 1. Marcar usuários com subscriptionEndDate expirado como inativos
      const expiredUsers = await prisma.user.findMany({
        where: {
          AND: [
            {
              hotmartCustomerId: {
                not: null, // Apenas usuários da Hotmart
              },
            },
            {
              OR: [
                // Assinatura expirada (endDate no passado)
                {
                  subscriptionEndDate: {
                    lt: now,
                  },
                },
                // Status de cancelamento
                {
                  subscriptionStatus: {
                    in: [
                      "CANCELLED",
                      "CANCELLED_BY_CUSTOMER",
                      "CANCELLED_BY_SELLER",
                      "CANCELLED_BY_ADMIN",
                      "EXPIRED",
                    ],
                  },
                },
              ],
            },
            {
              isActive: true, // Apenas ativos ainda
            },
          ],
        },
        select: {
          id: true,
          email: true,
          name: true,
          subscriptionStatus: true,
          subscriptionEndDate: true,
        },
      });

      jobLogger.info(`${expiredUsers.length} usuários Hotmart com assinatura expirada encontrados`);

      if (expiredUsers.length > 0) {
        // Marcar todos como inativos
        await prisma.user.updateMany({
          where: {
            id: {
              in: expiredUsers.map((u) => u.id),
            },
          },
          data: {
            isActive: false,
            updatedAt: now,
          },
        });

        jobLogger.info(`${expiredUsers.length} usuários marcados como inativos`);

        // Log detalhado
        for (const user of expiredUsers) {
          jobLogger.warn(`Usuário suspenso: ${user.email} - Status: ${user.subscriptionStatus || "EXPIRED"}`, {
            userId: user.id,
            email: user.email,
            subscriptionStatus: user.subscriptionStatus,
            subscriptionEndDate: user.subscriptionEndDate,
          });
        }
      }

      // 2. Reativar usuários que foram pagos após expiração
      const reactivatedUsers = await prisma.user.findMany({
        where: {
          AND: [
            {
              hotmartCustomerId: {
                not: null,
              },
            },
            {
              subscriptionStatus: "ACTIVE",
            },
            {
              subscriptionEndDate: {
                gte: now, // EndDate no futuro
              },
            },
            {
              isActive: false, // Mas está marcado como inativo
            },
          ],
        },
        select: {
          id: true,
          email: true,
          name: true,
        },
      });

      jobLogger.info(`${reactivatedUsers.length} usuários Hotmart para reativar encontrados`);

      if (reactivatedUsers.length > 0) {
        // Reativar usuários
        await prisma.user.updateMany({
          where: {
            id: {
              in: reactivatedUsers.map((u) => u.id),
            },
          },
          data: {
            isActive: true,
            updatedAt: now,
          },
        });

        jobLogger.info(`${reactivatedUsers.length} usuários reativados`);

        // Log detalhado
        for (const user of reactivatedUsers) {
          jobLogger.info(`Usuário reativado: ${user.email}`, {
            userId: user.id,
            email: user.email,
          });
        }
      }

      jobLogger.info("Verificação de assinaturas Hotmart concluída com sucesso");
    } catch (error) {
      jobLogger.error("Erro na verificação de assinaturas Hotmart:", error);
    }
  });

  jobLogger.info("Job de verificação de assinaturas Hotmart agendado (diariamente às 03:00)");
};

/**
 * Verifica usuarios com subscriptionStatus DELAYED ou OVERDUE
 * Roda a cada 6 horas
 */
export const startHotmartDelayedCheckJob = () => {
  cron.schedule("0 */6 * * *", async () => {
    jobLogger.info("Iniciando verificação de assinaturas atrasadas...");

    try {
      // Buscar usuários com status de atraso
      const delayedUsers = await prisma.user.findMany({
        where: {
          AND: [
            {
              hotmartCustomerId: {
                not: null,
              },
            },
            {
              subscriptionStatus: {
                in: ["DELAYED", "OVERDUE"],
              },
            },
            {
              isActive: true, // Ainda estão ativos
            },
          ],
        },
      });

      jobLogger.info(`${delayedUsers.length} usuários com pagamento atrasado encontrados`);

      if (delayedUsers.length > 0) {
        // Marcar como inativos
        await prisma.user.updateMany({
          where: {
            id: {
              in: delayedUsers.map((u) => u.id),
            },
          },
          data: {
            isActive: false,
            updatedAt: new Date(),
          },
        });

        jobLogger.warn(`${delayedUsers.length} usuários suspensos por atraso de pagamento`);

        // Log detalhado
        for (const user of delayedUsers) {
          jobLogger.warn(`Suspensão por atraso: ${user.email}`, {
            userId: user.id,
            email: user.email,
            subscriptionStatus: user.subscriptionStatus,
          });
        }
      }

      jobLogger.info("Verificação de atrasos concluída");
    } catch (error) {
      jobLogger.error("Erro na verificação de atrasos:", error);
    }
  });

  jobLogger.info("Job de verificação de atrasos agendado (a cada 6 horas)");
};

/**
 * Inicializa todos os jobs de verificação de assinaturas Hotmart
 */
export const initializeHotmartSubscriptionJobs = () => {
  startHotmartSubscriptionCheckJob();
  startHotmartDelayedCheckJob();
  jobLogger.info("Todos os jobs de assinatura Hotmart foram inicializados!");
};

