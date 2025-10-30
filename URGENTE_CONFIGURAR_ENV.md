# ⚠️ URGENTE: Configurar .env Manualmente

## 🔴 Problema Crítico

O arquivo `.env` está **malformado** porque o Git Bash no Windows trunca linhas longas.

## ✅ SOLUÇÃO: Editar Manualmente

### 1. Abra o arquivo `.env` em um editor de texto (VS Code, Notepad++, etc.)

### 2. Procure pela seção "# Hotmart API Credentials"

### 3. **SUBSTITUA** estas linhas:

**❌ ERRADO** (linhas concatenadas):
```env
HOTMART_BASIC="Basic ZWY0YzY2OWYtMmM1Yy00NmVlLWI4YTUtNDgwYzRkNGQ3OGQzOmIxYWMwNjdjLTJmMGMtNDBiYi04ZjA2LTNkOTM5MDIyNTgxNg=="HOTMART_WEBHOOK_HOTTOK="Xc5G6TCcgSnrJkK7sV9ODil6Pbdqnpd177896e-6abe-4eed-85fa-e46c42a9f253"
```

**✅ CORRETO** (linhas separadas):
```env
HOTMART_BASIC="Basic ZWY0YzY2OWYtMmM1Yy00NmVlLWI4YTUtNDgwYzRkNGQ3OGQzOmIxYWMwNjdjLTJmMGMtNDBiYi04ZjA2LTNkOTM5MDIyNTgxNg=="

# Hotmart Webhook Configuration
HOTMART_WEBHOOK_HOTTOK="Xc5G6TCcgSnrJkK7sV9ODil6Pbdqnpd177896e-6abe-4eed-85fa-e46c42a9f253"
```

### 4. Salve o arquivo

### 5. Reinicie o servidor:

```bash
# Parar servidor (Ctrl+C)
npm start
```

## 🧪 Teste Rapido

Após reiniciar, teste:

```bash
grep "HOTMART_WEBHOOK_HOTTOK" .env
```

**DEVE MOSTRAR**:
```
HOTMART_WEBHOOK_HOTTOK="Xc5G6TCcgSnrJkK7sV9ODil6Pbdqnpd177896e-6abe-4eed-85fa-e46c42a9f253"
```

**NÃO DEVE** estar truncado.

## 📝 Conteúdo Completo da Seção Hotmart

Certifique-se que sua seção Hotmart está assim:

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

## ⚠️ IMPORTANTE

- **NÃO** use Git Bash para editar `.env` (ele trunca linhas)
- **USE** VS Code ou outro editor de texto apropriado
- **VERIFIQUE** que cada variável está em uma linha separada
- **REINICIE** o servidor após mudanças

## 🎯 Por que isso é crítico?

Se `HOTMART_WEBHOOK_HOTTOK` estiver truncado:
- ❌ Webhooks retornarão 401 Unauthorized
- ❌ O servidor não aceitará requisições da Hotmart
- ❌ Nenhum evento será processado

