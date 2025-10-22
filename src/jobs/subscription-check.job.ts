/**
 * Subscription Check Job
 * Runs daily to check for expired subscriptions and suspend users
 * Following SOLID principles: Single Responsibility
 */

import cron from "node-cron";
import { prisma } from "../lib/prisma";
import { SubscriptionService } from "../services/subscription.service";
import { PaymentService } from "../services/payment.service";
import { NotificationService } from "../services/notification.service";
import { differenceInDays } from "date-fns";
import { DEFAULT_NOTIFICATION_CONFIG } from "../types/subscription.types";

const subscriptionService = new SubscriptionService(prisma);
const paymentService = new PaymentService(prisma);
const notificationService = new NotificationService();

/**
 * Check and process expired subscriptions
 * Runs daily at 2:00 AM
 */
export const startSubscriptionCheckJob = () => {
  cron.schedule("0 2 * * *", async () => {
    console.log("🔍 [CRON] Iniciando verificação de assinaturas expiradas...");

    try {
      // 1. Mark overdue payments
      const overdueCount = await paymentService.markOverduePayments();
      console.log(
        `✅ [CRON] ${overdueCount} pagamento(s) marcado(s) como vencido(s)`
      );

      // 2. Process expired subscriptions (suspend users)
      const suspendedCount =
        await subscriptionService.processExpiredSubscriptions();
      console.log(
        `🚫 [CRON] ${suspendedCount} usuário(s) suspenso(s) por assinatura expirada`
      );

      // 3. Send suspension notifications
      if (suspendedCount > 0) {
        const suspendedUsers = await prisma.user.findMany({
          where: {
            subscriptionStatus: "SUSPENDED",
            updatedAt: {
              gte: new Date(Date.now() - 5 * 60 * 1000), // Last 5 minutes
            },
          },
        });

        for (const user of suspendedUsers) {
          try {
            await notificationService.sendSubscriptionSuspended(user);
            console.log(
              `📤 [CRON] Notificação de suspensão enviada para ${user.email}`
            );
          } catch (error) {
            console.error(
              `❌ [CRON] Erro ao enviar notificação para ${user.email}:`,
              error
            );
          }
        }
      }

      console.log(
        "✅ [CRON] Verificação de assinaturas concluída com sucesso!"
      );
    } catch (error) {
      console.error("❌ [CRON] Erro na verificação de assinaturas:", error);
    }
  });

  console.log(
    "⏰ [CRON] Job de verificação de assinaturas agendado (diariamente às 02:00)"
  );
};

/**
 * Send payment reminders
 * Runs daily at 9:00 AM
 */
export const startPaymentReminderJob = () => {
  cron.schedule("0 9 * * *", async () => {
    console.log("📢 [CRON] Iniciando envio de lembretes de pagamento...");

    try {
      const { daysBeforeDue, daysAfterDue, maxReminders } =
        DEFAULT_NOTIFICATION_CONFIG;
      let totalSent = 0;

      // Send reminders for payments due soon
      for (const days of daysBeforeDue) {
        const payments = await paymentService.getPaymentsRequiringNotification(
          days
        );

        for (const payment of payments) {
          if (!payment.whatlead_users) {
            continue;
          }

          try {
            const daysUntilDue = differenceInDays(payment.dueDate, new Date());
            await notificationService.sendPaymentReminder(
              payment.whatlead_users,
              payment,
              daysUntilDue
            );

            await paymentService.updatePaymentReminder(payment.id);
            totalSent++;
            console.log(
              `📤 [CRON] Lembrete enviado para ${payment.whatlead_users.email} (${days} dias antes)`
            );
          } catch (error) {
            console.error(
              `❌ [CRON] Erro ao enviar lembrete para ${payment.whatlead_users?.email}:`,
              error
            );
          }

          // Delay between messages to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }

      // Send reminders for overdue payments
      const overduePayments = await paymentService.getOverduePayments();

      for (const payment of overduePayments) {
        if (!payment.whatlead_users) {
          continue;
        }

        try {
          const daysOverdue = Math.abs(
            differenceInDays(payment.dueDate, new Date())
          );

          // Only send on specific days after due
          if (daysAfterDue.includes(daysOverdue)) {
            await notificationService.sendPaymentReminder(
              payment.whatlead_users,
              payment,
              -daysOverdue
            );

            await paymentService.updatePaymentReminder(payment.id);
            totalSent++;
            console.log(
              `📤 [CRON] Lembrete de atraso enviado para ${payment.whatlead_users.email} (${daysOverdue} dias)`
            );

            // Delay between messages
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        } catch (error) {
          console.error(
            `❌ [CRON] Erro ao enviar lembrete para ${payment.whatlead_users?.email}:`,
            error
          );
        }
      }

      console.log(
        `✅ [CRON] ${totalSent} lembrete(s) de pagamento enviado(s)!`
      );
    } catch (error) {
      console.error("❌ [CRON] Erro no envio de lembretes:", error);
    }
  });

  console.log(
    "⏰ [CRON] Job de lembretes de pagamento agendado (diariamente às 09:00)"
  );
};

/**
 * Initialize all subscription-related jobs
 */
export const initializeSubscriptionJobs = () => {
  startSubscriptionCheckJob();
  startPaymentReminderJob();
  console.log("🚀 [CRON] Todos os jobs de assinatura foram inicializados!");
};
