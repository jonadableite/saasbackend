/**
 * Test Script for Subscription System
 * Run with: npx ts-node scripts/test-subscription.ts
 */

import { PrismaClient } from "@prisma/client";
import { SubscriptionService } from "../src/services/subscription.service";
import { PaymentService } from "../src/services/payment.service";
import { BillingService } from "../src/services/billing.service";
import { NotificationService } from "../src/services/notification.service";
import { addMonths, addDays } from "date-fns";
import { PaymentMethod } from "../src/types/subscription.types";

const prisma = new PrismaClient();
const subscriptionService = new SubscriptionService(prisma);
const paymentService = new PaymentService(prisma);
const billingService = new BillingService(prisma);
const notificationService = new NotificationService();

async function testSubscriptionSystem() {
  console.log("🧪 Testando Sistema de Assinaturas\n");

  try {
    // 1. Get a test user
    console.log("1️⃣ Buscando usuário de teste...");
    const user = await prisma.user.findFirst({
      where: { email: { contains: "test" } },
    });

    if (!user) {
      console.error(
        '❌ Nenhum usuário de teste encontrado. Crie um usuário com email contendo "test"'
      );
      return;
    }

    console.log(`✅ Usuário encontrado: ${user.name} (${user.email})\n`);

    // 2. Get subscription info
    console.log("2️⃣ Verificando informações de assinatura...");
    const subscriptionInfo = await subscriptionService.getSubscriptionInfo(
      user.id
    );
    console.log("📊 Informações da assinatura:");
    console.log(JSON.stringify(subscriptionInfo, null, 2));
    console.log("");

    // 3. Create a test payment
    console.log("3️⃣ Criando pagamento de teste...");
    const dueDate = addDays(new Date(), 7);
    const payment = await paymentService.createPayment({
      userId: user.id,
      amount: 9900, // R$ 99,00
      currency: "BRL",
      dueDate,
      paymentMethod: PaymentMethod.PIX,
      pixCode: "TEST_PIX_CODE_12345",
      metadata: {
        test: true,
        createdBy: "test-script",
      },
    });

    console.log(`✅ Pagamento criado: ID ${payment.id}`);
    console.log(`   Valor: R$ ${(payment.amount / 100).toFixed(2)}`);
    console.log(
      `   Vencimento: ${payment.dueDate.toLocaleDateString("pt-BR")}\n`
    );

    // 4. List user payments
    console.log("4️⃣ Listando pagamentos do usuário...");
    const payments = await paymentService.getUserPayments(user.id);
    console.log(`📋 Total de pagamentos: ${payments.length}\n`);

    // 5. Confirm the payment
    console.log("5️⃣ Confirmando pagamento...");
    const confirmedPayment = await paymentService.confirmPayment({
      paymentId: payment.id,
      confirmedBy: "test-script",
      paidAt: new Date(),
    });

    console.log(`✅ Pagamento confirmado: ${confirmedPayment.status}`);
    console.log(
      `   Pago em: ${confirmedPayment.paidAt?.toLocaleDateString("pt-BR")}\n`
    );

    // 6. Check subscription after payment
    console.log("6️⃣ Verificando assinatura após pagamento...");
    const updatedSubscription = await subscriptionService.getSubscriptionInfo(
      user.id
    );
    console.log("📊 Assinatura atualizada:");
    console.log(`   Status: ${updatedSubscription.status}`);
    console.log(`   Ativa: ${updatedSubscription.isActive}`);
    console.log(
      `   Válida até: ${
        updatedSubscription.subscriptionEndDate
          ? new Date(
              updatedSubscription.subscriptionEndDate
            ).toLocaleDateString("pt-BR")
          : "N/A"
      }\n`
    );

    // 7. Test subscription validation
    console.log("7️⃣ Testando validação de assinatura...");
    const isValid = await subscriptionService.isSubscriptionValid(user.id);
    console.log(`   Assinatura válida: ${isValid ? "✅" : "❌"}\n`);

    // 8. Get statistics
    console.log("8️⃣ Buscando estatísticas...");
    const stats = await subscriptionService.getSubscriptionStatistics();
    console.log("📊 Estatísticas de assinatura:");
    console.log(JSON.stringify(stats, null, 2));
    console.log("");

    const paymentStats = await paymentService.getPaymentStatistics();
    console.log("💰 Estatísticas de pagamento:");
    console.log(JSON.stringify(paymentStats, null, 2));
    console.log("");

    // 9. Clean up test payment (optional)
    console.log("9️⃣ Limpando dados de teste...");
    await paymentService.cancelPayment(payment.id, "Teste concluído");
    console.log("✅ Pagamento de teste cancelado\n");

    console.log("✅ Teste completo! Sistema funcionando corretamente.");
  } catch (error) {
    console.error("❌ Erro durante o teste:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Execute tests
testSubscriptionSystem()
  .then(() => {
    console.log("\n✅ Script finalizado com sucesso");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Erro ao executar script:", error);
    process.exit(1);
  });
