// src/services/notification.service.ts

import axios from "axios";
import { config } from "dotenv";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Payment, User } from "@prisma/client";

config(); // Carrega as variáveis de ambiente

const URL_API = process.env.API_EVO_URL;
const API_KEY = process.env.EVO_API_KEY;
const NOTIFICATION_INSTANCE = process.env.NOTIFICATION_INSTANCE || "WhatLeadsc";

interface EvolutionApiResponse {
  key?: {
    id: string;
  };
  messageTimestamp?: number;
  status?: string;
  [key: string]: any;
}

export class NotificationService {
  /**
   * Send WhatsApp notification (generic)
   */
  async sendWhatsAppNotification(params: {
    senderInstanceName: string;
    receiverPhone: string;
    message: string;
  }): Promise<{ messageId: string }> {
    try {
      console.log(
        `Enviando notificação de ${params.senderInstanceName} para ${params.receiverPhone}`
      );

      const payload = {
        number: params.receiverPhone,
        text: params.message,
        options: {
          delay: 5000,
          presence: "composing",
          linkPreview: false,
        },
      };

      console.log("Payload da notificação:", JSON.stringify(payload, null, 2));

      const response = await axios.post<EvolutionApiResponse>(
        `${URL_API}/message/sendText/${params.senderInstanceName}`,
        payload,
        {
          headers: {
            "Content-Type": "application/json",
            apikey: API_KEY,
          },
        }
      );

      console.log("Resposta da API:", JSON.stringify(response.data, null, 2));

      if (response.status !== 200 && response.status !== 201) {
        throw new Error(
          `Erro no envio: ${response.status} - ${JSON.stringify(response.data)}`
        );
      }

      if (response.data?.key?.id) {
        return { messageId: response.data.key.id };
      }
      throw new Error("Falha ao obter messageId da resposta da Evolution");
    } catch (error: any) {
      console.error("Erro ao enviar notificação WhatsApp:", error);
      if (error instanceof Error) {
        console.error("Mensagem de erro:", error.message);
      }
      if (this.isAxiosError(error)) {
        console.error("Detalhes do erro da API:", error.response?.data);
      }
      throw error;
    }
  }

  /**
   * Send payment reminder notification
   */
  async sendPaymentReminder(
    user: User,
    payment: Payment,
    daysUntilDue: number
  ): Promise<{ messageId: string }> {
    const userName = user.name.split(" ")[0]; // Primeiro nome
    const dueDate = format(payment.dueDate, "dd/MM/yyyy", { locale: ptBR });
    const amount = (payment.amount / 100).toFixed(2).replace(".", ",");

    let message = "";

    if (daysUntilDue > 0) {
      // Lembrete antes do vencimento
      message =
        `🔔 *Lembrete de Pagamento* 🔔\n\n` +
        `Olá, ${userName}! 👋\n\n` +
        `Sua assinatura *${user.plan.toUpperCase()}* vence em *${daysUntilDue} dia(s)*.\n\n` +
        `💰 *Valor:* R$ ${amount}\n` +
        `📅 *Vencimento:* ${dueDate}\n\n` +
        `Para manter seu acesso ativo, realize o pagamento via Pix.\n\n` +
        `Acesse seu painel para visualizar os dados do Pix: ${process.env.FRONTEND_URL}/billing\n\n` +
        `Qualquer dúvida, estamos à disposição! 😊`;
    } else if (daysUntilDue === 0) {
      // Vence hoje
      message =
        `⚠️ *Pagamento Vence Hoje* ⚠️\n\n` +
        `Olá, ${userName}! 👋\n\n` +
        `Sua assinatura *${user.plan.toUpperCase()}* vence *HOJE*.\n\n` +
        `💰 *Valor:* R$ ${amount}\n` +
        `📅 *Vencimento:* ${dueDate}\n\n` +
        `⚡ Realize o pagamento via Pix para evitar a suspensão do seu acesso.\n\n` +
        `Acesse: ${process.env.FRONTEND_URL}/billing\n\n` +
        `Estamos aqui para ajudar! 💙`;
    } else {
      // Vencido
      const daysOverdue = Math.abs(daysUntilDue);
      message =
        `🚨 *PAGAMENTO EM ATRASO* 🚨\n\n` +
        `Olá, ${userName}!\n\n` +
        `Sua assinatura está *${daysOverdue} dia(s)* em atraso.\n\n` +
        `💰 *Valor:* R$ ${amount}\n` +
        `📅 *Venceu em:* ${dueDate}\n\n` +
        `⛔ Seu acesso será suspenso em breve se o pagamento não for realizado.\n\n` +
        `Regularize agora via Pix: ${process.env.FRONTEND_URL}/billing\n\n` +
        `Precisa de ajuda? Entre em contato conosco! 📞`;
    }

    return await this.sendWhatsAppNotification({
      senderInstanceName: NOTIFICATION_INSTANCE,
      receiverPhone: this.formatPhoneNumber(user.phone),
      message,
    });
  }

  /**
   * Send subscription suspended notification
   */
  async sendSubscriptionSuspended(user: User): Promise<{ messageId: string }> {
    const userName = user.name.split(" ")[0];

    const message =
      `🔒 *CONTA SUSPENSA* 🔒\n\n` +
      `Olá, ${userName}.\n\n` +
      `Sua conta foi suspensa por falta de pagamento.\n\n` +
      `Para reativar seu acesso, regularize seus pagamentos pendentes.\n\n` +
      `Acesse: ${process.env.FRONTEND_URL}/billing\n\n` +
      `Estamos à disposição para ajudar! 💙`;

    return await this.sendWhatsAppNotification({
      senderInstanceName: NOTIFICATION_INSTANCE,
      receiverPhone: this.formatPhoneNumber(user.phone),
      message,
    });
  }

  /**
   * Send subscription activated notification
   */
  async sendSubscriptionActivated(
    user: User,
    payment: Payment
  ): Promise<{ messageId: string }> {
    const userName = user.name.split(" ")[0];
    const amount = (payment.amount / 100).toFixed(2).replace(".", ",");
    const endDate = user.subscriptionEndDate
      ? format(user.subscriptionEndDate, "dd/MM/yyyy", { locale: ptBR })
      : "N/A";

    const message =
      `✅ *PAGAMENTO CONFIRMADO* ✅\n\n` +
      `Olá, ${userName}! 🎉\n\n` +
      `Seu pagamento de *R$ ${amount}* foi confirmado com sucesso!\n\n` +
      `📦 *Plano:* ${user.plan.toUpperCase()}\n` +
      `📅 *Válido até:* ${endDate}\n\n` +
      `Sua conta está ativa e pronta para uso! 🚀\n\n` +
      `Acesse agora: ${process.env.FRONTEND_URL}\n\n` +
      `Obrigado pela confiança! 💙`;

    return await this.sendWhatsAppNotification({
      senderInstanceName: NOTIFICATION_INSTANCE,
      receiverPhone: this.formatPhoneNumber(user.phone),
      message,
    });
  }

  /**
   * Send new billing notification
   */
  async sendNewBillingNotification(
    user: User,
    payment: Payment
  ): Promise<{ messageId: string }> {
    const userName = user.name.split(" ")[0];
    const amount = (payment.amount / 100).toFixed(2).replace(".", ",");
    const dueDate = format(payment.dueDate, "dd/MM/yyyy", { locale: ptBR });

    const message =
      `🧾 *NOVA COBRANÇA GERADA* 🧾\n\n` +
      `Olá, ${userName}! 👋\n\n` +
      `Uma nova cobrança foi gerada para sua assinatura.\n\n` +
      `💰 *Valor:* R$ ${amount}\n` +
      `📅 *Vencimento:* ${dueDate}\n` +
      `📦 *Plano:* ${user.plan.toUpperCase()}\n\n` +
      `Acesse seu painel para realizar o pagamento via Pix:\n` +
      `${process.env.FRONTEND_URL}/billing\n\n` +
      `Obrigado! 💙`;

    return await this.sendWhatsAppNotification({
      senderInstanceName: NOTIFICATION_INSTANCE,
      receiverPhone: this.formatPhoneNumber(user.phone),
      message,
    });
  }

  /**
   * Format phone number to international format
   */
  private formatPhoneNumber(phone: string): string {
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, "");

    // Add country code if not present
    if (!cleaned.startsWith("55")) {
      cleaned = "55" + cleaned;
    }

    return cleaned;
  }

  private isAxiosError(error: any): boolean {
    return error && error.isAxiosError === true;
  }
}

export const notificationService = new NotificationService();
