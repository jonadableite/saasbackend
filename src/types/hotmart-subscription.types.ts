import { z } from "zod";

/**
 * Tipos e Schemas para integração com Webhooks de Assinaturas da Hotmart
 * Seguindo padrões SOLID e type-safety
 */

// Enum de eventos de assinatura
export enum HotmartSubscriptionEventType {
  SWITCH_PLAN = "SWITCH_PLAN",
  SUBSCRIPTION_CANCELLATION = "SUBSCRIPTION_CANCELLATION",
  UPDATE_SUBSCRIPTION_CHARGE_DATE = "UPDATE_SUBSCRIPTION_CHARGE_DATE",
  PURCHASE_OUT_OF_SHOPPING_CART = "PURCHASE_OUT_OF_SHOPPING_CART",
}

// Enum de status de assinatura
export enum HotmartSubscriptionStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  CANCELED_BY_CUSTOMER = "CANCELED_BY_CUSTOMER",
  CANCELED_BY_VENDOR = "CANCELED_BY_VENDOR",
  CANCELED_BY_ADMIN = "CANCELED_BY_ADMIN",
  OVERDUE = "OVERDUE",
  STARTED = "STARTED",
  EXPIRED = "EXPIRED",
}

// Schemas Zod para validação
const PhoneSchema = z.object({
  dddPhone: z.string().optional(),
  phone: z.string().optional(),
  dddCell: z.string().optional(),
  cell: z.string().optional(),
});

const ProductSchema = z.object({
  id: z.number(),
  name: z.string(),
  ucode: z.string().optional(),
});

const PlanSchema = z.object({
  id: z.number(),
  name: z.string(),
  offer: z
    .object({
      code: z.string().optional(),
      key: z.string().optional(),
      description: z.string().optional(),
    })
    .optional(),
  current: z.boolean().optional(),
});

const SubscriberSchema = z.object({
  code: z.string(),
  name: z.string(),
  email: z.string().email(),
  phone: PhoneSchema.optional(),
});

const BaseSubscriptionSchema = z.object({
  id: z.number(),
  plan: PlanSchema,
  status: z.nativeEnum(HotmartSubscriptionStatus),
  date_next_charge: z.number().optional(),
  product: ProductSchema.optional(),
  old_charge_day: z.number().optional(),
  new_charge_day: z.number().optional(),
});

const SubscriptionWithSubscriberSchema = BaseSubscriptionSchema.extend({
  subscriber: SubscriberSchema.optional(),
});

// Schema para SWITCH_PLAN (Troca de Plano)
export const SwitchPlanWebhookSchema = z.object({
  id: z.string(),
  creation_date: z.number(),
  event: z.literal(HotmartSubscriptionEventType.SWITCH_PLAN),
  version: z.string(),
  data: z.object({
    switch_plan_date: z.number(),
    subscription: SubscriptionWithSubscriberSchema,
    plans: z.array(PlanSchema),
  }),
});

// Schema para SUBSCRIPTION_CANCELLATION (Cancelamento de Assinatura)
export const SubscriptionCancellationWebhookSchema = z.object({
  id: z.string(),
  creation_date: z.number(),
  event: z.literal(HotmartSubscriptionEventType.SUBSCRIPTION_CANCELLATION),
  version: z.string(),
  data: z.object({
    cancellation_date: z.number(),
    date_next_charge: z.number(),
    product: ProductSchema,
    actual_recurrence_value: z.number().optional(),
    subscriber: SubscriberSchema,
    subscription: BaseSubscriptionSchema,
  }),
});

// Schema para UPDATE_SUBSCRIPTION_CHARGE_DATE (Alteração de Dia de Cobrança)
export const UpdateChargeDateWebhookSchema = z.object({
  id: z.string(),
  creation_date: z.number(),
  event: z.literal(
    HotmartSubscriptionEventType.UPDATE_SUBSCRIPTION_CHARGE_DATE
  ),
  version: z.string(),
  data: z.object({
    subscriber: SubscriberSchema,
    subscription: BaseSubscriptionSchema.extend({
      product: ProductSchema,
      old_charge_day: z.number(),
      new_charge_day: z.number(),
      date_next_charge: z.number(),
    }),
    plan: PlanSchema,
  }),
});

// Schema para PURCHASE_OUT_OF_SHOPPING_CART (Abandono de Carrinho)
export const CartAbandonmentWebhookSchema = z.object({
  id: z.string(),
  creation_date: z.number(),
  event: z.literal(HotmartSubscriptionEventType.PURCHASE_OUT_OF_SHOPPING_CART),
  version: z.string(),
  data: z.object({
    affiliate: z.boolean().optional(),
    product: ProductSchema,
    buyer: z
      .object({
        name: z.string(),
        email: z.string().email(),
        phone: z.string().optional(),
      })
      .optional(),
    offer: z
      .object({
        code: z.string(),
      })
      .optional(),
    checkout_country: z
      .object({
        name: z.string(),
        iso: z.string(),
      })
      .optional(),
  }),
});

// Schema Union para todos os eventos de assinatura
export const HotmartSubscriptionWebhookSchema = z.union([
  SwitchPlanWebhookSchema,
  SubscriptionCancellationWebhookSchema,
  UpdateChargeDateWebhookSchema,
  CartAbandonmentWebhookSchema,
]);

// Tipos TypeScript inferidos dos schemas
export type SwitchPlanWebhook = z.infer<typeof SwitchPlanWebhookSchema>;
export type SubscriptionCancellationWebhook = z.infer<
  typeof SubscriptionCancellationWebhookSchema
>;
export type UpdateChargeDateWebhook = z.infer<
  typeof UpdateChargeDateWebhookSchema
>;
export type CartAbandonmentWebhook = z.infer<
  typeof CartAbandonmentWebhookSchema
>;
export type HotmartSubscriptionWebhook = z.infer<
  typeof HotmartSubscriptionWebhookSchema
>;

// Tipos auxiliares para processamento
export interface ProcessedWebhookResult {
  success: boolean;
  event: HotmartSubscriptionEventType;
  userEmail?: string;
  subscriberCode?: string;
  message: string;
  metadata?: Record<string, any>;
}

export interface SubscriptionUpdateResult {
  userId: string;
  subscriptionId: string;
  oldPlan: string;
  newPlan: string;
  effectiveDate: Date;
}
