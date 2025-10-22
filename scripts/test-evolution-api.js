// Script para testar a Evolution API
const axios = require("axios");

const URL_API = "https://evo.whatlead.com.br";
const API_KEY = "429683C4C977415CAAFCCE10F7D57E11";

async function testEvolutionAPI() {
  try {
    console.log("🧪 Testando Evolution API...\n");

    // Primeiro, buscar instâncias disponíveis
    let availableInstance = null;
    try {
      const instancesResponse = await axios.get(
        `${URL_API}/instance/fetchInstances`,
        {
          headers: {
            apikey: API_KEY,
          },
          timeout: 10000,
        }
      );

      if (instancesResponse.data && instancesResponse.data.length > 0) {
        // Procurar uma instância com status "open"
        availableInstance = instancesResponse.data.find(
          (inst) => inst.connectionStatus === "open"
        );
        if (!availableInstance) {
          // Se não encontrar "open", usar a primeira disponível
          availableInstance = instancesResponse.data[0];
        }
        console.log(
          `📋 Usando instância: ${
            availableInstance.instanceName ||
            availableInstance.instance ||
            "Sem nome"
          } (Status: ${availableInstance.connectionStatus})`
        );
        console.log(
          "📋 Dados da instância:",
          JSON.stringify(availableInstance, null, 2)
        );
      }
    } catch (error) {
      console.log("❌ Erro ao buscar instâncias:", error.response?.status);
    }

    if (!availableInstance) {
      console.log("❌ Nenhuma instância disponível para teste");
      return;
    }

    const instanceName =
      availableInstance.name ||
      availableInstance.instanceName ||
      availableInstance.instance ||
      availableInstance.id ||
      "instancia-teste";

    // 1. Testar envio de texto simples
    console.log("1️⃣ Testando envio de texto...");
    try {
      const textResponse = await axios.post(
        `${URL_API}/message/sendText/${instanceName}`,
        {
          number: "5511999999999",
          text: "Teste de envio de texto",
          options: {
            delay: 1000,
            presence: "composing",
            linkPreview: false,
          },
        },
        {
          headers: {
            "Content-Type": "application/json",
            apikey: API_KEY,
          },
          timeout: 10000,
        }
      );
      console.log("✅ Texto enviado com sucesso:", textResponse.status);
    } catch (error) {
      console.log(
        "❌ Erro ao enviar texto:",
        error.response?.status,
        JSON.stringify(error.response?.data, null, 2)
      );
    }

    // 2. Testar envio de imagem com base64
    console.log("\n2️⃣ Testando envio de imagem...");
    try {
      // Base64 de uma imagem pequena (1x1 pixel PNG)
      const testImageBase64 =
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

      const imageResponse = await axios.post(
        `${URL_API}/message/sendMedia/${instanceName}`,
        {
          number: "5511999999999",
          mediatype: "image",
          media: testImageBase64,
          caption: "Teste de imagem",
          fileName: "test.png",
          mimetype: "image/png",
        },
        {
          headers: {
            "Content-Type": "application/json",
            apikey: API_KEY,
          },
          timeout: 10000,
        }
      );
      console.log("✅ Imagem enviada com sucesso:", imageResponse.status);
    } catch (error) {
      console.log(
        "❌ Erro ao enviar imagem:",
        error.response?.status,
        JSON.stringify(error.response?.data, null, 2)
      );
    }

    // 3. Testar instâncias disponíveis (já foi testado acima)
    console.log("\n3️⃣ Instâncias já foram testadas acima");

    // 4. Testar status da API
    console.log("\n4️⃣ Testando status da API...");
    try {
      const statusResponse = await axios.get(`${URL_API}/manager/health`, {
        timeout: 10000,
      });
      console.log("✅ API está funcionando:", statusResponse.status);
    } catch (error) {
      console.log(
        "❌ Erro ao verificar status da API:",
        error.response?.status,
        error.response?.data
      );
    }
  } catch (error) {
    console.error("💥 Erro geral no teste:", error.message);
  }
}

// Executar teste
testEvolutionAPI();
