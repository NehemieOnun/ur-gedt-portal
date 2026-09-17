import React, { useState, useEffect, useCallback, ReactElement } from "react";
import { motion } from "motion/react";
import {
  Plus, Trash2, Edit, X, FileText, Plane, Users, GraduationCap,
  Package, Receipt, PieChart, Loader2, Building2
} from "lucide-react";
import { apiFetch } from "../utils/apiClient";
import { ToastMessage } from "./ToastContainer";

interface AresBudgetManagerProps {
  addToast: (message: string, type: ToastMessage["type"], title?: string) => void;
}

interface FundingApplication {
  id: string;
  type: string;
  titre: string;
  pays: string;
  coordonnateurNord: string;
  eesCoordonnateurNord: string;
  coordonnateurSud: string;
  eesCoordonnateurSud: string;
  dureeMois: number;
  budgetLines?: any[];
  bourseLines?: any[];
  missionLines?: any[];
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: ReactElement; sousRubriques: { value: string; label: string }[]; hasPersonnelFields?: boolean; hideQuantite?: boolean }> = {
  INVESTISSEMENT: {
    label: "B. Investissement",
    icon: <Package className="h-4 w-4" />,
    sousRubriques: [
      { value: "A1", label: "A1 — Matériels" },
      { value: "A2", label: "A2 — Équipements" },
      { value: "A3", label: "A3 — Véhicules" },
      { value: "A4", label: "A4 — Autres" }
    ]
  },
  FONCTIONNEMENT: {
    label: "C. Fonctionnement",
    icon: <Building2 className="h-4 w-4" />,
    sousRubriques: [
      { value: "B1", label: "B1 — Généraux ou exceptionnels" },
      { value: "B2", label: "B2 — Communication et diffusion" },
      { value: "B3", label: "B3 — Frais participation aux séminaires" },
      { value: "B4", label: "B4 — Consultation locale de coordination" },
      { value: "B5", label: "B5 — Carburant" },
      { value: "B6", label: "B6 — Assurances" },
      { value: "B7", label: "B7 — Consommables" },
      { value: "B8", label: "B8 — Autres (honoraires, etc.)" }
    ]
  },
  PERSONNEL: {
    label: "D. Personnel",
    icon: <Users className="h-4 w-4" />,
    hasPersonnelFields: true,
    sousRubriques: [
      { value: "C1", label: "C1 — Rémunération du personnel local" },
      { value: "C2", label: "C2 — Rémunération du personnel du nord" }
    ]
  },
  EXPEDITION: {
    label: "H. Expédition",
    icon: <FileText className="h-4 w-4" />,
    hideQuantite: true,
    sousRubriques: [{ value: "H1", label: "H1 — Expédition" }]
  },
  FRAIS_ADMIN: {
    label: "J. Frais Administratifs",
    icon: <Receipt className="h-4 w-4" />,
    hideQuantite: true,
    sousRubriques: [
      { value: "J1", label: "J1 — En Belgique" },
      { value: "J2", label: "J2 — Dans le pays partenaire" }
    ]
  }
};

const BOURSE_SOUS_RUBRIQUES = [
  { value: "D1", label: "D1 — Formation de courte durée au Nord/Sud" },
  { value: "D2", label: "D2 — Doctorat/postdoctorat" },
  { value: "D3", label: "D3 — Frais de gestion des bourses" },
  { value: "D4", label: "D4 — Allocation de subsistance" }
];

const MISSION_TYPES = [
  { value: "F1", label: "F1 — Déplacements internes (planification, 1er terrain, coordination)" },
  { value: "F2", label: "F2 — Déplacements locaux (recherche de terrain)" }
];

function fmt(n: any): string {
  return (Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function AresBudgetManager({ addToast }: AresBudgetManagerProps) {
  const [applications, setApplications] = useState<FundingApplication[]>([]);
  const [selectedApp, setSelectedApp] = useState<FundingApplication | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<string>("fiche");
  const [isLoading, setIsLoading] = useState(true);
  const [isAppFormOpen, setIsAppFormOpen] = useState(false);
  const [synthese, setSynthese] = useState<any>(null);
  const [baremes, setBaremes] = useState<any[]>([]);

  const loadApplications = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch("/api/ares/applications");
      const data = await res.json();
      if (data.success) setApplications(data.applications || []);
    } catch {
      addToast("Impossible de charger les fiches de financement.", "error", "Budget ARES");
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  const loadApplicationDetail = useCallback(async (id: string) => {
    try {
      const res = await apiFetch(`/api/ares/applications/${id}`);
      const data = await res.json();
      if (data.success) setSelectedApp(data.application);
    } catch {
      addToast("Impossible de charger la fiche.", "error", "Budget ARES");
    }
  }, [addToast]);

  const loadSynthese = useCallback(async (id: string) => {
    try {
      const res = await apiFetch(`/api/ares/applications/${id}/synthese`);
      const data = await res.json();
      if (data.success) setSynthese(data.synthese);
    } catch {
      addToast("Impossible de calculer la synthèse.", "error", "Budget ARES");
    }
  }, [addToast]);

  useEffect(() => {
    loadApplications();
    apiFetch("/api/ares/baremes-bourse").then(res => res.json()).then(data => {
      if (data.success) setBaremes(data.baremes || []);
    }).catch(() => {});
  }, [loadApplications]);

  useEffect(() => {
    if (selectedApp && activeSubTab === "synthese") {
      loadSynthese(selectedApp.id);
    }
  }, [selectedApp, activeSubTab, loadSynthese]);

  const handleSelectApp = (app: FundingApplication) => {
    loadApplicationDetail(app.id);
    setActiveSubTab("fiche");
  };

  const handleDeleteApp = async (id: string) => {
    if (!window.confirm("Supprimer définitivement cette fiche de financement et toutes ses lignes budgétaires ?")) return;
    try {
      const res = await apiFetch(`/api/ares/applications/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        addToast("Fiche de financement supprimée.", "success", "Budget ARES");
        if (selectedApp?.id === id) setSelectedApp(null);
        loadApplications();
      } else {
        addToast(data.error || "Échec de la suppression.", "error", "Budget ARES");
      }
    } catch {
      addToast("Erreur de connexion au serveur.", "error", "Budget ARES");
    }
  };

  const refreshSelected = () => {
    if (selectedApp) loadApplicationDetail(selectedApp.id);
    loadApplications();
  };

  const subTabs = [
    { id: "fiche", label: "Fiche du Projet", icon: <FileText className="h-4 w-4" /> },
    { id: "INVESTISSEMENT", label: "Investissement", icon: <Package className="h-4 w-4" /> },
    { id: "FONCTIONNEMENT", label: "Fonctionnement", icon: <Building2 className="h-4 w-4" /> },
    { id: "PERSONNEL", label: "Personnel", icon: <Users className="h-4 w-4" /> },
    { id: "bourses", label: "Bourses", icon: <GraduationCap className="h-4 w-4" /> },
    { id: "missions", label: "Missions", icon: <Plane className="h-4 w-4" /> },
    { id: "EXPEDITION", label: "Expédition", icon: <FileText className="h-4 w-4" /> },
    { id: "FRAIS_ADMIN", label: "Frais Admin", icon: <Receipt className="h-4 w-4" /> },
    { id: "synthese", label: "Synthèse", icon: <PieChart className="h-4 w-4" /> }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-black text-white">Budget ARES — Fiches de Financement</h2>
          <p className="text-xs text-slate-400 mt-1">Structure budgétaire détaillée par projet (Investissement, Fonctionnement, Personnel, Bourses, Missions, Expédition, Frais Administratifs).</p>
        </div>
        <button
          onClick={() => setIsAppFormOpen(true)}
          className="flex items-center space-x-2 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-lg"
        >
          <Plus className="h-4 w-4" />
          <span>Nouvelle Fiche de Financement</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-10 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : applications.length === 0 ? (
            <p className="text-xs text-slate-500 italic p-4 bg-[#12261C] rounded-xl border border-white/10">
              Aucune fiche de financement pour l'instant.
            </p>
          ) : (
            applications.map((app) => (
              <div
                key={app.id}
                onClick={() => handleSelectApp(app)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  selectedApp?.id === app.id
                    ? "bg-[#D4AF37]/10 border-[#D4AF37]/50"
                    : "bg-[#12261C] border-white/10 hover:border-white/30"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">{app.titre}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{app.pays} · {app.dureeMois} mois · {app.type}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteApp(app.id); }}
                    className="text-slate-500 hover:text-red-400 shrink-0 cursor-pointer"
                    title="Supprimer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="lg:col-span-3">
          {!selectedApp ? (
            <div className="h-full flex items-center justify-center p-10 bg-[#12261C] rounded-2xl border border-white/10 text-slate-500 text-sm">
              Sélectionnez une fiche de financement à gauche, ou créez-en une nouvelle.
            </div>
          ) : (
            <div className="bg-[#12261C] rounded-2xl border border-white/10 overflow-hidden">
              <div className="flex flex-wrap gap-1 p-2 bg-black/20 border-b border-white/10 overflow-x-auto">
                {subTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveSubTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      activeSubTab === tab.id ? "bg-[#D4AF37] text-black" : "text-slate-300 hover:bg-white/5"
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              <div className="p-5">
                {activeSubTab === "fiche" && (
                  <FicheProjetView app={selectedApp} onUpdated={refreshSelected} addToast={addToast} />
                )}

                {["INVESTISSEMENT", "FONCTIONNEMENT", "PERSONNEL", "EXPEDITION", "FRAIS_ADMIN"].includes(activeSubTab) && (
                  <BudgetLineTableView
                    category={activeSubTab}
                    app={selectedApp}
                    onRefresh={refreshSelected}
                    addToast={addToast}
                  />
                )}

                {activeSubTab === "bourses" && (
                  <BourseTableView app={selectedApp} onRefresh={refreshSelected} addToast={addToast} baremes={baremes} />
                )}

                {activeSubTab === "missions" && (
                  <MissionTableView app={selectedApp} onRefresh={refreshSelected} addToast={addToast} />
                )}

                {activeSubTab === "synthese" && (
                  <SyntheseView synthese={synthese} app={selectedApp} />
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {isAppFormOpen && (
        <FundingApplicationFormModal
          onClose={() => setIsAppFormOpen(false)}
          onCreated={(app: FundingApplication) => {
            setIsAppFormOpen(false);
            loadApplications();
            handleSelectApp(app);
            addToast(`Fiche "${app.titre}" créée avec succès.`, "success", "Budget ARES");
          }}
          addToast={addToast}
        />
      )}
    </div>
  );
}

function FicheProjetView({ app, onUpdated, addToast }: { app: FundingApplication; onUpdated: () => void; addToast: any }) {
  const [form, setForm] = useState({ ...app });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { setForm({ ...app }); }, [app.id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await apiFetch(`/api/ares/applications/${app.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.success) {
        addToast("Fiche du projet mise à jour.", "success", "Budget ARES");
        onUpdated();
      } else {
        addToast(data.error || "Échec de la mise à jour.", "error", "Budget ARES");
      }
    } catch {
      addToast("Erreur de connexion au serveur.", "error", "Budget ARES");
    } finally {
      setIsSaving(false);
    }
  };

  const field = (key: keyof typeof form, label: string, type: string = "text") => (
    <div className="space-y-1">
      <label className="block text-[11px] font-bold text-slate-400 uppercase font-mono">{label}</label>
      <input
        type={type}
        value={(form as any)[key] ?? ""}
        onChange={(e) => setForm({ ...form, [key]: type === "number" ? parseFloat(e.target.value) || 0 : e.target.value })}
        className="w-full bg-[#0d0d0d] border border-white/10 focus:border-[#D4AF37] rounded-lg p-2.5 text-sm text-white focus:outline-none"
      />
    </div>
  );

  return (
    <form onSubmit={handleSave} className="space-y-4 max-w-3xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="block text-[11px] font-bold text-slate-400 uppercase font-mono">Type</label>
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="w-full bg-[#0d0d0d] border border-white/10 focus:border-[#D4AF37] rounded-lg p-2.5 text-sm text-white focus:outline-none"
          >
            <option value="AMORCE">Amorce</option>
            <option value="PROJET_PILOTE">Projet Pilote</option>
            <option value="PROJET_STANDARD">Projet Standard</option>
          </select>
        </div>
        {field("titre", "Titre du projet")}
        {field("pays", "Pays")}
        {field("dureeMois", "Durée du projet (mois)", "number")}
        {field("coordonnateurNord", "Coordonnateur Nord")}
        {field("eesCoordonnateurNord", "EES Coordonnateur Nord")}
        {field("coordonnateurSud", "Coordonnateur Sud")}
        {field("eesCoordonnateurSud", "EES Coordonnateur Sud")}
      </div>
      <button
        type="submit"
        disabled={isSaving}
        className="flex items-center space-x-2 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer disabled:opacity-50"
      >
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Edit className="h-4 w-4" />}
        <span>Enregistrer</span>
      </button>
    </form>
  );
}

function FundingApplicationFormModal({ onClose, onCreated, addToast }: { onClose: () => void; onCreated: (app: any) => void; addToast: any }) {
  const [form, setForm] = useState({
    type: "AMORCE", titre: "", pays: "", coordonnateurNord: "", eesCoordonnateurNord: "",
    coordonnateurSud: "", eesCoordonnateurSud: "", dureeMois: 24
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await apiFetch("/api/ares/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.success) {
        onCreated(data.application);
      } else {
        addToast(data.error || "Échec de la création.", "error", "Budget ARES");
      }
    } catch {
      addToast("Erreur de connexion au serveur.", "error", "Budget ARES");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-[#121212] border border-white/10 rounded-2xl max-w-xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto my-4 sm:my-8"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-black text-white">Nouvelle Fiche de Financement</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-400 uppercase font-mono">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full bg-[#0d0d0d] border border-white/10 focus:border-[#D4AF37] rounded-lg p-2.5 text-sm text-white focus:outline-none"
              >
                <option value="AMORCE">Amorce</option>
                <option value="PROJET_PILOTE">Projet Pilote</option>
                <option value="PROJET_STANDARD">Projet Standard</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-400 uppercase font-mono">Titre du projet *</label>
              <input required value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} className="w-full bg-[#0d0d0d] border border-white/10 focus:border-[#D4AF37] rounded-lg p-2.5 text-sm text-white focus:outline-none" />
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-400 uppercase font-mono">Pays *</label>
              <input required value={form.pays} onChange={(e) => setForm({ ...form, pays: e.target.value })} className="w-full bg-[#0d0d0d] border border-white/10 focus:border-[#D4AF37] rounded-lg p-2.5 text-sm text-white focus:outline-none" />
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-400 uppercase font-mono">Durée du projet (mois) *</label>
              <input required type="number" min={1} value={form.dureeMois} onChange={(e) => setForm({ ...form, dureeMois: parseInt(e.target.value) || 24 })} className="w-full bg-[#0d0d0d] border border-white/10 focus:border-[#D4AF37] rounded-lg p-2.5 text-sm text-white focus:outline-none" />
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-400 uppercase font-mono">Coordonnateur Nord *</label>
              <input required value={form.coordonnateurNord} onChange={(e) => setForm({ ...form, coordonnateurNord: e.target.value })} className="w-full bg-[#0d0d0d] border border-white/10 focus:border-[#D4AF37] rounded-lg p-2.5 text-sm text-white focus:outline-none" />
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-400 uppercase font-mono">EES Coordonnateur Nord *</label>
              <input required value={form.eesCoordonnateurNord} onChange={(e) => setForm({ ...form, eesCoordonnateurNord: e.target.value })} className="w-full bg-[#0d0d0d] border border-white/10 focus:border-[#D4AF37] rounded-lg p-2.5 text-sm text-white focus:outline-none" />
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-400 uppercase font-mono">Coordonnateur Sud *</label>
              <input required value={form.coordonnateurSud} onChange={(e) => setForm({ ...form, coordonnateurSud: e.target.value })} className="w-full bg-[#0d0d0d] border border-white/10 focus:border-[#D4AF37] rounded-lg p-2.5 text-sm text-white focus:outline-none" />
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-400 uppercase font-mono">EES Coordonnateur Sud *</label>
              <input required value={form.eesCoordonnateurSud} onChange={(e) => setForm({ ...form, eesCoordonnateurSud: e.target.value })} className="w-full bg-[#0d0d0d] border border-white/10 focus:border-[#D4AF37] rounded-lg p-2.5 text-sm text-white focus:outline-none" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-bold text-slate-300 hover:bg-white/5 cursor-pointer">Annuler</button>
            <button type="submit" disabled={isSaving} className="flex items-center space-x-2 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black px-4 py-2 rounded-lg text-xs font-black cursor-pointer disabled:opacity-50">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              <span>Créer</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function BudgetLineTableView({ category, app, onRefresh, addToast }: { category: string; app: FundingApplication; onRefresh: () => void; addToast: any }) {
  const config = CATEGORY_CONFIG[category];
  const lines = (app.budgetLines || []).filter((l) => l.category === category);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLine, setEditingLine] = useState<any>(null);

  const totalCategory = lines.reduce((s, l) => s + (Number(l.total) || 0), 0);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Supprimer cette ligne budgétaire ?")) return;
    try {
      const res = await apiFetch(`/api/ares/budget-lines/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        addToast("Ligne supprimée.", "success", "Budget ARES");
        onRefresh();
      }
    } catch {
      addToast("Erreur de connexion au serveur.", "error", "Budget ARES");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">{config.icon}<span>{config.label}</span></h3>
        <button
          onClick={() => { setEditingLine(null); setIsFormOpen(true); }}
          className="flex items-center space-x-1.5 bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/40 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-[#D4AF37]/25 transition-all cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Ajouter une ligne</span>
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-xs">
          <thead className="bg-black/30 text-slate-400">
            <tr>
              <th className="p-2.5 text-left">Sous-rubrique</th>
              <th className="p-2.5 text-left">Description</th>
              <th className="p-2.5 text-left">Année</th>
              {config.hasPersonnelFields && <th className="p-2.5 text-left">ETP</th>}
              <th className="p-2.5 text-right">Montant unit.</th>
              {!config.hideQuantite && <th className="p-2.5 text-right">Qté</th>}
              <th className="p-2.5 text-right">Total</th>
              <th className="p-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr><td colSpan={8} className="p-4 text-center text-slate-500 italic">Aucune ligne pour cette catégorie.</td></tr>
            ) : lines.map((line) => (
              <tr key={line.id} className="border-t border-white/5 text-slate-300 hover:bg-white/[0.02]">
                <td className="p-2.5 font-mono">{line.sousRubrique}</td>
                <td className="p-2.5">{line.description}</td>
                <td className="p-2.5">Année {line.anneeIndex}</td>
                {config.hasPersonnelFields && <td className="p-2.5">{line.etp || "—"}</td>}
                <td className="p-2.5 text-right font-mono">{fmt(line.montantUnitaire)} €</td>
                {!config.hideQuantite && <td className="p-2.5 text-right font-mono">{line.quantite}</td>}
                <td className="p-2.5 text-right font-mono font-bold text-[#D4AF37]">{fmt(line.total)} €</td>
                <td className="p-2.5">
                  <div className="flex items-center gap-2 justify-end">
                    <button onClick={() => { setEditingLine(line); setIsFormOpen(true); }} className="text-slate-400 hover:text-white cursor-pointer"><Edit className="h-3.5 w-3.5" /></button>
                    <button onClick={() => handleDelete(line.id)} className="text-slate-400 hover:text-red-400 cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          {lines.length > 0 && (
            <tfoot>
              <tr className="border-t border-white/10 bg-black/20 font-bold">
                <td colSpan={config.hasPersonnelFields ? (config.hideQuantite ? 5 : 6) : (config.hideQuantite ? 4 : 5)} className="p-2.5 text-right text-slate-400">TOTAL {config.label.split(". ")[1] || config.label}</td>
                <td className="p-2.5 text-right font-mono text-[#D4AF37]">{fmt(totalCategory)} €</td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {isFormOpen && (
        <BudgetLineFormModal
          category={category}
          config={config}
          fundingApplicationId={app.id}
          existing={editingLine}
          onClose={() => setIsFormOpen(false)}
          onSaved={() => { setIsFormOpen(false); onRefresh(); }}
          addToast={addToast}
        />
      )}
    </div>
  );
}

function BudgetLineFormModal({ category, config, fundingApplicationId, existing, onClose, onSaved, addToast }: any) {
  const [form, setForm] = useState(existing || {
    fundingApplicationId, category, sousRubrique: config.sousRubriques[0]?.value || "",
    description: "", anneeIndex: 1, montantUnitaire: 0, quantite: 1, etp: 0, unite: ""
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await apiFetch("/api/ares/budget-lines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, fundingApplicationId, category, quantite: config.hideQuantite ? 1 : form.quantite })
      });
      const data = await res.json();
      if (data.success) {
        addToast("Ligne enregistrée.", "success", "Budget ARES");
        onSaved();
      } else {
        addToast(data.error || "Échec de l'enregistrement.", "error", "Budget ARES");
      }
    } catch {
      addToast("Erreur de connexion au serveur.", "error", "Budget ARES");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-[#121212] border border-white/10 rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto my-4 sm:my-8"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-black text-white">{existing ? "Modifier" : "Ajouter"} une ligne — {config.label}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-400 uppercase font-mono">Sous-rubrique</label>
            <select value={form.sousRubrique} onChange={(e) => setForm({ ...form, sousRubrique: e.target.value })} className="w-full bg-[#0d0d0d] border border-white/10 focus:border-[#D4AF37] rounded-lg p-2.5 text-sm text-white focus:outline-none">
              {config.sousRubriques.map((sr: any) => <option key={sr.value} value={sr.value}>{sr.label}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-400 uppercase font-mono">Description</label>
            <input required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full bg-[#0d0d0d] border border-white/10 focus:border-[#D4AF37] rounded-lg p-2.5 text-sm text-white focus:outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-400 uppercase font-mono">Année</label>
              <input required type="number" min={1} value={form.anneeIndex} onChange={(e) => setForm({ ...form, anneeIndex: parseInt(e.target.value) || 1 })} className="w-full bg-[#0d0d0d] border border-white/10 focus:border-[#D4AF37] rounded-lg p-2.5 text-sm text-white focus:outline-none" />
            </div>
            {config.hasPersonnelFields && (
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-400 uppercase font-mono">ETP</label>
                <input type="number" step="0.1" value={form.etp} onChange={(e) => setForm({ ...form, etp: parseFloat(e.target.value) || 0 })} className="w-full bg-[#0d0d0d] border border-white/10 focus:border-[#D4AF37] rounded-lg p-2.5 text-sm text-white focus:outline-none" />
              </div>
            )}
          </div>
          {config.hasPersonnelFields && (
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-400 uppercase font-mono">Unité (jour, mois...)</label>
              <input value={form.unite} onChange={(e) => setForm({ ...form, unite: e.target.value })} className="w-full bg-[#0d0d0d] border border-white/10 focus:border-[#D4AF37] rounded-lg p-2.5 text-sm text-white focus:outline-none" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-400 uppercase font-mono">Montant unitaire (€)</label>
              <input required type="number" step="0.01" min={0} value={form.montantUnitaire} onChange={(e) => setForm({ ...form, montantUnitaire: parseFloat(e.target.value) || 0 })} className="w-full bg-[#0d0d0d] border border-white/10 focus:border-[#D4AF37] rounded-lg p-2.5 text-sm text-white focus:outline-none" />
            </div>
            {!config.hideQuantite && (
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-400 uppercase font-mono">Quantité</label>
                <input required type="number" step="1" min={1} value={form.quantite} onChange={(e) => setForm({ ...form, quantite: parseFloat(e.target.value) || 1 })} className="w-full bg-[#0d0d0d] border border-white/10 focus:border-[#D4AF37] rounded-lg p-2.5 text-sm text-white focus:outline-none" />
              </div>
            )}
          </div>
          <p className="text-xs text-slate-400 font-mono">
            Total calculé : <span className="text-[#D4AF37] font-bold">{fmt((Number(form.montantUnitaire) || 0) * (config.hideQuantite ? 1 : (Number(form.quantite) || 1)))} €</span>
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-bold text-slate-300 hover:bg-white/5 cursor-pointer">Annuler</button>
            <button type="submit" disabled={isSaving} className="flex items-center space-x-2 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black px-4 py-2 rounded-lg text-xs font-black cursor-pointer disabled:opacity-50">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              <span>Enregistrer</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function BourseTableView({ app, onRefresh, addToast, baremes }: { app: FundingApplication; onRefresh: () => void; addToast: any; baremes: any[] }) {
  const lines = app.bourseLines || [];
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLine, setEditingLine] = useState<any>(null);
  const [showBareme, setShowBareme] = useState(false);

  const totalBourses = lines.reduce((s, l) => s + (Number(l.totalAllocation) || 0) + (Number(l.totalDeplacements) || 0), 0);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Supprimer cette ligne de bourse ?")) return;
    try {
      const res = await apiFetch(`/api/ares/bourse-lines/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) { addToast("Ligne supprimée.", "success", "Budget ARES"); onRefresh(); }
    } catch {
      addToast("Erreur de connexion au serveur.", "error", "Budget ARES");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-bold text-white flex items-center gap-2"><GraduationCap className="h-4 w-4" /><span>E. Bourses</span></h3>
        <div className="flex gap-2">
          <button onClick={() => setShowBareme(!showBareme)} className="flex items-center space-x-1.5 bg-white/5 text-slate-300 border border-white/10 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-white/10 transition-all cursor-pointer">
            <span>{showBareme ? "Masquer" : "Voir"} le barème de référence</span>
          </button>
          <button onClick={() => { setEditingLine(null); setIsFormOpen(true); }} className="flex items-center space-x-1.5 bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/40 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-[#D4AF37]/25 transition-all cursor-pointer">
            <Plus className="h-3.5 w-3.5" />
            <span>Ajouter une bourse</span>
          </button>
        </div>
      </div>

      {showBareme && (
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/20 p-3">
          <p className="text-[11px] font-bold text-slate-400 uppercase font-mono mb-2">Barème ARES (lecture seule)</p>
          <table className="w-full text-[11px]">
            <thead className="text-slate-500">
              <tr>
                <th className="p-1.5 text-left">Type de bourse</th>
                <th className="p-1.5 text-left">Allocation mensuelle</th>
                <th className="p-1.5 text-left">13e mois</th>
                <th className="p-1.5 text-left">Frais de gestion</th>
              </tr>
            </thead>
            <tbody>
              {baremes.map((b) => (
                <tr key={b.id} className="border-t border-white/5 text-slate-300">
                  <td className="p-1.5">{b.typeBourse}</td>
                  <td className="p-1.5">{b.allocationMensuelle}</td>
                  <td className="p-1.5">{b.allocation13eMois}</td>
                  <td className="p-1.5">{b.fraisGestion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-xs">
          <thead className="bg-black/30 text-slate-400">
            <tr>
              <th className="p-2.5 text-left">Type</th>
              <th className="p-2.5 text-left">Description</th>
              <th className="p-2.5 text-left">Lieu</th>
              <th className="p-2.5 text-left">Année</th>
              <th className="p-2.5 text-right">Allocation</th>
              <th className="p-2.5 text-right">Déplacements</th>
              <th className="p-2.5 text-right">Total</th>
              <th className="p-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr><td colSpan={8} className="p-4 text-center text-slate-500 italic">Aucune bourse enregistrée.</td></tr>
            ) : lines.map((line: any) => (
              <tr key={line.id} className="border-t border-white/5 text-slate-300 hover:bg-white/[0.02]">
                <td className="p-2.5 font-mono">{line.sousRubrique}</td>
                <td className="p-2.5">{line.description}</td>
                <td className="p-2.5">{line.lieuSejour}</td>
                <td className="p-2.5">Année {line.anneeIndex}</td>
                <td className="p-2.5 text-right font-mono">{fmt(line.totalAllocation)} €</td>
                <td className="p-2.5 text-right font-mono">{fmt(line.totalDeplacements)} €</td>
                <td className="p-2.5 text-right font-mono font-bold text-[#D4AF37]">{fmt(Number(line.totalAllocation) + Number(line.totalDeplacements))} €</td>
                <td className="p-2.5">
                  <div className="flex items-center gap-2 justify-end">
                    <button onClick={() => { setEditingLine(line); setIsFormOpen(true); }} className="text-slate-400 hover:text-white cursor-pointer"><Edit className="h-3.5 w-3.5" /></button>
                    <button onClick={() => handleDelete(line.id)} className="text-slate-400 hover:text-red-400 cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          {lines.length > 0 && (
            <tfoot>
              <tr className="border-t border-white/10 bg-black/20 font-bold">
                <td colSpan={6} className="p-2.5 text-right text-slate-400">TOTAL BOURSES</td>
                <td className="p-2.5 text-right font-mono text-[#D4AF37]">{fmt(totalBourses)} €</td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {isFormOpen && (
        <BourseFormModal
          fundingApplicationId={app.id}
          existing={editingLine}
          onClose={() => setIsFormOpen(false)}
          onSaved={() => { setIsFormOpen(false); onRefresh(); }}
          addToast={addToast}
        />
      )}
    </div>
  );
}

function BourseFormModal({ fundingApplicationId, existing, onClose, onSaved, addToast }: any) {
  const [form, setForm] = useState(existing || {
    fundingApplicationId, sousRubrique: BOURSE_SOUS_RUBRIQUES[0].value, description: "", lieuSejour: "",
    anneeIndex: 1, dureeBourseMois: 0, montantUnitaireAlloc: 0, treizemeMois: 0, fraisInscription: 0,
    billetAvion: 0, trajetAeroportBelgique: 0, fraisVisa: 0, fraisMissionIndirects: 0
  });
  const [isSaving, setIsSaving] = useState(false);

  const totalAllocation = (Number(form.dureeBourseMois) || 0) * (Number(form.montantUnitaireAlloc) || 0) + (Number(form.treizemeMois) || 0) + (Number(form.fraisInscription) || 0);
  const totalDeplacements = (Number(form.billetAvion) || 0) + (Number(form.trajetAeroportBelgique) || 0) + (Number(form.fraisVisa) || 0) + (Number(form.fraisMissionIndirects) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await apiFetch("/api/ares/bourse-lines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, fundingApplicationId })
      });
      const data = await res.json();
      if (data.success) { addToast("Bourse enregistrée.", "success", "Budget ARES"); onSaved(); }
      else addToast(data.error || "Échec de l'enregistrement.", "error", "Budget ARES");
    } catch {
      addToast("Erreur de connexion au serveur.", "error", "Budget ARES");
    } finally {
      setIsSaving(false);
    }
  };

  const numField = (key: string, label: string, step = "0.01") => (
    <div className="space-y-1">
      <label className="block text-[11px] font-bold text-slate-400 uppercase font-mono">{label}</label>
      <input type="number" step={step} min={0} value={(form as any)[key]} onChange={(e) => setForm({ ...form, [key]: parseFloat(e.target.value) || 0 })} className="w-full bg-[#0d0d0d] border border-white/10 focus:border-[#D4AF37] rounded-lg p-2.5 text-sm text-white focus:outline-none" />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="bg-[#121212] border border-white/10 rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto my-4 sm:my-8">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-black text-white">{existing ? "Modifier" : "Ajouter"} une bourse</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-400 uppercase font-mono">Type de bourse</label>
              <select value={form.sousRubrique} onChange={(e) => setForm({ ...form, sousRubrique: e.target.value })} className="w-full bg-[#0d0d0d] border border-white/10 focus:border-[#D4AF37] rounded-lg p-2.5 text-sm text-white focus:outline-none">
                {BOURSE_SOUS_RUBRIQUES.map((sr) => <option key={sr.value} value={sr.value}>{sr.label}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-400 uppercase font-mono">Année</label>
              <input required type="number" min={1} value={form.anneeIndex} onChange={(e) => setForm({ ...form, anneeIndex: parseInt(e.target.value) || 1 })} className="w-full bg-[#0d0d0d] border border-white/10 focus:border-[#D4AF37] rounded-lg p-2.5 text-sm text-white focus:outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-400 uppercase font-mono">Description (thématique)</label>
              <input required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full bg-[#0d0d0d] border border-white/10 focus:border-[#D4AF37] rounded-lg p-2.5 text-sm text-white focus:outline-none" />
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-400 uppercase font-mono">Lieu du séjour</label>
              <input required value={form.lieuSejour} onChange={(e) => setForm({ ...form, lieuSejour: e.target.value })} className="w-full bg-[#0d0d0d] border border-white/10 focus:border-[#D4AF37] rounded-lg p-2.5 text-sm text-white focus:outline-none" />
            </div>
          </div>

          <div className="p-3 bg-black/20 rounded-xl border border-white/10 space-y-3">
            <p className="text-xs font-bold text-[#D4AF37] uppercase font-mono">Bloc — Allocation de subsistance</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {numField("dureeBourseMois", "Durée (mois)", "1")}
              {numField("montantUnitaireAlloc", "Montant/mois (€)")}
              {numField("treizemeMois", "13e mois (€)")}
              {numField("fraisInscription", "Frais inscription (€)")}
            </div>
            <p className="text-xs text-slate-400">Total : <span className="text-white font-bold font-mono">{fmt(totalAllocation)} €</span></p>
          </div>

          <div className="p-3 bg-black/20 rounded-xl border border-white/10 space-y-3">
            <p className="text-xs font-bold text-[#D4AF37] uppercase font-mono">Bloc — Déplacements des boursiers</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {numField("billetAvion", "Billet d'avion (€)")}
              {numField("trajetAeroportBelgique", "Trajet aéroport (€)")}
              {numField("fraisVisa", "Frais visa (€)")}
              {numField("fraisMissionIndirects", "Frais mission indir. (€)")}
            </div>
            <p className="text-xs text-slate-400">Total : <span className="text-white font-bold font-mono">{fmt(totalDeplacements)} €</span></p>
          </div>

          <p className="text-sm font-bold text-white">Total général : <span className="text-[#D4AF37] font-mono">{fmt(totalAllocation + totalDeplacements)} €</span></p>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-bold text-slate-300 hover:bg-white/5 cursor-pointer">Annuler</button>
            <button type="submit" disabled={isSaving} className="flex items-center space-x-2 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black px-4 py-2 rounded-lg text-xs font-black cursor-pointer disabled:opacity-50">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              <span>Enregistrer</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function MissionTableView({ app, onRefresh, addToast }: { app: FundingApplication; onRefresh: () => void; addToast: any }) {
  const lines = app.missionLines || [];
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLine, setEditingLine] = useState<any>(null);

  const totalMissions = lines.reduce((s, l) => s + (Number(l.totalMontantMission) || 0), 0);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Supprimer cette ligne de mission ?")) return;
    try {
      const res = await apiFetch(`/api/ares/mission-lines/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) { addToast("Ligne supprimée.", "success", "Budget ARES"); onRefresh(); }
    } catch {
      addToast("Erreur de connexion au serveur.", "error", "Budget ARES");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2"><Plane className="h-4 w-4" /><span>F-G. Missions</span></h3>
        <button onClick={() => { setEditingLine(null); setIsFormOpen(true); }} className="flex items-center space-x-1.5 bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/40 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-[#D4AF37]/25 transition-all cursor-pointer">
          <Plus className="h-3.5 w-3.5" />
          <span>Ajouter une mission</span>
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-xs">
          <thead className="bg-black/30 text-slate-400">
            <tr>
              <th className="p-2.5 text-left">Type</th>
              <th className="p-2.5 text-left">Déplacement</th>
              <th className="p-2.5 text-left">Description</th>
              <th className="p-2.5 text-left">Année</th>
              <th className="p-2.5 text-right">Jours</th>
              <th className="p-2.5 text-right">Total</th>
              <th className="p-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr><td colSpan={7} className="p-4 text-center text-slate-500 italic">Aucune mission enregistrée.</td></tr>
            ) : lines.map((line: any) => (
              <tr key={line.id} className="border-t border-white/5 text-slate-300 hover:bg-white/[0.02]">
                <td className="p-2.5 font-mono">{line.typeMission}</td>
                <td className="p-2.5">{line.typeDeplacement}</td>
                <td className="p-2.5">{line.description}</td>
                <td className="p-2.5">Année {line.anneeIndex}</td>
                <td className="p-2.5 text-right font-mono">{line.dureeJours}</td>
                <td className="p-2.5 text-right font-mono font-bold text-[#D4AF37]">{fmt(line.totalMontantMission)} €</td>
                <td className="p-2.5">
                  <div className="flex items-center gap-2 justify-end">
                    <button onClick={() => { setEditingLine(line); setIsFormOpen(true); }} className="text-slate-400 hover:text-white cursor-pointer"><Edit className="h-3.5 w-3.5" /></button>
                    <button onClick={() => handleDelete(line.id)} className="text-slate-400 hover:text-red-400 cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          {lines.length > 0 && (
            <tfoot>
              <tr className="border-t border-white/10 bg-black/20 font-bold">
                <td colSpan={5} className="p-2.5 text-right text-slate-400">TOTAL MISSIONS</td>
                <td className="p-2.5 text-right font-mono text-[#D4AF37]">{fmt(totalMissions)} €</td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {isFormOpen && (
        <MissionFormModal
          fundingApplicationId={app.id}
          existing={editingLine}
          onClose={() => setIsFormOpen(false)}
          onSaved={() => { setIsFormOpen(false); onRefresh(); }}
          addToast={addToast}
        />
      )}
    </div>
  );
}

function MissionFormModal({ fundingApplicationId, existing, onClose, onSaved, addToast }: any) {
  const [form, setForm] = useState(existing || {
    fundingApplicationId, typeMission: MISSION_TYPES[0].value, typeDeplacement: "Nord-Sud", description: "",
    anneeIndex: 1, dureeJours: 0, billetAvion: 0, deplacementLocal: 0, perDiemUnitaire: 0, hotelUnitaire: 0,
    fraisGestionAccueil: 0, fraisDeplacementsIntl: 0
  });
  const [isSaving, setIsSaving] = useState(false);

  const totalDeplacement = (Number(form.billetAvion) || 0) + (Number(form.deplacementLocal) || 0);
  const totalPerDiem = (Number(form.perDiemUnitaire) || 0) * (Number(form.dureeJours) || 0);
  const totalHotel = (Number(form.hotelUnitaire) || 0) * (Number(form.dureeJours) || 0);
  const totalFraisSejour = totalPerDiem + totalHotel;
  const totalMontantMission = totalDeplacement + totalFraisSejour + (Number(form.fraisGestionAccueil) || 0) + (Number(form.fraisDeplacementsIntl) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await apiFetch("/api/ares/mission-lines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, fundingApplicationId })
      });
      const data = await res.json();
      if (data.success) { addToast("Mission enregistrée.", "success", "Budget ARES"); onSaved(); }
      else addToast(data.error || "Échec de l'enregistrement.", "error", "Budget ARES");
    } catch {
      addToast("Erreur de connexion au serveur.", "error", "Budget ARES");
    } finally {
      setIsSaving(false);
    }
  };

  const numField = (key: string, label: string) => (
    <div className="space-y-1">
      <label className="block text-[11px] font-bold text-slate-400 uppercase font-mono">{label}</label>
      <input type="number" step="0.01" min={0} value={(form as any)[key]} onChange={(e) => setForm({ ...form, [key]: parseFloat(e.target.value) || 0 })} className="w-full bg-[#0d0d0d] border border-white/10 focus:border-[#D4AF37] rounded-lg p-2.5 text-sm text-white focus:outline-none" />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="bg-[#121212] border border-white/10 rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto my-4 sm:my-8">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-black text-white">{existing ? "Modifier" : "Ajouter"} une mission</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-400 uppercase font-mono">Type de mission</label>
              <select value={form.typeMission} onChange={(e) => setForm({ ...form, typeMission: e.target.value })} className="w-full bg-[#0d0d0d] border border-white/10 focus:border-[#D4AF37] rounded-lg p-2.5 text-sm text-white focus:outline-none">
                {MISSION_TYPES.map((mt) => <option key={mt.value} value={mt.value}>{mt.label}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-400 uppercase font-mono">Type de déplacement</label>
              <select value={form.typeDeplacement} onChange={(e) => setForm({ ...form, typeDeplacement: e.target.value })} className="w-full bg-[#0d0d0d] border border-white/10 focus:border-[#D4AF37] rounded-lg p-2.5 text-sm text-white focus:outline-none">
                <option value="Nord-Sud">Nord-Sud</option>
                <option value="Sud-Sud">Sud-Sud</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-400 uppercase font-mono">Description (qui, nature)</label>
              <input required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full bg-[#0d0d0d] border border-white/10 focus:border-[#D4AF37] rounded-lg p-2.5 text-sm text-white focus:outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-400 uppercase font-mono">Année</label>
                <input required type="number" min={1} value={form.anneeIndex} onChange={(e) => setForm({ ...form, anneeIndex: parseInt(e.target.value) || 1 })} className="w-full bg-[#0d0d0d] border border-white/10 focus:border-[#D4AF37] rounded-lg p-2.5 text-sm text-white focus:outline-none" />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-400 uppercase font-mono">Durée (jours)</label>
                <input required type="number" min={0} value={form.dureeJours} onChange={(e) => setForm({ ...form, dureeJours: parseInt(e.target.value) || 0 })} className="w-full bg-[#0d0d0d] border border-white/10 focus:border-[#D4AF37] rounded-lg p-2.5 text-sm text-white focus:outline-none" />
              </div>
            </div>
          </div>

          <div className="p-3 bg-black/20 rounded-xl border border-white/10 space-y-2">
            <p className="text-xs font-bold text-[#D4AF37] uppercase font-mono">Déplacements</p>
            <div className="grid grid-cols-2 gap-3">
              {numField("billetAvion", "Billet d'avion (€)")}
              {numField("deplacementLocal", "Déplacement local (€)")}
            </div>
            <p className="text-xs text-slate-400">Total : <span className="text-white font-bold font-mono">{fmt(totalDeplacement)} €</span></p>
          </div>

          <div className="p-3 bg-black/20 rounded-xl border border-white/10 space-y-2">
            <p className="text-xs font-bold text-[#D4AF37] uppercase font-mono">Q1 Per diem & Q2 Frais d'hôtel</p>
            <div className="grid grid-cols-2 gap-3">
              {numField("perDiemUnitaire", "Per diem unitaire (€/j)")}
              {numField("hotelUnitaire", "Hôtel unitaire (€/j)")}
            </div>
            <p className="text-xs text-slate-400">Per diem : <span className="text-white font-bold font-mono">{fmt(totalPerDiem)} €</span> · Hôtel : <span className="text-white font-bold font-mono">{fmt(totalHotel)} €</span> · Frais de séjour : <span className="text-white font-bold font-mono">{fmt(totalFraisSejour)} €</span></p>
          </div>

          <div className="p-3 bg-black/20 rounded-xl border border-white/10 space-y-2">
            <p className="text-xs font-bold text-[#D4AF37] uppercase font-mono">Frais de gestion (accueil)</p>
            <div className="grid grid-cols-2 gap-3">
              {numField("fraisGestionAccueil", "Frais gestion/représentation (€)")}
              {numField("fraisDeplacementsIntl", "Déplacements intl étranger (€)")}
            </div>
          </div>

          <p className="text-sm font-bold text-white">Total mission : <span className="text-[#D4AF37] font-mono">{fmt(totalMontantMission)} €</span></p>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-bold text-slate-300 hover:bg-white/5 cursor-pointer">Annuler</button>
            <button type="submit" disabled={isSaving} className="flex items-center space-x-2 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black px-4 py-2 rounded-lg text-xs font-black cursor-pointer disabled:opacity-50">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              <span>Enregistrer</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function SyntheseView({ synthese, app }: { synthese: any; app: FundingApplication }) {
  if (!synthese) {
    return <div className="flex items-center justify-center py-10 text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  }

  const rows = [
    { label: "A. Frais d'ouverture (Investissement)", value: synthese.A_investissement },
    { label: "B. Frais de fonctionnement", value: synthese.B_fonctionnement },
    { label: "C. Frais de personnel", value: synthese.C_personnel },
    { label: "D. Frais de bourse", value: synthese.D_bourses },
    { label: "E. Frais de mission", value: synthese.E_missions },
    { label: "F. Frais d'expédition", value: synthese.F_expedition },
    { label: "G. Frais administratifs (calculé, plafond 10%)", value: synthese.G_fraisAdministratifs }
  ];

  return (
    <div className="space-y-4 max-w-2xl">
      <h3 className="text-sm font-bold text-white flex items-center gap-2"><PieChart className="h-4 w-4" /><span>Budget Synthèse — {app.titre}</span></h3>
      <div className="rounded-xl border border-white/10 overflow-hidden">
        {rows.map((row, i) => (
          <div key={i} className={`flex items-center justify-between px-4 py-3 text-sm ${i % 2 === 0 ? "bg-black/10" : ""}`}>
            <span className="text-slate-300">{row.label}</span>
            <span className="font-mono font-bold text-white">{fmt(row.value)} €</span>
          </div>
        ))}
        <div className="flex items-center justify-between px-4 py-4 bg-[#D4AF37]/10 border-t-2 border-[#D4AF37]/40">
          <span className="text-sm font-black text-[#D4AF37] uppercase">Total Général</span>
          <span className="font-mono font-black text-lg text-[#D4AF37]">{fmt(synthese.totalGeneral)} €</span>
        </div>
      </div>
      <p className="text-[11px] text-slate-500 italic">
        Les frais administratifs (G) sont calculés automatiquement selon la formule ARES : 10% des dépenses totales, déduction faite des frais de gestion déjà comptés dans les bourses et missions.
      </p>
    </div>
  );
}
