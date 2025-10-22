/**
 * Billing Generation Job
 * Automatically generates monthly billing for users
 * Following SOLID principles: Single Responsibility
 */

import cron from "node-cron";
import { prisma } from "../lib/prisma";
import { BillingService } from "../services/billing.service";
import { NotificationService } from "../services/notification.service";

const billingService = new BillingService(prisma);
const notificationService = new NotificationService();

/**
 * Generate monthly billing for users with expiring subscriptions
 * Runs daily at 1:00 AM
 */
export const startBillingGenerationJob = () => {
  cron.schedule("0 1 * * *", async () => {
    console.log("💳 [CRON] Iniciando geração de cobranças mensais...");

    try {
      // Generate billing for subscriptions expiring in the next 5 days
      const generated =
        await billingService.generateBillingForExpiringSubscriptions(5);

      console.log(`✅ [CRON] ${generated} cobrança(s) gerada(s) com sucesso!`);

      // Send notifications for newly generated bills
      if (generated > 0) {
        const recentPayments = await prisma.payment.findMany({
          where: {
            status: "pending",
            createdAt: {
              gte: new Date(Date.now() - 5 * 60 * 1000), // Last 5 minutes
            },
          },
          include: {
            whatlead_users: true,
          },
        });

        for (const payment of recentPayments) {
          if (!payment.whatlead_users) continue;

          try {
            await notificationService.sendNewBillingNotification(
              payment.whatlead_users,
              payment
            );
            console.log(
              `📤 [CRON] Notificação de cobrança enviada para ${payment.whatlead_users.email}`
            );

            // Delay between messages to avoid rate limiting
            await new Promise((resolve) => setTimeout(resolve, 2000));
          } catch (error) {
            console.error(
              `❌ [CRON] Erro ao enviar notificação para ${payment.whatlead_users.email}:`,
              error
            );
          }
        }
      }

      console.log("✅ [CRON] Geração de cobranças concluída!");
    } catch (error) {
      console.error("❌ [CRON] Erro na geração de cobranças:", error);
    }
  });

  console.log(
    "⏰ [CRON] Job de geração de cobranças agendado (diariamente às 01:00)"
  );
};

/**
 * Generate billing for all users (manual trigger)
 * Runs on the 1st day of every month at 3:00 AM
 */
export const startMonthlyBillingJob = () => {
  cron.schedule("0 3 1 * *", async () => {
    console.log(
      "💰 [CRON] Iniciando geração mensal de cobranças para todos os usuários..."
    );

    try {
      const result = await billingService.generateBillingForAllUsers();

      console.log(`✅ [CRON] ${result.generated} cobrança(s) gerada(s)`);

      if (result.errors.length > 0) {
        console.log("⚠️ [CRON] Erros durante a geração:");
        result.errors.forEach((error) => console.log(`  - ${error}`));
      }

      console.log("✅ [CRON] Geração mensal de cobranças concluída!");
    } catch (error) {
      console.error("❌ [CRON] Erro na geração mensal de cobranças:", error);
    }
  });

  console.log(
    "⏰ [CRON] Job de geração mensal de cobranças agendado (dia 1 de cada mês às 03:00)"
  );
};

/**
 * Initialize all billing jobs
 */
export const initializeBillingJobs = () => {
  startBillingGenerationJob();
  startMonthlyBillingJob();
  console.log("🚀 [CRON] Todos os jobs de cobrança foram inicializados!");
};
