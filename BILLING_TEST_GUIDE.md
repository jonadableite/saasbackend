# 🧪 Guia Completo de Testes - Sistema de Billing

## 📋 Pré-requisitos

- ✅ Backend rodando em `http://localhost:9000`
- ✅ Frontend rodando em `http://localhost:5173`
- ✅ Banco de dados PostgreSQL configurado
- ✅ User ID de teste: `ea3ed8ca-39e3-4941-a6cf-42da02d8ad4a`

## 🗄️ Preparação do Banco de Dados

### 1. Inserir Dados de Teste

Execute o script SQL localizado em `saasapi/scripts/insert-test-payment.sql`:

```bash
# Via linha de comando
psql -U seu_usuario -d seu_banco -f saasapi/scripts/insert-test-payment.sql

# Ou via ferramenta GUI (DBeaver, pgAdmin, etc.)
# Copie e execute o conteúdo do arquivo
```

### 2. Dados que Serão Criados

O script cria **3 pagamentos de teste**:

#### 📝 Pagamento 1: PENDENTE

```json
{
  "amount": 9900, // R$ 99,00
  "status": "pending",
  "dueDate": "+7 dias", // Vence em 7 dias
  "paymentMethod": "pix",
  "pixCode": "código pix completo",
  "pixQRCode": "base64 do QR Code"
}
```

#### ⚠️ Pagamento 2: VENCIDO

```json
{
  "amount": 9900,
  "status": "overdue",
  "dueDate": "-3 dias", // Vencido há 3 dias
  "paymentMethod": "pix",
  "remindersSent": 2
}
```

#### ✅ Pagamento 3: PAGO (Histórico)

```json
{
  "amount": 9900,
  "status": "completed",
  "dueDate": "-30 dias",
  "paidAt": "-28 dias",
  "paymentMethod": "pix"
}
```

### 3. Dados do Usuário Atualizados

```json
{
  "plan": "premium",
  "subscriptionStatus": "ACTIVE",
  "subscriptionEndDate": "+30 dias",
  "isActive": true
}
```

## 🧪 Testes de Frontend

### 1. Acesso à Página de Billing

#### Via Sidebar (Método 1)

```
1. Faça login na plataforma
2. Clique no seu perfil (parte inferior da sidebar)
3. Menu dropdown abrirá
4. Clique em "💰 Assinaturas"
5. Você será redirecionado para /billing
```

#### Via Menu Direto (Método 2)

```
1. Localize "Assinaturas" na sidebar
2. Clique no item do menu
3. Acesse /billing diretamente
```

#### Via URL Direta (Método 3)

```
1. Acesse: http://localhost:5173/billing
```

### 2. Validações Visuais

#### ✅ Stats Grid (5 Cards)

Verifique se aparecem:

- 🌟 **Plano Atual**: "PREMIUM"
- 🛡️ **Status**: "Ativa"
- 📅 **Válido Até**: Data +30 dias
- ⏰ **Dias Restantes**: ~30 dias
- 💰 **Total de Pagamentos**: 3

#### ✅ Card de Status da Assinatura

Verifique:

- 📊 3 sub-cards com informações
- 🎨 Background `bg-deep/80 backdrop-blur-xl`
- 🔲 Border `border-electric`
- ✨ Botão "Atualizar" funcional

#### ✅ Histórico de Pagamentos

Deve mostrar **3 pagamentos**:

**Pagamento 1 - PENDENTE:**

```
💳 R$ 99,00
📅 Vencimento: [data +7 dias]
🟡 Status: Pendente
🎯 Botão: "Pagar com Pix"
```

**Pagamento 2 - VENCIDO:**

```
💳 R$ 99,00
📅 Vencimento: [data -3 dias]
🔴 Status: Vencido
```

**Pagamento 3 - PAGO:**

```
💳 R$ 99,00
📅 Vencimento: [data -30 dias]
✅ Pago em: [data -28 dias]
🟢 Status: Pago
```

### 3. Teste do Dialog Pix

#### Passo a Passo:

```
1. Localize o pagamento PENDENTE
2. Clique no botão "Pagar com Pix"
3. Dialog abre com animação suave
4. Verifique:
   ✅ Valor: R$ 99,00
   ✅ Data de vencimento
   ✅ QR Code (placeholder)
   ✅ Código Pix (texto)
   ✅ Botão "Copiar" código
   ✅ Alert informativo
   ✅ Botão "Fechar"
5. Teste copiar o código Pix
6. Verifique se alert aparece: "✅ Código Pix copiado com sucesso!"
7. Feche o dialog
```

### 4. Teste de Alertas

#### Alerta de Pagamento Vencido:

Se houver pagamento vencido, deve aparecer:

```
🚨 Pagamento em Atraso
Você possui pagamentos pendentes. Regularize sua situação...
```

#### Alerta de Expiração Próxima:

Se faltar 7 dias ou menos:

```
⚠️ Atenção - Assinatura Expirando!
Sua assinatura expira em X dia(s)...
```

## 🔧 Testes de Backend

### 1. Teste de Endpoint - Get Subscription Info

```bash
# Via cURL
curl -X GET http://localhost:9000/api/subscription/me \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"

# Via Thunder Client / Postman
GET http://localhost:9000/api/subscription/me
Headers:
  Authorization: Bearer SEU_TOKEN_AQUI
```

**Resposta Esperada:**

```json
{
  "success": true,
  "data": {
    "userId": "ea3ed8ca-39e3-4941-a6cf-42da02d8ad4a",
    "plan": "premium",
    "status": "ACTIVE",
    "subscriptionEndDate": "2025-11-19T...",
    "isActive": true,
    "daysUntilExpiration": 30,
    "hasOverduePayment": true,
    "nextPaymentDate": "2025-10-26T..."
  }
}
```

### 2. Teste de Endpoint - Get Payment History

```bash
curl -X GET http://localhost:9000/api/subscription/payments \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

**Resposta Esperada:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-1",
      "amount": 9900,
      "currency": "BRL",
      "status": "pending",
      "dueDate": "2025-10-26T...",
      "paymentMethod": "pix",
      "pixCode": "00020126...",
      "pixQRCode": "data:image/png..."
    },
    {
      "id": "uuid-2",
      "amount": 9900,
      "status": "overdue",
      ...
    },
    {
      "id": "uuid-3",
      "amount": 9900,
      "status": "completed",
      ...
    }
  ]
}
```

### 3. Teste de Endpoint - Admin: Confirm Payment

```bash
# Confirmar pagamento (Admin apenas)
curl -X POST http://localhost:9000/api/subscription/payments/PAYMENT_ID/confirm \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"paidAt": "2025-10-19T00:00:00Z"}'
```

**Resposta Esperada:**

```json
{
  "success": true,
  "message": "Pagamento confirmado com sucesso",
  "data": {
    "id": "payment-id",
    "status": "completed",
    "paidAt": "2025-10-19T..."
  }
}
```

## 🎭 Testes de Animações

### 1. Stats Grid

- ✅ Cards aparecem com stagger (delay de 0.1s entre cada)
- ✅ Fade in + slide up
- ✅ Transição suave (600ms)

### 2. Card de Status

- ✅ Fade in ao carregar
- ✅ Sub-cards com hover effect
- ✅ Botão "Atualizar" funcional

### 3. Histórico de Pagamentos

- ✅ Items aparecem sequencialmente (delay 0.05s)
- ✅ Hover effect nos cards
- ✅ Border muda de cor no hover

### 4. Dialog Pix

- ✅ Backdrop blur ao abrir
- ✅ Modal escala de 0.95 para 1
- ✅ Fade in (opacity 0 → 1)
- ✅ Fecha com animação reversa

## 📊 Testes de Responsividade

### Mobile (< 768px)

```
1. Abra no DevTools modo mobile
2. Verifique:
   ✅ Stats Grid: 1 coluna
   ✅ Status Card: 1 coluna
   ✅ Pagamentos: Stack vertical
   ✅ Dialog Pix: Full width
   ✅ Textos legíveis
```

### Tablet (768px - 1024px)

```
✅ Stats Grid: 2 colunas
✅ Status Card: 2 colunas
✅ Layout confortável
```

### Desktop (> 1024px)

```
✅ Stats Grid: 5 colunas
✅ Status Card: 3 colunas
✅ Layout completo
```

## 🐛 Testes de Erro

### 1. Sem Autenticação

```
1. Remova o token
2. Tente acessar /billing
3. Deve: Redirecionar para /login
```

### 2. Token Inválido

```
1. Use token expirado
2. Tente acessar /billing
3. Deve: Mostrar erro 401
```

### 3. Sem Pagamentos

```sql
-- Remover todos os pagamentos do user
DELETE FROM whatlead_payments
WHERE "userId" = 'ea3ed8ca-39e3-4941-a6cf-42da02d8ad4a';
```

**Esperado:**

- Mensagem: "Nenhum pagamento encontrado"
- Ícone: CreditCard cinza
- Texto secundário informativo

### 4. Assinatura Expirada

```sql
-- Expirar assinatura
UPDATE whatlead_users
SET
  "subscriptionStatus" = 'EXPIRED',
  "subscriptionEndDate" = NOW() - INTERVAL '1 day',
  "isActive" = false
WHERE id = 'ea3ed8ca-39e3-4941-a6cf-42da02d8ad4a';
```

**Esperado:**

- Stats mostram status "Expirada"
- Dias restantes: "Expirado"
- Alerta vermelho de expiração

## ✅ Checklist Final de Testes

### Frontend

- [ ] Página carrega sem erros
- [ ] 5 stats cards aparecem corretamente
- [ ] Card de status com 3 sub-cards
- [ ] Histórico mostra 3 pagamentos
- [ ] Botão "Pagar com Pix" funciona
- [ ] Dialog Pix abre/fecha corretamente
- [ ] Código Pix pode ser copiado
- [ ] Alertas aparecem quando necessário
- [ ] Animações funcionam suavemente
- [ ] Responsivo em mobile/tablet/desktop

### Backend

- [ ] GET /api/subscription/me retorna dados
- [ ] GET /api/subscription/payments retorna lista
- [ ] POST /api/subscription/payments cria pagamento (admin)
- [ ] POST /api/subscription/payments/:id/confirm confirma (admin)
- [ ] Autenticação está funcionando
- [ ] Dados do Prisma estão corretos

### Integrações

- [ ] Menu dropdown do usuário funciona
- [ ] Navegação para /billing funciona
- [ ] Link na sidebar funciona
- [ ] Estados são atualizados corretamente
- [ ] Loading states funcionam

### UX/Design

- [ ] Cores consistentes com plataforma
- [ ] Tipografia adequada
- [ ] Espaçamentos corretos
- [ ] Ícones apropriados
- [ ] Feedback visual claro

## 🔧 Comandos Úteis

### Verificar Dados no Banco

```sql
-- Ver todos os pagamentos do usuário
SELECT * FROM whatlead_payments
WHERE "userId" = 'ea3ed8ca-39e3-4941-a6cf-42da02d8ad4a';

-- Ver dados do usuário
SELECT * FROM whatlead_users
WHERE id = 'ea3ed8ca-39e3-4941-a6cf-42da02d8ad4a';
```

### Resetar Dados de Teste

```sql
-- Limpar pagamentos
DELETE FROM whatlead_payments
WHERE "userId" = 'ea3ed8ca-39e3-4941-a6cf-42da02d8ad4a';

-- Reexecutar script de teste
-- (Execute novamente: insert-test-payment.sql)
```

## 📝 Relatório de Bugs

Se encontrar problemas, documente:

1. **Descrição**: O que aconteceu
2. **Passos**: Como reproduzir
3. **Esperado**: O que deveria acontecer
4. **Atual**: O que está acontecendo
5. **Logs**: Console/Network/Backend logs
6. **Ambiente**: Browser, OS, versão

---

**Boa sorte nos testes! 🚀**
**Data: Outubro 2025**
