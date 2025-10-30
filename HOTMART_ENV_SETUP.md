# Configuração de Variáveis de Ambiente - Hotmart

## Variáveis Obrigatórias

Adicione as seguintes variáveis ao seu arquivo `.env`:

```bash
# Hotmart Webhook Token
# Obtenha este token nas configurações da sua conta Hotmart:
# Hotmart > Configurações > Webhooks > Configuração de Webhook
HOTMART_WEBHOOK_HOTTOK="seu_token_hotmart_hottok_aqui"
```

## Variáveis Opcionais

Para funcionalidades avançadas de integração com a API da Hotmart:

```bash
# Hotmart API Credentials
HOTMART_CLIENT_ID="seu_client_id"
HOTMART_CLIENT_SECRET="seu_client_secret"
HOTMART_ACCESS_TOKEN="token_de_acesso_temporario"
HOTMART_API_URL="https://developers.hotmart.com/payments/api/v1"
```

## Como Obter o HOTTOK

1. Acesse sua conta Hotmart
2. Vá em **Configurações** > **Integrações** > **Webhooks**
3. Crie uma nova configuração de webhook
4. Copie o token **HOTTOK** gerado
5. Adicione ao arquivo `.env`

## Exemplo de Arquivo .env Completo

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/whatlead_db?schema=public"

# JWT
JWT_SECRET="your_jwt_secret_key_here"

# Hotmart
HOTMART_CLIENT_ID="your_hotmart_client_id"
HOTMART_CLIENT_SECRET="your_hotmart_client_secret"
HOTMART_ACCESS_TOKEN="your_hotmart_access_token"
HOTMART_API_URL="https://developers.hotmart.com/payments/api/v1"
HOTMART_WEBHOOK_HOTTOK="seu_token_hotmart_hottok_aqui"

# Redis
REDIS_URL="redis://localhost:6379"

# MinIO
MINIO_ENDPOINT="localhost"
MINIO_PORT="9000"
MINIO_USE_SSL="false"
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"
MINIO_SERVER_URL="http://localhost:9000"

# Server
PORT=9000
NODE_ENV="development"
```

## Configuração na Hotmart

### Webhook de Assinaturas

Na plataforma Hotmart, configure:

- **URL do Webhook**: `https://seu-dominio.com/api/hotmart/subscriptions/webhook`
- **Eventos**: 
  - ✅ SWITCH_PLAN
  - ✅ SUBSCRIPTION_CANCELLATION
  - ✅ UPDATE_SUBSCRIPTION_CHARGE_DATE
  - ✅ PURCHASE_OUT_OF_SHOPPING_CART
- **Versão**: 2.0.0
- **Método**: POST
- **Formato**: JSON

## Validação

Após configurar, valide a integração:

```bash
# Health check
curl http://localhost:9000/api/hotmart/subscriptions/health

# Resposta esperada:
# {
#   "status": "ok",
#   "service": "HotmartSubscriptionService",
#   "timestamp": "2024-01-01T00:00:00.000Z"
# }
```

## Segurança

⚠️ **IMPORTANTE**: 
- Nunca commite o arquivo `.env` no repositório
- O HOTTOK é sensível e deve ser tratado como senha
- Use variáveis de ambiente diferentes para produção e desenvolvimento
- Implemente rotação de tokens periodicamente

## Troubleshooting

### Erro 401: Unauthorized

**Sintoma**: Webhooks retornam erro 401

**Causa**: HOTTOK inválido ou não configurado

**Solução**: 
1. Verifique se a variável `HOTMART_WEBHOOK_HOTTOK` está configurada
2. Confirme que o token é o mesmo registrado na Hotmart
3. Reinicie o servidor após alterar variáveis de ambiente

### Webhooks não estão chegando

**Sintoma**: Nenhum webhook é recebido

**Causa**: URL incorreta ou rede bloqueada

**Solução**:
1. Verifique se a URL está acessível publicamente
2. Teste com webhook de teste da Hotmart
3. Verifique logs de firewall/security groups
4. Confirme que o endpoint está em ambiente de produção (HTTPS)

### Eventos não estão sendo processados

**Sintoma**: Webhooks chegam mas não processam

**Causa**: Dados inválidos ou erro no service

**Solução**:
1. Verifique logs: `logs/hotmart-subscription.log`
2. Confirme que o usuário existe no banco de dados
3. Valide o formato do payload com a documentação
4. Teste com payload de exemplo da documentação

## Monitoramento

Recomendamos monitorar:

1. **Taxa de recepção**: % de webhooks recebidos com sucesso
2. **Tempo de processamento**: Latência média de resposta
3. **Taxa de erro**: % de webhooks que falham
4. **Eventos por tipo**: Distribuição de tipos de eventos

## Documentação Adicional

- [Documentação Hotmart Webhooks](https://developers.hotmart.com/docs/pt-BR/1.0.0/webhook/about-webhook/)
- [Guia de Integração](./HOTMART_SUBSCRIPTION_INTEGRATION.md)
- [API Reference](./docs/api-reference.md)

