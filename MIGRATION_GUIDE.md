# 📋 Guia de Migração - Sistema de Assinaturas

## ⚠️ IMPORTANTE: Execute na ordem

### 1️⃣ Backup do Banco de Dados

Antes de qualquer coisa, faça backup:

```bash
# PostgreSQL
pg_dump -U usuario -d whatleads > backup_pre_subscription_$(date +%Y%m%d).sql

# Ou se estiver usando Docker
docker exec seu_postgres_container pg_dump -U usuario whatleads > backup.sql
```

### 2️⃣ Atualizar o Schema Prisma

O arquivo `prisma/schema.prisma` já foi atualizado com os novos campos no model `Payment`. Verifique se as alterações estão corretas:

```prisma
model Payment {
  id              String   @id @default(uuid())
  stripePaymentId String?  @unique // ← Agora opcional
  paymentMethod   String   @default("pix") // ← Novo
  pixCode         String?  // ← Novo
  pixQRCode       String?  // ← Novo
  // ... outros campos novos
}
```

### 3️⃣ Criar a Migração

```bash
cd saasapi
npx prisma migrate dev --name add_subscription_system
```

Se aparecer um aviso sobre perda de dados, revise cuidadosamente. O campo `stripePaymentId` foi alterado de obrigatório para opcional.

### 4️⃣ Gerar o Cliente Prisma

```bash
npx prisma generate
```

### 5️⃣ Verificar a Migração

Confirme que a migração foi aplicada:

```bash
npx prisma migrate status
```

Deve mostrar:

```
✅ Database schema is up to date!
```

### 6️⃣ Configurar Variáveis de Ambiente

Copie o arquivo de exemplo:

```bash
cp .env.subscription.example .env
```

Configure as variáveis obrigatórias:

```env
# Evolution API (para notificações WhatsApp)
API_EVO_URL=https://sua-evolution-api.com
EVO_API_KEY=sua-api-key
NOTIFICATION_INSTANCE=nome-da-instancia

# Frontend URL
FRONTEND_URL=https://seu-frontend.com
```

### 7️⃣ Instalar Dependências (se necessário)

As dependências já devem estar instaladas, mas verifique:

```bash
npm install
```

Dependências usadas:

- `date-fns` - Manipulação de datas
- `node-cron` - Agendamento de tarefas
- Todas já estavam no `package.json`

### 8️⃣ Compilar o Projeto

```bash
npm run build
```

### 9️⃣ Executar Testes

```bash
# Teste básico do sistema
npx ts-node scripts/test-subscription.ts
```

### 🔟 Iniciar o Servidor

```bash
# Desenvolvimento
npm run dev

# Produção
npm start
```

Você deve ver nos logs:

```
⏰ [CRON] Job de verificação de assinaturas agendado (diariamente às 02:00)
⏰ [CRON] Job de lembretes de pagamento agendado (diariamente às 09:00)
⏰ [CRON] Job de geração de cobranças agendado (diariamente às 01:00)
⏰ [CRON] Job de geração mensal de cobranças agendado (dia 1 de cada mês às 03:00)
🚀 [CRON] Todos os jobs de assinatura foram inicializados!
```

## 🔄 Migração de Dados Existentes

Se você já tem pagamentos no banco com `stripePaymentId` obrigatório:

```sql
-- Atualizar pagamentos existentes para adicionar paymentMethod
UPDATE whatlead_payments
SET "paymentMethod" = 'stripe'
WHERE "stripePaymentId" IS NOT NULL;

UPDATE whatlead_payments
SET "paymentMethod" = 'pix'
WHERE "stripePaymentId" IS NULL;
```

## 🧹 Limpeza de Dados de Teste

Após testar, limpe os dados de teste:

```sql
-- Remover pagamentos de teste
DELETE FROM whatlead_payments
WHERE metadata::jsonb @> '{"test": true}';
```

## ✅ Checklist de Migração

- [ ] Backup do banco de dados realizado
- [ ] Schema Prisma atualizado
- [ ] Migração criada e aplicada (`prisma migrate dev`)
- [ ] Cliente Prisma gerado (`prisma generate`)
- [ ] Variáveis de ambiente configuradas
- [ ] Projeto compilado sem erros
- [ ] Script de teste executado com sucesso
- [ ] Servidor iniciado e cron jobs ativados
- [ ] Notificações WhatsApp testadas
- [ ] Frontend integrado (SubscriptionGuard, hook, página Billing)

## 🚨 Rollback (se necessário)

Se algo der errado, você pode reverter:

```bash
# Reverter última migração
npx prisma migrate resolve --rolled-back [migration-name]

# Restaurar backup
psql -U usuario -d whatleads < backup_pre_subscription_YYYYMMDD.sql
```

## 📊 Verificação Pós-Migração

Execute estas verificações:

### 1. Verificar Schema do Banco

```sql
-- Verificar campos da tabela Payment
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'whatlead_payments';
```

Deve mostrar os novos campos:

- `paymentMethod`
- `pixCode`
- `pixQRCode`
- `paidAt`
- `confirmedBy`
- `notificationSent`
- `remindersSent`
- `lastReminderAt`

### 2. Testar API

```bash
# Testar endpoint de assinatura
curl http://localhost:9000/api/subscription/me \
  -H "Authorization: Bearer SEU_TOKEN"

# Testar estatísticas
curl http://localhost:9000/api/subscription/admin/statistics \
  -H "Authorization: Bearer SEU_TOKEN"
```

### 3. Verificar Logs

Procure por mensagens de erro nos logs do servidor. Os cron jobs devem ser inicializados sem erros.

## 🆘 Problemas Comuns

### ❌ Erro: "Migration failed with exit code 1"

**Causa:** Conflito no banco de dados ou schema inválido.

**Solução:**

```bash
# Resetar migrations (CUIDADO: apaga dados)
npx prisma migrate reset

# Ou aplicar força (não recomendado para produção)
npx prisma db push --accept-data-loss
```

### ❌ Erro: "stripePaymentId is required"

**Causa:** Schema antigo ainda em cache.

**Solução:**

```bash
npx prisma generate --force
npm run build
```

### ❌ Erro: "Module not found"

**Causa:** Dependências não instaladas ou build não executado.

**Solução:**

```bash
npm install
npm run build
```

## 📈 Monitoramento

Após a migração, monitore:

1. **Logs do servidor** - Procure por erros `[CRON]`
2. **Banco de dados** - Verifique se pagamentos estão sendo criados
3. **WhatsApp** - Confirme se notificações estão sendo enviadas
4. **Performance** - Monitore uso de CPU/memória

## 🎯 Próximos Passos

Após a migração bem-sucedida:

1. ✅ Testar fluxo completo de pagamento
2. ✅ Configurar alertas de monitoramento
3. ✅ Documentar processos internos para equipe
4. ✅ Treinar equipe no painel administrativo
5. ✅ Estabelecer SLA para confirmação de pagamentos

---

**⚠️ Lembre-se:** Sempre teste em ambiente de staging antes de aplicar em produção!
