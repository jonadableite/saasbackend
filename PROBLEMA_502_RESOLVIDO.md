# Resolução: Erro 502 "NotFound" no Webhook Hotmart

## 🐛 Problema Original

- **URL**: `https://aquecerapi.whatlead.com.br/api/hotmart/webhook/user`
- **Evento**: `PURCHASE_PROTEST`
- **Erro**: `502 Bad Gateway` com resposta "NotFound"
- **Data**: 30/10/2025 17:01:04

## 🔍 Causa Raiz

### 1. Arquivo `.env` Malformado

O Git Bash no Windows **trunca linhas longas**, causando:

```env
# ERRADO (linhas concatenadas)
HOTMART_BASIC="..."HOTMART_WEBHOOK_HOTTOK="..."
```

Isso resultou em:

- ❌ Variável `HOTMART_WEBHOOK_HOTTOK` truncada/inválida
- ❌ Middleware `validateHotmartWebhook` rejeitando requisições
- ❌ Resposta 502 "NotFound"

### 2. Middleware Não Configurado (Já Corrigido)

**Status**: ✅ CORRIGIDO

Adicionado `validateHotmartWebhook` na rota:

```typescript
router.post(
  "/webhook/user",
  validateHotmartWebhook,
  hotmartController.handleWebhook
);
```

## ✅ Correções Aplicadas

### Correção 1: Middleware Configurado ✅

**Arquivo**: `src/routes/hotmart.routes.ts`

```diff
+ import { validateHotmartWebhook } from "../middlewares/hotmart-webhook.middleware";

  router.post(
    "/webhook/user",
+   validateHotmartWebhook,
    hotmartController.handleWebhook
  );
```

### Correção 2: Handler Implementado ✅

**Arquivo**: `src/controllers/hotmart.controller.ts`

```typescript
private async handlePurchaseProtest(data: HotmartWebhookData) {
  hotmartLogger.info("Processando PURCHASE_PROTEST");
  await this.createOrUpdateCustomer(data);
}
```

### Correção 3: Arquivo .env ⚠️ **AÇÃO REQUERIDA**

**Status**: ⚠️ REQUER INTERVENÇÃO MANUAL

O arquivo `.env` precisa ser editado manualmente em um editor apropriado (VS Code).

**Instruções**: Ver `URGENTE_CONFIGURAR_ENV.md`

## 🚀 Solução Completa

### Passo 1: Editar .env Manualmente

Abra `saasapi/.env` no VS Code e certifique-se que está assim:

```env
# Hotmart API Credentials
HOTMART_CLIENT_ID="ef4c669f-2c5c-46ee-b8a5-480c4d4d78d3"
HOTMART_CLIENT_SECRET="b1ac067c-2f0c-40bb-8f06-3d9390225816"
HOTMART_ACCESS_TOKEN="Xc5G6TCcgSnrJkK7sV9ODil6Pbdqnpd177896e-6abe-4eed-85fa-e46c42a9f253"
HOTMART_API_URL="https://developers.hotmart.com/payments/api/v1"
HOTMART_BASIC="Basic ZWY0YzY2OWYtMmM1Yy00NmVlLWI4YTUtNDgwYzRkNGQ3OGQzOmIxYWMwNjdjLTJmMGMtNDBiYi04ZjA2LTNkOTM5MDIyNTgxNg=="

# Hotmart Webhook Configuration
HOTMART_WEBHOOK_HOTTOK="Xc5G6TCcgSnrJkK7sV9ODil6Pbdqnpd177896e-6abe-4eed-85fa-e46c42a9f253"
```

**CRÍTICO**: Cada variável em uma linha separada!

### Passo 2: Reiniciar Servidor

```bash
# Parar servidor (Ctrl+C se estiver rodando)
npm start
```

### Passo 3: Verificar

```bash
grep "HOTMART_WEBHOOK_HOTTOK" .env
```

**Deveria retornar**:

```
HOTMART_WEBHOOK_HOTTOK="Xc5G6TCcgSnrJkK7sV9ODil6Pbdqnpd177896e-6abe-4eed-85fa-e46c42a9f253"
```

**NÃO deve estar truncado**.

## 🧪 Teste Local

Após configurar corretamente:

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
        "email": "teste@example.com",
        "name": "Teste"
      }
    }
  }'
```

**Resposta Esperada**: `200 OK`

## 📋 Checklist de Verificação

- [x] Middleware `validateHotmartWebhook` adicionado na rota
- [x] Handler `handlePurchaseProtest` implementado
- [ ] Arquivo `.env` editado manualmente no VS Code
- [ ] Variável `HOTMART_WEBHOOK_HOTTOK` completa (não truncada)
- [ ] Servidor reiniciado após editar `.env`
- [ ] Teste local passando
- [ ] Webhook em produção funcionando

## 🎯 Por que "NotFound"?

O middleware `validateHotmartWebhook` retorna:

1. **500** se `HOTMART_WEBHOOK_HOTTOK` não configurado:

   ```json
   {
     "error": "Server Configuration Error",
     "message": "Configuração do servidor inválida"
   }
   ```

2. **401** se token inválido:

   ```json
   {
     "error": "Unauthorized",
     "message": "Token de autenticação inválido"
   }
   ```

3. **"NotFound"** vem de um **proxy/gateway** (502) quando:
   - Servidor não responde
   - Rota não existe
   - Servidor crashou

## 🔐 Segurança Implementada

O middleware `validateHotmartWebhook` garante:

- ✅ Header `X-HOTMART-HOTTOK` obrigatório
- ✅ Token validado contra `.env`
- ✅ Logs de auditoria detalhados
- ✅ Bloqueio de requisições não autorizadas

## 📚 Documentação Relacionada

- `URGENTE_CONFIGURAR_ENV.md` - Configuração manual do .env
- `CORRECAO_WEBHOOK_HOTMART.md` - Correções técnicas
- `HOTMART_SUBSCRIPTION_INTEGRATION.md` - Integração completa

---

**Status**: 🟡 Aguardando edição manual do `.env`

Após editar e reiniciar, o webhook deve funcionar corretamente! 🎉
