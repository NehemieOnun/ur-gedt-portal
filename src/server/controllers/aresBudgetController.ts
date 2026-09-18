import { Response } from "express";
import { prisma } from "../config/prisma.js";
import {
  fundingApplicationSchema,
  budgetLineSchema,
  bourseBudgetLineSchema,
  missionBudgetLineSchema
} from "../validators/zodSchemas.js";
import {
  computeBudgetLineTotal,
  computeBourseTotals,
  computeMissionTotals,
  computeFraisAdministratifs
} from "../services/aresBudgetService.js";

function toNum(d: any): number {
  return d === null || d === undefined ? 0 : Number(d);
}

export class AresBudgetController {
  // ---------------------------------------------------------------------
  // Funding Applications (Fiche du projet)
  // ---------------------------------------------------------------------

  public static async listFundingApplications(req: any, res: Response) {
    try {
      const apps = await prisma.fundingApplication.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { budgetLines: true, bourseLines: true, missionLines: true } }
        }
      });
      res.json({ success: true, applications: apps });
    } catch (err: any) {
      console.error("listFundingApplications error:", err);
      res.status(503).json({ success: false, error: "Impossible de charger les fiches de financement." });
    }
  }

  public static async getFundingApplication(req: any, res: Response) {
    try {
      const app = await prisma.fundingApplication.findUnique({
        where: { id: req.params.id },
        include: { budgetLines: true, bourseLines: true, missionLines: true }
      });
      if (!app) {
        return res.status(404).json({ success: false, error: "Fiche de financement introuvable." });
      }
      res.json({ success: true, application: app });
    } catch (err: any) {
      console.error("getFundingApplication error:", err);
      res.status(503).json({ success: false, error: "Impossible de charger la fiche." });
    }
  }

  public static async createFundingApplication(req: any, res: Response) {
    try {
      const parsed = fundingApplicationSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: parsed.data ? "Données invalides." : parsed.error.issues[0].message });
      }
      const data = parsed.data;
      const created = await prisma.fundingApplication.create({
        data: {
          type: data.type,
          titre: data.titre,
          pays: data.pays,
          coordonnateurNord: data.coordonnateurNord,
          eesCoordonnateurNord: data.eesCoordonnateurNord,
          coordonnateurSud: data.coordonnateurSud,
          eesCoordonnateurSud: data.eesCoordonnateurSud,
          dureeMois: data.dureeMois
        }
      });

      await prisma.log.create({
        data: {
          userId: req.user?.id,
          userName: req.user?.email || "Système",
          userRole: req.user?.role || "Comptable",
          action: "Création Fiche ARES",
          details: `Création de la fiche de financement "${created.titre}" (${created.pays}).`,
          ip: req.ip || "127.0.0.1",
          userAgent: req.headers["user-agent"] || "unknown"
        }
      });

      res.json({ success: true, application: created });
    } catch (err: any) {
      console.error("createFundingApplication error:", err);
      res.status(500).json({ success: false, error: "Erreur lors de la création de la fiche." });
    }
  }

  public static async updateFundingApplication(req: any, res: Response) {
    try {
      const parsed = fundingApplicationSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: parsed.error.issues[0].message });
      }
      const data = parsed.data;
      const updated = await prisma.fundingApplication.update({
        where: { id: req.params.id },
        data: {
          type: data.type,
          titre: data.titre,
          pays: data.pays,
          coordonnateurNord: data.coordonnateurNord,
          eesCoordonnateurNord: data.eesCoordonnateurNord,
          coordonnateurSud: data.coordonnateurSud,
          eesCoordonnateurSud: data.eesCoordonnateurSud,
          dureeMois: data.dureeMois
        }
      });
      res.json({ success: true, application: updated });
    } catch (err: any) {
      console.error("updateFundingApplication error:", err);
      res.status(500).json({ success: false, error: "Erreur lors de la mise à jour de la fiche." });
    }
  }

  public static async deleteFundingApplication(req: any, res: Response) {
    try {
      await prisma.fundingApplication.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (err: any) {
      console.error("deleteFundingApplication error:", err);
      res.status(500).json({ success: false, error: "Erreur lors de la suppression de la fiche." });
    }
  }

  // ---------------------------------------------------------------------
  // Generic Budget Lines (Investissement, Fonctionnement, Personnel,
  // Expédition, Frais Admin)
  // ---------------------------------------------------------------------

  public static async upsertBudgetLine(req: any, res: Response) {
    try {
      const parsed = budgetLineSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: parsed.error.issues[0].message });
      }
      const d = parsed.data;
      const total = computeBudgetLineTotal(d.montantUnitaire, d.quantite);

      const payload = {
        fundingApplicationId: d.fundingApplicationId,
        category: d.category,
        sousRubrique: d.sousRubrique,
        description: d.description,
        anneeIndex: d.anneeIndex,
        montantUnitaire: d.montantUnitaire,
        quantite: d.quantite,
        total,
        etp: d.etp ?? null,
        unite: d.unite ?? null
      };

      const line = d.id
        ? await prisma.budgetLine.update({ where: { id: d.id }, data: payload })
        : await prisma.budgetLine.create({ data: payload });

      res.json({ success: true, line });
    } catch (err: any) {
      console.error("upsertBudgetLine error:", err);
      res.status(500).json({ success: false, error: "Erreur lors de l'enregistrement de la ligne budgétaire." });
    }
  }

  public static async deleteBudgetLine(req: any, res: Response) {
    try {
      await prisma.budgetLine.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (err: any) {
      console.error("deleteBudgetLine error:", err);
      res.status(500).json({ success: false, error: "Erreur lors de la suppression." });
    }
  }

  // ---------------------------------------------------------------------
  // Bourses
  // ---------------------------------------------------------------------

  public static async upsertBourseLine(req: any, res: Response) {
    try {
      const parsed = bourseBudgetLineSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: parsed.error.issues[0].message });
      }
      const d = parsed.data;
      const { totalAllocation, totalDeplacements } = computeBourseTotals(d);

      const payload = {
        fundingApplicationId: d.fundingApplicationId,
        sousRubrique: d.sousRubrique,
        description: d.description,
        lieuSejour: d.lieuSejour,
        anneeIndex: d.anneeIndex,
        dureeBourseMois: d.dureeBourseMois,
        montantUnitaireAlloc: d.montantUnitaireAlloc,
        treizemeMois: d.treizemeMois,
        fraisInscription: d.fraisInscription,
        totalAllocation,
        billetAvion: d.billetAvion,
        trajetAeroportBelgique: d.trajetAeroportBelgique,
        fraisVisa: d.fraisVisa,
        fraisMissionIndirects: d.fraisMissionIndirects,
        totalDeplacements
      };

      const line = d.id
        ? await prisma.bourseBudgetLine.update({ where: { id: d.id }, data: payload })
        : await prisma.bourseBudgetLine.create({ data: payload });

      res.json({ success: true, line });
    } catch (err: any) {
      console.error("upsertBourseLine error:", err);
      res.status(500).json({ success: false, error: "Erreur lors de l'enregistrement de la bourse." });
    }
  }

  public static async deleteBourseLine(req: any, res: Response) {
    try {
      await prisma.bourseBudgetLine.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (err: any) {
      console.error("deleteBourseLine error:", err);
      res.status(500).json({ success: false, error: "Erreur lors de la suppression." });
    }
  }

  // ---------------------------------------------------------------------
  // Missions
  // ---------------------------------------------------------------------

  public static async upsertMissionLine(req: any, res: Response) {
    try {
      const parsed = missionBudgetLineSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: parsed.error.issues[0].message });
      }
      const d = parsed.data;
      const totals = computeMissionTotals(d);

      const payload = {
        fundingApplicationId: d.fundingApplicationId,
        typeMission: d.typeMission,
        typeDeplacement: d.typeDeplacement,
        description: d.description,
        anneeIndex: d.anneeIndex,
        dureeJours: d.dureeJours,
        billetAvion: d.billetAvion,
        deplacementLocal: d.deplacementLocal,
        totalDeplacement: totals.totalDeplacement,
        perDiemUnitaire: d.perDiemUnitaire,
        totalPerDiem: totals.totalPerDiem,
        hotelUnitaire: d.hotelUnitaire,
        totalHotel: totals.totalHotel,
        fraisGestionAccueil: d.fraisGestionAccueil,
        fraisDeplacementsIntl: d.fraisDeplacementsIntl,
        totalFraisSejour: totals.totalFraisSejour,
        totalMontantMission: totals.totalMontantMission
      };

      const line = d.id
        ? await prisma.missionBudgetLine.update({ where: { id: d.id }, data: payload })
        : await prisma.missionBudgetLine.create({ data: payload });

      res.json({ success: true, line });
    } catch (err: any) {
      console.error("upsertMissionLine error:", err);
      res.status(500).json({ success: false, error: "Erreur lors de l'enregistrement de la mission." });
    }
  }

  public static async deleteMissionLine(req: any, res: Response) {
    try {
      await prisma.missionBudgetLine.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (err: any) {
      console.error("deleteMissionLine error:", err);
      res.status(500).json({ success: false, error: "Erreur lors de la suppression." });
    }
  }

  // ---------------------------------------------------------------------
  // Onglet Budget Synthèse — read-only aggregation query, not a stored table
  // ---------------------------------------------------------------------

  public static async getBudgetSynthese(req: any, res: Response) {
    try {
      const { id } = req.params;

      const [budgetLines, bourseLines, missionLines] = await Promise.all([
        prisma.budgetLine.findMany({ where: { fundingApplicationId: id } }),
        prisma.bourseBudgetLine.findMany({ where: { fundingApplicationId: id } }),
        prisma.missionBudgetLine.findMany({ where: { fundingApplicationId: id } })
      ]);

      const sumByCategory = (cat: string) =>
        budgetLines.filter((l) => l.category === cat).reduce((s, l) => s + toNum(l.total), 0);

      const totalInvestissement = sumByCategory("INVESTISSEMENT");
      const totalFonctionnement = sumByCategory("FONCTIONNEMENT");
      const totalPersonnel = sumByCategory("PERSONNEL");
      const totalExpedition = sumByCategory("EXPEDITION");

      const totalBourses = bourseLines.reduce(
        (s, l) => s + toNum(l.totalAllocation) + toNum(l.totalDeplacements),
        0
      );
      const totalMissions = missionLines.reduce((s, l) => s + toNum(l.totalMontantMission), 0);

      // "E8" — total frais de gestion des bourses (sous-rubrique D3)
      const fraisGestionBourses = bourseLines
        .filter((l) => l.sousRubrique === "D3")
        .reduce((s, l) => s + toNum(l.totalAllocation) + toNum(l.totalDeplacements), 0);
      // "G3" — total frais de gestion (accueil) des missions
      const fraisGestionMission = missionLines.reduce((s, l) => s + toNum(l.fraisGestionAccueil), 0);

      const totalDepensesAvantFA =
        totalInvestissement + totalFonctionnement + totalPersonnel + totalBourses + totalMissions + totalExpedition;

      const fraisAdministratifsTotal = computeFraisAdministratifs({
        totalDepenses: totalDepensesAvantFA,
        fraisGestionBourses,
        fraisGestionMission
      });

      // J1/J2 split is entered manually by category-J budget lines, if present
      const fraisAdminJ1 = sumByCategory("FRAIS_ADMIN"); // placeholder aggregate; UI splits by sousRubrique J1/J2 client-side from the raw lines

      const totalGeneral = totalDepensesAvantFA + fraisAdministratifsTotal;

      res.json({
        success: true,
        synthese: {
          A_investissement: totalInvestissement,
          B_fonctionnement: totalFonctionnement,
          C_personnel: totalPersonnel,
          D_bourses: totalBourses,
          E_missions: totalMissions,
          F_expedition: totalExpedition,
          G_fraisAdministratifs: fraisAdministratifsTotal,
          fraisAdminSaisiManuel: fraisAdminJ1,
          totalGeneral
        },
        rawLines: { budgetLines, bourseLines, missionLines }
      });
    } catch (err: any) {
      console.error("getBudgetSynthese error:", err);
      res.status(503).json({ success: false, error: "Impossible de calculer la synthèse budgétaire." });
    }
  }

  // ---------------------------------------------------------------------
  // Reference table — read-only barème
  // ---------------------------------------------------------------------

  public static async getMontantsApplicablesBourse(req: any, res: Response) {
    try {
      const baremes = await prisma.montantApplicableBourse.findMany();
      res.json({ success: true, baremes });
    } catch (err: any) {
      console.error("getMontantsApplicablesBourse error:", err);
      res.status(503).json({ success: false, error: "Impossible de charger le barème de référence." });
    }
  }
}
