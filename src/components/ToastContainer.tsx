import React, { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  CheckCircle2, AlertTriangle, Info, AlertCircle, X, 
  DollarSign, ShieldCheck, ShieldOff, UserCheck, 
  FileText, Sparkles, Trash2, Download, KeyRound, Check,
  Wifi, WifiOff, RefreshCw
} from "lucide-react";

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "info" | "warning";
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export default function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col space-y-3 max-w-md w-full pointer-events-none no-print">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}

interface ToastItemProps {
  key?: string;
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const duration = toast.duration ?? 4500;

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onDismiss(toast.id);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [toast.id, duration, onDismiss]);

  // Determine contextual Lucide Icon
  const getContextualIcon = () => {
    const text = `${toast.title || ""} ${toast.message}`.toLowerCase();

    if (text.includes("synchro") || text.includes("transmis") || text.includes("synchronis")) {
      return <RefreshCw className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5 animate-spin" style={{ animationDuration: "3s" }} />;
    }
    if (text.includes("hors-ligne") || text.includes("interromp") || text.includes("déconnecté")) {
      return <WifiOff className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />;
    }
    if (text.includes("réseau") || text.includes("connexion") || text.includes("rétabl") || text.includes("online")) {
      return <Wifi className="h-5 w-5 text-sky-400 shrink-0 mt-0.5" />;
    }
    if (text.includes("dépense") || text.includes("recette") || text.includes("financ") || text.includes("budget") || text.includes("montant")) {
      return <DollarSign className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />;
    }
    if (text.includes("révoqué") || text.includes("suspension") || text.includes("désactivé")) {
      return <ShieldOff className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />;
    }
    if (text.includes("accès") || text.includes("utilisateur") || text.includes("rôle") || text.includes("compte") || text.includes("réactivé")) {
      return <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />;
    }
    if (text.includes("mot de passe") || text.includes("réinitialis")) {
      return <KeyRound className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />;
    }
    if (text.includes("pdf") || text.includes("fiche") || text.includes("export") || text.includes("document") || text.includes("fichier")) {
      return <FileText className="h-5 w-5 text-sky-400 shrink-0 mt-0.5" />;
    }
    if (text.includes("supprim") || text.includes("effacé")) {
      return <Trash2 className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />;
    }
    if (text.includes("ia") || text.includes("scan") || text.includes("extra")) {
      return <Sparkles className="h-5 w-5 text-purple-400 shrink-0 mt-0.5" />;
    }

    // Default fallbacks by type
    switch (toast.type) {
      case "success":
        return <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />;
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />;
      case "info":
      default:
        return <Info className="h-5 w-5 text-sky-400 shrink-0 mt-0.5" />;
    }
  };

  const borderColors = {
    success: "border-emerald-500/40 bg-[#0c1a14]/95 shadow-emerald-950/40",
    error: "border-red-500/40 bg-[#1c0c0c]/95 shadow-red-950/40",
    warning: "border-amber-500/40 bg-[#1f160c]/95 shadow-amber-950/40",
    info: "border-sky-500/40 bg-[#0c1620]/95 shadow-sky-950/40",
  };

  const badgeColors = {
    success: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    error: "bg-red-500/20 text-red-300 border-red-500/30",
    warning: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    info: "bg-sky-500/20 text-sky-300 border-sky-500/30",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.9, x: 20 }}
      animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.85, x: 50 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className={`pointer-events-auto flex items-start space-x-3.5 p-4 rounded-2xl border ${borderColors[toast.type]} shadow-2xl backdrop-blur-xl relative overflow-hidden group`}
    >
      <div className="p-2 rounded-xl bg-white/5 border border-white/10 shrink-0 shadow-inner">
        {getContextualIcon()}
      </div>

      <div className="flex-1 min-w-0 pr-1">
        <div className="flex items-center justify-between gap-2 mb-1">
          {toast.title ? (
            <h5 className="text-xs font-bold font-display text-white tracking-tight truncate">
              {toast.title}
            </h5>
          ) : (
            <h5 className="text-xs font-bold font-display text-white tracking-tight">
              Notification UR-GEDT
            </h5>
          )}
          <span className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.2 rounded border shrink-0 ${badgeColors[toast.type]}`}>
            {toast.type === "success" ? "Succès" : toast.type === "error" ? "Erreur" : toast.type === "warning" ? "Alerte" : "Info"}
          </span>
        </div>
        <p className="text-xs text-slate-200 leading-relaxed font-sans font-medium">
          {toast.message}
        </p>
      </div>

      <button
        onClick={() => onDismiss(toast.id)}
        className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer shrink-0 mt-0.5"
        title="Fermer"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Animated Countdown Progress Bar */}
      {duration > 0 && (
        <motion.div
          initial={{ width: "100%" }}
          animate={{ width: "0%" }}
          transition={{ duration: duration / 1000, ease: "linear" }}
          className={`absolute bottom-0 left-0 h-1 ${
            toast.type === "success"
              ? "bg-emerald-400"
              : toast.type === "error"
              ? "bg-red-400"
              : toast.type === "warning"
              ? "bg-amber-400"
              : "bg-sky-400"
          }`}
        />
      )}
    </motion.div>
  );
}

