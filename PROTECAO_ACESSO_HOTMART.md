# Proteção de Acesso - Assinaturas Hotmart

## 🛡️ Segurança de Login e Navegação

### Objetivo

Garantir que **apenas usuários com pagamentos aprovados** possam:
- ✅ Fazer login na plataforma
- ✅ Navegar pela plataforma
- ✅ Usar as funcionalidades

Usuários com pagamentos **atrasados ou cancelados** são **bloqueados automaticamente**.

## 🔒 Verificações Implementadas

### 1. Verificação no Login

**Arquivo**: `src/controllers/login.controller.ts` e `src/controllers/session.controller.ts`

```typescript
// Verificar se a conta está ativa
if (!user.isActive) {
  logger.warn(`Tentativa de login de conta inativa: ${email}`);
  return res.status(403).json({ 
    error: "Conta inativa. Verifique o status da sua assinatura.",
    reason: user.subscriptionStatus || "INACTIVE"
  });
}
```

**Resposta**: HTTP 403 Forbidden

### 2. Verificação no Middleware de Autenticação

**Arquivo**: `src/middlewares/authenticate.ts`

**Quando**: Para **toda requisição autenticada** na plataforma

```typescript
// Verificar se a conta está ativa
if (!user.isActive) {
  authLogger.warn(`Tentativa de acesso com conta inativa: ${user.email}`);
  return res.status(403).json({ 
    error: "Conta inativa. Verifique o status da sua assinatura.",
    reason: user.subscriptionStatus || "INACTIVE"
  });
}
```

**Efeito**: Bloqueia navegação mesmo com token válido

## 🔄 Jobs Automáticos

### Job 1: Verificação Diária (03:00 AM)

**Arquivo**: `src/jobs/hotmart-subscription-check.job.ts`

**O que faz**:
1. ✅ Verifica assinaturas expiradas (`subscriptionEndDate < now`)
2. ✅ Marca usuários como inativos (`isActive = false`)
3. ✅ Verifica status de cancelamento
4. ✅ Reativa usuários que pagaram após expiração

**Frequência**: Diariamente às 03:00

### Job 2: Verificação de Atrasos (A cada 6 horas)

**Arquivo**: `src/jobs/hotmart-subscription-check.job.ts`

**O que faz**:
1. ✅ Verifica status `DELAYED` ou `OVERDUE`
2. ✅ Marca usuários como inativos imediatamente
3. ✅ Bloqueia acesso até pagamento ser confirmado

**Frequência**: A cada 6 horas (00:00, 06:00, 12:00, 18:00)

## 📊 Fluxo de Status

### Status de Assinatura

```typescript
// Ativos (podem fazer login)
✅ isActive: true
   - subscriptionStatus: "ACTIVE"
   - subscriptionEndDate: no futuro
   
// Bloqueados (NÃO podem fazer login)
❌ isActive: false
   - subscriptionStatus: "CANCELLED"
   - subscriptionStatus: "CANCELLED_BY_CUSTOMER"
   - subscriptionStatus: "CANCELLED_BY_SELLER"
   - subscriptionStatus: "CANCELLED_BY_ADMIN"
   - subscriptionStatus: "DELAYED"
   - subscriptionStatus: "OVERDUE"
   - subscriptionStatus: "EXPIRED"
   - subscriptionEndDate: no passado
```

### Webhooks que Alteram Status

#### Ativação (isActive = true)
- ✅ `PURCHASE_APPROVED`: Pagamento aprovado
- ✅ `SUBSCRIPTION_CHARGE_SUCCESS`: Cobrança bem-sucedida
- ✅ `SUBSCRIPTION_REACTIVATION`: Reativação

#### Bloqueio (isActive = false)
- ❌ `PURCHASE_CANCELED`: Compra cancelada
- ❌ `PURCHASE_REFUNDED`: Reembolso
- ❌ `PURCHASE_CHARGEBACK`: Chargeback
- ❌ `PURCHASE_EXPIRED`: Pagamento expirado
- ❌ `PURCHASE_DELAYED`: Pagamento atrasado (temporário)
- ❌ `SUBSCRIPTION_CANCELLATION`: Cancelamento

## 🔄 Gerenciamento Automático

### Eventos de Webhook

O sistema automaticamente:

```typescript
// PURCHASE_APPROVED → ATIVAR
await prisma.user.update({
  where: { email: buyer.email },
  data: {
    isActive: true,
    subscriptionStatus: "ACTIVE",
    subscriptionEndDate: nextChargeDate
  }
});

// SUBSCRIPTION_CANCELLATION → BLOQUEAR
await prisma.user.update({
  where: { email: subscriber.email },
  data: {
    isActive: false,
    subscriptionStatus: "CANCELLED"
  }
});
```

### Jobs Cron

```typescript
// Verificação diária às 03:00
cron.schedule("0 3 * * *", async () => {
  // Marca como inativo se:
  // - subscriptionEndDate expirado
  // - status de cancelamento
  await prisma.user.updateMany({
    where: {
      subscriptionEndDate: { lt: now },
      isActive: true
    },
    data: { isActive: false }
  });
  
  // Reativa se pagou após expiração
  await prisma.user.updateMany({
    where: {
      subscriptionStatus: "ACTIVE",
      subscriptionEndDate: { gte: now },
      isActive: false
    },
    data: { isActive: true }
  });
});

// Verificação de atrasos a cada 6h
cron.schedule("0 */6 * * *", async () => {
  await prisma.user.updateMany({
    where: {
      subscriptionStatus: { in: ["DELAYED", "OVERDUE"] },
      isActive: true
    },
    data: { isActive: false }
  });
});
```

## 🧪 Cenários de Teste

### Cenário 1: Login com Conta Ativa

```bash
POST /api/session
{
  "email": "ativo@exemplo.com",
  "password": "senha123"
}

# Usuário tem:
# - isActive: true
# - subscriptionStatus: "ACTIVE"
# - subscriptionEndDate: "2025-12-31"

✅ Resposta: 200 OK
✅ Retorna: token, user
```

### Cenário 2: Login com Conta Inativa

```bash
POST /api/session
{
  "email": "inativo@exemplo.com",
  "password": "senha123"
}

# Usuário tem:
# - isActive: false
# - subscriptionStatus: "CANCELLED"

❌ Resposta: 403 Forbidden
❌ Erro: "Conta inativa. Verifique o status da sua assinatura."
```

### Cenário 3: Navegação com Conta Inativa

```bash
GET /api/instances
Authorization: Bearer valid_token_but_account_inactive

# Token válido, mas conta inativa

❌ Resposta: 403 Forbidden
❌ Erro: "Conta inativa. Verifique o status da sua assinatura."
```

## 📋 Checklist de Implementação

- [x] Verificação no login
- [x] Verificação no middleware
- [x] Jobs cron de verificação diária
- [x] Jobs cron de verificação de atrasos
- [x] Webhooks alteram status automaticamente
- [x] Logging detalhado
- [x] Mensagens de erro descritivas
- [x] Reativação automática
- [x] Validação em múltiplas camadas

## 🎯 Benefícios

1. **Segurança**: Bloqueio proativo de acesso não autorizado
2. **Automático**: Sem intervenção manual necessária
3. **Tempo Real**: Status atualizado via webhooks
4. **Audiência**: Logs completos de tentativas
5. **Experiência**: Mensagens claras para o usuário
6. **Resiliência**: Múltiplas camadas de verificação

## 📊 Monitoramento

### Logs a Observar

```bash
# Login bloqueado
[Tentativa de login de conta inativa: usuario@email.com]

# Acesso bloqueado  
[Tentativa de acesso com conta inativa: usuario@email.com (Status: CANCELLED)]

# Usuário suspenso
[Usuário suspenso: usuario@email.com - Status: EXPIRED]

# Usuário reativado
[Usuário reativado: usuario@email.com]
```

### Métricas

- Total de logins bloqueados (por status)
- Total de acessos bloqueados
- Usuários suspensos automaticamente
- Usuários reativados
- Status de assinaturas (distribuição)

## 🚨 Tratamento de Erros

### Casos Especiais

1. **Conta de Admin**:
   - Admins não são afetados por `isActive`
   - Mantêm acesso independente de status de pagamento

2. **Assinatura Gratuita**:
   - Plano `free` pode manter `isActive = true` permanente
   - Webhooks não alteram status

3. **Trial**:
   - Usuários em trial mantêm `isActive = true`
   - Bloqueados após `trialEndDate` se não pagarem

## ✅ Conformidade

### Requisitos Atendidos

- ✅ Usuários bloqueados se `isActive = false`
- ✅ Status atualizado por webhooks
- ✅ Verificação no login
- ✅ Verificação na navegação
- ✅ Jobs automáticos
- ✅ Logging detalhado
- ✅ Mensagens claras

---

**Implementado com 🔒 seguindo princípios de segurança em camadas**

