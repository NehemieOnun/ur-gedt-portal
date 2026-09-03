import { Response } from "express";
import { prisma } from "../config/prisma.js";
import { AuthenticatedRequest } from "../middlewares/authMiddleware.js";
import { recipeSchema, expenseSchema, newsSchema, projectSchema, contactMessageSchema } from "../validators/zodSchemas.js";
import { DEFAULT_DATABASE } from "../../data/defaultDb.js";
import { AuthService } from "../services/authService.js";

/**
 * A simple asynchronous mutex lock to serialize database writes.
 * This ensures that only one write operation is processed at a time,
 * completely preventing SQLite lock contention and database corruption on OverlayFS.
 */
class WriteLock {
  private static promise: Promise<any> = Promise.resolve();

  public static async acquire<T>(fn: () => Promise<T>): Promise<T> {
    const next = WriteLock.promise.then(fn);
    WriteLock.promise = next.catch(() => {});
    return next;
  }
}

export class DbController {
  /**
   * Helper to fetch and assemble the full database view for dashboard compatibility
   */
  public static async fetchFullDbData() {
    try {
      const dbUsers = await prisma.user.findMany({ include: { role: true } });
      const dbNews = await prisma.news.findMany({ orderBy: { date: "desc" } });
      const dbActivities = await prisma.activity.findMany({ orderBy: { date: "desc" } });
      const dbProjects = await prisma.project.findMany();
      const dbPublications = await prisma.publication.findMany({ orderBy: { year: "desc" } });
      const dbGallery = await prisma.gallery.findMany({ orderBy: { date: "desc" } });
      const dbPartners = await prisma.partner.findMany();
      const dbMessages = await prisma.contactMessage.findMany({ orderBy: { date: "desc" } });
      const dbRecipes = await prisma.recipe.findMany({ orderBy: { date: "desc" } });
      const dbExpenses = await prisma.expense.findMany({ orderBy: { date: "desc" } });
      const dbBudget = await prisma.budget.findFirst();
      const dbLogs = await prisma.log.findMany({ orderBy: { timestamp: "desc" }, take: 100 });
      let dbSettings: any = null;
      try {
        dbSettings = await prisma.siteSetting.findFirst();
      } catch {
        dbSettings = null;
      }

      if (!dbUsers || dbUsers.length === 0) {
        // An empty users table is never a legitimate steady state for this app —
        // it means either a first-run (should have been seeded) or a failed
        // transaction left the table wiped. Treat it as an error rather than
        // silently serving fake placeholder data, which risks the admin saving
        // over their real data without realizing something is wrong.
        throw new Error("La table des utilisateurs est vide de façon inattendue — vérifiez le seed ou une transaction interrompue.");
      }

    const budget = dbBudget || {
      year: 2026,
      totalBudget: 0,
      allocatedResearch: 0,
      allocatedLogistics: 0,
      allocatedEquipment: 0,
      allocatedPersonnel: 0
    };

    const users = dbUsers.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      password: "••••••••",
      role: u.role.name as any,
      active: u.active,
      avatarUrl: u.avatarUrl || "",
      phone: u.phone || "",
      department: u.department || "",
      function: u.function || "",
      bio: u.bio || "",
      lastLogin: u.lastLogin ? u.lastLogin.toISOString() : undefined,
      createdAt: u.createdAt ? u.createdAt.toISOString() : undefined
    }));

    const news = dbNews.map((n) => ({
      id: n.id,
      title: n.title,
      content: n.content,
      date: n.date,
      author: n.author,
      image: n.image || "",
      category: n.category
    }));

    const activities = dbActivities.map((act) => {
      let researchersList: string[] = [];
      try {
        researchersList = JSON.parse(act.researchers || "[]");
      } catch {
        researchersList = act.researchers ? act.researchers.split(";") : [];
      }
      return {
        id: act.id,
        title: act.title,
        description: act.description,
        location: act.location,
        date: act.date,
        status: act.status,
        budget: act.budget,
        researchers: researchersList
      };
    });

    const projects = dbProjects.map((p) => {
      let objList: string[] = [];
      let partList: string[] = [];
      try { objList = JSON.parse(p.objectives || "[]"); } catch { objList = p.objectives ? p.objectives.split(";") : []; }
      try { partList = JSON.parse(p.partners || "[]"); } catch { partList = p.partners ? p.partners.split(";") : []; }

      return {
        id: p.id,
        title: p.title,
        status: p.status,
        progress: p.progress,
        startYear: p.startYear,
        duration: p.duration,
        principalInvestigator: p.principalInvestigator,
        description: p.description,
        objectives: objList,
        partners: partList,
        budgetAmount: p.budgetAmount,
        spentAmount: p.spentAmount,
        lastUpdate: p.lastUpdate
      };
    });

    const publications = dbPublications.map((pub) => ({
      id: pub.id,
      title: pub.title,
      authors: pub.authors,
      journal: pub.journal,
      year: pub.year,
      type: pub.type,
      status: pub.status,
      doi: pub.doi || "",
      abstractUrl: pub.abstractUrl || ""
    }));

    const gallery = dbGallery.map((gal) => ({
      id: gal.id,
      title: gal.title,
      description: gal.description,
      type: gal.type,
      url: gal.url,
      date: gal.date
    }));

    const partners = dbPartners.map((part) => ({
      id: part.id,
      name: part.name,
      type: part.type,
      logo: part.logo,
      website: part.website || "",
      cooperationType: part.cooperationType
    }));

    const contactMessages = dbMessages.map((msg) => ({
      id: msg.id,
      senderName: msg.senderName,
      senderEmail: msg.senderEmail,
      subject: msg.subject,
      message: msg.message,
      date: msg.date,
      status: msg.status
    }));

    const recipes = dbRecipes.map((r) => ({
      id: r.id,
      description: r.description,
      source: r.source,
      amount: r.amount,
      date: r.date,
      recordedBy: r.recordedBy,
      type: r.type
    }));

    const expenses = dbExpenses.map((e) => ({
      id: e.id,
      description: e.description,
      beneficiary: e.beneficiary,
      amount: e.amount,
      category: e.category,
      date: e.date,
      status: e.status,
      recordedBy: e.recordedBy
    }));

    const logs = dbLogs.map((l) => ({
      id: l.id,
      userId: l.userId || "system",
      userName: l.userName,
      userRole: l.userRole,
      action: l.action,
      details: l.details,
      timestamp: l.timestamp.toISOString()
    }));

    const settings = dbSettings ? {
      id: dbSettings.id,
      siteName: dbSettings.siteName,
      logo: dbSettings.logo,
      favicon: dbSettings.favicon,
      address: dbSettings.address,
      phone: dbSettings.phone,
      email: dbSettings.email,
      facebook: dbSettings.facebook || "",
      linkedin: dbSettings.linkedin || "",
      twitter: dbSettings.twitter || "",
      youtube: dbSettings.youtube || "",
      github: dbSettings.github || "",
      whatsapp: dbSettings.whatsapp || ""
    } : DEFAULT_DATABASE.settings;

    return {
      users,
      news,
      activities,
      projects,
      publications,
      gallery,
      partners,
      contactMessages,
      recipes,
      expenses,
      budget,
      logs,
      settings
    };
    } catch (err) {
      console.error("Prisma error in fetchFullDbData:", err);
      throw err;
    }
  }

  public static async getFullDb(req: any, res: Response) {
    try {
      const fullDb = await DbController.fetchFullDbData();
      res.json(fullDb);
    } catch (err: any) {
      // Do NOT silently serve DEFAULT_DATABASE here: this endpoint feeds the admin
      // dashboard, and if the person then edits/saves while looking at fake fallback
      // data, that save would overwrite their real data with placeholders. Surface a
      // real error instead so the admin knows to retry rather than losing data.
      console.error("getFullDb error:", err);
      res.status(503).json({
        success: false,
        error: "Impossible de joindre la base de données pour le moment. Réessayez dans quelques secondes — aucune donnée n'a été modifiée."
      });
    }
  }

  /**
   * Public, unauthenticated subset of the DB — safe for the public-facing site only.
   * Never includes users, contact messages, finances, budget, or audit logs.
   * Falls back to DEFAULT_DATABASE on error so the public homepage degrades
   * gracefully instead of breaking entirely — this is read-only and low-stakes,
   * unlike getFullDb which feeds the admin dashboard's editable views.
   */
  public static async getPublicDb(req: any, res: Response) {
    try {
      const fullDb = await DbController.fetchFullDbData();
      const { news, activities, projects, publications, gallery, partners, settings } = fullDb;
      // "Notre Équipe" on the public site needs the staff directory, but only the
      // fields meant to be publicly visible — never phone/department/bio/active
      // status, and password is already masked upstream in fetchFullDbData.
      const publicUsers = (fullDb.users || []).map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        avatarUrl: u.avatarUrl
      }));
      res.json({ news, activities, projects, publications, gallery, partners, settings, users: publicUsers });
    } catch (err: any) {
      console.warn("getPublicDb error, serving DEFAULT_DATABASE as read-only fallback:", err);
      const { news, activities, projects, publications, gallery, partners, settings, users } = DEFAULT_DATABASE;
      const publicUsers = (users || []).map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        avatarUrl: u.avatarUrl
      }));
      res.json({ news, activities, projects, publications, gallery, partners, settings, users: publicUsers });
    }
  }

  /**
   * Public, unauthenticated single-document verification lookup — used by the QR
   * code printed on official documents (expenses, recipes, projects, activities,
   * publications). Deliberately returns ONLY the one matching record, never a full
   * table — someone scanning a receipt's QR code shouldn't be able to see every
   * other financial record in the system just because they're both unauthenticated
   * lookups against the same underlying data.
   */
  public static async verifyDocument(req: any, res: Response) {
    try {
      const id = String(req.query.id || "").trim().toLowerCase();
      const type = String(req.query.type || "").trim().toLowerCase();

      if (!id) {
        return res.status(400).json({ success: false, error: "Identifiant de document manquant." });
      }

      const fullDb = await DbController.fetchFullDbData();

      const lookups: Record<string, () => any> = {
        recette: () => (fullDb.recipes || []).find((r: any) => String(r.id).toLowerCase() === id),
        depense: () => (fullDb.expenses || []).find((e: any) => String(e.id).toLowerCase() === id),
        projet: () => (fullDb.projects || []).find((p: any) => String(p.id || "").toLowerCase() === id),
        activite: () => (fullDb.activities || []).find((a: any) => String(a.id || "").toLowerCase() === id),
        publication: () => (fullDb.publications || []).find((p: any) => String(p.id || "").toLowerCase() === id)
      };

      let foundType: string | null = null;
      let record: any = null;

      if (type && lookups[type]) {
        record = lookups[type]();
        if (record) foundType = type;
      } else {
        // No type hint (or unknown) — try every table until one matches.
        for (const [key, lookup] of Object.entries(lookups)) {
          const match = lookup();
          if (match) {
            record = match;
            foundType = key;
            break;
          }
        }
      }

      if (!record || !foundType) {
        return res.status(404).json({ success: false, error: "Document introuvable ou identifiant invalide." });
      }

      // Return only the fields relevant to verifying a document's authenticity —
      // never anything else from the record's table.
      const safeRecord: Record<string, any> = {
        id: record.id,
        date: record.date,
        description: record.description || record.title || null
      };
      if ("amount" in record) safeRecord.amount = record.amount;
      if ("budget" in record) safeRecord.budget = record.budget;
      if ("category" in record) safeRecord.category = record.category;
      if ("source" in record) safeRecord.source = record.source;

      res.json({ success: true, type: foundType, record: safeRecord });
    } catch (err: any) {
      console.error("verifyDocument error:", err);
      res.status(503).json({ success: false, error: "Vérification indisponible pour le moment. Réessayez." });
    }
  }

  private static readonly TABLE_PERMISSIONS: Record<string, string> = {
    news: "manage_content",
    projects: "manage_content",
    activities: "manage_content",
    publications: "manage_content",
    gallery: "manage_content",
    partners: "manage_content",
    contactMessages: "manage_content",
    settings: "manage_content",
    recipes: "manage_finances",
    expenses: "manage_finances",
    budget: "approve_budget",
    users: "manage_users"
  };

  /**
   * Universal endpoint to update a table's data, preserving compatibility with client array updates.
   * Requires an authenticated user (attached by requireAuth) with the permission matching the target table.
   */
  public static async updateTable(req: any, res: Response) {
    const { tableName, data } = req.body;
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: "Non authentifié" });
      }

      if (!tableName || (!Array.isArray(data) && typeof data !== "object")) {
        return res.status(400).json({ success: false, error: "Format de données invalide" });
      }

      // Normalize table name (convert singular or alias to canonical name)
      let canonicalTable = String(tableName).toLowerCase().trim();
      if (canonicalTable === "user") canonicalTable = "users";
      if (canonicalTable === "project") canonicalTable = "projects";
      if (canonicalTable === "activity") canonicalTable = "activities";
      if (canonicalTable === "publication") canonicalTable = "publications";
      if (canonicalTable === "partner") canonicalTable = "partners";
      if (canonicalTable === "contactmessage" || canonicalTable === "message" || canonicalTable === "contactmessages") canonicalTable = "contactMessages";
      if (canonicalTable === "recipe") canonicalTable = "recipes";
      if (canonicalTable === "expense") canonicalTable = "expenses";

      const requiredPermission = DbController.TABLE_PERMISSIONS[canonicalTable];
      if (!requiredPermission) {
        return res.status(400).json({ success: false, error: `Table '${tableName}' inconnue` });
      }
      const userPermissions: string[] = req.user.permissions || [];
      if (!userPermissions.includes("all") && !userPermissions.includes(requiredPermission)) {
        return res.status(403).json({
          success: false,
          error: `Accès refusé : permission '${requiredPermission}' requise pour modifier la table '${canonicalTable}'.`
        });
      }

      console.log(`Updating table: ${canonicalTable} (original: ${tableName}), items: ${data.length}`);

      await WriteLock.acquire(async () => {
        // Handle individual tables safely with atomic transactions to prevent database corruption
        if (canonicalTable === "news") {
          await prisma.$transaction(async (tx) => {
            await tx.news.deleteMany();
            if (data.length > 0) {
              const itemsToCreate = data.map((item: any) => ({
                id: String(item.id || `news-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`),
                title: String(item.title || "Titre non renseigné"),
                content: String(item.content || "Contenu non renseigné"),
                date: String(item.date || new Date().toISOString().split("T")[0]),
                author: String(item.author || "Anonyme"),
                image: String(item.image || ""),
                category: String(item.category || "Général")
              }));
              await tx.news.createMany({ data: itemsToCreate });
            }
          });
        } else if (canonicalTable === "projects") {
          await prisma.$transaction(async (tx) => {
            await tx.project.deleteMany();
            if (data.length > 0) {
              const itemsToCreate = data.map((valData: any) => {
                let objectivesStr = "[]";
                let partnersStr = "[]";
                if (valData.objectives) {
                  objectivesStr = Array.isArray(valData.objectives) 
                    ? JSON.stringify(valData.objectives) 
                    : (typeof valData.objectives === "string" && valData.objectives.startsWith("[") 
                        ? valData.objectives 
                        : JSON.stringify(String(valData.objectives).split(";").map(s => s.trim()).filter(Boolean)));
                }
                if (valData.partners) {
                  partnersStr = Array.isArray(valData.partners) 
                    ? JSON.stringify(valData.partners) 
                    : (typeof valData.partners === "string" && valData.partners.startsWith("[") 
                        ? valData.partners 
                        : JSON.stringify(String(valData.partners).split(";").map(s => s.trim()).filter(Boolean)));
                }

                const budgetVal = Number(valData.budgetAmount !== undefined ? valData.budgetAmount : valData.budget) || 0;
                const spentVal = Number(valData.spentAmount) || 0;

                return {
                  id: String(valData.id || `proj-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`),
                  title: String(valData.title || "Projet sans titre"),
                  status: String(valData.status || "En cours"),
                  progress: Math.round(Number(valData.progress)) || 0,
                  startYear: Math.round(Number(valData.startYear)) || new Date().getFullYear(),
                  duration: String(valData.duration || "N/A"),
                  principalInvestigator: String(valData.principalInvestigator || "Non renseigné"),
                  description: String(valData.description || ""),
                  objectives: objectivesStr,
                  partners: partnersStr,
                  budgetAmount: budgetVal,
                  spentAmount: spentVal,
                  lastUpdate: String(valData.lastUpdate || new Date().toISOString().split("T")[0])
                };
              });
              await tx.project.createMany({ data: itemsToCreate });
            }
          });
        } else if (canonicalTable === "activities") {
          await prisma.$transaction(async (tx) => {
            await tx.activity.deleteMany();
            if (data.length > 0) {
              const itemsToCreate = data.map((act: any) => ({
                id: String(act.id || `act-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`),
                title: String(act.title || "Activité sans titre"),
                description: String(act.description || ""),
                location: String(act.location || ""),
                date: String(act.date || new Date().toISOString().split("T")[0]),
                status: String(act.status || "Planifié"),
                budget: Number(act.budget) || 0,
                researchers: typeof act.researchers === "string" 
                  ? (act.researchers.startsWith("[") ? act.researchers : JSON.stringify(act.researchers.split(",").map(s => s.trim()).filter(Boolean)))
                  : JSON.stringify(act.researchers || [])
              }));
              await tx.activity.createMany({ data: itemsToCreate });
            }
          });
        } else if (canonicalTable === "publications") {
          await prisma.$transaction(async (tx) => {
            await tx.publication.deleteMany();
            if (data.length > 0) {
              const itemsToCreate = data.map((pub: any) => ({
                id: String(pub.id || `pub-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`),
                title: String(pub.title || "Titre de publication"),
                authors: String(pub.authors || "Auteur inconnu"),
                journal: String(pub.journal || "Revue non spécifiée"),
                year: Math.round(Number(pub.year)) || new Date().getFullYear(),
                type: String(pub.type || "Article"),
                status: String(pub.status || "Publié"),
                doi: String(pub.doi || ""),
                abstractUrl: String(pub.abstractUrl || "")
              }));
              await tx.publication.createMany({ data: itemsToCreate });
            }
          });
        } else if (canonicalTable === "gallery") {
          await prisma.$transaction(async (tx) => {
            const itemsToUpsert = data.map((gal: any) => ({
              id: String(gal.id || `gal-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`),
              title: String(gal.title || "Titre de média"),
              description: String(gal.description || ""),
              type: String(gal.type || "photo"),
              url: String(gal.url || ""),
              date: String(gal.date || new Date().toISOString().split("T")[0])
            }));

            // Diff-based update instead of wipe-and-recreate: only touches rows that
            // actually changed, instead of deleting and reinserting the whole table on
            // every save. Much faster (fewer round-trips) and never leaves the table
            // transiently empty if the save is interrupted partway through.
            const keepIds = itemsToUpsert.map((g: any) => g.id);
            if (keepIds.length > 0) {
              await tx.gallery.deleteMany({ where: { id: { notIn: keepIds } } });
            } else {
              await tx.gallery.deleteMany();
            }
            for (const item of itemsToUpsert) {
              await tx.gallery.upsert({
                where: { id: item.id },
                update: item,
                create: item
              });
            }
          });
        } else if (canonicalTable === "partners") {
          await prisma.$transaction(async (tx) => {
            await tx.partner.deleteMany();
            if (data.length > 0) {
              const itemsToCreate = data.map((p: any) => ({
                id: String(p.id || `partner-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`),
                name: String(p.name || "Partenaire"),
                type: String(p.type || "Institutionnel"),
                logo: String(p.logo || ""),
                website: String(p.website || ""),
                cooperationType: String(p.cooperationType || "")
              }));
              await tx.partner.createMany({ data: itemsToCreate });
            }
          });
        } else if (canonicalTable === "contactMessages") {
          await prisma.$transaction(async (tx) => {
            await tx.contactMessage.deleteMany();
            if (data.length > 0) {
              const itemsToCreate = data.map((msg: any) => ({
                id: String(msg.id || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`),
                senderName: String(msg.senderName || "Nom non renseigné"),
                senderEmail: String(msg.senderEmail || "email@example.com"),
                subject: String(msg.subject || "Sans sujet"),
                message: String(msg.message || ""),
                date: String(msg.date || new Date().toISOString().split("T")[0]),
                status: String(msg.status || (msg.readStatus ? "Lu" : "Non lu") || "Non lu")
              }));
              await tx.contactMessage.createMany({ data: itemsToCreate });
            }
          });
        } else if (canonicalTable === "recipes") {
          await prisma.$transaction(async (tx) => {
            await tx.recipe.deleteMany();
            if (data.length > 0) {
              const itemsToCreate = data.map((r: any) => ({
                id: String(r.id || `rec-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`),
                description: String(r.description || "Recette"),
                source: String(r.source || "Autre"),
                amount: Number(r.amount) || 0,
                date: String(r.date || new Date().toISOString().split("T")[0]),
                recordedBy: String(r.recordedBy || "Comptable"),
                type: String(r.type || "Autre")
              }));
              await tx.recipe.createMany({ data: itemsToCreate });
            }
          });
        } else if (canonicalTable === "expenses") {
          await prisma.$transaction(async (tx) => {
            await tx.expense.deleteMany();
            if (data.length > 0) {
              const itemsToCreate = data.map((exp: any) => ({
                id: String(exp.id || `exp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`),
                description: String(exp.description || "Dépense"),
                beneficiary: String(exp.beneficiary || "Non renseigné"),
                amount: Number(exp.amount) || 0,
                category: String(exp.category || "Autre"),
                date: String(exp.date || new Date().toISOString().split("T")[0]),
                status: String(exp.status || "En attente"),
                recordedBy: String(exp.recordedBy || "Comptable")
              }));
              await tx.expense.createMany({ data: itemsToCreate });
            }
          });
        } else if (canonicalTable === "users") {
          await prisma.$transaction(async (tx) => {
            const keepIds = data.map((u: any) => u.id).filter(Boolean);
            if (keepIds.length > 0) {
              await tx.user.deleteMany({
                where: {
                  id: { notIn: keepIds }
                }
              });
            }

            for (const user of data) {
              const roleName = user.role || "Visiteur";
              let dbRole = await tx.role.findFirst({
                where: { name: roleName }
              });
              if (!dbRole) {
                dbRole = await tx.role.create({
                  data: {
                    name: roleName,
                    permissions: JSON.stringify(["view_content"])
                  }
                });
              }
              const roleId = dbRole.id;

              const userId = user.id || `u-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
              const existing = user.id ? await tx.user.findUnique({ where: { id: user.id } }) : null;

              if (existing) {
                await tx.user.update({
                  where: { id: user.id },
                  data: {
                    name: String(user.name || "Utilisateur"),
                    email: String(user.email || `user-${Date.now()}@urgedt.org`),
                    roleId: roleId,
                    active: user.active !== undefined ? Boolean(user.active) : true,
                    avatarUrl: String(user.avatarUrl || ""),
                    phone: user.phone !== undefined ? String(user.phone) : undefined,
                    department: user.department !== undefined ? String(user.department) : undefined,
                    function: user.function !== undefined ? String(user.function) : undefined,
                    bio: user.bio !== undefined ? String(user.bio) : undefined
                  }
                });
              } else {
                await tx.user.create({
                  data: {
                    id: userId,
                    name: String(user.name || "Utilisateur"),
                    email: String(user.email || `user-${Date.now()}@urgedt.org`),
                    password: user.password && user.password !== "••••••••"
                      ? await AuthService.hashPassword(String(user.password))
                      : "$2b$10$legacyPasswordPlaceholder",
                    roleId: roleId,
                    active: user.active !== undefined ? Boolean(user.active) : true,
                    avatarUrl: String(user.avatarUrl || ""),
                    phone: String(user.phone || ""),
                    department: String(user.department || ""),
                    function: String(user.function || ""),
                    bio: String(user.bio || "")
                  }
                });
              }
            }
          });
        } else if (canonicalTable === "settings") {
          await prisma.$transaction(async (tx) => {
            const settingObj = Array.isArray(data) ? (data[0] || {}) : data;
            await tx.siteSetting.upsert({
              where: { id: "1" },
              update: {
                siteName: String(settingObj.siteName || "UR-GEDT Portal"),
                logo: String(settingObj.logo ?? "/logo.jpg"),
                favicon: String(settingObj.favicon ?? "/favicon.ico"),
                address: String(settingObj.address ?? ""),
                phone: String(settingObj.phone ?? ""),
                email: String(settingObj.email ?? ""),
                facebook: String(settingObj.facebook ?? ""),
                linkedin: String(settingObj.linkedin ?? ""),
                twitter: String(settingObj.twitter ?? ""),
                youtube: String(settingObj.youtube ?? ""),
                github: String(settingObj.github ?? ""),
                whatsapp: String(settingObj.whatsapp ?? "")
              },
              create: {
                id: "1",
                siteName: String(settingObj.siteName || "UR-GEDT Portal"),
                logo: String(settingObj.logo ?? "/logo.jpg"),
                favicon: String(settingObj.favicon ?? "/favicon.ico"),
                address: String(settingObj.address ?? ""),
                phone: String(settingObj.phone ?? ""),
                email: String(settingObj.email ?? ""),
                facebook: String(settingObj.facebook ?? ""),
                linkedin: String(settingObj.linkedin ?? ""),
                twitter: String(settingObj.twitter ?? ""),
                youtube: String(settingObj.youtube ?? ""),
                github: String(settingObj.github ?? ""),
                whatsapp: String(settingObj.whatsapp ?? "")
              }
            });
          });
        } else if (canonicalTable === "budget") {
          await prisma.$transaction(async (tx) => {
            const budgetObj = Array.isArray(data) ? (data[0] || {}) : data;
            const yearVal = Number(budgetObj.year) || 2026;
            await tx.budget.upsert({
              where: { year: yearVal },
              update: {
                totalBudget: Number(budgetObj.totalBudget) || 0,
                allocatedResearch: Number(budgetObj.allocatedResearch) || 0,
                allocatedLogistics: Number(budgetObj.allocatedLogistics) || 0,
                allocatedEquipment: Number(budgetObj.allocatedEquipment) || 0,
                allocatedPersonnel: Number(budgetObj.allocatedPersonnel) || 0
              },
              create: {
                year: yearVal,
                totalBudget: Number(budgetObj.totalBudget) || 0,
                allocatedResearch: Number(budgetObj.allocatedResearch) || 0,
                allocatedLogistics: Number(budgetObj.allocatedLogistics) || 0,
                allocatedEquipment: Number(budgetObj.allocatedEquipment) || 0,
                allocatedPersonnel: Number(budgetObj.allocatedPersonnel) || 0
              }
            });
          });
        } else {
          return res.status(400).json({ success: false, error: `Table '${tableName}' inconnue` });
        }

        // Add audit log entry — identity comes from the verified session, never from the client body
        await prisma.log.create({
          data: {
            userId: req.user.id,
            userName: req.user.email,
            userRole: req.user.role,
            action: "Mise à jour de table",
            details: `Mise à jour globale de la table ${canonicalTable}`,
            ip: req.ip || "127.0.0.1",
            userAgent: req.headers["user-agent"] || "unknown"
          }
        });
      });

      // The write itself succeeded at this point (WriteLock block completed without
      // throwing). Re-fetching the full DB to return a fresh view is a convenience,
      // not part of the write — if it fails (e.g. a transient connection drop right
      // after a successful commit), don't report the whole operation as failed.
      try {
        const fullDb = await DbController.fetchFullDbData();
        res.json({ success: true, db: fullDb });
      } catch (refetchErr) {
        console.warn(`updateTable: write to '${canonicalTable}' succeeded, but refetch failed:`, refetchErr);
        res.json({
          success: true,
          db: null,
          warning: "Modification enregistrée, mais l'actualisation de l'affichage a échoué — rechargez la page."
        });
      }
    } catch (err: any) {
      console.error(`updateTable error for '${tableName}':`, err);
      res.status(500).json({ success: false, error: "Erreur interne de mise à jour: " + (err.message || String(err)) });
    }
  }

  /**
   * Save a single recipe with full Zod validation
   */
  public static async addRecipe(req: any, res: Response) {
    try {
      const validated = recipeSchema.safeParse(req.body);
      if (!validated.success) {
        return res.status(400).json({ success: false, error: validated.error.issues[0].message });
      }

      const { description, source, amount, type, recordedBy } = validated.data;

      // Map a unique recipe ID
      const year = new Date().getFullYear();
      const prefix = `REC-${year}-`;
      const sameYearCount = await prisma.recipe.count({
        where: { id: { startsWith: prefix } }
      });
      const uniqueId = `${prefix}${String(sameYearCount + 1).padStart(4, "0")}`;

      const newRecipe = await prisma.recipe.create({
        data: {
          id: uniqueId,
          description,
          source,
          amount,
          date: new Date().toISOString(),
          recordedBy,
          type
        }
      });

      // Audit Log
      await prisma.log.create({
        data: {
          userId: req.user?.id,
          userName: req.user?.email || recordedBy,
          userRole: req.user?.role || "Comptable",
          action: "Ajout Recette",
          details: `Enregistrement d'une recette ${uniqueId} d'un montant de ${amount} USD (Source: ${source}).`,
          ip: req.ip || "127.0.0.1",
          userAgent: req.headers["user-agent"] || "unknown"
        }
      });

      const fullDb = await DbController.fetchFullDbData();
      res.json({ success: true, recipe: newRecipe, db: fullDb });
    } catch (err: any) {
      console.error("addRecipe error:", err);
      res.status(500).json({ success: false, error: "Impossible de sauvegarder la recette." });
    }
  }

  /**
   * Save a single expense with full Zod validation and Budget checking
   */
  public static async addExpense(req: any, res: Response) {
    try {
      const validated = expenseSchema.safeParse(req.body);
      if (!validated.success) {
        return res.status(400).json({ success: false, error: validated.error.issues[0].message });
      }

      const { description, beneficiary, amount, category, date, recordedBy } = validated.data;

      // Unique Expense ID
      const yearStr = new Date().getFullYear();
      const prefix = `EXP-${yearStr}-`;
      const count = await prisma.expense.count({
        where: { id: { startsWith: prefix } }
      });
      const uniqueId = `${prefix}${String(count + 1).padStart(4, "0")}`;

      const newExpense = await prisma.expense.create({
        data: {
          id: uniqueId,
          description,
          beneficiary,
          amount,
          category,
          date,
          status: req.body.status || "En attente",
          recordedBy
        }
      });

      // Budget warnings / notifications
      const budget = await prisma.budget.findFirst();
      if (budget) {
        // Calculate remaining budget
        const totalExpenses = await prisma.expense.aggregate({
          where: { status: "Approuvé" },
          _sum: { amount: true }
        });
        const spent = totalExpenses._sum.amount || 0;
        const remaining = budget.totalBudget - spent;

        if (spent > budget.totalBudget) {
          // Send notification entry
          await prisma.notification.create({
            data: {
              title: "⚠️ Dépassement Budgétaire !",
              message: `Le total des dépenses approuvées (${spent} USD) a dépassé le budget alloué annuel (${budget.totalBudget} USD).`,
              type: "warning",
              recipientRole: "Directeur"
            }
          });
        } else if (remaining < budget.totalBudget * 0.1) {
          await prisma.notification.create({
            data: {
              title: "⚠️ Seuil de budget critique",
              message: `Il reste moins de 10% du budget annuel alloué (Solde restant: ${remaining.toFixed(2)} USD).`,
              type: "warning",
              recipientRole: "Comptable"
            }
          });
        }
      }

      // Audit Log
      await prisma.log.create({
        data: {
          userId: req.user?.id,
          userName: req.user?.email || recordedBy,
          userRole: req.user?.role || "Comptable",
          action: "Ajout Dépense",
          details: `Enregistrement d'une dépense ${uniqueId} d'un montant de ${amount} USD pour ${beneficiary}.`,
          ip: req.ip || "127.0.0.1",
          userAgent: req.headers["user-agent"] || "unknown"
        }
      });

      const fullDb = await DbController.fetchFullDbData();
      res.json({ success: true, expense: newExpense, db: fullDb });
    } catch (err: any) {
      console.error("addExpense error:", err);
      res.status(500).json({ success: false, error: "Impossible d'enregistrer la dépense." });
    }
  }

  /**
   * Save bulk scanned PDF expenses
   */
  public static async addBulkExpenses(req: any, res: Response) {
    try {
      const { expenses, recordedBy, userRole } = req.body;
      if (!Array.isArray(expenses)) {
        return res.status(400).json({ success: false, error: "Liste de dépenses invalide" });
      }

      const results = [];
      const yearVal = new Date().getFullYear();
      let count = await prisma.expense.count({
        where: { id: { startsWith: `EXP-${yearVal}-` } }
      });

      for (const item of expenses) {
        const uniqueId = `EXP-${yearVal}-${String(++count).padStart(4, "0")}`;
        const exp = await prisma.expense.create({
          data: {
            id: uniqueId,
            description: item.description || "Dépense extraite par IA",
            beneficiary: item.beneficiary || "Non renseigné",
            amount: Number(item.amount) || 0,
            category: item.category || "Autre",
            date: item.date || new Date().toISOString().split("T")[0],
            status: "En attente",
            recordedBy: recordedBy || "Extraction IA"
          }
        });
        results.push(exp);
      }

      // Log action
      await prisma.log.create({
        data: {
          userId: req.user?.id,
          userName: req.user?.email || recordedBy || "Système IA",
          userRole: req.user?.role || "Comptable",
          action: "Ajout Bulk Dépenses",
          details: `Ajout groupé de ${results.length} dépenses via analyse IA de rapports PDF.`,
          ip: req.ip || "127.0.0.1",
          userAgent: req.headers["user-agent"] || "unknown"
        }
      });

      const fullDb = await DbController.fetchFullDbData();
      res.json({ success: true, count: results.length, data: results, db: fullDb });
    } catch (err: any) {
      console.error("addBulkExpenses error:", err);
      res.status(500).json({ success: false, error: "Erreur lors de l'enregistrement groupé." });
    }
  }

  /**
   * Save a public contact message with full validation
   */
  public static async addContactMessage(req: any, res: Response) {
    try {
      const validated = contactMessageSchema.safeParse(req.body);
      if (!validated.success) {
        return res.status(400).json({ success: false, error: validated.error.issues[0].message });
      }

      const { senderName, senderEmail, subject, message } = validated.data;

      const newMessage = await prisma.contactMessage.create({
        data: {
          senderName,
          senderEmail,
          subject,
          message,
          date: new Date().toISOString(),
          status: "Non lu"
        }
      });

      // Create a global notification for the Secretary/Admin
      await prisma.notification.create({
        data: {
          title: "✉️ Nouveau message de contact",
          message: `${senderName} a envoyé un message: "${subject.substr(0, 30)}..."`,
          type: "info",
          recipientRole: "Secrétaire"
        }
      });

      res.json({ success: true, message: newMessage });
    } catch (err: any) {
      console.error("addContactMessage error:", err);
      res.status(500).json({ success: false, error: "Impossible d'envoyer le message" });
    }
  }

  /**
   * Update the global Budget
   */
  public static async updateBudget(req: any, res: Response) {
    try {
      const { year, totalBudget, allocatedResearch, allocatedLogistics, allocatedEquipment, allocatedPersonnel } = req.body;
      const parsedYear = Number(year) || 2026;

      const updated = await prisma.budget.upsert({
        where: { year: parsedYear },
        update: {
          totalBudget: Number(totalBudget) || 0,
          allocatedResearch: Number(allocatedResearch) || 0,
          allocatedLogistics: Number(allocatedLogistics) || 0,
          allocatedEquipment: Number(allocatedEquipment) || 0,
          allocatedPersonnel: Number(allocatedPersonnel) || 0
        },
        create: {
          year: parsedYear,
          totalBudget: Number(totalBudget) || 0,
          allocatedResearch: Number(allocatedResearch) || 0,
          allocatedLogistics: Number(allocatedLogistics) || 0,
          allocatedEquipment: Number(allocatedEquipment) || 0,
          allocatedPersonnel: Number(allocatedPersonnel) || 0
        }
      });

      // Log action
      await prisma.log.create({
        data: {
          userId: req.user?.id,
          userName: req.user?.email || "Système",
          userRole: req.user?.role || "Directeur",
          action: "Mise à jour Budget",
          details: `Mise à jour du budget annuel pour l'année ${parsedYear} à ${totalBudget} USD.`,
          ip: req.ip || "127.0.0.1",
          userAgent: req.headers["user-agent"] || "unknown"
        }
      });

      const fullDb = await DbController.fetchFullDbData();
      res.json({ success: true, budget: updated, db: fullDb });
    } catch (err: any) {
      console.error("updateBudget error:", err);
      res.status(500).json({ success: false, error: "Impossible de mettre à jour le budget." });
    }
  }
}
