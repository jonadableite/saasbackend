/**
 * HotmartSubscriptionService
 * 
 * Serviço responsável pelo gerenciamento de assinaturas Hotmart
 * Seguindo princípios SOLID:
 * - Single Responsibility: apenas lógica de assinaturas Hotmart
 * - Dependency Inversion: recebe PrismaClient via DI
 * 
 * @module HotmartSubscriptionService
 */

import { PrismaClient } from "@prisma/client";
import {
  type CartAbandonmentWebhook,
  type HotmartSubscriptionWebhook,
  type ProcessedWebhookResult,
  type SubscriptionCancellationWebhook,
  type SubscriptionUpdateResult,
  type SwitchPlanWebhook,
  type UpdateChargeDateWebhook,
  HotmartSubscriptionEventType,
  HotmartSubscriptionStatus,
  HotmartSubscriptionWebhookSchema,
} from "../types/hotmart-subscription.types";
import { logger } from "../utils/logger";

export class HotmartSubscriptionService {
  private readonly log = logger.setContext("HotmartSubscriptionService");

  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Processa webhook de assinatura da Hotmart
   * Valida os dados e roteia para o handler correto
   */
  async processWebhook(
    rawData: unknown
  ): Promise<ProcessedWebhookResult> {
    try {
      // Validar dados com Zod
      const validatedData = HotmartSubscriptionWebhookSchema.parse(rawData);

      // Roteamento por tipo de evento com type guards
      const event = validatedData.event;
      
      if (event === HotmartSubscriptionEventType.SWITCH_PLAN) {
        return await this.handleSwitchPlan(validatedData as SwitchPlanWebhook);
      }

      if (event === HotmartSubscriptionEventType.SUBSCRIPTION_CANCELLATION) {
        return await this.handleCancellation(validatedData as SubscriptionCancellationWebhook);
      }

      if (event === HotmartSubscriptionEventType.UPDATE_SUBSCRIPTION_CHARGE_DATE) {
        return await this.handleChargeDateUpdate(validatedData as UpdateChargeDateWebhook);
      }

      if (event === HotmartSubscriptionEventType.PURCHASE_OUT_OF_SHOPPING_CART) {
        return await this.handleCartAbandonment(validatedData as CartAbandonmentWebhook);
      }

      this.log.warn(`Evento não suportado: ${event}`);
      return {
        success: false,
        event: event as HotmartSubscriptionEventType,
        message: "Evento não suportado",
      };
    } catch (error) {
      this.log.error("Erro ao processar webhook de assinatura:", error);

      if (error instanceof Error) {
        return {
          success: false,
          event: HotmartSubscriptionEventType.SWITCH_PLAN, // valor padrão
          message: `Erro de validação: ${error.message}`,
        };
      }

      return {
        success: false,
        event: HotmartSubscriptionEventType.SWITCH_PLAN,
        message: "Erro desconhecido ao processar webhook",
      };
    }
  }

  /**
   * Handler para SWITCH_PLAN
   * Processa troca de plano de assinatura
   */
  private async handleSwitchPlan(
    data: SwitchPlanWebhook
  ): Promise<ProcessedWebhookResult> {
    try {
      this.log.info("Processando troca de plano", {
        subscriberCode: data.data.subscription.subscriber?.code,
        switchPlanDate: new Date(data.data.switch_plan_date),
      });

      const subscriber = data.data.subscription.subscriber;
      if (!subscriber) {
        throw new Error("Dados do assinante não encontrados");
      }

      // Buscar usuário pelo email
      const user = await this.prisma.user.findUnique({
        where: { email: subscriber.email },
      });

      if (!user) {
        this.log.warn(`Usuário não encontrado: ${subscriber.email}`);
        return {
          success: false,
          event: data.event,
          userEmail: subscriber.email,
          subscriberCode: subscriber.code,
          message: "Usuário não encontrado",
        };
      }

      // Identificar plano antigo e novo
      const oldPlan = data.data.plans.find((p) => !p.current);
      const newPlan = data.data.plans.find((p) => p.current);

      if (!newPlan) {
        throw new Error("Novo plano não encontrado na lista de planos");
      }

      // Atualizar usuário
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          plan: this.mapHotmartPlanToSystemPlan(newPlan.name),
          subscriptionStatus: data.data.subscription.status,
          updatedAt: new Date(),
        },
      });

      // Registrar transação
      await this.recordTransaction(user.id, data);

      this.log.info("Plano alterado com sucesso", {
        userId: user.id,
        oldPlan: oldPlan?.name,
        newPlan: newPlan.name,
      });

      return {
        success: true,
        event: data.event,
        userEmail: subscriber.email,
        subscriberCode: subscriber.code,
        message: "Plano alterado com sucesso",
        metadata: {
          oldPlan: oldPlan?.name,
          newPlan: newPlan.name,
          switchDate: new Date(data.data.switch_plan_date),
        },
      };
    } catch (error) {
      this.log.error("Erro ao processar troca de plano:", error);
      throw error;
    }
  }

  /**
   * Handler para SUBSCRIPTION_CANCELLATION
   * Processa cancelamento de assinatura
   */
  private async handleCancellation(
    data: SubscriptionCancellationWebhook
  ): Promise<ProcessedWebhookResult> {
    try {
      this.log.info("Processando cancelamento de assinatura", {
        subscriberCode: data.data.subscriber.code,
        cancellationDate: new Date(data.data.cancellation_date),
      });

      const subscriber = data.data.subscriber;

      // Buscar usuário pelo email
      const user = await this.prisma.user.findUnique({
        where: { email: subscriber.email },
      });

      if (!user) {
        this.log.warn(`Usuário não encontrado: ${subscriber.email}`);
        return {
          success: false,
          event: data.event,
          userEmail: subscriber.email,
          subscriberCode: subscriber.code,
          message: "Usuário não encontrado",
        };
      }

      // Atualizar status da assinatura
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          isActive: false,
          subscriptionStatus: this.mapCancellationReasonToStatus(
            data.data.subscription.status
          ),
          subscriptionEndDate: new Date(data.data.date_next_charge * 1000),
          updatedAt: new Date(),
        },
      });

      // Registrar transação
      await this.recordTransaction(user.id, data);

      this.log.info("Assinatura cancelada com sucesso", {
        userId: user.id,
        endDate: new Date(data.data.date_next_charge * 1000),
      });

      return {
        success: true,
        event: data.event,
        userEmail: subscriber.email,
        subscriberCode: subscriber.code,
        message: "Assinatura cancelada com sucesso",
        metadata: {
          cancellationDate: new Date(data.data.cancellation_date * 1000),
          endDate: new Date(data.data.date_next_charge * 1000),
          lastRecurrenceValue: data.data.actual_recurrence_value,
        },
      };
    } catch (error) {
      this.log.error("Erro ao processar cancelamento:", error);
      throw error;
    }
  }

  /**
   * Handler para UPDATE_SUBSCRIPTION_CHARGE_DATE
   * Processa alteração de dia de cobrança
   */
  private async handleChargeDateUpdate(
    data: UpdateChargeDateWebhook
  ): Promise<ProcessedWebhookResult> {
    try {
      this.log.info("Processando alteração de dia de cobrança", {
        subscriberCode: data.data.subscriber.code,
        oldChargeDay: data.data.subscription.old_charge_day,
        newChargeDay: data.data.subscription.new_charge_day,
      });

      const subscriber = data.data.subscriber;

      // Buscar usuário pelo email
      const user = await this.prisma.user.findUnique({
        where: { email: subscriber.email },
      });

      if (!user) {
        this.log.warn(`Usuário não encontrado: ${subscriber.email}`);
        return {
          success: false,
          event: data.event,
          userEmail: subscriber.email,
          subscriberCode: subscriber.code,
          message: "Usuário não encontrado",
        };
      }

      // Calcular nova data de cobrança
      const nextChargeDate = new Date(data.data.subscription.date_next_charge * 1000);

      // Atualizar usuário (se necessário, adicionar campo de dia de cobrança)
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          subscriptionEndDate: nextChargeDate,
          updatedAt: new Date(),
        },
      });

      // Registrar transação
      await this.recordTransaction(user.id, data);

      this.log.info("Dia de cobrança alterado com sucesso", {
        userId: user.id,
        oldDay: data.data.subscription.old_charge_day,
        newDay: data.data.subscription.new_charge_day,
      });

      return {
        success: true,
        event: data.event,
        userEmail: subscriber.email,
        subscriberCode: subscriber.code,
        message: "Dia de cobrança alterado com sucesso",
        metadata: {
          oldChargeDay: data.data.subscription.old_charge_day,
          newChargeDay: data.data.subscription.new_charge_day,
          nextChargeDate,
        },
      };
    } catch (error) {
      this.log.error("Erro ao processar alteração de dia de cobrança:", error);
      throw error;
    }
  }

  /**
   * Handler para PURCHASE_OUT_OF_SHOPPING_CART
   * Processa abandono de carrinho (lead generation)
   */
  private async handleCartAbandonment(
    data: CartAbandonmentWebhook
  ): Promise<ProcessedWebhookResult> {
    try {
      this.log.info("Processando abandono de carrinho", {
        email: data.data.buyer?.email,
        productName: data.data.product.name,
      });

      // Aqui você pode implementar lógica de lead generation
      // Por exemplo, salvar em uma tabela de leads abandonados
      // ou enviar para um CRM externo

      // Por enquanto, apenas logamos o evento
      return {
        success: true,
        event: data.event,
        userEmail: data.data.buyer?.email,
        message: "Abandono de carrinho registrado",
        metadata: {
          productId: data.data.product.id,
          productName: data.data.product.name,
          affiliate: data.data.affiliate,
          checkoutCountry: data.data.checkout_country,
        },
      };
    } catch (error) {
      this.log.error("Erro ao processar abandono de carrinho:", error);
      throw error;
    }
  }

  /**
   * Mapeia nome do plano Hotmart para plano do sistema
   */
  private mapHotmartPlanToSystemPlan(hotmartPlanName: string): string {
    const planMapping: Record<string, string> = {
      "Whatlead - Disparos": "PREMIUM",
      "Whatlead - Básico": "BASIC",
      "Whatlead - Pro": "PRO",
      "Whatlead - Enterprise": "ENTERPRISE",
      // Adicione mais mapeamentos conforme necessário
    };

    return planMapping[hotmartPlanName] || "BASIC";
  }

  /**
   * Mapeia status de cancelamento Hotmart para status do sistema
   */
  private mapCancellationReasonToStatus(hotmartStatus: string): string {
    const statusMapping: Record<string, string> = {
      CANCELED_BY_CUSTOMER: "CANCELLED_BY_CUSTOMER",
      CANCELED_BY_VENDOR: "CANCELLED_BY_SELLER",
      CANCELED_BY_ADMIN: "CANCELLED_BY_ADMIN",
    };

    return statusMapping[hotmartStatus] || "CANCELLED";
  }

  /**
   * Registra transação da Hotmart no banco de dados
   */
  private async recordTransaction(
    userId: string,
    webhookData: HotmartSubscriptionWebhook
  ): Promise<void> {
    try {
      const transactionData = this.extractTransactionData(webhookData);

      if (!transactionData) {
        this.log.warn("Não foi possível extrair dados da transação");
        return;
      }

      await this.prisma.hotmartTransaction.create({
        data: {
          userId,
          transactionId: transactionData.transactionId,
          event: webhookData.event,
          status: transactionData.status,
          amount: transactionData.amount || 0,
          currency: transactionData.currency || "BRL",
          productName: transactionData.productName || "N/A",
          productId: transactionData.productId?.toString() || "N/A",
          buyerEmail: transactionData.buyerEmail,
          buyerName: transactionData.buyerName || "N/A",
          orderDate: transactionData.orderDate,
          approvedDate: transactionData.approvedDate,
          paymentMethod: transactionData.paymentMethod || "N/A",
          installments: transactionData.installments || 1,
          subscriberCode: transactionData.subscriberCode,
          planName: transactionData.planName,
          nextChargeDate: transactionData.nextChargeDate,
          rawData: JSON.stringify(webhookData),
        },
      });

      this.log.info("Transação registrada", {
        userId,
        transactionId: transactionData.transactionId,
      });
    } catch (error) {
      this.log.error("Erro ao registrar transação:", error);
      // Não propagar erro para não quebrar o processamento do webhook
    }
  }

  /**
   * Extrai dados de transação do webhook
   */
  private extractTransactionData(webhookData: HotmartSubscriptionWebhook) {
    // Implementação específica para cada tipo de evento
    // Por enquanto, retorna dados básicos
    const baseData = {
      transactionId: `${webhookData.id}-${Date.now()}`,
      status: "PROCESSED",
      amount: 0,
      currency: "BRL",
      productName: "N/A",
      productId: undefined as number | undefined,
      buyerEmail: "",
      buyerName: "",
      orderDate: new Date(),
      approvedDate: undefined as Date | undefined,
      paymentMethod: "SUBSCRIPTION",
      installments: 1,
      subscriberCode: undefined as string | undefined,
      planName: undefined as string | undefined,
      nextChargeDate: undefined as Date | undefined,
    };

    if ("data" in webhookData) {
      const data = webhookData.data;
      
      if ("subscriber" in data && data.subscriber) {
        baseData.buyerEmail = data.subscriber.email;
        baseData.buyerName = data.subscriber.name;
      }

      if ("subscription" in data && data.subscription) {
        const subscription = data.subscription as any;
        if (subscription.subscriber && typeof subscription.subscriber === 'object' && 'code' in subscription.subscriber) {
          baseData.subscriberCode = subscription.subscriber.code;
        }
        if (subscription.plan && typeof subscription.plan === 'object' && 'name' in subscription.plan) {
          baseData.planName = subscription.plan.name;
        }
        if (subscription.date_next_charge) {
          baseData.nextChargeDate = new Date(subscription.date_next_charge * 1000);
        }
      }

      if ("product" in data && data.product) {
        baseData.productName = data.product.name;
        baseData.productId = data.product.id;
      }
    }

    return baseData;
  }

  /**
   * Busca assinaturas ativas por usuário
   */
  async getActiveSubscriptionByUser(userId: string) {
    return await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        plan: true,
        subscriptionStatus: true,
        subscriptionEndDate: true,
        hotmartSubscriberCode: true,
        hotmartTransactions: {
          where: {
            status: "ACTIVE",
          },
          orderBy: {
            orderDate: "desc",
          },
          take: 1,
        },
      },
    });
  }
}

