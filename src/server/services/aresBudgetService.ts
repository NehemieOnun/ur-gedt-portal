/**
 * Calculation logic for the ARES funding budget module. Kept server-side only
 * (never trust client-computed totals) per the spec's explicit recommendation:
 * "Implémenter côté serveur (pas seulement front) le calcul des Frais
 * administratifs pour éviter toute incohérence."
 *
 * All monetary values are handled as plain numbers here; the controller is
 * responsible for converting to/from Prisma's Decimal type at the DB boundary.
 */

export interface BourseLineInput {
  dureeBourseMois: number;
  montantUnitaireAlloc: number;
  treizemeMois: number;
  fraisInscription: number;
  billetAvion: number;
  trajetAeroportBelgique: number;
  fraisVisa: number;
  fraisMissionIndirects: number;
}

export interface BourseLineTotals {
  totalAllocation: number;
  totalDeplacements: number;
}

/**
 * Bloc "Allocation de subsistance" = durée × montant unitaire, plus le 13e
 * mois et les frais d'inscription forfaitaires (non multipliés par la durée).
 * Bloc "Déplacements des boursiers" = somme simple des 4 postes.
 */
export function computeBourseTotals(line: BourseLineInput): BourseLineTotals {
  const totalAllocation =
    line.dureeBourseMois * line.montantUnitaireAlloc +
    line.treizemeMois +
    line.fraisInscription;

  const totalDeplacements =
    line.billetAvion +
    line.trajetAeroportBelgique +
    line.fraisVisa +
    line.fraisMissionIndirects;

  return { totalAllocation, totalDeplacements };
}

export interface MissionLineInput {
  dureeJours: number;
  billetAvion: number;
  deplacementLocal: number;
  perDiemUnitaire: number;
  hotelUnitaire: number;
  fraisGestionAccueil: number;
  fraisDeplacementsIntl: number;
}

export interface MissionLineTotals {
  totalDeplacement: number;
  totalPerDiem: number;
  totalHotel: number;
  totalFraisSejour: number;
  totalMontantMission: number;
}

export function computeMissionTotals(line: MissionLineInput): MissionLineTotals {
  const totalDeplacement = line.billetAvion + line.deplacementLocal;
  const totalPerDiem = line.perDiemUnitaire * line.dureeJours;
  const totalHotel = line.hotelUnitaire * line.dureeJours;
  const totalFraisSejour = totalPerDiem + totalHotel;
  const totalMontantMission =
    totalDeplacement + totalFraisSejour + line.fraisGestionAccueil + line.fraisDeplacementsIntl;

  return { totalDeplacement, totalPerDiem, totalHotel, totalFraisSejour, totalMontantMission };
}

export function computeBudgetLineTotal(montantUnitaire: number, quantite: number): number {
  return montantUnitaire * quantite;
}

/**
 * Frais administratifs (Onglet J), reproduced exactly per the spec:
 *   FA = ((TotalDépenses − (FraisGestionE8 − FraisGestionG3)) × 10%)
 *        − (FraisGestionE8 − FraisGestionG3)
 *
 * NOTE on E8/G3: these are cell references from the original ARES Excel
 * template that the source spec did not fully define outside that sheet.
 * Interpreted here as: E8 = total "frais de gestion des bourses" (sous-
 * rubrique D3 across BourseBudgetLine), G3 = total "frais de gestion
 * (accueil)" from MissionBudgetLine. If the real template defines these
 * differently, adjust fraisGestionBourses/fraisGestionMission below —
 * the rest of the formula (and everywhere it's used) will still be correct.
 */
export function computeFraisAdministratifs(params: {
  totalDepenses: number;
  fraisGestionBourses: number; // "E8" — sum of BourseBudgetLine D3 lines
  fraisGestionMission: number; // "G3" — sum of MissionBudgetLine.fraisGestionAccueil
}): number {
  const { totalDepenses, fraisGestionBourses, fraisGestionMission } = params;
  const diff = fraisGestionBourses - fraisGestionMission;
  return (totalDepenses - diff) * 0.10 - diff;
}
