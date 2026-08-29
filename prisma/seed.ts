import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();
const DB_PATH = path.join(process.cwd(), "data", "db.json");

async function main() {
  console.log("Starting database seed...");

  // 1. Create Roles & Permissions
  const rolesData = [
    {
      name: "Super Administrateur",
      description: "Accès total au système, gestion des configurations de sécurité et des sauvegardes.",
      permissions: JSON.stringify(["all", "manage_users", "manage_finances", "manage_content", "audit_logs"])
    },
    {
      name: "Administrateur",
      description: "Gestion des utilisateurs, des contenus, et supervision générale.",
      permissions: JSON.stringify(["manage_users", "manage_content", "view_finances", "audit_logs"])
    },
    {
      name: "Directeur",
      description: "Directeur du centre de recherche. Consultation globale et approbation budgétaire.",
      permissions: JSON.stringify(["view_finances", "view_users", "manage_users", "manage_content", "approve_budget"])
    },
    {
      name: "Comptable",
      description: "Gestion complète de la comptabilité, des dépenses, et des recettes.",
      permissions: JSON.stringify(["manage_finances", "view_finances"])
    },
    {
      name: "Chercheur",
      description: "Gestion des activités de recherche, publications et projets scientifiques.",
      permissions: JSON.stringify(["manage_research", "view_content"])
    },
    {
      name: "Secrétaire",
      description: "Gestion administrative, publications d'actualités et messagerie.",
      permissions: JSON.stringify(["manage_content", "view_content"])
    },
    {
      name: "Visiteur",
      description: "Accès de lecture seule aux données publiques.",
      permissions: JSON.stringify(["view_content"])
    }
  ];

  console.log("Creating roles...");
  const rolesMap: { [key: string]: any } = {};
  for (const r of rolesData) {
    const role = await prisma.role.upsert({
      where: { name: r.name },
      update: { description: r.description, permissions: r.permissions },
      create: r
    });
    rolesMap[r.name] = role;
    console.log(`Created/updated role: ${role.name}`);
  }

  // Read the legacy JSON database
  if (fs.existsSync(DB_PATH)) {
    console.log("Reading legacy JSON database...");
    const rawData = fs.readFileSync(DB_PATH, "utf-8");
    const db = JSON.parse(rawData);

    // 2. Seed Users with Hashed Passwords
    if (db.users && Array.isArray(db.users)) {
      console.log(`Seeding ${db.users.length} users...`);
      for (const u of db.users) {
        // Map roles
        let roleName = u.role;
        if (roleName === "Secrétaire") roleName = "Secrétaire";
        if (roleName === "Directeur") roleName = "Directeur";
        if (roleName === "Comptable") roleName = "Comptable";
        if (roleName === "Chercheur") roleName = "Chercheur";
        if (roleName === "Administrateur") roleName = "Administrateur";
        
        const role = rolesMap[roleName] || rolesMap["Visiteur"];
        const existing = await prisma.user.findUnique({ where: { email: u.email } });
        const hashedPassword = await bcrypt.hash(u.password, 10);

        if (!existing) {
          console.log(`[TEMP PASSWORD] ${u.email} -> ${u.password} (à communiquer de façon sécurisée puis à changer)`);
        }

        await prisma.user.upsert({
          where: { email: u.email },
          update: {
            avatarUrl: u.avatarUrl || null
          },
          create: {
            id: u.id,
            name: u.name,
            email: u.email,
            password: hashedPassword,
            roleId: role.id,
            active: u.active ?? true,
            avatarUrl: u.avatarUrl || null
          }
        });
      }
    }

    // 3. Seed News
    if (db.news && Array.isArray(db.news)) {
      console.log(`Seeding ${db.news.length} news items...`);
      for (const n of db.news) {
        await prisma.news.create({
          data: {
            id: n.id,
            title: n.title,
            content: n.content,
            date: n.date,
            author: n.author,
            image: n.image,
            category: n.category
          }
        }).catch(() => {});
      }
    }

    // 4. Seed Activities
    if (db.activities && Array.isArray(db.activities)) {
      console.log(`Seeding ${db.activities.length} activities...`);
      for (const act of db.activities) {
        await prisma.activity.create({
          data: {
            id: act.id,
            title: act.title,
            description: act.description,
            location: act.location,
            date: act.date,
            status: act.status,
            budget: Number(act.budget) || 0,
            researchers: JSON.stringify(act.researchers || [])
          }
        }).catch(() => {});
      }
    }

    // 5. Seed Projects
    if (db.projects && Array.isArray(db.projects)) {
      console.log(`Seeding ${db.projects.length} projects...`);
      for (const p of db.projects) {
        await prisma.project.create({
          data: {
            id: p.id,
            title: p.title,
            status: p.status,
            progress: Number(p.progress) || 0,
            startYear: Number(p.startYear) || 2026,
            duration: p.duration,
            principalInvestigator: p.principalInvestigator,
            description: p.description,
            objectives: JSON.stringify(p.objectives || []),
            partners: JSON.stringify(p.partners || []),
            budgetAmount: Number(p.budgetAmount) || 0,
            spentAmount: Number(p.spentAmount) || 0,
            lastUpdate: p.lastUpdate
          }
        }).catch(() => {});
      }
    }

    // 6. Seed Publications
    if (db.publications && Array.isArray(db.publications)) {
      console.log(`Seeding ${db.publications.length} publications...`);
      for (const pub of db.publications) {
        await prisma.publication.create({
          data: {
            id: pub.id,
            title: pub.title,
            authors: pub.authors,
            journal: pub.journal,
            year: Number(pub.year) || 2026,
            type: pub.type,
            status: pub.status,
            doi: pub.doi,
            abstractUrl: pub.abstractUrl
          }
        }).catch(() => {});
      }
    }

    // 7. Seed Gallery
    if (db.gallery && Array.isArray(db.gallery)) {
      console.log(`Seeding ${db.gallery.length} gallery items...`);
      for (const gal of db.gallery) {
        await prisma.gallery.create({
          data: {
            id: gal.id,
            title: gal.title,
            description: gal.description,
            type: gal.type,
            url: gal.url,
            date: gal.date
          }
        }).catch(() => {});
      }
    }

    // 8. Seed Partners
    if (db.partners && Array.isArray(db.partners)) {
      console.log(`Seeding ${db.partners.length} partners...`);
      for (const part of db.partners) {
        await prisma.partner.create({
          data: {
            id: part.id,
            name: part.name,
            type: part.type,
            logo: part.logo,
            website: part.website,
            cooperationType: part.cooperationType
          }
        }).catch(() => {});
      }
    }

    // 9. Seed ContactMessages
    if (db.contactMessages && Array.isArray(db.contactMessages)) {
      console.log(`Seeding ${db.contactMessages.length} contact messages...`);
      for (const msg of db.contactMessages) {
        await prisma.contactMessage.create({
          data: {
            id: msg.id,
            senderName: msg.senderName,
            senderEmail: msg.senderEmail,
            subject: msg.subject,
            message: msg.message,
            date: msg.date,
            status: msg.status
          }
        }).catch(() => {});
      }
    }

    // 10. Seed Recipes
    if (db.recipes && Array.isArray(db.recipes)) {
      console.log(`Seeding ${db.recipes.length} recipes...`);
      for (const r of db.recipes) {
        await prisma.recipe.create({
          data: {
            id: r.id,
            description: r.description,
            source: r.source,
            amount: Number(r.amount) || 0,
            date: r.date,
            recordedBy: r.recordedBy,
            type: r.type
          }
        }).catch(() => {});
      }
    }

    // 11. Seed Expenses
    if (db.expenses && Array.isArray(db.expenses)) {
      console.log(`Seeding ${db.expenses.length} expenses...`);
      for (const exp of db.expenses) {
        await prisma.expense.create({
          data: {
            id: exp.id,
            description: exp.description,
            beneficiary: exp.beneficiary,
            amount: Number(exp.amount) || 0,
            category: exp.category,
            date: exp.date,
            status: exp.status,
            recordedBy: exp.recordedBy
          }
        }).catch(() => {});
      }
    }

    // 12. Seed Budget
    if (db.budget) {
      console.log("Seeding budget...");
      const bg = db.budget;
      await prisma.budget.upsert({
        where: { year: bg.year || 2026 },
        update: {},
        create: {
          year: bg.year || 2026,
          totalBudget: Number(bg.totalBudget) || 0,
          allocatedResearch: Number(bg.allocatedResearch) || 0,
          allocatedLogistics: Number(bg.allocatedLogistics) || 0,
          allocatedEquipment: Number(bg.allocatedEquipment) || 0,
          allocatedPersonnel: Number(bg.allocatedPersonnel) || 0
        }
      });
    }

    // 13. Seed Logs
    if (db.logs && Array.isArray(db.logs)) {
      console.log(`Seeding ${db.logs.length} logs...`);
      for (const log of db.logs.slice(0, 100)) { // limit logs to first 100 to seed fast
        await prisma.log.create({
          data: {
            id: log.id,
            userId: log.userId,
            userName: log.userName,
            userRole: log.userRole,
            action: log.action,
            details: log.details,
            timestamp: new Date(log.timestamp)
          }
        }).catch(() => {});
      }
    }
  }

  console.log("Database seed completed successfully.");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
