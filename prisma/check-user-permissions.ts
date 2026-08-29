/**
 * Diagnostic script: prints the exact role and permissions the database has
 * for a given user, bypassing any client-side session cache.
 *
 * Run with:
 *   npx tsx prisma/check-user-permissions.ts admin@urgedt.org
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2] || "admin@urgedt.org";

  console.log(`\nRecherche du compte : ${email}\n`);

  const user = await prisma.user.findUnique({
    where: { email },
    include: { role: true }
  });

  if (!user) {
    console.log(`✗ Aucun utilisateur trouvé avec cet email dans la base actuelle.`);
    console.log(`\nComptes existants :`);
    const all = await prisma.user.findMany({ select: { email: true, name: true } });
    all.forEach(u => console.log(`  - ${u.email} (${u.name})`));
    return;
  }

  console.log(`✓ Utilisateur trouvé : ${user.name}`);
  console.log(`  Actif : ${user.active}`);
  console.log(`  Rôle : ${user.role.name}`);
  console.log(`  Permissions (telles qu'en base) : ${user.role.permissions}`);

  const perms: string[] = JSON.parse(user.role.permissions || "[]");
  const canManageUsers = perms.includes("all") || perms.includes("manage_users");
  console.log(`\n  Peut modifier le personnel (manage_users) : ${canManageUsers ? "OUI ✓" : "NON ✗"}`);

  if (!canManageUsers) {
    console.log(`\n⚠️  Ce compte n'a pas la permission requise en base de données.`);
    console.log(`   Relancez "npx tsx prisma/seed.ts" pour appliquer les permissions à jour.`);
  } else {
    console.log(`\n✓ La base est correcte. Si le bouton n'apparaît toujours pas dans le`);
    console.log(`  navigateur, déconnectez-vous puis reconnectez-vous — la session en`);
    console.log(`  cours a été créée avec d'anciennes permissions et ne se met pas à`);
    console.log(`  jour automatiquement tant que vous ne vous reconnectez pas.`);
  }
}

main()
  .catch((err) => {
    console.error("Erreur du diagnostic:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
