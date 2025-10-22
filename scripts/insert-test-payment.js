/**
 * Script Node.js para inserir dados de teste de pagamento
 * Execute: node saasapi/scripts/insert-test-payment.js
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const USER_ID = "ea3ed8ca-39e3-4941-a6cf-42da02d8ad4a";

async function insertTestPayments() {
  try {
    console.log("🚀 Iniciando inserção de dados de teste...\n");

    // 1. Verificar se o usuário existe
    const user = await prisma.user.findUnique({
      where: { id: USER_ID },
    });

    if (!user) {
      console.error("❌ Usuário não encontrado com ID:", USER_ID);
      console.log(
        "\n💡 Dica: Certifique-se de que o usuário existe no banco de dados."
      );
      return;
    }

    console.log("✅ Usuário encontrado:", user.name || user.email);

    // 2. Limpar pagamentos anteriores (opcional)
    const deletedPayments = await prisma.payment.deleteMany({
      where: { userId: USER_ID },
    });
    console.log(`\n🗑️  Removidos ${deletedPayments.count} pagamentos antigos`);

    // 3. Inserir Pagamento PENDENTE (com Pix)
    console.log("\n📝 Criando pagamento PENDENTE...");
    const { randomUUID } = require("crypto");
    const pendingPayment = await prisma.payment.create({
      data: {
        id: randomUUID(),
        stripePaymentId: `pix_pending_${randomUUID()}`, // ID único para Pix
        userId: USER_ID,
        amount: 9900, // R$ 99,00
        currency: "BRL",
        status: "pending",
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 dias
        updatedAt: new Date(), // Campo obrigatório
        paymentMethod: "pix",
        pixCode:
          "00020126580014br.gov.bcb.pix0136ea3ed8ca-39e3-4941-a6cf-42da02d8ad4a5204000053039865802BR5925WHATLEADS PLATAFORMA6009SAO PAULO62070503***63041234",
        pixQRCode:
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        notificationSent: false,
        remindersSent: 0,
      },
    });
    console.log("✅ Pagamento PENDENTE criado:", pendingPayment.id);
    console.log("   💰 Valor: R$ 99,00");
    console.log(
      "   📅 Vencimento:",
      pendingPayment.dueDate.toLocaleDateString("pt-BR")
    );
    console.log("   💳 Método: Pix");

    // 4. Inserir Pagamento VENCIDO
    console.log("\n📝 Criando pagamento VENCIDO...");
    const overduePayment = await prisma.payment.create({
      data: {
        id: randomUUID(),
        stripePaymentId: `pix_overdue_${randomUUID()}`,
        userId: USER_ID,
        amount: 9900,
        currency: "BRL",
        status: "overdue",
        dueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // -3 dias
        updatedAt: new Date(), // Campo obrigatório
        paymentMethod: "pix",
        notificationSent: true,
        remindersSent: 2,
      },
    });
    console.log("✅ Pagamento VENCIDO criado:", overduePayment.id);
    console.log("   ⚠️  Vencido há 3 dias");
    console.log("   📧 Lembretes enviados: 2");

    // 5. Inserir Pagamento PAGO (histórico)
    console.log("\n📝 Criando pagamento PAGO (histórico)...");
    const completedPayment = await prisma.payment.create({
      data: {
        id: randomUUID(),
        stripePaymentId: `pix_completed_${randomUUID()}`,
        userId: USER_ID,
        amount: 9900,
        currency: "BRL",
        status: "completed",
        dueDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // -30 dias
        updatedAt: new Date(), // Campo obrigatório
        paidAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000), // -28 dias (pago 2 dias antes)
        paymentMethod: "pix",
        confirmedBy: "admin-user-id",
        notificationSent: true,
        remindersSent: 0,
      },
    });
    console.log("✅ Pagamento PAGO criado:", completedPayment.id);
    console.log("   ✔️  Pago há 28 dias");
    console.log("   💚 Status: Completo");

    // 6. Atualizar dados de assinatura do usuário
    console.log("\n📝 Atualizando dados de assinatura do usuário...");
    const updatedUser = await prisma.user.update({
      where: { id: USER_ID },
      data: {
        plan: "premium",
        subscriptionStatus: "ACTIVE",
        subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 dias
        isActive: true,
      },
    });
    console.log("✅ Usuário atualizado com sucesso!");
    console.log("   🌟 Plano: PREMIUM");
    console.log("   ✅ Status: ACTIVE");
    console.log(
      "   📅 Válido até:",
      updatedUser.subscriptionEndDate?.toLocaleDateString("pt-BR")
    );

    // 7. Verificar dados inseridos
    console.log("\n📊 Resumo dos Dados Inseridos:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const allPayments = await prisma.payment.findMany({
      where: { userId: USER_ID },
      orderBy: { createdAt: "desc" },
    });

    allPayments.forEach((payment, index) => {
      console.log(`\n${index + 1}. Pagamento ${payment.status.toUpperCase()}`);
      console.log(`   ID: ${payment.id}`);
      console.log(`   Valor: R$ ${(payment.amount / 100).toFixed(2)}`);
      console.log(
        `   Vencimento: ${payment.dueDate.toLocaleDateString("pt-BR")}`
      );
      if (payment.paidAt) {
        console.log(
          `   Pago em: ${payment.paidAt.toLocaleDateString("pt-BR")}`
        );
      }
    });

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ Dados de teste inseridos com sucesso!");
    console.log("\n🎯 Próximos passos:");
    console.log("   1. Acesse: http://localhost:5173/billing");
    console.log("   2. Faça login com o usuário de teste");
    console.log("   3. Veja os 3 pagamentos aparecerem!");
    console.log("\n🚀 Happy testing!\n");
  } catch (error) {
    console.error("\n❌ Erro ao inserir dados:", error.message);
    console.error("\nDetalhes do erro:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar
insertTestPayments();
