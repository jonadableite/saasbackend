# Correção: Erro 502 no Webhook Hotmart

## 🐛 Problema Identificado

Webhook retornando **502 Bad Gateway** na URL:
```
POST https://aquecerapi.whatlead.com.br/api/hotmart/webhook/user
```

## ✅ Correções Aplicadas

### 1. Middleware de Validação HOTTOK ❗ **CRÍTICO**

**Arquivo**: `src/routes/hotmart.routes.ts`

**Problema**: A rota `/api/hotmart/webhook/user` **NÃO tinha** middleware de validação do HOTTOK.

**Correção**:
```typescript
// ANTES
import { authMiddleware } from "../middlewares/authenticate";

router.post("/webhook/user", hotmartController.handleWebhook);

// DEPOIS
import { validateHotmartWebhook } from "../middlewares/hotmart-webhook.middleware";

router.post("/webhook/user", validateHotmartWebhook, hotmartController.handleWebhook);
```

### 2. Variável de Ambiente HOTMART_WEBHOOK_HOTTOK ❗ **CRÍTICO**

**Problema**: A variável `HOTMART_WEBHOOK_HOTTOK` não estava configurada no `.env`.

**Correção**: Adicionar no `.env`:
```env
HOTMART_WEBHOOK_HOTTOK="Xc5G6TCcgSnrJkK7sV9ODil6Pbdqnpd177896e-6abe-4eed-85fa-e46c42a9f253"
```

⚠️ **IMPORTANTE**: Edite o arquivo `.env` manualmente, pois o Git Bash no Windows trunca linhas longas.

Ver instruções completas: `HOTMART_ENV_CONFIG.md`

### 3. Estrutura do Webhook

O webhook recebido é do tipo **PURCHASE_PROTEST** (evento de compra), não de assinatura.

**URLs Corretas**:
- ✅ `POST /api/hotmart/webhook/user` - Eventos de COMPRAS (PURCHASE_*)
- ✅ `POST /api/hotmart/subscriptions/webhook` - Eventos de ASSINATURAS (SWITCH_PLAN, etc.)

## 🔍 Análise do Erro 502

O erro 502 geralmente indica:

1. **Token HOTTOK ausente ou inválido**
   - Verificar se `HOTMART_WEBHOOK_HOTTOK` está no `.env`
   - Verificar se o token enviado no header `X-HOTMART-HOTTOK` corresponde

2. **Middleware não configurado**
   - ⚠️ **CORRIGIDO**: Adicionado `validateHotmartWebhook` na rota

3. **Servidor não iniciado ou travado**
   - Reiniciar o servidor: `npm start`

## 🧪 Teste Local

### Com cURL:

```bash
curl -X POST http://localhost:9000/api/hotmart/webhook/user \
  -H "Content-Type: application/json" \
  -H "X-HOTMART-HOTTOK: Xc5G6TCcgSnrJkK7sV9ODil6Pbdqnpd177896e-6abe-4eed-85fa-e46c42a9f253" \
  -d '{
    "id": "test-uuid",
    "event": "PURCHASE_PROTEST",
    "version": "2.0.0",
    "data": {
      "purchase": {
        "transaction": "HP123456789",
        "status": "DISPUTE"
      },
      "buyer": {
        "email": "teste@example.com"
      }
    }
  }'
```

**Resposta Esperada**:
```json
{
  "success": true,
  "message": "Webhook processado com sucesso",
  "event": "PURCHASE_PROTEST"
}
```

## 📋 Checklist de Verificação

- [x] Middleware `validateHotmartWebhook` adicionado na rota
- [ ] Variável `HOTMART_WEBHOOK_HOTTOK` adicionada no `.env` (FAZER MANUALMENTE)
- [ ] Servidor reiniciado após atualizar `.env`
- [ ] Teste local funcionando
- [ ] Webhook em produção funcionando

## 🚀 Próximos Passos

1. **Editar `.env` manualmente**:
   ```bash
   nano .env  # ou qualquer editor
   ```

2. **Adicionar linha**:
   ```env
   HOTMART_WEBHOOK_HOTTOK="Xc5G6TCcgSnrJkK7sV9ODil6Pbdqnpd177896e-6abe-4eed-85fa-e46c42a9f253"
   ```

3. **Reiniciar servidor**:
   ```bash
   npm start
   ```

4. **Testar webhook**:
   ```bash
   curl -X POST http://localhost:9000/api/hotmart/webhook/user \
     -H "X-HOTMART-HOTTOK: Xc5G6TCcgSnrJkK7sV9ODil6Pbdqnpd177896e-6abe-4eed-85fa-e46c42a9f253" \
     -H "Content-Type: application/json" \
     -d @test-webhook.json
   ```

## 📚 Documentação Relacionada

- `HOTMART_ENV_CONFIG.md` - Configuração de variáveis
- `HOTMART_SUBSCRIPTION_INTEGRATION.md` - Integração completa
- `PROTECAO_ACESSO_HOTMART.md` - Proteção de acesso

## 🔐 Segurança

O middleware `validateHotmartWebhook` garante que:

1. ✅ O header `X-HOTMART-HOTTOK` seja fornecido
2. ✅ O token corresponda ao configurado em `.env`
3. ✅ Requisições não autorizadas sejam bloqueadas (401)
4. ✅ Logs detalhados sejam gerados para auditoria

## 📝 Eventos Suportados

### Eventos de Compras (via `/api/hotmart/webhook/user`)
- ✅ PURCHASE_COMPLETE
- ✅ PURCHASE_APPROVED
- ✅ PURCHASE_CANCELED
- ✅ PURCHASE_BILLED
- ✅ PURCHASE_REFUNDED
- ✅ PURCHASE_CHARGEBACK
- ✅ PURCHASE_DELAYED
- ✅ **PURCHASE_PROTEST** (o que você recebeu)
- ✅ PURCHASE_EXPIRED

### Eventos de Assinaturas (via `/api/hotmart/subscriptions/webhook`)
- ✅ SWITCH_PLAN
- ✅ SUBSCRIPTION_CANCELLATION
- ✅ UPDATE_SUBSCRIPTION_CHARGE_DATE
- ✅ PURCHASE_OUT_OF_SHOPPING_CART

---

**Status**: 🟡 Aguardando configuração manual do `.env`

