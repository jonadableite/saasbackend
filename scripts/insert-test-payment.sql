-- Script para inserir pagamento de teste
-- User ID: ea3ed8ca-39e3-4941-a6cf-42da02d8ad4a
-- Execute este script no seu banco de dados PostgreSQL

-- 1. Inserir pagamento PENDENTE (para testar funcionalidade de pagamento Pix)
INSERT INTO "whatlead_payments" (
  id,
  "userId",
  amount,
  currency,
  status,
  "dueDate",
  "paymentMethod",
  "pixCode",
  "pixQRCode",
  "notificationSent",
  "remindersSent",
  "createdAt",
  "updatedAt"
) VALUES (
  gen_random_uuid(),
  'ea3ed8ca-39e3-4941-a6cf-42da02d8ad4a',
  9900, -- R$ 99,00 em centavos
  'BRL',
  'pending',
  NOW() + INTERVAL '7 days', -- Vence em 7 dias
  'pix',
  '00020126580014br.gov.bcb.pix0136ea3ed8ca-39e3-4941-a6cf-42da02d8ad4a5204000053039865802BR5925WHATLEADS PLATAFORMA6009SAO PAULO62070503***63041234', -- Código Pix exemplo
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', -- QR Code placeholder
  false,
  0,
  NOW(),
  NOW()
);

-- 2. Inserir pagamento VENCIDO (para testar alertas)
INSERT INTO "whatlead_payments" (
  id,
  "userId",
  amount,
  currency,
  status,
  "dueDate",
  "paymentMethod",
  "notificationSent",
  "remindersSent",
  "createdAt",
  "updatedAt"
) VALUES (
  gen_random_uuid(),
  'ea3ed8ca-39e3-4941-a6cf-42da02d8ad4a',
  9900,
  'BRL',
  'overdue',
  NOW() - INTERVAL '3 days', -- Vencido há 3 dias
  'pix',
  true,
  2,
  NOW() - INTERVAL '35 days',
  NOW()
);

-- 3. Inserir pagamento PAGO (histórico)
INSERT INTO "whatlead_payments" (
  id,
  "userId",
  amount,
  currency,
  status,
  "dueDate",
  "paidAt",
  "paymentMethod",
  "confirmedBy",
  "notificationSent",
  "remindersSent",
  "createdAt",
  "updatedAt"
) VALUES (
  gen_random_uuid(),
  'ea3ed8ca-39e3-4941-a6cf-42da02d8ad4a',
  9900,
  'BRL',
  'completed',
  NOW() - INTERVAL '30 days',
  NOW() - INTERVAL '28 days', -- Pago 2 dias antes do vencimento
  'pix',
  'admin-user-id', -- ID do admin que confirmou
  true,
  0,
  NOW() - INTERVAL '60 days',
  NOW() - INTERVAL '28 days'
);

-- 4. Atualizar dados de assinatura do usuário
UPDATE "whatlead_users"
SET 
  plan = 'premium',
  "subscriptionStatus" = 'ACTIVE',
  "subscriptionEndDate" = NOW() + INTERVAL '30 days',
  "isActive" = true,
  "updatedAt" = NOW()
WHERE id = 'ea3ed8ca-39e3-4941-a6cf-42da02d8ad4a';

-- Verificar os dados inseridos
SELECT 
  id,
  amount,
  currency,
  status,
  "dueDate",
  "paidAt",
  "paymentMethod",
  "createdAt"
FROM "whatlead_payments"
WHERE "userId" = 'ea3ed8ca-39e3-4941-a6cf-42da02d8ad4a'
ORDER BY "createdAt" DESC;

-- Verificar dados do usuário
SELECT 
  id,
  name,
  email,
  plan,
  "subscriptionStatus",
  "subscriptionEndDate",
  "isActive"
FROM "whatlead_users"
WHERE id = 'ea3ed8ca-39e3-4941-a6cf-42da02d8ad4a';

