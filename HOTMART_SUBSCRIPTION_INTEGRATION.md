# Integração de Webhooks de Assinaturas Hotmart

## Visão Geral

Esta integração implementa um sistema completo para processar webhooks de assinaturas da Hotmart seguindo os padrões SOLID, código limpo, type-safety e tratamento adequado de erros.

## Arquitetura

### Estrutura de Arquivos

```
saasapi/src/
├── types/
│   └── hotmart-subscription.types.ts          # Tipos e schemas Zod
├── services/
│   └── hotmart-subscription.service.ts        # Lógica de negócio
├── controllers/
│   └── hotmart-subscription.controller.ts     # Controllers HTTP
├── middlewares/
│   └── hotmart-webhook.middleware.ts          # Validação de webhooks
└── routes/
    └── hotmart-subscription.routes.ts         # Rotas e documentação Swagger
```

## Principios SOLID Implementados

### Single Responsibility Principle (SRP)
- **HotmartSubscriptionService**: Responsável apenas pela lógica de negócio de assinaturas
- **HotmartSubscriptionController**: Responsável apenas pelo tratamento de requisições HTTP
- **Middleware**: Responsável apenas pela validação de autenticação

### Open/Closed Principle (OCP)
- Service extensível para novos tipos de eventos sem modificar código existente
- Uso de Strategy Pattern através de handlers específicos por evento

### Liskov Substitution Principle (LSP)
- Interfaces consistentes entre diferentes handlers de eventos

### Interface Segregation Principle (ISP)
- Tipos específicos para cada evento de webhook
- Sem dependências desnecessárias entre módulos

### Dependency Inversion Principle (DIP)
- Service depende de abstrações (PrismaClient) ao invés de implementações concretas
- Facilita testes e manutenção

## Segurança

### Autenticação

Todos os webhooks são validados através do header `X-HOTMART-HOTTOK`:

```typescript
// Middleware de validação
export const validateHotmartWebhook = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const receivedToken = req.headers["x-hotmart-hottok"];
  const expectedToken = process.env.HOTMART_WEBHOOK_HOTTOK;
  
  if (receivedToken !== expectedToken) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  
  next();
};
```

**Configuração Necessária**:
```bash
# .env
HOTMART_WEBHOOK_HOTTOK=seu_token_hotmart_aqui
```

## Funcionalidades Principais

### Criação Automática de Usuários

**IMPORTANTE**: Quando um pagamento é aprovado (`PURCHASE_APPROVED`), o sistema:

1. ✅ Verifica se o usuário já existe
2. ✅ Se não existe, cria automaticamente nas **duas plataformas**:
   - SaaSAPI (WhatLead)
   - Evo AI
3. ✅ Envia email de boas-vindas com:
   - Email como login
   - Senha gerada automaticamente
   - Instruções de acesso
4. ✅ Define plano baseado no produto Hotmart
5. ✅ Ativa conta imediatamente
6. ✅ Registra transação completa

**Fluxo de Criação**:
```typescript
// Gera senha segura de 32 caracteres
const temporaryPassword = crypto.randomBytes(16).toString("hex");

// Cria usuário integrado
await createIntegratedUser({
  name: buyer.name,
  email: buyer.email,
  password: temporaryPassword,
  plan: "PREMIUM" // mapeado automaticamente
});
```

## Eventos Suportados

### 1. SWITCH_PLAN (Troca de Plano)

**Descrição**: Processa mudança de plano de assinatura

**Payload**:
```json
{
  "id": "uuid",
  "creation_date": 1633003064000,
  "event": "SWITCH_PLAN",
  "version": "2.0.0",
  "data": {
    "switch_plan_date": 1629926054000,
    "subscription": {
      "subscriber": {
        "code": "ABC123",
        "email": "cliente@email.com"
      },
      "status": "ACTIVE"
    },
    "plans": [
      {
        "id": 707635,
        "name": "Plano Antigo",
        "current": false
      },
      {
        "id": 631288,
        "name": "Plano Novo",
        "current": true
      }
    ]
  }
}
```

**Processamento**:
1. Busca usuário pelo email
2. Mapeia novo plano para plano do sistema
3. Atualiza registro do usuário
4. Registra transação

### Exemplo Real de Criação Automática

**Evento**: `PURCHASE_APPROVED`

**Payload**:
```json
{
  "id": "event-uuid",
  "event": "PURCHASE_APPROVED",
  "version": "1.0.0",
  "data": {
    "buyer": {
      "name": "João Silva",
      "email": "joao.silva@email.com",
      "checkout_phone": "+5511999999999"
    },
    "product": {
      "id": 123456,
      "name": "Whatlead - Disparos"
    },
    "purchase": {
      "status": "APPROVED",
      "transaction": "HP17715690036014",
      "price": {
        "value": 197.00
      }
    }
  }
}
```

**Resultado**:
1. ✅ Usuário criado em SaaSAPI e Evo AI
2. ✅ Email enviado: `joao.silva@email.com`
3. ✅ Login: `joao.silva@email.com`
4. ✅ Senha: `a1b2c3d4e5f6...` (gerada automaticamente)
5. ✅ Plano: `PREMIUM` (mapeado de "Whatlead - Disparos")
6. ✅ Conta ativa imediatamente
7. ✅ Pode acessar plataforma agora

### 2. SUBSCRIPTION_CANCELLATION (Cancelamento)

**Descrição**: Processa cancelamento de assinatura

**Payload**:
```json
{
  "id": "uuid",
  "creation_date": 1632411406874,
  "event": "SUBSCRIPTION_CANCELLATION",
  "version": "2.0.0",
  "data": {
    "cancellation_date": 1633410850832,
    "date_next_charge": 1580667200000,
    "subscriber": {
      "code": "QO4THU04",
      "name": "Cliente Nome",
      "email": "cliente@email.com"
    },
    "subscription": {
      "status": "CANCELED_BY_CUSTOMER"
    }
  }
}
```

**Processamento**:
1. Busca usuário pelo email
2. Atualiza status para inativo
3. Define data de término da assinatura
4. Registra transação

### 3. UPDATE_SUBSCRIPTION_CHARGE_DATE (Alteração de Dia de Cobrança)

**Descrição**: Processa mudança do dia de cobrança

**Payload**:
```json
{
  "id": "uuid",
  "creation_date": 1663951146081,
  "event": "UPDATE_SUBSCRIPTION_CHARGE_DATE",
  "version": "2.0.0",
  "data": {
    "subscriber": {
      "email": "cliente@email.com"
    },
    "subscription": {
      "old_charge_day": 7,
      "new_charge_day": 6,
      "date_next_charge": 1690927200000
    }
  }
}
```

**Processamento**:
1. Busca usuário pelo email
2. Atualiza data da próxima cobrança
3. Registra transação

### 4. PURCHASE_OUT_OF_SHOPPING_CART (Abandono de Carrinho)

**Descrição**: Processa abandono de carrinho (lead generation)

**Payload**:
```json
{
  "id": "uuid",
  "creation_date": 1632411406874,
  "event": "PURCHASE_OUT_OF_SHOPPING_CART",
  "version": "2.0.0",
  "data": {
    "product": {
      "id": 3526906,
      "name": "Produto"
    },
    "buyer": {
      "name": "Nome",
      "email": "email@email.com"
    }
  }
}
```

**Processamento**:
1. Registra dados do lead
2. Pode enviar para CRM externo
3. Armazena metadata do produto

## Tratamento de Erros

### Estratégia de Retry

**IMPORTANTE**: Todos os webhooks retornam HTTP 200, mesmo em caso de erro:

```typescript
// Controller sempre retorna 200
res.status(200).json({
  success: false,
  message: "Erro ao processar webhook, mas recebido com sucesso"
});
```

**Motivo**: A Hotmart reenvia webhooks se receber códigos de erro. Retornando 200, evitamos loops de reenvio.

### Logging Detalhado

Todos os eventos são registrados:

```typescript
controllerLogger.info("Webhook processado com sucesso", {
  event: result.event,
  userEmail: result.userEmail,
  subscriberCode: result.subscriberCode
});
```

### Validação com Zod

Todos os webhooks são validados antes do processamento:

```typescript
const validatedData = HotmartSubscriptionWebhookSchema.parse(rawData);
```

Erros de validação retornam mensagens detalhadas para debugging.

## Endpoints

### POST /api/hotmart/subscriptions/webhook

**Descrição**: Recebe webhooks de assinaturas

**Headers**:
- `X-HOTMART-HOTTOK`: Token de autenticação (obrigatório)
- `Content-Type`: application/json

**Resposta**:
```json
{
  "success": true,
  "message": "Webhook processado com sucesso",
  "event": "SWITCH_PLAN"
}
```

### GET /api/hotmart/subscriptions/health

**Descrição**: Health check do serviço

**Resposta**:
```json
{
  "status": "ok",
  "service": "HotmartSubscriptionService",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Documentação Swagger

A documentação completa está disponível em:
```
GET http://localhost:9000/doc
```

## Configuração

### Variáveis de Ambiente

```bash
# Obrigatório
HOTMART_WEBHOOK_HOTTOK=seu_token_hotmart

# Opcional (para autenticação com API)
HOTMART_CLIENT_ID=seu_client_id
HOTMART_CLIENT_SECRET=seu_client_secret
HOTMART_ACCESS_TOKEN=token_temporario
```

## Testes

### Webhook de Exemplo

Para testar a integração, você pode usar o seguinte payload:

```bash
curl -X POST http://localhost:9000/api/hotmart/subscriptions/webhook \
  -H "Content-Type: application/json" \
  -H "X-HOTMART-HOTTOK: seu_token_aqui" \
  -d '{
    "id": "test-uuid",
    "creation_date": 1632411406874,
    "event": "SWITCH_PLAN",
    "version": "2.0.0",
    "data": {
      "switch_plan_date": 1629926054000,
      "subscription": {
        "subscriber": {
          "code": "TEST123",
          "email": "test@example.com"
        },
        "status": "ACTIVE"
      },
      "plans": [
        {
          "id": 1,
          "name": "Whatlead - Básico",
          "current": false
        },
        {
          "id": 2,
          "name": "Whatlead - Pro",
          "current": true
        }
      ]
    }
  }'
```

## Mapeamento de Planos

O serviço mapeia automaticamente os planos da Hotmart para planos do sistema:

```typescript
const planMapping = {
  "Whatlead - Disparos": "PREMIUM",
  "Whatlead - Básico": "BASIC",
  "Whatlead - Pro": "PRO",
  "Whatlead - Enterprise": "ENTERPRISE"
};
```

## Monitoramento

### Métricas Recomendadas

1. **Taxa de Sucesso**: % de webhooks processados com sucesso
2. **Latência**: Tempo médio de processamento
3. **Erros por Tipo**: Classificação de erros
4. **Eventos por Tipo**: Volume de cada tipo de evento

### Logs

Os logs são estruturados com:
- Context (HotmartSubscriptionService, Controller, etc)
- Nível (info, warn, error)
- Timestamp
- Metadata relevante

## Próximos Passos

### Melhorias Futuras

1. **Idempotência**: Adicionar validação de eventos duplicados
2. **Rate Limiting**: Limitar processamento para evitar sobrecarga
3. **Retry Logic**: Implementar fila de retry para falhas temporárias
4. **Dashboard**: Criar interface para visualizar eventos processados
5. **Métricas**: Integrar com sistema de métricas (Prometheus, DataDog)

## Suporte

Para questões ou problemas:
1. Verificar logs em `logs/hotmart-subscription.log`
2. Validar configuração de variáveis de ambiente
3. Testar endpoint `/health` para verificar disponibilidade
4. Consultar documentação da Hotmart: https://developers.hotmart.com/docs/pt-BR/1.0.0/webhook/about-webhook/

## Changelog

### v1.0.0 (2024-01-01)
- Implementação inicial
- Suporte a 4 eventos de webhook
- Validação de segurança com HOTTOK
- Documentação Swagger completa
- Logging estruturado
- Tratamento robusto de erros

