/**
 * One-off script: sets initial values for the two new budget categories
 * (Missions, Investissements) on the existing budget row, since they
 * default to 0 after the schema migration.
 *
 * Run once with:
 *   npx tsx prisma/set-initial-budget-categories.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const budget = await prisma.budget.findFirst({ orderBy: { year: "desc" } });
  if (!budget) {
    console.log("Aucun budget trouvé.");
    return;
  }

  const allocatedMissions = 10000;
  const allocatedInvestments = 10000;
  const totalBudget =
    budget.allocatedResearch +
    budget.allocatedLogistics +
    budget.allocatedEquipment +
    budget.allocatedPersonnel +
    allocatedMissions +
    allocatedInvestments;

  const updated = await prisma.budget.update({
    where: { id: budget.id },
    data: { allocatedMissions, allocatedInvestments, totalBudget }
  });

  console.log(`Budget ${updated.year} mis à jour :`);
  console.log(`  Missions: ${updated.allocatedMissions} USD`);
  console.log(`  Investissements: ${updated.allocatedInvestments} USD`);
  console.log(`  Total: ${updated.totalBudget} USD`);
}

main()
  .catch((err) => {
    console.error("Erreur:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
