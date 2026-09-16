export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: 'Super Administrateur' | 'Administrateur' | 'Directeur' | 'Comptable' | 'Secrétaire' | 'Chercheur' | 'Visiteur';
  active: boolean;
  avatarUrl?: string;
  phone?: string;
  department?: string;
  function?: string;
  bio?: string;
  lastLogin?: string;
  createdAt?: string;
  isOnline?: boolean;
}

export interface News {
  id: string;
  title: string;
  content: string;
  date: string;
  author: string;
  image: string;
  category: string;
}

export interface FieldActivity {
  id: string;
  title: string;
  description: string;
  location: string;
  date: string;
  status: 'Planifié' | 'En cours' | 'Réalisé';
  budget: number;
  researchers: string[];
}

export interface Project {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  status: 'En cours' | 'Terminé' | 'Suspendu';
  budget: number;
  leader: string;
  funding: string;
}

export interface Publication {
  id: string;
  title: string;
  authors: string;
  journal: string;
  year: number;
  url: string;
  type: 'Article' | 'Livre' | 'Rapport' | 'Thèse';
}

export interface GalleryItem {
  id: string;
  title: string;
  description: string;
  type: 'photo' | 'video' | 'audio' | 'pdf';
  url: string;
  date: string;
}

export interface Partner {
  id: string;
  name: string;
  logo: string;
  website: string;
  type: 'Académique' | 'Financier' | 'Institutionnel';
}

export interface ContactMessage {
  id: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  message: string;
  date: string;
  readStatus: boolean;
}

export interface Recipe {
  id: string;
  description: string;
  source: string;
  amount: number;
  date: string;
  recordedBy: string;
  type: string;
}

export interface Expense {
  id: string;
  description: string;
  beneficiary: string;
  amount: number;
  date: string;
  recordedBy: string;
  category: string;
  receiptUrl?: string;
}

export interface Budget {
  year: number;
  totalBudget: number;
  allocatedResearch: number;
  allocatedLogistics: number;
  allocatedEquipment: number;
  allocatedPersonnel: number;
}

export interface Log {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface SiteSettings {
  id?: string;
  siteName: string;
  logo: string;
  favicon: string;
  address: string;
  phone: string;
  email: string;
  facebook: string;
  linkedin: string;
  twitter: string;
  youtube: string;
  github: string;
  whatsapp: string;
}

// ============================================================
// STRUCTURE BUDGÉTAIRE ARES (demandes de financement)
// ============================================================

export type BudgetCategory = 'INVESTISSEMENT' | 'FONCTIONNEMENT' | 'PERSONNEL' | 'EXPEDITION' | 'FRAIS_ADMIN';
export type TypeDeplacement = 'NORD_SUD' | 'SUD_SUD';
export type SousRubriqueBourse = 'D1_FORMATION_COURTE_DUREE' | 'D2_DOCTORAT_POSTDOCTORAT' | 'D3_FRAIS_GESTION_BOURSES' | 'D4_ALLOCATION_SUBSISTANCE';
export type TypeBourse = 'ETUDES' | 'DOCTORAT_POSTDOCTORAT' | 'RENFORCEMENT_CAPACITES_UNIVERSITE' | 'RENFORCEMENT_HE_ESA';
export type TypeMission = 'F1_DEPLACEMENT_INTERNE' | 'F2_DEPLACEMENT_LOCAL';
export type SousRubriqueFraisAdmin = 'J1_EN_BELGIQUE' | 'J2_DANS_LE_PAYS_PARTENAIRE';

export interface FundingApplication {
  id: string;
  type: string; // ex: "Amorce"
  titre: string;
  pays: string;
  coordonnateurNord: string;
  eesCoordonnateurNord: string;
  coordonnateurSud: string;
  eesCoordonnateurSud: string;
  dureeMois: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface BudgetLine {
  id: string;
  fundingApplicationId: string;
  category: BudgetCategory;
  sousRubrique: string;
  description?: string;
  anneeIndex: number;
  etp?: number;
  unite?: string;
  montantUnitaire: number;
  quantite: number;
  total: number;
  sousRubriqueFraisAdmin?: SousRubriqueFraisAdmin;
  montantDisponible?: number;
}

export interface BourseBudgetLine {
  id: string;
  fundingApplicationId: string;
  sousRubrique: SousRubriqueBourse;
  typeBourse: TypeBourse;
  description?: string;
  lieuSejour: string;
  anneeIndex: number;
  dureeMois: number;
  montantUnitaireMensuel: number;
  treizemeMois: number;
  fraisInscription: number;
  totalSubsistance: number;
  billetAvion: number;
  trajetAeroportBelgique: number;
  fraisVisaExceptionnel: number;
  fraisMissionIndirects: number;
  totalDeplacements: number;
}

export interface MissionBudgetLine {
  id: string;
  fundingApplicationId: string;
  typeMission: TypeMission;
  typeDeplacement: TypeDeplacement;
  description?: string;
  anneeIndex: number;
  dureeJours: number;
  billetAvion: number;
  deplacementLocal: number;
  totalDeplacement: number;
  montantUnitairePerDiem: number;
  totalPerDiem: number;
  montantUnitaireHotel: number;
  totalHotel: number;
  fraisGestionMission: number;
  fraisDeplacementIntl: number;
  totalFraisSejour: number;
  totalMontantMission: number;
}

export interface MontantApplicableBourse {
  id: string;
  typeBourse: TypeBourse;
  poste: string;
  valeur: string;
  ordre: number;
}

export interface Database {
  users: User[];
  news: News[];
  activities: FieldActivity[];
  projects: Project[];
  publications: Publication[];
  gallery: GalleryItem[];
  partners: Partner[];
  contactMessages: ContactMessage[];
  recipes: Recipe[];
  expenses: Expense[];
  budget: Budget;
  logs: Log[];
  settings?: SiteSettings;
  fundingApplications: FundingApplication[];
  budgetLines: BudgetLine[];
  bourseBudgetLines: BourseBudgetLine[];
  missionBudgetLines: MissionBudgetLine[];
  montantsApplicablesBourses: MontantApplicableBourse[];
}
