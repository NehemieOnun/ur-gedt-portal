import React, { useState } from "react";
import { Printer, X, FileText, Download, Loader2, QrCode, ShieldCheck, CheckCircle2, Copy, Check, ExternalLink } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Recipe, Expense, Project, FieldActivity } from "../types";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface PrintReceiptProps {
  item: {
    type: "recette" | "depense" | "projet" | "activite" | "publication" | "actualite" | "message" | "user" | "rapport_recettes" | "rapport_depenses" | "rapport_projets" | "rapport_activites";
    data: any; // Can be Recipe, Expense, Project, FieldActivity, Publication, News, etc. or full arrays for reports
  } | null;
  users?: { name: string; role: string; active?: boolean }[];
  onClose: () => void;
}

export default function PrintReceipt({ item, users = [], onClose }: PrintReceiptProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [showQrDetails, setShowQrDetails] = useState(false);
  const [copiedPayload, setCopiedPayload] = useState(false);

  if (!item) return null;

  // Look up the current real holder of each institutional role from live data,
  // instead of a hardcoded name — so the signature block always reflects who is
  // actually in the system, not whoever was there when this template was written.
  const getRoleHolderName = (roleName: string): string => {
    const holder = users.find((u) => u.role === roleName && u.active !== false);
    return holder ? holder.name : "Poste vacant";
  };
  const secretaireName = getRoleHolderName("Secrétaire");
  const comptableName = getRoleHolderName("Comptable");
  const directeurName = getRoleHolderName("Directeur");

  // Compute QR Verification Payload and Hash
  const isTempId = (id: string) => /^(exp|rec|rev)-\d{10,}$/.test(id);

  const computeVerificationData = () => {
    let docId = "URGEDT-DOC";
    let amount = 0;
    let dateStr = new Date().toISOString().slice(0, 10);

    if (Array.isArray(item.data)) {
      docId = `REP-${item.type.toUpperCase()}-${dateStr}`;
      amount = item.data.reduce((acc: number, curr: any) => acc + (curr.amount || curr.budget || 0), 0);
    } else if (item.data) {
      docId = item.data.id || `DOC-${item.type.toUpperCase()}-001`;
      amount = item.data.amount || item.data.budget || 0;
      dateStr = item.data.date ? new Date(item.data.date).toISOString().slice(0, 10) : dateStr;
    }

    const rawStr = `${docId}:${item.type}:${amount}:${dateStr}:URGEDT_SECURE_AUTH_KEY_2026`;
    let hashNum = 0;
    for (let i = 0; i < rawStr.length; i++) {
      hashNum = (hashNum << 5) - hashNum + rawStr.charCodeAt(i);
      hashNum |= 0;
    }
    const hexHash = Math.abs(hashNum).toString(16).toUpperCase().padStart(8, "0");

    const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://gedt.unilu.ac.cd";
    const verifyUrl = `${baseUrl}/?verifyDoc=${encodeURIComponent(docId)}&type=${encodeURIComponent(item.type)}&hash=${hexHash}`;

    const payloadObj = {
      v: "1.0",
      id: docId,
      type: item.type,
      amount,
      date: dateStr,
      issuer: "UR-GEDT / UNILU",
      hash: `GEDT-${hexHash}`,
      verifyUrl
    };

    return {
      payloadStr: JSON.stringify(payloadObj, null, 2),
      verifyUrl,
      hexHash,
      docId,
      amount,
      dateStr
    };
  };

  const qrData = computeVerificationData();
  const currentDocId = !Array.isArray(item.data) ? String(item.data?.id || "") : "";
  const qrPending = currentDocId !== "" && isTempId(currentDocId);

  const handleCopyPayload = () => {
    navigator.clipboard.writeText(qrData.verifyUrl);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    const element = document.getElementById("printable-receipt-content");
    if (!element) return;
    setIsExporting(true);
    try {
      // Create high-res canvas of the report container
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        onclone: (clonedDoc) => {
          // Sanitize style tags in cloned document to remove oklch color functions unsupported by html2canvas
          const styleEls = clonedDoc.querySelectorAll("style");
          styleEls.forEach((styleEl) => {
            if (styleEl.textContent && styleEl.textContent.includes("oklch")) {
              styleEl.textContent = styleEl.textContent.replace(/oklch\([^;}]*\)/gi, "#888888");
            }
          });

          // Sanitize any inline element styles if present
          const allEls = clonedDoc.querySelectorAll("*");
          allEls.forEach((el) => {
            const htmlEl = el as HTMLElement;
            if (htmlEl.style && htmlEl.style.cssText && htmlEl.style.cssText.includes("oklch")) {
              htmlEl.style.cssText = htmlEl.style.cssText.replace(/oklch\([^;}]*\)/gi, "#888888");
            }
          });
        }
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "p",
        unit: "mm",
        format: "a4"
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      // First page
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      // Additional pages if needed
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      const dateStr = new Date().toISOString().slice(0, 10);
      let filename = `URGEDT_${item.type}_${item.data.id || dateStr}.pdf`;
      if (item.type === "recette") {
        filename = `URGEDT_Fiche_Recette_${item.data.id || dateStr}.pdf`;
      } else if (item.type === "depense") {
        filename = `URGEDT_Fiche_Depense_${item.data.id || dateStr}.pdf`;
      }
      pdf.save(filename);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("La génération directe du PDF a échoué. Utilisation de l'impression système pour sauvegarder en PDF...");
      window.print();
    } finally {
      setIsExporting(false);
    }
  };

  const getTodayDateString = () => {
    return new Date().toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#111111] rounded-2xl shadow-2xl max-w-3xl w-full border border-white/5 flex flex-col max-h-[90vh]">
        
        {/* INTERACTION HEADER (HIDDEN IN PRINT) */}
        <div className="flex flex-wrap items-center justify-between px-6 py-4 border-b border-white/5 no-print bg-[#151515] rounded-t-2xl shrink-0 gap-3">
          <div className="flex items-center space-x-2 text-white font-display font-bold text-sm">
            <FileText className="h-5 w-5 text-[#D4AF37]" />
            <span>Générateur de Document Officiel (PDF / Impression)</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportPDF}
              disabled={isExporting}
              className="flex items-center space-x-1.5 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black font-sans text-xs font-bold px-3.5 py-2 rounded-lg shadow-md transition-all cursor-pointer disabled:opacity-50"
              title="Exporter directement un fichier .PDF"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-black" />
                  <span>Génération PDF...</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  <span>Exporter PDF (.pdf)</span>
                </>
              )}
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 bg-white/10 hover:bg-white/20 text-white font-sans text-xs font-bold px-3.5 py-2 rounded-lg shadow-md border border-white/10 transition-all cursor-pointer"
              title="Ouvrir la fenêtre d'impression système"
            >
              <Printer className="h-4 w-4 text-[#D4AF37]" />
              <span>Imprimer</span>
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white bg-[#151515] p-2 rounded-lg border border-white/5 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {qrPending && (
          <div className="no-print px-6 py-2.5 bg-amber-500/10 border-b border-amber-500/30 text-amber-400 text-xs font-semibold flex items-center gap-2 shrink-0">
            <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
            <span>Enregistrement en cours de confirmation par le serveur — patientez avant d'imprimer ou de scanner le code QR, sans quoi il pourrait ne pas être reconnu lors de la vérification.</span>
          </div>
        )}

        {/* PRINTABLE AREA */}
        <div className="p-8 md:p-12 overflow-y-auto flex-grow bg-[#12261C]" id="printable-receipt-content">
          <div className="border-4 border-double border-[#D4AF37]/40 p-6 md:p-8 rounded-lg relative bg-white print-card text-slate-800">
            
            {/* OFFICIAL HEADER WITH INTEGRATED QR SECURITY BADGE */}
            <div className="pb-6 border-b-2 border-slate-300 flex items-center justify-between gap-4">
              <div className="flex-grow text-center space-y-1.5">
                <p className="text-xs font-bold tracking-wider uppercase font-mono text-slate-500">République Démocratique du Congo</p>
                <h2 className="font-display text-lg md:text-xl font-extrabold text-slate-900 tracking-tight uppercase leading-snug">
                  Université de Lubumbashi
                </h2>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Faculté des Sciences Sociales</p>
                <h3 className="font-display text-xs font-black text-[#B8962E] tracking-wider uppercase">
                  Unité de Recherche sur la Gouvernance, l'Environnement et le Développement Territorial
                </h3>
                <p className="text-[9px] text-slate-400 italic">UR-GEDT · Campus Kasapa, Lubumbashi</p>
              </div>

              {/* TOP HEADER QR SECURITY EMBLEM */}
              <div className="hidden sm:flex flex-col items-center justify-center p-2 bg-slate-50 border border-slate-200 rounded-lg shadow-sm shrink-0">
                <div className="p-1 bg-white rounded border border-slate-200 shadow-inner">
                  {qrPending ? (
                    <div style={{ width: 76, height: 76 }} className="flex items-center justify-center text-center text-[8px] font-bold text-slate-500 p-1">
                      Génération du code en cours...
                    </div>
                  ) : (
                    <QRCodeSVG 
                      value={qrData.verifyUrl} 
                      size={76} 
                      level="H"
                      fgColor="#0f172a"
                    />
                  )}
                </div>
                <span className="text-[8px] font-mono font-bold text-[#B8962E] mt-1 uppercase tracking-tight">QR Securisé</span>
                <span className="text-[7px] font-mono text-slate-500">GEDT-{qrData.hexHash}</span>
              </div>
            </div>

            {/* WATERMARK EMBLEM (Styled absolute center accent) */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none z-0">
              <span className="font-display text-[150px] font-black tracking-widest text-charcoal">GEDT</span>
            </div>

            <div className="relative z-10 space-y-6 pt-6">
              
              {/* DOCUMENT META TITLE */}
              <div className="text-center">
                <span className="bg-slate-100 px-4 py-2 rounded-lg border border-slate-200 text-sm font-display font-extrabold uppercase tracking-widest text-slate-900 inline-block shadow-inner">
                  {item.type === "recette" && "Reçu Officiel de Recette"}
                  {item.type === "depense" && "Bordereau Officiel de Dépense"}
                  {item.type === "projet" && "Fiche Signalétique de Projet de Recherche"}
                  {item.type === "activite" && "Fiche Descriptive d'Activité de Terrain"}
                  {item.type === "publication" && "Fiche Individuelle de Publication Scientifique"}
                  {item.type === "actualite" && "Fiche d'Information / Actualité Officielle"}
                  {item.type === "message" && "Fiche de Message de Contact"}
                  {item.type === "user" && "Fiche d'Utilisateur / Membre"}
                  {item.type === "rapport_recettes" && "Rapport Périodique des Recettes"}
                  {item.type === "rapport_depenses" && "Rapport Périodique des Dépenses"}
                  {item.type === "rapport_projets" && "Registre des Projets Académiques"}
                  {item.type === "rapport_activites" && "Rapport Scientifique des Activités de Terrain"}
                </span>
                
                {/* ID AND DATETIME */}
                {(item.type === "recette" || item.type === "depense") && (
                  <div className="mt-4 flex flex-col items-center justify-center space-y-1 font-mono text-xs text-slate-600">
                    <p className="text-sm font-bold text-slate-900">N° d'enregistrement : <span className="text-[#B8962E] font-extrabold">{item.data.id}</span></p>
                    <p>Généré automatiquement le : {item.data?.date ? new Date(item.data.date).toLocaleString("fr-FR") : getTodayDateString()}</p>
                  </div>
                )}

                {(item.type === "projet" || item.type === "activite" || item.type === "publication" || item.type === "actualite" || item.type === "message" || item.type === "user") && (
                  <div className="mt-4 flex flex-col items-center justify-center space-y-1 font-mono text-xs text-slate-600">
                    <p className="text-sm font-bold text-slate-900">Réf : <span className="text-[#B8962E] font-extrabold">{item.data.id || "URGEDT-DOC"}</span></p>
                    <p>Document généré le : {getTodayDateString()}</p>
                  </div>
                )}
                
                {item.type.startsWith("rapport_") && (
                  <div className="mt-4 flex flex-col items-center justify-center space-y-1 font-mono text-xs text-slate-600">
                    <p className="text-xs">Registre exporté le : {getTodayDateString()}</p>
                    <p className="text-[10px] uppercase font-bold text-slate-500">Exercice budgétaire en cours</p>
                  </div>
                )}
              </div>

              {/* BODY: INDIVIDUAL RECETTE / DEPENSE RECORD */}
              {(item.type === "recette" || item.type === "depense") && (
                <div className="py-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4 border-y border-slate-200 py-4 text-xs font-sans">
                    <div className="space-y-3">
                      <p className="text-slate-500 font-medium">Description de la transaction :</p>
                      <p className="font-bold text-sm text-slate-950 leading-relaxed">{item.data.description}</p>
                    </div>
                    <div className="space-y-3 text-right">
                      <p className="text-slate-500 font-medium">
                        {item.type === "recette" ? "Source / Provenance (Bailleur/Partenaire) :" : "Bénéficiaire / Destinataire :"}
                      </p>
                      <p className="font-bold text-sm text-slate-950">
                        {item.type === "recette" ? item.data.source : item.data.beneficiary}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-xs pt-2">
                    <div className="p-3 bg-slate-50 rounded border border-slate-200 text-center">
                      <span className="text-[10px] uppercase text-slate-500 font-bold block mb-1">Catégorie Budgétaire</span>
                      <span className="font-bold text-slate-800 uppercase text-xs">
                        {item.type === "recette" ? item.data.type : item.data.category}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded border border-slate-200 text-center">
                      <span className="text-[10px] uppercase text-slate-500 font-bold block mb-1">Agent Comptable / Opérateur</span>
                      <span className="font-bold text-slate-800 text-xs">{item.data.recordedBy || "Secrétariat UR-GEDT"}</span>
                    </div>
                    <div className="p-3 bg-[#D4AF37]/10 rounded border border-[#D4AF37]/30 text-center">
                      <span className="text-[10px] uppercase text-[#B8962E] font-extrabold block mb-1">Montant Intégral Certifié</span>
                      <span className="font-mono font-black text-slate-950 text-sm">{(item.data.amount || 0).toLocaleString()} USD</span>
                    </div>
                  </div>

                  {/* ATTACHED PROOF / SCANNED RECEIPT IF PRESENT */}
                  {item.data.receiptUrl && (
                    <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700 border-b border-slate-200 pb-2">
                        <span className="uppercase text-[10px] text-slate-500 tracking-wider">Pièce Justificative Numérisée & Attachée</span>
                        <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold">Document Numérisé Conforme</span>
                      </div>
                      <div className="flex items-center space-x-4 pt-1">
                        <img 
                          src={item.data.receiptUrl} 
                          alt="Pièce Justificative" 
                          className="h-24 w-auto max-w-[200px] object-cover rounded border border-slate-300 shadow-sm"
                          referrerPolicy="no-referrer"
                        />
                        <div className="text-xs text-slate-600 space-y-1">
                          <p className="font-bold text-slate-800">Justificatif comptable numérisé</p>
                          <p className="text-[11px] text-slate-500 italic">Preuve numérisée enregistrée et conservée dans les serveurs de l'UR-GEDT pour archivage réglementaire.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* OFFICIAL ARCHIVING SECURITY STAMP */}
                  <div className="mt-4 p-3 bg-slate-100/80 border border-slate-300 rounded text-center font-mono text-[10px] text-slate-600 space-y-0.5">
                    <p className="font-bold text-slate-800 uppercase tracking-widest">Sceau d'Archivage Officiel & Empreinte Numérique</p>
                    <p className="text-slate-500">
                      EMPREINTE : ARCHIVE-GEDT-{item.type === "recette" ? "REC" : "DEP"}-{item.data.id || "000"}-{(item.data.date || "").slice(0, 10)}
                    </p>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-relaxed text-center italic pt-2">
                    La présente attestation certifie que la transaction décrite ci-dessus a été formellement validée et imputée à la comptabilité générale de l'UR-GEDT pour le compte de l'Université de Lubumbashi.
                  </p>
                </div>
              )}

              {/* BODY: INDIVIDUAL PROJET RECORD */}
              {item.type === "projet" && (
                <div className="py-4 space-y-4 font-sans text-xs">
                  <div className="border-b border-slate-200 pb-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Intitulé Officiel du Projet</p>
                    <h3 className="font-display font-extrabold text-slate-900 text-base leading-snug mt-1">{item.data.title}</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4 py-2 border-b border-slate-200">
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-500">Chef de Projet / Leader</p>
                      <p className="font-bold text-slate-900 text-sm mt-0.5">{item.data.leader}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase text-slate-500">Bailleur / Financement</p>
                      <p className="font-bold text-slate-900 text-sm mt-0.5">{item.data.funding}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 py-2">
                    <div className="p-3 bg-slate-50 rounded border border-slate-200 text-center">
                      <span className="text-[10px] uppercase text-slate-500 font-bold block mb-1">Statut du Projet</span>
                      <span className="font-bold text-slate-800 text-xs">{item.data.status}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded border border-slate-200 text-center">
                      <span className="text-[10px] uppercase text-slate-500 font-bold block mb-1">Année d'Exécution</span>
                      <span className="font-bold text-slate-800 text-xs">{item.data.year || new Date().getFullYear()}</span>
                    </div>
                    <div className="p-3 bg-[#D4AF37]/10 rounded border border-[#D4AF37]/30 text-center">
                      <span className="text-[10px] uppercase text-[#B8962E] font-extrabold block mb-1">Budget Alloué</span>
                      <span className="font-mono font-black text-slate-950 text-sm">{(item.data.budget || 0).toLocaleString()} USD</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">Description Synthétique</p>
                    <p className="p-4 bg-slate-50 rounded border border-slate-200 text-slate-800 leading-relaxed italic">{item.data.description}</p>
                  </div>
                </div>
              )}

              {/* BODY: INDIVIDUAL ACTIVITE RECORD */}
              {item.type === "activite" && (
                <div className="py-4 space-y-4 font-sans text-xs">
                  <div className="border-b border-slate-200 pb-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Intitulé de l'Activité de Terrain</p>
                    <h3 className="font-display font-extrabold text-slate-900 text-base leading-snug mt-1">{item.data.title}</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4 py-2 border-b border-slate-200">
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-500">Lieu d'Investigation / Mission</p>
                      <p className="font-bold text-slate-900 text-sm mt-0.5">{item.data.location}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase text-slate-500">Date Prévue / Réalisée</p>
                      <p className="font-bold text-slate-900 text-sm mt-0.5">{new Date(item.data.date).toLocaleDateString("fr-FR")}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 py-2">
                    <div className="p-3 bg-slate-50 rounded border border-slate-200 text-center">
                      <span className="text-[10px] uppercase text-slate-500 font-bold block mb-1">Statut d'Exécution</span>
                      <span className="font-bold text-slate-800 text-xs">{item.data.status}</span>
                    </div>
                    <div className="p-3 bg-[#D4AF37]/10 rounded border border-[#D4AF37]/30 text-center">
                      <span className="text-[10px] uppercase text-[#B8962E] font-extrabold block mb-1">Budget Mobilisé</span>
                      <span className="font-mono font-black text-slate-950 text-sm">{(item.data.budget || 0).toLocaleString()} USD</span>
                    </div>
                  </div>

                  {item.data.researchers && item.data.researchers.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">Chercheurs & Enquêteurs Mobilisés</p>
                      <div className="p-3 bg-slate-50 rounded border border-slate-200 text-slate-800 font-medium">
                        {Array.isArray(item.data.researchers) ? item.data.researchers.join(", ") : item.data.researchers}
                      </div>
                    </div>
                  )}

                  <div className="pt-2">
                    <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">Résumé Scientifique & Objectifs</p>
                    <p className="p-4 bg-slate-50 rounded border border-slate-200 text-slate-800 leading-relaxed italic">{item.data.description}</p>
                  </div>
                </div>
              )}

              {/* BODY: INDIVIDUAL PUBLICATION RECORD */}
              {item.type === "publication" && (
                <div className="py-4 space-y-4 font-sans text-xs">
                  <div className="border-b border-slate-200 pb-4">
                    <span className="inline-block bg-[#D4AF37]/10 text-[#B8962E] text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded border border-[#D4AF37]/20 mb-2">
                      {item.data.type}
                    </span>
                    <h3 className="font-display font-extrabold text-slate-900 text-base leading-snug">{item.data.title}</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4 py-2 border-b border-slate-200">
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-500">Auteurs / Chercheurs</p>
                      <p className="font-bold text-slate-900 text-sm mt-0.5">{item.data.authors}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase text-slate-500">Support / Revue / Éditeur</p>
                      <p className="font-bold text-slate-900 text-sm mt-0.5">{item.data.journal}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 py-2">
                    <div className="p-3 bg-slate-50 rounded border border-slate-200 text-center">
                      <span className="text-[10px] uppercase text-slate-500 font-bold block mb-1">Année de Parution</span>
                      <span className="font-bold text-slate-800 text-sm">{item.data.year}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded border border-slate-200 text-center">
                      <span className="text-[10px] uppercase text-slate-500 font-bold block mb-1">Identifiant DOI / Lien</span>
                      <span className="font-mono text-slate-800 text-xs truncate block">{item.data.doi || "Disponible en bibliothèque UR-GEDT"}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* BODY: INDIVIDUAL ACTUALITE RECORD */}
              {item.type === "actualite" && (
                <div className="py-4 space-y-4 font-sans text-xs">
                  <div className="border-b border-slate-200 pb-4">
                    <span className="inline-block bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded border border-slate-300 mb-2">
                      {item.data.category}
                    </span>
                    <h3 className="font-display font-extrabold text-slate-900 text-base leading-snug">{item.data.title}</h3>
                    <p className="text-slate-500 text-[11px] mt-1">Publié le : {new Date(item.data.date).toLocaleDateString("fr-FR")} · Par {item.data.author}</p>
                  </div>

                  <div className="pt-2">
                    <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">Contenu Intégral de l'Actualité</p>
                    <p className="p-4 bg-slate-50 rounded border border-slate-200 text-slate-800 leading-relaxed whitespace-pre-wrap">{item.data.content}</p>
                  </div>
                </div>
              )}

              {/* BODY: INDIVIDUAL MESSAGE RECORD */}
              {item.type === "message" && (
                <div className="py-4 space-y-4 font-sans text-xs">
                  <div className="border-b border-slate-200 pb-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Sujet du Message</p>
                    <h3 className="font-display font-extrabold text-slate-900 text-base leading-snug mt-1">{item.data.subject}</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4 py-2 border-b border-slate-200">
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-500">Expéditeur / Nom</p>
                      <p className="font-bold text-slate-900 text-sm mt-0.5">{item.data.senderName}</p>
                      <p className="text-slate-500 font-mono text-[11px]">{item.data.senderEmail}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase text-slate-500">Date & Heure de Réception</p>
                      <p className="font-bold text-slate-900 text-xs mt-0.5">{item.data?.date ? new Date(item.data.date).toLocaleString("fr-FR") : getTodayDateString()}</p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">Message Reçu</p>
                    <p className="p-4 bg-slate-50 rounded border border-slate-200 text-slate-800 leading-relaxed whitespace-pre-wrap">{item.data.message}</p>
                  </div>
                </div>
              )}

              {/* BODY: INDIVIDUAL USER RECORD */}
              {item.type === "user" && (
                <div className="py-4 space-y-4 font-sans text-xs">
                  <div className="border-b border-slate-200 pb-4 flex items-center space-x-4">
                    <div className="h-14 w-14 rounded-full bg-[#111111] border-2 border-[#D4AF37] flex items-center justify-center text-white font-extrabold text-lg uppercase">
                      {item.data.name?.charAt(0) || "U"}
                    </div>
                    <div>
                      <h3 className="font-display font-extrabold text-slate-900 text-base leading-snug">{item.data.name}</h3>
                      <p className="text-slate-500 font-mono text-xs">{item.data.email}</p>
                      <span className="inline-block mt-1 bg-[#D4AF37]/10 text-[#B8962E] text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-[#D4AF37]/20">
                        Rôle : {item.data.role}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 py-2">
                    <div className="p-3 bg-slate-50 rounded border border-slate-200 text-center">
                      <span className="text-[10px] uppercase text-slate-500 font-bold block mb-1">Statut du Compte</span>
                      <span className="font-bold text-slate-800 text-xs">{item.data.active ? "Compte Actif" : "Compte Inactif"}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded border border-slate-200 text-center">
                      <span className="text-[10px] uppercase text-slate-500 font-bold block mb-1">Structure / Entité</span>
                      <span className="font-bold text-slate-800 text-xs">UR-GEDT · UNILU</span>
                    </div>
                  </div>
                </div>
              )}

              {/* BODY: REPORT LISTINGS */}
              {item.type === "rapport_recettes" && (
                <div className="space-y-4">
                  <table className="w-full text-xs text-left border-collapse border border-slate-300">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 uppercase tracking-wider text-[10px] border-b border-slate-300">
                        <th className="p-2.5 border-r border-slate-300">N° ID</th>
                        <th className="p-2.5 border-r border-slate-300">Date</th>
                        <th className="p-2.5 border-r border-slate-300">Description</th>
                        <th className="p-2.5 border-r border-slate-300">Source</th>
                        <th className="p-2.5 border-r border-slate-300 text-center">Catégorie</th>
                        <th className="p-2.5 text-right">Montant (USD)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.data.map((rec: Recipe) => (
                        <tr key={rec.id} className="border-b border-slate-200 font-sans">
                          <td className="p-2.5 border-r border-slate-200 font-mono font-bold text-[#B8962E]">{rec.id}</td>
                          <td className="p-2.5 border-r border-slate-200 font-mono text-[11px]">{new Date(rec.date).toLocaleDateString("fr-FR")}</td>
                          <td className="p-2.5 border-r border-slate-200 leading-relaxed">{rec.description}</td>
                          <td className="p-2.5 border-r border-slate-200 font-semibold">{rec.source}</td>
                          <td className="p-2.5 border-r border-slate-200 text-center uppercase text-[10px] font-bold text-slate-500">{rec.type}</td>
                          <td className="p-2.5 text-right font-mono font-semibold">{(rec.amount || 0).toLocaleString()}</td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50 border-t-2 border-slate-400 font-bold">
                        <td colSpan={5} className="p-3 text-right uppercase text-slate-900">Total Général :</td>
                        <td className="p-3 text-right font-mono text-slate-950 text-sm">
                          {item.data.reduce((sum: number, r: Recipe) => sum + (r.amount || 0), 0).toLocaleString()} USD
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {item.type === "rapport_depenses" && (
                <div className="space-y-4">
                  <table className="w-full text-xs text-left border-collapse border border-slate-300">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 uppercase tracking-wider text-[10px] border-b border-slate-300">
                        <th className="p-2.5 border-r border-slate-300">N° ID</th>
                        <th className="p-2.5 border-r border-slate-300">Date</th>
                        <th className="p-2.5 border-r border-slate-300">Description</th>
                        <th className="p-2.5 border-r border-slate-300">Bénéficiaire</th>
                        <th className="p-2.5 border-r border-slate-300 text-center">Catégorie</th>
                        <th className="p-2.5 text-right">Montant (USD)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.data.map((dep: Expense) => (
                        <tr key={dep.id} className="border-b border-slate-200 font-sans">
                          <td className="p-2.5 border-r border-slate-200 font-mono font-bold text-[#B8962E]">{dep.id}</td>
                          <td className="p-2.5 border-r border-slate-200 font-mono text-[11px]">{new Date(dep.date).toLocaleDateString("fr-FR")}</td>
                          <td className="p-2.5 border-r border-slate-200 leading-relaxed">{dep.description}</td>
                          <td className="p-2.5 border-r border-slate-200 font-semibold">{dep.beneficiary}</td>
                          <td className="p-2.5 border-r border-slate-200 text-center uppercase text-[10px] font-bold text-slate-500">{dep.category}</td>
                          <td className="p-2.5 text-right font-mono font-semibold">{(dep.amount || 0).toLocaleString()}</td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50 border-t-2 border-slate-400 font-bold">
                        <td colSpan={5} className="p-3 text-right uppercase text-slate-900">Total Général :</td>
                        <td className="p-3 text-right font-mono text-slate-950 text-sm">
                          {item.data.reduce((sum: number, e: Expense) => sum + (e.amount || 0), 0).toLocaleString()} USD
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {item.type === "rapport_projets" && (
                <div className="space-y-4">
                  <table className="w-full text-xs text-left border-collapse border border-slate-300">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 uppercase tracking-wider text-[10px] border-b border-slate-300">
                        <th className="p-2.5 border-r border-slate-300">Chef de Projet / Leaders</th>
                        <th className="p-2.5 border-r border-slate-300">Intitulé du Programme</th>
                        <th className="p-2.5 border-r border-slate-300">Bailleur / Financement</th>
                        <th className="p-2.5 border-r border-slate-300 text-center">Statut</th>
                        <th className="p-2.5 text-right">Budget (USD)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.data.map((proj: Project) => (
                        <tr key={proj.id} className="border-b border-slate-200 font-sans">
                          <td className="p-2.5 border-r border-slate-200 font-semibold text-slate-800">{proj.leader}</td>
                          <td className="p-2.5 border-r border-slate-200 font-display font-bold text-[12px] leading-relaxed text-slate-900">{proj.title}</td>
                          <td className="p-2.5 border-r border-slate-200 text-slate-600">{proj.funding}</td>
                          <td className="p-2.5 border-r border-slate-200 text-center font-bold text-[10px] uppercase">
                            <span className={proj.status === "En cours" ? "text-emerald-700" : "text-slate-500"}>
                              {proj.status}
                            </span>
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-slate-950">{(proj.budget || 0).toLocaleString()}</td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50 border-t-2 border-slate-400 font-bold">
                        <td colSpan={4} className="p-3 text-right uppercase text-slate-900">Budget Consolidé Engagé :</td>
                        <td className="p-3 text-right font-mono text-slate-950 text-sm">
                          {item.data.reduce((sum: number, p: Project) => sum + (p.budget || 0), 0).toLocaleString()} USD
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {item.type === "rapport_activites" && (
                <div className="space-y-4">
                  <table className="w-full text-xs text-left border-collapse border border-slate-300">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 uppercase tracking-wider text-[10px] border-b border-slate-300">
                        <th className="p-2.5 border-r border-slate-300">Intitulé de l'Activité</th>
                        <th className="p-2.5 border-r border-slate-300">Lieu d'Enquête / Mission</th>
                        <th className="p-2.5 border-r border-slate-300">Date Prévue</th>
                        <th className="p-2.5 border-r border-slate-300">Chercheurs mobilisés</th>
                        <th className="p-2.5 border-r border-slate-300 text-center">Statut</th>
                        <th className="p-2.5 text-right">Budget Alloué (USD)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.data.map((act: FieldActivity) => (
                        <tr key={act.id} className="border-b border-slate-200 font-sans">
                          <td className="p-2.5 border-r border-slate-200 font-display font-bold text-[12px] leading-relaxed text-slate-900">{act.title}</td>
                          <td className="p-2.5 border-r border-slate-200 font-semibold text-slate-800">{act.location}</td>
                          <td className="p-2.5 border-r border-slate-200 font-mono text-[11px]">{new Date(act.date).toLocaleDateString("fr-FR")}</td>
                          <td className="p-2.5 border-r border-slate-200 text-[11px] leading-relaxed text-slate-600">
                            {act.researchers.join(", ")}
                          </td>
                          <td className="p-2.5 border-r border-slate-200 text-center font-bold text-[10px] uppercase">
                            <span className={act.status === "Réalisé" ? "text-emerald-700" : act.status === "En cours" ? "text-blue-700" : "text-amber-700"}>
                              {act.status}
                            </span>
                          </td>
                          <td className="p-2.5 text-right font-mono font-semibold">{(act.budget || 0).toLocaleString()}</td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50 border-t-2 border-slate-400 font-bold">
                        <td colSpan={5} className="p-3 text-right uppercase text-slate-900">Total Alloué Terrain :</td>
                        <td className="p-3 text-right font-mono text-slate-950 text-sm">
                          {item.data.reduce((sum: number, a: FieldActivity) => sum + (a.budget || 0), 0).toLocaleString()} USD
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* OFFICIAL QR CODE VALIDATION & SECURITY BLOCK */}
              <div className="mt-8 p-4 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-white border-2 border-[#D4AF37]/50 rounded-lg shadow-md shrink-0">
                    {qrPending ? (
                      <div style={{ width: 96, height: 96 }} className="flex items-center justify-center text-center text-[10px] font-bold text-slate-500 p-2">
                        Génération du code de vérification en cours — actualisez après confirmation.
                      </div>
                    ) : (
                      <QRCodeSVG 
                        value={qrData.verifyUrl} 
                        size={96} 
                        level="H"
                        fgColor="#0a0a0a"
                      />
                    )}
                  </div>
                  <div className="space-y-1 text-left">
                    <div className="flex items-center space-x-1.5">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      <span className="font-bold text-slate-900 text-xs uppercase tracking-wider font-display">Code QR de Validation Anti-Falsification</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-snug">
                      Scannez ce QR Code avec un appareil mobile ou le scanner UR-GEDT pour certifier et vérifier l'authenticité de ce document en temps réel.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 font-mono text-[9px] text-slate-500 pt-0.5">
                      <span className="bg-slate-200/80 px-2 py-0.5 rounded font-bold text-slate-800">HASH : GEDT-{qrData.hexHash}</span>
                      <span>·</span>
                      <span className="text-emerald-700 font-bold">EMPREINTE NUMÉRIQUE VALIDE</span>
                    </div>
                  </div>
                </div>

                <div className="text-right sm:border-l sm:border-slate-300 sm:pl-4 space-y-2 shrink-0 no-print">
                  <button 
                    onClick={() => setShowQrDetails(true)}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 bg-[#151515] hover:bg-black text-white text-[11px] font-bold rounded-lg border border-white/10 transition-colors cursor-pointer shadow-sm"
                  >
                    <QrCode className="h-3.5 w-3.5 text-[#D4AF37]" />
                    <span>Inspecter QR Code</span>
                  </button>
                  <p className="text-[9px] text-slate-400 font-mono block">Valideur UNILU 24/7</p>
                </div>
              </div>

              {/* OFFICIAL SIGNATURE BLOCK */}
              <div className="grid grid-cols-3 gap-8 pt-10 text-center text-xs font-sans text-slate-800 border-t border-slate-200">
                <div className="space-y-12">
                  <p className="font-bold uppercase tracking-wider text-[10px] text-slate-500">Le Secrétaire Principal</p>
                  <p className="font-semibold text-slate-900 italic">{secretaireName}</p>
                </div>
                <div className="space-y-12">
                  <p className="font-bold uppercase tracking-wider text-[10px] text-slate-500">Le Comptable Agrée</p>
                  <p className="font-semibold text-slate-900 italic">{comptableName}</p>
                </div>
                <div className="space-y-12">
                  <p className="font-bold uppercase tracking-wider text-[10px] text-slate-500">Le Directeur de l'UR-GEDT</p>
                  <p className="font-bold text-slate-950 uppercase border-b border-slate-300 pb-1 inline-block">
                    {directeurName}
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>

      {/* QR CODE INSPECTION MODAL */}
      {showQrDetails && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 no-print">
          <div className="bg-[#151515] border border-white/10 rounded-2xl max-w-md w-full p-6 text-white space-y-4 shadow-2xl relative">
            <button 
              onClick={() => setShowQrDetails(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center space-x-2 text-[#D4AF37]">
              <QrCode className="h-6 w-6" />
              <h3 className="font-display font-extrabold text-base text-white">Inspecteur de Sécurité QR Code</h3>
            </div>

            <div className="p-4 bg-white rounded-xl flex flex-col items-center justify-center space-y-2 border-2 border-[#D4AF37]/50 shadow-inner">
              {qrPending ? (
                <div style={{ width: 180, height: 180 }} className="flex items-center justify-center text-center text-xs font-bold text-slate-500 p-4">
                  ⏳ Enregistrement en cours de confirmation par le serveur. Fermez et rouvrez ce document une fois la sauvegarde terminée pour obtenir le code de vérification définitif.
                </div>
              ) : (
                <QRCodeSVG 
                  value={qrData.verifyUrl} 
                  size={180} 
                  level="H"
                  fgColor="#0a0a0a"
                />
              )}
              <span className="text-xs font-mono font-bold text-slate-900 pt-1">Code HASH: GEDT-{qrData.hexHash}</span>
            </div>

            <div className="space-y-2 text-xs">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Lien direct d'Authentification :</label>
              <div className="p-2.5 bg-[#0a0a0a] rounded-lg border border-white/10 font-mono text-[11px] text-emerald-400 break-all select-all flex items-center justify-between gap-2">
                <span className="truncate">{qrData.verifyUrl}</span>
                <button
                  onClick={handleCopyPayload}
                  className="p-1.5 bg-white/10 hover:bg-white/20 rounded text-white shrink-0 transition-colors"
                  title="Copier le lien"
                >
                  {copiedPayload ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Payload brut encodé dans le QR :</label>
              <pre className="p-3 bg-[#0a0a0a] rounded-lg border border-white/10 font-mono text-[10px] text-amber-300 overflow-x-auto max-h-36">
                {qrData.payloadStr}
              </pre>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowQrDetails(false)}
                className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-4 py-2 rounded-lg border border-white/10 transition-colors"
              >
                Fermer l'inspecteur
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
