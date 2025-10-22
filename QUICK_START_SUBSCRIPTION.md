# 🚀 Guia Rápido - Sistema de Assinaturas

## ⚡ Instalação Rápida (5 minutos)

### 1. Configurar Variáveis de Ambiente

Copie o arquivo de exemplo e configure:

```bash
cp .env.subscription.example .env
```

Edite o `.env` e configure:

- `API_EVO_URL` - URL da sua Evolution API
- `EVO_API_KEY` - Chave da API
- `NOTIFICATION_INSTANCE` - Nome da instância WhatsApp
- `FRONTEND_URL` - URL do frontend

### 2. Executar Migração do Banco

```bash
npx prisma migrate dev
npx prisma generate
```

### 3. Iniciar o Servidor

```bash
npm run dev
```

✅ Pronto! O sistema está rodando.

## 🧪 Testar o Sistema

Execute o script de teste:

```bash
npx ts-node scripts/test-subscription.ts
```

## 📱 Usar no Frontend

### 1. Proteger uma Rota

```tsx
import SubscriptionGuard from "./components/subscription/SubscriptionGuard";

function App() {
  return (
    <Route
      path="/dashboard"
      element={
        <SubscriptionGuard>
          <Dashboard />
        </SubscriptionGuard>
      }
    />
  );
}
```

### 2. Usar o Hook

```tsx
import { useSubscription } from "./hooks/useSubscription";

function MyComponent() {
  const { subscription, payments, isSubscriptionValid } = useSubscription();

  if (!isSubscriptionValid) {
    return <div>Assinatura inativa</div>;
  }

  return <div>Bem-vindo!</div>;
}
```

### 3. Adicionar Rota de Billing

```tsx
import Billing from "./pages/Billing";

// Em suas rotas
<Route path="/billing" element={<Billing />} />;
```

## 🔧 Proteger Endpoints no Backend

```typescript
import { requireActiveSubscription } from "./middlewares/subscription-guard.middleware";

router.get(
  "/protected",
  authenticate,
  requireActiveSubscription, // ← Adicione isso
  controller.method
);
```

## 💳 Criar um Pagamento (Admin)

### Via API

```bash
curl -X POST http://localhost:9000/api/subscription/payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "userId": "USER_ID",
    "amount": 9900,
    "dueDate": "2025-11-19T00:00:00.000Z",
    "paymentMethod": "pix",
    "pixCode": "00020126...",
    "pixQRCode": "data:image/png;base64,..."
  }'
```

### Via Código

```typescript
import { paymentService } from "./services/payment.service";
import { PaymentMethod } from "./types/subscription.types";

await paymentService.createPayment({
  userId: "user-id",
  amount: 9900, // R$ 99,00 em centavos
  dueDate: new Date("2025-11-19"),
  paymentMethod: PaymentMethod.PIX,
});
```

## ✅ Confirmar um Pagamento (Admin)

```bash
curl -X POST http://localhost:9000/api/subscription/payments/PAYMENT_ID/confirm \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "paidAt": "2025-10-19T14:30:00.000Z"
  }'
```

## 📊 Ver Estatísticas (Admin)

```bash
# Estatísticas de assinatura
curl http://localhost:9000/api/subscription/admin/statistics \
  -H "Authorization: Bearer SEU_TOKEN"

# Estatísticas de pagamento
curl http://localhost:9000/api/subscription/admin/payment-statistics \
  -H "Authorization: Bearer SEU_TOKEN"

# Pagamentos pendentes
curl http://localhost:9000/api/subscription/admin/pending-payments \
  -H "Authorization: Bearer SEU_TOKEN"

# Pagamentos vencidos
curl http://localhost:9000/api/subscription/admin/overdue-payments \
  -H "Authorization: Bearer SEU_TOKEN"
```

## 🔄 Cron Jobs

Os cron jobs são iniciados automaticamente:

- **01:00** - Gera cobranças para assinaturas expirando em 5 dias
- **02:00** - Verifica e suspende assinaturas expiradas
- **03:00** (dia 1) - Gera cobranças mensais em lote
- **09:00** - Envia lembretes de pagamento via WhatsApp

### Logs dos Cron Jobs

Os logs aparecem no console com prefixo `[CRON]`:

```
🔍 [CRON] Iniciando verificação de assinaturas expiradas...
✅ [CRON] 5 pagamento(s) marcado(s) como vencido(s)
🚫 [CRON] 2 usuário(s) suspenso(s) por assinatura expirada
📤 [CRON] Notificação de suspensão enviada para user@example.com
```

## 📱 Notificações WhatsApp

As notificações são enviadas automaticamente nos seguintes casos:

### 1. Lembrete de Pagamento (antes do vencimento)

```
🔔 Lembrete de Pagamento 🔔

Olá, João! 👋

Sua assinatura PRO vence em 3 dia(s).

💰 Valor: R$ 99,00
📅 Vencimento: 22/10/2025

Para manter seu acesso ativo, realize o pagamento via Pix.

Acesse seu painel: https://seu-frontend.com/billing
```

### 2. Pagamento Vence Hoje

```
⚠️ Pagamento Vence Hoje ⚠️

Olá, João! 👋

Sua assinatura PRO vence HOJE.

💰 Valor: R$ 99,00
📅 Vencimento: 19/10/2025

⚡ Realize o pagamento via Pix para evitar a suspensão.
```

### 3. Pagamento em Atraso

```
🚨 PAGAMENTO EM ATRASO 🚨

Olá, João!

Sua assinatura está 2 dia(s) em atraso.

💰 Valor: R$ 99,00
📅 Venceu em: 17/10/2025

⛔ Seu acesso será suspenso em breve.

Regularize agora: https://seu-frontend.com/billing
```

### 4. Conta Suspensa

```
🔒 CONTA SUSPENSA 🔒

Olá, João.

Sua conta foi suspensa por falta de pagamento.

Para reativar seu acesso, regularize seus pagamentos.

Acesse: https://seu-frontend.com/billing
```

### 5. Pagamento Confirmado

```
✅ PAGAMENTO CONFIRMADO ✅

Olá, João! 🎉

Seu pagamento de R$ 99,00 foi confirmado!

📦 Plano: PRO
📅 Válido até: 19/11/2025

Sua conta está ativa! 🚀

Acesse: https://seu-frontend.com
```

### 6. Nova Cobrança Gerada

```
🧾 NOVA COBRANÇA GERADA 🧾

Olá, João! 👋

Uma nova cobrança foi gerada para sua assinatura.

💰 Valor: R$ 99,00
📅 Vencimento: 19/11/2025
📦 Plano: PRO

Acesse para pagar: https://seu-frontend.com/billing
```

## 🎯 Fluxo Completo

1. **Admin cria pagamento** → Sistema envia notificação de cobrança
2. **7 dias antes** → Lembrete 1
3. **3 dias antes** → Lembrete 2
4. **1 dia antes** → Lembrete 3
5. **No vencimento** → Lembrete urgente
6. **1 dia após** → Aviso de atraso 1
7. **3 dias após** → Aviso de atraso 2
8. **Após período de tolerância (3 dias)** → Conta é suspensa automaticamente
9. **Admin confirma pagamento** → Conta é reativada + notificação de confirmação

## 🔍 Verificar Status de um Usuário

```typescript
import { subscriptionService } from "./services/subscription.service";

// Verificar se assinatura é válida
const isValid = await subscriptionService.isSubscriptionValid("user-id");

// Obter informações detalhadas
const info = await subscriptionService.getSubscriptionInfo("user-id");
console.log(info);
// {
//   userId: "uuid",
//   plan: "pro",
//   status: "ACTIVE",
//   subscriptionEndDate: "2025-11-19",
//   isActive: true,
//   daysUntilExpiration: 30,
//   hasOverduePayment: false,
//   nextPaymentDate: "2025-11-19"
// }
```

## 🛠️ Operações Administrativas

### Suspender Usuário Manualmente

```typescript
await subscriptionService.suspendSubscription(
  "user-id",
  "Violação dos termos de uso"
);
```

### Ativar Usuário Manualmente

```typescript
await subscriptionService.activateSubscription(
  "user-id",
  1 // meses
);
```

### Gerar Cobrança Manualmente

```typescript
await billingService.generateMonthlyBilling("user-id");
```

### Cancelar Cobranças Pendentes

```typescript
await billingService.cancelUserPendingBills(
  "user-id",
  "Usuário cancelou assinatura"
);
```

## 🆘 Problemas Comuns

### ❌ Notificações não estão sendo enviadas

**Solução:**

1. Verifique se a Evolution API está online
2. Teste a conexão: `curl $API_EVO_URL/instance/connectionState/$NOTIFICATION_INSTANCE`
3. Verifique se a instância está conectada
4. Revise as variáveis de ambiente no `.env`

### ❌ Cron jobs não estão executando

**Solução:**

1. Procure por logs `[CRON]` no console
2. Verifique se o servidor está rodando continuamente
3. Confirme o timezone: `console.log(process.env.TZ)`
4. Teste manualmente as funções dos jobs

### ❌ Usuário não está sendo bloqueado

**Solução:**

1. Verifique se o middleware está aplicado na rota
2. Confirme se `isActive` e `active` estão false no banco
3. Verifique `subscriptionStatus` no banco de dados
4. Teste com: `await subscriptionService.isSubscriptionValid('user-id')`

## 📚 Documentação Completa

Veja `SUBSCRIPTION_SYSTEM.md` para documentação detalhada.

## ✅ Checklist de Implementação

- [ ] Variáveis de ambiente configuradas
- [ ] Migração do banco executada
- [ ] Evolution API configurada e rodando
- [ ] Instância WhatsApp conectada
- [ ] Frontend com SubscriptionGuard implementado
- [ ] Rotas protegidas com middleware
- [ ] Página de billing criada
- [ ] Testes executados com sucesso
- [ ] Cron jobs verificados nos logs
- [ ] Notificações testadas

---

🎉 **Parabéns! Seu sistema de assinaturas está pronto!**
