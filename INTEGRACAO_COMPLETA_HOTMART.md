# Integração Completa - Webhooks Hotmart + Criação Automática de Usuários

## 📋 Resumo Executivo

Implementação completa e funcional da integração com webhooks de assinaturas da Hotmart, incluindo **criação automática de usuários** nas duas plataformas quando um pagamento é confirmado.

## 🎯 Funcionalidades Implementadas

### 1. Webhooks de Assinaturas (4 Eventos)
- ✅ **SWITCH_PLAN**: Troca de plano de assinatura
- ✅ **SUBSCRIPTION_CANCELLATION**: Cancelamento de assinatura
- ✅ **UPDATE_SUBSCRIPTION_CHARGE_DATE**: Alteração de dia de cobrança
- ✅ **PURCHASE_OUT_OF_SHOPPING_CART**: Abandono de carrinho (lead generation)

### 2. Criação Automática de Usuários ⭐ **NOVO**

**Quando**: Evento `PURCHASE_APPROVED` recebido

**O que acontece**:
1. ✅ Verifica se usuário existe (por email)
2. ✅ Se não existe, cria automaticamente em **duas plataformas**:
   - SaaSAPI (WhatLead) - banco PostgreSQL
   - Evo AI - plataforma de IA
3. ✅ Gera senha aleatória segura (32 caracteres hexadecimal)
4. ✅ Envia email de boas-vindas com credenciais
5. ✅ Define plano automaticamente baseado no produto Hotmart
6. ✅ Ativa conta imediatamente
7. ✅ Registra transação completa no banco

**Integração**: Usa `createIntegratedUser` (mesma rota `/api/users/register-integrated`)

## 🔧 Arquitetura

### Arquivos Criados/Modificados

```
✅ src/types/hotmart-subscription.types.ts          - Novos tipos e schemas
✅ src/services/hotmart-subscription.service.ts     - Lógica de assinaturas
✅ src/controllers/hotmart-subscription.controller.ts - Controller de webhooks
✅ src/middlewares/hotmart-webhook.middleware.ts    - Validação HOTTOK
✅ src/routes/hotmart-subscription.routes.ts        - Rotas + Swagger
✅ src/controllers/hotmart.controller.ts            - MODIFICADO: Integração createIntegratedUser
✅ src/services/integrated-user.service.ts          - MODIFICADO: Retorna senha temporária
✅ src/server.ts                                     - MODIFICADO: Rotas registradas
```

### Diagrama de Fluxo

```
Webhook Hotmart
    ↓
Validação HOTTOK
    ↓
HotmartSubscriptionController
    ↓
HotmartSubscriptionService
    ↓
    ├─ SWITCH_PLAN ──→ Handler ──→ Atualiza plano
    ├─ CANCELLATION ──→ Handler ──→ Cancela assinatura  
    ├─ CHARGE_DATE ──→ Handler ──→ Atualiza data
    └─ CART_ABANDONMENT ──→ Handler ──→ Registra lead

PURCHASE_APPROVED (HotmartController)
    ↓
createOrUpdateCustomer
    ↓
    ├─ Usuário NÃO existe?
    │     ↓
    │  createIntegratedUser ⭐
    │     ↓
    │  1. Gera senha aleatória
    │  2. Cria em SaaSAPI
    │  3. Cria em Evo AI
    │  4. Envia email boas-vindas
    │  5. Retorna token + user
    │     ↓
    │  Atualiza campos Hotmart
    │     ↓
    │  Registra transação
    │
    └─ Usuário JÁ existe?
          ↓
       Atualiza dados
          ↓
       Registra transação
```

## 🔐 Segurança

### Autenticação de Webhooks

Todos os webhooks validam o header `X-HOTMART-HOTTOK`:

```typescript
const receivedToken = req.headers["x-hotmart-hottok"];
const expectedToken = process.env.HOTMART_WEBHOOK_HOTTOK;

if (receivedToken !== expectedToken) {
  return res.status(401).json({ error: "Unauthorized" });
}
```

### Geração de Senha

Senhas aleatórias seguras (32 caracteres):

```typescript
const temporaryPassword = crypto.randomBytes(16).toString("hex");
// Exemplo: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
```

## 📊 Mapeamento de Planos

```typescript
"Whatlead - Disparos"      → "PREMIUM"
"Whatlead - Básico"        → "BASIC"
"Whatlead - Pro"           → "PRO"
"Whatlead - Enterprise"    → "ENTERPRISE"
```

## 📧 Email de Boas-Vindas

Template enviado via `welcomeService.sendWelcomeMessage()`:

```
Assunto: Bem-vindo à WhatLead!

Olá {nome},

Sua conta foi criada com sucesso!

Login: {email}
Senha: {senha_gerada_automaticamente}

Instruções:
1. Acesse: https://plataforma.whatlead.com.br
2. Faça login com as credenciais acima
3. Complete seu perfil
4. Comece a usar a plataforma

Atenciosamente,
Equipe WhatLead
```

## 🛠️ Configuração

### Variáveis de Ambiente

```bash
# Obrigatório
HOTMART_WEBHOOK_HOTTOK="seu_token_hotmart"

# Opcional (para integração Evo AI)
EVO_AI_BASE_URL="http://localhost:8000"

# Outras
DATABASE_URL="postgresql://..."
JWT_SECRET="..."
```

### Configuração na Hotmart

**Webhook Principal**:
- URL: `https://seu-dominio.com/api/hotmart/webhook/user`
- Eventos: PURCHASE_COMPLETE, PURCHASE_APPROVED, etc.

**Webhook de Assinaturas**:
- URL: `https://seu-dominio.com/api/hotmart/subscriptions/webhook`
- Eventos: SWITCH_PLAN, SUBSCRIPTION_CANCELLATION, UPDATE_SUBSCRIPTION_CHARGE_DATE, PURCHASE_OUT_OF_SHOPPING_CART
- Versão: 2.0.0

## 📝 Exemplo de Uso

### Webhook de Pagamento Aprovado

```bash
POST /api/hotmart/webhook/user
Headers:
  X-HOTMART-HOTTOK: seu_token
  Content-Type: application/json

Body:
{
  "id": "event-uuid",
  "event": "PURCHASE_APPROVED",
  "data": {
    "buyer": {
      "name": "Maria Silva",
      "email": "maria@email.com",
      "checkout_phone": "+5511999999999"
    },
    "product": {
      "id": 123456,
      "name": "Whatlead - Disparos"
    },
    "purchase": {
      "status": "APPROVED",
      "transaction": "HP17715690036014"
    }
  }
}
```

### Resultado Automático

```
1. ✅ Busca usuário: maria@email.com → NÃO ENCONTRADO
2. ✅ Gera senha: "8f3a9b2c1d4e5f6..."
3. ✅ Cria em SaaSAPI: SUCCESS
4. ✅ Cria em Evo AI: SUCCESS  
5. ✅ Envia email: SUCCESS
6. ✅ Define plano: PREMIUM
7. ✅ Ativa conta: true
8. ✅ Registra transação: SUCCESS

Resposta:
{
  "success": true,
  "message": "Webhook processado com sucesso",
  "event": "PURCHASE_APPROVED"
}
```

## 🧪 Testes

### Health Check

```bash
curl http://localhost:9000/api/hotmart/subscriptions/health

Response:
{
  "status": "ok",
  "service": "HotmartSubscriptionService",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Webhook de Teste

```bash
curl -X POST http://localhost:9000/api/hotmart/subscriptions/webhook \
  -H "Content-Type: application/json" \
  -H "X-HOTMART-HOTTOK: seu_token" \
  -d '{
    "id": "test-uuid",
    "creation_date": 1632411406874,
    "event": "SWITCH_PLAN",
    "version": "2.0.0",
    "data": {
      "switch_plan_date": 1629926054000,
      "subscription": {
        "subscriber": {
          "code": "ABC123",
          "email": "test@example.com"
        },
        "status": "ACTIVE"
      },
      "plans": [
        {"id": 1, "name": "Whatlead - Básico", "current": false},
        {"id": 2, "name": "Whatlead - Pro", "current": true}
      ]
    }
  }'
```

## 📚 Documentação

### Swagger UI
Acesse: `http://localhost:9000/doc`

Documentação completa de todos os endpoints com exemplos.

### Documentação Adicional

- `HOTMART_SUBSCRIPTION_INTEGRATION.md` - Guia completo de integração
- `HOTMART_ENV_SETUP.md` - Setup de variáveis de ambiente
- `IMPLEMENTACAO_HOTMART_RESUMO.md` - Resumo da implementação

## ✅ Validações Implementadas

### Type Safety
- ✅ Schemas Zod para todos os eventos
- ✅ Validação em runtime
- ✅ TypeScript strict mode
- ✅ Interfaces TypeScript completas

### Tratamento de Erros
- ✅ Logging estruturado
- ✅ Mensagens de erro descritivas
- ✅ Retorno HTTP 200 sempre (evita reenvios)
- ✅ Fallback para criação simples
- ✅ Transações atômicas

### Segurança
- ✅ Validação HOTTOK
- ✅ Senhas geradas criptograficamente
- ✅ Bcrypt para hash
- ✅ Validação de email
- ✅ SQL injection (Prisma protege)
- ✅ XSS (sanitização automática)

## 🎁 Funcionalidades Bonus

### Fallback Inteligente

Se `createIntegratedUser` falhar (ex: Evo AI offline), o sistema:

1. ⚠️ Registra erro no log
2. ✅ Cria usuário apenas na SaaSAPI
3. ✅ Mantém dados Hotmart
4. ✅ Usuário pode acessar parcialmente
5. ✅ Integração com Evo AI pode ser feita depois

### Idempotência

Webhooks podem ser reprocessados sem criar duplicatas:

```typescript
// Verifica se usuário existe
const existingUser = await prisma.user.findUnique({
  where: { email: buyer.email }
});

if (existingUser) {
  // Atualiza ao invés de criar
  user = await prisma.user.update({...});
}
```

## 📈 Logs e Monitoramento

### Logs Estruturados

```typescript
hotmartLogger.info("Usuário integrado criado", {
  email: "usuario@email.com",
  userId: "uuid",
  plan: "PREMIUM",
  evoAiUserId: "uuid-evo"
});
```

### Campos Registrados

- ✅ Email do comprador
- ✅ Nome do comprador
- ✅ Plano ativado
- ✅ Data/hora do evento
- ✅ ID da transação
- ✅ Subscriber code
- ✅ Status da operação
- ✅ Erros (se houver)

## 🚀 Deploy

### Pré-requisitos

```bash
# 1. Banco de dados
DATABASE_URL configurado

# 2. Variáveis de ambiente
HOTMART_WEBHOOK_HOTTOK configurado

# 3. Evo AI (opcional mas recomendado)
EVO_AI_BASE_URL configurado

# 4. Email (opcional mas recomendado)
# Configurado para envio de boas-vindas
```

### Passos de Deploy

```bash
# 1. Compilar
npm run build

# 2. Verificar migrações
npx prisma migrate deploy

# 3. Iniciar servidor
npm start

# 4. Verificar health check
curl http://localhost:9000/api/hotmart/subscriptions/health
```

## 🎉 Conclusão

### O que Foi Implementado

✅ **Webhooks completos** de assinaturas Hotmart
✅ **Criação automática** de usuários em duas plataformas
✅ **Email de boas-vindas** com credenciais
✅ **Senhas seguras** geradas automaticamente
✅ **Mapeamento de planos** automático
✅ **Validação robusta** com Zod
✅ **Tratamento de erros** completo
✅ **Segurança** (HOTTOK, bcrypt, etc)
✅ **Logging estruturado** para auditoria
✅ **Documentação completa** (Swagger + MD)
✅ **Fallback inteligente** para resiliência
✅ **Idempotência** para reprocessamento seguro

### Status

🟢 **PRONTO PARA PRODUÇÃO**

Após:
1. Configurar `HOTMART_WEBHOOK_HOTTOK`
2. Testar webhooks em ambiente de staging
3. Verificar integração com Evo AI
4. Validar emails de boas-vindas

### Suporte

- Logs: `logs/` (rotacionados diariamente)
- Swagger: `http://localhost:9000/doc`
- Health Check: `/api/hotmart/subscriptions/health`
- Documentação: `HOTMART_SUBSCRIPTION_INTEGRATION.md`

---

**Implementado com ❤️ seguindo padrões SOLID, código limpo e type-safety**

