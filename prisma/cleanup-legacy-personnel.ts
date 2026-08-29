/**
 * One-off cleanup script: removes the 14 legacy demo personnel accounts
 * from the live database (these were never deleted by `prisma/seed.ts`,
 * which only creates/updates users via upsert — it never deletes).
 *
 * Run once with:
 *   npx tsx prisma/cleanup-legacy-personnel.ts
 *
 * Safe to run multiple times — accounts already removed are simply skipped.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const emailsToRemove = [
  "d.kisimba@urgedt.org",
  "mc.ilunga@urgedt.org",
  "c.tshilombo@urgedt.org",
  "g.kasongo@urgedt.org",
  "f.mukendi@urgedt.org",
  "j.ngoy@urgedt.org",
  "t.kapinga@urgedt.org",
  "s.lwamba@urgedt.org",
  "n.bakamana@urgedt.org",
  "h.kabange@urgedt.org",
  "p.kalenga@urgedt.org",
  "j.banze@urgedt.org",
  "s.umba@urgedt.org",
  "b.musonda@urgedt.org"
];

async function main() {
  console.log(`Suppression de ${emailsToRemove.length} comptes personnel de démonstration...`);

  for (const email of emailsToRemove) {
    try {
      const deleted = await prisma.user.delete({ where: { email } });
      console.log(`  ✓ Supprimé: ${deleted.email} (${deleted.name})`);
    } catch (err: any) {
      if (err.code === "P2025") {
        console.log(`  - Déjà absent: ${email}`);
      } else {
        console.error(`  ✗ Erreur pour ${email}:`, err.message || err);
      }
    }
  }

  const remaining = await prisma.user.findMany({ select: { email: true, name: true } });
  console.log("\nComptes restants dans la base:");
  remaining.forEach(u => console.log(`  - ${u.email} (${u.name})`));

  console.log("\nNettoyage terminé.");
}

main()
  .catch((err) => {
    console.error("Erreur du script de nettoyage:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
