// src/controllers/warmup.controller.ts
import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { warmupService } from "../services/warmup.service";
import type { MediaContent, WarmupConfig } from "../types/warmup";
import { PLAN_LIMITS } from "../constants/planLimits";

interface TextContent {
  text: string;
}

// src/controllers/warmup.controller.ts

export const configureWarmup = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const config = req.body;
    const userId = (req as any).user?.id;

    console.log("Iniciando configuração de aquecimento:", {
      userId,
      instancesCount: config.phoneInstances?.length,
      textsCount: config.contents?.texts?.length,
      texts: config.contents?.texts,
      messageLimit: config.config?.messageLimit,
      configReceived: config.config,
    });

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Usuário não autenticado",
      });
    }

    // Validações básicas
    if (!config.phoneInstances?.length || config.phoneInstances.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Necessário pelo menos duas instâncias",
      });
    }

    if (!config.contents?.texts?.length) {
      return res.status(400).json({
        success: false,
        message: "Necessário pelo menos um texto",
      });
    }

    // Validar messageLimit se fornecido
    if (
      config.config?.messageLimit !== undefined &&
      config.config.messageLimit !== null
    ) {
      const messageLimit = Number(config.config.messageLimit);

      console.log("Validando messageLimit:", {
        original: config.config.messageLimit,
        converted: messageLimit,
        isInteger: Number.isInteger(messageLimit),
        isPositive: messageLimit > 0,
      });

      if (
        isNaN(messageLimit) ||
        !Number.isInteger(messageLimit) ||
        messageLimit <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: `O limite de mensagens deve ser um número inteiro positivo. Recebido: ${config.config.messageLimit}`,
        });
      }

      // Buscar plano do usuário para validar limite máximo
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { plan: true },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Usuário não encontrado",
        });
      }

      const planLimits = PLAN_LIMITS[user.plan as keyof typeof PLAN_LIMITS];
      const maxAllowed = planLimits.maxMessagesPerDay || 20;

      if (messageLimit > maxAllowed) {
        return res.status(400).json({
          success: false,
          message: `O limite de mensagens não pode exceder ${maxAllowed} para o seu plano ${user.plan}`,
        });
      }
    }

    // Processar mídia
    const processMedia = (mediaArray: any[] = []): MediaContent[] => {
      return mediaArray
        .map((item) => {
          if (!item) return null;

          console.log("Processando item de mídia:", item);

          return {
            type: item.type as "image" | "video" | "audio" | "sticker",
            base64: typeof item === "string" ? item : item.base64,
            fileName: item.fileName || `file.${item.type}`,
            mimetype:
              item.type === "image"
                ? "image/jpeg"
                : item.type === "video"
                ? "video/mp4"
                : item.type === "audio"
                ? "audio/mp3"
                : "image/webp",
            preview: item.preview,
          };
        })
        .filter(Boolean) as MediaContent[];
    };

    // Preparar configuração final
    const warmupConfig: WarmupConfig = {
      userId, // Removido Number(), mantendo como string
      phoneInstances: config.phoneInstances,
      contents: {
        texts: config.contents.texts.map((text: string | TextContent) =>
          typeof text === "string" ? text : text.text
        ),
        images: processMedia(config.contents.images),
        audios: processMedia(config.contents.audios),
        videos: processMedia(config.contents.videos),
        stickers: processMedia(config.contents.stickers),
        emojis: config.contents.emojis || [
          "👍",
          "❤️",
          "😂",
          "😮",
          "😢",
          "🙏",
          "👏",
          "🔥",
        ],
      },
      config: {
        textChance: config.config.textChance || 0.8,
        audioChance: config.config.audioChance || 0.3,
        reactionChance: config.config.reactionChance || 0.4,
        stickerChance: config.config.stickerChance || 0.2,
        imageChance: config.config.imageChance || 0.3,
        videoChance: config.config.videoChance || 0.1,
        minDelay: config.config.minDelay || 3000,
        maxDelay: config.config.maxDelay || 90000,
        messageLimit: config.config.messageLimit
          ? Number(config.config.messageLimit)
          : undefined,
      },
    };

    // Iniciar o warmup
    try {
      console.log("🚀 Iniciando warmup service com configuração:", {
        userId: warmupConfig.userId,
        instancesCount: warmupConfig.phoneInstances.length,
        instances: warmupConfig.phoneInstances.map((i) => i.instanceId),
        hasTexts: warmupConfig.contents.texts.length > 0,
        messageLimit: warmupConfig.config.messageLimit,
      });

      await warmupService.startWarmup(warmupConfig);
      console.log("✅ Warmup service iniciado com sucesso");
    } catch (warmupError: any) {
      console.error("❌ Erro no warmup service:", {
        message: warmupError?.message,
        stack: warmupError?.stack,
        error: warmupError,
      });

      // Se o erro for relacionado ao plano, retornar erro específico
      if (
        warmupError?.message?.includes("features") ||
        warmupError?.message?.includes("plano")
      ) {
        return res.status(400).json({
          success: false,
          message: `Erro na configuração do plano: ${warmupError.message}`,
        });
      }

      // Para outros erros, continuar e verificar se foi iniciado
      console.log("🔄 Continuando verificação de status mesmo com erro...");
    }

    // Aguardar um momento para garantir que o status foi atualizado
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Verificar o status atual
    const status = await prisma.warmupStats.findMany({
      where: {
        userId,
        status: "active",
      },
    });

    console.log("Status do aquecimento após inicialização:", {
      activeInstances: status.length,
      instances: status.map((s) => ({
        name: s.instanceName,
        status: s.status,
      })),
    });

    return res.status(200).json({
      success: true,
      message:
        status.length > 0
          ? "Aquecimento iniciado com sucesso"
          : "Aquecimento configurado (pode levar alguns segundos para ativar)",
      isActive: status.length > 0,
      activeInstances: status.length,
    });
  } catch (error) {
    console.error("Erro ao configurar aquecimento:", error);
    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Erro ao configurar aquecimento",
    });
  }
};

// Parar aquecimento específico
export const stopWarmup = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const userId = (req as any).user?.id;
    const { instanceId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Usuário não autenticado",
      });
    }

    if (!instanceId) {
      return res.status(400).json({
        success: false,
        message: "ID da instância não fornecido",
      });
    }

    await warmupService.stopWarmup(instanceId);

    return res.status(200).json({
      success: true,
      message: "Aquecimento parado com sucesso",
    });
  } catch (error) {
    console.error("Erro ao parar aquecimento:", error);
    return res.status(500).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Erro ao parar aquecimento",
    });
  }
};

// Parar todos os aquecimentos
export const stopAllWarmups = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Usuário não autenticado",
      });
    }

    // Parar o serviço de aquecimento
    await warmupService.stopAll();

    // Atualizar todas as instâncias do usuário para status pausado
    await prisma.warmupStats.updateMany({
      where: {
        userId: userId,
      },
      data: {
        status: "paused",
        pauseTime: new Date(),
      },
    });

    return res.status(200).json({
      success: true,
      message: "Todos os aquecimentos foram parados",
    });
  } catch (error) {
    console.error("Erro ao parar aquecimentos:", error);
    return res.status(500).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Erro ao parar aquecimentos",
    });
  }
};

// Verificar status do aquecimento
export const getWarmupStats = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const userId = (req as any).user?.id;
    const { instanceId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Usuário não autenticado",
      });
    }

    if (!instanceId) {
      return res.status(400).json({
        success: false,
        message: "ID da instância não fornecido",
      });
    }

    const stats = await prisma.warmupStats.findUnique({
      where: { instanceName: instanceId },
      include: {
        mediaStats: true,
        mediaReceived: true,
      },
    });

    if (!stats) {
      return res.status(404).json({
        success: false,
        message: "Estatísticas não encontradas",
      });
    }

    return res.status(200).json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Erro ao obter estatísticas:", error);
    return res.status(500).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Erro ao obter estatísticas",
    });
  }
};

// src/controllers/warmup.controller.ts
export const getWarmupStatus = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Usuário não autenticado",
      });
    }

    // Buscar todas as instâncias ativas do usuário
    const activeInstances = await prisma.warmupStats.findMany({
      where: {
        userId,
      },
      select: {
        instanceName: true,
        status: true,
        lastActive: true,
      },
    });

    // Mapear os status das instâncias
    const instanceStatuses = activeInstances.reduce((acc, instance) => {
      acc[instance.instanceName] = {
        status: instance.status,
        lastActive: instance.lastActive,
      };
      return acc;
    }, {} as Record<string, { status: string; lastActive: Date }>);

    return res.status(200).json({
      success: true,
      instances: instanceStatuses,
      // Se houver pelo menos uma instância ativa, considera o aquecimento ativo
      globalStatus: Object.values(instanceStatuses).some(
        (inst) => inst.status === "active"
      )
        ? "active"
        : "inactive",
    });
  } catch (error) {
    console.error("Erro ao obter status:", error);
    return res.status(500).json({
      success: false,
      message: "Erro ao obter status do aquecimento",
    });
  }
};
