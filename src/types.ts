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
}
