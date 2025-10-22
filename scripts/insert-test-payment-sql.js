/**
 * Script Node.js para inserir dados de teste de pagamento usando SQL direto
 * Execute: node saasapi/scripts/insert-test-payment-sql.js
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const USER_ID = "ea3ed8ca-39e3-4941-a6cf-42da02d8ad4a";

async function insertTestPaymentsSQL() {
  try {
    console.log("🚀 Iniciando inserção de dados de teste via SQL...\n");

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
    const deletedPayments = await prisma.$executeRaw`
      DELETE FROM "Payment" WHERE "userId" = ${USER_ID}
    `;
    console.log(`\n🗑️  Removidos ${deletedPayments} pagamentos antigos`);

    // 3. Inserir Pagamento PENDENTE via SQL
    console.log("\n📝 Criando pagamento PENDENTE via SQL...");
    const { randomUUID } = require("crypto");

    const pendingId = randomUUID();
    const pendingStripeId = `pix_pending_${randomUUID()}`;
    const pendingDueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // +7 dias
    const now = new Date();

    await prisma.$executeRaw`
      INSERT INTO "Payment" (
        id, "stripePaymentId", amount, currency, status, "dueDate", "updatedAt", "userId"
      ) VALUES (
        ${pendingId}, ${pendingStripeId}, 9900, 'BRL', 'pending', ${pendingDueDate}, ${now}, ${USER_ID}
      )
    `;

    console.log("✅ Pagamento PENDENTE criado:", pendingId);
    console.log("   💰 Valor: R$ 99,00");
    console.log(
      "   📅 Vencimento:",
      pendingDueDate.toLocaleDateString("pt-BR")
    );
    console.log("   💳 Status: Pendente");

    // 4. Inserir Pagamento VENCIDO via SQL
    console.log("\n📝 Criando pagamento VENCIDO via SQL...");

    const overdueId = randomUUID();
    const overdueStripeId = `pix_overdue_${randomUUID()}`;
    const overdueDueDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // -3 dias

    await prisma.$executeRaw`
      INSERT INTO "Payment" (
        id, "stripePaymentId", amount, currency, status, "dueDate", "updatedAt", "userId"
      ) VALUES (
        ${overdueId}, ${overdueStripeId}, 9900, 'BRL', 'overdue', ${overdueDueDate}, ${now}, ${USER_ID}
      )
    `;

    console.log("✅ Pagamento VENCIDO criado:", overdueId);
    console.log("   ⚠️  Vencido há 3 dias");
    console.log("   💳 Status: Vencido");

    // 5. Inserir Pagamento PAGO via SQL
    console.log("\n📝 Criando pagamento PAGO (histórico) via SQL...");

    const completedId = randomUUID();
    const completedStripeId = `pix_completed_${randomUUID()}`;
    const completedDueDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // -30 dias

    await prisma.$executeRaw`
      INSERT INTO "Payment" (
        id, "stripePaymentId", amount, currency, status, "dueDate", "updatedAt", "userId"
      ) VALUES (
        ${completedId}, ${completedStripeId}, 9900, 'BRL', 'completed', ${completedDueDate}, ${now}, ${USER_ID}
      )
    `;

    console.log("✅ Pagamento PAGO criado:", completedId);
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

    const allPayments = await prisma.$queryRaw`
      SELECT * FROM "Payment" WHERE "userId" = ${USER_ID} ORDER BY "createdAt" DESC
    `;

    allPayments.forEach((payment, index) => {
      console.log(`\n${index + 1}. Pagamento ${payment.status.toUpperCase()}`);
      console.log(`   ID: ${payment.id}`);
      console.log(`   Valor: R$ ${(payment.amount / 100).toFixed(2)}`);
      console.log(
        `   Vencimento: ${new Date(payment.dueDate).toLocaleDateString(
          "pt-BR"
        )}`
      );
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
insertTestPaymentsSQL();
