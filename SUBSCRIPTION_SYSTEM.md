# Sistema de Assinaturas e Pagamentos - WhatLeads

## 📋 Visão Geral

Sistema completo de gerenciamento de assinaturas, cobranças automáticas e bloqueio de acesso para usuários inadimplentes. Suporta pagamentos manuais via Pix, notificações automáticas via WhatsApp e renovação mensal automática.

## 🚀 Características

✅ **Pagamentos manuais via Pix** (sem gateway)
⏳ **Vencimentos e renovação mensal automática**
🚫 **Bloqueio automático de usuários inadimplentes**
📢 **Notificações de cobrança e lembretes via WhatsApp**
🧾 **Histórico completo de pagamentos**
🔒 **Middleware de segurança para proteger rotas**
📊 **Dashboard administrativo com estatísticas**

## 🏗️ Arquitetura

### Backend (Node.js + TypeScript + Express)

```
src/
├── services/
│   ├── subscription.service.ts    # Lógica de assinatura
│   ├── payment.service.ts         # Gerenciamento de pagamentos
│   ├── billing.service.ts         # Geração automática de cobranças
│   └── notification.service.ts    # Notificações WhatsApp
├── controllers/
│   └── subscription.controller.ts # Endpoints HTTP
├── middlewares/
│   └── subscription-guard.middleware.ts # Bloqueio de acesso
├── jobs/
│   ├── subscription-check.job.ts  # Cron: verificação diária
│   └── billing-generation.job.ts  # Cron: geração de cobranças
├── routes/
│   └── subscription.routes.ts     # Rotas da API
└── types/
    └── subscription.types.ts      # Tipos TypeScript
```

### Frontend (React + TypeScript)

```
src/
├── hooks/
│   └── useSubscription.ts         # Hook de gerenciamento
├── components/
│   └── subscription/
│       └── SubscriptionGuard.tsx  # Componente de bloqueio
└── pages/
    └── Billing.tsx                # Página de pagamentos
```

## 🔧 Configuração

### 1. Variáveis de Ambiente

Adicione no seu `.env`:

```env
# Evolution API (para notificações WhatsApp)
API_EVO_URL=https://sua-evolution-api.com
EVO_API_KEY=sua-api-key
NOTIFICATION_INSTANCE=nome-da-instancia

# Frontend URL (para links nas notificações)
FRONTEND_URL=https://seu-frontend.com
```

### 2. Migração do Banco de Dados

Execute a migração do Prisma:

```bash
cd saasapi
npx prisma migrate dev --name add_subscription_system
npx prisma generate
```

### 3. Inicializar o Sistema

O sistema é iniciado automaticamente quando você roda o servidor:

```bash
npm run dev
# ou
npm start
```

Os cron jobs são inicializados automaticamente:

- **01:00** - Geração de cobranças diárias
- **02:00** - Verificação de assinaturas expiradas
- **03:00** (dia 1) - Geração mensal de cobranças
- **09:00** - Envio de lembretes de pagamento

## 📡 API Endpoints

### Endpoints Públicos (Requer Autenticação)

#### `GET /api/subscription/me`

Retorna informações da assinatura do usuário logado.

**Response:**

```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "plan": "pro",
    "status": "ACTIVE",
    "subscriptionEndDate": "2025-11-19T00:00:00.000Z",
    "isActive": true,
    "daysUntilExpiration": 30,
    "hasOverduePayment": false,
    "nextPaymentDate": "2025-11-19T00:00:00.000Z"
  }
}
```

#### `GET /api/subscription/payments`

Retorna histórico de pagamentos do usuário.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "amount": 9900,
      "currency": "BRL",
      "status": "completed",
      "dueDate": "2025-10-19T00:00:00.000Z",
      "paidAt": "2025-10-18T14:30:00.000Z",
      "paymentMethod": "pix"
    }
  ]
}
```

#### `POST /api/subscription/cancel`

Cancela a assinatura do usuário.

**Body:**

```json
{
  "reason": "Não preciso mais do serviço"
}
```

### Endpoints Administrativos (Requer Permissão Admin)

#### `POST /api/subscription/payments`

Cria um novo pagamento para um usuário.

**Body:**

```json
{
  "userId": "user-uuid",
  "amount": 9900,
  "dueDate": "2025-11-19T00:00:00.000Z",
  "paymentMethod": "pix",
  "pixCode": "00020126...codigo-pix",
  "pixQRCode": "data:image/png;base64,..."
}
```

#### `POST /api/subscription/payments/:paymentId/confirm`

Confirma um pagamento manualmente.

**Body:**

```json
{
  "paidAt": "2025-10-19T14:30:00.000Z"
}
```

#### `POST /api/subscription/payments/:paymentId/cancel`

Cancela um pagamento.

**Body:**

```json
{
  "reason": "Pagamento duplicado"
}
```

#### `POST /api/subscription/billing/generate/:userId`

Gera cobrança manual para um usuário.

#### `POST /api/subscription/admin/:userId/suspend`

Suspende a assinatura de um usuário.

**Body:**

```json
{
  "reason": "Violação dos termos de uso"
}
```

#### `POST /api/subscription/admin/:userId/activate`

Ativa a assinatura de um usuário.

**Body:**

```json
{
  "durationMonths": 1
}
```

#### `GET /api/subscription/admin/statistics`

Retorna estatísticas de assinaturas.

#### `GET /api/subscription/admin/payment-statistics`

Retorna estatísticas de pagamentos.

#### `GET /api/subscription/admin/pending-payments`

Lista pagamentos pendentes.

#### `GET /api/subscription/admin/overdue-payments`

Lista pagamentos vencidos.

## 🎯 Fluxo de Uso

### 1. Criação de Pagamento (Admin)

```typescript
// Criar pagamento manual via Pix
POST /api/subscription/payments
{
  "userId": "user-id",
  "amount": 9900, // R$ 99,00 em centavos
  "dueDate": "2025-11-19",
  "paymentMethod": "pix",
  "pixCode": "codigo-pix-gerado",
  "pixQRCode": "qr-code-base64"
}
```

### 2. Usuário Recebe Notificação

O sistema envia automaticamente uma notificação via WhatsApp:

- **7 dias antes** do vencimento
- **3 dias antes** do vencimento
- **1 dia antes** do vencimento
- **No dia** do vencimento
- **1, 3 e 7 dias após** o vencimento

### 3. Confirmação de Pagamento (Admin)

```typescript
// Confirmar pagamento após receber o Pix
POST /api/subscription/payments/:paymentId/confirm
{
  "paidAt": "2025-10-19T14:30:00.000Z"
}
```

**Ações automáticas após confirmação:**

- ✅ Ativa a assinatura do usuário
- ✅ Atualiza a data de expiração (+1 mês)
- ✅ Envia notificação de confirmação via WhatsApp

### 4. Bloqueio Automático

Se o pagamento não for confirmado após o período de tolerância (3 dias):

- 🚫 Usuário é suspenso automaticamente
- 📱 Notificação de suspensão é enviada
- 🔒 Acesso à plataforma é bloqueado

## 🔒 Proteção de Rotas

### Backend

Use o middleware `requireActiveSubscription` para proteger rotas:

```typescript
import { requireActiveSubscription } from "./middlewares/subscription-guard.middleware";

// Proteger rota específica
router.get(
  "/protected-route",
  authenticate,
  requireActiveSubscription,
  controller.method
);

// Verificar com período de tolerância (apenas avisa, não bloqueia)
router.get(
  "/semi-protected",
  authenticate,
  checkSubscriptionWithGracePeriod,
  controller.method
);

// Exigir plano específico
router.get(
  "/premium-feature",
  authenticate,
  requirePlan("pro"),
  controller.method
);
```

### Frontend

Use o componente `SubscriptionGuard` para proteger rotas:

```typescript
import SubscriptionGuard from "./components/subscription/SubscriptionGuard";

function App() {
  return (
    <Routes>
      {/* Rota protegida */}
      <Route
        path="/dashboard"
        element={
          <SubscriptionGuard>
            <Dashboard />
          </SubscriptionGuard>
        }
      />

      {/* Rota pública */}
      <Route path="/login" element={<Login />} />
    </Routes>
  );
}
```

## 📊 Preços dos Planos

Definidos em `subscription.types.ts`:

```typescript
export const PLAN_PRICES: Record<string, number> = {
  free: 0,
  basic: 4900, // R$ 49,00
  pro: 9900, // R$ 99,00
  enterprise: 29900, // R$ 299,00
};
```

## 🔄 Cron Jobs

### 1. Verificação de Assinaturas (`subscription-check.job.ts`)

**Horário:** Diariamente às 02:00

**Ações:**

- Marca pagamentos vencidos como "overdue"
- Suspende usuários com assinatura expirada (após período de tolerância)
- Envia notificações de suspensão

### 2. Lembretes de Pagamento (`subscription-check.job.ts`)

**Horário:** Diariamente às 09:00

**Ações:**

- Envia lembretes para pagamentos próximos ao vencimento
- Envia lembretes para pagamentos vencidos
- Respeita limite máximo de lembretes (6)

### 3. Geração de Cobranças (`billing-generation.job.ts`)

**Horário:** Diariamente às 01:00

**Ações:**

- Gera cobranças para assinaturas que expiram nos próximos 5 dias
- Envia notificação de nova cobrança

**Horário:** Dia 1 de cada mês às 03:00

**Ações:**

- Gera cobranças mensais para todos os usuários ativos

## 🛠️ Serviços Principais

### SubscriptionService

Gerencia o ciclo de vida das assinaturas:

- ✅ Ativar assinatura
- 🚫 Suspender assinatura
- ❌ Cancelar assinatura
- ✅ Verificar validade
- 📊 Estatísticas

### PaymentService

Gerencia pagamentos:

- ➕ Criar pagamento
- ✅ Confirmar pagamento
- ❌ Cancelar pagamento
- 📋 Listar pagamentos
- ⏰ Marcar vencidos

### BillingService

Geração automática de cobranças:

- 📅 Gerar cobrança mensal
- 🔄 Geração em lote
- 💰 Cálculo proporcional (upgrade/downgrade)

### NotificationService

Notificações via WhatsApp:

- 🔔 Lembretes de pagamento
- ✅ Confirmação de pagamento
- 🚫 Suspensão de conta
- 🧾 Nova cobrança gerada

## 🧪 Testes

### Testar Criação de Pagamento

```bash
curl -X POST http://localhost:9000/api/subscription/payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer seu-token" \
  -d '{
    "userId": "user-id",
    "amount": 9900,
    "dueDate": "2025-11-19T00:00:00.000Z",
    "paymentMethod": "pix"
  }'
```

### Testar Confirmação de Pagamento

```bash
curl -X POST http://localhost:9000/api/subscription/payments/payment-id/confirm \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer seu-token" \
  -d '{
    "paidAt": "2025-10-19T14:30:00.000Z"
  }'
```

## 🔐 Segurança

### Princípios SOLID Aplicados

- **Single Responsibility:** Cada serviço tem uma única responsabilidade
- **Open/Closed:** Extensível sem modificar código existente
- **Liskov Substitution:** Serviços podem ser substituídos
- **Interface Segregation:** Interfaces específicas e focadas
- **Dependency Inversion:** Dependências via injeção

### Validações

- ✅ Autenticação JWT em todas as rotas
- ✅ Validação de dados de entrada
- ✅ Proteção contra ataques de injeção
- ✅ Rate limiting (configurável)
- ✅ Logs estruturados para auditoria

## 📝 Notas Importantes

1. **Período de Tolerância:** 3 dias após o vencimento antes da suspensão
2. **Máximo de Lembretes:** 6 notificações por pagamento
3. **Horários dos Cron Jobs:** Configuráveis via cron expression
4. **Notificações WhatsApp:** Requer instância configurada na Evolution API
5. **Frontend URL:** Configurar corretamente para links nas notificações

## 🆘 Troubleshooting

### Notificações não estão sendo enviadas

1. Verifique se a Evolution API está rodando
2. Confirme se a instância está conectada
3. Verifique as variáveis `API_EVO_URL`, `EVO_API_KEY` e `NOTIFICATION_INSTANCE`

### Cron jobs não estão executando

1. Verifique os logs do servidor
2. Confirme se os jobs foram inicializados: procure por `[CRON]` nos logs
3. Verifique o timezone do servidor

### Usuário não está sendo bloqueado

1. Verifique se o middleware `requireActiveSubscription` está aplicado na rota
2. Confirme se o `subscriptionStatus` está correto no banco
3. Verifique se o `isActive` e `active` estão definidos corretamente

## 🚀 Próximos Passos

- [ ] Integração com gateway de pagamento automático
- [ ] Suporte a boleto bancário
- [ ] Dashboard analytics avançado
- [ ] Sistema de cupons de desconto
- [ ] Planos anuais com desconto
- [ ] Trial gratuito automatizado

## 📞 Suporte

Para dúvidas ou problemas, entre em contato com a equipe de desenvolvimento.

---

**Desenvolvido com ❤️ seguindo os princípios SOLID e boas práticas de segurança.**
