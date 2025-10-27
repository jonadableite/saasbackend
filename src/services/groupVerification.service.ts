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
      return state === 'open' || state === 'connecting';
    } catch (error) {
      console.error(`❌ Erro ao verificar status da instância ${instanceId}:`, error);
      return false;
    }
  }

  /**
   * Obtém o número de telefone associado à instância
   */
  private async getInstancePhoneNumber(instanceId: string): Promise<string | null> {
    try {
      const response = await axios.get(
        `${this.apiUrl}/instance/fetchInstances`,
        {
          headers: {
            apikey: this.apiKey,
            "Content-Type": "application/json",
          },
        }
      );

      const instances = response.data;
      const instance = instances.find((inst: any) => inst.instanceName === instanceId);
      
      if (instance && instance.owner) {
        // Remove @s.whatsapp.net se presente
        return instance.owner.replace('@s.whatsapp.net', '');
      }

      return null;
    } catch (error) {
      console.error(`❌ Erro ao obter número da instância ${instanceId}:`, error);
      return null;
    }
  }

  /**
   * Adiciona uma instância ao grupo padrão
   */
  async addInstanceToGroup(instanceId: string): Promise<boolean> {
    try {
      // 1. Verificar se a instância está conectada
      console.log(`🔍 Verificando status da instância ${instanceId}...`);
      const isConnected = await this.isInstanceConnected(instanceId);
      
      if (!isConnected) {
        console.error(`❌ Instância ${instanceId} não está conectada. Status necessário: 'open' ou 'connecting'`);
        return false;
      }

      console.log(`✅ Instância ${instanceId} está conectada`);

      // 2. Obter o número de telefone da instância
      const phoneNumber = await this.getInstancePhoneNumber(instanceId);
      
      if (!phoneNumber) {
        console.error(`❌ Não foi possível obter o número de telefone da instância ${instanceId}`);
        return false;
      }

      console.log(`📱 Número da instância ${instanceId}: ${phoneNumber}`);

      // 3. Tentar adicionar usando updateParticipant (método mais direto)
      try {
        console.log(`🔄 Tentando adicionar ${instanceId} (${phoneNumber}) ao grupo usando updateParticipant...`);
        
        const response = await axios.post(
          `${this.apiUrl}/group/updateParticipant/${ADMIN_INSTANCE}`,
          {
            action: "add",
            participants: [phoneNumber],
          },
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

        if (response.status === 200 || response.status === 201) {
          console.log(`✅ Instância ${instanceId} adicionada ao grupo com sucesso via updateParticipant`);
          return true;
        }
      } catch (updateError: any) {
        console.log(`⚠️ Falha no updateParticipant para ${instanceId}:`, updateError.response?.data?.message || updateError.message);
        
        // 4. Fallback: tentar via invite
        console.log(`🔄 Tentando método alternativo via invite para ${instanceId}...`);
        
        try {
          const inviteResponse = await axios.post(
            `${this.apiUrl}/group/sendInvite/${ADMIN_INSTANCE}`,
            {
              groupJid: DEFAULT_GROUP_ID,
              description: "Link para entrar no grupo de aquecimento da WhatLead:",
              numbers: [phoneNumber],
            },
            {
              headers: {
                apikey: this.apiKey,
                "Content-Type": "application/json",
              },
            }
          );

          if (inviteResponse.status === 200 || inviteResponse.status === 201) {
            console.log(`✅ Convite enviado para ${instanceId} (${phoneNumber})`);
            
            // Aguardar um pouco para processamento
            await new Promise((resolve) => setTimeout(resolve, 3000));
            
            // Verificar se a instância entrou no grupo
            const inGroup = await this.isInstanceInGroup(instanceId);
            if (inGroup) {
              console.log(`✅ Instância ${instanceId} entrou no grupo via convite`);
              return true;
            } else {
              console.log(`⚠️ Convite enviado, mas ${instanceId} ainda não entrou no grupo`);
              return false;
            }
          }
        } catch (inviteError: any) {
          console.error(`❌ Falha no envio de convite para ${instanceId}:`, inviteError.response?.data?.message || inviteError.message);
        }
      }

      return false;
    } catch (error: any) {
      console.error(`❌ Erro geral ao adicionar instância ${instanceId} ao grupo:`, error.message);
      return false;
    }
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
