# Configuração Hotmart - Variáveis de Ambiente

## ⚠️ IMPORTANTE: Atualizar .env Manualmente

O arquivo `.env` está no diretório `saasapi/`.

## 📝 Adicione as seguintes linhas no .env:

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

## 🔧 Passo a Passo

1. Abra o arquivo `.env` em um editor de texto
2. Procure pela seção `# Hotmart API Credentials`
3. Certifique-se de que TODAS as variáveis acima estão presentes
4. **Adicione a linha `HOTMART_WEBHOOK_HOTTOK`** se não existir
5. Salve o arquivo

## ✅ Verificação

Após atualizar, execute:

```bash
grep "HOTMART_WEBHOOK_HOTTOK" .env
```

Deveria retornar:

```
HOTMART_WEBHOOK_HOTTOK="Xc5G6TCcgSnrJkK7sV9ODil6Pbdqnpd177896e-6abe-4eed-85fa-e46c42a9f253"
```

## 🚨 Resolução de Problemas

### Linha Truncada

Se a linha estiver truncada (aparecendo apenas parte do token), adicione manualmente no editor.

### Servidor não Reconhece

Após atualizar o `.env`:

1. **Pare o servidor** (Ctrl+C)
2. **Inicie novamente**: `npm start`
3. O servidor recarrega as variáveis de ambiente

## 📚 Referências

- Documentação Hotmart: https://developers.hotmart.com/
- Webhooks: https://developers.hotmart.com/docs/pt-BR/1.0.0/webhook/
