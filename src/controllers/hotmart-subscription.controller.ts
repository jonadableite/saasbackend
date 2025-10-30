/**
 * HotmartSubscriptionController
 * 
 * Controller para gerenciar webhooks de assinaturas da Hotmart
 * Integra com HotmartSubscriptionService para processamento de eventos
 * 
 * @module HotmartSubscriptionController
 */

import type { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { HotmartSubscriptionService } from "../services/hotmart-subscription.service";
import { logger } from "../utils/logger";

const controllerLogger = logger.setContext("HotmartSubscriptionController");
const prisma = new PrismaClient();
const subscriptionService = new HotmartSubscriptionService(prisma);

export class HotmartSubscriptionController {
  /**
   * Endpoint principal para receber webhooks de assinaturas da Hotmart
   * Roteia eventos para os handlers apropriados
   */
  public handleWebhook = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      controllerLogger.info("Webhook de assinatura Hotmart recebido");

      // Processar webhook através do service
      const result = await subscriptionService.processWebhook(req.body);

      if (result.success) {
        controllerLogger.info("Webhook processado com sucesso", {
          event: result.event,
          userEmail: result.userEmail,
        });

        // Retornar 200 mesmo em caso de "usuário não encontrado"
        // para evitar que a Hotmart reenvie o webhook
        res.status(200).json({
          success: true,
          message: result.message,
          event: result.event,
        });
      } else {
        controllerLogger.warn("Webhook processado com avisos", {
          event: result.event,
          message: result.message,
        });

        // Retornar 200 para eventos não suportados para evitar reenvios
        res.status(200).json({
          success: false,
          message: result.message,
          event: result.event,
        });
      }
    } catch (error) {
      controllerLogger.error("Erro ao processar webhook de assinatura:", error);

      // IMPORTANTE: Retornar 200 mesmo em caso de erro para evitar reenvios
      // A Hotmart pode continuar reenviando webhooks se receber código de erro
      res.status(200).json({
        success: false,
        message: "Erro ao processar webhook, mas recebido com sucesso",
        error: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  };

  /**
   * Endpoint de health check para verificar disponibilidade
   */
  public healthCheck = (_req: Request, res: Response): void => {
    res.status(200).json({
      status: "ok",
      service: "HotmartSubscriptionService",
      timestamp: new Date().toISOString(),
    });
  };
}

