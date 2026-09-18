import React, { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import {
  Plus, Trash2, Edit, X, Loader2, ChevronLeft, Building2,
  Plane, GraduationCap, Layers, PieChart, BookOpen
} from "lucide-react";
import { apiFetch } from "../utils/apiClient";
import {
  FundingApplication, AresBudgetLine, BourseBudgetLine, MissionBudgetLine,
  MontantApplicableBourse, BudgetSynthese, BudgetLineCategory, FundingApplicationType
} from "../types";

interface AresBudgetPanelProps {
  addToast: (message: string, type?: "success" | "error" | "info" | "warning", title?: string) => void;
}

type SubTab = "fiche" | "postes" | "bourses" | "missions" | "synthese" | "bareme";

const CATEGORY_LABELS: Record<BudgetLineCategory, string> = {
  INVESTISSEMENT: "A. Investissement",
  FONCTIONNEMENT: "B. Fonctionnement",
  PERSONNEL: "C. Personnel",
  EXPEDITION: "H. Expédition",
  FRAIS_ADMIN: "J. Frais Administratifs"
};

const SOUS_RUBRIQUES: Record<BudgetLineCategory, { code: string; label: string }[]> = {
  INVESTISSEMENT: [
    { code: "A1", label: "A1 Matériels" },
    { code: "A2", label: "A2 Équipements" },
    { code: "A3", label: "A3 Véhicules" },
    { code: "A4", label: "A4 Autres" }
  ],
  FONCTIONNEMENT: [
    { code: "B1", label: "B1 Généraux ou exceptionnels" },
    { code: "B2", label: "B2 Communication et diffusion" },
    { code: "B3", label: "B3 Frais participation aux séminaires" },
    { code: "B4", label: "B4 Consultation locale de coordination" },
    { code: "B5", label: "B5 Carburant" },
    { code: "B6", label: "B6 Assurances" },
    { code: "B7", label: "B7 Consommables" },
    { code: "B8", label: "B8 Autres (honoraires, etc.)" }
  ],
  PERSONNEL: [
    { code: "C1", label: "C1 Rémunération du personnel local" },
    { code: "C2", label: "C2 Rémunération du personnel du nord" }
  ],
  EXPEDITION: [{ code: "H1", label: "H1 Expédition" }],
  FRAIS_ADMIN: [
    { code: "J1", label: "J1 En Belgique" },
    { code: "J2", label: "J2 Dans le pays partenaire" }
  ]
};

const BOURSE_TYPES = [
  { code: "D1", label: "D1 Formation de courte durée au Nord/Sud" },
  { code: "D2", label: "D2 Doctorat/postdoctorat" },
  { code: "D3", label: "D3 Frais de gestion des bourses" },
  { code: "D4", label: "D4 Allocation de subsistance" }
];

const FUNDING_TYPES: { value: FundingApplicationType; label: string }[] = [
  { value: "AMORCE", label: "Amorce" },
  { value: "PROJET_PILOTE", label: "Projet Pilote" },
  { value: "PROJET_STANDARD", label: "Projet Standard" }
];

function fmt(n: number | undefined | null) {
  return (Number(n) || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function inputCls(extra = "") {
  return `w-full bg-[#0d0d0d] border border-white/10 focus:border-[#D4AF37] rounded-lg p-2.5 text-xs text-white font-mono focus:outline-none ${extra}`;
}

function labelCls() {
  return "block text-[11px] font-bold text-slate-400 uppercase font-mono mb-1";
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={className}>
      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function AresBudgetPanel({ addToast }: AresBudgetPanelProps) {
  const [applications, setApplications] = useState<(FundingApplication & { _count?: any })[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedApp, setSelectedApp] = useState<FundingApplication | null>(null);
  const [budgetLines, setBudgetLines] = useState<AresBudgetLine[]>([]);
  const [bourseLines, setBourseLines] = useState<BourseBudgetLine[]>([]);
  const [missionLines, setMissionLines] = useState<MissionBudgetLine[]>([]);
  const [subTab, setSubTab] = useState<SubTab>("fiche");
  const [synthese, setSynthese] = useState<any>(null);
  const [baremes, setBaremes] = useState<MontantApplicableBourse[]>([]);
  const [isNewAppModalOpen, setIsNewAppModalOpen] = useState(false);
  const [ficheForm, setFicheForm] = useState<Partial<FundingApplication>>({});
  const [lineModal, setLineModal] = useState<{ open: boolean; category?: BudgetLineCategory; data?: Partial<AresBudgetLine> }>({ open: false });
  const [bourseModal, setBourseModal] = useState<{ open: boolean; data?: Partial<BourseBudgetLine> }>({ open: false });
  const [missionModal, setMissionModal] = useState<{ open: boolean; data?: Partial<MissionBudgetLine> }>({ open: false });
  const [saving, setSaving] = useState(false);
  const [activeCategory, setActiveCategory] = useState<BudgetLineCategory>("INVESTISSEMENT");

  const loadApplications = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await apiFetch("/api/ares/applications");
      const data = await res.json();
      if (data.success) setApplications(data.applications);
      else addToast(data.error || "Erreur de chargement des fiches ARES.", "error", "Budget ARES");
    } catch {
      addToast("Impossible de contacter le serveur (fiches ARES).", "error", "Budget ARES");
    } finally {
      setLoadingList(false);
    }
  }, [addToast]);

  useEffect(() => { loadApplications(); }, [loadApplications]);

  const loadApplicationDetail = useCallback(async (id: string) => {
    try {
      const res = await apiFetch(`/api/ares/applications/${id}`);
      const data = await res.json();
      if (data.success) {
        setSelectedApp(data.application);
        setBudgetLines(data.application.budgetLines || []);
        setBourseLines(data.application.bourseLines || []);
        setMissionLines(data.application.missionLines || []);
        setFicheForm(data.application);
      } else {
        addToast(data.error || "Fiche introuvable.", "error", "Budget ARES");
      }
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

  const loadBaremes = useCallback(async () => {
    try {
      const res = await apiFetch("/api/ares/baremes-bourse");
      const data = await res.json();
      if (data.success) setBaremes(data.baremes);
    } catch {
      addToast("Impossible de charger le barème.", "error", "Budget ARES");
    }
  }, [addToast]);

  useEffect(() => {
    if (subTab === "synthese" && selectedApp) loadSynthese(selectedApp.id);
    if (subTab === "bareme" && baremes.length === 0) loadBaremes();
  }, [subTab, selectedApp, loadSynthese, loadBaremes, baremes.length]);

  const handleCreateApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiFetch("/api/ares/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ficheForm)
      });
      const data = await res.json();
      if (data.success) {
        addToast(`Fiche "${data.application.titre}" créée avec succès.`, "success", "Budget ARES");
        setIsNewAppModalOpen(false);
        setFicheForm({});
        await loadApplications();
        setSelectedApp(data.application);
        setBudgetLines([]); setBourseLines([]); setMissionLines([]);
      } else {
        addToast(data.error || "Échec de la création.", "error", "Budget ARES");
      }
    } catch {
      addToast("Erreur de communication serveur.", "error", "Budget ARES");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateFiche = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;
    setSaving(true);
    try {
      const res = await apiFetch(`/api/ares/applications/${selectedApp.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ficheForm)
      });
      const data = await res.json();
      if (data.success) {
        addToast("Fiche mise à jour avec succès.", "success", "Budget ARES");
        setSelectedApp(data.application);
        await loadApplications();
      } else {
        addToast(data.error || "Échec de la mise à jour.", "error", "Budget ARES");
      }
    } catch {
      addToast("Erreur de communication serveur.", "error", "Budget ARES");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteApplication = async (id: string) => {
    if (!window.confirm("Supprimer définitivement cette fiche de financement et toutes ses lignes budgétaires ?")) return;
    try {
      const res = await apiFetch(`/api/ares/applications/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        addToast("Fiche supprimée.", "success", "Budget ARES");
        if (selectedApp?.id === id) setSelectedApp(null);
        await loadApplications();
      } else {
        addToast(data.error || "Échec de la suppression.", "error", "Budget ARES");
      }
    } catch {
      addToast("Erreur de communication serveur.", "error", "Budget ARES");
    }
  };

  const handleSaveLine = async (payload: Partial<AresBudgetLine>) => {
    if (!selectedApp) return;
    setSaving(true);
    try {
      const res = await apiFetch("/api/ares/budget-lines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, fundingApplicationId: selectedApp.id })
      });
      const data = await res.json();
      if (data.success) {
        addToast("Ligne budgétaire enregistrée.", "success", "Budget ARES");
        setLineModal({ open: false });
        await loadApplicationDetail(selectedApp.id);
      } else {
        addToast(data.error || "Échec de l'enregistrement.", "error", "Budget ARES");
      }
    } catch {
      addToast("Erreur de communication serveur.", "error", "Budget ARES");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLine = async (id: string) => {
    if (!selectedApp || !window.confirm("Supprimer cette ligne ?")) return;
    try {
      const res = await apiFetch(`/api/ares/budget-lines/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        addToast("Ligne supprimée.", "success", "Budget ARES");
        await loadApplicationDetail(selectedApp.id);
      } else {
        addToast(data.error || "Échec de la suppression.", "error", "Budget ARES");
      }
    } catch {
      addToast("Erreur de communication serveur.", "error", "Budget ARES");
    }
  };

  const handleSaveBourse = async (payload: Partial<BourseBudgetLine>) => {
    if (!selectedApp) return;
    setSaving(true);
    try {
      const res = await apiFetch("/api/ares/bourse-lines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, fundingApplicationId: selectedApp.id })
      });
      const data = await res.json();
      if (data.success) {
        addToast("Bourse enregistrée.", "success", "Budget ARES");
        setBourseModal({ open: false });
        await loadApplicationDetail(selectedApp.id);
      } else {
        addToast(data.error || "Échec de l'enregistrement.", "error", "Budget ARES");
      }
    } catch {
      addToast("Erreur de communication serveur.", "error", "Budget ARES");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBourse = async (id: string) => {
    if (!selectedApp || !window.confirm("Supprimer cette bourse ?")) return;
    try {
      const res = await apiFetch(`/api/ares/bourse-lines/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        addToast("Bourse supprimée.", "success", "Budget ARES");
        await loadApplicationDetail(selectedApp.id);
      } else {
        addToast(data.error || "Échec de la suppression.", "error", "Budget ARES");
      }
    } catch {
      addToast("Erreur de communication serveur.", "error", "Budget ARES");
    }
  };

  const handleSaveMission = async (payload: Partial<MissionBudgetLine>) => {
    if (!selectedApp) return;
    setSaving(true);
    try {
      const res = await apiFetch("/api/ares/mission-lines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, fundingApplicationId: selectedApp.id })
      });
      const data = await res.json();
      if (data.success) {
        addToast("Mission enregistrée.", "success", "Budget ARES");
        setMissionModal({ open: false });
        await loadApplicationDetail(selectedApp.id);
      } else {
        addToast(data.error || "Échec de l'enregistrement.", "error", "Budget ARES");
      }
    } catch {
      addToast("Erreur de communication serveur.", "error", "Budget ARES");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMission = async (id: string) => {
    if (!selectedApp || !window.confirm("Supprimer cette mission ?")) return;
    try {
      const res = await apiFetch(`/api/ares/mission-lines/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        addToast("Mission supprimée.", "success", "Budget ARES");
        await loadApplicationDetail(selectedApp.id);
      } else {
        addToast(data.error || "Échec de la suppression.", "error", "Budget ARES");
      }
    } catch {
      addToast("Erreur de communication serveur.", "error", "Budget ARES");
    }
  };

  if (!selectedApp) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <Layers className="h-5 w-5 text-[#D4AF37]" />
              Budget ARES — Fiches de Financement
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Structure budgétaire détaillée (type ARES/UMONS) : investissement, fonctionnement, personnel, bourses, missions, expédition, frais administratifs.
            </p>
          </div>
          <button
            onClick={() => { setFicheForm({ type: "AMORCE", dureeMois: 24 }); setIsNewAppModalOpen(true); }}
            className="flex items-center gap-2 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-lg"
          >
            <Plus className="h-4 w-4" />
            <span>Nouvelle Fiche</span>
          </button>
        </div>

        {loadingList ? (
          <div className="flex items-center justify-center py-20 text-slate-500">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Chargement...
          </div>
        ) : applications.length === 0 ? (
          <div className="bg-[#12261C] border border-white/10 rounded-2xl p-10 text-center text-slate-400">
            Aucune fiche de financement pour l'instant. Cliquez sur "Nouvelle Fiche" pour commencer.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {applications.map((app) => (
              <div
                key={app.id}
                className="bg-[#12261C] border border-white/10 hover:border-[#D4AF37]/50 rounded-2xl p-5 cursor-pointer transition-all group relative"
                onClick={() => loadApplicationDetail(app.id)}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteApplication(app.id); }}
                  className="absolute top-3 right-3 p-1.5 rounded-lg bg-red-500/10 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <span className="text-[10px] font-bold text-[#D4AF37] uppercase font-mono bg-[#D4AF37]/10 px-2 py-0.5 rounded-full">
                  {FUNDING_TYPES.find(t => t.value === app.type)?.label || app.type}
                </span>
                <h3 className="font-bold text-white mt-2 line-clamp-2">{app.titre}</h3>
                <p className="text-xs text-slate-400 mt-1">{app.pays} · {app.dureeMois} mois</p>
                <div className="flex items-center gap-3 mt-3 text-[10px] text-slate-500 font-mono">
                  <span>{app._count?.budgetLines || 0} postes</span>
                  <span>{app._count?.bourseLines || 0} bourses</span>
                  <span>{app._count?.missionLines || 0} missions</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {isNewAppModalOpen && (
          <FicheFormModal
            form={ficheForm}
            setForm={setFicheForm}
            onSubmit={handleCreateApplication}
            onClose={() => setIsNewAppModalOpen(false)}
            saving={saving}
            title="Nouvelle Fiche de Financement"
          />
        )}
      </div>
    );
  }

  const subTabs: { id: SubTab; label: string; icon: React.ReactNode }[] = [
    { id: "fiche", label: "Fiche Générale", icon: <Building2 className="h-4 w-4" /> },
    { id: "postes", label: "Postes Budgétaires", icon: <Layers className="h-4 w-4" /> },
    { id: "bourses", label: "Bourses", icon: <GraduationCap className="h-4 w-4" /> },
    { id: "missions", label: "Missions", icon: <Plane className="h-4 w-4" /> },
    { id: "synthese", label: "Synthèse", icon: <PieChart className="h-4 w-4" /> },
    { id: "bareme", label: "Barème Bourses", icon: <BookOpen className="h-4 w-4" /> }
  ];

  const linesForActiveCategory = budgetLines.filter(l => l.category === activeCategory);

  return (
    <div className="space-y-6">
      <button
        onClick={() => setSelectedApp(null)}
        className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
      >
        <ChevronLeft className="h-4 w-4" /> Retour aux fiches
      </button>

      <div>
        <h2 className="text-xl font-black text-white">{selectedApp.titre}</h2>
        <p className="text-xs text-slate-400 mt-1">{selectedApp.pays} · {selectedApp.dureeMois} mois · {FUNDING_TYPES.find(t => t.value === selectedApp.type)?.label}</p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
        {subTabs.map(t => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              subTab === t.id ? "bg-[#D4AF37] text-black" : "bg-white/5 text-slate-300 hover:bg-white/10"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {subTab === "fiche" && (
        <form onSubmit={handleUpdateFiche} className="bg-[#12261C] border border-white/10 rounded-2xl p-6 space-y-4 max-w-2xl">
          <FicheFields form={ficheForm} setForm={setFicheForm} />
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckIcon className="h-4 w-4" />}
            <span>Enregistrer</span>
          </button>
        </form>
      )}

      {subTab === "postes" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(CATEGORY_LABELS) as BudgetLineCategory[]).map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                  activeCategory === cat ? "bg-[#D4AF37] text-black" : "bg-white/5 text-slate-300 hover:bg-white/10"
                }`}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => setLineModal({ open: true, category: activeCategory, data: { category: activeCategory, anneeIndex: 1, quantite: 1 } })}
              className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 px-3.5 py-2 rounded-lg text-xs font-bold cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Ajouter une ligne
            </button>
          </div>

          <div className="bg-[#12261C] border border-white/10 rounded-2xl overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 uppercase font-mono text-[10px]">
                  <th className="text-left p-3">Sous-rubrique</th>
                  <th className="text-left p-3">Description</th>
                  <th className="text-center p-3">Année</th>
                  <th className="text-right p-3">Montant unit.</th>
                  <th className="text-right p-3">Qté</th>
                  <th className="text-right p-3">Total</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {linesForActiveCategory.length === 0 ? (
                  <tr><td colSpan={7} className="text-center p-6 text-slate-500">Aucune ligne pour cette catégorie.</td></tr>
                ) : linesForActiveCategory.map(line => (
                  <tr key={line.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="p-3 font-mono text-[#D4AF37]">{line.sousRubrique}</td>
                    <td className="p-3 text-slate-200">{line.description}</td>
                    <td className="p-3 text-center font-mono text-slate-400">Année {line.anneeIndex}</td>
                    <td className="p-3 text-right font-mono text-slate-300">{fmt(line.montantUnitaire)} €</td>
                    <td className="p-3 text-right font-mono text-slate-300">{line.quantite}</td>
                    <td className="p-3 text-right font-mono font-bold text-white">{fmt(line.total)} €</td>
                    <td className="p-3 flex items-center gap-1.5 justify-end">
                      <button onClick={() => setLineModal({ open: true, category: activeCategory, data: line })} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 cursor-pointer">
                        <Edit className="h-3 w-3" />
                      </button>
                      <button onClick={() => handleDeleteLine(line.id)} className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 cursor-pointer">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              {linesForActiveCategory.length > 0 && (
                <tfoot>
                  <tr className="bg-white/[0.03]">
                    <td colSpan={5} className="p-3 text-right font-bold text-slate-300">TOTAL {CATEGORY_LABELS[activeCategory]}</td>
                    <td className="p-3 text-right font-mono font-black text-[#D4AF37]">
                      {fmt(linesForActiveCategory.reduce((s, l) => s + (Number(l.total) || 0), 0))} €
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {subTab === "bourses" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setBourseModal({ open: true, data: { anneeIndex: 1 } })}
              className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 px-3.5 py-2 rounded-lg text-xs font-bold cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Ajouter une bourse
            </button>
          </div>
          <div className="bg-[#12261C] border border-white/10 rounded-2xl overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 uppercase font-mono text-[10px]">
                  <th className="text-left p-3">Type</th>
                  <th className="text-left p-3">Description</th>
                  <th className="text-left p-3">Lieu</th>
                  <th className="text-center p-3">Année</th>
                  <th className="text-right p-3">Total Allocation</th>
                  <th className="text-right p-3">Total Déplacements</th>
                  <th className="text-right p-3">Total</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {bourseLines.length === 0 ? (
                  <tr><td colSpan={8} className="text-center p-6 text-slate-500">Aucune bourse enregistrée.</td></tr>
                ) : bourseLines.map(b => (
                  <tr key={b.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="p-3 font-mono text-[#D4AF37]">{b.sousRubrique}</td>
                    <td className="p-3 text-slate-200">{b.description}</td>
                    <td className="p-3 text-slate-400">{b.lieuSejour}</td>
                    <td className="p-3 text-center font-mono text-slate-400">Année {b.anneeIndex}</td>
                    <td className="p-3 text-right font-mono text-slate-300">{fmt(b.totalAllocation)} €</td>
                    <td className="p-3 text-right font-mono text-slate-300">{fmt(b.totalDeplacements)} €</td>
                    <td className="p-3 text-right font-mono font-bold text-white">{fmt((Number(b.totalAllocation) || 0) + (Number(b.totalDeplacements) || 0))} €</td>
                    <td className="p-3 flex items-center gap-1.5 justify-end">
                      <button onClick={() => setBourseModal({ open: true, data: b })} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 cursor-pointer">
                        <Edit className="h-3 w-3" />
                      </button>
                      <button onClick={() => handleDeleteBourse(b.id)} className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 cursor-pointer">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subTab === "missions" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setMissionModal({ open: true, data: { anneeIndex: 1, typeDeplacement: "Nord-Sud", dureeJours: 1 } })}
              className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 px-3.5 py-2 rounded-lg text-xs font-bold cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Ajouter une mission
            </button>
          </div>
          <div className="bg-[#12261C] border border-white/10 rounded-2xl overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 uppercase font-mono text-[10px]">
                  <th className="text-left p-3">Type</th>
                  <th className="text-left p-3">Déplacement</th>
                  <th className="text-left p-3">Description</th>
                  <th className="text-center p-3">Année</th>
                  <th className="text-center p-3">Jours</th>
                  <th className="text-right p-3">Total</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {missionLines.length === 0 ? (
                  <tr><td colSpan={7} className="text-center p-6 text-slate-500">Aucune mission enregistrée.</td></tr>
                ) : missionLines.map(m => (
                  <tr key={m.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="p-3 font-mono text-[#D4AF37]">{m.typeMission}</td>
                    <td className="p-3 text-slate-400">{m.typeDeplacement}</td>
                    <td className="p-3 text-slate-200">{m.description}</td>
                    <td className="p-3 text-center font-mono text-slate-400">Année {m.anneeIndex}</td>
                    <td className="p-3 text-center font-mono text-slate-400">{m.dureeJours}j</td>
                    <td className="p-3 text-right font-mono font-bold text-white">{fmt(m.totalMontantMission)} €</td>
                    <td className="p-3 flex items-center gap-1.5 justify-end">
                      <button onClick={() => setMissionModal({ open: true, data: m })} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 cursor-pointer">
                        <Edit className="h-3 w-3" />
                      </button>
                      <button onClick={() => handleDeleteMission(m.id)} className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 cursor-pointer">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subTab === "synthese" && (
        <div className="bg-[#12261C] border border-white/10 rounded-2xl p-6 space-y-3 max-w-2xl">
          {!synthese ? (
            <div className="flex items-center justify-center py-10 text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Calcul en cours...
            </div>
          ) : (
            <>
              {[
                ["A. Frais d'ouverture (Investissement)", synthese.A_investissement],
                ["B. Frais de fonctionnement", synthese.B_fonctionnement],
                ["C. Frais de personnel", synthese.C_personnel],
                ["D. Frais de bourse", synthese.D_bourses],
                ["E. Frais de mission", synthese.E_missions],
                ["F. Frais d'expédition", synthese.F_expedition],
                ["G. Frais administratifs (calculé, plafond 10%)", synthese.G_fraisAdministratifs]
              ].map(([label, value]) => (
                <div key={label as string} className="flex justify-between items-center py-2 border-b border-white/5 text-sm">
                  <span className="text-slate-300">{label}</span>
                  <span className="font-mono font-bold text-white">{fmt(value as number)} €</span>
                </div>
              ))}
              <div className="flex justify-between items-center pt-3 text-base">
                <span className="font-black text-[#D4AF37]">TOTAL GÉNÉRAL</span>
                <span className="font-mono font-black text-[#D4AF37]">{fmt(synthese.totalGeneral)} €</span>
              </div>
            </>
          )}
        </div>
      )}

      {subTab === "bareme" && (
        <div className="bg-[#12261C] border border-white/10 rounded-2xl overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 uppercase font-mono">
                <th className="text-left p-3">Poste</th>
                {baremes.map(b => <th key={b.id} className="text-left p-3">{b.typeBourse}</th>)}
              </tr>
            </thead>
            <tbody className="text-slate-300">
              {baremes[0] && [
                ["Trajet aéroport en Belgique", "trajetAeroport"],
                ["Frais additionnels déplacement international", "fraisAdditionnels"],
                ["Allocation de subsistance (mensuelle)", "allocationMensuelle"],
                ["Allocation supplémentaire 13e mois", "allocation13eMois"],
                ["Frais d'encadrement/mois (forfait)", "fraisEncadrement"],
                ["Frais de recherche/opérationnels", "fraisRecherche"],
                ["Frais d'assurance", "fraisAssurance"],
                ["Frais de gestion", "fraisGestion"],
                ["Subsistance séjour 8-14 jours", "subsistance8_14j"],
                ["Subsistance séjour 15j-3 mois", "subsistance15j3m"],
                ["Subsistance séjour 1-3 mois", "subsistance1_3m"]
              ].map(([label, key]) => (
                <tr key={key} className="border-b border-white/5">
                  <td className="p-3 font-bold text-slate-400">{label}</td>
                  {baremes.map(b => <td key={b.id} className="p-3">{(b as any)[key as string]}</td>)}
                </tr>
              ))}
              {baremes.length === 0 && (
                <tr><td colSpan={2} className="p-6 text-center text-slate-500">Chargement du barème...</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {lineModal.open && (
        <BudgetLineModal
          data={lineModal.data || {}}
          category={lineModal.category!}
          onSave={handleSaveLine}
          onClose={() => setLineModal({ open: false })}
          saving={saving}
        />
      )}
      {bourseModal.open && (
        <BourseLineModal
          data={bourseModal.data || {}}
          onSave={handleSaveBourse}
          onClose={() => setBourseModal({ open: false })}
          saving={saving}
        />
      )}
      {missionModal.open && (
        <MissionLineModal
          data={missionModal.data || {}}
          onSave={handleSaveMission}
          onClose={() => setMissionModal({ open: false })}
          saving={saving}
        />
      )}
    </div>
  );
}

function FicheFields({ form, setForm }: { form: Partial<FundingApplication>; setForm: (f: Partial<FundingApplication>) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label className={labelCls()}>Type</label>
        <select value={form.type || "AMORCE"} onChange={e => setForm({ ...form, type: e.target.value as FundingApplicationType })} className={inputCls()}>
          {FUNDING_TYPES.map(t => <option key={t.value} value={t.value} className="bg-[#1a1a1a]">{t.label}</option>)}
        </select>
      </div>
      <div>
        <label className={labelCls()}>Durée du projet (mois)</label>
        <input type="number" min={1} value={form.dureeMois ?? 24} onChange={e => setForm({ ...form, dureeMois: parseInt(e.target.value) || 1 })} className={inputCls()} />
      </div>
      <div className="sm:col-span-2">
        <label className={labelCls()}>Titre du projet</label>
        <input type="text" value={form.titre || ""} onChange={e => setForm({ ...form, titre: e.target.value })} className={inputCls()} required />
      </div>
      <div>
        <label className={labelCls()}>Pays</label>
        <input type="text" value={form.pays || ""} onChange={e => setForm({ ...form, pays: e.target.value })} className={inputCls()} required />
      </div>
      <div />
      <div>
        <label className={labelCls()}>Coordonnateur Nord</label>
        <input type="text" value={form.coordonnateurNord || ""} onChange={e => setForm({ ...form, coordonnateurNord: e.target.value })} className={inputCls()} required />
      </div>
      <div>
        <label className={labelCls()}>EES Coordonnateur Nord</label>
        <input type="text" value={form.eesCoordonnateurNord || ""} onChange={e => setForm({ ...form, eesCoordonnateurNord: e.target.value })} className={inputCls()} required />
      </div>
      <div>
        <label className={labelCls()}>Coordonnateur Sud</label>
        <input type="text" value={form.coordonnateurSud || ""} onChange={e => setForm({ ...form, coordonnateurSud: e.target.value })} className={inputCls()} required />
      </div>
      <div>
        <label className={labelCls()}>EES Coordonnateur Sud</label>
        <input type="text" value={form.eesCoordonnateurSud || ""} onChange={e => setForm({ ...form, eesCoordonnateurSud: e.target.value })} className={inputCls()} required />
      </div>
    </div>
  );
}

function FicheFormModal({ form, setForm, onSubmit, onClose, saving, title }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-[#121212] border border-white/10 rounded-2xl max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto my-4 sm:my-8"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h3 className="font-bold text-white">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 cursor-pointer"><X className="h-4 w-4 text-slate-400" /></button>
        </div>
        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <FicheFields form={form} setForm={setForm} />
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-bold text-slate-300 hover:bg-white/5 cursor-pointer">Annuler</button>
            <button type="submit" disabled={saving} className="flex items-center gap-2 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black px-5 py-2.5 rounded-xl text-xs font-black cursor-pointer disabled:opacity-50">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>Créer la fiche</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function BudgetLineModal({ data, category, onSave, onClose, saving }: {
  data: Partial<AresBudgetLine>; category: BudgetLineCategory;
  onSave: (d: Partial<AresBudgetLine>) => void; onClose: () => void; saving: boolean;
}) {
  const [form, setForm] = useState<Partial<AresBudgetLine>>({ category, quantite: 1, anneeIndex: 1, ...data });
  const isPersonnel = category === "PERSONNEL";
  const total = (Number(form.montantUnitaire) || 0) * (Number(form.quantite) || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-[#121212] border border-white/10 rounded-2xl max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto my-4 sm:my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h3 className="font-bold text-white">{CATEGORY_LABELS[category]}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 cursor-pointer"><X className="h-4 w-4 text-slate-400" /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="p-6 space-y-4">
          <div>
            <label className={labelCls()}>Sous-rubrique</label>
            <select value={form.sousRubrique || ""} onChange={e => setForm({ ...form, sousRubrique: e.target.value })} className={inputCls()} required>
              <option value="" className="bg-[#1a1a1a]">Sélectionner...</option>
              {SOUS_RUBRIQUES[category].map(sr => <option key={sr.code} value={sr.code} className="bg-[#1a1a1a]">{sr.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls()}>Description {isPersonnel && "(qui ?)"}</label>
            <input type="text" value={form.description || ""} onChange={e => setForm({ ...form, description: e.target.value })} className={inputCls()} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls()}>Année prévue</label>
              <input type="number" min={1} value={form.anneeIndex ?? 1} onChange={e => setForm({ ...form, anneeIndex: parseInt(e.target.value) || 1 })} className={inputCls()} />
            </div>
            {isPersonnel && (
              <div>
                <label className={labelCls()}>Unité (jour, mois...)</label>
                <input type="text" value={form.unite || ""} onChange={e => setForm({ ...form, unite: e.target.value })} className={inputCls()} placeholder="mois" />
              </div>
            )}
          </div>
          {isPersonnel && (
            <div>
              <label className={labelCls()}>ETP (le cas échéant)</label>
              <input type="number" step={0.1} min={0} value={form.etp ?? ""} onChange={e => setForm({ ...form, etp: parseFloat(e.target.value) || undefined })} className={inputCls()} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls()}>Montant unitaire (€)</label>
              <input type="number" step={0.01} min={0} value={form.montantUnitaire ?? ""} onChange={e => setForm({ ...form, montantUnitaire: parseFloat(e.target.value) || 0 })} className={inputCls()} required />
            </div>
            <div>
              <label className={labelCls()}>Quantité</label>
              <input type="number" step={0.01} min={0.01} value={form.quantite ?? 1} onChange={e => setForm({ ...form, quantite: parseFloat(e.target.value) || 1 })} className={inputCls()} required />
            </div>
          </div>
          <div className="bg-white/5 rounded-lg p-3 flex justify-between items-center">
            <span className="text-xs font-bold text-slate-400">Total (calculé)</span>
            <span className="font-mono font-black text-[#D4AF37]">{fmt(total)} €</span>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-bold text-slate-300 hover:bg-white/5 cursor-pointer">Annuler</button>
            <button type="submit" disabled={saving} className="flex items-center gap-2 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black px-5 py-2.5 rounded-xl text-xs font-black cursor-pointer disabled:opacity-50">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>Enregistrer</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function BourseLineModal({ data, onSave, onClose, saving }: {
  data: Partial<BourseBudgetLine>; onSave: (d: Partial<BourseBudgetLine>) => void; onClose: () => void; saving: boolean;
}) {
  const [form, setForm] = useState<Partial<BourseBudgetLine>>({ anneeIndex: 1, ...data });
  const totalAllocation = (Number(form.montantUnitaireAlloc) || 0) * (Number(form.dureeBourseMois) || 0)
    + (Number(form.treizemeMois) || 0) + (Number(form.fraisInscription) || 0);
  const totalDeplacements = (Number(form.billetAvion) || 0) + (Number(form.trajetAeroportBelgique) || 0)
    + (Number(form.fraisVisa) || 0) + (Number(form.fraisMissionIndirects) || 0);

  const num = (key: keyof BourseBudgetLine) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [key]: parseFloat(e.target.value) || 0 });

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-[#121212] border border-white/10 rounded-2xl max-w-xl w-full shadow-2xl max-h-[90vh] overflow-y-auto my-4 sm:my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h3 className="font-bold text-white">Onglet E. Bourses</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 cursor-pointer"><X className="h-4 w-4 text-slate-400" /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls()}>Type de bourse</label>
              <select value={form.sousRubrique || ""} onChange={e => setForm({ ...form, sousRubrique: e.target.value })} className={inputCls()} required>
                <option value="" className="bg-[#1a1a1a]">Sélectionner...</option>
                {BOURSE_TYPES.map(t => <option key={t.code} value={t.code} className="bg-[#1a1a1a]">{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls()}>Année prévue</label>
              <input type="number" min={1} value={form.anneeIndex ?? 1} onChange={e => setForm({ ...form, anneeIndex: parseInt(e.target.value) || 1 })} className={inputCls()} />
            </div>
          </div>
          <div>
            <label className={labelCls()}>Description (thématique)</label>
            <input type="text" value={form.description || ""} onChange={e => setForm({ ...form, description: e.target.value })} className={inputCls()} required />
          </div>
          <div>
            <label className={labelCls()}>Lieu du séjour</label>
            <input type="text" value={form.lieuSejour || ""} onChange={e => setForm({ ...form, lieuSejour: e.target.value })} className={inputCls()} required />
          </div>

          <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 space-y-3">
            <p className="text-[11px] font-bold text-[#D4AF37] uppercase font-mono">Bloc Allocation de subsistance</p>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls()}>Durée bourse (mois)</label><input type="number" min={0} value={form.dureeBourseMois ?? 0} onChange={num("dureeBourseMois")} className={inputCls()} /></div>
              <div><label className={labelCls()}>Montant unit. allocation/mois (€)</label><input type="number" min={0} step={0.01} value={form.montantUnitaireAlloc ?? 0} onChange={num("montantUnitaireAlloc")} className={inputCls()} /></div>
              <div><label className={labelCls()}>13e mois (études, €)</label><input type="number" min={0} step={0.01} value={form.treizemeMois ?? 0} onChange={num("treizemeMois")} className={inputCls()} /></div>
              <div><label className={labelCls()}>Frais d'inscription (€)</label><input type="number" min={0} step={0.01} value={form.fraisInscription ?? 0} onChange={num("fraisInscription")} className={inputCls()} /></div>
            </div>
            <div className="flex justify-between text-xs pt-1"><span className="text-slate-400 font-bold">Total Allocation</span><span className="font-mono text-[#D4AF37] font-black">{fmt(totalAllocation)} €</span></div>
          </div>

          <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 space-y-3">
            <p className="text-[11px] font-bold text-blue-400 uppercase font-mono">Bloc Déplacements des boursiers</p>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls()}>Billet d'avion (€)</label><input type="number" min={0} step={0.01} value={form.billetAvion ?? 0} onChange={num("billetAvion")} className={inputCls()} /></div>
              <div><label className={labelCls()}>Trajet aéroport Belgique (€)</label><input type="number" min={0} step={0.01} value={form.trajetAeroportBelgique ?? 0} onChange={num("trajetAeroportBelgique")} className={inputCls()} /></div>
              <div><label className={labelCls()}>Frais de visa (€)</label><input type="number" min={0} step={0.01} value={form.fraisVisa ?? 0} onChange={num("fraisVisa")} className={inputCls()} /></div>
              <div><label className={labelCls()}>Frais mission indirects (€)</label><input type="number" min={0} step={0.01} value={form.fraisMissionIndirects ?? 0} onChange={num("fraisMissionIndirects")} className={inputCls()} /></div>
            </div>
            <div className="flex justify-between text-xs pt-1"><span className="text-slate-400 font-bold">Total Déplacements</span><span className="font-mono text-blue-400 font-black">{fmt(totalDeplacements)} €</span></div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-bold text-slate-300 hover:bg-white/5 cursor-pointer">Annuler</button>
            <button type="submit" disabled={saving} className="flex items-center gap-2 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black px-5 py-2.5 rounded-xl text-xs font-black cursor-pointer disabled:opacity-50">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>Enregistrer</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function MissionLineModal({ data, onSave, onClose, saving }: {
  data: Partial<MissionBudgetLine>; onSave: (d: Partial<MissionBudgetLine>) => void; onClose: () => void; saving: boolean;
}) {
  const [form, setForm] = useState<Partial<MissionBudgetLine>>({ anneeIndex: 1, dureeJours: 1, typeDeplacement: "Nord-Sud", ...data });
  const totalDeplacement = (Number(form.billetAvion) || 0) + (Number(form.deplacementLocal) || 0);
  const totalPerDiem = (Number(form.perDiemUnitaire) || 0) * (Number(form.dureeJours) || 0);
  const totalHotel = (Number(form.hotelUnitaire) || 0) * (Number(form.dureeJours) || 0);
  const totalFraisSejour = totalPerDiem + totalHotel;
  const totalMontantMission = totalDeplacement + totalFraisSejour + (Number(form.fraisGestionAccueil) || 0) + (Number(form.fraisDeplacementsIntl) || 0);

  const num = (key: keyof MissionBudgetLine) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [key]: parseFloat(e.target.value) || 0 });

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-[#121212] border border-white/10 rounded-2xl max-w-xl w-full shadow-2xl max-h-[90vh] overflow-y-auto my-4 sm:my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h3 className="font-bold text-white">Onglet F-G. Mission</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 cursor-pointer"><X className="h-4 w-4 text-slate-400" /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls()}>Type de mission (F1, F2...)</label>
              <input type="text" value={form.typeMission || ""} onChange={e => setForm({ ...form, typeMission: e.target.value })} className={inputCls()} required placeholder="F1" />
            </div>
            <div>
              <label className={labelCls()}>Type de déplacement</label>
              <select value={form.typeDeplacement || "Nord-Sud"} onChange={e => setForm({ ...form, typeDeplacement: e.target.value })} className={inputCls()}>
                <option value="Nord-Sud" className="bg-[#1a1a1a]">Nord-Sud</option>
                <option value="Sud-Sud" className="bg-[#1a1a1a]">Sud-Sud</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls()}>Description (qui ? nature)</label>
            <input type="text" value={form.description || ""} onChange={e => setForm({ ...form, description: e.target.value })} className={inputCls()} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls()}>Année prévue</label><input type="number" min={1} value={form.anneeIndex ?? 1} onChange={e => setForm({ ...form, anneeIndex: parseInt(e.target.value) || 1 })} className={inputCls()} /></div>
            <div><label className={labelCls()}>Durée (jours)</label><input type="number" min={0} value={form.dureeJours ?? 0} onChange={e => setForm({ ...form, dureeJours: parseInt(e.target.value) || 0 })} className={inputCls()} /></div>
          </div>

          <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 space-y-3">
            <p className="text-[11px] font-bold text-[#D4AF37] uppercase font-mono">Bloc Déplacements</p>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls()}>Billet d'avion (€)</label><input type="number" min={0} step={0.01} value={form.billetAvion ?? 0} onChange={num("billetAvion")} className={inputCls()} /></div>
              <div><label className={labelCls()}>Déplacement local (€)</label><input type="number" min={0} step={0.01} value={form.deplacementLocal ?? 0} onChange={num("deplacementLocal")} className={inputCls()} /></div>
            </div>
            <div className="flex justify-between text-xs pt-1"><span className="text-slate-400 font-bold">Total Déplacement</span><span className="font-mono text-[#D4AF37] font-black">{fmt(totalDeplacement)} €</span></div>
          </div>

          <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 space-y-3">
            <p className="text-[11px] font-bold text-blue-400 uppercase font-mono">Bloc Q1 Per diem &amp; Q2 Hôtel</p>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls()}>Per diem unitaire/jour (€)</label><input type="number" min={0} step={0.01} value={form.perDiemUnitaire ?? 0} onChange={num("perDiemUnitaire")} className={inputCls()} /></div>
              <div><label className={labelCls()}>Hôtel unitaire/jour (€)</label><input type="number" min={0} step={0.01} value={form.hotelUnitaire ?? 0} onChange={num("hotelUnitaire")} className={inputCls()} /></div>
            </div>
            <div className="flex justify-between text-xs pt-1"><span className="text-slate-400 font-bold">Total Frais de Séjour (per diem + hôtel)</span><span className="font-mono text-blue-400 font-black">{fmt(totalFraisSejour)} €</span></div>
          </div>

          <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 space-y-3">
            <p className="text-[11px] font-bold text-emerald-400 uppercase font-mono">Bloc Frais de gestion (accueil)</p>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls()}>Frais gestion/représentation (€)</label><input type="number" min={0} step={0.01} value={form.fraisGestionAccueil ?? 0} onChange={num("fraisGestionAccueil")} className={inputCls()} /></div>
              <div><label className={labelCls()}>Frais déplacements intl. étranger (€)</label><input type="number" min={0} step={0.01} value={form.fraisDeplacementsIntl ?? 0} onChange={num("fraisDeplacementsIntl")} className={inputCls()} /></div>
            </div>
          </div>

          <div className="bg-white/5 rounded-lg p-3 flex justify-between items-center">
            <span className="text-xs font-bold text-slate-400">Total Montant Mission (calculé)</span>
            <span className="font-mono font-black text-[#D4AF37]">{fmt(totalMontantMission)} €</span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-bold text-slate-300 hover:bg-white/5 cursor-pointer">Annuler</button>
            <button type="submit" disabled={saving} className="flex items-center gap-2 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black px-5 py-2.5 rounded-xl text-xs font-black cursor-pointer disabled:opacity-50">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>Enregistrer</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
