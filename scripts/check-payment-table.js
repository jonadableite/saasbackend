/**
 * Script para verificar a estrutura da tabela Payment no banco de dados
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkPaymentTable() {
  try {
    console.log("🔍 Verificando estrutura do banco de dados...\n");

    // Tentar listar todas as tabelas
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;

    console.log("📋 Tabelas disponíveis no banco:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    tables.forEach((table, index) => {
      console.log(`${index + 1}. ${table.table_name}`);
    });

    // Procurar especificamente por tabelas relacionadas a payment
    const paymentTables = tables.filter((t) =>
      t.table_name.toLowerCase().includes("payment")
    );

    if (paymentTables.length > 0) {
      console.log("\n✅ Tabelas de pagamento encontradas:");
      paymentTables.forEach((table) => {
        console.log(`   - ${table.table_name}`);
      });

      // Verificar estrutura da primeira tabela de payment
      const paymentTableName = paymentTables[0].table_name;
      console.log(`\n🔎 Estrutura da tabela "${paymentTableName}":`);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

      const columns = await prisma.$queryRaw`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = ${paymentTableName}
        ORDER BY ordinal_position;
      `;

      columns.forEach((col, index) => {
        console.log(
          `${index + 1}. ${col.column_name} (${col.data_type}) ${
            col.is_nullable === "NO" ? "- OBRIGATÓRIO" : "- OPCIONAL"
          }`
        );
      });
    } else {
      console.log("\n⚠️  NENHUMA tabela de pagamento encontrada!");
      console.log("💡 Você precisa criar a tabela Payment primeiro.");
      console.log("\n📝 Opções:");
      console.log("   1. Executar migration do Prisma: npx prisma migrate dev");
      console.log(
        "   2. Ou usar o schema.prisma existente e fazer deploy: npx prisma db push"
      );
    }

    // Verificar se existe algum pagamento no banco
    try {
      const paymentCount = await prisma.payment.count();
      console.log(`\n💰 Total de pagamentos no banco: ${paymentCount}`);
    } catch (error) {
      console.log(
        "\n⚠️  Não foi possível contar pagamentos (tabela pode não existir)"
      );
    }
  } catch (error) {
    console.error("\n❌ Erro ao verificar banco:", error.message);
    console.error("\nDetalhes:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPaymentTable();
