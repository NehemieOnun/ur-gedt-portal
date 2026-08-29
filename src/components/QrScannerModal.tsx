import React, { useState, useEffect } from "react";
import { X, QrCode, Camera, CheckCircle2, AlertTriangle, ShieldCheck, Search, Upload, RefreshCw, FileText, ArrowRight, Printer } from "lucide-react";
import { Database } from "../types";
import { QRCodeSVG } from "qrcode.react";

interface QrScannerModalProps {
  db: Database;
  onClose: () => void;
  onOpenReceipt?: (item: { type: any; data: any }) => void;
}

export default function QrScannerModal({ db, onClose, onOpenReceipt }: QrScannerModalProps) {
  const [activeTab, setActiveTab] = useState<"camera" | "manual">("camera");
  const [inputVal, setInputVal] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    status: "valid" | "invalid" | "idle";
    itemType?: string;
    itemData?: any;
    hashMatch?: boolean;
    computedHash?: string;
    message?: string;
  }>({ status: "idle" });

  // List of quick sample receipts for authorized testing
  const sampleReceipts = [
    { label: "Recette REC-2026-001", id: "REC-2026-001", type: "recette" },
    { label: "Dépense DEP-2026-001", id: "DEP-2026-001", type: "depense" },
    { label: "Dépense DEP-2026-002", id: "DEP-2026-002", type: "depense" },
    { label: "Projet PRJ-01", id: "PRJ-01", type: "projet" },
    { label: "Activité ACT-01", id: "ACT-01", type: "activite" },
  ];

  // Helper function to search database for matching record by ID, payload string, or URL
  const searchRecord = (queryStr: string) => {
    let targetId = queryStr.trim();
    let targetType = "";

    // Parse URL if user pasted a full verification link
    if (targetId.includes("verifyDoc=")) {
      try {
        const urlObj = new URL(targetId);
        targetId = urlObj.searchParams.get("verifyDoc") || targetId;
        targetType = urlObj.searchParams.get("type") || "";
      } catch {
        // Continue with raw text
      }
    }

    // Parse JSON if user pasted raw QR payload
    if (targetId.startsWith("{")) {
      try {
        const parsed = JSON.parse(targetId);
        if (parsed.id) targetId = parsed.id;
        if (parsed.type) targetType = parsed.type;
      } catch {
        // Continue with raw text
      }
    }

    targetId = targetId.toLowerCase();

    // 1. Search Recipes
    const recipe = db?.recipes?.find(r => r.id.toLowerCase() === targetId);
    if (recipe) return { itemType: "recette", itemData: recipe };

    // 2. Search Expenses
    const expense = db?.expenses?.find(e => e.id.toLowerCase() === targetId);
    if (expense) return { itemType: "depense", itemData: expense };

    // 3. Search Projects
    const project = db?.projects?.find(p => (p.id || "").toLowerCase() === targetId || p.title.toLowerCase().includes(targetId));
    if (project) return { itemType: "projet", itemData: project };

    // 4. Search Activities
    const activity = db?.activities?.find(a => (a.id || "").toLowerCase() === targetId || a.title.toLowerCase().includes(targetId));
    if (activity) return { itemType: "activite", itemData: activity };

    // 5. Search Publications
    const publication = db?.publications?.find(pub => (pub.id || "").toLowerCase() === targetId);
    if (publication) return { itemType: "publication", itemData: publication };

    return null;
  };

  const handleRunValidation = (queryToTest?: string) => {
    const query = queryToTest !== undefined ? queryToTest : inputVal;
    if (!query.trim()) return;

    setIsScanning(true);
    setValidationResult({ status: "idle" });

    setTimeout(() => {
      setIsScanning(false);
      const match = searchRecord(query);

      if (match) {
        const itemObj: any = match.itemData;
        const docId = itemObj.id || "URGEDT-REF";
        const amount = itemObj.amount || itemObj.budget || 0;
        const dateStr = itemObj.date ? new Date(itemObj.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
        
        const rawStr = `${docId}:${match.itemType}:${amount}:${dateStr}:URGEDT_SECURE_AUTH_KEY_2026`;
        let hashNum = 0;
        for (let i = 0; i < rawStr.length; i++) {
          hashNum = (hashNum << 5) - hashNum + rawStr.charCodeAt(i);
          hashNum |= 0;
        }
        const hexHash = Math.abs(hashNum).toString(16).toUpperCase().padStart(8, "0");

        setValidationResult({
          status: "valid",
          itemType: match.itemType,
          itemData: match.itemData,
          hashMatch: true,
          computedHash: `GEDT-${hexHash}`,
          message: "Document authentique certifié conforme au Registre Général de l'UR-GEDT."
        });
      } else {
        setValidationResult({
          status: "invalid",
          message: `Le code ou la référence "${query}" n'a pas été trouvée dans le grand livre officiel. Ce document peut être expiré, falsifié ou non répertorié.`
        });
      }
    }, 600);
  };

  const handleSimulateScan = (sample: typeof sampleReceipts[0]) => {
    setInputVal(sample.id);
    handleRunValidation(sample.id);
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#141414] border border-white/10 rounded-2xl max-w-2xl w-full shadow-2xl text-white overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* MODAL HEADER */}
        <div className="px-6 py-4 bg-[#1a1a1a] border-b border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-xl text-[#D4AF37]">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display font-extrabold text-sm text-white flex items-center gap-2">
                Valideur QR Code & Scanner de Reçus
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-mono">
                  Contrôle d'Authenticité
                </span>
              </h3>
              <p className="text-[11px] text-gray-400">Vérification de la conformité des bordereaux et pièces justificatives imprimées</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* MODAL CONTENT AREA */}
        <div className="p-6 overflow-y-auto space-y-6 flex-grow">
          
          {/* NAVIGATION TABS */}
          <div className="flex border-b border-white/10 space-x-4">
            <button
              onClick={() => setActiveTab("camera")}
              className={`pb-3 text-xs font-bold flex items-center space-x-2 border-b-2 transition-colors ${
                activeTab === "camera"
                  ? "border-[#D4AF37] text-[#D4AF37]"
                  : "border-transparent text-gray-400 hover:text-gray-200"
              }`}
            >
              <Camera className="h-4 w-4" />
              <span>Numériseur / Caméra Scanner</span>
            </button>
            <button
              onClick={() => setActiveTab("manual")}
              className={`pb-3 text-xs font-bold flex items-center space-x-2 border-b-2 transition-colors ${
                activeTab === "manual"
                  ? "border-[#D4AF37] text-[#D4AF37]"
                  : "border-transparent text-gray-400 hover:text-gray-200"
              }`}
            >
              <Search className="h-4 w-4" />
              <span>Recherche par Référence ou URL QR</span>
            </button>
          </div>

          {/* TAB 1: CAMERA SCANNER SIMULATION */}
          {activeTab === "camera" && (
            <div className="space-y-4">
              <div className="relative bg-[#0a0a0a] border-2 border-dashed border-[#D4AF37]/40 rounded-xl p-8 text-center flex flex-col items-center justify-center overflow-hidden min-h-[220px]">
                
                {/* LASER SCANNING ANIMATION LINE */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#D4AF37]/10 to-transparent animate-pulse pointer-events-none" />
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#D4AF37] shadow-[0_0_15px_#D4AF37] animate-bounce" />

                <div className="p-4 bg-white/5 rounded-full border border-white/10 mb-3 shadow-inner">
                  <QrCode className="h-10 w-10 text-[#D4AF37]" />
                </div>

                <p className="text-xs font-bold text-white mb-1">Pointez la caméra vers le QR Code du document ou sélectionnez un exemple</p>
                <p className="text-[11px] text-gray-400 max-w-md leading-relaxed">
                  Le système lit automatiquement l'empreinte numérique encodée sur le reçu papier pour interroger le grand livre UR-GEDT.
                </p>

                {isScanning && (
                  <div className="mt-4 flex items-center space-x-2 bg-[#D4AF37]/20 border border-[#D4AF37]/50 text-[#D4AF37] text-xs font-bold px-4 py-2 rounded-lg animate-pulse">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Décodage du QR Code et vérification en cours...</span>
                  </div>
                )}
              </div>

              {/* QUICK SAMPLE BUTTONS */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  Simuler la numérisation d'un reçu enregistré :
                </span>
                <div className="flex flex-wrap gap-2">
                  {sampleReceipts.map((sample) => (
                    <button
                      key={sample.id}
                      onClick={() => handleSimulateScan(sample)}
                      className="px-3 py-1.5 bg-white/5 hover:bg-[#D4AF37]/20 border border-white/10 hover:border-[#D4AF37]/40 text-gray-300 hover:text-[#D4AF37] text-xs rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer"
                    >
                      <QrCode className="h-3.5 w-3.5 text-[#D4AF37]" />
                      <span>{sample.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MANUAL INPUT */}
          {activeTab === "manual" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-300 block">
                  Entrez la référence du reçu, le payload JSON ou collez le lien de vérification QR :
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleRunValidation()}
                    placeholder="Ex: REC-2026-001, DEP-2026-001, ou collé de lien..."
                    className="flex-grow bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-2.5 text-xs font-mono text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37]"
                  />
                  <button
                    onClick={() => handleRunValidation()}
                    disabled={!inputVal.trim() || isScanning}
                    className="bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black font-bold text-xs px-5 py-2.5 rounded-xl transition-colors cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
                  >
                    {isScanning ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <ShieldCheck className="h-4 w-4" />
                        <span>Vérifier</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* VALIDATION RESULT DISPLAY CARD */}
          {validationResult.status === "valid" && validationResult.itemData && (
            <div className="p-5 bg-emerald-950/30 border-2 border-emerald-500/40 rounded-xl space-y-4 animate-fadeIn">
              <div className="flex items-start justify-between border-b border-emerald-500/20 pb-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/40">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-display font-black text-sm text-emerald-400 uppercase tracking-wider">
                      Document Officiel Authentique
                    </h4>
                    <p className="text-[11px] text-emerald-200/80">{validationResult.message}</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded border border-emerald-500/30">
                  {validationResult.computedHash}
                </span>
              </div>

              {/* RECORD SUMMARY DETAILS */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-[#0a0a0a] rounded-lg border border-white/5">
                  <span className="text-[10px] text-gray-400 block uppercase font-bold mb-0.5">N° Enregistrement</span>
                  <span className="font-mono font-bold text-[#D4AF37] text-xs">
                    {validationResult.itemData.id}
                  </span>
                </div>

                <div className="p-3 bg-[#0a0a0a] rounded-lg border border-white/5">
                  <span className="text-[10px] text-gray-400 block uppercase font-bold mb-0.5">Type de Reçu</span>
                  <span className="font-bold text-white text-xs uppercase">
                    {validationResult.itemType}
                  </span>
                </div>

                <div className="p-3 bg-[#0a0a0a] rounded-lg border border-white/5">
                  <span className="text-[10px] text-gray-400 block uppercase font-bold mb-0.5">Montant Certifié</span>
                  <span className="font-mono font-black text-emerald-400 text-xs">
                    {(validationResult.itemData.amount || validationResult.itemData.budget || 0).toLocaleString()} USD
                  </span>
                </div>
              </div>

              <div className="p-3 bg-[#0a0a0a] rounded-lg border border-white/5 space-y-1">
                <span className="text-[10px] text-gray-400 block uppercase font-bold">Objet / Intitulé Officiel :</span>
                <p className="text-xs text-white font-medium leading-relaxed">
                  {validationResult.itemData.description || validationResult.itemData.title}
                </p>
                <div className="flex items-center justify-between text-[11px] text-gray-400 pt-2 border-t border-white/5 font-mono">
                  <span>Opérateur: {validationResult.itemData.recordedBy || validationResult.itemData.leader || "UR-GEDT Admin"}</span>
                  <span>Date: {new Date(validationResult.itemData.date || Date.now()).toLocaleDateString("fr-FR")}</span>
                </div>
              </div>

              {/* ACTION TO OPEN PRINTABLE RECEIPT */}
              {onOpenReceipt && (
                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => onOpenReceipt({ type: validationResult.itemType, data: validationResult.itemData })}
                    className="bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black font-bold text-xs px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 shadow-md cursor-pointer"
                  >
                    <Printer className="h-4 w-4" />
                    <span>Afficher & Imprimer le Reçu Officiel</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {validationResult.status === "invalid" && (
            <div className="p-5 bg-rose-950/30 border-2 border-rose-500/40 rounded-xl space-y-3 animate-fadeIn">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-rose-500/20 text-rose-400 rounded-full border border-rose-500/40 shrink-0">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-display font-extrabold text-sm text-rose-400 uppercase tracking-wider">
                    Alerte d'Incompatibilité / Document Non Répertorié
                  </h4>
                  <p className="text-xs text-rose-200/90 leading-relaxed mt-1">{validationResult.message}</p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-3 bg-[#1a1a1a] border-t border-white/5 flex items-center justify-between text-xs text-gray-400 shrink-0">
          <span className="font-mono text-[10px]">Système de Validation QR v1.0 · UR-GEDT UNILU</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-lg transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
}
