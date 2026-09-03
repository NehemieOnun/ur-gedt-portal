import { Router } from "express";
import { AuthController } from "../controllers/authController.js";
import { DbController } from "../controllers/dbController.js";
import { requirePermission, requireAuth } from "../middlewares/authMiddleware.js";
import { GeminiService } from "../services/geminiService.js";

const router = Router();

// --- AUTHENTICATION ---
router.post("/login", AuthController.login);
router.post("/forgot-password", AuthController.forgotPassword);
router.post("/reset-password", AuthController.resetPassword);
router.post("/refresh", AuthController.refresh);
router.post("/change-password", requirePermission("view_content"), AuthController.changePassword);

// --- UNIFIED DATABASE ---
router.get("/db/public", DbController.getPublicDb);
router.get("/verify-doc", DbController.verifyDocument);
router.get("/db", requireAuth, DbController.getFullDb);
router.post("/db/update-table", requireAuth, DbController.updateTable);

// --- FINANCES (SECURED BY RBAC) ---
router.post("/finance/recipe", requirePermission("manage_finances"), DbController.addRecipe);
router.post("/finance/expense", requirePermission("manage_finances"), DbController.addExpense);
router.post("/finance/expense/bulk", requirePermission("manage_finances"), DbController.addBulkExpenses);
router.post("/budget", requirePermission("approve_budget"), DbController.updateBudget);

// --- PUBLIC SERVICES ---
router.post("/contact", DbController.addContactMessage);

// --- DOCKER/SWAGGER/REST METADATA ---
router.get("/docs", (req, res) => {
  res.json({
    appName: "UR-GEDT Portal Management System API",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
    endpoints: {
      auth: [
        { path: "/api/v1/login", method: "POST", description: "Authentification utilisateur avec email et mot de passe (retourne JWT access + refresh tokens)" },
        { path: "/api/v1/refresh", method: "POST", description: "Renouvellement du token d'accès JWT" },
        { path: "/api/v1/change-password", method: "POST", description: "Changement de mot de passe pour la session en cours" }
      ],
      db: [
        { path: "/api/v1/db", method: "GET", description: "Extraction complète et normalisée de toutes les tables relationnelles" },
        { path: "/api/v1/db/update-table", method: "POST", description: "Mise à jour en bloc d'une table avec journalisation" }
      ],
      finances: [
        { path: "/api/v1/finance/recipe", method: "POST", permission: "manage_finances", description: "Enregistrement d'une recette avec validation de montant et source" },
        { path: "/api/v1/finance/expense", method: "POST", permission: "manage_finances", description: "Enregistrement d'une dépense avec calcul de seuil de budget" },
        { path: "/api/v1/finance/expense/bulk", method: "POST", permission: "manage_finances", description: "Ajout groupé de dépenses extraites par l'IA" },
        { path: "/api/v1/budget", method: "POST", permission: "approve_budget", description: "Définition et modification du budget global annuel" }
      ],
      ai: [
        { path: "/api/v1/gemini/scan-receipt", method: "POST", description: "Analyse intelligente de reçus (factures, images) avec Gemini 3.5" },
        { path: "/api/v1/gemini/scan-financial-pdf", method: "POST", description: "Analyse intelligente de rapports PDF de dépenses" }
      ],
      contact: [
        { path: "/api/v1/contact", method: "POST", description: "Envoi de message public avec notification système automatisée" }
      ]
    }
  });
});

// --- GOOGLE GEMINI AI ---
router.post("/gemini/scan-receipt", requirePermission("manage_finances"), async (req, res) => {
  const { imageBase64, mimeType } = req.body;
  if (!imageBase64 || !mimeType) {
    return res.status(400).json({ success: false, error: "Données d'image ou mimeType manquants" });
  }

  try {
    const data = await GeminiService.scanReceiptImage(imageBase64, mimeType);
    res.json({ success: true, data });
  } catch (err: any) {
    console.error("Gemini Scan Receipt Route Error:", err);
    const msg = typeof err === "string" ? err : err?.message || "Une erreur est survenue lors du traitement par l'IA Gemini.";
    res.status(500).json({ success: false, error: msg });
  }
});

router.post("/gemini/scan-financial-pdf", requirePermission("manage_finances"), async (req, res) => {
  const { pdfBase64 } = req.body;
  if (!pdfBase64) {
    return res.status(400).json({ success: false, error: "Données PDF manquantes pour l'analyse" });
  }

  try {
    const data = await GeminiService.scanFinancialPdf(pdfBase64);
    res.json({ success: true, data });
  } catch (err: any) {
    console.error("Gemini Scan PDF Route Error:", err);
    const msg = typeof err === "string" ? err : err?.message || "Une erreur s'est produite lors de l'analyse du rapport PDF.";
    res.status(500).json({ success: false, error: msg });
  }
});

export default router;
