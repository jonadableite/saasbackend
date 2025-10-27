// src/services/groupVerification.service.ts
import axios from "axios";
import {
  DEFAULT_GROUP_ID,
  WHATLEAD_WARMUP_GROUP_INVITE_CODE,
  ADMIN_INSTANCE,
} from "../constants/externalNumbers";

interface GroupParticipant {
  id: string;
  admin?: string;
}

interface GroupInfo {
  id: string;
  subject: string;
  participants: GroupParticipant[];
}

export class GroupVerificationService {
  private apiUrl: string;
  private apiKey: string;

  constructor() {
    this.apiUrl = process.env.API_EVO_URL || "";
    this.apiKey = process.env.EVO_API_KEY || "";
  }

  /**
   * Verifica se uma instância está presente no grupo padrão
   */
  async isInstanceInGroup(instanceId: string): Promise<boolean> {
    try {
      const participants = await this.getGroupParticipants(instanceId);
      const instanceNumber = this.extractInstanceNumber(instanceId);

      return participants.some((participant) =>
        participant.id.includes(instanceNumber)
      );
    } catch (error) {
      console.error(
        `Erro ao verificar se instância ${instanceId} está no grupo:`,
        error
      );
      return false;
    }
  }

  /**
   * Obtém os participantes do grupo padrão
   */
  private async getGroupParticipants(
    instanceId: string
  ): Promise<GroupParticipant[]> {
    try {
      const response = await axios.get(
        `${this.apiUrl}/group/participants/${instanceId}`,
        {
          headers: {
            apikey: this.apiKey,
            "Content-Type": "application/json",
          },
          params: {
            groupJid: DEFAULT_GROUP_ID,
          },
        }
      );

      return response.data.participants || [];
    } catch (error) {
      console.error(
        `Erro ao obter participantes do grupo para instância ${instanceId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Envia o invite link para uma instância entrar no grupo
   */
  async sendInviteToInstance(instanceId: string): Promise<boolean> {
    try {
      // Usa a instância admin para enviar o invite
      const response = await axios.post(
        `${this.apiUrl}/group/sendInvite/${ADMIN_INSTANCE}`,
        {
          groupJid: DEFAULT_GROUP_ID,
          description: "Link para entrar no grupo de aquecimento da WhatLead:",
          numbers: [this.extractInstanceNumber(instanceId)],
        },
        {
          headers: {
            apikey: this.apiKey,
            "Content-Type": "application/json",
          },
        }
      );

      console.log(`✅ Invite enviado para instância ${instanceId}`);
      return response.status === 200 || response.status === 201;
    } catch (error) {
      console.error(
        `❌ Erro ao enviar invite para instância ${instanceId}:`,
        error
      );
      return false;
    }
  }

  /**
   * Adiciona uma instância ao grupo usando invite link
   */
  async joinGroupWithInvite(instanceId: string): Promise<boolean> {
    try {
      // Aceita o invite usando a API da Evolution
      const response = await axios.get(
        `${this.apiUrl}/group/inviteInfo/${instanceId}`,
        {
          headers: {
            apikey: this.apiKey,
            "Content-Type": "application/json",
          },
          params: {
            inviteCode: WHATLEAD_WARMUP_GROUP_INVITE_CODE,
          },
        }
      );

      console.log(`✅ Instância ${instanceId} entrou no grupo usando invite`);

      // Depois de verificar o invite, aceitar com o link
      const acceptResponse = await axios.post(
        `${this.apiUrl}/group/joinGroup/${instanceId}`,
        {
          groupJid: response.data.groupJid || DEFAULT_GROUP_ID,
        },
        {
          headers: {
            apikey: this.apiKey,
            "Content-Type": "application/json",
          },
        }
      );

      return acceptResponse.status === 200 || acceptResponse.status === 201;
    } catch (error) {
      console.error(
        `❌ Erro ao fazer instância ${instanceId} entrar no grupo:`,
        error
      );
      return false;
    }
  }

  /**
   * Verifica se uma instância está conectada
   */
  private async isInstanceConnected(instanceId: string): Promise<boolean> {
    try {
      const response = await axios.get(
        `${this.apiUrl}/instance/connectionState/${instanceId}`,
        {
          headers: {
            apikey: this.apiKey,
            "Content-Type": "application/json",
          },
        }
      );

      const state = response.data?.instance?.state;
      return state === "open" || state === "connecting";
    } catch (error) {
      console.error(
        `❌ Erro ao verificar status da instância ${instanceId}:`,
        error
      );
      return false;
    }
  }

  /**
   * Obtém o número de telefone associado à instância
   */
  private async getInstancePhoneNumber(
    instanceId: string
  ): Promise<string | null> {
    try {
      // Primeiro, tentar obter informações específicas da instância
      console.log(`🔍 Buscando informações da instância ${instanceId}...`);

      const response = await axios.get(
        `${this.apiUrl}/instance/fetchInstances`,
        {
          headers: {
            apikey: this.apiKey,
            "Content-Type": "application/json",
          },
        }
      );

      console.log(
        `📋 Total de instâncias encontradas: ${response.data.length}`
      );

      const instances = response.data;
      const instance = instances.find(
        (inst: any) =>
          inst.name === instanceId ||
          inst.instanceName === instanceId ||
          inst.instance?.instanceName === instanceId
      );

      if (instance) {
        console.log(`📱 Instância ${instanceId} encontrada:`, {
          name: instance.name,
          ownerJid: instance.ownerJid,
          connectionStatus: instance.connectionStatus,
        });

        // Priorizar ownerJid que é o campo correto
        if (instance.ownerJid) {
          const cleanNumber = instance.ownerJid
            .replace("@s.whatsapp.net", "")
            .replace("@c.us", "");
          console.log(
            `✅ Número encontrado via ownerJid para ${instanceId}: ${cleanNumber}`
          );
          return cleanNumber;
        }

        // Tentar outros campos como fallback
        const possiblePhoneFields = [
          instance.owner,
          instance.instance?.owner,
          instance.phoneNumber,
          instance.number,
          instance.wuid,
          instance.instance?.wuid,
          instance.connectionStatus?.number,
          instance.instance?.connectionStatus?.number,
        ];

        for (const field of possiblePhoneFields) {
          if (field && typeof field === "string") {
            const cleanNumber = field
              .replace("@s.whatsapp.net", "")
              .replace("@c.us", "");
            console.log(
              `✅ Número encontrado via campo alternativo para ${instanceId}: ${cleanNumber}`
            );
            return cleanNumber;
          }
        }
      } else {
        console.log(
          `⚠️ Instância ${instanceId} não encontrada na lista de instâncias`
        );

        // Listar instâncias disponíveis para debug
        const availableInstances = instances
          .map((inst: any) => inst.name || inst.instanceName)
          .filter(Boolean);
        console.log(
          `📋 Instâncias disponíveis: ${availableInstances.join(", ")}`
        );
      }

      // Se não encontrou na lista geral, tentar endpoint específico da instância
      try {
        console.log(`🔍 Tentando endpoint específico para ${instanceId}...`);
        const instanceResponse = await axios.get(
          `${this.apiUrl}/instance/connectionState/${instanceId}`,
          {
            headers: {
              apikey: this.apiKey,
              "Content-Type": "application/json",
            },
          }
        );

        console.log(
          `📋 Resposta connectionState:`,
          JSON.stringify(instanceResponse.data, null, 2)
        );

        const instanceData = instanceResponse.data?.instance;
        if (instanceData) {
          const possibleFields = [
            instanceData.owner,
            instanceData.ownerJid,
            instanceData.wuid,
            instanceData.number,
            instanceData.phoneNumber,
          ];

          for (const field of possibleFields) {
            if (field && typeof field === "string") {
              const cleanNumber = field
                .replace("@s.whatsapp.net", "")
                .replace("@c.us", "");
              console.log(
                `✅ Número encontrado via connectionState para ${instanceId}: ${cleanNumber}`
              );
              return cleanNumber;
            }
          }
        }
      } catch (connectionError) {
        console.log(
          `⚠️ Erro ao buscar connectionState para ${instanceId}:`,
          connectionError.message
        );
      }

      console.error(
        `❌ Não foi possível encontrar número de telefone para ${instanceId}`
      );
      return null;
    } catch (error) {
      console.error(
        `❌ Erro ao obter número da instância ${instanceId}:`,
        error
      );
      return null;
    }
  }

  /**
   * Adiciona uma instância ao grupo padrão
   */
  async addInstanceToGroup(instanceId: string): Promise<boolean> {
    try {
      console.log(`🔍 Verificando status da instância ${instanceId}...`);

      // Verificar se a instância está conectada
      const isConnected = await this.isInstanceConnected(instanceId);
      if (!isConnected) {
        console.error(`❌ Instância ${instanceId} não está conectada`);
        return false;
      }

      console.log(`✅ Instância ${instanceId} está conectada`);

      // Tentar adicionar a instância ao grupo usando múltiplas estratégias
      const addSuccess = await this.addWithFallback(
        instanceId,
        DEFAULT_GROUP_ID
      );

      if (!addSuccess) {
        throw new Error(
          `A instância ${instanceId} não está no grupo e não foi possível adicioná-la automaticamente. Verifique se a instância está conectada e tente novamente.`
        );
      }

      console.log(
        `✅ Instância ${instanceId} foi adicionada ao grupo com sucesso`
      );
      return true;
    } catch (error) {
      console.error(
        `❌ Erro ao adicionar instância ${instanceId} ao grupo:`,
        error
      );
      return false;
    }
  }

  /**
   * Método auxiliar para tentar adicionar instância ao grupo com fallback
   */
  private async addWithFallback(
    instanceId: string,
    identifier: string
  ): Promise<boolean> {
    // Estratégia 1: Tentar updateParticipant primeiro (método mais direto)
    try {
      console.log(
        `🔄 Tentativa 1: Adicionando ${instanceId} via updateParticipant usando ${identifier}...`
      );

      const updateResponse = await axios.post(
        `${this.apiUrl}/group/updateParticipant/${ADMIN_INSTANCE}`,
        {
          groupJid: DEFAULT_GROUP_ID,
          action: "add",
          participants: [identifier],
        },
        {
          headers: {
            apikey: this.apiKey,
            "Content-Type": "application/json",
          },
        }
      );

      if (updateResponse.status === 200 || updateResponse.status === 201) {
        console.log(
          `✅ Instância ${instanceId} adicionada com sucesso via updateParticipant`
        );
        return true;
      }
    } catch (updateError) {
      console.log(
        `⚠️ Falha na tentativa updateParticipant para ${instanceId}:`,
        updateError.response?.status,
        updateError.response?.data?.message || updateError.message
      );

      // Se o erro for 400, pode ser que a instância já esteja no grupo
      if (updateError.response?.status === 400) {
        const errorMessage = updateError.response?.data?.message || "";
        if (
          errorMessage.includes("already") ||
          errorMessage.includes("já") ||
          errorMessage.includes("participant")
        ) {
          console.log(`ℹ️ Instância ${instanceId} pode já estar no grupo`);
          return true; // Considerar como sucesso se já estiver no grupo
        }
      }
    }

    // Estratégia 2: Tentar sendInvite como fallback
    try {
      console.log(
        `🔄 Tentativa 2: Enviando convite para ${instanceId} usando ${identifier}...`
      );

      const inviteResponse = await axios.post(
        `${this.apiUrl}/group/sendInvite/${instanceId}`,
        {
          groupJid: DEFAULT_GROUP_ID,
          numbers: [identifier],
        },
        {
          headers: {
            apikey: this.apiKey,
            "Content-Type": "application/json",
          },
        }
      );

      if (inviteResponse.status === 200 || inviteResponse.status === 201) {
        console.log(`✅ Convite enviado com sucesso para ${instanceId}`);

        // Aguardar um pouco antes de tentar fazer join
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Tentar fazer join no grupo
        const joinSuccess = await this.joinGroupWithInvite(instanceId);
        if (joinSuccess) {
          console.log(`✅ Instância ${instanceId} entrou no grupo com sucesso`);
          return true;
        } else {
          console.log(
            `⚠️ Convite enviado mas instância ${instanceId} não conseguiu entrar no grupo`
          );
        }
      }
    } catch (inviteError) {
      console.log(
        `⚠️ Falha na tentativa sendInvite para ${instanceId}:`,
        inviteError.response?.status,
        inviteError.response?.data?.message || inviteError.message
      );

      // Se o erro for relacionado a já estar no grupo, considerar sucesso
      if (inviteError.response?.status === 400) {
        const errorMessage = inviteError.response?.data?.message || "";
        if (
          errorMessage.includes("already") ||
          errorMessage.includes("já") ||
          errorMessage.includes("participant")
        ) {
          console.log(
            `ℹ️ Instância ${instanceId} pode já estar no grupo via sendInvite`
          );
          return true;
        }
      }
    }

    console.error(
      `❌ Todas as tentativas falharam para adicionar ${instanceId} ao grupo`
    );
    return false;
  }

  /**
   * Verifica e adiciona múltiplas instâncias ao grupo se necessário
   */
  async verifyAndAddInstancesToGroup(instanceIds: string[]): Promise<{
    verified: string[];
    added: string[];
    failed: string[];
  }> {
    const result = {
      verified: [] as string[],
      added: [] as string[],
      failed: [] as string[],
    };

    for (const instanceId of instanceIds) {
      try {
        const isInGroup = await this.isInstanceInGroup(instanceId);

        if (isInGroup) {
          result.verified.push(instanceId);
          console.log(`Instância ${instanceId} já está no grupo`);
        } else {
          const added = await this.addInstanceToGroup(instanceId);
          if (added) {
            result.added.push(instanceId);
            console.log(`Instância ${instanceId} foi adicionada ao grupo`);
          } else {
            result.failed.push(instanceId);
            console.log(`Falha ao adicionar instância ${instanceId} ao grupo`);
          }
        }
      } catch (error) {
        result.failed.push(instanceId);
        console.error(`Erro ao processar instância ${instanceId}:`, error);
      }
    }

    return result;
  }

  /**
   * Extrai o número da instância do instanceId
   * Assume que o instanceId contém o número do WhatsApp
   */
  private extractInstanceNumber(instanceId: string): string {
    // Se o instanceId já é um número, retorna como está
    if (/^\d+$/.test(instanceId)) {
      return instanceId;
    }

    // Tenta extrair números do instanceId
    const numbers = instanceId.match(/\d+/g);
    if (numbers && numbers.length > 0) {
      // Pega o maior número encontrado (provavelmente o número do WhatsApp)
      return numbers.reduce((a, b) => (a.length > b.length ? a : b));
    }

    // Se não conseguir extrair, retorna o instanceId original
    return instanceId;
  }

  /**
   * Obtém informações do grupo padrão
   */
  async getGroupInfo(instanceId: string): Promise<GroupInfo | null> {
    try {
      const response = await axios.get(
        `${this.apiUrl}/group/findGroupInfos/${instanceId}`,
        {
          headers: {
            apikey: this.apiKey,
            "Content-Type": "application/json",
          },
          params: {
            groupJid: DEFAULT_GROUP_ID,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error(
        `Erro ao obter informações do grupo para instância ${instanceId}:`,
        error
      );
      return null;
    }
  }
}

export const groupVerificationService = new GroupVerificationService();
