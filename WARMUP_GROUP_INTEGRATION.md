# 🔥 Integração do Grupo de Aquecimento da WhatLead

## ✅ Implementações Realizadas

### 1. Verificação e Adição Automática de Instâncias ao Grupo

**Arquivo:** `src/services/groupVerification.service.ts`

#### Funcionalidades Adicionadas:

- ✅ Verifica se instâncias estão no grupo antes de iniciar o aquecimento
- ✅ Adiciona automaticamente instâncias ao grupo usando o invite link
- ✅ Usa a instância **"Whatleads"** como administradora para gerenciar o grupo
- ✅ Fallback para método alternativo caso o invite falhe

#### Métodos Implementados:

```typescript
// Envia invite link via admin
async sendInviteToInstance(instanceId: string): Promise<boolean>

// Faz instância entrar no grupo via invite code
async joinGroupWithInvite(instanceId: string): Promise<boolean>

// Método principal que chama os anteriores
async addInstanceToGroup(instanceId: string): Promise<boolean>
```

#### Link do Grupo:

- **URL:** https://chat.whatsapp.com/HzmH3QVhfDxC3Cw3IXrpuT
- **Invite Code:** `HzmH3QVhfDxC3Cw3IXrpuT`
- **Group JID:** `120363405399411287@g.us`
- **Nome:** 🔥AQUECIMENTO 💙WhatLead🔥
- **Membros:** 14
- **Descrição:** _Segue o canal_ 👇\nhttps://whatsapp.com/channel/0029Vb72kaO2975ElgrRRB0O\n\n*Grupo de Aquecimento WhatLead\*🔥\nAqueça seus números com segurança, troque interações no WhatsApp. 🚀\nMantenha o respeito, sem divulgações ou qualquer publicidade e aproveite para fazer parte do ecossistema WhatLead! 👇\nsite.whatlead.com.br 👈aquecimento automático e mais completo do mercado 💯% eficiente!

### 2. Texto Padrão nas Mensagens ao Grupo

**Arquivo:** `src/services/warmup.service.ts`

#### Funcionalidade Adicionada:

- ✅ **TODAS** as mensagens enviadas ao grupo incluem automaticamente:
  ```
  *Aquecendo com sistema AUTOMÁTICO da WhatLead site.whatlead.com.br*
  ```

#### Como Funciona:

1. Quando o aquecimento detecta que o destino é um **grupo** (`isGroup: true`)
2. O sistema adiciona o texto padrão automaticamente:
   - **Para textos:** Após o conteúdo original
   - **Para mídias (imagens/vídeos):** No campo `caption`

#### Exemplo de Mensagem Gerada:

```
{Conteúdo personalizado do usuário}

*Aquecendo com sistema AUTOMÁTICO da WhatLead site.whatlead.com.br*
```

### 3. Constantes Configuradas

**Arquivo:** `src/constants/externalNumbers.ts`

```typescript
// Grupo de Aquecimento da WhatLead
export const WHATLEAD_WARMUP_GROUP_INVITE =
  "https://chat.whatsapp.com/HzmH3QVhfDxC3Cw3IXrpuT";
export const WHATLEAD_WARMUP_GROUP_INVITE_CODE = "HzmH3QVhfDxC3Cw3IXrpuT";

// Texto padrão para aquecimento
export const WARMUP_DEFAULT_TEXT =
  "\n\n*Aquecendo com sistema AUTOMÁTICO da WhatLead site.whatlead.com.br*";

// Instância admin para gerenciar o grupo
export const ADMIN_INSTANCE = "Whatleads";
```

## 🔄 Fluxo de Funcionamento

### Quando o Aquecimento é Iniciado:

1. **Verificação de Grupo** (Automática)

   ```typescript
   // Em warmup.service.ts linha 139-183
   const groupVerificationResult =
     await groupVerificationService.verifyAndAddInstancesToGroup(instanceIds);
   ```

2. **Para cada instância:**

   - ✅ Verifica se já está no grupo
   - ✅ Se não estiver, a instância "Whatleads" envia invite
   - ✅ A instância aceita o invite automaticamente
   - ✅ Entra no grupo

3. **Durante o Aquecimento:**
   - Ao enviar mensagem para **grupo**: adiciona texto padrão
   - Ao enviar mensagem para **conversa privada**: sem texto padrão

### API da Evolution Utilizada:

```bash
# Enviar invite
POST https://evo.whatlead.com.br/group/sendInvite/Whatleads
{
  "groupJid": "120363405399411287@g.us",
  "description": "Link para entrar no grupo de aquecimento da WhatLead:",
  "numbers": ["5519987654321"]
}

# Verificar invite
GET https://evo.whatlead.com.br/group/inviteInfo/{instanceId}?inviteCode=HzmH3QVhfDxC3Cw3IXrpuT

# Entrar no grupo
POST https://evo.whatlead.com.br/group/joinGroup/{instanceId}
{
  "groupJid": "120363405399411287@g.us"
}
```

## 📝 Exemplo de Uso

### Frontend (Aquecimento.tsx)

```typescript
// Ao iniciar aquecimento
const payload: WarmupConfig = {
  phoneInstances: [
    {
      instanceId: "instancia-1",
      phoneNumber: "5519987654321",
      ownerJid: "5519987654321@s.whatsapp.net",
    },
    {
      instanceId: "instancia-2",
      phoneNumber: "5519876543210",
      ownerJid: "5519876543210@s.whatsapp.net",
    },
  ],
  contents: {
    texts: [
      "🔥 Tá cansado de perder chip? Chega junto!",
      "💬 Vem pro grupo de aquecimento!",
    ],
    images: [],
    audios: [],
    videos: [],
    stickers: [],
  },
  config: {
    maxMessagesPerDay: 20,
  },
};

await handleStartWarmup(payload);
```

### Backend Processamento

1. **Verificação Automática** (linha 139-183)

   ```typescript
   // Todas as instâncias são verificadas e adicionadas ao grupo
   // Usando a instância "Whatleads" como admin
   ```

2. **Durante Envio de Mensagens**

   ```typescript
   // Para grupo:
   const { isGroup } = getMessageDestination(config);

   // Quando isGroup = true:
   // Texto: "Conteúdo original" + WARMUP_DEFAULT_TEXT
   // Mídia: caption += WARMUP_DEFAULT_TEXT
   ```

## 🎯 Resultado Final

✅ **Todas as instâncias** que iniciam aquecimento são **automaticamente adicionadas** ao grupo  
✅ **Todas as mensagens** enviadas ao grupo incluem o texto padrão: `*Aquecendo com sistema AUTOMÁTICO da WhatLead site.whatlead.com.br*`  
✅ **Instância "Whatleads"** gerencia o grupo (enviar invites, adicionar membros)  
✅ **Fallback robusto** caso algum método falhe

## 🔍 Debugging

Os logs mostram o processo de verificação:

```bash
✅ Resultado da verificação do grupo:
  - verified: 5 (já estavam no grupo)
  - added: 2 (foram adicionadas)
  - failed: 0 (nenhum erro)
```

## ⚠️ Importante

A chave da API que estava no .env estava **incorreta**:

- ❌ **Errado:** `D6A4F8E34A2F41D2B9E8B52F63E3C8A1`
- ✅ **Correto:** `6A4F8E34A2F41D2B9E8B52F63E3C8A1`

**Atualize o `.env` e reinicie o servidor!**
