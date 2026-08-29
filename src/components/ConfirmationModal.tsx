import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AlertTriangle, Trash2, X, Loader2, ShieldAlert } from "lucide-react";

export interface ConfirmationModalConfig {
  isOpen: boolean;
  title?: string;
  message?: string;
  itemType?: string;
  itemId?: string;
  itemLabel?: string;
  warningText?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning";
  isLoading?: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}

export default function ConfirmationModal({
  isOpen,
  title = "Confirmation d'action sensible",
  message = "Êtes-vous sûr de vouloir effectuer cette opération ?",
  itemType,
  itemId,
  itemLabel,
  warningText,
  confirmText = "Confirmer",
  cancelText = "Annuler",
  variant = "danger",
  isLoading = false,
  onClose,
  onConfirm
}: ConfirmationModalConfig) {
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  // Keyboard navigation: Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    // Focus primary action button on open
    setTimeout(() => {
      confirmBtnRef.current?.focus();
    }, 50);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const isDanger = variant === "danger";

  const getItemTypeBadge = (type?: string) => {
    if (!type) return "Élément Systémique";
    const typeMap: Record<string, string> = {
      recipe: "Recette / Entrée Financière",
      expense: "Dépense / Sortie Financière",
      user: "Utilisateur / Chercheur",
      news: "Actualité Académique",
      project: "Projet de Recherche",
      activity: "Activité Terrain",
      publication: "Publication Scientifique",
      gallery: "Média Galerie",
      partner: "Partenaire Institutionnel",
      message: "Message de Contact",
      custom_file: "Document / Fichier Importé"
    };
    return typeMap[type] || type;
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto no-print"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmation-modal-title"
        aria-describedby="confirmation-modal-description"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.15 }}
          className={`bg-[#111111] rounded-2xl border ${
            isDanger ? "border-red-500/30" : "border-amber-500/30"
          } shadow-2xl max-w-md w-full overflow-hidden p-6 relative`}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={() => !isLoading && onClose()}
            aria-label="Fermer la boîte de dialogue de confirmation"
            className="absolute top-4 right-4 text-slate-500 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex flex-col items-center text-center space-y-4">
            {/* Header Icon */}
            <div
              className={`h-14 w-14 rounded-full flex items-center justify-center shrink-0 border ${
                isDanger
                  ? "bg-red-500/10 border-red-500/20 text-red-500"
                  : "bg-amber-500/10 border-amber-500/20 text-amber-500"
              }`}
            >
              {isDanger ? (
                <AlertTriangle className="h-7 w-7" aria-hidden="true" />
              ) : (
                <ShieldAlert className="h-7 w-7" aria-hidden="true" />
              )}
            </div>

            {/* Title & Description */}
            <div>
              <h3 id="confirmation-modal-title" className="font-display font-extrabold text-white text-lg tracking-tight">
                {title}
              </h3>
              <p id="confirmation-modal-description" className="text-xs text-slate-400 mt-1 leading-relaxed">
                {message}
              </p>
            </div>

            {/* Target Item Details Box */}
            {(itemLabel || itemType || itemId) && (
              <div className="w-full bg-[#151515] p-3.5 rounded-xl border border-white/5 text-left space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] uppercase font-bold font-mono tracking-wider text-[#D4AF37] bg-[#D4AF37]/10 px-2 py-0.5 rounded border border-[#D4AF37]/10">
                    {getItemTypeBadge(itemType)}
                  </span>
                  {itemId && (
                    <span className="text-[10px] text-slate-500 font-mono">
                      ID: {itemId}
                    </span>
                  )}
                </div>
                {itemLabel && (
                  <p className="text-xs font-bold text-white font-display line-clamp-2 pt-0.5">
                    {itemLabel}
                  </p>
                )}
              </div>
            )}

            {/* Warning Banner */}
            {warningText && (
              <div
                className={`rounded-lg p-3 text-left w-full border ${
                  isDanger
                    ? "bg-red-500/5 border-red-500/10 text-red-400"
                    : "bg-amber-500/5 border-amber-500/10 text-amber-400"
                }`}
                role="alert"
              >
                <p className="text-[11px] leading-relaxed font-sans">
                  ⚠️ <strong>Attention :</strong> {warningText}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center space-x-3 w-full pt-2">
              <button
                type="button"
                disabled={isLoading}
                onClick={onClose}
                aria-label={cancelText}
                className="flex-1 bg-[#151515] hover:bg-white/5 text-slate-300 hover:text-white border border-white/10 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
              >
                {cancelText}
              </button>

              <button
                ref={confirmBtnRef}
                type="button"
                disabled={isLoading}
                onClick={onConfirm}
                aria-label={confirmText}
                aria-busy={isLoading}
                className={`flex-1 font-bold px-4 py-2.5 rounded-xl text-xs transition-all shadow-lg flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-white ${
                  isDanger
                    ? "bg-red-600 hover:bg-red-700 text-white shadow-red-600/20"
                    : "bg-[#D4AF37] hover:bg-[#B8962E] text-black shadow-[#D4AF37]/20"
                }`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    <span>Traitement...</span>
                  </>
                ) : (
                  <>
                    {isDanger && <Trash2 className="h-4 w-4" aria-hidden="true" />}
                    <span>{confirmText}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
