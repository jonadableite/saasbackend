/**
 * Rotas para webhooks de assinaturas Hotmart
 *
 * @swagger
 * tags:
 *   name: Hotmart Subscriptions
 *   description: Endpoints para webhooks de assinaturas da Hotmart
 */

import { Router } from "express";
import { HotmartSubscriptionController } from "../controllers/hotmart-subscription.controller";
import {
  logHotmartWebhook,
  validateHotmartWebhook,
} from "../middlewares/hotmart-webhook.middleware";

const router = Router();
const subscriptionController = new HotmartSubscriptionController();

/**
 * @swagger
 * /api/hotmart/subscriptions/webhook:
 *   post:
 *     summary: Webhook para processar eventos de assinaturas da Hotmart
 *     description: |
 *       Recebe e processa webhooks relacionados a assinaturas da Hotmart:
 *       - SWITCH_PLAN: Troca de plano
 *       - SUBSCRIPTION_CANCELLATION: Cancelamento de assinatura
 *       - UPDATE_SUBSCRIPTION_CHARGE_DATE: Alteração de dia de cobrança
 *       - PURCHASE_OUT_OF_SHOPPING_CART: Abandono de carrinho
 *     tags: [Hotmart Subscriptions]
 *     security:
 *       - HotmartWebhook: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - $ref: '#/components/schemas/SwitchPlanWebhook'
 *               - $ref: '#/components/schemas/SubscriptionCancellationWebhook'
 *               - $ref: '#/components/schemas/UpdateChargeDateWebhook'
 *               - $ref: '#/components/schemas/CartAbandonmentWebhook'
 *     responses:
 *       200:
 *         description: Webhook processado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 event:
 *                   type: string
 *       401:
 *         description: Token de autenticação inválido
 *       500:
 *         description: Erro interno do servidor
 *
 * @swagger
 * components:
 *   securitySchemes:
 *     HotmartWebhook:
 *       type: apiKey
 *       in: header
 *       name: X-HOTMART-HOTTOK
 *       description: Token de autenticação da Hotmart
 *   schemas:
 *     SwitchPlanWebhook:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: ID único do evento
 *         creation_date:
 *           type: number
 *           description: Timestamp de criação
 *         event:
 *           type: string
 *           enum: [SWITCH_PLAN]
 *         version:
 *           type: string
 *         data:
 *           type: object
 *           properties:
 *             switch_plan_date:
 *               type: number
 *             subscription:
 *               $ref: '#/components/schemas/Subscription'
 *             plans:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Plan'
 *     SubscriptionCancellationWebhook:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         creation_date:
 *           type: number
 *         event:
 *           type: string
 *           enum: [SUBSCRIPTION_CANCELLATION]
 *         version:
 *           type: string
 *         data:
 *           type: object
 *           properties:
 *             cancellation_date:
 *               type: number
 *             date_next_charge:
 *               type: number
 *             product:
 *               $ref: '#/components/schemas/Product'
 *             subscriber:
 *               $ref: '#/components/schemas/Subscriber'
 *             subscription:
 *               $ref: '#/components/schemas/Subscription'
 *     UpdateChargeDateWebhook:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         creation_date:
 *           type: number
 *         event:
 *           type: string
 *           enum: [UPDATE_SUBSCRIPTION_CHARGE_DATE]
 *         version:
 *           type: string
 *         data:
 *           type: object
 *           properties:
 *             subscriber:
 *               $ref: '#/components/schemas/Subscriber'
 *             subscription:
 *               $ref: '#/components/schemas/Subscription'
 *     CartAbandonmentWebhook:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         creation_date:
 *           type: number
 *         event:
 *           type: string
 *           enum: [PURCHASE_OUT_OF_SHOPPING_CART]
 *         version:
 *           type: string
 *         data:
 *           type: object
 *           properties:
 *             product:
 *               $ref: '#/components/schemas/Product'
 *             buyer:
 *               type: object
 *               properties:
 *                 name:
 *                   type: string
 *                 email:
 *                   type: string
 *     Subscription:
 *       type: object
 *       properties:
 *         id:
 *           type: number
 *         status:
 *           type: string
 *           enum: [ACTIVE, INACTIVE, CANCELED_BY_CUSTOMER, CANCELED_BY_VENDOR, CANCELED_BY_ADMIN, OVERDUE, STARTED, EXPIRED]
 *         date_next_charge:
 *           type: number
 *         plan:
 *           $ref: '#/components/schemas/Plan'
 *         product:
 *           $ref: '#/components/schemas/Product'
 *     Plan:
 *       type: object
 *       properties:
 *         id:
 *           type: number
 *         name:
 *           type: string
 *         offer:
 *           type: object
 *           properties:
 *             code:
 *               type: string
 *             key:
 *               type: string
 *         current:
 *           type: boolean
 *     Product:
 *       type: object
 *       properties:
 *         id:
 *           type: number
 *         name:
 *           type: string
 *         ucode:
 *           type: string
 *     Subscriber:
 *       type: object
 *       properties:
 *         code:
 *           type: string
 *         name:
 *           type: string
 *         email:
 *           type: string
 */
router.post(
  "/webhook",
  validateHotmartWebhook,
  logHotmartWebhook,
  subscriptionController.handleWebhook
);

/**
 * @swagger
 * /api/hotmart/subscriptions/health:
 *   get:
 *     summary: Health check do serviço de assinaturas
 *     tags: [Hotmart Subscriptions]
 *     responses:
 *       200:
 *         description: Serviço operacional
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 service:
 *                   type: string
 *                   example: HotmartSubscriptionService
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get("/health", subscriptionController.healthCheck);

export default router;
