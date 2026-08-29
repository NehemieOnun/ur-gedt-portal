import { Database } from "../types";

export const DEFAULT_DATABASE: Database = {
  users: [
    {
      id: "u-1",
      name: "Prof. Maurice Ntububa",
      email: "directeur@urgedt.org",
      role: "Directeur",
      active: true,
      isOnline: true,
      lastLogin: "Aujourd'hui à 09:15",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80"
    },
    {
      id: "u-2",
      name: "Madame Celine",
      email: "comptable@urgedt.org",
      role: "Comptable",
      active: true,
      isOnline: false,
      lastLogin: "Hier à 16:45",
      avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80"
    },
    {
      id: "u-3",
      name: "Mr Antoine",
      email: "secretaire@urgedt.org",
      role: "Secrétaire",
      active: true,
      isOnline: true,
      lastLogin: "Aujourd'hui à 08:30",
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80"
    },
    {
      id: "u-4",
      name: "Albert Ankwanda",
      email: "chercheur@urgedt.org",
      role: "Chercheur",
      active: true,
      isOnline: false,
      lastLogin: "Il y a 2 jours",
      avatarUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80"
    },
    {
      id: "u-5",
      name: "Admin UR-GEDT",
      email: "admin@urgedt.org",
      role: "Administrateur",
      active: true,
      isOnline: true,
      lastLogin: "Session active (en ligne)",
      avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80"
    },
    {
      id: "u-17",
      name: "Dr. Alain Mbayo",
      email: "a.mbayo@urgedt.org",
      role: "Chercheur",
      active: true,
      avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80"
    }
  ],
  news: [
    {
      id: "news-1",
      title: "Lancement de l'étude sur l'impact socio-environnemental de l'extraction de Cobalt",
      content: "L'Unité de Recherche UR-GEDT de l'Université de Lubumbashi démarre une vaste enquête de terrain auprès des communautés riveraines des zones minières du Haut-Katanga pour analyser les mutations sociales et économiques.",
      date: "2026-07-20",
      author: "Prof. Maurice Ntububa",
      image: "https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=800&q=80",
      category: "Recherche"
    },
    {
      id: "news-2",
      title: "Signature d'un accord de partenariat stratégique avec la Vrije Universiteit Brussel",
      content: "Une délégation de l'UNILU conduite par la direction de l'UR-GEDT a finalisé à Bruxelles un accord de mobilité académique et de co-tutelle de thèse portant sur la gouvernance environnementale.",
      date: "2026-07-15",
      author: "Secrétariat UR-GEDT",
      image: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=800&q=80",
      category: "Partenariat"
    },
    {
      id: "news-3",
      title: "Symposium International : 'Transition Énergétique et Inégalités Territoriales'",
      content: "Retenez la date du 15 au 17 Novembre 2026. L'UR-GEDT réunira plus de 150 chercheurs africains et internationaux à Lubumbashi pour débattre de la gouvernance des ressources stratégiques.",
      date: "2026-07-02",
      author: "Albert Ankwanda",
      image: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=800&q=80",
      category: "Événement"
    }
  ],
  activities: [
    {
      id: "act-1",
      title: "Enquête de ménages - Bassin Minier de Kolwezi",
      description: "Collecte de données quantitatives auprès de 500 ménages sur la qualité de l'eau et les revenus agricoles.",
      location: "Kolwezi, Lualaba",
      date: "2026-08-05",
      status: "Planifié",
      budget: 12500,
      researchers: ["Albert Ankwanda", "Mr Antoine"]
    },
    {
      id: "act-2",
      title: "Atelier de restitution avec les acteurs de la société civile",
      description: "Présentation des résultats préliminaires sur la déforestation autour du parc Kundelungu.",
      location: "Grand Hôtel Karavia, Lubumbashi",
      date: "2026-06-18",
      status: "Réalisé",
      budget: 4800,
      researchers: ["Prof. Maurice Ntububa"]
    }
  ],
  projects: [
    {
      id: "proj-1",
      title: "Gouvernance Minière & Transition Sociale au Katanga (GOMITRANS)",
      description: "Projet plurisdisciplinaire visant à analyser les flux financiers miniers et la redistribution locale des redevances.",
      startDate: "2025-01-15",
      endDate: "2027-12-31",
      status: "En cours",
      budget: 150000,
      leader: "Prof. Maurice Ntububa",
      funding: "VLIR-UOS & UNILU"
    },
    {
      id: "proj-2",
      title: "Observatoire des Dynamiques Écologiques et Urbaines de Lubumbashi (ODEUL)",
      description: "Mise en place d'un SIG participatif et d'une station de suivi de la pollution de l'air urbain.",
      startDate: "2024-06-01",
      endDate: "2026-11-30",
      status: "En cours",
      budget: 85000,
      leader: "Albert Ankwanda",
      funding: "Fondation Groupe Banque Mondiale"
    }
  ],
  publications: [
    {
      id: "pub-1",
      title: "Mining dynamics and local governance in Haut-Katanga: A spatial political economy approach",
      authors: "Ntububa, M., Ankwanda, A. & Devos, M.",
      journal: "Journal of Resource Policy & Governance",
      year: 2025,
      url: "https://doi.org/10.1016/j.resourpol.2025.10283",
      type: "Article"
    },
    {
      id: "pub-2",
      title: "Déforestation et sécurité alimentaire autour des grands centres urbains du Sud-Congo",
      authors: "Ankwanda, A. & Mbuyi, R.",
      journal: "Éditions Universitaires de Lubumbashi",
      year: 2024,
      url: "https://urgedt.org/publications/2024-deforestation.pdf",
      type: "Livre"
    }
  ],
  gallery: [
    {
      id: "gal-1",
      title: "Prélèvements d'échantillons d'eau à Kipushi",
      description: "Mission scientifique sur le site d'analyse de la contamination aquatique.",
      type: "photo",
      url: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=800&q=80",
      date: "2026-05-12"
    },
    {
      id: "gal-2",
      title: "Rapport d'Évaluation Environnementale 2025 (PDF)",
      description: "Document de synthèse téléchargeable en accès libre.",
      type: "pdf",
      url: "https://urgedt.org/docs/rapport-2025.pdf",
      date: "2026-01-10"
    }
  ],
  partners: [
    {
      id: "part-1",
      name: "Université de Lubumbashi (UNILU)",
      logo: "/logo.jpg",
      website: "https://unilu.ac.cd",
      type: "Académique"
    },
    {
      id: "part-2",
      name: "Vrije Universiteit Brussel (VUB)",
      logo: "https://images.unsplash.com/photo-1592280771190-3e2e4d571952?auto=format&fit=crop&w=200&q=80",
      website: "https://vub.be",
      type: "Académique"
    },
    {
      id: "part-3",
      name: "Coopération Belge au Développement (VLIR-UOS)",
      logo: "https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=200&q=80",
      website: "https://vliruos.be",
      type: "Financier"
    }
  ],
  contactMessages: [
    {
      id: "msg-1",
      senderName: "Dr. Marc Vangilbergen",
      senderEmail: "m.vangilbergen@vub.be",
      subject: "Demande de collaboration pour l'appel à projets Horizon Europe",
      message: "Chers collègues de l'UR-GEDT, nous aimerions intégrer votre équipe au consortium pour la soumission du projet sur les minéraux critiques.",
      date: "2026-07-28",
      readStatus: false
    }
  ],
  recipes: [
    {
      id: "rec-1",
      description: "Dotation institutionnelle UNILU - 3ème Trimestre 2026",
      source: "Rectorat UNILU",
      amount: 45000,
      date: "2026-07-01",
      recordedBy: "Madame Celine",
      type: "Subvention"
    }
  ],
  expenses: [
    {
      id: "exp-1",
      description: "Achat de consommables de laboratoire et réactifs",
      beneficiary: "Congo Lab Tech SARL",
      amount: 3200,
      date: "2026-07-10",
      recordedBy: "Madame Celine",
      category: "Équipement"
    }
  ],
  budget: {
    year: 2026,
    totalBudget: 120000,
    allocatedResearch: 55000,
    allocatedLogistics: 25000,
    allocatedEquipment: 25000,
    allocatedPersonnel: 15000
  },
  logs: [
    {
      id: "log-1",
      userId: "u-1",
      userName: "Prof. Maurice Ntububa",
      userRole: "Directeur",
      action: "Initialisation Système",
      details: "Démarrage de la plateforme UR-GEDT",
      timestamp: new Date().toISOString()
    }
  ],
  settings: {
    siteName: "UR-GEDT Portal & Management System",
    logo: "/logo.jpg",
    favicon: "/favicon.ico",
    address: "Campus de Kasapa, Route de Kasapa, B.P. 1825 Lubumbashi, RDC",
    phone: "+243 990 000 000",
    email: "contact@urgedt-unilu.org",
    facebook: "https://facebook.com/urgedt.unilu",
    linkedin: "https://linkedin.com/company/urgedt-unilu",
    twitter: "https://x.com/urgedt_unilu",
    youtube: "https://youtube.com/@urgedt_unilu",
    github: "https://github.com/urgedt-unilu",
    whatsapp: "https://wa.me/243990000000"
  }
};
