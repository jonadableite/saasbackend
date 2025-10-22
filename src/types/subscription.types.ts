/**
 * Subscription and Payment Types
 * Defines all types related to subscription management and billing
 */

export enum SubscriptionStatus {
  ACTIVE = "ACTIVE",
  CANCELLED = "CANCELLED",
  SUSPENDED = "SUSPENDED",
  PENDING = "PENDING",
  TRIAL = "TRIAL",
  EXPIRED = "EXPIRED",
}

export enum PaymentStatus {
  PENDING = "pending",
  COMPLETED = "completed",
  OVERDUE = "overdue",
  CANCELLED = "cancelled",
  REFUNDED = "refunded",
}

export enum PaymentMethod {
  PIX = "pix",
  CREDIT_CARD = "credit_card",
  BOLETO = "boleto",
  STRIPE = "stripe",
}

export interface CreatePaymentDTO {
  userId: string;
  amount: number;
  currency?: string;
  dueDate: Date;
  paymentMethod: PaymentMethod;
  pixCode?: string;
  pixQRCode?: string;
  metadata?: Record<string, any>;
}

export interface ConfirmPaymentDTO {
  paymentId: string;
  confirmedBy: string;
  paidAt?: Date;
  metadata?: Record<string, any>;
}

export interface SubscriptionInfo {
  userId: string;
  plan: string;
  status: SubscriptionStatus;
  subscriptionEndDate: Date | null;
  isActive: boolean;
  daysUntilExpiration: number | null;
  hasOverduePayment: boolean;
  nextPaymentDate: Date | null;
}

export interface BillingCycleConfig {
  plan: string;
  amount: number;
  currency: string;
  dayOfMonth: number; // Dia do mês para cobrança
  gracePeriodDays: number; // Dias de tolerância após vencimento
}

export interface NotificationConfig {
  daysBeforeDue: number[];
  daysAfterDue: number[];
  maxReminders: number;
}

export const DEFAULT_NOTIFICATION_CONFIG: NotificationConfig = {
  daysBeforeDue: [7, 3, 1],
  daysAfterDue: [1, 3, 7],
  maxReminders: 6,
};

export const PLAN_PRICES: Record<string, number> = {
  free: 0,
  basic: 4900, // R$ 49,00 em centavos
  pro: 9900, // R$ 99,00
  enterprise: 29900, // R$ 299,00
};

export const GRACE_PERIOD_DAYS = 3; // Dias de tolerância após vencimento
