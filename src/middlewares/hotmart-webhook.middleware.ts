/**
 * Middleware de validação para webhooks da Hotmart
 * 
 * Valida o token X-HOTMART-HOTTOK enviado pela Hotmart em todos os webhooks
 * para garantir segurança e autenticidade das requisições
 * 
 * @module HotmartWebhookMiddleware
 */

import type { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

const hotmartLogger = logger.setContext("HotmartWebhookMiddleware");

/**
 * Valida o token HOTTOK da Hotmart
 * O token deve estar no header X-HOTMART-HOTTOK
 * 
 * IMPORTANTE: O HOTTOK é único para cada conta e deve ser configurado
 * nas variáveis de ambiente para comparar com o valor recebido
 */
export const validateHotmartWebhook = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Obter o token do header
    const receivedToken = req.headers["x-hotmart-hottok"] as string;

    if (!receivedToken) {
      hotmartLogger.error("Token X-HOTMART-HOTTOK não fornecido");
      res.status(401).json({
        error: "Unauthorized",
        message: "Token de autenticação não fornecido",
      });
      return;
    }

    // Obter o token esperado das variáveis de ambiente
    const expectedToken = process.env.HOTMART_WEBHOOK_HOTTOK;

    if (!expectedToken) {
      hotmartLogger.error(
        "HOTMART_WEBHOOK_HOTTOK não configurado nas variáveis de ambiente"
      );
      res.status(500).json({
        error: "Server Configuration Error",
        message: "Configuração do servidor inválida",
      });
      return;
    }

    // Comparar os tokens
    if (receivedToken !== expectedToken) {
      hotmartLogger.warn("Tentativa de acesso com token inválido", {
        receivedTokenLength: receivedToken.length,
        expectedTokenLength: expectedToken.length,
      });
      res.status(401).json({
        error: "Unauthorized",
        message: "Token de autenticação inválido",
      });
      return;
    }

    // Token válido, continuar
    hotmartLogger.info("Webhook Hotmart autenticado com sucesso");
    next();
  } catch (error) {
    hotmartLogger.error("Erro na validação do webhook Hotmart:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Erro ao processar autenticação",
    });
  }
};

/**
 * Middleware opcional para logging de webhooks Hotmart
 * Registra informações relevantes para auditoria e debug
 */
export const logHotmartWebhook = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const eventType = req.body?.event;
    const eventId = req.body?.id;
    const creationDate = req.body?.creation_date
      ? new Date(req.body.creation_date)
      : null;

    hotmartLogger.info("Webhook Hotmart recebido", {
      eventType,
      eventId,
      creationDate,
      ip: req.ip,
      userAgent: req.get("user-agent"),
      timestamp: new Date().toISOString(),
    });

    next();
  } catch (error) {
    hotmartLogger.error("Erro no log do webhook Hotmart:", error);
    next(); // Continuar mesmo com erro no log
  }
};

