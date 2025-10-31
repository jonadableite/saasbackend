// src/controllers/hotmart.controller.ts
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger";
import { createIntegratedUser } from "../services/integrated-user.service";
import { HotmartSubscriptionService } from "../services/hotmart-subscription.service";
import crypto from "crypto";

const prisma = new PrismaClient();
const hotmartLogger = logger.setContext("HotmartController");
const subscriptionService = new HotmartSubscriptionService(prisma);

// Cache para o token da Hotmart
let cachedHotmartToken: string | null = null;
let tokenExpirationTime: number = 0;

// Função para renovar o token da Hotmart
async function refreshHotmartToken(): Promise<string> {
  try {
    const clientId = process.env.HOTMART_CLIENT_ID;
    const clientSecret = process.env.HOTMART_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      throw new Error('HOTMART_CLIENT_ID e HOTMART_CLIENT_SECRET são obrigatórios');
    }

    // Criar Basic Auth header
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    const response = await fetch('https://api-sec-vlc.hotmart.com/security/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${basicAuth}`
      },
      body: 'grant_type=client_credentials&scope=read'
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro ao renovar token da Hotmart: ${response.status} - ${errorText}`);
    }

    const tokenData = await response.json();
    
    if (!tokenData.access_token) {
      throw new Error('Token de acesso não encontrado na resposta da Hotmart');
    }

    // Cache do token com tempo de expiração (expires_in em segundos)
    cachedHotmartToken = tokenData.access_token;
    tokenExpirationTime = Date.now() + (tokenData.expires_in * 1000) - 60000; // 1 minuto de margem
    
    hotmartLogger.info('Token da Hotmart renovado com sucesso');
    
    return tokenData.access_token;
  } catch (error) {
    hotmartLogger.error('Erro ao renovar token da Hotmart:', error);
    throw error;
  }
}

// Função para obter token válido (usa cache ou renova se necessário)
async function getValidHotmartToken(): Promise<string> {
  // Se temos um token em cache e ainda não expirou, usa ele
  if (cachedHotmartToken && Date.now() < tokenExpirationTime) {
    return cachedHotmartToken;
  }
  
  // Tenta usar o token do .env primeiro
  const envToken = process.env.HOTMART_ACCESS_TOKEN;
  if (envToken && !cachedHotmartToken) {
    cachedHotmartToken = envToken;
    // Define um tempo de expiração padrão de 1 hora se não temos informação
    tokenExpirationTime = Date.now() + (3600 * 1000);
    return envToken;
  }
  
  // Se chegou aqui, precisa renovar o token
  return await refreshHotmartToken();
}

export interface HotmartWebhookData {
  id: string;
  event: string;
  version: string;
  date_created: number;
  data: {
    product: {
      id: number;
      name: string;
      ucode: string;
    };
    buyer: {
      name: string;
      email: string;
      checkout_phone: string;
      document: string;
    };
    affiliates?: Array<{
      name: string;
      email: string;
    }>;
    purchase: {
      order_date: number;
      price: {
        value: number;
        currency_value: string;
      };
      payment: {
        method: string;
        installments_number: number;
        type: string;
      };
      offer: {
        code: string;
        key: string;
      };
      transaction: string;
      status: string;
      approved_date?: number;
      subscription?: {
        subscriber: {
          code: string;
        };
        plan: {
          name: string;
          id: number;
        };
        status: string;
        date_next_charge?: number;
        charges_number?: number;
      };
    };
    commissions?: Array<{
      value: number;
      source: string;
    }>;
  };
}

export class HotmartController {
  // Webhook principal para processar todos os eventos da Hotmart
  public handleWebhook = async (req: Request, res: Response): Promise<void> => {
    try {
      const webhookData: HotmartWebhookData = req.body;

      // Log seguro com optional chaining
      const transaction = webhookData.data?.purchase?.transaction || 
                         (webhookData.data as any)?.subscription?.subscriber?.code || 
                         "N/A";
      const buyerEmail = webhookData.data?.buyer?.email || 
                        (webhookData.data as any)?.subscriber?.email || 
                        "N/A";
      
      hotmartLogger.info(`Webhook Hotmart recebido: ${webhookData.event}`, {
        event: webhookData.event,
        transaction,
        buyer_email: buyerEmail,
      });

      // Eventos de Assinaturas (4 eventos) - delegar para HotmartSubscriptionService
      const subscriptionEvents = [
        "SWITCH_PLAN",
        "SUBSCRIPTION_CANCELLATION",
        "UPDATE_SUBSCRIPTION_CHARGE_DATE",
        "PURCHASE_OUT_OF_SHOPPING_CART",
      ];

      if (subscriptionEvents.includes(webhookData.event)) {
        // Delegar para o serviço de assinaturas
        const result = await subscriptionService.processWebhook(webhookData);
        hotmartLogger.info(`Evento ${webhookData.event} processado pelo SubscriptionService`, {
          success: result.success,
          message: result.message,
        });
        return;
      }

      // Processar baseado no tipo de evento (eventos de compra)
      switch (webhookData.event) {
        // Eventos de Compras (9 eventos)
        case "PURCHASE_COMPLETE":
          await this.handlePurchaseComplete(webhookData);
          break;
        case "PURCHASE_APPROVED":
          await this.handlePurchaseApproved(webhookData);
          break;
        case "PURCHASE_CANCELED":
          await this.handlePurchaseCanceled(webhookData);
          break;
        case "PURCHASE_BILLED":
          await this.handlePurchaseBilled(webhookData);
          break;
        case "PURCHASE_REFUNDED":
          await this.handlePurchaseRefunded(webhookData);
          break;
        case "PURCHASE_CHARGEBACK":
          await this.handlePurchaseChargeback(webhookData);
          break;
        case "PURCHASE_DELAYED":
          await this.handlePurchaseDelayed(webhookData);
          break;
        case "PURCHASE_PROTEST":
          await this.handlePurchaseProtest(webhookData);
          break;
        case "PURCHASE_EXPIRED":
          await this.handlePurchaseExpired(webhookData);
          break;

        // Eventos de Assinaturas legacy (3 eventos)
        case "SUBSCRIPTION_CANCELLATION":
          await this.handleSubscriptionCancellation(webhookData);
          break;
        case "SUBSCRIPTION_REACTIVATION":
          await this.handleSubscriptionReactivation(webhookData);
          break;
        case "SUBSCRIPTION_CHARGE_SUCCESS":
          await this.handleSubscriptionChargeSuccess(webhookData);
          break;

        // SWITCH_PLAN agora delegado para o service acima
        default:
          hotmartLogger.warn(`Evento não processado: ${webhookData.event}`);
      }

      res.status(200).json({
        success: true,
        message: "Webhook processado com sucesso",
        event: webhookData.event,
      });
    } catch (error) {
      hotmartLogger.error("Erro ao processar webhook Hotmart:", error);
      res.status(200).json({
        success: false,
        message: "Erro ao processar webhook, mas reconhecido",
      });
    }
  };

  // Eventos de Compras
  private async handlePurchaseComplete(data: HotmartWebhookData) {
    hotmartLogger.info("Processando PURCHASE_COMPLETE - Criando/atualizando cliente");
    await this.createOrUpdateCustomer(data);
    
    // Se o status indicar pagamento aprovado, liberar acesso
    const purchaseStatus = data.data?.purchase?.status;
    if (purchaseStatus === "APPROVED" || purchaseStatus === "COMPLETED") {
      await this.grantPlatformAccess(data);
    }
  }

  private async handlePurchaseApproved(data: HotmartWebhookData) {
    hotmartLogger.info("Processando PURCHASE_APPROVED - Liberando acesso");

    // Criar/atualizar cliente
    await this.createOrUpdateCustomer(data);

    // Liberar acesso à plataforma
    await this.grantPlatformAccess(data);
  }

  private async handlePurchaseCanceled(data: HotmartWebhookData) {
    hotmartLogger.info("Processando PURCHASE_CANCELED - Removendo acesso");
    await this.revokePlatformAccess(data);
  }

  private async handlePurchaseBilled(data: HotmartWebhookData) {
    hotmartLogger.info("Processando PURCHASE_BILLED");
    await this.createOrUpdateCustomer(data);
  }

  private async handlePurchaseRefunded(data: HotmartWebhookData) {
    hotmartLogger.info("Processando PURCHASE_REFUNDED - Removendo acesso");
    await this.revokePlatformAccess(data);
  }

  private async handlePurchaseChargeback(data: HotmartWebhookData) {
    hotmartLogger.info("Processando PURCHASE_CHARGEBACK - Removendo acesso");
    await this.revokePlatformAccess(data);
  }

  private async handlePurchaseDelayed(data: HotmartWebhookData) {
    hotmartLogger.info("Processando PURCHASE_DELAYED - Suspendendo acesso");
    await this.suspendPlatformAccess(data);
  }

  private async handlePurchaseProtest(data: HotmartWebhookData) {
    hotmartLogger.info("Processando PURCHASE_PROTEST");
    await this.createOrUpdateCustomer(data);
  }

  private async handlePurchaseExpired(data: HotmartWebhookData) {
    hotmartLogger.info("Processando PURCHASE_EXPIRED - Removendo acesso");
    await this.revokePlatformAccess(data);
  }

  // Eventos de Assinaturas
  private async handleSubscriptionCancellation(data: HotmartWebhookData) {
    hotmartLogger.info(
      "Processando SUBSCRIPTION_CANCELLATION - Cancelando assinatura"
    );
    await this.cancelSubscription(data);
  }

  private async handleSubscriptionReactivation(data: HotmartWebhookData) {
    hotmartLogger.info(
      "Processando SUBSCRIPTION_REACTIVATION - Reativando assinatura"
    );
    await this.reactivateSubscription(data);
  }

  private async handleSubscriptionChargeSuccess(data: HotmartWebhookData) {
    hotmartLogger.info(
      "Processando SUBSCRIPTION_CHARGE_SUCCESS - Renovando acesso"
    );
    await this.renewSubscription(data);
  }

  // Outros eventos
  private async handleSwitchPlan(data: HotmartWebhookData) {
    hotmartLogger.info("Processando SWITCH_PLAN - Alterando plano");
    await this.switchUserPlan(data);
  }

  // Métodos auxiliares para gerenciamento de usuários e acesso
  
  /**
   * Obtém o email do buyer/subscriber de forma segura
   */
  private getBuyerEmail(data: HotmartWebhookData): string | null {
    return data.data?.buyer?.email || 
           (data.data as any)?.subscriber?.email || 
           null;
  }

  /**
   * Converte timestamp da Hotmart para Date
   * Detecta automaticamente se está em milissegundos ou segundos
   */
  private convertHotmartTimestamp(timestamp?: number | null): Date | null {
    if (!timestamp) return null;
    
    // Se o timestamp for maior que 1000000000000 (1 de janeiro de 2001 em ms),
    // já está em milissegundos
    if (timestamp > 1000000000000) {
      return new Date(timestamp);
    }
    
    // Caso contrário, está em segundos, precisa multiplicar por 1000
    return new Date(timestamp * 1000);
  }

  private async createOrUpdateCustomer(data: HotmartWebhookData) {
    try {
      const { buyer, purchase, product } = data.data;
      
      // Validação: garantir que os campos necessários existem
      if (!buyer || !buyer.email) {
        hotmartLogger.warn("Webhook sem buyer ou email do buyer", { event: data.event });
        return;
      }
      
      if (!purchase) {
        hotmartLogger.warn("Webhook sem purchase data", { event: data.event, buyer: buyer.email });
        return;
      }
      
      if (!product) {
        hotmartLogger.warn("Webhook sem product data", { event: data.event, buyer: buyer.email });
        return;
      }

      // Obter plano do webhook (prioriza subscription.plan.name > product.name)
      const plan = this.getPlanFromWebhook(data);
      const isApproved = this.isPaymentApproved(purchase.status);

      // Verificar se o cliente já existe
      let user = await prisma.user.findUnique({
        where: { email: buyer.email },
      });

      if (!user) {
        // SEMPRE criar com createIntegratedUser se pagamento estiver aprovado
        if (isApproved) {
          try {
            // Gerar senha aleatória segura
            const temporaryPassword = crypto.randomBytes(16).toString("hex");
            
            hotmartLogger.info(`Criando usuário integrado para: ${buyer.email} com plano: ${plan}`);
            
            // Criar usuário integrado (nas duas plataformas + email de boas-vindas)
            const integratedUser = await createIntegratedUser({
              name: buyer.name,
              email: buyer.email,
              password: temporaryPassword,
              plan: plan, // Usar plano obtido do webhook
            });

            hotmartLogger.info(`✅ Usuário integrado criado com sucesso: ${buyer.email}`, {
              userId: integratedUser.user.id,
              plan: integratedUser.user.plan,
              evoAiUserId: integratedUser.user.evoAiUserId,
            });

            // Atualizar campos Hotmart no usuário criado
            user = await prisma.user.update({
              where: { id: integratedUser.user.id },
              data: {
                phone: buyer.checkout_phone || "",
                hotmartCustomerId: purchase.transaction,
                hotmartSubscriberCode: purchase.subscription?.subscriber?.code || null,
                plan: plan, // Garantir que o plano está correto
                isActive: true,
                subscriptionStatus: purchase.subscription?.status === "ACTIVE" ? "ACTIVE" : "PENDING",
              },
            });

            hotmartLogger.info(`✅ Campos Hotmart atualizados no usuário: ${user.email}`, {
              transaction: purchase.transaction,
              subscriberCode: purchase.subscription?.subscriber?.code,
              plan: user.plan,
            });
          } catch (integratedError) {
            hotmartLogger.error("❌ Erro ao criar usuário integrado:", integratedError);
            throw integratedError; // Lançar erro para não criar usuário sem Evo AI
          }
        } else {
          // Pagamento não aprovado ainda, criar registro básico (sem Evo AI)
          hotmartLogger.warn(`Pagamento não aprovado ainda para ${buyer.email}, criando registro básico`);
          
          let defaultCompany = await prisma.company.findFirst({
            where: { active: true }
          });

          if (!defaultCompany) {
            defaultCompany = await prisma.company.create({
              data: {
                name: "Hotmart Default Company",
                active: true
              }
            });
          }

          user = await prisma.user.create({
            data: {
              name: buyer.name,
              email: buyer.email,
              phone: buyer.checkout_phone || "",
              password: "", // Senha vazia até pagamento ser aprovado
              profile: "user",
              plan: plan,
              isActive: false,
              hotmartCustomerId: purchase.transaction,
              hotmartSubscriberCode: purchase.subscription?.subscriber?.code || null,
              subscriptionStatus: "PENDING",
              whatleadCompanyId: defaultCompany.id
            },
          });

          hotmartLogger.info(`⚠️ Usuário criado (inativo) aguardando aprovação: ${user.email}`);
        }
      } else {
        // Atualizar usuário existente
        const plan = this.getPlanFromWebhook(data);
        const isApproved = this.isPaymentApproved(purchase.status);
        
        // Preparar dados de atualização
        const updateData: any = {
          plan: plan, // Atualizar plano
          isActive: isApproved, // Ativar se pagamento aprovado
          hotmartCustomerId: purchase.transaction,
          hotmartSubscriberCode: purchase.subscription?.subscriber?.code || user.hotmartSubscriberCode,
          subscriptionStatus: purchase.subscription?.status === "ACTIVE" ? "ACTIVE" : (isApproved ? "ACTIVE" : "PENDING"),
        };

        // Se pagamento foi aprovado e usuário não tinha Evo AI, criar
        if (isApproved && !user.evoAiUserId) {
          try {
            hotmartLogger.info(`Criando Evo AI para usuário existente: ${user.email}`);
            
            const temporaryPassword = crypto.randomBytes(16).toString("hex");
            const integratedUser = await createIntegratedUser({
              name: user.name,
              email: user.email,
              password: temporaryPassword,
              plan: plan,
            });

            // Adicionar dados do Evo AI ao update
            updateData.evoAiUserId = integratedUser.user.evoAiUserId;
            updateData.client_Id = integratedUser.user.client_Id;

            hotmartLogger.info(`✅ Evo AI criado para usuário existente: ${user.email}`);
          } catch (evoError) {
            hotmartLogger.error(`Erro ao criar Evo AI para usuário existente: ${user.email}`, evoError);
            // Continuar atualização mesmo se Evo AI falhar
          }
        }

        // Atualizar usuário em uma única operação
        user = await prisma.user.update({
          where: { id: user.id },
          data: updateData,
        });

        hotmartLogger.info(`✅ Usuário atualizado: ${user.email}`, {
          plan: user.plan,
          isActive: user.isActive,
          subscriptionStatus: user.subscriptionStatus,
          hasEvoAI: !!user.evoAiUserId,
        });
      }

      // Registrar transação
      await this.recordTransaction(data, user.id);
    } catch (error) {
      hotmartLogger.error("Erro ao criar/atualizar cliente:", error);
      throw error;
    }
  }

  private async grantPlatformAccess(data: HotmartWebhookData) {
    try {
      const buyerEmail = this.getBuyerEmail(data);
      if (!buyerEmail) {
        hotmartLogger.warn("Não é possível liberar acesso: email não encontrado", { event: data.event });
        return;
      }
      
      const user = await prisma.user.findUnique({
        where: { email: buyerEmail },
      });

      if (user && data.data?.product?.name) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            isActive: true,
            plan: this.mapProductToPlan(data.data.product.name),
            subscriptionStatus: "ACTIVE",
          },
        });

        hotmartLogger.info(`Acesso liberado para: ${user.email}`);
      }
    } catch (error) {
      hotmartLogger.error("Erro ao liberar acesso:", error);
      throw error;
    }
  }

  private async revokePlatformAccess(data: HotmartWebhookData) {
    try {
      const buyerEmail = this.getBuyerEmail(data);
      if (!buyerEmail) {
        hotmartLogger.warn("Não é possível remover acesso: email não encontrado", { event: data.event });
        return;
      }
      
      const user = await prisma.user.findUnique({
        where: { email: buyerEmail },
      });

      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            isActive: false,
            subscriptionStatus: "CANCELLED",
          },
        });

        hotmartLogger.info(`Acesso removido para: ${user.email}`);
      }
    } catch (error) {
      hotmartLogger.error("Erro ao remover acesso:", error);
      throw error;
    }
  }

  private async suspendPlatformAccess(data: HotmartWebhookData) {
    try {
      const buyerEmail = this.getBuyerEmail(data);
      if (!buyerEmail) {
        hotmartLogger.warn("Não é possível suspender acesso: email não encontrado", { event: data.event });
        return;
      }
      
      const user = await prisma.user.findUnique({
        where: { email: buyerEmail },
      });

      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            isActive: false,
            subscriptionStatus: "SUSPENDED",
          },
        });

        hotmartLogger.info(`Acesso suspenso para: ${user.email}`);
      }
    } catch (error) {
      hotmartLogger.error("Erro ao suspender acesso:", error);
      throw error;
    }
  }

  private async cancelSubscription(data: HotmartWebhookData) {
    await this.revokePlatformAccess(data);
  }

  private async reactivateSubscription(data: HotmartWebhookData) {
    await this.grantPlatformAccess(data);
  }

  private async renewSubscription(data: HotmartWebhookData) {
    try {
      const buyerEmail = this.getBuyerEmail(data);
      if (!buyerEmail) {
        hotmartLogger.warn("Não é possível renovar assinatura: email não encontrado", { event: data.event });
        return;
      }
      
      const user = await prisma.user.findUnique({
        where: { email: buyerEmail },
      });

      if (user) {
        const nextChargeDate =
          data.data?.purchase?.subscription?.date_next_charge;

        await prisma.user.update({
          where: { id: user.id },
          data: {
            isActive: true,
            subscriptionStatus: "ACTIVE",
            subscriptionEndDate: this.convertHotmartTimestamp(nextChargeDate),
          },
        });

        hotmartLogger.info(`Assinatura renovada para: ${user.email}`);
      }

      // Registrar transação de renovação
      await this.recordTransaction(data, user?.id);
    } catch (error) {
      hotmartLogger.error("Erro ao renovar assinatura:", error);
      throw error;
    }
  }

  private async switchUserPlan(data: HotmartWebhookData) {
    try {
      const buyerEmail = this.getBuyerEmail(data);
      if (!buyerEmail) {
        hotmartLogger.warn("Não é possível alterar plano: email não encontrado", { event: data.event });
        return;
      }
      
      const user = await prisma.user.findUnique({
        where: { email: buyerEmail },
      });

      if (user && data.data?.product?.name) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            plan: this.mapProductToPlan(data.data.product.name),
            isActive: true,
          },
        });

        hotmartLogger.info(
          `Plano alterado para: ${user.email} - Novo plano: ${data.data.product.name}`
        );
      }
    } catch (error) {
      hotmartLogger.error("Erro ao alterar plano:", error);
      throw error;
    }
  }

  private async recordTransaction(data: HotmartWebhookData, userId?: string) {
    try {
      if (!userId) return;
      
      // Validar que purchase existe
      if (!data.data?.purchase) {
        hotmartLogger.warn("Não é possível registrar transação: purchase não encontrado", {
          event: data.event,
          userId,
        });
        return;
      }

      const purchase = data.data.purchase;
      const product = data.data.product;
      const buyer = data.data.buyer;

      await prisma.hotmartTransaction.create({
        data: {
          userId,
          transactionId: purchase.transaction || "N/A",
          event: data.event,
          status: purchase.status || "UNKNOWN",
          amount: purchase.price?.value || 0,
          currency: purchase.price?.currency_value || "BRL",
          productName: product?.name || "N/A",
          productId: product?.id?.toString() || "0",
          buyerEmail: buyer?.email || "N/A",
          buyerName: buyer?.name || "N/A",
          orderDate: this.convertHotmartTimestamp(purchase.order_date) || new Date(),
          approvedDate: this.convertHotmartTimestamp(purchase.approved_date),
          paymentMethod: purchase.payment?.method || "UNKNOWN",
          installments: purchase.payment?.installments_number || 1,
          subscriberCode: purchase.subscription?.subscriber?.code || null,
          planName: purchase.subscription?.plan?.name || null,
          nextChargeDate: this.convertHotmartTimestamp(purchase.subscription?.date_next_charge),
          rawData: JSON.stringify(data),
        },
      });

      hotmartLogger.info(
        `Transação registrada: ${purchase.transaction || "N/A"}`
      );
    } catch (error) {
      hotmartLogger.error("Erro ao registrar transação:", error);
    }
  }

  /**
   * Obtém o plano do webhook Hotmart
   * Prioriza: subscription.plan.name > product.name > BASIC
   */
  private getPlanFromWebhook(data: HotmartWebhookData): string {
    // 1. Tentar pegar do plano da assinatura (mais preciso)
    const subscriptionPlan = data.data?.purchase?.subscription?.plan?.name;
    if (subscriptionPlan) {
      const mappedPlan = this.mapProductToPlan(subscriptionPlan);
      hotmartLogger.info(`Plano obtido da subscription: ${subscriptionPlan} -> ${mappedPlan}`);
      return mappedPlan;
    }

    // 2. Tentar pegar do nome do produto
    const productName = data.data?.product?.name;
    if (productName) {
      const mappedPlan = this.mapProductToPlan(productName);
      hotmartLogger.info(`Plano obtido do produto: ${productName} -> ${mappedPlan}`);
      return mappedPlan;
    }

    // 3. Fallback para BASIC
    hotmartLogger.warn("Plano não encontrado, usando BASIC como padrão");
    return "BASIC";
  }

  /**
   * Verifica se o pagamento está aprovado/completo
   */
  private isPaymentApproved(purchaseStatus?: string): boolean {
    const approvedStatuses = ["APPROVED", "COMPLETED"];
    return purchaseStatus ? approvedStatuses.includes(purchaseStatus) : false;
  }

  private mapProductToPlan(productName: string): string {
    // Mapear produtos/planos da Hotmart para planos da plataforma
    const planMapping: { [key: string]: string } = {
      // Produtos
      "Whatlead - Disparos": "PREMIUM",
      "Whatlead - Básico": "BASIC",
      "Whatlead - Pro": "PRO",
      "Whatlead - Enterprise": "ENTERPRISE",
      // Planos de assinatura
      "Básico": "BASIC",
      "Basic": "BASIC",
      "Pro": "PRO",
      "Premium": "PREMIUM",
      "Enterprise": "ENTERPRISE",
      // Outros possíveis nomes
      "plano de teste": "BASIC", // Exemplo do webhook
    };

    // Normalizar o nome para comparar (case insensitive, sem espaços extras)
    const normalizedName = productName.trim().toLowerCase();
    
    // Procurar match exato
    for (const [key, value] of Object.entries(planMapping)) {
      if (normalizedName === key.toLowerCase().trim()) {
        return value;
      }
    }

    // Procurar match parcial
    for (const [key, value] of Object.entries(planMapping)) {
      if (normalizedName.includes(key.toLowerCase()) || key.toLowerCase().includes(normalizedName)) {
        return value;
      }
    }

    hotmartLogger.warn(`Plano não mapeado: ${productName}, usando BASIC`);
    return "BASIC";
  }

  // Métodos para o painel administrativo
  public getCustomers = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        page = 1,
        limit = 10,
        search = "",
        status = "",
        paymentStatus = "",
      } = req.query;

      const where: any = {};

      if (search) {
        where.OR = [
          { name: { contains: search as string, mode: "insensitive" } },
          { email: { contains: search as string, mode: "insensitive" } },
          { hotmartCustomerId: { contains: search as string, mode: "insensitive" } },
          { hotmartSubscriberCode: { contains: search as string, mode: "insensitive" } },
          { 
            hotmartTransactions: {
              some: {
                transactionId: { contains: search as string, mode: "insensitive" }
              }
            }
          },
        ];
      }

      if (status) {
        where.subscriptionStatus = status;
      }

      const users = await prisma.user.findMany({
        where: {
          ...where,
          hotmartCustomerId: { not: null },
        },
        include: {
          hotmartTransactions: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { createdAt: "desc" },
      });

      const total = await prisma.user.count({
        where: {
          ...where,
          hotmartCustomerId: { not: null },
        },
      });

      // Transformar os dados para o formato esperado pelo frontend
      const customers = users.map(user => {
        const latestTransaction = user.hotmartTransactions[0];
        
        return {
          id: user.id,
          subscriberCode: user.hotmartSubscriberCode || 'N/A',
          transaction: user.hotmartCustomerId || 'N/A',
          productId: latestTransaction?.productId || 'N/A',
          productName: latestTransaction?.productName || 'N/A',
          customerName: user.name,
          customerEmail: user.email,
          customerPhone: user.phone || '',
          paymentType: latestTransaction?.paymentMethod || 'N/A',
          paymentMethod: latestTransaction?.paymentMethod || 'N/A',
          paymentStatus: latestTransaction?.status || 'N/A',
          subscriptionStatus: user.subscriptionStatus || 'ACTIVE',
          subscriptionValue: latestTransaction?.amount || 0,
          subscriptionCurrency: latestTransaction?.currency || 'BRL',
          subscriptionFrequency: latestTransaction?.planName || 'N/A',
          nextChargeDate: latestTransaction?.nextChargeDate?.toISOString() || null,
          isActive: user.isActive || false,
          isTrial: false,
          tags: [],
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
          hotmartTransactions: user.hotmartTransactions
        };
      });

      res.json({
        customers,
        total,
        page: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
      });
    } catch (error) {
      hotmartLogger.error("Erro ao buscar clientes:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  };

  public getCustomerStats = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const totalCustomers = await prisma.user.count({
        where: { hotmartCustomerId: { not: null } },
      });

      const activeCustomers = await prisma.user.count({
        where: {
          hotmartCustomerId: { not: null },
          isActive: true,
        },
      });

      const totalRevenue = await prisma.hotmartTransaction.aggregate({
        _sum: { amount: true },
        where: { status: "APPROVED" },
      });

      const cancelledCustomers = await prisma.user.count({
        where: {
          hotmartCustomerId: { not: null },
          subscriptionStatus: "CANCELLED",
        },
      });

      const churnRate =
        totalCustomers > 0 ? (cancelledCustomers / totalCustomers) * 100 : 0;

      res.json({
        totalCustomers,
        activeCustomers,
        totalRevenue: totalRevenue._sum.amount || 0,
        churnRate,
      });
    } catch (error) {
      hotmartLogger.error("Erro ao buscar estatísticas:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  };

  public exportCustomers = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { search = "", status = "" } = req.query;

      const where: any = {};

      if (search) {
        where.OR = [
          { name: { contains: search as string, mode: "insensitive" } },
          { email: { contains: search as string, mode: "insensitive" } },
        ];
      }

      if (status) {
        where.subscriptionStatus = status;
      }

      const customers = await prisma.user.findMany({
        where: {
          ...where,
          hotmartCustomerId: { not: null },
        },
        include: {
          hotmartTransactions: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        orderBy: { createdAt: "desc" },
      });

      // Gerar CSV
      const csvHeader =
        "Nome,Email,Plano,Status,Data Cadastro,Último Pagamento,Valor\n";
      const csvData = customers
        .map((customer) => {
          const lastTransaction = customer.hotmartTransactions[0];
          return [
            customer.name,
            customer.email,
            customer.plan,
            customer.subscriptionStatus || "N/A",
            customer.createdAt.toISOString().split("T")[0],
            lastTransaction?.orderDate.toISOString().split("T")[0] || "N/A",
            lastTransaction?.amount || 0,
          ].join(",");
        })
        .join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=hotmart-customers.csv"
      );
      res.send(csvHeader + csvData);
    } catch (error) {
      hotmartLogger.error("Erro ao exportar clientes:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  };

  public syncWithHotmart = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      // Implementar sincronização manual se necessário
      // Por enquanto, retornar sucesso
      res.json({
        success: true,
        syncedCount: 0,
        message: "Sincronização via webhook ativa",
      });
    } catch (error) {
      hotmartLogger.error("Erro na sincronização:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  };

  // Novos métodos para integração com API de vendas da Hotmart
  public getSalesHistory = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const {
        start_date,
        end_date,
        product_id,
        buyer_email,
        transaction_status,
        max_results = 50,
        page_token
      } = req.query;

      // Validação de parâmetros obrigatórios
      if (!start_date || !end_date) {
        res.status(400).json({
          error: "Parâmetros start_date e end_date são obrigatórios"
        });
        return;
      }

      // Obter token válido (renovando se necessário)
      const hotmartToken = await getValidHotmartToken();

      // Construir URL da Hotmart
      const baseUrl = process.env.HOTMART_API_URL || 'https://developers.hotmart.com/payments/api/v1';
      let apiUrl = `${baseUrl}/sales/history?start_date=${start_date}&end_date=${end_date}`;
      
      if (product_id) apiUrl += `&product_id=${product_id}`;
      if (buyer_email) apiUrl += `&buyer_email=${buyer_email}`;
      if (transaction_status) apiUrl += `&transaction_status=${transaction_status}`;
      if (max_results) apiUrl += `&max_results=${max_results}`;
      if (page_token) apiUrl += `&page_token=${page_token}`;

      hotmartLogger.info(`Fazendo requisição para Hotmart: ${apiUrl}`);

      // Fazer requisição para API da Hotmart com retry em caso de token inválido
      let response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${hotmartToken}`,
          'Content-Type': 'application/json'
        }
      });

      // Se receber 401, tenta renovar o token e fazer nova requisição
      if (response.status === 401) {
        hotmartLogger.info('Token expirado, renovando...');
        const newToken = await refreshHotmartToken();
        
        response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${newToken}`,
            'Content-Type': 'application/json'
          }
        });
      }

      if (!response.ok) {
        const errorText = await response.text();
        hotmartLogger.error(`Erro na API da Hotmart: ${response.status} - ${errorText}`);
        throw new Error(`Erro na API da Hotmart: ${response.status} - ${errorText}`);
      }

      const salesData = await response.json();

      hotmartLogger.info(`Histórico de vendas recuperado: ${salesData.items?.length || 0} itens`);
      
      res.json({
        success: true,
        data: salesData,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      hotmartLogger.error("Erro ao buscar histórico de vendas:", error);
      res.status(500).json({ 
        error: "Erro interno do servidor",
        message: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  };

  public getSalesSummary = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const {
        start_date,
        end_date,
        product_id,
        currency_code
      } = req.query;

      if (!start_date || !end_date) {
        res.status(400).json({
          error: "Parâmetros start_date e end_date são obrigatórios"
        });
        return;
      }

      const baseUrl = process.env.HOTMART_API_URL || 'https://developers.hotmart.com/payments/api/v1';
      let apiUrl = `${baseUrl}/sales/summary?start_date=${start_date}&end_date=${end_date}`;
      
      if (product_id) apiUrl += `&product_id=${product_id}`;
      if (currency_code) apiUrl += `&currency_code=${currency_code}`;

      // Obter token válido (renovando se necessário)
      const hotmartToken = await getValidHotmartToken();

      let response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${hotmartToken}`,
          'Content-Type': 'application/json'
        }
      });

      // Se receber 401, tenta renovar o token e fazer nova requisição
      if (response.status === 401) {
        hotmartLogger.info('Token expirado, renovando...');
        const newToken = await refreshHotmartToken();
        
        response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${newToken}`,
            'Content-Type': 'application/json'
          }
        });
      }

      if (!response.ok) {
        throw new Error(`Erro na API da Hotmart: ${response.status}`);
      }

      const summaryData = await response.json();

      hotmartLogger.info("Sumário de vendas recuperado com sucesso");
      
      res.json({
        success: true,
        data: summaryData,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      hotmartLogger.error("Erro ao buscar sumário de vendas:", error);
      res.status(500).json({ 
        error: "Erro interno do servidor",
        message: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  };

  public getSalesUsers = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const {
        start_date,
        end_date,
        product_id,
        buyer_email,
        max_results = 50,
        page_token
      } = req.query;

      if (!start_date || !end_date) {
        res.status(400).json({
          error: "Parâmetros start_date e end_date são obrigatórios"
        });
        return;
      }

      const baseUrl = process.env.HOTMART_API_URL || 'https://developers.hotmart.com/payments/api/v1';
      let apiUrl = `${baseUrl}/sales/users?start_date=${start_date}&end_date=${end_date}`;
      
      if (product_id) apiUrl += `&product_id=${product_id}`;
      if (buyer_email) apiUrl += `&buyer_email=${buyer_email}`;
      if (max_results) apiUrl += `&max_results=${max_results}`;
      if (page_token) apiUrl += `&page_token=${page_token}`;

      // Obter token válido (renovando se necessário)
      const hotmartToken = await getValidHotmartToken();

      let response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${hotmartToken}`,
          'Content-Type': 'application/json'
        }
      });

      // Se receber 401, tenta renovar o token e fazer nova requisição
      if (response.status === 401) {
        hotmartLogger.info('Token expirado, renovando...');
        const newToken = await refreshHotmartToken();
        
        response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${newToken}`,
            'Content-Type': 'application/json'
          }
        });
      }

      if (!response.ok) {
        throw new Error(`Erro na API da Hotmart: ${response.status}`);
      }

      const usersData = await response.json();

      hotmartLogger.info(`Participantes de vendas recuperados: ${usersData.items?.length || 0} itens`);
      
      res.json({
        success: true,
        data: usersData,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      hotmartLogger.error("Erro ao buscar participantes de vendas:", error);
      res.status(500).json({ 
        error: "Erro interno do servidor",
        message: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  };

  public getSalesCommissions = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const {
        start_date,
        end_date,
        product_id,
        max_results = 50,
        page_token
      } = req.query;

      if (!start_date || !end_date) {
        res.status(400).json({
          error: "Parâmetros start_date e end_date são obrigatórios"
        });
        return;
      }

      const baseUrl = process.env.HOTMART_API_URL || 'https://developers.hotmart.com/payments/api/v1';
      let apiUrl = `${baseUrl}/sales/commissions?start_date=${start_date}&end_date=${end_date}`;
      
      if (product_id) apiUrl += `&product_id=${product_id}`;
      if (max_results) apiUrl += `&max_results=${max_results}`;
      if (page_token) apiUrl += `&page_token=${page_token}`;

      // Obter token válido (renovando se necessário)
      const hotmartToken = await getValidHotmartToken();

      let response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${hotmartToken}`,
          'Content-Type': 'application/json'
        }
      });

      // Se receber 401, tenta renovar o token e fazer nova requisição
      if (response.status === 401) {
        hotmartLogger.info('Token expirado, renovando...');
        const newToken = await refreshHotmartToken();
        
        response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${newToken}`,
            'Content-Type': 'application/json'
          }
        });
      }

      if (!response.ok) {
        throw new Error(`Erro na API da Hotmart: ${response.status}`);
      }

      const commissionsData = await response.json();

      hotmartLogger.info(`Comissões de vendas recuperadas: ${commissionsData.items?.length || 0} itens`);
      
      res.json({
        success: true,
        data: commissionsData,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      hotmartLogger.error("Erro ao buscar comissões de vendas:", error);
      res.status(500).json({ 
        error: "Erro interno do servidor",
        message: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  };

  public getSalesPriceDetails = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const {
        start_date,
        end_date,
        product_id,
        transaction_id,
        max_results = 50,
        page_token
      } = req.query;

      if (!start_date || !end_date) {
        res.status(400).json({
          error: "Parâmetros start_date e end_date são obrigatórios"
        });
        return;
      }

      const baseUrl = process.env.HOTMART_API_URL || 'https://developers.hotmart.com/payments/api/v1';
      let apiUrl = `${baseUrl}/sales/price-details?start_date=${start_date}&end_date=${end_date}`;
      
      if (product_id) apiUrl += `&product_id=${product_id}`;
      if (transaction_id) apiUrl += `&transaction_id=${transaction_id}`;
      if (max_results) apiUrl += `&max_results=${max_results}`;
      if (page_token) apiUrl += `&page_token=${page_token}`;

      // Obter token válido (renovando se necessário)
      const hotmartToken = await getValidHotmartToken();

      let response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${hotmartToken}`,
          'Content-Type': 'application/json'
        }
      });

      // Se receber 401, tenta renovar o token e fazer nova requisição
      if (response.status === 401) {
        hotmartLogger.info('Token expirado, renovando...');
        const newToken = await refreshHotmartToken();
        
        response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${newToken}`,
            'Content-Type': 'application/json'
          }
        });
      }

      if (!response.ok) {
        throw new Error(`Erro na API da Hotmart: ${response.status}`);
      }

      const priceDetailsData = await response.json();

      hotmartLogger.info(`Detalhes de preços recuperados: ${priceDetailsData.items?.length || 0} itens`);
      
      res.json({
        success: true,
        data: priceDetailsData,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      hotmartLogger.error("Erro ao buscar detalhes de preços:", error);
      res.status(500).json({ 
        error: "Erro interno do servidor",
        message: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  };
}
