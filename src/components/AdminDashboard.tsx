import React, { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { apiFetch } from "../utils/apiClient";
import { uploadFileToCloudinary, CloudinaryConfigError } from "../utils/cloudinaryUpload";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from "recharts";
import { 
  BookOpen, Users, Briefcase, Calendar, MapPin, Mail, 
  Lock, FileText, LayoutDashboard, Image, DollarSign, 
  TrendingUp, TrendingDown, Plus, Search, Trash2, Edit, 
  Check, X, FileSpreadsheet, LogOut, Clock, Printer, 
  Activity, ShieldAlert, CheckCircle, RefreshCw, BarChart2,
  Upload, FolderOpen, Sparkles, Eye, EyeOff, Key, UserPlus, Music, File, FileUp,
  AlertTriangle, Loader2, Download, Sun, Moon,
  WifiOff, Save, HardDrive, CheckCircle2, Maximize2, Minimize2, Keyboard, Command,
  ShieldCheck, ShieldOff, Grid, List, AlertCircle, QrCode, Settings, Phone, RotateCcw, Sliders, PieChart
} from "lucide-react";
import { Database, User, News, Project, FieldActivity, Publication, GalleryItem, Partner, ContactMessage, Recipe, Expense, SiteSettings, Budget } from "../types";
import CalendarPanel from "./CalendarPanel";
import ConfirmationModal from "./ConfirmationModal";
import ToastContainer, { ToastMessage } from "./ToastContainer";
import QrScannerModal from "./QrScannerModal";
import { PersonnelManager } from "./PersonnelManager";

interface AdminDashboardProps {
  db: Database;
  currentUser: { id: string; name: string; email: string; role: string; permissions: string[] };
  onLogout: () => void;
  onUpdateTable: (tableName: string, data: any, logAction: string, logDetails: string) => Promise<boolean>;
  onRegisterRecipe: (recipe: any) => Promise<any>;
  onRegisterExpense: (expense: any) => Promise<any>;
  onBulkRegisterExpenses?: (expenses: any[]) => Promise<boolean>;
  onTriggerPrint: (item: { type: any; data: any }) => void;
  isOnline?: boolean;
  pendingOfflineCount?: number;
  isSyncing?: boolean;
  syncStatusNotice?: string | null;
  onSyncOfflineQueue?: (isManual?: boolean) => void;
  lastSyncTime?: Date | string | null;
  onOpenQrScanner?: () => void;
}

const formatSyncTimestamp = (val?: Date | string | null) => {
  if (!val) return "Non synchronisé";
  const date = typeof val === "string" ? new Date(val) : val;
  if (isNaN(date.getTime())) return "Non synchronisé";

  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  if (isToday) {
    return `Aujourd'hui à ${hours}:${minutes}:${seconds}`;
  }

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}/${month}/${year} à ${hours}:${minutes}:${seconds}`;
};

const CustomChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#111111] border border-white/10 p-3.5 rounded-xl shadow-2xl text-xs font-sans space-y-2 z-50">
        <p className="font-bold font-display text-white border-b border-white/10 pb-1.5 flex items-center justify-between gap-3">
          <span>{label} 2026</span>
          <span className="text-[10px] font-mono text-[#D4AF37] bg-[#D4AF37]/10 px-1.5 py-0.5 rounded border border-[#D4AF37]/20">UR-GEDT</span>
        </p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-slate-300 font-medium">
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }}></span>
              {entry.name} :
            </span>
            <span className="font-mono font-bold text-white">
              {Number(entry.value || 0).toLocaleString()} USD
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// Reusable component for real-time form input visual validation with status icons
interface ValidatedInputProps {
  label: string;
  type?: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  validate: (val: string) => { isValid: boolean; message: string };
  helpText?: string;
  isMono?: boolean;
  id?: string;
}

const ValidatedInputField: React.FC<ValidatedInputProps> = ({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  required = true,
  validate,
  helpText,
  isMono = false,
  id,
}) => {
  const strVal = value !== undefined && value !== null ? String(value) : "";
  const hasValue = strVal.trim() !== "";
  const { isValid, message } = validate(strVal);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between mb-1">
        <label htmlFor={id} className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          {label} {required && <span className="text-[#D4AF37]">*</span>}
        </label>
        {hasValue && (
          <span
            className={`text-[11px] font-mono flex items-center gap-1 font-semibold ${
              isValid ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {isValid ? (
              <>
                <CheckCircle2 className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span>Valide</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-3 w-3 shrink-0 animate-pulse" aria-hidden="true" />
                <span>Non conforme</span>
              </>
            )}
          </span>
        )}
      </div>

      <div className="relative">
        <input
          id={id}
          type={type}
          required={required}
          value={value ?? ""}
          onChange={onChange}
          placeholder={placeholder}
          aria-invalid={hasValue ? !isValid : undefined}
          className={`w-full bg-[#151515] rounded p-2 text-xs text-white focus:outline-none transition-all duration-200 ${
            isMono ? "font-mono" : ""
          } ${
            hasValue
              ? isValid
                ? "border border-emerald-500/50 bg-emerald-950/10 focus:border-emerald-400 pr-8 shadow-[0_0_8px_rgba(16,185,129,0.12)]"
                : "border border-red-500/50 bg-red-950/10 focus:border-red-400 pr-8 shadow-[0_0_8px_rgba(239,68,68,0.12)]"
              : "border border-white/10 focus:border-[#D4AF37]"
          }`}
        />
        {hasValue && (
          <div className="absolute right-2.5 top-2.5 pointer-events-none flex items-center justify-center">
            {isValid ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-400 animate-pulse shrink-0" />
            )}
          </div>
        )}
      </div>

      {hasValue ? (
        <p className={`text-[11px] font-mono flex items-center gap-1 ${isValid ? "text-emerald-400/90 font-medium" : "text-red-400 font-semibold"}`}>
          {message}
        </p>
      ) : helpText ? (
        <p className="text-[11px] text-slate-500 font-mono">{helpText}</p>
      ) : null}
    </div>
  );
};

// Reusable Financial Masked Input component with automatic thousand separators, decimal points & currency toggling
interface FinancialMaskedInputProps {
  id?: string;
  label: string;
  value: string | number;
  currency?: "USD" | "CDF";
  onAmountChange: (cleanAmount: string, currency: "USD" | "CDF") => void;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
}

const FinancialMaskedInput: React.FC<FinancialMaskedInputProps> = ({
  id,
  label,
  value,
  currency = "USD",
  onAmountChange,
  required = true,
  placeholder = "Ex: 15 000,00",
  helpText,
}) => {
  const [selectedCurrency, setSelectedCurrency] = useState<"USD" | "CDF">(currency);
  const [displayVal, setDisplayVal] = useState<string>("");

  const EXCHANGE_RATE_CDF = 2800; // 1 USD = 2800 CDF

  // Helper to format raw numeric string/number into thousands-separated string (e.g. 1500000 -> "1 500 000")
  const formatRawValue = (val: string | number): string => {
    if (val === "" || val === undefined || val === null) return "";
    const str = String(val).trim();
    if (str === "") return "";

    const num = typeof val === "number" ? val : parseFloat(str.replace(/\s/g, "").replace(",", "."));
    if (isNaN(num) || num === 0) {
      if (str === "") return "";
      return str;
    }

    const parts = str.replace(/\s/g, "").replace(",", ".").split(".");
    const intPart = parts[0] ? parseInt(parts[0], 10) : 0;
    const formattedInt = !isNaN(intPart) ? intPart.toLocaleString("fr-FR").replace(/\s/g, " ") : "0";

    if (parts.length > 1) {
      const decPart = parts[1].slice(0, 2);
      return `${formattedInt},${decPart}`;
    }
    return formattedInt;
  };

  useEffect(() => {
    if (value === "" || value === undefined || value === null) {
      setDisplayVal("");
      return;
    }
    setDisplayVal(formatRawValue(value));
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;

    if (!raw.trim()) {
      setDisplayVal("");
      onAmountChange("", selectedCurrency);
      return;
    }

    // Keep numbers, dots and commas
    const clean = raw.replace(/[^0-9.,]/g, "");
    const parts = clean.split(/[.,]/);
    const intPartDigits = parts[0].replace(/\D/g, "");
    const decPartDigits = parts.length > 1 ? parts.slice(1).join("").replace(/\D/g, "").slice(0, 2) : null;

    if (!intPartDigits && decPartDigits === null) {
      setDisplayVal("");
      onAmountChange("", selectedCurrency);
      return;
    }

    // Format integer with spaces
    const formattedInt = intPartDigits ? parseInt(intPartDigits, 10).toLocaleString("fr-FR").replace(/\s/g, " ") : "0";
    let formattedStr = formattedInt;
    if (decPartDigits !== null) {
      formattedStr += `,${decPartDigits}`;
    }

    setDisplayVal(formattedStr);

    const cleanFloatStr = decPartDigits !== null ? `${intPartDigits || "0"}.${decPartDigits}` : intPartDigits;
    onAmountChange(cleanFloatStr, selectedCurrency);
  };

  const handleCurrencySwitch = (newCurrency: "USD" | "CDF") => {
    setSelectedCurrency(newCurrency);
    const num = displayVal ? parseFloat(displayVal.replace(/\s/g, "").replace(",", ".")) : 0;
    onAmountChange(num ? String(num) : "", newCurrency);
  };

  const numericVal = displayVal ? parseFloat(displayVal.replace(/\s/g, "").replace(",", ".")) : 0;
  const isValid = !isNaN(numericVal) && numericVal > 0;
  const hasValue = displayVal.trim() !== "";

  const equivalentText = isValid
    ? selectedCurrency === "USD"
      ? `≈ ${(numericVal * EXCHANGE_RATE_CDF).toLocaleString("fr-FR")} CDF`
      : `≈ ${(numericVal / EXCHANGE_RATE_CDF).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} USD`
    : null;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between mb-1">
        <label htmlFor={id} className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          {label} {required && <span className="text-[#D4AF37]">*</span>}
        </label>

        {/* Currency Switcher Toggle */}
        <div className="flex items-center space-x-1 bg-[#151515] border border-white/10 p-0.5 rounded-md">
          <button
            type="button"
            onClick={() => handleCurrencySwitch("USD")}
            className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-all cursor-pointer ${
              selectedCurrency === "USD"
                ? "bg-[#D4AF37] text-slate-950 shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            $ USD
          </button>
          <button
            type="button"
            onClick={() => handleCurrencySwitch("CDF")}
            className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-all cursor-pointer ${
              selectedCurrency === "CDF"
                ? "bg-[#D4AF37] text-slate-950 shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            FC (CDF)
          </button>
        </div>
      </div>

      <div className="relative flex items-center">
        {/* Currency prefix badge */}
        <div className="absolute left-3 pointer-events-none text-slate-400 font-mono font-bold text-xs flex items-center gap-1">
          <span>{selectedCurrency === "USD" ? "$" : "FC"}</span>
        </div>

        <input
          id={id}
          type="text"
          inputMode="decimal"
          required={required}
          value={displayVal}
          onChange={handleInputChange}
          placeholder={placeholder}
          aria-invalid={hasValue ? !isValid : undefined}
          className={`w-full bg-[#151515] rounded py-2 pl-9 pr-9 text-xs font-mono font-bold text-white focus:outline-none transition-all duration-200 ${
            hasValue
              ? isValid
                ? "border border-emerald-500/50 bg-emerald-950/10 focus:border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.12)]"
                : "border border-red-500/50 bg-red-950/10 focus:border-red-400 shadow-[0_0_8px_rgba(239,68,68,0.12)]"
              : "border border-white/10 focus:border-[#D4AF37]"
          }`}
        />

        {/* Right status icon */}
        {hasValue && (
          <div className="absolute right-3 pointer-events-none flex items-center justify-center">
            {isValid ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" aria-hidden="true" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-400 animate-pulse shrink-0" aria-hidden="true" />
            )}
          </div>
        )}
      </div>

      {/* Validation feedback & live currency equivalent */}
      {hasValue ? (
        <div className="flex items-center justify-between text-[11px] font-mono mt-1">
          <p className={isValid ? "text-emerald-400/90 font-medium" : "text-red-400 font-semibold"}>
            {isValid
              ? `✓ Montant masqué : ${displayVal} ${selectedCurrency}`
              : "✗ Saisissez un montant valide supérieur à 0."}
          </p>
          {equivalentText && (
            <span className="text-[#D4AF37] font-semibold bg-[#D4AF37]/10 px-1.5 py-0.5 rounded border border-[#D4AF37]/20">
              {equivalentText}
            </span>
          )}
        </div>
      ) : helpText ? (
        <p className="text-[11px] text-slate-500 font-mono">{helpText}</p>
      ) : null}
    </div>
  );
};

// Helper to evaluate password strength and criteria compliance in real-time
const computeUserPasswordStrength = (pwd: string) => {
  if (!pwd) return null;
  let score = 0;
  const hasMinLen = pwd.length >= 6;
  const hasLongLen = pwd.length >= 10;
  const hasUpper = /[A-Z]/.test(pwd);
  const hasNumber = /[0-9]/.test(pwd);
  const hasSpecial = /[^A-Za-z0-9]/.test(pwd);

  if (hasMinLen) score++;
  if (hasLongLen) score++;
  if (hasUpper) score++;
  if (hasNumber) score++;
  if (hasSpecial) score++;

  const isFullyValid = hasMinLen && hasUpper && hasNumber && hasSpecial;

  if (score <= 1) return { level: 1, label: "Très faible", color: "bg-red-500", textColor: "text-red-400", bars: 1, hasMinLen, hasUpper, hasNumber, hasSpecial, isFullyValid };
  if (score === 2) return { level: 2, label: "Faible", color: "bg-amber-500", textColor: "text-amber-400", bars: 2, hasMinLen, hasUpper, hasNumber, hasSpecial, isFullyValid };
  if (score === 3) return { level: 3, label: "Moyen", color: "bg-yellow-500", textColor: "text-yellow-400", bars: 3, hasMinLen, hasUpper, hasNumber, hasSpecial, isFullyValid };
  if (score === 4) return { level: 4, label: "Fort", color: "bg-emerald-500", textColor: "text-emerald-400", bars: 4, hasMinLen, hasUpper, hasNumber, hasSpecial, isFullyValid };
  return { level: 5, label: "Très fort", color: "bg-emerald-400", textColor: "text-emerald-300", bars: 5, hasMinLen, hasUpper, hasNumber, hasSpecial, isFullyValid };
};

export default function AdminDashboard({
  db,
  currentUser,
  onLogout,
  onUpdateTable,
  onRegisterRecipe,
  onRegisterExpense,
  onBulkRegisterExpenses,
  onTriggerPrint,
  isOnline = true,
  pendingOfflineCount = 0,
  isSyncing = false,
  syncStatusNotice = null,
  onSyncOfflineQueue,
  lastSyncTime,
  onOpenQrScanner
}: AdminDashboardProps) {
  const [activePanel, setActivePanel] = useState<string>("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [globalSearch, setGlobalSearch] = useState("");
  const [isGlobalSearchFocused, setIsGlobalSearchFocused] = useState(false);

  const [hasDraftRestored, setHasDraftRestored] = useState(false);
  const [isQrScannerModalOpen, setIsQrScannerModalOpen] = useState(false);

  // Fullscreen Mode State & API Toggle
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().then(() => {
          setIsFullscreen(true);
        }).catch((err) => {
          console.warn("Erreur lors du passage en plein écran :", err);
          setIsFullscreen(prev => !prev);
        });
      } else {
        setIsFullscreen(prev => !prev);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => {
          setIsFullscreen(false);
        }).catch(() => {
          setIsFullscreen(false);
        });
      } else {
        setIsFullscreen(false);
      }
    }
  };

  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Real-time Global Search query calculation across Finance, Projects, and Members
  const globalSearchResults = useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    if (!q) return { recipes: [], expenses: [], projects: [], users: [], totalCount: 0 };

    const recipes = (db.recipes || []).filter(r => 
      (r.description || "").toLowerCase().includes(q) ||
      (r.source || "").toLowerCase().includes(q) ||
      (r.type || "").toLowerCase().includes(q) ||
      (r.recordedBy || "").toLowerCase().includes(q) ||
      String(r.amount).includes(q) ||
      (r.date || "").toLowerCase().includes(q)
    );

    const expenses = (db.expenses || []).filter(e => 
      (e.description || "").toLowerCase().includes(q) ||
      (e.beneficiary || "").toLowerCase().includes(q) ||
      (e.category || "").toLowerCase().includes(q) ||
      (e.recordedBy || "").toLowerCase().includes(q) ||
      String(e.amount).includes(q) ||
      (e.date || "").toLowerCase().includes(q)
    );

    const projects = (db.projects || []).filter(p => 
      (p.title || "").toLowerCase().includes(q) ||
      (p.description || "").toLowerCase().includes(q) ||
      (p.leader || "").toLowerCase().includes(q) ||
      (p.funding || "").toLowerCase().includes(q) ||
      (p.status || "").toLowerCase().includes(q) ||
      String(p.budget).includes(q)
    );

    const users = (db.users || []).filter(u => 
      (u.name || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      (u.role || "").toLowerCase().includes(q)
    );

    const totalCount = recipes.length + expenses.length + projects.length + users.length;

    return { recipes, expenses, projects, users, totalCount };
  }, [globalSearch, db.recipes, db.expenses, db.projects, db.users]);
  
  // Modals / Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<string>(""); // 'user', 'news', 'project', 'activity', 'publication', 'gallery', 'partner', 'recipe', 'expense'
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Settings State (Site General Settings)
  const currentSettings = useMemo(() => {
    if (Array.isArray(db.settings)) return db.settings[0] || {};
    return db.settings || {};
  }, [db.settings]);

  const [settingsForm, setSettingsForm] = useState<SiteSettings>(() => {
    const s = Array.isArray(db.settings) ? db.settings[0] : db.settings;
    return s || {
      siteName: "UR-GEDT Portal & Management System",
      logo: "/logo.jpg",
      favicon: "/favicon.ico",
      address: "Campus de la Kasapa, Lubumbashi, RDC",
      phone: "+243 800 827 348",
      email: "urgedt.rdcongo@gmail.com",
      facebook: "https://web.facebook.com/profile.php?id=61592205587276",
      linkedin: "https://www.linkedin.com/in/ur-getd-unilu-4172bb425",
      twitter: "https://x.com/URGEDTUNILu",
      youtube: "https://youtube.com",
      github: "",
      whatsapp: ""
    };
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  useEffect(() => {
    if (db.settings) {
      const s = Array.isArray(db.settings) ? db.settings[0] : db.settings;
      if (s) setSettingsForm(s);
    }
  }, [db.settings]);

  useEffect(() => {
    const faviconUrl = currentSettings?.favicon;
    if (faviconUrl) {
      const faviconLinks = document.querySelectorAll("link[rel*='icon']");
      faviconLinks.forEach((link: any) => {
        link.href = faviconUrl;
      });
      if (faviconLinks.length === 0) {
        const link = document.createElement("link");
        link.rel = "icon";
        link.href = faviconUrl;
        document.head.appendChild(link);
      }
    }
  }, [currentSettings?.favicon]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      const res = await onUpdateTable(
        "settings",
        [settingsForm],
        "Mise à jour de la configuration du site",
        "Modification des paramètres institutionnels du site (logo, favicon, coordonnées, réseaux sociaux)"
      );
      if (res) {
        setSuccessMsg("Configuration du site mise à jour avec succès !");
        addToast("Paramètres généraux du site enregistrés avec succès.", "success", "Configuration du Site");
        setTimeout(() => setSuccessMsg(""), 4000);
      } else {
        setErrorMsg("Erreur lors de la sauvegarde des paramètres.");
        addToast("Erreur lors de la sauvegarde des paramètres du site.", "error", "Configuration du Site");
      }
    } catch (err) {
      console.error("Save settings error:", err);
      setErrorMsg("Une erreur est survenue lors de la sauvegarde.");
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Dedicated Budget Modification & Reset States
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isResetBudgetConfirmOpen, setIsResetBudgetConfirmOpen] = useState(false);
  const [budgetForm, setBudgetForm] = useState<Budget>(() => {
    const b = db.budget;
    return b || {
      year: 2026,
      totalBudget: 120000,
      allocatedResearch: 55000,
      allocatedLogistics: 25000,
      allocatedEquipment: 25000,
      allocatedPersonnel: 15000
    };
  });

  useEffect(() => {
    if (db.budget) {
      setBudgetForm({
        year: Number(db.budget.year) || 2026,
        totalBudget: Number(db.budget.totalBudget) || 120000,
        allocatedResearch: Number(db.budget.allocatedResearch) || 55000,
        allocatedLogistics: Number(db.budget.allocatedLogistics) || 25000,
        allocatedEquipment: Number(db.budget.allocatedEquipment) || 25000,
        allocatedPersonnel: Number(db.budget.allocatedPersonnel) || 15000
      });
    }
  }, [db.budget]);

  // States & helper for Historique des Actions (Audit Logs)
  const [logCategoryFilter, setLogCategoryFilter] = useState<"all" | "budget" | "personnel" | "projets" | "system">("all");
  const [logActionFilter, setLogActionFilter] = useState<string>("all");
  const [selectedLogModal, setSelectedLogModal] = useState<any | null>(null);

  const getLogCategory = useCallback((log: any): "budget" | "personnel" | "projets" | "system" => {
    if (!log) return "system";
    const act = (log.action || "").toLowerCase();
    const det = (log.details || "").toLowerCase();
    if (
      act.includes("budget") || act.includes("recette") || act.includes("dépense") || 
      act.includes("validation") || act.includes("financ") || det.includes("budget") || 
      det.includes("usd") || det.includes("recette") || det.includes("dépense") || 
      det.includes("financ")
    ) {
      return "budget";
    }
    if (
      act.includes("personnel") || act.includes("utilisateur") || act.includes("accès") || 
      act.includes("révocation") || act.includes("réactivation") || act.includes("création personnel") ||
      det.includes("personnel") || det.includes("accès") || det.includes("compte") || 
      det.includes("rôle") || det.includes("membre")
    ) {
      return "personnel";
    }
    if (
      act.includes("projet") || act.includes("activité") || act.includes("publication") || 
      det.includes("projet") || det.includes("activité") || det.includes("publication")
    ) {
      return "projets";
    }
    return "system";
  }, []);

  const getActionBadge = useCallback((action: string) => {
    const actLower = (action || "").toLowerCase();
    
    if (actLower.includes("suppression") || actLower.includes("supprimé") || actLower.includes("retrait")) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-xs tracking-wide">
          <Trash2 className="h-3 w-3 mr-1 shrink-0" />
          {action}
        </span>
      );
    }
    if (actLower.includes("création") || actLower.includes("ajout") || actLower.includes("créé") || actLower.includes("nouveau") || actLower.includes("réactivation")) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-xs tracking-wide">
          <Plus className="h-3 w-3 mr-1 shrink-0" />
          {action}
        </span>
      );
    }
    if (actLower.includes("modification") || actLower.includes("mise à jour") || actLower.includes("édité") || actLower.includes("modifié")) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30 shadow-xs tracking-wide">
          <Edit className="h-3 w-3 mr-1 shrink-0" />
          {action}
        </span>
      );
    }
    if (actLower.includes("réinitialisation") || actLower.includes("reset") || actLower.includes("révocation")) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-xs tracking-wide">
          <RotateCcw className="h-3 w-3 mr-1 shrink-0" />
          {action}
        </span>
      );
    }
    if (actLower.includes("validation") || actLower.includes("validé") || actLower.includes("approbation")) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30 shadow-xs tracking-wide">
          <ShieldCheck className="h-3 w-3 mr-1 shrink-0" />
          {action}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700 shadow-xs tracking-wide">
        <Activity className="h-3 w-3 mr-1 shrink-0 text-[#D4AF37]" />
        {action}
      </span>
    );
  }, []);

  const handleExportAuditLogsCSV = useCallback((logsToExport: any[]) => {
    exportToCSV(
      "ur_gedt_historique_actions",
      logsToExport,
      [
        { key: "id", label: "ID Log" },
        { key: "timestamp", label: "Horodatage" },
        { key: "userName", label: "Nom Agent" },
        { key: "userRole", label: "Rôle Agent" },
        { key: "action", label: "Type d'Action" },
        { key: "details", label: "Détail Opérationnel & Traçabilité" }
      ]
    );
  }, []);

  const handleOpenBudgetModal = () => {
    const b = db.budget || {
      year: new Date().getFullYear(),
      totalBudget: 120000,
      allocatedResearch: 55000,
      allocatedLogistics: 25000,
      allocatedEquipment: 25000,
      allocatedPersonnel: 15000
    };
    setBudgetForm({
      year: Number(b.year) || new Date().getFullYear(),
      totalBudget: Number(b.totalBudget) || 120000,
      allocatedResearch: Number(b.allocatedResearch) || 55000,
      allocatedLogistics: Number(b.allocatedLogistics) || 25000,
      allocatedEquipment: Number(b.allocatedEquipment) || 25000,
      allocatedPersonnel: Number(b.allocatedPersonnel) || 15000
    });
    setIsBudgetModalOpen(true);
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const research = Number(budgetForm.allocatedResearch) || 0;
    const logistics = Number(budgetForm.allocatedLogistics) || 0;
    const equipment = Number(budgetForm.allocatedEquipment) || 0;
    const personnel = Number(budgetForm.allocatedPersonnel) || 0;

    const sumAllocations = research + logistics + equipment + personnel;
    const finalTotal = budgetForm.totalBudget > 0 ? Number(budgetForm.totalBudget) : sumAllocations;

    const updatedBudget: Budget = {
      year: Number(budgetForm.year) || new Date().getFullYear(),
      totalBudget: finalTotal,
      allocatedResearch: research,
      allocatedLogistics: logistics,
      allocatedEquipment: equipment,
      allocatedPersonnel: personnel
    };

    if (onUpdateTable) {
      await onUpdateTable("budget", updatedBudget, "Modification Budget", `Mise à jour des enveloppes budgétaires pour l'exercice ${updatedBudget.year} (${finalTotal.toLocaleString()} USD)`);
    }

    addToast(`Enveloppe budgétaire ${updatedBudget.year} enregistrée avec succès (${finalTotal.toLocaleString()} USD) !`, "success", "Budget enregistré");
    setIsBudgetModalOpen(false);
  };

  const handleResetBudgetToZero = async () => {
    const zeroBudget: Budget = {
      year: db.budget?.year || new Date().getFullYear(),
      totalBudget: 0,
      allocatedResearch: 0,
      allocatedLogistics: 0,
      allocatedEquipment: 0,
      allocatedPersonnel: 0
    };

    if (onUpdateTable) {
      await onUpdateTable("budget", zeroBudget, "Réinitialisation Budget", "Réinitialisation de toutes les enveloppes budgétaires à zéro (0 USD) dans la base de données.");
    }

    addToast("Les enveloppes budgétaires ont été réinitialisées à zéro (0 USD) dans la base de données !", "success", "Budget Réinitialisé à zéro");
    setIsResetBudgetConfirmOpen(false);
    setIsBudgetModalOpen(false);
  };

  // Theme State (Dark / Light) with LocalStorage persistence
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const saved = localStorage.getItem("admin_theme");
    return (saved === "light" || saved === "dark") ? saved : "dark";
  });

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("admin_theme", nextTheme);
    addToast(
      nextTheme === "light" ? "Mode clair activé." : "Mode sombre activé.",
      "info",
      "Apparence"
    );
  };

  // Toast Notifications State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (message: string, type: "success" | "error" | "info" | "warning" = "success", title?: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };
  const [isScanningReceipt, setIsScanningReceipt] = useState(false);
  const [scanError, setScanError] = useState<string | undefined>(undefined);
  const [activeReceiptUrl, setActiveReceiptUrl] = useState<string | null>(null);
  // Delete Confirmation States
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<{
    type: string;
    id: string;
    label: string;
  } | null>(null);
  const [genericConfirmModal, setGenericConfirmModal] = useState<{
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
    onConfirm: () => void | Promise<void>;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // PDF Scanner states
  const [isPdfScanModalOpen, setIsPdfScanModalOpen] = useState(false);
  const [pdfScanFile, setPdfScanFile] = useState<string | null>(null); // base64
  const [pdfScanFileName, setPdfScanFileName] = useState("");
  const [isScanningPdf, setIsScanningPdf] = useState(false);
  const [pdfScanError, setPdfScanError] = useState<string | null>(null);
  const [pdfScanResult, setPdfScanResult] = useState<{
    summary: string;
    expenses: Array<{
      description: string;
      amount: number;
      beneficiary: string;
      category: string;
      date: string;
      selected?: boolean;
    }>;
  } | null>(null);

  // File Manager States
  const [isFileLibraryOpen, setIsFileLibraryOpen] = useState(false);
  const [onFileSelectCallback, setOnFileSelectCallback] = useState<((url: string) => void) | null>(null);
  const [fileManagerSearch, setFileManagerSearch] = useState("");
  const [fileTypeFilter, setFileTypeFilter] = useState<string>("Tous"); // 'Tous', 'image', 'pdf'
  const [customFiles, setCustomFiles] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem("gedt_custom_files");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // User / Personnel Management & Password States
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("Tous");
  const [userStatusFilter, setUserStatusFilter] = useState("Tous"); // 'Tous', 'Actifs', 'Révoqués'
  const [userViewMode, setUserViewMode] = useState<"cards" | "table">("cards");

  // Dedicated Password Change Modal States
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordModalUser, setPasswordModalUser] = useState<any | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [showPasswordInModal, setShowPasswordInModal] = useState(false);
  const [showPasswordInUserForm, setShowPasswordInUserForm] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const handleOpenPasswordModal = (user: any) => {
    setPasswordModalUser(user);
    setNewPasswordInput("");
    setShowPasswordInModal(true);
    setIsPasswordModalOpen(true);
  };

  const handleGenerateRandomPassword = (target: "modal" | "form") => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*";
    let generated = "UrGedt-" + Array.from({ length: 6 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join("") + "!";
    if (target === "modal") {
      setNewPasswordInput(generated);
      setShowPasswordInModal(true);
    } else {
      setFormData((prev: any) => ({ ...prev, password: generated }));
      setShowPasswordInUserForm(true);
    }
    addToast("Mot de passe fort généré automatiquement.", "info", "Générateur de Mot de Passe");
  };

  const handleSaveUserPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalUser || !newPasswordInput.trim()) return;

    if (newPasswordInput.trim().length < 6) {
      setErrorMsg("Le mot de passe doit contenir au moins 6 caractères.");
      addToast("Le mot de passe doit contenir au moins 6 caractères.", "error", "Erreur Validation");
      return;
    }

    setIsSavingPassword(true);
    try {
      const updatedUsers = db.users.map((u) =>
        u.id === passwordModalUser.id ? { ...u, password: newPasswordInput.trim() } : u
      );
      const success = await onUpdateTable(
        "users",
        updatedUsers,
        "Modification Mot de Passe",
        `Mise à jour du mot de passe de l'agent du personnel : ${passwordModalUser.name} (${passwordModalUser.email})`
      );

      if (success) {
        setSuccessMsg(`Mot de passe mis à jour avec succès pour ${passwordModalUser.name}.`);
        addToast(
          `Mot de passe mis à jour avec succès pour ${passwordModalUser.name}.`,
          "success",
          "Gestion des Mots de Passe"
        );
        setIsPasswordModalOpen(false);
        setPasswordModalUser(null);
        setNewPasswordInput("");
        setTimeout(() => setSuccessMsg(""), 3500);
      } else {
        setErrorMsg("Erreur lors de la mise à jour du mot de passe.");
        addToast("Erreur lors de la mise à jour du mot de passe.", "error", "Erreur Système");
      }
    } catch (err: any) {
      setErrorMsg(`Erreur : ${err.message}`);
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleOpenFileManager = (callback: (url: string) => void) => {
    setOnFileSelectCallback(() => callback);
    setIsFileLibraryOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Url = event.target?.result as string;
      const fileType = file.type.startsWith("image/") ? "image" : file.type === "application/pdf" ? "pdf" : "other";
      
      const newFile = {
        id: `file-${Date.now()}`,
        title: file.name,
        url: base64Url,
        type: fileType,
        size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
        date: new Date().toISOString()
      };

      const updated = [newFile, ...customFiles];
      setCustomFiles(updated);
      try {
        localStorage.setItem("gedt_custom_files", JSON.stringify(updated));
      } catch (err) {
        console.warn("Storage quota exceeded when saving custom file:", err);
        try {
          // If storage is full, keep only light metadata in localStorage
          const lightFiles = updated.map(f => (f.url && f.url.length > 200000) ? { ...f, url: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=400&q=80" } : f);
          localStorage.setItem("gedt_custom_files", JSON.stringify(lightFiles));
        } catch {
          // Ignore further storage errors gracefully
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteCustomFile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const fileItem = customFiles.find(f => f.id === id);
    setGenericConfirmModal({
      isOpen: true,
      title: "Suppression de document local",
      message: "Êtes-vous sûr de vouloir supprimer définitivement ce document du gestionnaire de fichiers ?",
      itemType: "custom_file",
      itemId: id,
      itemLabel: fileItem ? fileItem.name : "Document importé",
      warningText: "Ce document sera supprimé du stockage local de votre navigateur.",
      confirmText: "Supprimer le fichier",
      variant: "danger",
      onConfirm: () => {
        const updated = customFiles.filter(f => f.id !== id);
        setCustomFiles(updated);
        try {
          localStorage.setItem("gedt_custom_files", JSON.stringify(updated));
        } catch (err) {
          console.warn("Storage quota exceeded on deletion:", err);
        }
        setSuccessMsg("Fichier supprimé du gestionnaire avec succès.");
        addToast("Fichier supprimé du gestionnaire avec succès.", "info", "Gestionnaire de Fichiers");
        setTimeout(() => setSuccessMsg(""), 3000);
        setGenericConfirmModal(null);
      }
    });
  };

  const getCombinedLibrary = () => {
    const galleryFiles = db.gallery.map(g => ({
      id: g.id,
      title: g.title,
      url: g.url,
      type: g.type === "photo" ? "image" : "video",
      size: "Système (Galerie)",
      date: g.date
    }));

    const newsFiles = db.news.map(n => ({
      id: `news-${n.id}`,
      title: `Actualité: ${n.title}`,
      url: n.image,
      type: (n.image?.startsWith("data:application/pdf") || n.image?.endsWith(".pdf") || n.image?.includes("pdf")) ? "pdf" : "image",
      size: "Système (Actualités)",
      date: n.date
    }));

    return [...customFiles, ...galleryFiles, ...newsFiles];
  };

  const handleSelectFileFromLibrary = (url: string) => {
    if (onFileSelectCallback) {
      onFileSelectCallback(url);
    }
    setIsFileLibraryOpen(false);
  };

  const userRole = currentUser.role;
  const perms = currentUser.permissions || [];
  const hasPerm = (p: string) => perms.includes("all") || perms.includes(p);

  // Role Protection helpers — based on real backend permissions (prisma/seed.ts),
  // not hardcoded role-name strings. A role-name check drifts out of sync with the
  // permission model (e.g. it never recognized "Super Administrateur", and granted
  // finance UI to roles the backend then rejects on save).
  const canManageFinances = () => hasPerm("manage_finances");
  const canViewFinances = () => hasPerm("manage_finances") || hasPerm("view_finances");
  const canManageNews = () => hasPerm("manage_content");
  const canManageAcademic = () => hasPerm("manage_content") || hasPerm("manage_research");
  const canManageUsers = () => hasPerm("manage_users");

  // Keyboard Shortcuts Handler
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const globalSearchInputRef = React.useRef<HTMLInputElement>(null);
  const formRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT");

      // 1. ESC: Close active overlays/modals
      if (e.key === "Escape") {
        if (isShortcutsModalOpen) {
          setIsShortcutsModalOpen(false);
          return;
        }
        if (activeReceiptUrl) {
          setActiveReceiptUrl(null);
          return;
        }
        if (deleteConfirmItem) {
          setDeleteConfirmItem(null);
          return;
        }
        if (isModalOpen) {
          setIsModalOpen(false);
          return;
        }
        if (isGlobalSearchFocused) {
          setIsGlobalSearchFocused(false);
          return;
        }
      }

      // 2. Ctrl+S or Cmd+S: Save current form
      if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        if (isModalOpen && formRef.current) {
          formRef.current.requestSubmit();
        } else {
          addToast("Ouvrez un formulaire financier pour enregistrer avec Ctrl+S", "info", "Raccourcis Clavier");
        }
        return;
      }

      // 3. Ctrl+P or Cmd+P: Print page / receipt
      if ((e.ctrlKey || e.metaKey) && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        window.print();
        return;
      }

      // 4. Ctrl+F or Cmd+F: Focus Global Search
      if ((e.ctrlKey || e.metaKey) && (e.key === "f" || e.key === "F")) {
        e.preventDefault();
        if (globalSearchInputRef.current) {
          globalSearchInputRef.current.focus();
          setIsGlobalSearchFocused(true);
        }
        return;
      }

      // 5. F1 or Shift + ? : Toggle Keyboard Shortcuts Guide
      if (e.key === "F1" || (e.shiftKey && e.key === "?")) {
        e.preventDefault();
        setIsShortcutsModalOpen(prev => !prev);
        return;
      }

      // Don't trigger navigation or form creation shortcuts when typing inside form fields
      if (isTyping) return;

      // 6. Alt + R: Quick New Recipe Form
      if (e.altKey && (e.key === "r" || e.key === "R")) {
        e.preventDefault();
        if (canManageFinances()) {
          setActivePanel("finances");
          handleOpenForm("recipe");
          addToast("Formulaire Recette ouvert [Alt+R]", "info", "Raccourci Clavier");
        }
        return;
      }

      // 7. Alt + E or Alt + D: Quick New Expense Form
      if (e.altKey && (e.key === "e" || e.key === "E" || e.key === "d" || e.key === "D")) {
        e.preventDefault();
        if (canManageFinances()) {
          setActivePanel("finances");
          handleOpenForm("expense");
          addToast("Formulaire Dépense ouvert [Alt+E]", "info", "Raccourci Clavier");
        }
        return;
      }

      // 8. Alt + F: Go to Finances Panel
      if (e.altKey && (e.key === "f" || e.key === "F")) {
        e.preventDefault();
        setActivePanel("finances");
        addToast("Bascule vers le panneau Finances [Alt+F]", "info", "Raccourci Clavier");
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isModalOpen, isShortcutsModalOpen, activeReceiptUrl, deleteConfirmItem, isGlobalSearchFocused, userRole]);

  // Sidebar Items
  const sidebarItems = [
    { id: "dashboard", label: "Tableau de Bord", icon: <LayoutDashboard className="h-5 w-5" />, visible: true },
    { id: "finances", label: "Finances & Budget", icon: <DollarSign className="h-5 w-5" />, visible: canViewFinances() },
    { id: "actualites", label: "Actualités", icon: <FileText className="h-5 w-5" />, visible: true },
    { id: "projets", label: "Projets Académiques", icon: <Briefcase className="h-5 w-5" />, visible: true },
    { id: "activites", label: "Activités Terrain", icon: <Activity className="h-5 w-5" />, visible: true },
    { id: "calendrier", label: "Calendrier Interactif", icon: <Calendar className="h-5 w-5" />, visible: true },
    { id: "publications", label: "Publications Sci.", icon: <BookOpen className="h-5 w-5" />, visible: true },
    { id: "galerie", label: "Médiathèque (Galerie)", icon: <Image className="h-5 w-5" />, visible: true },
    { id: "messages", label: "Messages Publics", icon: <Mail className="h-5 w-5" />, visible: canManageNews() },
    { id: "utilisateurs", label: "Gestion du Personnel", icon: <Users className="h-5 w-5" />, visible: canManageUsers() || hasPerm("view_users") },
    { id: "logs", label: "Historique des Actions", icon: <Clock className="h-5 w-5" />, visible: true },
    { id: "parametres", label: "Configuration du Site", icon: <Settings className="h-5 w-5" />, visible: canManageUsers() || canManageNews() }
  ];

  // Calculations for Dashboard Stats
  const totalRecipes = db.recipes.reduce((sum, r) => sum + r.amount, 0);
  const totalExpenses = db.expenses.reduce((sum, e) => sum + e.amount, 0);
  const remainingBudget = totalRecipes - totalExpenses;
  const activeProjectsCount = db.projects.filter(p => p.status === "En cours").length;

  // Pending financial validations calculation (for Accountant & Manager roles)
  const pendingValidationsCount = useMemo(() => {
    const pendingExpenses = db.expenses.filter(
      (e: any) => e.status === "En attente" || e.validationStatus === "En attente" || !e.receiptUrl
    ).length;
    const pendingRecipes = db.recipes.filter(
      (r: any) => r.status === "En attente" || r.validationStatus === "En attente"
    ).length;
    return pendingExpenses + pendingRecipes + pendingOfflineCount;
  }, [db.expenses, db.recipes, pendingOfflineCount]);

  // Chart configuration & trend calculations
  const [chartType, setChartType] = useState<"area" | "bar">("area");

  const monthlyFinancialTrends = useMemo(() => {
    const monthsFr = [
      "Janv", "Févr", "Mars", "Avril", "Mai", "Juin", 
      "Juil", "Août", "Sept", "Oct", "Nov", "Déc"
    ];
    
    const data = monthsFr.map((m) => ({
      monthLabel: m,
      Recettes: 0,
      Dépenses: 0,
      Solde: 0
    }));

    if (db.recipes) {
      db.recipes.forEach((r) => {
        if (!r.date) return;
        const d = new Date(r.date);
        if (!isNaN(d.getTime())) {
          const mIdx = d.getMonth();
          if (mIdx >= 0 && mIdx < 12) {
            data[mIdx].Recettes += Number(r.amount) || 0;
          }
        }
      });
    }

    if (db.expenses) {
      db.expenses.forEach((e) => {
        if (!e.date) return;
        const d = new Date(e.date);
        if (!isNaN(d.getTime())) {
          const mIdx = d.getMonth();
          if (mIdx >= 0 && mIdx < 12) {
            data[mIdx].Dépenses += Number(e.amount) || 0;
          }
        }
      });
    }

    data.forEach(item => {
      item.Solde = item.Recettes - item.Dépenses;
    });

    return data;
  }, [db.recipes, db.expenses]);

  // Utility function to export data array to CSV file with UTF-8 encoding
  const exportToCSV = (filename: string, rows: Record<string, any>[], headers: { key: string; label: string }[]) => {
    if (!rows || !rows.length) {
      setErrorMsg("Aucune donnée disponible à exporter dans la vue actuelle.");
      return;
    }

    const keys = headers.map(h => h.key);
    const headerLabels = headers.map(h => h.label);

    const formatValue = (val: any) => {
      if (val === null || val === undefined) return '""';
      if (Array.isArray(val)) return `"${val.join("; ").replace(/"/g, '""')}"`;
      if (typeof val === "object") return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const csvContent = [
      headerLabels.join(","),
      ...rows.map(row => keys.map(k => formatValue(row[k])).join(","))
    ].join("\r\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setSuccessMsg(`Fichier CSV (${filename}) téléchargé avec succès !`);
    addToast(`Fichier CSV (${filename}) généré et téléchargé avec succès.`, "success", "Exportation CSV");
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  const handleExportRecipesCSV = () => {
    const query = searchQuery.toLowerCase();
    const filteredRecipes = db.recipes.filter(r => 
      (r.description || "").toLowerCase().includes(query) || 
      (r.source || "").toLowerCase().includes(query) ||
      (r.type || "").toLowerCase().includes(query)
    );
    exportToCSV(
      "ur_gedt_recettes",
      filteredRecipes,
      [
        { key: "id", label: "ID Référence" },
        { key: "date", label: "Date Opération" },
        { key: "source", label: "Source Provenance" },
        { key: "type", label: "Type Subvention/Financement" },
        { key: "description", label: "Libellé Description" },
        { key: "amount", label: "Montant Crédit (USD)" },
        { key: "recordedBy", label: "Agent Comptable Enregistreur" }
      ]
    );
  };

  const handleExportExpensesCSV = () => {
    const query = searchQuery.toLowerCase();
    const filteredExpenses = db.expenses.filter(e => 
      (e.description || "").toLowerCase().includes(query) || 
      (e.beneficiary || "").toLowerCase().includes(query) ||
      (e.category || "").toLowerCase().includes(query)
    );
    exportToCSV(
      "ur_gedt_depenses",
      filteredExpenses,
      [
        { key: "id", label: "ID Référence" },
        { key: "date", label: "Date Opération" },
        { key: "beneficiary", label: "Bénéficiaire / Fournisseur" },
        { key: "category", label: "Catégorie Budgétaire" },
        { key: "description", label: "Libellé Description" },
        { key: "amount", label: "Montant Débit (USD)" },
        { key: "recordedBy", label: "Agent Comptable Enregistreur" }
      ]
    );
  };

  const handleExportConsolidatedFinancialsCSV = () => {
    const query = searchQuery.toLowerCase();
    
    const recipesFormatted = db.recipes
      .filter(r => (r.description || "").toLowerCase().includes(query) || (r.source || "").toLowerCase().includes(query))
      .map(r => ({
        date: r.date,
        type_flux: "RECETTE (Crédit)",
        id: r.id,
        tiers: r.source,
        category: r.type,
        description: r.description,
        credit: r.amount,
        debit: 0,
        recordedBy: r.recordedBy || "Agent UR-GEDT",
        timestamp: new Date(r.date).getTime()
      }));

    const expensesFormatted = db.expenses
      .filter(e => (e.description || "").toLowerCase().includes(query) || (e.beneficiary || "").toLowerCase().includes(query))
      .map(e => ({
        date: e.date,
        type_flux: "DÉPENSE (Débit)",
        id: e.id,
        tiers: e.beneficiary,
        category: e.category,
        description: e.description,
        credit: 0,
        debit: e.amount,
        recordedBy: e.recordedBy || "Agent UR-GEDT",
        timestamp: new Date(e.date).getTime()
      }));

    const combined = [...recipesFormatted, ...expensesFormatted].sort((a, b) => a.timestamp - b.timestamp);

    if (!combined.length) {
      setErrorMsg("Aucune opération financière à exporter selon les critères de recherche actuels.");
      addToast("Aucune opération financière à exporter selon les critères actuels.", "warning", "Exportation CSV");
      return;
    }

    let runningBalance = 0;
    const rowsWithBalance = combined.map(item => {
      runningBalance += (item.credit - item.debit);
      return {
        date: item.date,
        type_flux: item.type_flux,
        id: item.id,
        tiers: item.tiers,
        category: item.category,
        description: item.description,
        credit: item.credit ? item.credit : 0,
        debit: item.debit ? item.debit : 0,
        balance: runningBalance,
        recordedBy: item.recordedBy
      };
    });

    exportToCSV(
      "ur_gedt_grand_livre_comptable_complet",
      rowsWithBalance,
      [
        { key: "date", label: "Date" },
        { key: "type_flux", label: "Flux" },
        { key: "id", label: "ID Référence" },
        { key: "tiers", label: "Tiers (Source / Bénéficiaire)" },
        { key: "category", label: "Catégorie / Nature" },
        { key: "description", label: "Libellé Opération" },
        { key: "credit", label: "Crédit Recette (USD)" },
        { key: "debit", label: "Débit Dépense (USD)" },
        { key: "balance", label: "Solde Solde Cumulé (USD)" },
        { key: "recordedBy", label: "Enregistré Par" }
      ]
    );
  };

  const handleExportProjectsCSV = () => {
    const query = searchQuery.toLowerCase();
    const filteredProjects = db.projects.filter(p => 
      (p.title || "").toLowerCase().includes(query) || 
      (p.description || "").toLowerCase().includes(query) ||
      (p.funding || "").toLowerCase().includes(query) ||
      (p.leader || "").toLowerCase().includes(query)
    );
    exportToCSV(
      "ur_gedt_projets_recherche",
      filteredProjects,
      [
        { key: "id", label: "ID" },
        { key: "title", label: "Titre du Projet" },
        { key: "status", label: "Statut" },
        { key: "budget", label: "Budget (USD)" },
        { key: "funding", label: "Bailleur de Fonds" },
        { key: "leader", label: "Responsable / Leader" },
        { key: "description", label: "Description" }
      ]
    );
  };

  // User Access Revocation / Activation Handler
  const handleToggleUserAccess = (userToToggle: User) => {
    const isRevoking = userToToggle.active;
    const actionVerb = isRevoking ? "révoquer" : "réactiver";

    setGenericConfirmModal({
      isOpen: true,
      title: isRevoking ? "Confirmation de Révocation d'Accès" : "Confirmation de Réactivation d'Accès",
      message: `Êtes-vous sûr de vouloir ${actionVerb} l'accès au compte institutionnel de ${userToToggle.name} (${userToToggle.email}) ?`,
      itemType: "user_access",
      itemId: userToToggle.id,
      itemLabel: userToToggle.name,
      warningText: isRevoking
        ? "Cet utilisateur ne pourra plus se connecter au portail UR-GEDT ni effectuer d'opérations d'écriture."
        : "Cet utilisateur pourra de nouveau se connecter au système avec ses identifiants habituels.",
      confirmText: isRevoking ? "Révoquer l'accès" : "Réactiver l'accès",
      variant: isRevoking ? "danger" : "warning",
      onConfirm: async () => {
        const newActiveState = !userToToggle.active;
        const updatedUsers = db.users.map((u) =>
          u.id === userToToggle.id ? { ...u, active: newActiveState } : u
        );
        const logAction = newActiveState ? "Réactivation Accès Utilisateur" : "Révocation Accès Utilisateur";
        const logDetails = newActiveState
          ? `Réactivation de l'accès institutionnel pour ${userToToggle.name} (${userToToggle.role})`
          : `Révocation de l'accès institutionnel pour ${userToToggle.name} (${userToToggle.role})`;

        const success = await onUpdateTable("users", updatedUsers, logAction, logDetails);
        if (success) {
          if (newActiveState) {
            setSuccessMsg(`Accès de ${userToToggle.name} réactivé avec succès.`);
            addToast(`Accès réactivé pour ${userToToggle.name}`, "success", "Gestion des Utilisateurs");
          } else {
            setSuccessMsg(`Accès de ${userToToggle.name} révoqué avec succès.`);
            addToast(`Accès révoqué pour ${userToToggle.name}`, "warning", "Révocation d'Accès");
          }
        } else {
          setErrorMsg("Erreur lors de la mise à jour des accès de l'utilisateur.");
          addToast("Échec de la modification des accès.", "error", "Erreur Système");
        }
        setGenericConfirmModal(null);
      }
    });
  };

  // Export User Directory to CSV
  const handleExportUsersCSV = () => {
    const query = userSearchQuery.toLowerCase();
    const filteredUsers = db.users.filter((u) => {
      const matchesSearch =
        (u.name || "").toLowerCase().includes(query) ||
        (u.email || "").toLowerCase().includes(query) ||
        (u.role || "").toLowerCase().includes(query);
      const matchesRole = userRoleFilter === "Tous" || u.role === userRoleFilter;
      const matchesStatus =
        userStatusFilter === "Tous" ||
        (userStatusFilter === "Actifs" && u.active) ||
        (userStatusFilter === "Révoqués" && !u.active);
      return matchesSearch && matchesRole && matchesStatus;
    });

    exportToCSV(
      "ur_gedt_repertoire_utilisateurs",
      filteredUsers.map((u) => ({
        ...u,
        statusText: u.active ? "Actif / Autorisé" : "Révoqué / Suspendu"
      })),
      [
        { key: "id", label: "ID Compte" },
        { key: "name", label: "Nom & Prénom" },
        { key: "email", label: "E-mail Institutionnel" },
        { key: "role", label: "Rôle / Fonction" },
        { key: "statusText", label: "Statut d'Accès" }
      ]
    );
  };

  // Filtered users memoized list
  const filteredUsersList = useMemo(() => {
    const query = userSearchQuery.toLowerCase().trim();
    return db.users.filter((u) => {
      const matchesSearch =
        (u.name || "").toLowerCase().includes(query) ||
        (u.email || "").toLowerCase().includes(query) ||
        (u.role || "").toLowerCase().includes(query);
      const matchesRole = userRoleFilter === "Tous" || u.role === userRoleFilter;
      const matchesStatus =
        userStatusFilter === "Tous" ||
        (userStatusFilter === "Actifs" && u.active) ||
        (userStatusFilter === "Révoqués" && !u.active);
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [db.users, userSearchQuery, userRoleFilter, userStatusFilter]);

  // Autosave draft form data into localStorage for offline/crash recovery
  React.useEffect(() => {
    if (isModalOpen) {
      if (modalType === "recipe" && (formData.description || formData.amount || formData.source)) {
        localStorage.setItem("urgedt_draft_recipe", JSON.stringify(formData));
      } else if (modalType === "expense" && (formData.description || formData.amount || formData.beneficiary || formData.receiptUrl)) {
        localStorage.setItem("urgedt_draft_expense", JSON.stringify(formData));
      }
    }
  }, [formData, modalType, isModalOpen]);

  const handleClearDraft = () => {
    if (modalType === "recipe") {
      localStorage.removeItem("urgedt_draft_recipe");
      setFormData({ description: "", source: "", amount: "", type: "Subvention" });
    } else if (modalType === "expense") {
      localStorage.removeItem("urgedt_draft_expense");
      setFormData({ description: "", beneficiary: "", amount: "", category: "Matériel", receiptUrl: "" });
    }
    setHasDraftRestored(false);
  };

  // Trigger form opening for adding/editing items
  const handleOpenForm = (type: string, item: any = null) => {
    setErrorMsg("");
    setSuccessMsg("");
    setModalType(type);
    setEditingItem(item);
    
    if (item && item.id) {
      setHasDraftRestored(false);
      if (type === "activity") {
        let actType = "Recherche";
        let cleanTitle = item.title;
        if (item.title.startsWith("[Réunion]")) {
          actType = "Réunion";
          cleanTitle = item.title.replace("[Réunion]", "").trim();
        } else if (item.title.startsWith("[Séminaire]")) {
          actType = "Séminaire";
          cleanTitle = item.title.replace("[Séminaire]", "").trim();
        } else if (item.title.startsWith("[Recherche]")) {
          actType = "Recherche";
          cleanTitle = item.title.replace("[Recherche]", "").trim();
        } else {
          const t = item.title.toLowerCase();
          const d = item.description.toLowerCase();
          if (t.includes("réunion") || d.includes("réunion") || t.includes("reunion") || d.includes("reunion")) {
            actType = "Réunion";
          } else if (t.includes("séminaire") || d.includes("séminaire") || t.includes("seminaire") || d.includes("seminaire")) {
            actType = "Séminaire";
          }
        }
        setFormData({ ...item, title: cleanTitle, type: actType });
      } else {
        setFormData({ ...item });
      }
    } else {
      // Default forms initialization
      if (type === "recipe") {
        const savedDraft = localStorage.getItem("urgedt_draft_recipe");
        if (savedDraft) {
          try {
            const parsed = JSON.parse(savedDraft);
            setFormData(parsed);
            setHasDraftRestored(true);
          } catch {
            setFormData({ description: "", source: "", amount: "", type: "Subvention" });
            setHasDraftRestored(false);
          }
        } else {
          setFormData({ description: "", source: "", amount: "", type: "Subvention" });
          setHasDraftRestored(false);
        }
      } else if (type === "expense") {
        const savedDraft = localStorage.getItem("urgedt_draft_expense");
        if (savedDraft) {
          try {
            const parsed = JSON.parse(savedDraft);
            setFormData(parsed);
            setHasDraftRestored(true);
          } catch {
            setFormData({ description: "", beneficiary: "", amount: "", category: "Matériel", receiptUrl: "" });
            setHasDraftRestored(false);
          }
        } else {
          setFormData({ description: "", beneficiary: "", amount: "", category: "Matériel", receiptUrl: "" });
          setHasDraftRestored(false);
        }
        setScanError(undefined);
        setIsScanningReceipt(false);
      } else if (type === "user") {
        setFormData({ name: "", email: "", password: "", role: "Chercheur", active: true, avatarUrl: "", phone: "", department: "", function: "", bio: "" });
        setHasDraftRestored(false);
      } else if (type === "news") {
        setFormData({ title: "", content: "", date: new Date().toISOString().split("T")[0], author: currentUser.name, image: "https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=800&q=80", category: "Recherche" });
        setHasDraftRestored(false);
      } else if (type === "project") {
        setFormData({ title: "", description: "", startDate: new Date().toISOString().split("T")[0], endDate: "", status: "En cours", budget: "", leader: currentUser.name, funding: "" });
        setHasDraftRestored(false);
      } else if (type === "activity") {
        setFormData({
          title: item?.title || "",
          description: item?.description || "",
          location: item?.location || "",
          date: item?.date || new Date().toISOString().split("T")[0],
          status: item?.status || "Planifié",
          budget: item?.budget || "",
          researchers: item?.researchers || [],
          type: item?.type || "Recherche"
        });
        setHasDraftRestored(false);
      } else if (type === "publication") {
        setFormData({ title: "", authors: currentUser.name, journal: "", year: new Date().getFullYear(), url: "", type: "Article" });
        setHasDraftRestored(false);
      } else if (type === "gallery") {
        setFormData({ title: "", description: "", type: "photo", url: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80", date: new Date().toISOString().split("T")[0] });
        setHasDraftRestored(false);
      } else if (type === "partner") {
        setFormData({ name: "", logo: "https://images.unsplash.com/photo-1592280771190-3e2e4d571952?auto=format&fit=crop&w=200&q=80", website: "", type: "Académique" });
        setHasDraftRestored(false);
      }
    }
    setIsModalOpen(true);
  };

  // Handle Submit Form
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    try {
      // Create/Update Logic based on modalType
      if (modalType === "recipe") {
        if (!formData.description || !formData.source || !formData.amount) {
          setErrorMsg("Veuillez remplir tous les champs");
          return;
        }
        const res = await onRegisterRecipe({
          ...formData,
          recordedBy: currentUser.name,
          userRole: currentUser.role
        });

        const isSuccess = typeof res === "object" ? res?.success : !!res;
        const isOffline = typeof res === "object" ? res?.offline : false;

        if (isSuccess) {
          try {
            localStorage.removeItem("urgedt_draft_recipe");
          } catch {}

          if (isOffline) {
            setSuccessMsg("Sauvegardé localement (Mode Hors-Ligne) ! La recette sera synchronisée dès le retour du réseau.");
            addToast("Recette enregistrée localement (Mode Hors-Ligne)", "warning", "Stockage Local");
          } else {
            setSuccessMsg("Recette enregistrée avec succès !");
            addToast("Recette enregistrée avec succès !", "success", "Gestion Financière");
          }
          setIsModalOpen(false);
        } else {
          setErrorMsg("Erreur lors de l'enregistrement");
          addToast("Erreur lors de l'enregistrement de la recette.", "error", "Échec Enregistrement");
        }
        return;
      }

      if (modalType === "expense") {
        if (!formData.description || !formData.beneficiary || !formData.amount) {
          setErrorMsg("Veuillez remplir tous les champs");
          return;
        }
        const res = await onRegisterExpense({
          ...formData,
          recordedBy: currentUser.name,
          userRole: currentUser.role
        });

        const isSuccess = typeof res === "object" ? res?.success : !!res;
        const isOffline = typeof res === "object" ? res?.offline : false;

        if (isSuccess) {
          try {
            localStorage.removeItem("urgedt_draft_expense");
          } catch {}

          if (isOffline) {
            setSuccessMsg("Sauvegardé localement (Mode Hors-Ligne) ! La dépense sera synchronisée dès le retour du réseau.");
            addToast("Dépense enregistrée localement (Mode Hors-Ligne)", "warning", "Stockage Local");
          } else {
            setSuccessMsg("Dépense enregistrée avec succès !");
            addToast("Dépense budgétaire enregistrée avec succès !", "success", "Gestion Financière");
          }
          setIsModalOpen(false);
        } else {
          setErrorMsg("Erreur lors de l'enregistrement");
          addToast("Erreur lors de l'enregistrement de la dépense.", "error", "Échec Enregistrement");
        }
        return;
      }

      // CRUD for other entities
      let tableName = "";
      let updatedList: any[] = [];
      let logAction = "";
      let logDetails = "";

      if (modalType === "user") {
        tableName = "users";
        const currentList = [...db.users];
        if (editingItem) {
          const passwordToUse = (formData.password && formData.password.trim().length > 0)
            ? formData.password.trim()
            : editingItem.password;
          const userPayload = { ...formData, password: passwordToUse };
          updatedList = currentList.map(u => u.id === editingItem.id ? { ...u, ...userPayload } : u);
          logAction = "Modification Personnel";
          logDetails = `Modification du membre du personnel ${formData.name} (${formData.role}).`;
        } else {
          const newUser = { ...formData, id: `u-${Date.now()}`, active: formData.active ?? true };
          updatedList = [newUser, ...currentList];
          logAction = "Création Personnel";
          logDetails = `Création d'un membre du personnel ${formData.name} (${formData.role}).`;
        }
      } else if (modalType === "news") {
        tableName = "news";
        const currentList = [...db.news];
        if (editingItem) {
          updatedList = currentList.map(n => n.id === editingItem.id ? { ...n, ...formData } : n);
          logAction = "Modification Actualité";
          logDetails = `Modification de l'actualité : ${formData.title}`;
        } else {
          const newItem = { ...formData, id: `n-${Date.now()}` };
          updatedList = [newItem, ...currentList];
          logAction = "Création Actualité";
          logDetails = `Création de l'actualité : ${formData.title}`;
        }
      } else if (modalType === "project") {
        tableName = "projects";
        const currentList = [...db.projects];
        if (editingItem) {
          updatedList = currentList.map(p => p.id === editingItem.id ? { ...p, ...formData, budget: parseFloat(formData.budget) } : p);
          logAction = "Modification Projet";
          logDetails = `Modification du projet de recherche : ${formData.title}`;
        } else {
          const newItem = { ...formData, id: `proj-${Date.now()}`, budget: parseFloat(formData.budget) };
          updatedList = [newItem, ...currentList];
          logAction = "Création Projet";
          logDetails = `Lancement du projet de recherche : ${formData.title}`;
        }
      } else if (modalType === "activity") {
        tableName = "activities";
        const currentList = [...db.activities];
        // Parse researchers if it's comma separated
        const researchersArray = typeof formData.researchers === "string" 
          ? (formData.researchers as string).split(",").map(r => r.trim()).filter(r => r.length > 0)
          : formData.researchers;

        const selectedType = formData.type || "Recherche";
        let rawTitle = formData.title || "";
        if (rawTitle.startsWith("[")) {
          const closeBracketIdx = rawTitle.indexOf("]");
          if (closeBracketIdx !== -1) {
            rawTitle = rawTitle.substring(closeBracketIdx + 1).trim();
          }
        }
        const finalTitle = `[${selectedType}] ${rawTitle}`;

        if (editingItem) {
          updatedList = currentList.map(a => a.id === editingItem.id ? { ...a, ...formData, title: finalTitle, budget: parseFloat(formData.budget), researchers: researchersArray } : a);
          logAction = "Modification Activité";
          logDetails = `Modification de l'activité : ${rawTitle}`;
        } else {
          const newItem = { ...formData, id: `act-${Date.now()}`, title: finalTitle, budget: parseFloat(formData.budget), researchers: researchersArray };
          updatedList = [newItem, ...currentList];
          logAction = "Création Activité";
          logDetails = `Création de l'activité : ${rawTitle}`;
        }
      } else if (modalType === "publication") {
        tableName = "publications";
        const currentList = [...db.publications];
        if (editingItem) {
          updatedList = currentList.map(p => p.id === editingItem.id ? { ...p, ...formData, year: parseInt(formData.year, 10) } : p);
          logAction = "Modification Publication";
          logDetails = `Modification de la publication : ${formData.title}`;
        } else {
          const newItem = { ...formData, id: `pub-${Date.now()}`, year: parseInt(formData.year, 10) };
          updatedList = [newItem, ...currentList];
          logAction = "Création Publication";
          logDetails = `Ajout de la publication scientifique : ${formData.title}`;
        }
      } else if (modalType === "gallery") {
        tableName = "gallery";
        const currentList = [...db.gallery];
        if (editingItem) {
          updatedList = currentList.map(g => g.id === editingItem.id ? { ...g, ...formData } : g);
          logAction = "Modification Galerie";
          logDetails = `Modification de l'élément média : ${formData.title}`;
        } else {
          const newItem = { ...formData, id: `gal-${Date.now()}` };
          updatedList = [newItem, ...currentList];
          logAction = "Création Galerie";
          logDetails = `Ajout d'un média à la galerie : ${formData.title}`;
        }
      } else if (modalType === "partner") {
        tableName = "partners";
        const currentList = [...db.partners];
        if (editingItem) {
          updatedList = currentList.map(p => p.id === editingItem.id ? { ...p, ...formData } : p);
          logAction = "Modification Partenaire";
          logDetails = `Modification du partenaire : ${formData.name}`;
        } else {
          const newItem = { ...formData, id: `part-${Date.now()}` };
          updatedList = [newItem, ...currentList];
          logAction = "Création Partenaire";
          logDetails = `Ajout du partenaire officiel : ${formData.name}`;
        }
      }

      const success = await onUpdateTable(tableName, updatedList, logAction, logDetails);
      if (success) {
        setSuccessMsg("Enregistrement réussi !");
        if (modalType === "user") {
          addToast(
            `Compte utilisateur ${editingItem ? "modifié" : "créé"} avec succès : ${formData.name} (${formData.role})`,
            "success",
            "Mise à Jour des Accès"
          );
        } else if (modalType === "project") {
          addToast(
            `Projet de recherche ${editingItem ? "modifié" : "enregistré"} : ${formData.title}`,
            "success",
            "Projets Académiques"
          );
        } else if (modalType === "activity") {
          addToast(
            `Activité terrain ${editingItem ? "mise à jour" : "créée"} : ${formData.title}`,
            "success",
            "Activités UR-GEDT"
          );
        } else if (modalType === "news") {
          addToast(
            `Actualité ${editingItem ? "mise à jour" : "publiée"} : ${formData.title}`,
            "success",
            "Actualités Institutionnelles"
          );
        } else {
          addToast("Données sauvegardées avec succès dans le système.", "success", "Enregistrement Réussi");
        }
        setIsModalOpen(false);
      } else {
        setErrorMsg("Erreur lors de la communication serveur");
        addToast("Erreur lors de la communication serveur.", "error", "Échec Enregistrement");
      }
    } catch (e: any) {
      setErrorMsg(`Erreur système : ${e.message}`);
    }
  };

  // Delete Action Trigger (opens confirmation dialog)
  const handleDeleteItem = (type: string, id: string, label: string) => {
    setDeleteConfirmItem({ type, id, label });
  };

  // Execute confirmed deletion
  const confirmExecuteDelete = async () => {
    if (!deleteConfirmItem) return;
    setIsDeleting(true);
    const { type, id, label } = deleteConfirmItem;

    let tableName = "";
    let updatedList: any[] = [];
    let logAction = "";
    let logDetails = "";

    if (type === "user") {
      tableName = "users";
      updatedList = db.users.filter(u => u.id !== id);
      logAction = "Suppression Utilisateur";
      logDetails = `Suppression de l'utilisateur : ${label}`;
    } else if (type === "news") {
      tableName = "news";
      updatedList = db.news.filter(n => n.id !== id);
      logAction = "Suppression Actualité";
      logDetails = `Suppression de l'actualité : ${label}`;
    } else if (type === "project") {
      tableName = "projects";
      updatedList = db.projects.filter(p => p.id !== id);
      logAction = "Suppression Projet";
      logDetails = `Suppression du projet : ${label}`;
    } else if (type === "activity") {
      tableName = "activities";
      updatedList = db.activities.filter(a => a.id !== id);
      logAction = "Suppression Activité";
      logDetails = `Suppression de l'activité terrain : ${label}`;
    } else if (type === "publication") {
      tableName = "publications";
      updatedList = db.publications.filter(p => p.id !== id);
      logAction = "Suppression Publication";
      logDetails = `Suppression de la publication : ${label}`;
    } else if (type === "gallery") {
      tableName = "gallery";
      updatedList = db.gallery.filter(g => g.id !== id);
      logAction = "Suppression Galerie";
      logDetails = `Suppression du média de la galerie : ${label}`;
    } else if (type === "partner") {
      tableName = "partners";
      updatedList = db.partners.filter(p => p.id !== id);
      logAction = "Suppression Partenaire";
      logDetails = `Suppression du partenaire : ${label}`;
    } else if (type === "message") {
      tableName = "contactMessages";
      updatedList = db.contactMessages.filter(m => m.id !== id);
      logAction = "Suppression Message";
      logDetails = `Suppression du message envoyé par : ${label}`;
    } else if (type === "recipe") {
      tableName = "recipes";
      updatedList = db.recipes.filter(r => r.id !== id);
      logAction = "Suppression Recette";
      logDetails = `Suppression de la recette enregistrée : ${id} (${label})`;
    } else if (type === "expense") {
      tableName = "expenses";
      updatedList = db.expenses.filter(e => e.id !== id);
      logAction = "Suppression Dépense";
      logDetails = `Suppression de la dépense enregistrée : ${id} (${label})`;
    }

    try {
      await onUpdateTable(tableName, updatedList, logAction, logDetails);
      addToast(`L'élément "${label}" a été supprimé définitivement.`, "warning", "Suppression Effectuée");
    } catch (err) {
      console.error("Delete operation failed:", err);
      addToast("Erreur lors de la suppression de l'élément.", "error", "Échec Suppression");
    } finally {
      setIsDeleting(false);
      setDeleteConfirmItem(null);
    }
  };

  // Toggle message read state
  const handleToggleMessageRead = async (msg: ContactMessage) => {
    const updated = db.contactMessages.map(m => m.id === msg.id ? { ...m, readStatus: !m.readStatus } : m);
    await onUpdateTable("contactMessages", updated, "Modification Message", `Marqué le message de ${msg.senderName} comme ${!msg.readStatus ? 'lu' : 'non lu'}.`);
  };

  return (
    <div className={`min-h-screen flex flex-col md:flex-row font-sans transition-colors duration-200 ${
      theme === "light" ? "theme-light bg-slate-100 text-slate-900" : "bg-gradient-to-br from-[#071A12] via-[#0F2A1C] to-[#0A2016] text-slate-100"
    }`}>
      
      {/* SIDEBAR */}
      <aside className="w-full md:w-64 bg-[#111111] border-r border-white/5 flex flex-col justify-between shrink-0 no-print">
        <div>
          {/* Dashboard Header Brand */}
          <div className="p-6 border-b border-white/5 flex items-center space-x-3">
            <img 
              src={currentSettings?.logo || "/logo.jpg"} 
              alt="Logo UR-GEDT" 
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/logo.jpg'; }}
              className="h-11 w-11 object-contain rounded-full shadow-lg border-2 border-[#D4AF37] bg-white p-0.5" 
              referrerPolicy="no-referrer"
            />
            <div>
              <h2 className="font-display font-extrabold text-white text-sm tracking-tight leading-none">Espace Interne</h2>
              <p className="text-[10px] text-slate-400 mt-1.5 uppercase font-mono tracking-wider">{currentSettings?.siteName || "UR-GEDT UNILU"}</p>
            </div>
          </div>

          {/* Connected User Profile */}
          <div className="p-4 bg-[#151515] border-b border-white/5 m-3 rounded-xl flex items-center space-x-3">
            <div className="h-10 w-10 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] flex items-center justify-center font-bold text-lg font-display uppercase border border-[#D4AF37]/20">
              {currentUser.name.split(" ").slice(-1)[0][0]}
            </div>
            <div className="overflow-hidden">
              <h4 className="text-xs font-bold text-white truncate leading-none">{currentUser.name}</h4>
              <p className="text-[11px] text-[#D4AF37] font-bold uppercase mt-1 font-mono truncate">{userRole}</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="p-3 space-y-1">
            {sidebarItems.filter(item => item.visible).map((item) => (
              <button
                key={item.id}
                onClick={() => { setActivePanel(item.id); setSearchQuery(""); }}
                className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activePanel === item.id 
                    ? "bg-[#D4AF37] text-black shadow-lg font-bold" 
                    : "text-slate-400 hover:text-white hover:bg-[#151515]"
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Sidebar Footer Controls: Theme Switcher & Logout */}
        <div className="p-3 border-t border-white/5 bg-[#111111] shrink-0 space-y-2">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-3 py-2 bg-[#151515] hover:bg-[#1E1E1E] border border-white/5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer"
            title="Changer le thème d'affichage"
          >
            <span className="flex items-center space-x-2">
              {theme === "dark" ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-indigo-400" />}
              <span>{theme === "dark" ? "Thème Clair" : "Thème Sombre"}</span>
            </span>
            <span className="text-[11px] font-mono uppercase bg-[#D4AF37]/10 text-[#D4AF37] px-2 py-0.5 rounded border border-[#D4AF37]/20 font-bold">
              {theme === "dark" ? "SOMBRE" : "CLAIR"}
            </span>
          </button>

          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center space-x-2 bg-[#151515] hover:bg-red-950/40 text-slate-300 hover:text-red-400 border border-white/5 hover:border-red-900 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <div className="flex-grow flex flex-col min-w-0">
        
        {/* TOP BAR WITH REAL-TIME GLOBAL SEARCH */}
        <header className="h-16 border-b border-white/5 bg-[#111111]/80 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 shrink-0 no-print relative z-30">
          <div className="flex items-center space-x-3 shrink-0">
            <h1 className="font-display text-base sm:text-lg font-extrabold text-white uppercase tracking-tight">
              {sidebarItems.find(i => i.id === activePanel)?.label}
            </h1>
            <span className="hidden md:inline text-xs text-slate-500 font-mono">UR-GEDT</span>
          </div>

          {/* REAL-TIME GLOBAL SEARCH BAR */}
          <div className="relative max-w-md w-full mx-3 sm:mx-6">
            <div className="relative flex items-center">
              <Search className="absolute left-3.5 h-4 w-4 text-[#D4AF37] pointer-events-none" />
              <input
                ref={globalSearchInputRef}
                type="text"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                onFocus={() => setIsGlobalSearchFocused(true)}
                placeholder="Recherche globale (Finances, Projets, Membres...)"
                className="w-full bg-[#151515] hover:bg-[#181818] focus:bg-[#1A1A1A] text-slate-100 placeholder-slate-500 pl-10 pr-16 py-2 border border-white/10 rounded-xl text-xs transition-all focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-[#D4AF37] shadow-inner"
              />
              <div className="absolute right-3 flex items-center gap-1">
                {globalSearch ? (
                  <button
                    onClick={() => setGlobalSearch("")}
                    className="p-0.5 text-slate-400 hover:text-white rounded-full hover:bg-white/10 cursor-pointer"
                    title="Effacer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <kbd className="hidden md:inline-block text-[10px] font-mono font-semibold bg-white/5 border border-white/10 text-slate-400 px-1.5 py-0.5 rounded shadow-sm">
                    Ctrl+F
                  </kbd>
                )}
              </div>
            </div>

            {/* REAL-TIME FLOATING SEARCH RESULTS DROPDOWN */}
            <AnimatePresence>
              {isGlobalSearchFocused && globalSearch.trim().length > 0 && (
                <>
                  {/* Backdrop overlay to close when clicking outside */}
                  <div 
                    className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
                    onClick={() => setIsGlobalSearchFocused(false)}
                  />

                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 right-0 top-full mt-2 bg-[#141414] border border-[#D4AF37]/40 rounded-2xl shadow-2xl z-50 max-h-[75vh] overflow-y-auto divide-y divide-white/5 p-2 text-xs"
                  >
                    {/* Header info */}
                    <div className="px-3 py-2 flex items-center justify-between text-xs text-slate-400 font-mono">
                      <span>Recherche : <strong className="text-white">"{globalSearch}"</strong></span>
                      <span className="bg-[#D4AF37]/10 text-[#D4AF37] px-2 py-0.5 rounded font-bold border border-[#D4AF37]/20">
                        {globalSearchResults.totalCount} résultat(s)
                      </span>
                    </div>

                    {globalSearchResults.totalCount === 0 ? (
                      <div className="p-6 text-center text-slate-400 space-y-1">
                        <Search className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                        <p className="font-semibold text-slate-300">Aucun résultat trouvé</p>
                        <p className="text-xs text-slate-500">Essayez avec un nom, une catégorie, un montant ou un statut.</p>
                      </div>
                    ) : (
                      <div className="py-2 space-y-4">
                        {/* FINANCE RECORDS CATEGORY */}
                        {(globalSearchResults.recipes.length > 0 || globalSearchResults.expenses.length > 0) && (
                          <div className="space-y-1">
                            <div className="px-3 py-1 text-[11px] uppercase font-bold text-[#D4AF37] tracking-wider flex items-center justify-between bg-white/[0.02] rounded-lg">
                              <span className="flex items-center gap-1.5">
                                <DollarSign className="h-3.5 w-3.5 text-emerald-400" /> Registre Financier ({globalSearchResults.recipes.length + globalSearchResults.expenses.length})
                              </span>
                              <button
                                onClick={() => {
                                  setActivePanel("finances");
                                  setSearchQuery(globalSearch);
                                  setIsGlobalSearchFocused(false);
                                }}
                                className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
                              >
                                Ouvrir dans Finances &rarr;
                              </button>
                            </div>

                            {/* Recipes */}
                            {globalSearchResults.recipes.slice(0, 3).map(r => (
                              <div
                                key={`recipe-${r.id}`}
                                onClick={() => {
                                  setActivePanel("finances");
                                  setSearchQuery(r.description || r.source);
                                  setIsGlobalSearchFocused(false);
                                }}
                                className="px-3 py-2 hover:bg-[#1E1E1E] rounded-xl cursor-pointer flex items-center justify-between group transition-colors gap-2"
                              >
                                <div className="space-y-0.5 min-w-0 pr-2">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20 shrink-0">Recette</span>
                                    <span className="text-white font-medium group-hover:text-[#D4AF37] transition-colors truncate">{r.description || r.source}</span>
                                  </div>
                                  <p className="text-[11px] text-slate-400 font-mono truncate">Source : {r.source} &bull; {r.date}</p>
                                </div>
                                <div className="flex items-center space-x-2 shrink-0">
                                  <span className="font-bold text-emerald-400 font-mono text-xs">+ {(r.amount || 0).toLocaleString()} USD</span>
                                  <button
                                    type="button"
                                    onClick={(ev) => {
                                      ev.stopPropagation();
                                      setIsGlobalSearchFocused(false);
                                      onTriggerPrint({ type: "recette", data: r });
                                    }}
                                    className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                    title="Exporter la fiche PDF"
                                  >
                                    <Download className="h-3 w-3" />
                                    <span>PDF</span>
                                  </button>
                                </div>
                              </div>
                            ))}

                            {/* Expenses */}
                            {globalSearchResults.expenses.slice(0, 3).map(e => (
                              <div
                                key={`expense-${e.id}`}
                                onClick={() => {
                                  setActivePanel("finances");
                                  setSearchQuery(e.description || e.beneficiary);
                                  setIsGlobalSearchFocused(false);
                                }}
                                className="px-3 py-2 hover:bg-[#1E1E1E] rounded-xl cursor-pointer flex items-center justify-between group transition-colors gap-2"
                              >
                                <div className="space-y-0.5 min-w-0 pr-2">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-[10px] font-bold uppercase bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded border border-red-500/20 shrink-0">Dépense</span>
                                    <span className="text-white font-medium group-hover:text-[#D4AF37] transition-colors truncate">{e.description || e.beneficiary}</span>
                                  </div>
                                  <p className="text-[11px] text-slate-400 font-mono truncate">Bénéficiaire : {e.beneficiary} &bull; {e.category} &bull; {e.date}</p>
                                </div>
                                <div className="flex items-center space-x-2 shrink-0">
                                  <span className="font-bold text-red-400 font-mono text-xs">- {(e.amount || 0).toLocaleString()} USD</span>
                                  <button
                                    type="button"
                                    onClick={(ev) => {
                                      ev.stopPropagation();
                                      setIsGlobalSearchFocused(false);
                                      onTriggerPrint({ type: "depense", data: e });
                                    }}
                                    className="px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                    title="Exporter la fiche PDF"
                                  >
                                    <Download className="h-3 w-3" />
                                    <span>PDF</span>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* RESEARCH PROJECTS CATEGORY */}
                        {globalSearchResults.projects.length > 0 && (
                          <div className="space-y-1">
                            <div className="px-3 py-1 text-[11px] uppercase font-bold text-[#D4AF37] tracking-wider flex items-center justify-between bg-white/[0.02] rounded-lg">
                              <span className="flex items-center gap-1.5">
                                <Briefcase className="h-3.5 w-3.5 text-blue-400" /> Projets de Recherche ({globalSearchResults.projects.length})
                              </span>
                              <button
                                onClick={() => {
                                  setActivePanel("projets");
                                  setSearchQuery(globalSearch);
                                  setIsGlobalSearchFocused(false);
                                }}
                                className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
                              >
                                Ouvrir dans Projets &rarr;
                              </button>
                            </div>

                            {globalSearchResults.projects.slice(0, 4).map(p => (
                              <div
                                key={`proj-${p.id}`}
                                onClick={() => {
                                  setActivePanel("projets");
                                  setSearchQuery(p.title);
                                  setIsGlobalSearchFocused(false);
                                }}
                                className="px-3 py-2 hover:bg-[#1E1E1E] rounded-xl cursor-pointer flex items-center justify-between group transition-colors"
                              >
                                <div className="space-y-0.5 min-w-0 pr-2">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-[10px] font-bold uppercase bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20 shrink-0">{p.status}</span>
                                    <span className="text-white font-medium group-hover:text-[#D4AF37] transition-colors truncate">{p.title}</span>
                                  </div>
                                  <p className="text-[11px] text-slate-400 font-mono truncate">Responsable : {p.leader} &bull; Bailleur : {p.funding}</p>
                                </div>
                                <span className="font-bold text-slate-300 font-mono text-xs shrink-0">{p.budget.toLocaleString()} USD</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* MEMBER DIRECTORY CATEGORY */}
                        {globalSearchResults.users.length > 0 && (
                          <div className="space-y-1">
                            <div className="px-3 py-1 text-[11px] uppercase font-bold text-[#D4AF37] tracking-wider flex items-center justify-between bg-white/[0.02] rounded-lg">
                              <span className="flex items-center gap-1.5">
                                <Users className="h-3.5 w-3.5 text-purple-400" /> Annuaire des Membres ({globalSearchResults.users.length})
                              </span>
                              <button
                                onClick={() => {
                                  setActivePanel("utilisateurs");
                                  setSearchQuery(globalSearch);
                                  setIsGlobalSearchFocused(false);
                                }}
                                className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
                              >
                                Ouvrir dans Membres &rarr;
                              </button>
                            </div>

                            {globalSearchResults.users.slice(0, 4).map(u => (
                              <div
                                key={`user-${u.id}`}
                                onClick={() => {
                                  setActivePanel("utilisateurs");
                                  setSearchQuery(u.name);
                                  setIsGlobalSearchFocused(false);
                                }}
                                className="px-3 py-2 hover:bg-[#1E1E1E] rounded-xl cursor-pointer flex items-center justify-between group transition-colors"
                              >
                                <div className="flex items-center space-x-3 min-w-0 pr-2">
                                  <div className="h-7 w-7 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] flex items-center justify-center font-bold text-xs uppercase border border-[#D4AF37]/30 shrink-0 overflow-hidden">
                                    {u.avatarUrl ? (
                                      <img src={u.avatarUrl} alt={u.name} className="h-full w-full object-cover" />
                                    ) : (
                                      u.name.split(" ").slice(-1)[0]?.[0] || "U"
                                    )}
                                  </div>
                                  <div className="space-y-0.5 min-w-0">
                                    <p className="text-white font-medium group-hover:text-[#D4AF37] transition-colors truncate">{u.name}</p>
                                    <p className="text-[11px] text-slate-400 font-mono truncate">{u.email}</p>
                                  </div>
                                </div>
                                <span className="text-[11px] font-bold text-[#D4AF37] uppercase font-mono bg-[#D4AF37]/10 px-2 py-0.5 rounded border border-[#D4AF37]/10 shrink-0">{u.role}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            {/* Keyboard Shortcuts Guide Toggle Button */}
            <button
              onClick={() => setIsShortcutsModalOpen(true)}
              className="flex items-center space-x-1.5 bg-[#151515] hover:bg-[#1E1E1E] border border-white/10 hover:border-[#D4AF37]/50 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white transition-all cursor-pointer shadow-sm group"
              title="Guide des Raccourcis Clavier (F1 ou Shift + ?)"
            >
              <Keyboard className="h-4 w-4 text-[#D4AF37] group-hover:scale-110 transition-transform shrink-0" />
              <span className="hidden sm:inline">Raccourcis</span>
              <kbd className="hidden md:inline-block text-[10px] font-mono bg-white/5 border border-white/10 text-slate-400 px-1 py-0.5 rounded">F1</kbd>
            </button>

            {/* Theme Selector Button in Header */}
            <button
              onClick={toggleTheme}
              className="flex items-center space-x-2 bg-[#151515] hover:bg-[#1E1E1E] border border-white/10 hover:border-[#D4AF37]/50 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm group"
              title={theme === "dark" ? "Passer au thème clair" : "Passer au thème sombre"}
            >
              {theme === "dark" ? (
                <>
                  <Sun className="h-4 w-4 text-amber-400 group-hover:rotate-45 transition-transform shrink-0" />
                  <span className="hidden sm:inline text-slate-300 group-hover:text-white">Thème Clair</span>
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4 text-indigo-500 group-hover:-rotate-12 transition-transform shrink-0" />
                  <span className="hidden sm:inline text-slate-700 group-hover:text-black">Thème Sombre</span>
                </>
              )}
            </button>

            {/* Fullscreen Mode Toggle Button in Header */}
            <button
              onClick={toggleFullscreen}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm group border ${
                isFullscreen
                  ? "bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37]"
                  : "bg-[#151515] hover:bg-[#1E1E1E] border-white/10 hover:border-[#D4AF37]/50 text-slate-300 hover:text-white"
              }`}
              title={isFullscreen ? "Quitter le mode plein écran" : "Basculer le tableau de bord en plein écran"}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="h-4 w-4 text-[#D4AF37] shrink-0" />
                  <span className="hidden sm:inline">Quitter Plein Écran</span>
                </>
              ) : (
                <>
                  <Maximize2 className="h-4 w-4 text-[#D4AF37] shrink-0" />
                  <span className="hidden sm:inline">Plein Écran</span>
                </>
              )}
            </button>

            {/* REAL-TIME SERVER SYNC BADGE IN HEADER */}
            <div 
              onClick={() => onSyncOfflineQueue?.(true)}
              className="hidden lg:flex items-center space-x-2 bg-[#151515] hover:bg-[#1E1E1E] border border-white/10 hover:border-[#D4AF37]/50 px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer shadow-sm group"
              title="Dernière synchronisation réussie avec le serveur. Cliquer pour rafraîchir."
            >
              <span className="relative flex h-2 w-2 shrink-0">
                {isOnline ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </>
                ) : (
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                )}
              </span>
              <Clock className="h-3.5 w-3.5 text-[#D4AF37] group-hover:rotate-45 transition-transform shrink-0" />
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="font-bold uppercase text-slate-400 group-hover:text-slate-200">Synchro :</span>
                <span className="font-bold text-emerald-400 font-mono">
                  {formatSyncTimestamp(lastSyncTime)}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* WORKSPACE PANELS */}
        <main className="p-6 md:p-8 overflow-y-auto flex-grow min-w-0">
          {/* OFFLINE MODE & AUTO-SYNC NOTIFICATION BANNER */}
          {(!isOnline || pendingOfflineCount > 0 || syncStatusNotice) && (
            <div className="mb-6 space-y-2">
              {!isOnline && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-200">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                      <WifiOff className="h-5 w-5 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs uppercase tracking-wide text-amber-300">Mode Hors-Ligne Activé</h4>
                      <p className="text-xs text-slate-300">
                        Connexion réseau indisponible. Les formulaires de recettes et dépenses saisis seront sauvegardés localement via <code className="font-mono bg-black/40 px-1 py-0.5 rounded text-amber-300">localStorage</code> et synchronisés automatiquement avec le serveur dès le rétablissement d'Internet.
                      </p>
                    </div>
                  </div>
                  {pendingOfflineCount > 0 && (
                    <span className="shrink-0 bg-amber-500/20 text-amber-300 text-xs font-mono font-bold px-3 py-1 rounded-full border border-amber-500/30">
                      {pendingOfflineCount} en attente
                    </span>
                  )}
                </div>
              )}

              {isOnline && pendingOfflineCount > 0 && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-blue-200">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/30">
                      <HardDrive className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs uppercase tracking-wide text-blue-300">Formulaires Hors-Ligne en Attente</h4>
                      <p className="text-xs text-slate-300">
                        {pendingOfflineCount} formulaire(s) financier(s) enregistré(s) hors-ligne en attente d'envoi au serveur.
                      </p>
                    </div>
                  </div>
                  {onSyncOfflineQueue && (
                    <button
                      type="button"
                      disabled={isSyncing}
                      onClick={() => onSyncOfflineQueue(true)}
                      className="shrink-0 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
                    >
                      {isSyncing ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          <span>Synchronisation...</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-3.5 w-3.5" />
                          <span>Synchroniser Maintenant</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}

              {syncStatusNotice && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3.5 flex items-center gap-3 text-emerald-200 text-xs">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                  <span>{syncStatusNotice}</span>
                </div>
              )}
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={activePanel}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              {/* PANEL: OVERVIEW / DASHBOARD */}
          {activePanel === "dashboard" && (
            <div className="space-y-8">
              {/* Role-Based Summary Cards (Accountants & Managers vs Standard Members) */}
              {canManageFinances() ? (
                /* Accountants ('Comptable') & Managers ('Administrateur', 'Directeur') View */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-5">
                  {/* Total Recettes Card */}
                  <div className="bg-[#111111] p-5 rounded-xl border border-white/5 shadow-md flex flex-col justify-between">
                    <div className="flex justify-between items-center mb-3 text-slate-500">
                      <span className="text-xs font-semibold uppercase tracking-wider font-mono">Total Recettes</span>
                      <TrendingUp className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-display text-2xl font-black text-white">{(totalRecipes || 0).toLocaleString()} USD</p>
                      <p className="text-[11px] text-slate-500 mt-1 font-mono">Bailleurs & subventions</p>
                    </div>
                  </div>
                  
                  {/* Total Dépenses Card */}
                  <div className="bg-[#111111] p-5 rounded-xl border border-white/5 shadow-md flex flex-col justify-between">
                    <div className="flex justify-between items-center mb-3 text-slate-500">
                      <span className="text-xs font-semibold uppercase tracking-wider font-mono">Total Dépenses</span>
                      <TrendingDown className="h-5 w-5 text-red-400" />
                    </div>
                    <div>
                      <p className="font-display text-2xl font-black text-white">{(totalExpenses || 0).toLocaleString()} USD</p>
                      <p className="text-[11px] text-slate-500 mt-1 font-mono">Équipements & logistique</p>
                    </div>
                  </div>

                  {/* Solde Trésorerie Card */}
                  <div className="bg-[#111111] p-5 rounded-xl border border-white/5 shadow-md flex flex-col justify-between">
                    <div className="flex justify-between items-center mb-3 text-slate-500">
                      <span className="text-xs font-semibold uppercase tracking-wider font-mono">Solde Trésorerie</span>
                      <DollarSign className="h-5 w-5 text-[#D4AF37]" />
                    </div>
                    <div>
                      <p className="font-display text-2xl font-black text-[#D4AF37]">{(remainingBudget || 0).toLocaleString()} USD</p>
                      <p className="text-[11px] text-slate-500 mt-1 font-mono">Disponible en caisse</p>
                    </div>
                  </div>

                  {/* Validations Financières en Attente Card (Accountant / Manager exclusive) */}
                  <div className="bg-[#111111] p-5 rounded-xl border border-amber-500/20 bg-amber-500/[0.02] shadow-md flex flex-col justify-between relative overflow-hidden group">
                    <div className="flex justify-between items-center mb-3 text-amber-400">
                      <span className="text-xs font-semibold uppercase tracking-wider font-mono flex items-center gap-1 text-amber-300">
                        Validations Fin.
                      </span>
                      <ShieldAlert className="h-5 w-5 text-amber-400 group-hover:scale-110 transition-transform shrink-0 animate-pulse" />
                    </div>
                    <div>
                      <div className="flex items-baseline gap-1.5">
                        <p className="font-display text-2xl font-black text-amber-400">{pendingValidationsCount}</p>
                        <span className="text-xs font-bold text-amber-300">en attente</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 font-mono">
                        {pendingValidationsCount > 0 
                          ? "Pièces ou envois hors-ligne à viser" 
                          : "Toutes les pièces sont visées"}
                      </p>
                    </div>
                    <button
                      onClick={() => setActivePanel("finances")}
                      className="mt-2.5 text-[11px] font-bold text-amber-400 hover:text-amber-300 underline text-left cursor-pointer flex items-center gap-1"
                      title="Aller au panneau comptable pour examiner les pièces"
                    >
                      <span>Examiner les pièces →</span>
                    </button>
                  </div>

                  {/* Projets Actifs Card */}
                  <div className="bg-[#111111] p-5 rounded-xl border border-white/5 shadow-md flex flex-col justify-between">
                    <div className="flex justify-between items-center mb-3 text-slate-500">
                      <span className="text-xs font-semibold uppercase tracking-wider font-mono">Projets Actifs</span>
                      <Briefcase className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="font-display text-2xl font-black text-white">{activeProjectsCount} Projets</p>
                      <p className="text-[11px] text-slate-500 mt-1 font-mono">En cours d'étude UR-GEDT</p>
                    </div>
                  </div>
                </div>
              ) : (
                /* Standard Members (Chercheur, Secrétaire, etc.) - Decluttered Academic & Research Summary Cards */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-[#111111] p-6 rounded-xl border border-white/5 shadow-md">
                    <div className="flex justify-between items-center mb-4 text-slate-500">
                      <span className="text-xs font-semibold uppercase tracking-wider font-mono">Projets Académiques</span>
                      <Briefcase className="h-5 w-5 text-blue-400" />
                    </div>
                    <p className="font-display text-2xl font-black text-white">{activeProjectsCount} Actifs</p>
                    <p className="text-[11px] text-slate-500 mt-1 font-mono">Recherches en cours au Katanga</p>
                  </div>

                  <div className="bg-[#111111] p-6 rounded-xl border border-white/5 shadow-md">
                    <div className="flex justify-between items-center mb-4 text-slate-500">
                      <span className="text-xs font-semibold uppercase tracking-wider font-mono">Publications Sci.</span>
                      <BookOpen className="h-5 w-5 text-purple-400" />
                    </div>
                    <p className="font-display text-2xl font-black text-white">{db.publications.length} Articles & Thèses</p>
                    <p className="text-[11px] text-slate-500 mt-1 font-mono">Base de savoir académique</p>
                  </div>

                  <div className="bg-[#111111] p-6 rounded-xl border border-white/5 shadow-md">
                    <div className="flex justify-between items-center mb-4 text-slate-500">
                      <span className="text-xs font-semibold uppercase tracking-wider font-mono">Activités Terrain</span>
                      <Activity className="h-5 w-5 text-emerald-400" />
                    </div>
                    <p className="font-display text-2xl font-black text-white">{db.activities.length} Missions</p>
                    <p className="text-[11px] text-slate-500 mt-1 font-mono">Investigations & enquêtes</p>
                  </div>

                  <div className="bg-[#111111] p-6 rounded-xl border border-white/5 shadow-md">
                    <div className="flex justify-between items-center mb-4 text-slate-500">
                      <span className="text-xs font-semibold uppercase tracking-wider font-mono">Actualités Publiées</span>
                      <FileText className="h-5 w-5 text-[#D4AF37]" />
                    </div>
                    <p className="font-display text-2xl font-black text-white">{db.news.length} Communiqués</p>
                    <p className="text-[11px] text-slate-500 mt-1 font-mono">Espace média UR-GEDT</p>
                  </div>
                </div>
              )}

              {/* RECHARTS MONTHLY FINANCIAL TRENDS */}
              <div className="bg-[#111111] p-6 rounded-2xl border border-white/5 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
                  <div>
                    <h3 className="font-display text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-[#D4AF37]" />
                      <span>Tendances Mensuelles : Recettes vs Dépenses (2026)</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Analyse dynamique Recharts des flux financiers entrants (Recettes) et sortants (Dépenses) par mois.
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 bg-[#151515] p-1.5 rounded-xl border border-white/5 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setChartType("area")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        chartType === "area" ? "bg-[#D4AF37] text-black shadow-md" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Aires Cumulées
                    </button>
                    <button
                      type="button"
                      onClick={() => setChartType("bar")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        chartType === "bar" ? "bg-[#D4AF37] text-black shadow-md" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Histogramme
                    </button>
                  </div>
                </div>

                <div className="h-72 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    {chartType === "area" ? (
                      <AreaChart data={monthlyFinancialTrends} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorRecettesDash" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorDepensesDash" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#EF4444" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#222222" vertical={false} />
                        <XAxis dataKey="monthLabel" stroke="#666666" fontSize={11} tickLine={false} />
                        <YAxis stroke="#666666" fontSize={11} tickLine={false} tickFormatter={(val) => `${val >= 1000 ? `${(val/1000).toFixed(0)}k` : val}`} />
                        <Tooltip content={<CustomChartTooltip />} />
                        <Legend wrapperStyle={{ paddingTop: 10, fontSize: 12, color: "#94a3b8" }} />
                        <Area type="monotone" dataKey="Recettes" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRecettesDash)" name="Recettes (USD)" />
                        <Area type="monotone" dataKey="Dépenses" stroke="#EF4444" strokeWidth={2.5} fillOpacity={1} fill="url(#colorDepensesDash)" name="Dépenses (USD)" />
                      </AreaChart>
                    ) : (
                      <BarChart data={monthlyFinancialTrends} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#222222" vertical={false} />
                        <XAxis dataKey="monthLabel" stroke="#666666" fontSize={11} tickLine={false} />
                        <YAxis stroke="#666666" fontSize={11} tickLine={false} tickFormatter={(val) => `${val >= 1000 ? `${(val/1000).toFixed(0)}k` : val}`} />
                        <Tooltip content={<CustomChartTooltip />} />
                        <Legend wrapperStyle={{ paddingTop: 10, fontSize: 12, color: "#94a3b8" }} />
                        <Bar dataKey="Recettes" fill="#10B981" radius={[4, 4, 0, 0]} name="Recettes (USD)" />
                        <Bar dataKey="Dépenses" fill="#EF4444" radius={[4, 4, 0, 0]} name="Dépenses (USD)" />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>

              {/* DENSE GRID: RECENT ACTIVITY & SYSTEM LOGS */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Visual Chart Placeholder styled purely with native SVG representing Budgeting */}
                <div className="bg-[#111111] p-6 rounded-xl border border-white/5 shadow-md">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-display text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <BarChart2 className="h-4 w-4 text-[#D4AF37]" />
                      <span>Répartition du Budget d'Investissement ({db.budget?.year || 2026})</span>
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-500 font-mono">UR-GEDT</span>
                      <button
                        type="button"
                        onClick={() => {
                          setActivePanel("finances");
                          setTimeout(() => handleOpenBudgetModal(), 100);
                        }}
                        className="text-[11px] font-bold text-[#D4AF37] bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 border border-[#D4AF37]/30 px-2 py-0.5 rounded transition-all flex items-center gap-1 cursor-pointer"
                        title="Modifier le budget global en BDD"
                      >
                        <Edit className="h-2.5 w-2.5" />
                        <span>Modifier</span>
                      </button>
                    </div>
                  </div>
                  
                  {/* SVG Bar chart for allocation */}
                  <div className="space-y-4">
                    {[
                      { name: "Recherche & Enquêtes", percent: 40, amount: db.budget.allocatedResearch, color: "bg-[#D4AF37]" },
                      { name: "Logistique Terrain", percent: 20, amount: db.budget.allocatedLogistics, color: "bg-blue-400" },
                      { name: "Matériels Labo", percent: 23, amount: db.budget.allocatedEquipment, color: "bg-emerald-400" },
                      { name: "Personnel & RH", percent: 17, amount: db.budget.allocatedPersonnel, color: "bg-purple-400" }
                    ].map((alloc, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-300 font-semibold">{alloc.name}</span>
                          <span className="text-slate-400 font-mono">{alloc.amount.toLocaleString()} USD ({alloc.percent}%)</span>
                        </div>
                        <div className="w-full bg-[#151515] rounded-full h-2 overflow-hidden border border-white/5">
                          <div className={`h-full ${alloc.color}`} style={{ width: `${alloc.percent}%` }}></div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <p className="text-[11px] text-slate-500 leading-relaxed mt-6 italic border-t border-white/5 pt-4">
                    Ce graphique indique l'allocation programmatique du budget annuel de l'Unité de Recherche. L'allocation de recherche correspond à 40% pour privilégier la collecte primaire de données au Katanga.
                  </p>
                </div>

                {/* Journal simplié */}
                <div className="bg-[#111111] p-6 rounded-xl border border-white/5 shadow-md">
                  <h3 className="font-display text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-[#D4AF37]" />
                    <span>Derniers Événements du Système</span>
                  </h3>
                  <div className="space-y-4 max-h-[280px] overflow-y-auto pr-2">
                    {db.logs.slice(0, 6).map((log) => (
                      <div key={log.id} className="text-xs bg-[#151515] p-3 rounded-lg border border-white/5 flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-white">{log.userName}</span>
                            <span className="text-[10px] bg-white/10 text-slate-400 px-1.5 py-0.5 rounded font-mono font-bold uppercase">{log.userRole}</span>
                          </div>
                          <p className="text-slate-300 font-medium">{log.details}</p>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono whitespace-nowrap shrink-0">
                          {new Date(log.timestamp).toLocaleDateString("fr-FR")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* REPORT CENTER PANEL */}
              <div className="bg-[#111111] p-6 rounded-xl border border-white/5 shadow-md">
                <h3 className="font-display text-sm font-bold text-[#D4AF37] uppercase tracking-wider mb-4 flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>Centre de Rapports Officiels (PDF / Impression)</span>
                </h3>
                <p className="text-xs text-slate-400 mb-6">Générez instantanément des rapports conformes et signés pour vos archives académiques ou pour les bailleurs de fonds.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Recettes Card */}
                  <div className="flex flex-col justify-between p-4 bg-[#151515] border border-white/5 rounded-xl space-y-3">
                    <div className="flex items-center space-x-3">
                      <TrendingUp className="h-6 w-6 text-emerald-400 shrink-0" />
                      <div>
                        <h4 className="text-xs font-bold text-white">Rapport des Recettes</h4>
                        <p className="text-[10px] text-slate-500 font-mono">Finances & Entrées</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                      <button
                        type="button"
                        onClick={() => onTriggerPrint({ type: "rapport_recettes", data: db.recipes })}
                        className="flex-1 flex items-center justify-center space-x-1 py-1.5 bg-[#111111] hover:bg-white/5 text-slate-300 hover:text-white border border-white/10 rounded text-[11px] font-bold transition-colors cursor-pointer"
                        title="Imprimer le rapport PDF"
                      >
                        <Printer className="h-3 w-3" />
                        <span>PDF</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleExportRecipesCSV}
                        className="flex-1 flex items-center justify-center space-x-1 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded text-[11px] font-bold transition-colors cursor-pointer"
                        title="Exporter en CSV"
                      >
                        <Download className="h-3 w-3" />
                        <span>CSV</span>
                      </button>
                    </div>
                  </div>

                  {/* Dépenses Card */}
                  <div className="flex flex-col justify-between p-4 bg-[#151515] border border-white/5 rounded-xl space-y-3">
                    <div className="flex items-center space-x-3">
                      <TrendingDown className="h-6 w-6 text-red-400 shrink-0" />
                      <div>
                        <h4 className="text-xs font-bold text-white">Rapport des Dépenses</h4>
                        <p className="text-[10px] text-slate-500 font-mono">Finances & Sorties</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                      <button
                        type="button"
                        onClick={() => onTriggerPrint({ type: "rapport_depenses", data: db.expenses })}
                        className="flex-1 flex items-center justify-center space-x-1 py-1.5 bg-[#111111] hover:bg-white/5 text-slate-300 hover:text-white border border-white/10 rounded text-[11px] font-bold transition-colors cursor-pointer"
                        title="Imprimer le rapport PDF"
                      >
                        <Printer className="h-3 w-3" />
                        <span>PDF</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleExportExpensesCSV}
                        className="flex-1 flex items-center justify-center space-x-1 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded text-[11px] font-bold transition-colors cursor-pointer"
                        title="Exporter en CSV"
                      >
                        <Download className="h-3 w-3" />
                        <span>CSV</span>
                      </button>
                    </div>
                  </div>

                  {/* Projets Card */}
                  <div className="flex flex-col justify-between p-4 bg-[#151515] border border-white/5 rounded-xl space-y-3">
                    <div className="flex items-center space-x-3">
                      <Briefcase className="h-6 w-6 text-blue-400 shrink-0" />
                      <div>
                        <h4 className="text-xs font-bold text-white">Rapport des Projets</h4>
                        <p className="text-[10px] text-slate-500 font-mono">Recherche & Bailleurs</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                      <button
                        type="button"
                        onClick={() => onTriggerPrint({ type: "rapport_projets", data: db.projects })}
                        className="flex-1 flex items-center justify-center space-x-1 py-1.5 bg-[#111111] hover:bg-white/5 text-slate-300 hover:text-white border border-white/10 rounded text-[11px] font-bold transition-colors cursor-pointer"
                        title="Imprimer le rapport PDF"
                      >
                        <Printer className="h-3 w-3" />
                        <span>PDF</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleExportProjectsCSV}
                        className="flex-1 flex items-center justify-center space-x-1 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded text-[11px] font-bold transition-colors cursor-pointer"
                        title="Exporter en CSV"
                      >
                        <Download className="h-3 w-3" />
                        <span>CSV</span>
                      </button>
                    </div>
                  </div>

                  {/* Activités Card */}
                  <div className="flex flex-col justify-between p-4 bg-[#151515] border border-white/5 rounded-xl space-y-3">
                    <div className="flex items-center space-x-3">
                      <Activity className="h-6 w-6 text-purple-400 shrink-0" />
                      <div>
                        <h4 className="text-xs font-bold text-white">Activités Terrain</h4>
                        <p className="text-[10px] text-slate-500 font-mono">Investigations</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                      <button
                        type="button"
                        onClick={() => onTriggerPrint({ type: "rapport_activites", data: db.activities })}
                        className="flex-1 flex items-center justify-center space-x-1 py-1.5 bg-[#111111] hover:bg-white/5 text-slate-300 hover:text-white border border-white/10 rounded text-[11px] font-bold transition-colors cursor-pointer"
                        title="Imprimer le rapport PDF"
                      >
                        <Printer className="h-3 w-3" />
                        <span>PDF</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const query = searchQuery.toLowerCase();
                          const filteredActivities = db.activities.filter(a => 
                            (a.title || "").toLowerCase().includes(query) || 
                            (a.location || "").toLowerCase().includes(query) ||
                            (a.description || "").toLowerCase().includes(query)
                          );
                          exportToCSV(
                            "ur_gedt_activites_terrain",
                            filteredActivities,
                            [
                              { key: "id", label: "ID" },
                              { key: "title", label: "Titre" },
                              { key: "location", label: "Lieu" },
                              { key: "status", label: "Statut" },
                              { key: "budget", label: "Budget (USD)" },
                              { key: "date", label: "Date" },
                              { key: "researchers", label: "Chercheurs Impliqués" },
                              { key: "description", label: "Description" }
                            ]
                          );
                        }}
                        className="flex-1 flex items-center justify-center space-x-1 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 rounded text-[11px] font-bold transition-colors cursor-pointer"
                        title="Exporter en CSV"
                      >
                        <Download className="h-3 w-3" />
                        <span>CSV</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PANEL: FINANCES MODULE */}
          {activePanel === "finances" && (
            <div className="space-y-8">

              {/* PROMINENT BUDGET CONTROL BANNER */}
              <div className="bg-gradient-to-r from-[#181818] via-[#151515] to-[#121212] border border-[#D4AF37]/40 rounded-2xl p-5 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center space-x-3.5">
                  <div className="h-12 w-12 rounded-xl bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/50 flex items-center justify-center shrink-0 shadow-inner">
                    <Sliders className="h-6 w-6 text-[#D4AF37]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider">
                        Gestion du Budget & Enveloppes Financières ({db.budget?.year || 2026})
                      </h3>
                      <span className="bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] text-[11px] font-mono font-bold px-2 py-0.5 rounded-md">
                        Base de Données UR-GEDT
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 font-mono">
                      Budget Global Alloué : <strong className="text-[#D4AF37] font-extrabold font-mono">{(db.budget?.totalBudget || 0).toLocaleString()} USD</strong> (Recherche: {(db.budget?.allocatedResearch || 0).toLocaleString()} USD | Logistique: {(db.budget?.allocatedLogistics || 0).toLocaleString()} USD | Matériel: {(db.budget?.allocatedEquipment || 0).toLocaleString()} USD | RH: {(db.budget?.allocatedPersonnel || 0).toLocaleString()} USD)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
                  {hasPerm("approve_budget") ? (
                    <>
                      <button
                        type="button"
                        onClick={handleOpenBudgetModal}
                        className="flex-1 md:flex-none flex items-center justify-center space-x-2 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-lg hover:scale-[1.02]"
                      >
                        <Edit className="h-4 w-4" />
                        <span>Modifier le Budget</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsResetBudgetConfirmOpen(true)}
                        className="flex-1 md:flex-none flex items-center justify-center space-x-2 bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md hover:scale-[1.02]"
                      >
                        <RotateCcw className="h-4 w-4" />
                        <span>Réinitialiser Budget</span>
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center gap-2.5 bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-slate-400">
                      <Lock className="h-4 w-4 text-[#D4AF37] shrink-0" />
                      <div className="text-[11px] leading-snug">
                        <p className="font-bold text-slate-300">Budget verrouillé pour votre rôle</p>
                        <p>Seul le Directeur peut modifier ou réinitialiser l'enveloppe budgétaire.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Receipts & Expenses Forms and list toggle */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="relative w-full sm:max-w-xs">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Filtrer par description, source..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#111111] text-slate-100 pl-10 pr-4 py-2 border border-white/5 rounded-lg text-xs focus:ring-1 focus:ring-[#D4AF37]"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <div className="flex items-center space-x-1.5 bg-[#151515] border border-white/10 rounded-lg p-1">
                    <button
                      onClick={handleExportRecipesCSV}
                      className="flex items-center space-x-1 px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded text-xs font-bold transition-all cursor-pointer"
                      title="Télécharger l'ensemble des recettes au format CSV"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Recettes CSV</span>
                    </button>
                    <button
                      onClick={handleExportExpensesCSV}
                      className="flex items-center space-x-1 px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded text-xs font-bold transition-all cursor-pointer"
                      title="Télécharger l'ensemble des dépenses au format CSV"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Dépenses CSV</span>
                    </button>
                    <button
                      onClick={handleExportConsolidatedFinancialsCSV}
                      className="flex items-center space-x-1 px-2.5 py-1 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 rounded text-xs font-bold transition-all cursor-pointer"
                      title="Télécharger le Grand Livre comptable consolidé en CSV"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5" />
                      <span>Grand Livre CSV</span>
                    </button>
                    <button
                      type="button"
                      onClick={toggleFullscreen}
                      className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer border ${
                        isFullscreen
                          ? "bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37]"
                          : "bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white"
                      }`}
                      title={isFullscreen ? "Quitter le mode plein écran" : "Agrandir le tableau financier en plein écran"}
                    >
                      {isFullscreen ? (
                        <>
                          <Minimize2 className="h-3.5 w-3.5 text-[#D4AF37]" />
                          <span>Réduire</span>
                        </>
                      ) : (
                        <>
                          <Maximize2 className="h-3.5 w-3.5 text-[#D4AF37]" />
                          <span>Plein Écran</span>
                        </>
                      )}
                    </button>
                  </div>

                  {canManageFinances() && (
                    <div className="flex flex-wrap gap-2">
                      {hasPerm("approve_budget") ? (
                        <>
                          <button
                            onClick={handleOpenBudgetModal}
                            className="flex items-center space-x-1.5 bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/40 px-3.5 py-2 rounded-lg text-xs font-bold hover:bg-[#D4AF37]/25 transition-all cursor-pointer shadow-sm"
                            title="Modifier le budget global et la ventilation analytique en base de données"
                          >
                            <Sliders className="h-4 w-4 text-[#D4AF37]" />
                            <span>Modifier Budget</span>
                          </button>
                          <button
                            onClick={() => setIsResetBudgetConfirmOpen(true)}
                            className="flex items-center space-x-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 px-3.5 py-2 rounded-lg text-xs font-bold hover:bg-amber-500/20 transition-all cursor-pointer shadow-sm"
                            title="Réinitialiser le budget aux valeurs par défaut (120 000 USD) en BDD"
                          >
                            <RotateCcw className="h-4 w-4" />
                            <span>Réinitialiser Budget</span>
                          </button>
                        </>
                      ) : (
                        <div className="flex items-center gap-2 bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-[11px] text-slate-400">
                          <Lock className="h-3.5 w-3.5 text-[#D4AF37] shrink-0" />
                          <span>Budget verrouillé — modification réservée au Directeur</span>
                        </div>
                      )}
                      <button
                        onClick={() => handleOpenForm("recipe")}
                        className="flex items-center space-x-1.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-3.5 py-2 rounded-lg text-xs font-bold hover:bg-emerald-500/25 transition-all cursor-pointer"
                        title="Ajouter une Recette [Raccourci: Alt + R]"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Ajouter Recette</span>
                        <kbd className="hidden sm:inline-block text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-1 py-0.5 rounded border border-emerald-500/30 ml-1">Alt+R</kbd>
                      </button>
                      <button
                        onClick={() => handleOpenForm("expense")}
                        className="flex items-center space-x-1.5 bg-red-500/15 text-red-400 border border-red-500/30 px-3.5 py-2 rounded-lg text-xs font-bold hover:bg-red-500/25 transition-all cursor-pointer"
                        title="Ajouter une Dépense [Raccourci: Alt + E ou Alt + D]"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Ajouter Dépense</span>
                        <kbd className="hidden sm:inline-block text-[10px] font-mono bg-red-500/20 text-red-300 px-1 py-0.5 rounded border border-red-500/30 ml-1">Alt+E</kbd>
                      </button>
                      <button
                        onClick={() => {
                          setPdfScanResult(null);
                          setPdfScanError(null);
                          setPdfScanFile(null);
                          setPdfScanFileName("");
                          setIsPdfScanModalOpen(true);
                        }}
                        className="flex items-center space-x-1.5 bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30 px-3.5 py-2 rounded-lg text-xs font-bold hover:bg-[#D4AF37]/25 transition-all cursor-pointer"
                      >
                        <FileText className="h-4 w-4 text-[#D4AF37]" />
                        <span>Scanner Rapport (PDF)</span>
                      </button>
                      <button
                        onClick={() => {
                          if (onOpenQrScanner) onOpenQrScanner();
                          setIsQrScannerModalOpen(true);
                        }}
                        className="flex items-center space-x-1.5 bg-[#D4AF37] text-black border border-[#D4AF37] px-3.5 py-2 rounded-lg text-xs font-bold hover:bg-[#D4AF37]/90 transition-all cursor-pointer shadow-md"
                        title="Scanner et valider un QR Code de reçu imprimé"
                      >
                        <QrCode className="h-4 w-4" />
                        <span>Valideur QR Code</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* BUDGET TARGET ALLOCATION SECTION */}
              <div className="bg-[#111111] p-6 rounded-xl border border-white/5 shadow-md">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <div>
                    <h3 className="font-display text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-[#D4AF37]" />
                      <span>Enveloppe Budgétaire Exercice Courant ({db.budget?.year || 2026})</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Gestion des plafonds financiers et ventilation analytique par poste dans la base de données.
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="bg-[#151515] border border-white/10 px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold text-[#D4AF37] shadow-sm">
                      Total : {(db.budget?.totalBudget || 0).toLocaleString()} USD
                    </span>

                    <button
                      type="button"
                      onClick={handleOpenBudgetModal}
                      className="flex items-center space-x-1.5 bg-[#D4AF37]/15 hover:bg-[#D4AF37]/30 text-[#D4AF37] border border-[#D4AF37]/40 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
                      title="Modifier les plafonds et l'enveloppe budgétaire"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      <span>Modifier Budget</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsResetBudgetConfirmOpen(true)}
                      className="flex items-center space-x-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/25 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
                      title="Réinitialiser les enveloppes budgétaires aux valeurs initiales par défaut"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Réinitialiser</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 bg-[#151515] rounded-lg border border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-1 h-full bg-emerald-500/50" />
                    <p className="text-[11px] text-slate-500 uppercase font-mono tracking-wider mb-2">Recherche & Études</p>
                    <p className="font-mono text-lg font-bold text-white">{(db.budget?.allocatedResearch || 0).toLocaleString()} USD</p>
                  </div>
                  <div className="p-4 bg-[#151515] rounded-lg border border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-1 h-full bg-blue-500/50" />
                    <p className="text-[11px] text-slate-500 uppercase font-mono tracking-wider mb-2">Logistique Terrain</p>
                    <p className="font-mono text-lg font-bold text-white">{(db.budget?.allocatedLogistics || 0).toLocaleString()} USD</p>
                  </div>
                  <div className="p-4 bg-[#151515] rounded-lg border border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-1 h-full bg-[#D4AF37]/50" />
                    <p className="text-[11px] text-slate-500 uppercase font-mono tracking-wider mb-2">Matériels Scientifiques</p>
                    <p className="font-mono text-lg font-bold text-white">{(db.budget?.allocatedEquipment || 0).toLocaleString()} USD</p>
                  </div>
                  <div className="p-4 bg-[#151515] rounded-lg border border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-1 h-full bg-purple-500/50" />
                    <p className="text-[11px] text-slate-500 uppercase font-mono tracking-wider mb-2">Ressources Humaines</p>
                    <p className="font-mono text-lg font-bold text-white">{(db.budget?.allocatedPersonnel || 0).toLocaleString()} USD</p>
                  </div>
                </div>
              </div>

              {/* RECHARTS MONTHLY FINANCIAL TRENDS (FINANCES PANEL) */}
              <div className="bg-[#111111] p-6 rounded-2xl border border-white/5 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
                  <div>
                    <h3 className="font-display text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <BarChart2 className="h-5 w-5 text-[#D4AF37]" />
                      <span>Graphique des Flux Financiers Mensuels (Recettes vs Dépenses)</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Analyse comparative mensuelle produite par Recharts pour un suivi précis de la trésorerie.
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 bg-[#151515] p-1.5 rounded-xl border border-white/5 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setChartType("area")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        chartType === "area" ? "bg-[#D4AF37] text-black shadow-md" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Aires
                    </button>
                    <button
                      type="button"
                      onClick={() => setChartType("bar")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        chartType === "bar" ? "bg-[#D4AF37] text-black shadow-md" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Bâtonnets
                    </button>
                  </div>
                </div>

                <div className="h-72 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    {chartType === "area" ? (
                      <AreaChart data={monthlyFinancialTrends} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorRecettesFin" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorDepensesFin" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#EF4444" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#222222" vertical={false} />
                        <XAxis dataKey="monthLabel" stroke="#666666" fontSize={11} tickLine={false} />
                        <YAxis stroke="#666666" fontSize={11} tickLine={false} tickFormatter={(val) => `${val >= 1000 ? `${(val/1000).toFixed(0)}k` : val}`} />
                        <Tooltip content={<CustomChartTooltip />} />
                        <Legend wrapperStyle={{ paddingTop: 10, fontSize: 12, color: "#94a3b8" }} />
                        <Area type="monotone" dataKey="Recettes" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRecettesFin)" name="Recettes (USD)" />
                        <Area type="monotone" dataKey="Dépenses" stroke="#EF4444" strokeWidth={2.5} fillOpacity={1} fill="url(#colorDepensesFin)" name="Dépenses (USD)" />
                      </AreaChart>
                    ) : (
                      <BarChart data={monthlyFinancialTrends} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#222222" vertical={false} />
                        <XAxis dataKey="monthLabel" stroke="#666666" fontSize={11} tickLine={false} />
                        <YAxis stroke="#666666" fontSize={11} tickLine={false} tickFormatter={(val) => `${val >= 1000 ? `${(val/1000).toFixed(0)}k` : val}`} />
                        <Tooltip content={<CustomChartTooltip />} />
                        <Legend wrapperStyle={{ paddingTop: 10, fontSize: 12, color: "#94a3b8" }} />
                        <Bar dataKey="Recettes" fill="#10B981" radius={[4, 4, 0, 0]} name="Recettes (USD)" />
                        <Bar dataKey="Dépenses" fill="#EF4444" radius={[4, 4, 0, 0]} name="Dépenses (USD)" />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>

              {/* DOUBLE LISTINGS: RECIPES & EXPENSES */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* RECIPES TABLE */}
                <div className="bg-[#111111] p-6 rounded-xl border border-white/5 shadow-md">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-display text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      <span>Registre des Recettes (Recettes)</span>
                    </h3>
                    <button
                      type="button"
                      onClick={handleExportRecipesCSV}
                      className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#151515] hover:bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-sm"
                      title="Exporter le registre des recettes au format CSV"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Télécharger CSV</span>
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-white/5 text-slate-500 uppercase text-[10px] tracking-wider">
                          <th className="py-2.5">ID / Date</th>
                          <th className="py-2.5">Source / Type</th>
                          <th className="py-2.5">Description</th>
                          <th className="py-2.5 text-right">Montant</th>
                          <th className="py-2.5 text-center">Reçu</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {db.recipes
                          .filter(r => r.description.toLowerCase().includes(searchQuery.toLowerCase()) || r.source.toLowerCase().includes(searchQuery.toLowerCase()))
                          .map((r) => (
                            <tr key={r.id} className="hover:bg-white/5">
                              <td className="py-3">
                                <span className="font-mono font-bold text-emerald-400 block">{r.id}</span>
                                <span className="text-[11px] text-slate-500 font-mono">{new Date(r.date).toLocaleDateString("fr-FR")}</span>
                              </td>
                              <td className="py-3">
                                <span className="font-semibold text-white block">{r.source}</span>
                                <span className="text-[10px] uppercase font-bold text-slate-500 bg-[#151515] px-1.5 py-0.5 rounded font-mono">{r.type}</span>
                              </td>
                              <td className="py-3 text-slate-300 leading-relaxed max-w-[150px] truncate" title={r.description}>
                                {r.description}
                              </td>
                              <td className="py-3 text-right font-mono font-bold text-white">
                                {(r.amount || 0).toLocaleString()} USD
                              </td>
                              <td className="py-3">
                                <div className="flex items-center justify-center space-x-1.5">
                                  <button
                                    onClick={() => onTriggerPrint({ type: "recette", data: r })}
                                    className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center space-x-1 shadow-sm"
                                    title="Exporter la fiche individuelle de recette au format PDF pour archivage"
                                  >
                                    <Download className="h-3 w-3" />
                                    <span>Fiche PDF</span>
                                  </button>
                                  <button
                                    onClick={() => onTriggerPrint({ type: "recette", data: r })}
                                    className="p-1.5 bg-[#151515] hover:bg-white/10 text-slate-400 hover:text-white border border-white/5 rounded-lg transition-colors cursor-pointer"
                                    title="Imprimer / Aperçu Officiel"
                                  >
                                    <Printer className="h-3 w-3" />
                                  </button>
                                  {canManageFinances() && (
                                    <button
                                      onClick={() => handleDeleteItem("recipe", r.id, r.description)}
                                      className="p-1.5 bg-[#151515] hover:bg-red-950/40 text-slate-500 hover:text-red-400 border border-white/5 rounded-lg transition-colors cursor-pointer"
                                      title="Supprimer"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* EXPENSES TABLE */}
                <div className="bg-[#111111] p-6 rounded-xl border border-white/5 shadow-md">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-display text-sm font-bold text-red-400 uppercase tracking-wider flex items-center gap-2">
                      <TrendingDown className="h-5 w-5" />
                      <span>Registre des Dépenses (Dépenses)</span>
                    </h3>
                    <button
                      type="button"
                      onClick={handleExportExpensesCSV}
                      className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#151515] hover:bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-sm"
                      title="Exporter le registre des dépenses au format CSV"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Télécharger CSV</span>
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-white/5 text-slate-500 uppercase text-[10px] tracking-wider">
                          <th className="py-2.5">ID / Date</th>
                          <th className="py-2.5">Bénéficiaire / Cat.</th>
                          <th className="py-2.5">Description</th>
                          <th className="py-2.5 text-right">Montant</th>
                          <th className="py-2.5 text-center">Bordereau & PDF</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {db.expenses
                          .filter(e => e.description.toLowerCase().includes(searchQuery.toLowerCase()) || e.beneficiary.toLowerCase().includes(searchQuery.toLowerCase()))
                          .map((e) => (
                            <tr key={e.id} className="hover:bg-white/5">
                              <td className="py-3">
                                <span className="font-mono font-bold text-red-400 block">{e.id}</span>
                                <span className="text-[11px] text-slate-500 font-mono">{new Date(e.date).toLocaleDateString("fr-FR")}</span>
                              </td>
                              <td className="py-3">
                                <span className="font-semibold text-white block">{e.beneficiary}</span>
                                <span className="text-[10px] uppercase font-bold text-slate-500 bg-[#151515] px-1.5 py-0.5 rounded font-mono">{e.category}</span>
                              </td>
                              <td className="py-3 text-slate-300 leading-relaxed max-w-[150px] truncate" title={e.description}>
                                {e.description}
                              </td>
                              <td className="py-3 text-right font-mono font-bold text-white">
                                {(e.amount || 0).toLocaleString()} USD
                              </td>
                              <td className="py-3">
                                <div className="flex items-center justify-center space-x-1.5">
                                  {e.receiptUrl && (
                                    <button
                                      onClick={() => setActiveReceiptUrl(e.receiptUrl!)}
                                      className="p-1.5 bg-amber-500/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/20 rounded-lg transition-colors cursor-pointer"
                                      title="Voir la pièce justificative (Facture scannée)"
                                    >
                                      <Eye className="h-3 w-3" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => onTriggerPrint({ type: "depense", data: e })}
                                    className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center space-x-1 shadow-sm"
                                    title="Exporter la fiche individuelle de dépense au format PDF pour archivage"
                                  >
                                    <Download className="h-3 w-3" />
                                    <span>Fiche PDF</span>
                                  </button>
                                  <button
                                    onClick={() => onTriggerPrint({ type: "depense", data: e })}
                                    className="p-1.5 bg-[#151515] hover:bg-white/10 text-slate-400 hover:text-white border border-white/5 rounded-lg transition-colors cursor-pointer"
                                    title="Imprimer / Aperçu Officiel"
                                  >
                                    <Printer className="h-3 w-3" />
                                  </button>
                                  {canManageFinances() && (
                                    <button
                                      onClick={() => handleDeleteItem("expense", e.id, e.description)}
                                      className="p-1.5 bg-[#151515] hover:bg-red-950/40 text-slate-500 hover:text-red-400 border border-white/5 rounded-lg transition-colors cursor-pointer"
                                      title="Supprimer"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* PANEL: ACTUALITES (NEWS) */}
          {activePanel === "actualites" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center gap-4">
                <div className="relative max-w-xs w-full">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Rechercher actualités..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#111111] text-slate-100 pl-10 pr-4 py-2 border border-white/5 rounded-lg text-xs"
                  />
                </div>
                {canManageNews() && (
                  <button
                    onClick={() => handleOpenForm("news")}
                    className="flex items-center space-x-1.5 bg-[#D4AF37] text-slate-950 px-4 py-2 rounded-lg text-xs font-bold cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Créer une Actualité</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {db.news
                  .filter(n => n.title.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((item) => (
                    <div key={item.id} className="bg-[#111111] rounded-xl border border-white/5 overflow-hidden flex flex-col justify-between">
                      <div>
                        {item.image && (item.image.startsWith("data:application/pdf") || item.image.endsWith(".pdf") || item.image.includes("pdf")) ? (
                          <div className="h-40 w-full bg-[#151515] flex flex-col items-center justify-center border-b border-white/5 relative group p-4">
                            <div className="p-3 bg-red-500/10 rounded-full text-red-500 border border-red-500/20 group-hover:scale-110 transition-transform mb-2">
                              <FileText className="h-8 w-8" />
                            </div>
                            <span className="text-[11px] text-slate-400 font-mono">Document PDF joint</span>
                            <a 
                              href={item.image} 
                              download={`${item.title}.pdf`}
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[11px] font-bold text-white uppercase tracking-wider"
                            >
                              <span className="bg-[#D4AF37] text-black px-3 py-1.5 rounded font-bold">Ouvrir le PDF</span>
                            </a>
                          </div>
                        ) : (
                          <img src={item.image || "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=500&q=80"} alt={item.title} className="h-40 w-full object-cover" referrerPolicy="no-referrer" />
                        )}
                        <div className="p-5">
                          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-3">
                            <span className="bg-[#D4AF37]/10 text-[#D4AF37] px-2 py-0.5 rounded font-mono font-bold uppercase">{item.category}</span>
                            <span>{new Date(item.date).toLocaleDateString("fr-FR")}</span>
                          </div>
                          <h4 className="font-display font-bold text-white text-base leading-snug mb-2 line-clamp-2">{item.title}</h4>
                          <p className="text-slate-400 text-xs leading-relaxed line-clamp-3">{item.content}</p>
                        </div>
                      </div>

                      <div className="p-5 bg-[#151515] border-t border-white/5 flex justify-between items-center">
                        <span className="text-[11px] text-slate-500 font-mono">Par {item.author}</span>
                        <div className="flex space-x-1.5">
                          <button
                            onClick={() => onTriggerPrint({ type: "actualite", data: item })}
                            className="p-1.5 bg-[#111111] hover:bg-[#D4AF37]/10 text-slate-400 hover:text-[#D4AF37] border border-white/5 rounded transition-colors cursor-pointer"
                            title="Aperçu avant impression (Fiche Actualité)"
                          >
                            <Printer className="h-3 w-3" />
                          </button>
                          {canManageNews() && (
                            <>
                              <button onClick={() => handleOpenForm("news", item)} className="p-1.5 bg-[#111111] hover:bg-[#D4AF37]/10 text-slate-400 hover:text-[#D4AF37] border border-white/5 rounded cursor-pointer">
                                <Edit className="h-3 w-3" />
                              </button>
                              <button onClick={() => handleDeleteItem("news", item.id, item.title)} className="p-1.5 bg-[#111111] hover:bg-red-950/40 text-slate-500 hover:text-red-400 border border-white/5 rounded cursor-pointer">
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* PANEL: PROJETS */}
          {activePanel === "projets" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="relative max-w-xs w-full">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Rechercher des projets..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#111111] text-slate-100 pl-10 pr-4 py-2 border border-white/5 rounded-lg text-xs"
                  />
                </div>
                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleExportProjectsCSV}
                    className="flex items-center space-x-1.5 bg-[#151515] hover:bg-[#D4AF37]/10 text-slate-300 hover:text-[#D4AF37] border border-white/10 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm"
                    title="Exporter la liste des projets de recherche au format CSV"
                  >
                    <Download className="h-4 w-4" />
                    <span>Télécharger CSV</span>
                  </button>
                  {canManageAcademic() && (
                    <button
                      onClick={() => handleOpenForm("project")}
                      className="flex items-center space-x-1.5 bg-[#D4AF37] text-slate-950 px-4 py-2 rounded-lg text-xs font-bold cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Lancer un Projet</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {db.projects
                  .filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((proj) => (
                    <div key={proj.id} className="bg-[#111111] rounded-xl border border-white/5 p-6 flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase ${
                            proj.status === "En cours" ? "bg-emerald-500/10 text-emerald-400" : "bg-white/5 text-slate-450"
                          }`}>
                            {proj.status}
                          </span>
                          <span className="text-xs font-mono font-bold text-[#D4AF37]">{(proj.budget || 0).toLocaleString()} USD</span>
                        </div>
                        <h4 className="font-display font-bold text-white text-base leading-snug mb-2">{proj.title}</h4>
                        <p className="text-slate-400 text-xs leading-relaxed line-clamp-3">{proj.description}</p>
                      </div>

                      <div className="pt-4 border-t border-white/5 flex justify-between items-center text-[11px] text-slate-500">
                        <div>
                          <p>Bailleur : <strong className="text-slate-300">{proj.funding}</strong></p>
                          <p className="mt-1">Leader : <strong className="text-slate-300">{proj.leader}</strong></p>
                        </div>
                        <div className="flex space-x-1.5 shrink-0">
                          <button
                            onClick={() => onTriggerPrint({ type: "projet", data: proj })}
                            className="p-1.5 bg-[#151515] hover:bg-[#D4AF37]/10 text-slate-400 hover:text-[#D4AF37] border border-white/5 rounded transition-colors cursor-pointer"
                            title="Aperçu avant impression (Fiche Projet)"
                          >
                            <Printer className="h-3 w-3" />
                          </button>
                          {canManageAcademic() && (
                            <>
                              <button onClick={() => handleOpenForm("project", proj)} className="p-1.5 bg-[#151515] hover:bg-[#D4AF37]/10 text-slate-400 hover:text-[#D4AF37] border border-white/5 rounded cursor-pointer">
                                <Edit className="h-3 w-3" />
                              </button>
                              <button onClick={() => handleDeleteItem("project", proj.id, proj.title)} className="p-1.5 bg-[#151515] hover:bg-red-950/40 text-slate-500 hover:text-red-400 border border-white/5 rounded cursor-pointer">
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* PANEL: ACTIVITES */}
          {activePanel === "activites" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center gap-4">
                <div className="relative max-w-xs w-full">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Filtrer par lieu, titre..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#111111] text-slate-100 pl-10 pr-4 py-2 border border-white/5 rounded-lg text-xs"
                  />
                </div>
                {canManageAcademic() && (
                  <button
                    onClick={() => handleOpenForm("activity")}
                    className="flex items-center space-x-1.5 bg-[#D4AF37] text-slate-950 px-4 py-2 rounded-lg text-xs font-bold cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Créer une Activité</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {db.activities
                  .filter(a => a.title.toLowerCase().includes(searchQuery.toLowerCase()) || a.location.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((act) => (
                    <div key={act.id} className="bg-[#111111] rounded-xl border border-white/5 p-5 flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-3 text-[11px]">
                          <span className="text-[#D4AF37] font-bold uppercase tracking-wider flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {act.location}
                          </span>
                          <span className={`px-2 py-0.5 rounded font-mono font-bold uppercase ${
                            act.status === "Réalisé" ? "bg-emerald-500/10 text-emerald-400" : act.status === "En cours" ? "bg-blue-500/10 text-blue-400" : "bg-amber-500/10 text-amber-400"
                          }`}>
                            {act.status}
                          </span>
                        </div>
                        <h4 className="font-display font-bold text-white text-base mb-2 leading-snug">{act.title}</h4>
                        <p className="text-slate-400 text-xs leading-relaxed line-clamp-3">{act.description}</p>
                      </div>

                      <div className="pt-4 border-t border-white/5 space-y-3 text-[11px]">
                        <div className="flex justify-between text-slate-500">
                          <span>Budget alloué :</span>
                          <span className="font-mono text-slate-300 font-bold">{(act.budget || 0).toLocaleString()} USD</span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>Prévu le :</span>
                          <span className="font-mono text-slate-300">{new Date(act.date).toLocaleDateString("fr-FR")}</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {act.researchers.map((res, idx) => (
                            <span key={idx} className="bg-[#151515] border border-white/5 text-slate-300 px-2 py-0.5 rounded text-[10px]">{res}</span>
                          ))}
                        </div>
                        
                        <div className="pt-2 border-t border-white/5 flex justify-end space-x-1.5">
                          <button
                            onClick={() => onTriggerPrint({ type: "activite", data: act })}
                            className="p-1.5 bg-[#151515] hover:bg-[#D4AF37]/10 text-slate-400 hover:text-[#D4AF37] border border-white/5 rounded transition-colors cursor-pointer"
                            title="Aperçu avant impression (Fiche Activité)"
                          >
                            <Printer className="h-3 w-3" />
                          </button>
                          {canManageAcademic() && (
                            <>
                              <button onClick={() => handleOpenForm("activity", act)} className="p-1.5 bg-[#151515] hover:bg-[#D4AF37]/10 text-slate-400 hover:text-[#D4AF37] border border-white/5 rounded cursor-pointer">
                                <Edit className="h-3 w-3" />
                              </button>
                              <button onClick={() => handleDeleteItem("activity", act.id, act.title)} className="p-1.5 bg-[#151515] hover:bg-red-950/40 text-slate-500 hover:text-red-400 border border-white/5 rounded cursor-pointer">
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* PANEL: CALENDRIER */}
          {activePanel === "calendrier" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="font-display font-extrabold text-lg md:text-xl text-white tracking-tight uppercase flex items-center gap-2.5">
                    <Calendar className="h-6 w-6 text-[#D4AF37]" />
                    <span>Calendrier des Activités UR-GEDT</span>
                  </h2>
                  <p className="text-slate-400 text-xs mt-1">Planification interactive des missions de recherche, réunions de coordination et séminaires scientifiques.</p>
                </div>
                {canManageAcademic() && (
                  <button
                    onClick={() => handleOpenForm("activity")}
                    className="flex items-center space-x-1.5 bg-[#D4AF37] text-slate-950 px-4 py-2 rounded-lg text-xs font-bold cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Planifier une Activité</span>
                  </button>
                )}
              </div>
              <CalendarPanel
                activities={db.activities}
                onOpenForm={handleOpenForm}
                onDeleteItem={handleDeleteItem}
                canManageActivities={canManageAcademic()}
              />
            </div>
          )}

          {/* PANEL: PUBLICATIONS */}
          {activePanel === "publications" && (
            <div className="bg-[#111111] p-6 rounded-xl border border-white/5 shadow-md">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div className="relative max-w-xs w-full">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Filtrer les articles..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#151515] text-slate-100 pl-10 pr-4 py-2 border border-white/5 rounded-lg text-xs"
                  />
                </div>
                {canManageAcademic() && (
                  <button
                    onClick={() => handleOpenForm("publication")}
                    className="flex items-center space-x-1.5 bg-[#D4AF37] text-slate-950 px-4 py-2 rounded-lg text-xs font-bold cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Ajouter une Publication</span>
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead>
                    <tr className="border-b border-white/5 text-slate-500 uppercase text-[10px] tracking-wider">
                      <th className="py-2.5">Type / Titre</th>
                      <th className="py-2.5">Auteurs</th>
                      <th className="py-2.5">Revue / Support</th>
                      <th className="py-2.5 text-center">Année</th>
                      <th className="py-2.5 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {db.publications
                      .filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.authors.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((pub) => (
                        <tr key={pub.id} className="hover:bg-white/5">
                          <td className="py-3">
                            <span className="inline-block bg-[#D4AF37]/10 text-[#D4AF37] text-[10px] uppercase font-bold font-mono px-2 py-0.5 rounded border border-[#D4AF37]/10 mb-1">{pub.type}</span>
                            <h5 className="font-display font-bold text-white leading-snug max-w-[300px]" title={pub.title}>{pub.title}</h5>
                          </td>
                          <td className="py-3 text-slate-300 font-medium">{pub.authors}</td>
                          <td className="py-3 text-slate-400 italic">{pub.journal}</td>
                          <td className="py-3 text-center font-mono text-slate-300">{pub.year}</td>
                          <td className="py-3">
                            <div className="flex items-center justify-center space-x-1.5">
                              <button
                                onClick={() => onTriggerPrint({ type: "publication", data: pub })}
                                className="p-1.5 bg-[#151515] hover:bg-[#D4AF37]/10 text-slate-400 hover:text-[#D4AF37] border border-white/5 rounded transition-colors cursor-pointer"
                                title="Aperçu avant impression (Fiche Publication)"
                              >
                                <Printer className="h-3 w-3" />
                              </button>
                              {canManageAcademic() && (
                                <>
                                  <button onClick={() => handleOpenForm("publication", pub)} className="p-1.5 bg-[#151515] hover:bg-[#D4AF37]/10 text-slate-400 hover:text-[#D4AF37] border border-white/5 rounded cursor-pointer">
                                    <Edit className="h-3 w-3" />
                                  </button>
                                  <button onClick={() => handleDeleteItem("publication", pub.id, pub.title)} className="p-1.5 bg-[#151515] hover:bg-red-950/40 text-slate-500 hover:text-red-400 border border-white/5 rounded cursor-pointer">
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PANEL: GALERIE & PARTENAIRES (COMBINED UNDER MEDIA) */}
          {activePanel === "galerie" && (
            <div className="space-y-8">
              {/* GALERIE PHOTOS SECTION */}
              <div className="bg-[#111111] p-6 rounded-xl border border-white/5 shadow-md">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-display text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Image className="h-5 w-5 text-[#D4AF37]" />
                    <span>Médiathèque Publique (Galerie Photos/Vidéos)</span>
                  </h3>
                  <button
                    onClick={() => handleOpenForm("gallery")}
                    className="flex items-center space-x-1.5 bg-[#D4AF37] text-slate-950 px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer animate-pulse"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Ajouter Média</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {db.gallery.map((g) => (
                    <div key={g.id} className="bg-[#151515] rounded-lg overflow-hidden border border-white/5 flex flex-col justify-between">
                      <img src={g.url} alt={g.title} className="h-32 w-full object-cover" referrerPolicy="no-referrer" />
                      <div className="p-3">
                        <span className="text-[9px] bg-white/10 text-slate-400 px-1 rounded uppercase font-mono font-bold">{g.type}</span>
                        <h5 className="font-display font-bold text-white text-xs leading-snug mt-1.5 line-clamp-1">{g.title}</h5>
                      </div>
                      <div className="p-2 bg-[#111111] border-t border-white/5 flex justify-end space-x-1.5">
                        <button onClick={() => handleOpenForm("gallery", g)} className="p-1 bg-[#151515] hover:bg-[#D4AF37]/10 text-slate-400 hover:text-[#D4AF37] rounded border border-white/5 cursor-pointer">
                          <Edit className="h-2.5 w-2.5" />
                        </button>
                        <button onClick={() => handleDeleteItem("gallery", g.id, g.title)} className="p-1 bg-[#151515] hover:bg-red-950/45 text-slate-500 hover:text-red-400 rounded border border-white/5 cursor-pointer">
                          <Trash2 className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* PARTENAIRES SECTION */}
              <div className="bg-[#111111] p-6 rounded-xl border border-white/5 shadow-md">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-display text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Users className="h-5 w-5 text-[#D4AF37]" />
                    <span>Partenaires Officiels & Bailleurs de l'UR-GEDT</span>
                  </h3>
                  <button
                    onClick={() => handleOpenForm("partner")}
                    className="flex items-center space-x-1.5 bg-[#D4AF37] text-slate-950 px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Ajouter Partenaire</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {db.partners.map((p) => (
                    <div key={p.id} className="bg-[#151515] p-4 rounded-lg border border-white/5 flex items-center justify-between">
                      <div className="flex items-center space-x-3 min-w-0">
                        <img src={p.logo} alt={p.name} className="h-10 w-10 rounded object-cover border border-white/5" referrerPolicy="no-referrer" />
                        <div className="min-w-0">
                          <h5 className="font-display font-bold text-white text-xs truncate">{p.name}</h5>
                          <span className="text-[10px] uppercase font-bold text-[#D4AF37] font-mono">{p.type}</span>
                        </div>
                      </div>
                      <div className="flex space-x-1 shrink-0 ml-3">
                        <button onClick={() => handleOpenForm("partner", p)} className="p-1 bg-[#111111] hover:bg-[#D4AF37]/10 text-slate-400 hover:text-[#D4AF37] rounded cursor-pointer">
                          <Edit className="h-3 w-3" />
                        </button>
                        <button onClick={() => handleDeleteItem("partner", p.id, p.name)} className="p-1 bg-[#111111] hover:bg-red-950/45 text-slate-500 hover:text-red-400 rounded cursor-pointer">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* PANEL: CONTACT MESSAGES */}
          {activePanel === "messages" && (
            <div className="bg-[#111111] p-6 rounded-xl border border-white/5 shadow-md">
              <h3 className="font-display text-sm font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-2">
                <Mail className="h-5 w-5 text-[#D4AF37]" />
                <span>Boîte de réception des messages publics</span>
              </h3>

              <div className="space-y-4">
                {db.contactMessages.map((msg) => (
                  <div key={msg.id} className={`p-5 rounded-xl border ${
                    msg.readStatus ? "bg-[#151515]/50 border-white/5" : "bg-[#151515] border-[#D4AF37]/30 shadow-md"
                  } flex flex-col sm:flex-row justify-between gap-4`}>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3 flex-wrap gap-y-1">
                        <h4 className="font-display font-bold text-sm text-white">{msg.senderName}</h4>
                        <a 
                          href={`mailto:${msg.senderEmail}?subject=${encodeURIComponent(`RE: ${msg.subject}`)}`}
                          className="text-xs text-[#D4AF37] hover:underline font-mono flex items-center gap-1"
                          title="Envoyer un courriel de réponse"
                        >
                          <Mail className="h-3 w-3 inline shrink-0" />
                          <span>({msg.senderEmail})</span>
                        </a>
                        {!msg.readStatus && (
                          <span className="bg-[#D4AF37] text-slate-950 text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded animate-bounce">Nouveau</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-200 font-bold uppercase tracking-wider">Sujet : {msg.subject}</p>
                      <p className="text-slate-400 text-xs leading-relaxed whitespace-pre-line">{msg.message}</p>
                      <p className="text-[11px] text-slate-500 font-mono mt-2">Reçu le : {new Date(msg.date).toLocaleString("fr-FR")}</p>
                    </div>

                    <div className="flex sm:flex-col items-end justify-center space-y-2 shrink-0 gap-2 sm:gap-0">
                      <a
                        href={`mailto:${msg.senderEmail}?subject=${encodeURIComponent(`RE: ${msg.subject}`)}`}
                        className="flex items-center space-x-1.5 bg-[#D4AF37]/10 hover:bg-[#D4AF37] text-[#D4AF37] hover:text-black border border-[#D4AF37]/30 px-3 py-1.5 rounded text-[11px] font-bold uppercase transition-all cursor-pointer shadow-sm"
                        title="Ouvrir votre logiciel de messagerie pour répondre"
                      >
                        <Mail className="h-3 w-3" />
                        <span>Répondre</span>
                      </a>
                      <button
                        onClick={() => onTriggerPrint({ type: "message", data: msg })}
                        className="flex items-center space-x-1.5 bg-[#111111] hover:bg-[#D4AF37]/10 text-slate-300 hover:text-[#D4AF37] border border-white/5 hover:border-[#D4AF37]/30 px-3 py-1.5 rounded text-[11px] font-bold uppercase transition-colors cursor-pointer"
                        title="Aperçu avant impression (Fiche Message)"
                      >
                        <Printer className="h-3 w-3" />
                        <span>Imprimer</span>
                      </button>
                      <button
                        onClick={() => handleToggleMessageRead(msg)}
                        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-[11px] font-bold uppercase transition-colors border cursor-pointer ${
                          msg.readStatus 
                            ? "bg-[#111111] text-slate-400 border-white/5 hover:bg-[#151515]" 
                            : "bg-[#D4AF37] text-slate-950 border-[#D4AF37] hover:bg-[#D4AF37]/80"
                        }`}
                      >
                        {msg.readStatus ? <RefreshCw className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                        <span>{msg.readStatus ? "Marquer Non Lu" : "Valider / Lu"}</span>
                      </button>
                      <button
                        onClick={() => handleDeleteItem("message", msg.id, msg.senderName)}
                        className="flex items-center space-x-1.5 bg-[#111111] hover:bg-red-950/40 text-slate-500 hover:text-red-400 border border-white/5 hover:border-red-900 px-3 py-1.5 rounded text-[11px] font-bold uppercase transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>Supprimer</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PANEL: GESTION UTILISATEURS */}
          {activePanel === "utilisateurs" && (
            <PersonnelManager
              users={db.users}
              currentUserRole={userRole}
              currentUserPermissions={currentUser.permissions || []}
              currentUserId={currentUser.id}
              currentUserEmail={currentUser.email}
              onAddUser={async (userData) => {
                const newUser = {
                  ...userData,
                  id: `u-${Date.now()}`,
                  active: userData.active ?? true
                };
                const updatedList = [newUser, ...db.users];
                await onUpdateTable(
                  "users",
                  updatedList,
                  "Création Personnel",
                  `Création du membre du personnel ${userData.name} (${userData.role}).`
                );
              }}
              onUpdateUser={async (userId, updatedData) => {
                const updatedList = db.users.map((u) =>
                  u.id === userId ? { ...u, ...updatedData } : u
                );
                await onUpdateTable(
                  "users",
                  updatedList,
                  "Modification Personnel",
                  `Mise à jour des informations pour ${updatedData.name || userId}.`
                );
              }}
              onDeleteUser={async (userId) => {
                const targetUser = db.users.find((u) => u.id === userId);
                const updatedList = db.users.filter((u) => u.id !== userId);
                await onUpdateTable(
                  "users",
                  updatedList,
                  "Suppression Personnel",
                  `Suppression du membre du personnel ${targetUser?.name || userId}.`
                );
              }}
              onResetPassword={async (userId, newPassword) => {
                const targetUser = db.users.find((u) => u.id === userId);
                const updatedList = db.users.map((u) =>
                  u.id === userId ? { ...u, password: newPassword } : u
                );
                await onUpdateTable(
                  "users",
                  updatedList,
                  "Réinitialisation Mot de Passe",
                  `Réinitialisation du mot de passe pour ${targetUser?.name || userId}.`
                );
              }}
              onToggleStatus={async (user) => {
                const newActiveState = !user.active;
                const updatedList = db.users.map((u) =>
                  u.id === user.id ? { ...u, active: newActiveState } : u
                );
                const actionVerb = newActiveState ? "Réactivation Accès" : "Révocation Accès";
                await onUpdateTable(
                  "users",
                  updatedList,
                  actionVerb,
                  `${actionVerb} institutionnel pour ${user.name} (${user.role}).`
                );
              }}
              onExportCSV={handleExportUsersCSV}
              addToast={addToast}
            />
          )}

          {false && (
            <div className="space-y-6">
              {/* Top Banner & KPI Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#111111] border border-white/5 p-4.5 rounded-xl shadow-md flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Total Comptes Institutionnels</p>
                    <p className="text-2xl font-black text-white font-display mt-1">{db.users.length}</p>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">Membres répertoriés</p>
                  </div>
                  <div className="h-10 w-10 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-xl flex items-center justify-center text-[#D4AF37]">
                    <Users className="h-5 w-5" />
                  </div>
                </div>

                <div className="bg-[#111111] border border-white/5 p-4.5 rounded-xl shadow-md flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Accès Autorisés (Actifs)</p>
                    <p className="text-2xl font-black text-emerald-400 font-display mt-1">
                      {db.users.filter((u) => u.active).length}
                    </p>
                    <p className="text-[11px] text-emerald-500/80 font-mono mt-0.5">
                      {Math.round((db.users.filter((u) => u.active).length / (db.users.length || 1)) * 100)}% du personnel
                    </p>
                  </div>
                  <div className="h-10 w-10 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                </div>

                <div className="bg-[#111111] border border-white/5 p-4.5 rounded-xl shadow-md flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Accès Révoqués / Suspendus</p>
                    <p className="text-2xl font-black text-red-400 font-display mt-1">
                      {db.users.filter((u) => !u.active).length}
                    </p>
                    <p className="text-[11px] text-red-500/80 font-mono mt-0.5">Comptes désactivés</p>
                  </div>
                  <div className="h-10 w-10 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center text-red-400">
                    <ShieldOff className="h-5 w-5" />
                  </div>
                </div>

                <div className="bg-[#111111] border border-white/5 p-4.5 rounded-xl shadow-md flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Membres Direction & Admin</p>
                    <p className="text-2xl font-black text-[#D4AF37] font-display mt-1">
                      {db.users.filter((u) => u.role === "Administrateur" || u.role === "Directeur").length}
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">Haut commandement UR-GEDT</p>
                  </div>
                  <div className="h-10 w-10 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-xl flex items-center justify-center text-[#D4AF37]">
                    <Lock className="h-5 w-5" />
                  </div>
                </div>
              </div>

              {/* Control Panel Header: Title, Search, Filters & Action Buttons */}
              <div className="bg-[#111111] p-6 rounded-xl border border-white/5 shadow-md space-y-5">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-white/5">
                  <div>
                    <h3 className="font-display text-base font-bold text-white uppercase tracking-wider flex items-center gap-2.5">
                      <Users className="h-5 w-5 text-[#D4AF37]" />
                      <span>Gestion du Personnel & Comptes d'Accès</span>
                    </h3>
                    <p className="text-xs text-slate-400 font-mono mt-1">
                      Enregistrez les membres du personnel, attribuez leurs rôles académiques et définissez ou modifiez leurs mots de passe d'accès.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                    <button
                      onClick={handleExportUsersCSV}
                      className="px-3 py-2 bg-[#151515] hover:bg-white/5 border border-white/10 hover:border-white/20 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                      title="Exporter le répertoire du personnel au format CSV"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Exporter CSV</span>
                    </button>

                    {canManageUsers() && (
                      <button
                        onClick={() => handleOpenForm("user")}
                        className="px-4 py-2 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-slate-950 font-display rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-md cursor-pointer border-none"
                      >
                        <UserPlus className="h-4 w-4" />
                        <span>Ajouter un Personnel</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Filter and View Mode Controls Bar */}
                <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                  {/* Search Bar */}
                  <div className="relative flex-grow max-w-md">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Rechercher par nom, email ou rôle..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className="w-full bg-[#151515] text-slate-100 pl-9 pr-8 py-2 border border-white/5 rounded-lg text-xs focus:outline-none focus:border-[#D4AF37]"
                    />
                    {userSearchQuery && (
                      <button
                        onClick={() => setUserSearchQuery("")}
                        className="absolute right-2.5 top-2.5 text-slate-500 hover:text-white"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Dropdown Filters & View Mode Buttons */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {/* Role Filter */}
                    <div className="flex items-center gap-1.5 bg-[#151515] px-2.5 py-1 border border-white/5 rounded-lg">
                      <span className="text-[11px] text-slate-500 font-mono uppercase font-bold">Rôle:</span>
                      <select
                        value={userRoleFilter}
                        onChange={(e) => setUserRoleFilter(e.target.value)}
                        className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
                      >
                        <option value="Tous" className="bg-[#151515]">Tous les rôles</option>
                        <option value="Administrateur" className="bg-[#151515]">Administrateur</option>
                        <option value="Directeur" className="bg-[#151515]">Directeur</option>
                        <option value="Comptable" className="bg-[#151515]">Comptable</option>
                        <option value="Secrétaire" className="bg-[#151515]">Secrétaire</option>
                        <option value="Chercheur" className="bg-[#151515]">Chercheur</option>
                      </select>
                    </div>

                    {/* Status Filter */}
                    <div className="flex items-center gap-1.5 bg-[#151515] px-2.5 py-1 border border-white/5 rounded-lg">
                      <span className="text-[11px] text-slate-500 font-mono uppercase font-bold">Accès:</span>
                      <select
                        value={userStatusFilter}
                        onChange={(e) => setUserStatusFilter(e.target.value)}
                        className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
                      >
                        <option value="Tous" className="bg-[#151515]">Tous les statuts</option>
                        <option value="Actifs" className="bg-[#151515]">Actifs uniquement</option>
                        <option value="Révoqués" className="bg-[#151515]">Révoqués uniquement</option>
                      </select>
                    </div>

                    {/* View Switcher */}
                    <div className="flex items-center bg-[#151515] p-1 border border-white/5 rounded-lg">
                      <button
                        onClick={() => setUserViewMode("cards")}
                        className={`p-1.5 rounded transition-colors cursor-pointer ${
                          userViewMode === "cards" ? "bg-[#D4AF37] text-slate-950 font-bold" : "text-slate-400 hover:text-white"
                        }`}
                        title="Affichage en Fiches (Cartes)"
                      >
                        <Grid className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setUserViewMode("table")}
                        className={`p-1.5 rounded transition-colors cursor-pointer ${
                          userViewMode === "table" ? "bg-[#D4AF37] text-slate-950 font-bold" : "text-slate-400 hover:text-white"
                        }`}
                        title="Affichage en Tableau (Liste)"
                      >
                        <List className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Displaying Users - Cards View or Table View */}
                {filteredUsersList.length === 0 ? (
                  <div className="p-12 text-center border border-white/5 rounded-xl bg-black/20 space-y-3">
                    <Users className="h-10 w-10 text-slate-600 mx-auto" />
                    <p className="text-xs font-bold text-slate-300">Aucun utilisateur trouvé</p>
                    <p className="text-xs text-slate-500 font-mono">
                      Ajustez vos filtres de recherche ou créez un nouveau compte d'agent.
                    </p>
                  </div>
                ) : userViewMode === "cards" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredUsersList.map((u) => {
                      const getRoleColor = (role: string) => {
                        switch (role) {
                          case "Administrateur":
                            return "bg-amber-500/15 border-amber-500/30 text-amber-300";
                          case "Directeur":
                            return "bg-[#D4AF37]/15 border-[#D4AF37]/30 text-[#D4AF37]";
                          case "Comptable":
                            return "bg-emerald-500/15 border-emerald-500/30 text-emerald-300";
                          case "Secrétaire":
                            return "bg-purple-500/15 border-purple-500/30 text-purple-300";
                          default:
                            return "bg-blue-500/15 border-blue-500/30 text-blue-300";
                        }
                      };

                      return (
                        <div
                          key={u.id}
                          className={`bg-[#151515] p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between space-y-4 shadow-lg relative overflow-hidden group ${
                            u.active
                              ? "border-white/5 hover:border-[#D4AF37]/40"
                              : "border-red-500/20 bg-red-950/10 hover:border-red-500/40 opacity-80"
                          }`}
                        >
                          <div className="flex items-start space-x-3.5">
                            {/* Avatar */}
                            <div className="relative shrink-0">
                              <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-[#111111] to-[#222222] border border-white/10 flex items-center justify-center text-white text-xl font-black font-display overflow-hidden shadow-inner">
                                {u.avatarUrl ? (
                                  <img
                                    src={u.avatarUrl}
                                    alt={u.name}
                                    className="h-full w-full object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  u.name.split(" ").slice(-1)[0]?.[0] || "U"
                                )}
                              </div>
                              <span
                                className={`absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-[#151515] ${
                                  u.active ? "bg-emerald-400 shadow-emerald-400/50 shadow-sm" : "bg-red-500"
                                }`}
                                title={u.active ? "Accès Actif" : "Accès Révoqué"}
                              ></span>
                            </div>

                            {/* Info */}
                            <div className="space-y-1 min-w-0 flex-grow">
                              <div className="flex items-center justify-between gap-1">
                                <span className={`text-[10px] uppercase font-bold font-mono px-2 py-0.5 rounded border ${getRoleColor(u.role)}`}>
                                  {u.role}
                                </span>
                                <span className={`text-[10px] font-mono font-bold flex items-center gap-1 ${u.active ? "text-emerald-400" : "text-red-400"}`}>
                                  {u.active ? (
                                    <>
                                      <CheckCircle2 className="h-2.5 w-2.5" />
                                      <span>Actif</span>
                                    </>
                                  ) : (
                                    <>
                                      <ShieldOff className="h-2.5 w-2.5" />
                                      <span>Révoqué</span>
                                    </>
                                  )}
                                </span>
                              </div>

                              <h4 className="font-display font-bold text-white text-sm leading-tight truncate mt-1">
                                {u.name}
                              </h4>
                              {u.function && (
                                <p className="text-xs text-[#D4AF37] font-semibold truncate">{u.function}</p>
                              )}
                              {u.department && (
                                <p className="text-[11px] text-slate-400 font-mono truncate">{u.department}</p>
                              )}
                              <p className="text-xs text-slate-400 font-mono truncate" title={u.email}>
                                {u.email}
                              </p>
                              {u.phone && (
                                <p className="text-[11px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                                  <Phone className="h-2.5 w-2.5 text-[#D4AF37]" />
                                  <span>{u.phone}</span>
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Quick Revocation Status Info */}
                          <div className={`p-2.5 rounded-lg border text-[11px] flex items-center justify-between font-mono ${
                            u.active 
                              ? "bg-black/30 border-white/5 text-slate-400"
                              : "bg-red-950/20 border-red-900/30 text-red-300"
                          }`}>
                            <span className="truncate">
                              {u.active ? "Autorisé sur le portail UR-GEDT" : "Accès désactivé par l'Admin"}
                            </span>
                          </div>

                          {/* Action Toolbar */}
                          <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => onTriggerPrint({ type: "user", data: u })}
                                className="p-1.5 bg-[#111111] hover:bg-[#D4AF37]/10 text-slate-400 hover:text-[#D4AF37] border border-white/5 rounded-lg cursor-pointer transition-colors"
                                title="Imprimer la Fiche Membre"
                              >
                                <Printer className="h-3.5 w-3.5" />
                              </button>
                              {canManageUsers() && (
                                <>
                                  <button
                                    onClick={() => handleOpenForm("user", u)}
                                    className="p-1.5 bg-[#111111] hover:bg-[#D4AF37]/10 text-slate-400 hover:text-[#D4AF37] border border-white/5 rounded-lg cursor-pointer transition-colors"
                                    title="Modifier la fiche du personnel"
                                  >
                                    <Edit className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleOpenPasswordModal(u)}
                                    className="px-2.5 py-1.5 bg-[#111111] hover:bg-amber-500/15 text-amber-400 hover:text-amber-300 border border-amber-500/25 rounded-lg cursor-pointer transition-colors flex items-center gap-1.5 shadow-sm"
                                    title="Modifier le mot de passe"
                                  >
                                    <Key className="h-3.5 w-3.5 text-amber-400" />
                                    <span className="text-[11px] font-bold">Mot de passe</span>
                                  </button>
                                </>
                              )}
                            </div>

                            {canManageUsers() && (
                              <div className="flex items-center space-x-1.5">
                                {/* Toggle Revoke / Reactivate Access */}
                                <button
                                  onClick={() => handleToggleUserAccess(u)}
                                  className={`px-2.5 py-1.2 rounded-lg text-[11px] font-bold font-mono transition-all flex items-center space-x-1 cursor-pointer border ${
                                    u.active
                                      ? "bg-red-950/30 hover:bg-red-900/50 text-red-300 border-red-900/40 hover:border-red-500/60"
                                      : "bg-emerald-950/30 hover:bg-emerald-900/50 text-emerald-300 border-emerald-900/40 hover:border-emerald-500/60"
                                  }`}
                                  title={u.active ? "Révoquer l'accès" : "Réactiver l'accès"}
                                >
                                  {u.active ? (
                                    <>
                                      <ShieldOff className="h-3 w-3" />
                                      <span>Révoquer</span>
                                    </>
                                  ) : (
                                    <>
                                      <ShieldCheck className="h-3 w-3" />
                                      <span>Réactiver</span>
                                    </>
                                  )}
                                </button>

                                <button
                                  onClick={() => handleDeleteItem("user", u.id, u.name)}
                                  className="p-1.5 bg-[#111111] hover:bg-red-950/40 text-slate-500 hover:text-red-400 border border-white/5 hover:border-red-900/40 rounded-lg cursor-pointer transition-colors"
                                  title="Supprimer définitivement"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* Table View */
                  <div className="border border-white/5 rounded-xl overflow-hidden bg-black/20">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                          <tr className="bg-black/40 border-b border-white/5 text-[11px] uppercase font-mono text-slate-400 font-bold">
                            <th className="py-3 px-4">Agent / Nom Complet</th>
                            <th className="py-3 px-4">Coordonnées & Contact</th>
                            <th className="py-3 px-4">Département & Fonction</th>
                            <th className="py-3 px-4">Rôle</th>
                            <th className="py-3 px-4">Statut d'Accès</th>
                            <th className="py-3 px-4 text-right">Actions Administratives</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-xs">
                          {filteredUsersList.map((u) => (
                            <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                              <td className="py-3 px-4">
                                <div className="flex items-center space-x-3">
                                  <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-[#111111] to-[#222222] border border-white/10 flex items-center justify-center text-white text-xs font-black overflow-hidden shrink-0">
                                    {u.avatarUrl ? (
                                      <img src={u.avatarUrl} alt={u.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                                    ) : (
                                      u.name.split(" ").slice(-1)[0]?.[0] || "U"
                                    )}
                                  </div>
                                  <span className="font-bold text-white font-display">{u.name}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 font-mono space-y-0.5">
                                <a 
                                  href={`mailto:${u.email}`} 
                                  className="text-slate-300 hover:text-[#D4AF37] hover:underline flex items-center space-x-1.5 transition-colors"
                                  title={`Envoyer un e-mail à ${u.name}`}
                                >
                                  <Mail className="h-3 w-3 text-[#D4AF37] shrink-0" />
                                  <span>{u.email}</span>
                                </a>
                                {u.phone && (
                                  <div className="text-[11px] text-slate-400 flex items-center gap-1">
                                    <Phone className="h-2.5 w-2.5 text-[#D4AF37] shrink-0" />
                                    <span>{u.phone}</span>
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                <div className="space-y-0.5">
                                  {u.function && <p className="text-xs text-slate-200 font-semibold">{u.function}</p>}
                                  {u.department && <p className="text-[11px] text-slate-400 font-mono">{u.department}</p>}
                                  {!u.function && !u.department && <span className="text-slate-500 italic text-[11px]">Non spécifié</span>}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <span className="text-[11px] font-mono font-bold uppercase bg-white/5 border border-white/10 text-slate-200 px-2 py-0.5 rounded">
                                  {u.role}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-bold font-mono ${
                                  u.active ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border border-red-500/20 text-red-400"
                                }`}>
                                  <span className={`h-1.5 w-1.5 rounded-full ${u.active ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`}></span>
                                  {u.active ? "Accès Autorisé" : "Accès Révoqué"}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end space-x-2">
                                  <button
                                    onClick={() => onTriggerPrint({ type: "user", data: u })}
                                    className="p-1.5 bg-[#111111] hover:bg-[#D4AF37]/10 text-slate-400 hover:text-[#D4AF37] border border-white/5 rounded cursor-pointer"
                                    title="Imprimer Fiche"
                                  >
                                    <Printer className="h-3.5 w-3.5" />
                                  </button>
                                  {canManageUsers() && (
                                    <>
                                      <button
                                        onClick={() => handleOpenForm("user", u)}
                                        className="p-1.5 bg-[#111111] hover:bg-[#D4AF37]/10 text-slate-400 hover:text-[#D4AF37] border border-white/5 rounded cursor-pointer"
                                        title="Modifier les infos"
                                      >
                                        <Edit className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleOpenPasswordModal(u)}
                                        className="px-2 py-1 bg-[#111111] hover:bg-amber-500/15 text-amber-400 hover:text-amber-300 border border-amber-500/25 rounded cursor-pointer transition-colors flex items-center gap-1 font-mono text-[11px] font-bold"
                                        title="Modifier le mot de passe"
                                      >
                                        <Key className="h-3 w-3 text-amber-400" />
                                        <span>Mot de passe</span>
                                      </button>
                                      <button
                                        onClick={() => handleToggleUserAccess(u)}
                                        className={`px-2 py-1 rounded text-[11px] font-bold font-mono transition-all flex items-center space-x-1 cursor-pointer border ${
                                          u.active
                                            ? "bg-red-950/30 text-red-300 border-red-900/40 hover:bg-red-900/50"
                                            : "bg-emerald-950/30 text-emerald-300 border-emerald-900/40 hover:bg-emerald-900/50"
                                        }`}
                                        title={u.active ? "Révoquer l'accès" : "Réactiver l'accès"}
                                      >
                                        {u.active ? <ShieldOff className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
                                        <span>{u.active ? "Révoquer" : "Réactiver"}</span>
                                      </button>
                                      <button
                                        onClick={() => handleDeleteItem("user", u.id, u.name)}
                                        className="p-1.5 bg-[#111111] hover:bg-red-950/40 text-slate-500 hover:text-red-400 border border-white/5 rounded cursor-pointer"
                                        title="Supprimer"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PANEL: HISTORIQUE DES ACTIONS / LOGS D'AUDIT */}
          {activePanel === "logs" && (() => {
            const allLogs = db.logs || [];
            const budgetLogs = allLogs.filter(l => getLogCategory(l) === "budget");
            const personnelLogs = allLogs.filter(l => getLogCategory(l) === "personnel");
            const projetsLogs = allLogs.filter(l => getLogCategory(l) === "projets");

            let displayLogs = [...allLogs];

            if (logCategoryFilter !== "all") {
              displayLogs = displayLogs.filter(l => getLogCategory(l) === logCategoryFilter);
            }

            if (logActionFilter !== "all") {
              displayLogs = displayLogs.filter(l => (l.action || "").toLowerCase().includes(logActionFilter.toLowerCase()));
            }

            if (searchQuery.trim().length > 0) {
              const q = searchQuery.toLowerCase();
              displayLogs = displayLogs.filter(l =>
                (l.userName || "").toLowerCase().includes(q) ||
                (l.userRole || "").toLowerCase().includes(q) ||
                (l.action || "").toLowerCase().includes(q) ||
                (l.details || "").toLowerCase().includes(q) ||
                (l.id || "").toLowerCase().includes(q)
              );
            }

            return (
              <div className="space-y-6">
                {/* Header Banner */}
                <div className="bg-[#111111] p-6 rounded-xl border border-white/5 shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-96 h-96 bg-[#D4AF37]/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="p-2 bg-[#D4AF37]/10 text-[#D4AF37] rounded-lg border border-[#D4AF37]/20">
                          <Clock className="h-5 w-5" />
                        </span>
                        <h2 className="font-display text-lg font-bold text-white uppercase tracking-wider">
                          Historique des Actions & Journal d'Audit
                        </h2>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 max-w-2xl font-mono">
                        Registre de traçabilité des modifications budgétaires, enregistrements financiers, gestion des comptes du personnel et opérations système de l'UR-GEDT.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleExportAuditLogsCSV(displayLogs)}
                        className="px-4 py-2.5 bg-[#151515] hover:bg-[#1E1E1E] text-[#D4AF37] border border-[#D4AF37]/30 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm hover:shadow-[#D4AF37]/10"
                      >
                        <Download className="h-4 w-4" />
                        <span>Exporter en CSV ({displayLogs.length})</span>
                      </button>
                    </div>
                  </div>

                  {/* Summary KPI Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/5">
                    <div 
                      onClick={() => { setLogCategoryFilter("all"); setLogActionFilter("all"); }}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                        logCategoryFilter === "all" 
                          ? "bg-[#1A1A1A] border-[#D4AF37] shadow-md shadow-[#D4AF37]/5" 
                          : "bg-[#151515] border-white/5 hover:border-white/10"
                      }`}
                    >
                      <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-1">
                        <span>Total Actions Logguées</span>
                        <Activity className="h-3.5 w-3.5 text-[#D4AF37]" />
                      </div>
                      <div className="text-xl font-bold text-white font-mono">{allLogs.length}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5 font-sans">Enregistrements d'audit</div>
                    </div>

                    <div 
                      onClick={() => { setLogCategoryFilter("budget"); setLogActionFilter("all"); }}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                        logCategoryFilter === "budget" 
                          ? "bg-[#1A1A1A] border-amber-500 shadow-md shadow-amber-500/5" 
                          : "bg-[#151515] border-white/5 hover:border-white/10"
                      }`}
                    >
                      <div className="flex items-center justify-between text-amber-400 text-[11px] font-bold uppercase tracking-wider mb-1">
                        <span>Budgets & Finances</span>
                        <DollarSign className="h-3.5 w-3.5 text-amber-400" />
                      </div>
                      <div className="text-xl font-bold text-amber-400 font-mono">{budgetLogs.length}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5 font-sans">Recettes, Dépenses & Reset</div>
                    </div>

                    <div 
                      onClick={() => { setLogCategoryFilter("personnel"); setLogActionFilter("all"); }}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                        logCategoryFilter === "personnel" 
                          ? "bg-[#1A1A1A] border-indigo-500 shadow-md shadow-indigo-500/5" 
                          : "bg-[#151515] border-white/5 hover:border-white/10"
                      }`}
                    >
                      <div className="flex items-center justify-between text-indigo-400 text-[11px] font-bold uppercase tracking-wider mb-1">
                        <span>Personnel & Droits</span>
                        <Users className="h-3.5 w-3.5 text-indigo-400" />
                      </div>
                      <div className="text-xl font-bold text-indigo-400 font-mono">{personnelLogs.length}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5 font-sans">Comptes, Rôles & Accès</div>
                    </div>

                    <div 
                      onClick={() => { setLogCategoryFilter("projets"); setLogActionFilter("all"); }}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                        logCategoryFilter === "projets" 
                          ? "bg-[#1A1A1A] border-emerald-500 shadow-md shadow-emerald-500/5" 
                          : "bg-[#151515] border-white/5 hover:border-white/10"
                      }`}
                    >
                      <div className="flex items-center justify-between text-emerald-400 text-[11px] font-bold uppercase tracking-wider mb-1">
                        <span>Projets & Activités</span>
                        <Briefcase className="h-3.5 w-3.5 text-emerald-400" />
                      </div>
                      <div className="text-xl font-bold text-emerald-400 font-mono">{projetsLogs.length}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5 font-sans">Modifications académiques</div>
                    </div>
                  </div>
                </div>

                {/* Filter Controls Bar */}
                <div className="bg-[#111111] p-4 rounded-xl border border-white/5 shadow-md space-y-3">
                  <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                    {/* Category Filter Tabs */}
                    <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#151515] rounded-xl border border-white/5">
                      <button
                        onClick={() => setLogCategoryFilter("all")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          logCategoryFilter === "all" ? "bg-[#D4AF37] text-black shadow-sm" : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Toutes les actions ({allLogs.length})
                      </button>
                      <button
                        onClick={() => setLogCategoryFilter("budget")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          logCategoryFilter === "budget" ? "bg-amber-500 text-black shadow-sm" : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Budget & Finances ({budgetLogs.length})
                      </button>
                      <button
                        onClick={() => setLogCategoryFilter("personnel")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          logCategoryFilter === "personnel" ? "bg-indigo-500 text-white shadow-sm" : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Personnel & Droits ({personnelLogs.length})
                      </button>
                      <button
                        onClick={() => setLogCategoryFilter("projets")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          logCategoryFilter === "projets" ? "bg-emerald-500 text-black shadow-sm" : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Projets & Recherche ({projetsLogs.length})
                      </button>
                    </div>

                    {/* Action Dropdown & Search Details */}
                    <div className="flex items-center gap-2">
                      <select
                        value={logActionFilter}
                        onChange={(e) => setLogActionFilter(e.target.value)}
                        className="bg-[#151515] border border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 focus:outline-none focus:border-[#D4AF37]"
                      >
                        <option value="all">Toutes les opérations</option>
                        <option value="création">Créations / Ajouts</option>
                        <option value="modification">Modifications</option>
                        <option value="suppression">Suppressions</option>
                        <option value="réinitialisation">Réinitialisations Budget</option>
                        <option value="révocation">Révocations / Réactivations Accès</option>
                        <option value="validation">Validations</option>
                      </select>

                      {(searchQuery || logCategoryFilter !== "all" || logActionFilter !== "all") && (
                        <button
                          onClick={() => { setLogCategoryFilter("all"); setLogActionFilter("all"); setSearchQuery(""); }}
                          className="px-3 py-2 bg-[#151515] hover:bg-red-950/40 text-red-400 border border-white/10 hover:border-red-900 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                          Réinitialiser filtres
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Audit Logs Main Table */}
                <div className="bg-[#111111] rounded-xl border border-white/5 shadow-md overflow-hidden">
                  <div className="p-4 border-b border-white/5 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                      <Clock className="h-4 w-4 text-[#D4AF37]" />
                      <span>Registres d'Audit</span>
                      <span className="px-2 py-0.5 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] text-[11px] font-mono border border-[#D4AF37]/20">
                        {displayLogs.length} résultat{displayLogs.length > 1 ? "s" : ""}
                      </span>
                    </span>

                    <span className="text-[11px] text-slate-500 font-mono">
                      Horodatage système automatisé
                    </span>
                  </div>

                  {displayLogs.length === 0 ? (
                    <div className="p-12 text-center">
                      <Clock className="h-10 w-10 text-slate-600 mx-auto mb-3" />
                      <h4 className="text-sm font-bold text-slate-300">Aucun journal d'action ne correspond aux critères</h4>
                      <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                        Essayez de réinitialiser la recherche ou de changer les filtres de catégorie.
                      </p>
                      <button
                        onClick={() => { setLogCategoryFilter("all"); setLogActionFilter("all"); setSearchQuery(""); }}
                        className="mt-4 px-4 py-2 bg-[#D4AF37] text-black font-bold text-xs rounded-xl hover:bg-[#D4AF37]/90 transition-all cursor-pointer"
                      >
                        Afficher tout l'historique
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-white/5 text-slate-500 uppercase text-[10px] tracking-wider bg-[#151515]">
                            <th className="py-3 px-4">Horodatage</th>
                            <th className="py-3 px-4">Agent Opérateur</th>
                            <th className="py-3 px-4">Catégorie</th>
                            <th className="py-3 px-4">Action Effectuée</th>
                            <th className="py-3 px-4">Détail Opérationnel & Traçabilité</th>
                            <th className="py-3 px-4 text-right">Inspection</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {displayLogs.map((log) => {
                            const cat = getLogCategory(log);

                            let categoryBadge = (
                              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                                Système
                              </span>
                            );
                            if (cat === "budget") {
                              categoryBadge = (
                                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                  Finance & Budget
                                </span>
                              );
                            } else if (cat === "personnel") {
                              categoryBadge = (
                                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                  Personnel & Accès
                                </span>
                              );
                            } else if (cat === "projets") {
                              categoryBadge = (
                                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  Projets
                                </span>
                              );
                            }

                            return (
                              <tr key={log.id} className="hover:bg-white/[0.03] transition-colors text-slate-300 text-xs">
                                <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                                  {new Date(log.timestamp).toLocaleString("fr-FR")}
                                </td>

                                <td className="py-3 px-4">
                                  <div className="flex items-center space-x-2">
                                    <div className="h-6 w-6 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] flex items-center justify-center font-bold text-[11px] border border-[#D4AF37]/20 uppercase">
                                      {(log.userName || "A")[0]}
                                    </div>
                                    <div>
                                      <span className="font-bold text-white block leading-tight">{log.userName || "Agent Inconnu"}</span>
                                      <span className="text-[10px] text-[#D4AF37] font-semibold uppercase">{log.userRole || "Personnel"}</span>
                                    </div>
                                  </div>
                                </td>

                                <td className="py-3 px-4">
                                  {categoryBadge}
                                </td>

                                <td className="py-3 px-4 whitespace-nowrap">
                                  {getActionBadge(log.action)}
                                </td>

                                <td className="py-3 px-4 max-w-md">
                                  <p className="text-slate-300 text-xs leading-normal line-clamp-2" title={log.details}>
                                    {log.details}
                                  </p>
                                </td>

                                <td className="py-3 px-4 text-right">
                                  <button
                                    onClick={() => setSelectedLogModal(log)}
                                    className="px-2.5 py-1 bg-[#151515] hover:bg-[#202020] text-slate-300 hover:text-white border border-white/10 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                                  >
                                    Inspecter
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* PANEL: CONFIGURATION / PARAMÈTRES */}
          {activePanel === "parametres" && (
            <div className="space-y-6">
              <div className="bg-[#111111] p-6 rounded-xl border border-white/5 shadow-md">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-white/5">
                  <div>
                    <h3 className="font-display text-base font-bold text-white uppercase tracking-wider flex items-center gap-2.5">
                      <Settings className="h-5 w-5 text-[#D4AF37]" />
                      <span>Configuration Générale du Portail UR-GEDT</span>
                    </h3>
                    <p className="text-xs text-slate-400 font-mono mt-1">
                      Gérez le nom institutionnel, le logo officiel, le favicon, les coordonnées directes et les réseaux sociaux.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSaveSettings} className="mt-6 space-y-8">
                  {/* SECTION 1: Identité du Portail */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider font-mono border-b border-white/5 pb-2">
                      1. Identité Visuelle & Branding
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Nom Officiel du Portail / Unité <span className="text-[#D4AF37]">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={settingsForm.siteName || ""}
                          onChange={(e) => setSettingsForm({ ...settingsForm, siteName: e.target.value })}
                          placeholder="UR-GEDT Portal & Management System"
                          className="w-full bg-[#151515] border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                        />
                      </div>
                    </div>

                    {/* Logo */}
                    <div className="space-y-2">
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Logo Institutionnel (URL ou Fichier Base64)
                      </label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={settingsForm.logo || ""}
                          onChange={(e) => setSettingsForm({ ...settingsForm, logo: e.target.value })}
                          placeholder="/logo.jpg ou URL d'image..."
                          className="flex-grow bg-[#151515] border border-white/10 rounded-lg p-2.5 text-xs font-mono text-white focus:outline-none focus:border-[#D4AF37]"
                        />
                        <div className="relative border border-white/10 hover:border-[#D4AF37] bg-[#151515] rounded-lg px-3 py-2 flex items-center justify-center cursor-pointer transition-colors shrink-0">
                          <input
                            type="file"
                            accept="image/*"
                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              addToast("Téléversement du logo en cours...", "info", "Paramètres");
                              try {
                                const result = await uploadFileToCloudinary(file);
                                setSettingsForm({ ...settingsForm, logo: result.url });
                                addToast("Logo téléversé avec succès.", "success", "Paramètres");
                              } catch (err: any) {
                                console.error("Cloudinary upload error:", err);
                                addToast(
                                  err instanceof CloudinaryConfigError
                                    ? err.message
                                    : "Échec du téléversement. Vérifiez votre connexion et réessayez.",
                                  "error",
                                  "Paramètres"
                                );
                              }
                            }}
                          />
                          <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-300">
                            <Upload className="h-3.5 w-3.5 text-[#D4AF37]" />
                            <span>Téléverser Logo</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleOpenFileManager((url) => setSettingsForm({ ...settingsForm, logo: url }))}
                          className="bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-slate-950 px-3.5 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shrink-0"
                        >
                          <FolderOpen className="h-3.5 w-3.5" />
                          <span>Médiathèque</span>
                        </button>
                      </div>
                      {settingsForm.logo && (
                        <div className="p-3 bg-black/30 border border-white/5 rounded-lg flex items-center gap-3 w-fit">
                          <img src={settingsForm.logo} alt="Aperçu Logo" className="h-10 w-10 object-contain rounded-full bg-white p-0.5 border border-[#D4AF37]" referrerPolicy="no-referrer" />
                          <div>
                            <p className="text-[11px] font-bold text-white">Aperçu du Logo</p>
                            <p className="text-[10px] text-slate-400 font-mono">Affiché dans la barre de navigation et le pied de page</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Favicon */}
                    <div className="space-y-2">
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Favicon du Navigateur (.ico, .png ou URL)
                      </label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={settingsForm.favicon || ""}
                          onChange={(e) => setSettingsForm({ ...settingsForm, favicon: e.target.value })}
                          placeholder="/favicon.ico ou URL d'icone..."
                          className="flex-grow bg-[#151515] border border-white/10 rounded-lg p-2.5 text-xs font-mono text-white focus:outline-none focus:border-[#D4AF37]"
                        />
                        <div className="relative border border-white/10 hover:border-[#D4AF37] bg-[#151515] rounded-lg px-3 py-2 flex items-center justify-center cursor-pointer transition-colors shrink-0">
                          <input
                            type="file"
                            accept="image/*"
                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              addToast("Téléversement du favicon en cours...", "info", "Paramètres");
                              try {
                                const result = await uploadFileToCloudinary(file);
                                setSettingsForm({ ...settingsForm, favicon: result.url });
                                addToast("Favicon téléversé avec succès.", "success", "Paramètres");
                              } catch (err: any) {
                                console.error("Cloudinary upload error:", err);
                                addToast(
                                  err instanceof CloudinaryConfigError
                                    ? err.message
                                    : "Échec du téléversement. Vérifiez votre connexion et réessayez.",
                                  "error",
                                  "Paramètres"
                                );
                              }
                            }}
                          />
                          <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-300">
                            <Upload className="h-3.5 w-3.5 text-[#D4AF37]" />
                            <span>Téléverser Favicon</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleOpenFileManager((url) => setSettingsForm({ ...settingsForm, favicon: url }))}
                          className="bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-slate-950 px-3.5 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shrink-0"
                        >
                          <FolderOpen className="h-3.5 w-3.5" />
                          <span>Médiathèque</span>
                        </button>
                      </div>
                      {settingsForm.favicon && (
                        <div className="p-3 bg-black/30 border border-white/5 rounded-lg flex items-center gap-3 w-fit">
                          <img src={settingsForm.favicon} alt="Aperçu Favicon" className="h-6 w-6 object-contain rounded bg-white p-0.5" referrerPolicy="no-referrer" />
                          <div>
                            <p className="text-[11px] font-bold text-white">Aperçu du Favicon</p>
                            <p className="text-[10px] text-slate-400 font-mono">Icône d'onglet du navigateur</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* SECTION 2: Coordonnées & Contact */}
                  <div className="space-y-4 pt-4 border-t border-white/5">
                    <h4 className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider font-mono border-b border-white/5 pb-2">
                      2. Coordonnées Officielles & Adresse
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Courriel Officiel (Contact Secrétariat)
                        </label>
                        <input
                          type="email"
                          value={settingsForm.email || ""}
                          onChange={(e) => setSettingsForm({ ...settingsForm, email: e.target.value })}
                          placeholder="urgedt.rdcongo@gmail.com"
                          className="w-full bg-[#151515] border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Téléphone Officiel
                        </label>
                        <input
                          type="text"
                          value={settingsForm.phone || ""}
                          onChange={(e) => setSettingsForm({ ...settingsForm, phone: e.target.value })}
                          placeholder="+243 800 827 348"
                          className="w-full bg-[#151515] border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Adresse Physique Institutionnelle
                      </label>
                      <input
                        type="text"
                        value={settingsForm.address || ""}
                        onChange={(e) => setSettingsForm({ ...settingsForm, address: e.target.value })}
                        placeholder="Campus de la Kasapa, Lubumbashi, Haut-Katanga, RDC"
                        className="w-full bg-[#151515] border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                      />
                    </div>
                  </div>

                  {/* SECTION 3: Réseaux Sociaux */}
                  <div className="space-y-4 pt-4 border-t border-white/5">
                    <h4 className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider font-mono border-b border-white/5 pb-2">
                      3. Liens des Réseaux Sociaux Institutionnels
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Page LinkedIn
                        </label>
                        <input
                          type="url"
                          value={settingsForm.linkedin || ""}
                          onChange={(e) => setSettingsForm({ ...settingsForm, linkedin: e.target.value })}
                          placeholder="https://www.linkedin.com/in/..."
                          className="w-full bg-[#151515] border border-white/10 rounded-lg p-2.5 text-xs font-mono text-white focus:outline-none focus:border-[#D4AF37]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Page Facebook
                        </label>
                        <input
                          type="url"
                          value={settingsForm.facebook || ""}
                          onChange={(e) => setSettingsForm({ ...settingsForm, facebook: e.target.value })}
                          placeholder="https://web.facebook.com/..."
                          className="w-full bg-[#151515] border border-white/10 rounded-lg p-2.5 text-xs font-mono text-white focus:outline-none focus:border-[#D4AF37]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Compte X (Twitter)
                        </label>
                        <input
                          type="url"
                          value={settingsForm.twitter || ""}
                          onChange={(e) => setSettingsForm({ ...settingsForm, twitter: e.target.value })}
                          placeholder="https://x.com/..."
                          className="w-full bg-[#151515] border border-white/10 rounded-lg p-2.5 text-xs font-mono text-white focus:outline-none focus:border-[#D4AF37]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Chaîne YouTube
                        </label>
                        <input
                          type="url"
                          value={settingsForm.youtube || ""}
                          onChange={(e) => setSettingsForm({ ...settingsForm, youtube: e.target.value })}
                          placeholder="https://youtube.com/..."
                          className="w-full bg-[#151515] border border-white/10 rounded-lg p-2.5 text-xs font-mono text-white focus:outline-none focus:border-[#D4AF37]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Lien WhatsApp Direct
                        </label>
                        <input
                          type="url"
                          value={settingsForm.whatsapp || ""}
                          onChange={(e) => setSettingsForm({ ...settingsForm, whatsapp: e.target.value })}
                          placeholder="https://wa.me/243..."
                          className="w-full bg-[#151515] border border-white/10 rounded-lg p-2.5 text-xs font-mono text-white focus:outline-none focus:border-[#D4AF37]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Dépôt GitHub / Code
                        </label>
                        <input
                          type="url"
                          value={settingsForm.github || ""}
                          onChange={(e) => setSettingsForm({ ...settingsForm, github: e.target.value })}
                          placeholder="https://github.com/..."
                          className="w-full bg-[#151515] border border-white/10 rounded-lg p-2.5 text-xs font-mono text-white focus:outline-none focus:border-[#D4AF37]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4 border-t border-white/5 flex justify-end">
                    <button
                      type="submit"
                      disabled={isSavingSettings}
                      className="px-6 py-3 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-slate-950 rounded-xl text-xs font-black transition-all shadow-lg flex items-center gap-2 cursor-pointer"
                    >
                      {isSavingSettings ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Enregistrement...</span>
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          <span>Enregistrer les Paramètres</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* DETAILED MODAL POPUPS (FOR ALL CRUD FORMS) */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="crud-modal-title"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-[#111111] border border-white/5 rounded-2xl max-w-lg w-full shadow-2xl flex flex-col text-slate-100 max-h-[90vh] overflow-y-auto my-4 sm:my-8"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#151515]">
                <h3 id="crud-modal-title" className="font-display text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Edit className="h-4 w-4 text-[#D4AF37]" aria-hidden="true" />
                  <span>
                    {editingItem ? "Modifier" : "Ajouter / Créer"} : {modalType.toUpperCase()}
                  </span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  aria-label="Fermer le formulaire de saisie"
                  className="text-slate-400 hover:text-white p-1 rounded hover:bg-white/5 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>

              {/* Form Content */}
              <form ref={formRef} onSubmit={handleFormSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
                
                {/* Form fields depending on modalType */}
                {modalType === "user" && (
                  <div className="space-y-4">
                    {/* Live Preview Avatar */}
                    <div className="flex items-center space-x-4 bg-black/30 p-3 rounded-xl border border-white/5">
                      <div className="h-16 w-16 rounded-full bg-gradient-to-tr from-[#111111] to-[#D4AF37] flex items-center justify-center text-white text-2xl font-black font-display shrink-0 border border-white/10 overflow-hidden shadow-md">
                        {formData.avatarUrl ? (
                          <img src={formData.avatarUrl} alt="Aperçu photo" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          (formData.name || "U").split(" ").slice(-1)[0]?.[0] || "U"
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-white">Photo de profil de l'utilisateur</p>
                        <p className="text-[11px] text-slate-400">Importez une photo, saisissez une URL ou choisissez dans la médiathèque.</p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nom complet</label>
                      <input type="text" required value={formData.name || ""} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full bg-[#151515] border border-white/5 rounded p-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">E-mail institutionnel</label>
                      <input type="email" required value={formData.email || ""} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full bg-[#151515] border border-white/5 rounded p-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]" />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Photo de profil (URL, Téléversement ou Médiathèque)</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Lien URL de la photo ou Base64..."
                          value={formData.avatarUrl || ""}
                          onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
                          className="flex-grow bg-[#151515] border border-white/5 rounded p-2 text-xs font-mono text-white focus:outline-none focus:border-[#D4AF37]"
                        />
                        <div className="relative border border-white/10 hover:border-[#D4AF37] bg-[#151515] rounded px-3 py-2 flex items-center justify-center cursor-pointer transition-colors shrink-0">
                          <input
                            type="file"
                            accept="image/*"
                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              addToast("Téléversement de la photo en cours...", "info", "Personnel");
                              try {
                                const result = await uploadFileToCloudinary(file);
                                setFormData({ ...formData, avatarUrl: result.url });
                                addToast("Photo téléversée avec succès.", "success", "Personnel");
                              } catch (err: any) {
                                console.error("Cloudinary upload error:", err);
                                addToast(
                                  err instanceof CloudinaryConfigError
                                    ? err.message
                                    : "Échec du téléversement. Vérifiez votre connexion et réessayez.",
                                  "error",
                                  "Personnel"
                                );
                              }
                            }}
                          />
                          <div className="flex items-center space-x-1 text-xs font-bold text-slate-300">
                            <Upload className="h-3.5 w-3.5 text-[#D4AF37]" />
                            <span>Téléverser</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleOpenFileManager((url) => setFormData({ ...formData, avatarUrl: url }))}
                          className="bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black px-3 py-2 rounded text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shrink-0"
                        >
                          <FolderOpen className="h-3.5 w-3.5" />
                          <span>Médiathèque</span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Key className="h-3.5 w-3.5" />
                          <span>Mot de passe d'accès</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => handleGenerateRandomPassword("form")}
                          className="text-[11px] font-bold text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-0.5 rounded border border-amber-500/20 cursor-pointer flex items-center gap-1 transition-colors"
                        >
                          <Sparkles className="h-3 w-3 text-amber-400" />
                          <span>Générer un mot de passe fort</span>
                        </button>
                      </div>

                      <div className="relative flex items-center">
                        <input 
                          type={showPasswordInUserForm ? "text" : "password"} 
                          required={!editingItem} 
                          value={formData.password || ""} 
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })} 
                          placeholder={editingItem ? "•••••••• (laissez vide pour conserver le mot de passe actuel)" : "Saisissez ou générez un mot de passe..."}
                          className="w-full bg-[#151515] border border-white/5 rounded p-2 text-xs font-mono text-white focus:outline-none focus:border-[#D4AF37] pr-10" 
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswordInUserForm(!showPasswordInUserForm)}
                          className="absolute right-2 text-slate-400 hover:text-white p-1 cursor-pointer"
                          title={showPasswordInUserForm ? "Masquer" : "Afficher"}
                        >
                          {showPasswordInUserForm ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>

                      {/* REAL-TIME PASSWORD STRENGTH INDICATOR */}
                      {formData.password && formData.password.length > 0 && (() => {
                        const str = computeUserPasswordStrength(formData.password);
                        if (!str) return null;
                        return (
                          <div className="mt-2 p-2.5 bg-[#151515] border border-white/10 rounded-lg space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-400 font-medium">Force du mot de passe :</span>
                              <span className={`font-bold font-mono ${str.textColor}`}>
                                {str.label}
                              </span>
                            </div>

                            {/* 5-segment progress bar */}
                            <div className="flex items-center space-x-1 h-1.5 w-full">
                              {[1, 2, 3, 4, 5].map((level) => (
                                <div
                                  key={level}
                                  className={`h-full flex-1 rounded-full transition-all duration-300 ${
                                    level <= str.bars ? str.color : "bg-white/10"
                                  }`}
                                />
                              ))}
                            </div>

                            {/* Real-time criteria checklist */}
                            <div className="grid grid-cols-2 gap-1 pt-1 text-[11px] font-mono">
                              <span className={`flex items-center gap-1 ${str.hasMinLen ? "text-emerald-400" : "text-gray-500"}`}>
                                {str.hasMinLen ? "✓" : "○"} 6+ caractères
                              </span>
                              <span className={`flex items-center gap-1 ${str.hasUpper ? "text-emerald-400" : "text-gray-500"}`}>
                                {str.hasUpper ? "✓" : "○"} Majuscule (A-Z)
                              </span>
                              <span className={`flex items-center gap-1 ${str.hasNumber ? "text-emerald-400" : "text-gray-500"}`}>
                                {str.hasNumber ? "✓" : "○"} Chiffre (0-9)
                              </span>
                              <span className={`flex items-center gap-1 ${str.hasSpecial ? "text-emerald-400" : "text-gray-500"}`}>
                                {str.hasSpecial ? "✓" : "○"} Symbole (@#$...)
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Rôle au sein de l'Unité</label>
                      <select value={formData.role || "Chercheur"} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="w-full bg-[#151515] border border-white/5 rounded p-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]">
                        <option value="Administrateur">Administrateur</option>
                        <option value="Directeur">Directeur</option>
                        <option value="Comptable">Comptable</option>
                        <option value="Secrétaire">Secrétaire</option>
                        <option value="Chercheur">Chercheur</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Téléphone de contact</label>
                        <input
                          type="text"
                          value={formData.phone || ""}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="Ex: +243 81 234 5678"
                          className="w-full bg-[#151515] border border-white/5 rounded p-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Département / Faculté</label>
                        <input
                          type="text"
                          value={formData.department || ""}
                          onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                          placeholder="Ex: Faculté des Sciences Sociales"
                          className="w-full bg-[#151515] border border-white/5 rounded p-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Fonction / Titre Académique</label>
                      <input
                        type="text"
                        value={formData.function || ""}
                        onChange={(e) => setFormData({ ...formData, function: e.target.value })}
                        placeholder="Ex: Professeur Associé, Enquêteur Senior"
                        className="w-full bg-[#151515] border border-white/5 rounded p-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Biographie / Axes de Recherche</label>
                      <textarea
                        rows={3}
                        value={formData.bio || ""}
                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                        placeholder="Brève biographie, spécialité ou thèmes de recherche..."
                        className="w-full bg-[#151515] border border-white/5 rounded p-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="userActive" checked={formData.active ?? true} onChange={(e) => setFormData({ ...formData, active: e.target.checked })} className="rounded bg-[#151515] border-white/5 text-[#D4AF37] focus:ring-[#D4AF37]" />
                      <label htmlFor="userActive" className="text-xs text-slate-400">Compte Actif (Autoriser la connexion)</label>
                    </div>
                  </div>
                )}

                {modalType === "news" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Titre de l'actualité</label>
                      <input type="text" required value={formData.title || ""} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full bg-[#151515] border border-white/5 rounded p-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Catégorie</label>
                      <select value={formData.category || "Recherche"} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full bg-[#151515] border border-white/5 rounded p-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]">
                        <option value="Recherche">Recherche</option>
                        <option value="Environnement">Environnement</option>
                        <option value="Formation">Formation</option>
                        <option value="Atelier">Atelier</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Fichier de couverture / Document Joint (Image ou PDF)</label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          required 
                          placeholder="Lien URL ou Base64 du fichier..." 
                          value={formData.image || ""} 
                          onChange={(e) => setFormData({ ...formData, image: e.target.value })} 
                          className="flex-grow bg-[#151515] border border-white/5 rounded p-2 text-xs font-mono text-white focus:outline-none focus:border-[#D4AF37]" 
                        />
                        <button
                          type="button"
                          onClick={() => handleOpenFileManager((url) => setFormData({ ...formData, image: url }))}
                          className="bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black px-3 py-2 rounded text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shrink-0"
                        >
                          <FolderOpen className="h-3.5 w-3.5" />
                          <span>Médiathèque</span>
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">Collez une URL d'image/document, ou cliquez sur <strong>Médiathèque</strong> pour parcourir, glisser-déposer ou téléverser vos photos et PDFs.</p>
                      
                      {/* Live preview in the form itself! */}
                      {formData.image && (
                        <div className="mt-2 p-2 bg-[#151515] rounded border border-white/5 flex items-center gap-3">
                          {formData.image.startsWith("data:application/pdf") || formData.image.endsWith(".pdf") || formData.image.includes("pdf") ? (
                            <div className="h-10 w-10 bg-red-500/10 rounded flex items-center justify-center text-red-500 border border-red-500/20">
                              <FileText className="h-5 w-5" />
                            </div>
                          ) : (
                            <img src={formData.image} alt="Aperçu" className="h-10 w-10 object-cover rounded" referrerPolicy="no-referrer" />
                          )}
                          <div className="overflow-hidden">
                            <p className="text-[11px] font-bold text-white truncate">Fichier sélectionné</p>
                            <p className="text-[9px] text-slate-500 truncate font-mono">{formData.image.substring(0, 50)}...</p>
                          </div>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Texte intégral</label>
                      <textarea required rows={5} value={formData.content || ""} onChange={(e) => setFormData({ ...formData, content: e.target.value })} className="w-full bg-[#151515] border border-white/5 rounded p-2 text-xs leading-relaxed text-white focus:outline-none focus:border-[#D4AF37]"></textarea>
                    </div>
                  </div>
                )}

                {modalType === "project" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nom ou titre du projet</label>
                      <input type="text" required value={formData.title || ""} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full bg-[#151515] border border-white/5 rounded p-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Date de démarrage</label>
                        <input type="date" required value={formData.startDate || ""} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} className="w-full bg-[#151515] border border-white/5 rounded p-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Date de fin prévue</label>
                        <input type="date" required value={formData.endDate || ""} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} className="w-full bg-[#151515] border border-white/5 rounded p-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Allocation budgétaire (USD)</label>
                        <input type="number" required value={formData.budget || ""} onChange={(e) => setFormData({ ...formData, budget: e.target.value })} className="w-full bg-[#151515] border border-white/5 rounded p-2 text-xs font-mono text-white focus:outline-none focus:border-[#D4AF37]" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Statut opérationnel</label>
                        <select value={formData.status || "En cours"} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full bg-[#151515] border border-white/5 rounded p-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]">
                          <option value="En cours">En cours</option>
                          <option value="Terminé">Terminé</option>
                          <option value="Suspendu">Suspendu</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Bailleur / Organisme de Financement</label>
                      <input type="text" required value={formData.funding || ""} onChange={(e) => setFormData({ ...formData, funding: e.target.value })} placeholder="Ex: Enabel" className="w-full bg-[#151515] border border-white/5 rounded p-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Description détaillée</label>
                      <textarea required rows={4} value={formData.description || ""} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full bg-[#151515] border border-white/5 rounded p-2 text-xs leading-relaxed text-white focus:outline-none focus:border-[#D4AF37]"></textarea>
                    </div>
                  </div>
                )}

                {modalType === "activity" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Intitulé de l'activité</label>
                      <input type="text" required value={formData.title || ""} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Ex: Réunion d'évaluation de l'unité" className="w-full bg-[#151515] border border-white/5 rounded p-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Type d'activité</label>
                      <select value={formData.type || "Recherche"} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="w-full bg-[#151515] border border-white/5 rounded p-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]">
                        <option value="Recherche">🔬 Activité de Recherche / Mission de Terrain</option>
                        <option value="Réunion">👥 Réunion de coordination / de service</option>
                        <option value="Séminaire">🎓 Séminaire académique / Atelier / Colloque</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Lieu d'investigation</label>
                        <input type="text" required value={formData.location || ""} onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder="Ex: Kipushi" className="w-full bg-[#151515] border border-white/5 rounded p-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Date prévue</label>
                        <input type="date" required value={formData.date || ""} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full bg-[#151515] border border-white/5 rounded p-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Allocation financière terrain (USD)</label>
                        <input type="number" required value={formData.budget || ""} onChange={(e) => setFormData({ ...formData, budget: e.target.value })} className="w-full bg-[#151515] border border-white/5 rounded p-2 text-xs font-mono text-white focus:outline-none focus:border-[#D4AF37]" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Statut d'avancement</label>
                        <select value={formData.status || "Planifié"} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full bg-[#151515] border border-white/5 rounded p-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]">
                          <option value="Planifié">Planifié</option>
                          <option value="En cours">En cours</option>
                          <option value="Réalisé">Réalisé</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Chercheurs mobilisés (Séparés par des virgules)</label>
                      <input 
                        type="text" 
                        required 
                        value={Array.isArray(formData.researchers) ? formData.researchers.join(", ") : formData.researchers || ""} 
                        onChange={(e) => setFormData({ ...formData, researchers: e.target.value })} 
                        placeholder="Ex: Dr. Patrick Mulamba, Prof. Jean-Claude Mpanga" 
                        className="w-full bg-[#151515] border border-white/5 rounded p-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]" 
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Description et buts scientifiques</label>
                      <textarea required rows={3} value={formData.description || ""} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full bg-[#151515] border border-white/5 rounded p-2 text-xs leading-relaxed text-white focus:outline-none focus:border-[#D4AF37]"></textarea>
                    </div>
                  </div>
                )}

                {modalType === "publication" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Titre de la publication académique</label>
                      <input type="text" required value={formData.title || ""} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full bg-[#151515] border border-white/5 rounded p-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Liste des co-auteurs</label>
                      <input type="text" required value={formData.authors || ""} onChange={(e) => setFormData({ ...formData, authors: e.target.value })} className="w-full bg-[#151515] border border-white/5 rounded p-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nom de la revue / Éditeur</label>
                      <input type="text" required value={formData.journal || ""} onChange={(e) => setFormData({ ...formData, journal: e.target.value })} className="w-full bg-[#151515] border border-white/5 rounded p-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Année d'édition</label>
                        <input type="number" required value={formData.year || ""} onChange={(e) => setFormData({ ...formData, year: e.target.value })} className="w-full bg-[#151515] border border-white/5 rounded p-2 text-xs font-mono text-white focus:outline-none focus:border-[#D4AF37]" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Catégorie scientifique</label>
                        <select value={formData.type || "Article"} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="w-full bg-[#151515] border border-white/5 rounded p-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]">
                          <option value="Article">Article dans Revue</option>
                          <option value="Livre">Livre scientifique</option>
                          <option value="Rapport">Rapport d'expertise</option>
                          <option value="Thèse">Thèse académique</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Adresse URL d'indexation / Téléchargement</label>
                      <input type="url" required value={formData.url || ""} onChange={(e) => setFormData({ ...formData, url: e.target.value })} className="w-full bg-[#151515] border border-white/5 rounded p-2 text-xs font-mono text-white focus:outline-none focus:border-[#D4AF37]" />
                    </div>
                  </div>
                )}

                {modalType === "gallery" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Titre du média</label>
                      <input type="text" required value={formData.title || ""} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full bg-[#151515] border border-white/5 rounded p-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Description courte contextuelle</label>
                      <input type="text" required value={formData.description || ""} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full bg-[#151515] border border-white/5 rounded p-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Type de média</label>
                        <select value={formData.type || "photo"} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="w-full bg-[#151515] border border-white/5 rounded p-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]">
                          <option value="photo">📷 Photo / Image</option>
                          <option value="video">🎥 Vidéo (Youtube ou fichier)</option>
                          <option value="audio">🎵 Fichier Audio (Interview, Podcast)</option>
                          <option value="pdf">📄 Document PDF (Rapport d'enquête)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Date d'intégration</label>
                        <input type="date" required value={formData.date || ""} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full bg-[#151515] border border-white/5 rounded p-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]" />
                      </div>
                    </div>
                    <div className="border border-white/5 bg-black/30 rounded-xl p-3.5 space-y-3">
                      <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Fichier Média (Importer ou coller l'URL)</span>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-grow">
                          <label className="block text-[10px] text-slate-500 mb-1">Lien absolu du média (URL)</label>
                          <input 
                            type="text" 
                            required 
                            placeholder="https://example.com/file.mp3 ou base64..."
                            value={formData.url || ""} 
                            onChange={(e) => setFormData({ ...formData, url: e.target.value })} 
                            className="w-full bg-[#151515] border border-white/5 rounded p-2 text-xs font-mono text-white focus:outline-none focus:border-[#D4AF37]" 
                          />
                        </div>
                        <div className="sm:w-1/3 flex flex-col justify-end">
                          <div className="relative border border-dashed border-white/10 hover:border-[#D4AF37]/40 bg-[#151515] rounded h-[34px] flex items-center justify-center cursor-pointer transition-colors">
                            <input
                              type="file"
                              accept={
                                formData.type === "photo" ? "image/*" :
                                formData.type === "video" ? "video/*" :
                                formData.type === "audio" ? "audio/*" :
                                "application/pdf"
                              }
                              className="absolute inset-0 opacity-0 cursor-pointer"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                addToast("Téléversement du fichier en cours...", "info", "Médiathèque");
                                try {
                                  const result = await uploadFileToCloudinary(file);
                                  setFormData({ ...formData, url: result.url });
                                  addToast("Fichier téléversé avec succès.", "success", "Médiathèque");
                                } catch (err: any) {
                                  console.error("Cloudinary upload error:", err);
                                  addToast(
                                    err instanceof CloudinaryConfigError
                                      ? err.message
                                      : "Échec du téléversement. Vérifiez votre connexion et réessayez.",
                                    "error",
                                    "Médiathèque"
                                  );
                                }
                              }}
                            />
                            <div className="flex items-center space-x-1 text-[11px] font-bold text-slate-400">
                              <Upload className="h-3.5 w-3.5" />
                              <span>Téléverser fichier</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {modalType === "partner" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nom officiel du partenaire</label>
                      <input type="text" required value={formData.name || ""} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full bg-[#151515] border border-white/5 rounded p-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Type de structure</label>
                      <select value={formData.type || "Académique"} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="w-full bg-[#151515] border border-white/5 rounded p-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]">
                        <option value="Académique">Académique / Universitaire</option>
                        <option value="Financier">Financier / Bailleur de fonds</option>
                        <option value="Institutionnel">Institutionnel / État</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Lien du logo de la structure</label>
                      <input type="url" required value={formData.logo || ""} onChange={(e) => setFormData({ ...formData, logo: e.target.value })} className="w-full bg-[#151515] border border-white/5 rounded p-2 text-xs font-mono text-white focus:outline-none focus:border-[#D4AF37]" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Site internet officiel</label>
                      <input type="url" required value={formData.website || ""} onChange={(e) => setFormData({ ...formData, website: e.target.value })} className="w-full bg-[#151515] border border-white/5 rounded p-2 text-xs font-mono text-white focus:outline-none focus:border-[#D4AF37]" />
                    </div>
                  </div>
                )}

                {/* RECIPES FORM (FINANCIAL MODAL) */}
                {modalType === "recipe" && (
                  <div className="space-y-4">
                    {hasDraftRestored && (
                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-center justify-between text-xs text-amber-200">
                        <div className="flex items-center gap-2">
                          <Save className="h-4 w-4 text-amber-400 shrink-0" />
                          <span>Brouillon non soumis restauré automatiquement.</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleClearDraft}
                          className="text-[11px] text-amber-400 hover:text-amber-200 underline font-semibold cursor-pointer"
                        >
                          Effacer le brouillon
                        </button>
                      </div>
                    )}
                    <ValidatedInputField
                      id="recipe-description"
                      label="Libellé ou description du financement"
                      value={formData.description || ""}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Ex: Rétrocession mines deuxième tranche"
                      required
                      validate={(val) => {
                        if (val.trim().length < 3) {
                          return { isValid: false, message: "✗ Description trop courte (minimum 3 caractères)." };
                        }
                        return { isValid: true, message: "✓ Description valide." };
                      }}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FinancialMaskedInput
                        id="recipe-amount"
                        label="Montant de la recette"
                        value={formData.amount || ""}
                        currency={formData.currency || "USD"}
                        onAmountChange={(cleanAmount, currency) => setFormData({ ...formData, amount: cleanAmount, currency })}
                        required
                        placeholder="Ex: 15 000,00"
                        helpText="Formatage automatique en temps réel des séparateurs de milliers"
                      />
                      <div>
                        <label htmlFor="recipe-type" className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                          Origine / Catégorie <span className="text-[#D4AF37]">*</span>
                        </label>
                        <select
                          id="recipe-type"
                          value={formData.type || "Subvention"}
                          onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                          className="w-full bg-[#151515] border border-emerald-500/50 bg-emerald-950/10 rounded p-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                        >
                          <option value="Subvention">Subvention bailleur</option>
                          <option value="Prestation de service">Prestation d'expertise</option>
                          <option value="Don">Don externe</option>
                          <option value="Autre">Autre recette</option>
                        </select>
                      </div>
                    </div>
                    <ValidatedInputField
                      id="recipe-source"
                      label="Bailleur / Source de provenance"
                      value={formData.source || ""}
                      onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                      placeholder="Ex: Union Européenne"
                      required
                      validate={(val) => {
                        if (val.trim().length < 2) {
                          return { isValid: false, message: "✗ Nom de la source requis (minimum 2 caractères)." };
                        }
                        return { isValid: true, message: "✓ Source identifiée." };
                      }}
                    />
                  </div>
                )}

                {/* EXPENSES FORM (FINANCIAL MODAL) */}
                {modalType === "expense" && (
                  <div className="space-y-4">
                    {hasDraftRestored && (
                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-center justify-between text-xs text-amber-200">
                        <div className="flex items-center gap-2">
                          <Save className="h-4 w-4 text-amber-400 shrink-0" />
                          <span>Brouillon non soumis restauré automatiquement.</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleClearDraft}
                          className="text-[11px] text-amber-400 hover:text-amber-200 underline font-semibold cursor-pointer"
                        >
                          Effacer le brouillon
                        </button>
                      </div>
                    )}
                    {/* SCANNAGE DE FACTURE / RECEIPT SCANNER */}
                    <div className="bg-[#18181b] border border-[#D4AF37]/20 rounded-xl p-4.5 space-y-3 shadow-inner">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-bold text-[#D4AF37] uppercase tracking-wider flex items-center gap-1.5">
                          <span className="animate-pulse h-2 w-2 bg-[#D4AF37] rounded-full"></span>
                          Numérisation intelligente (IA) de bordereau
                        </span>
                        {formData.receiptUrl && (
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, receiptUrl: "" })}
                            className="text-[11px] text-red-400 hover:text-red-300 transition-colors font-semibold hover:underline"
                          >
                            Supprimer la pièce
                          </button>
                        )}
                      </div>

                      {!formData.receiptUrl ? (
                        <div className="border border-dashed border-white/10 hover:border-[#D4AF37]/50 rounded-xl p-6 text-center transition-colors relative cursor-pointer group bg-black/25">
                          <input
                            type="file"
                            accept="image/*"
                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                const base64Url = event.target?.result as string;
                                setFormData({ ...formData, receiptUrl: base64Url });
                              };
                              reader.readAsDataURL(file);
                            }}
                          />
                          <div className="flex flex-col items-center justify-center space-y-1.5">
                            <div className="h-10 w-10 bg-[#D4AF37]/10 rounded-full flex items-center justify-center text-[#D4AF37] group-hover:scale-110 transition-transform">
                              <Upload className="h-5 w-5" />
                            </div>
                            <p className="text-xs text-slate-300 font-semibold">Déposer ou cliquer pour importer la pièce justificative</p>
                            <p className="text-[11px] text-slate-500 font-mono">Formats d'images acceptés (PNG, JPG, JPEG)</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-4 bg-black/40 p-3 rounded-lg border border-white/5">
                          <img
                            src={formData.receiptUrl}
                            alt="Bordereau"
                            className="h-14 w-14 object-cover rounded border border-white/10"
                          />
                          <div className="flex-grow min-w-0">
                            <p className="text-xs font-semibold text-slate-200 truncate">Justificatif de dépense chargé</p>
                            <p className="text-[11px] text-slate-500 font-mono">Prêt pour l'analyse par intelligence artificielle</p>
                          </div>
                          <div>
                            <button
                              type="button"
                              disabled={isScanningReceipt}
                              onClick={async () => {
                                if (!formData.receiptUrl) return;
                                setIsScanningReceipt(true);
                                setScanError(undefined);
                                try {
                                  // Extract base64 and mimeType
                                  const parts = formData.receiptUrl.split(";base64,");
                                  const mimeType = parts[0].split(":")[1];
                                  const base64Data = parts[1];

                                  const res = await apiFetch("/api/gemini/scan-receipt", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ imageBase64: base64Data, mimeType })
                                  });
                                  const json = await res.json();
                                  if (!res.ok || !json.success) {
                                    throw new Error(json.error || "Erreur de numérisation");
                                  }

                                  const { description, amount, beneficiary, category } = json.data;
                                  
                                  // Map Category string returned to appropriate select value
                                  let finalCategory = "Matériel";
                                  if (category === "Logistique" || category === "Logistique & Déplacements") finalCategory = "Logistique";
                                  else if (category === "Recherche" || category === "Frais de Recherche") finalCategory = "Recherche";
                                  else if (category === "RH" || category === "Indemnités RH / Enquêteurs") finalCategory = "RH";
                                  else if (category === "Autre" || category === "Autre dépense") finalCategory = "Autre";

                                  setFormData({
                                    ...formData,
                                    description: description || "",
                                    amount: amount ? String(amount) : "",
                                    beneficiary: beneficiary || "",
                                    category: finalCategory
                                  });
                                  
                                  setScanError(undefined);
                                } catch (err: any) {
                                  console.error("Scanning error:", err);
                                  setScanError(err.message || "Impossible de numériser cette pièce.");
                                } finally {
                                  setIsScanningReceipt(false);
                                }
                              }}
                              className={`px-3 py-1.5 text-xs font-bold rounded cursor-pointer transition-all duration-150 flex items-center gap-1.5 ${
                                isScanningReceipt
                                  ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                                  : "bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-slate-950 shadow-md hover:shadow-lg"
                              }`}
                            >
                              {isScanningReceipt ? (
                                <>
                                  <span className="animate-spin h-3.5 w-3.5 border-2 border-slate-500 border-t-white rounded-full"></span>
                                  <span>Numérisation...</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles className="h-3.5 w-3.5 text-slate-950 animate-pulse" />
                                  <span>Numériser (IA)</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      {isScanningReceipt && (
                        <div className="bg-amber-950/10 border border-amber-500/20 rounded p-2.5 flex items-center gap-3.5">
                          <div className="h-4 w-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin shrink-0"></div>
                          <div className="space-y-0.5">
                            <p className="text-[11px] text-amber-300 font-bold font-mono">Gemini-3.5-flash est en train d'analyser le document...</p>
                            <p className="text-[10px] text-slate-400">Extraction automatique de l'objet, du montant, de la catégorie et du fournisseur en cours.</p>
                          </div>
                        </div>
                      )}

                      {scanError && (
                        <p className="text-[11px] text-red-400 font-mono bg-red-950/20 p-2.5 rounded border border-red-900/40">
                          ⚠️ {scanError}
                        </p>
                      )}
                    </div>

                    <ValidatedInputField
                      id="expense-description"
                      label="Libellé de la dépense / Objet"
                      value={formData.description || ""}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Ex: Achat carburant mission Kipushi"
                      required
                      validate={(val) => {
                        if (val.trim().length < 3) {
                          return { isValid: false, message: "✗ Description de la dépense trop courte ( minimum 3 car. )." };
                        }
                        return { isValid: true, message: "✓ Objet de la dépense valide." };
                      }}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FinancialMaskedInput
                        id="expense-amount"
                        label="Montant décaissé"
                        value={formData.amount || ""}
                        currency={formData.currency || "USD"}
                        onAmountChange={(cleanAmount, currency) => setFormData({ ...formData, amount: cleanAmount, currency })}
                        required
                        placeholder="Ex: 450,00"
                        helpText="Formatage automatique en temps réel des séparateurs de milliers"
                      />
                      <div>
                        <label htmlFor="expense-category" className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                          Catégorie budgétaire <span className="text-[#D4AF37]">*</span>
                        </label>
                        <select
                          id="expense-category"
                          value={formData.category || "Matériel"}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                          className="w-full bg-[#151515] border border-emerald-500/50 bg-emerald-950/10 rounded p-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                        >
                          <option value="Matériel">Matériels Scientifiques</option>
                          <option value="Logistique">Logistique & Déplacements</option>
                          <option value="Recherche">Frais de Recherche</option>
                          <option value="RH">Indemnités RH / Enquêteurs</option>
                          <option value="Autre">Autre dépense</option>
                        </select>
                      </div>
                    </div>
                    <ValidatedInputField
                      id="expense-beneficiary"
                      label="Bénéficiaire du versement"
                      value={formData.beneficiary || ""}
                      onChange={(e) => setFormData({ ...formData, beneficiary: e.target.value })}
                      placeholder="Ex: Dr. Patrick Mulamba"
                      required
                      validate={(val) => {
                        if (val.trim().length < 2) {
                          return { isValid: false, message: "✗ Nom du bénéficiaire requis (minimum 2 caractères)." };
                        }
                        return { isValid: true, message: "✓ Bénéficiaire identifié." };
                      }}
                    />
                  </div>
                )}

                {/* Message display indicators */}
                {errorMsg && <p className="text-xs text-red-400 font-bold font-mono bg-red-950/20 p-3 rounded border border-red-900">{errorMsg}</p>}
                {successMsg && <p className="text-xs text-emerald-400 font-bold font-mono bg-emerald-950/20 p-3 rounded border border-emerald-900">{successMsg}</p>}

                {/* Submit button */}
                <div className="pt-4 border-t border-white/5 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-[#151515] hover:bg-white/5 border border-white/5 rounded text-xs font-bold transition-colors cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#D4AF37] hover:bg-[#D4AF37]/80 text-slate-950 rounded text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5"
                    title="Enregistrer l'opération [Raccourci: Ctrl + S]"
                  >
                    <span>Enregistrer l'opération</span>
                    <kbd className="hidden sm:inline-block text-[10px] font-mono bg-black/20 text-slate-950 font-extrabold px-1.5 py-0.5 rounded border border-black/20">Ctrl+S</kbd>
                  </button>
                </div>

              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* GESTIONNAIRE DE FICHIERS / MEDIA LIBRARY OVERLAY */}
      <AnimatePresence>
        {isFileLibraryOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 backdrop-blur-md z-[60] flex items-center justify-center p-4 overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="file-library-title"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-[#111111] border border-white/10 rounded-2xl max-w-4xl w-full h-[85vh] flex flex-col shadow-2xl overflow-hidden text-slate-100"
            >
              {/* Header */}
              <div className="p-5 border-b border-white/5 flex justify-between items-center bg-[#151515]">
                <div className="flex items-center space-x-2.5">
                  <div className="h-8 w-8 bg-[#D4AF37] rounded flex items-center justify-center text-slate-950 text-base font-black" aria-hidden="true">
                    📂
                  </div>
                  <div>
                    <h3 id="file-library-title" className="font-display font-extrabold text-sm text-white uppercase tracking-wider">Gestionnaire de Fichiers UR-GEDT</h3>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">Explorateur de ressources scientifiques, images & documents</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFileLibraryOpen(false)}
                  aria-label="Fermer le gestionnaire de fichiers"
                  className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>

              {/* Grid content and sidebars */}
              <div className="flex-grow flex flex-col md:flex-row overflow-hidden">
                {/* Left Panel: Upload Zone */}
                <div className="w-full md:w-80 p-5 border-r border-white/5 bg-[#121212] flex flex-col justify-between shrink-0 space-y-6">
                  <div className="space-y-4">
                    <h4 className="text-[11px] uppercase font-bold text-[#D4AF37] tracking-wider font-mono">Ajouter un Fichier</h4>
                    <div className="border border-dashed border-white/10 rounded-xl p-6 bg-[#151515]/50 flex flex-col items-center justify-center text-center group hover:border-[#D4AF37]/50 transition-colors relative">
                      <input 
                        type="file" 
                        accept="image/*,application/pdf"
                        onChange={handleFileUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        id="file-upload-input"
                      />
                      <div className="h-12 w-12 bg-[#D4AF37]/5 rounded-full flex items-center justify-center text-[#D4AF37] border border-[#D4AF37]/10 mb-3 group-hover:scale-110 transition-transform">
                        <Upload className="h-6 w-6" />
                      </div>
                      <span className="text-xs font-bold text-white block">Glisser ou Cliquez</span>
                      <span className="text-[10px] text-slate-500 mt-1 block">Images (PNG, JPG) ou PDF (Max 15MB)</span>
                    </div>

                    <div className="p-4 bg-[#151515] rounded-xl border border-white/5 space-y-2 text-[11px] text-slate-400">
                      <p className="font-bold text-slate-300">💡 Conseil d'utilisation :</p>
                      <p>Les fichiers téléversés ici sont encodés et stockés localement de manière sécurisée pour votre session.</p>
                      <p>Vous pouvez également réutiliser n'importe quel fichier existant de la médiathèque publique.</p>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-500 font-mono text-center">
                    GEDT Cloud Storage Node-01
                  </div>
                </div>

                {/* Right Panel: File Grid List */}
                <div className="flex-grow p-5 flex flex-col overflow-hidden">
                  {/* Search and Filters */}
                  <div className="flex flex-col sm:flex-row gap-3 items-center justify-between pb-4 border-b border-white/5">
                    <div className="relative w-full sm:max-w-xs">
                      <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Rechercher un fichier..."
                        value={fileManagerSearch}
                        onChange={(e) => setFileManagerSearch(e.target.value)}
                        className="w-full bg-[#151515] text-slate-100 pl-9 pr-4 py-1.5 border border-white/5 rounded-lg text-xs focus:outline-none focus:border-[#D4AF37]"
                      />
                    </div>
                    <div className="flex gap-1 bg-[#151515] p-1 rounded-lg border border-white/5 w-full sm:w-auto overflow-x-auto justify-end">
                      {["Tous", "image", "pdf"].map((filter) => (
                        <button
                          type="button"
                          key={filter}
                          onClick={() => setFileTypeFilter(filter)}
                          className={`px-3 py-1 rounded text-[11px] font-bold uppercase transition-colors whitespace-nowrap cursor-pointer ${
                            fileTypeFilter === filter
                              ? "bg-[#D4AF37] text-black"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          {filter === "Tous" ? "Tous" : filter === "image" ? "Images" : "PDFs"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Grid layout */}
                  <div className="flex-grow overflow-y-auto mt-4 pr-1">
                    {getCombinedLibrary().filter(f => {
                      const matchesSearch = f.title.toLowerCase().includes(fileManagerSearch.toLowerCase());
                      const matchesType = fileTypeFilter === "Tous" || f.type === fileTypeFilter;
                      return matchesSearch && matchesType;
                    }).length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-8">
                        <span className="text-4xl mb-2">📁</span>
                        <p className="text-sm font-bold text-slate-400">Aucun fichier trouvé</p>
                        <p className="text-xs text-slate-500 mt-1">Importez un nouveau fichier ou modifiez vos critères de recherche.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 pb-4">
                        {getCombinedLibrary()
                          .filter(f => {
                            const matchesSearch = f.title.toLowerCase().includes(fileManagerSearch.toLowerCase());
                            const matchesType = fileTypeFilter === "Tous" || f.type === fileTypeFilter;
                            return matchesSearch && matchesType;
                          })
                          .map((file) => (
                            <div
                              key={file.id}
                              onClick={() => handleSelectFileFromLibrary(file.url)}
                              className="group bg-[#151515] border border-white/5 hover:border-[#D4AF37]/50 rounded-xl overflow-hidden flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.01] shadow-lg relative"
                            >
                              {/* Selection overlay indicator */}
                              <div className="absolute top-2 right-2 bg-[#D4AF37] text-black h-5 w-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-md">
                                <Check className="h-3 w-3 stroke-[3]" />
                              </div>

                              <div className="h-28 w-full bg-[#111111] border-b border-white/5 flex items-center justify-center relative overflow-hidden">
                                {file.type === "pdf" ? (
                                  <div className="flex flex-col items-center justify-center text-red-500 p-2">
                                    <FileText className="h-10 w-10 mb-1 group-hover:scale-110 transition-transform" />
                                    <span className="text-[9px] bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded font-mono font-bold uppercase">PDF</span>
                                  </div>
                                ) : file.type === "video" ? (
                                  <div className="flex flex-col items-center justify-center text-blue-400 p-2">
                                    <span className="text-2xl mb-1">🎬</span>
                                    <span className="text-[9px] bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded font-mono font-bold uppercase">Vidéo</span>
                                  </div>
                                ) : (
                                  <img 
                                    src={file.url} 
                                    alt={file.title} 
                                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" 
                                    referrerPolicy="no-referrer"
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = 'none';
                                    }}
                                  />
                                )}
                              </div>

                              <div className="p-3 bg-[#131313] space-y-1">
                                <h5 className="text-[11px] font-bold text-white truncate" title={file.title}>
                                  {file.title}
                                </h5>
                                <div className="flex justify-between items-center text-[9px] text-slate-500 font-mono">
                                  <span>{file.size}</span>
                                  <span>{new Date(file.date).toLocaleDateString("fr-FR")}</span>
                                </div>
                              </div>

                              {/* Custom uploads deletion button */}
                              {file.id.startsWith("file-") && (
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteCustomFile(file.id, e)}
                                  className="absolute bottom-1 right-1 p-1 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded border border-red-500/10 transition-colors z-20 cursor-pointer"
                                  title="Supprimer définitivement"
                                >
                                  <Trash2 className="h-2.5 w-2.5" />
                                </button>
                              )}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer selection banner */}
              <div className="p-4 border-t border-white/5 bg-[#151515] flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsFileLibraryOpen(false)}
                  className="px-4 py-2 bg-[#111111] hover:bg-white/5 border border-white/5 rounded text-xs font-bold cursor-pointer transition-colors"
                >
                  Fermer sans sélectionner
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* RECEIPT LIGHTBOX MODAL */}
      <AnimatePresence>
        {activeReceiptUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveReceiptUrl(null)}
            className="fixed inset-0 bg-black/90 backdrop-blur-md z-[70] flex items-center justify-center p-4 cursor-zoom-out"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#111111] border border-white/15 rounded-2xl max-w-2xl w-full p-5 shadow-2xl relative cursor-default flex flex-col space-y-4"
            >
              <div className="flex justify-between items-center pb-3 border-b border-white/5">
                <div className="flex items-center space-x-2">
                  <Eye className="h-4 w-4 text-[#D4AF37]" />
                  <span className="text-xs font-bold font-display uppercase tracking-wider text-white">Visualisation du bordereau / justificatif</span>
                </div>
                <button
                  onClick={() => setActiveReceiptUrl(null)}
                  className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-grow flex items-center justify-center overflow-hidden max-h-[70vh] rounded-xl border border-white/5 bg-black/40 p-1">
                <img
                  src={activeReceiptUrl}
                  alt="Facture / Pièce Justificative"
                  className="max-h-full max-w-full object-contain rounded-lg shadow-md"
                />
              </div>
              <div className="flex justify-between items-center pt-2 text-[11px] text-slate-500 font-mono">
                <span>Format: Image stockée en Base64</span>
                <a
                  href={activeReceiptUrl}
                  download="justificatif_depense.png"
                  className="text-[#D4AF37] hover:underline flex items-center gap-1 font-bold"
                >
                  📥 Télécharger le fichier
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PDF SCANNER MODAL */}
      <AnimatePresence>
        {isPdfScanModalOpen && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[60] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#111111] border border-white/10 rounded-2xl max-w-4xl w-full shadow-2xl relative flex flex-col my-8 overflow-hidden max-h-[90vh]"
            >
              {/* Header */}
              <div className="flex justify-between items-center px-6 py-4.5 border-b border-white/5 bg-black/40">
                <div className="flex items-center space-x-2.5">
                  <div className="h-8 w-8 bg-[#D4AF37]/10 rounded-lg flex items-center justify-center text-[#D4AF37]">
                    <FileText className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h3 className="font-display font-black text-sm text-white uppercase tracking-wider">Numérisation de rapports & historiques (PDF)</h3>
                    <p className="text-[11px] text-slate-500 font-mono">Module propulsé par Gemini-3.5-flash d'Intelligence Artificielle</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsPdfScanModalOpen(false)}
                  className="p-1.5 rounded-full hover:bg-white/5 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-grow overflow-y-auto p-6 space-y-6">
                {!pdfScanResult ? (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Importez et numérisez instantanément vos rapports d'activités financières, bordereaux de dépenses consolidés, ou reçus multi-lignes au format PDF. L'intelligence artificielle extraira automatiquement les dépenses de manière structurée pour que vous puissiez les valider et les intégrer au grand livre comptable.
                    </p>

                    {/* Drag and drop zone */}
                    {!pdfScanFile ? (
                      <div className="border-2 border-dashed border-white/10 hover:border-[#D4AF37]/50 rounded-2xl p-10 text-center transition-all duration-200 bg-black/20 group relative cursor-pointer">
                        <input
                          type="file"
                          accept="application/pdf"
                          className="absolute inset-0 opacity-0 cursor-pointer z-10"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setPdfScanFileName(file.name);
                            setPdfScanError(null);
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const base64Url = event.target?.result as string;
                              const base64Data = base64Url.split(";base64,")[1];
                              setPdfScanFile(base64Data);
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                        <div className="flex flex-col items-center justify-center space-y-3">
                          <div className="h-12 w-12 bg-[#D4AF37]/10 rounded-full flex items-center justify-center text-[#D4AF37] group-hover:scale-110 transition-transform">
                            <Upload className="h-6 w-6" />
                          </div>
                          <div>
                            <p className="text-xs text-slate-200 font-bold">Glissez ou cliquez pour charger votre fichier PDF financier</p>
                            <p className="text-[11px] text-slate-500 font-mono mt-1">Format requis : Document PDF (.pdf)</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-black/30 border border-white/10 rounded-xl p-4.5 flex items-center justify-between">
                        <div className="flex items-center space-x-3.5 min-w-0">
                          <div className="h-11 w-11 bg-red-500/10 rounded-lg flex items-center justify-center text-red-400 border border-red-500/10 shrink-0">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-200 truncate">{pdfScanFileName}</p>
                            <p className="text-[11px] text-[#D4AF37] font-mono mt-0.5">Prêt pour l'extraction automatique</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 shrink-0">
                          <button
                            onClick={() => {
                              setPdfScanFile(null);
                              setPdfScanFileName("");
                            }}
                            className="px-3 py-1.5 border border-white/10 hover:border-red-500/30 text-slate-400 hover:text-red-400 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                          >
                            Annuler
                          </button>
                          <button
                            disabled={isScanningPdf}
                            onClick={async () => {
                              if (!pdfScanFile) return;
                              setIsScanningPdf(true);
                              setPdfScanError(null);
                              try {
                                const response = await apiFetch("/api/gemini/scan-financial-pdf", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ pdfBase64: pdfScanFile })
                                });
                                const json = await response.json();
                                if (!response.ok || !json.success) {
                                  throw new Error(json.error || "Erreur lors de l'analyse du PDF");
                                }
                                const parsedExpenses = (json.data.expenses || []).map((e: any) => ({
                                  ...e,
                                  selected: true,
                                  amount: Number(e.amount) || 0,
                                  beneficiary: e.beneficiary || "Inconnu / Divers",
                                  category: ["Matériel", "Logistique", "Recherche", "RH", "Autre"].includes(e.category) ? e.category : "Autre"
                                }));
                                setPdfScanResult({
                                  summary: json.data.summary || "Rapport analysé avec succès.",
                                  expenses: parsedExpenses
                                });
                              } catch (err: any) {
                                console.error("PDF Scan error:", err);
                                setPdfScanError(err.message || "Une erreur s'est produite lors de l'analyse.");
                              } finally {
                                setIsScanningPdf(false);
                              }
                            }}
                            className="bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-slate-950 px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md flex items-center space-x-1.5 cursor-pointer"
                          >
                            <Sparkles className="h-4 w-4 animate-pulse" />
                            <span>Numériser le Rapport</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {isScanningPdf && (
                      <div className="bg-amber-950/15 border border-[#D4AF37]/20 rounded-xl p-5 space-y-3.5 flex flex-col items-center justify-center text-center animate-pulse">
                        <div className="h-8 w-8 border-3 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
                        <div>
                          <p className="text-xs text-[#D4AF37] font-bold uppercase tracking-wider font-mono">Analyse en cours par Gemini-3.5-flash...</p>
                          <p className="text-[11px] text-slate-400 mt-1 max-w-md leading-relaxed">
                            Nous analysons le contenu du PDF, recherchons les bordereaux de dépenses, convertissons les devises étrangères en USD et classons chaque ligne de budget. Cette opération peut prendre quelques secondes.
                          </p>
                        </div>
                      </div>
                    )}

                    {pdfScanError && (
                      <div className="p-4 bg-red-950/20 border border-red-900/40 rounded-xl text-xs text-red-400 font-mono flex gap-2">
                        <span className="shrink-0">⚠️</span>
                        <span>{pdfScanError}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Summary Card */}
                    <div className="bg-[#18181b] border border-[#D4AF37]/20 rounded-xl p-4 space-y-1.5">
                      <span className="text-[11px] uppercase font-bold text-[#D4AF37] font-mono flex items-center gap-1.5">
                        <Sparkles className="h-3 w-3" />
                        Résumé synthétique généré par l'IA
                      </span>
                      <p className="text-xs text-slate-300 leading-relaxed italic">
                        "{pdfScanResult.summary}"
                      </p>
                    </div>

                    {/* Table of extracted expenses */}
                    <div className="space-y-3.5">
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">Lignes de dépenses extraites ({pdfScanResult.expenses.length})</h4>
                        <button
                          onClick={() => {
                            const allSelected = pdfScanResult.expenses.every(e => e.selected);
                            setPdfScanResult({
                              ...pdfScanResult,
                              expenses: pdfScanResult.expenses.map(e => ({ ...e, selected: !allSelected }))
                            });
                          }}
                          className="text-[11px] text-[#D4AF37] hover:underline font-bold uppercase font-mono cursor-pointer bg-transparent border-none"
                        >
                          {pdfScanResult.expenses.every(e => e.selected) ? "Tout désélectionner" : "Tout sélectionner"}
                        </button>
                      </div>

                      <div className="border border-white/5 rounded-xl overflow-hidden bg-black/20">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse min-w-[700px]">
                            <thead>
                              <tr className="bg-black/40 border-b border-white/5 text-[11px] uppercase font-mono text-slate-400 font-bold">
                                <th className="py-2.5 px-3 w-12 text-center">Imp.</th>
                                <th className="py-2.5 px-3">Libellé / Objet</th>
                                <th className="py-2.5 px-3 w-40">Bénéficiaire</th>
                                <th className="py-2.5 px-3 w-32">Catégorie</th>
                                <th className="py-2.5 px-3 w-28 text-right">Montant (USD)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-xs">
                              {pdfScanResult.expenses.map((exp, idx) => (
                                <tr
                                  key={idx}
                                  className={`transition-colors ${
                                    exp.selected ? "bg-white/[0.01] hover:bg-white/[0.03]" : "opacity-45 hover:opacity-75"
                                  }`}
                                >
                                  <td className="py-2 px-3 text-center">
                                    <input
                                      type="checkbox"
                                      checked={!!exp.selected}
                                      onChange={(e) => {
                                        const updated = [...pdfScanResult.expenses];
                                        updated[idx].selected = e.target.checked;
                                        setPdfScanResult({ ...pdfScanResult, expenses: updated });
                                      }}
                                      className="rounded border-white/10 bg-black text-[#D4AF37] focus:ring-0 cursor-pointer h-3.5 w-3.5"
                                    />
                                  </td>
                                  <td className="py-2 px-3">
                                    <input
                                      type="text"
                                      value={exp.description}
                                      onChange={(e) => {
                                        const updated = [...pdfScanResult.expenses];
                                        updated[idx].description = e.target.value;
                                        setPdfScanResult({ ...pdfScanResult, expenses: updated });
                                      }}
                                      className="w-full bg-transparent border-none text-white focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/30 rounded px-1.5 py-0.5 text-xs"
                                    />
                                  </td>
                                  <td className="py-2 px-3">
                                    <input
                                      type="text"
                                      value={exp.beneficiary}
                                      onChange={(e) => {
                                        const updated = [...pdfScanResult.expenses];
                                        updated[idx].beneficiary = e.target.value;
                                        setPdfScanResult({ ...pdfScanResult, expenses: updated });
                                      }}
                                      className="w-full bg-transparent border-none text-slate-300 focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/30 rounded px-1.5 py-0.5 text-xs"
                                    />
                                  </td>
                                  <td className="py-2 px-3">
                                    <select
                                      value={exp.category}
                                      onChange={(e) => {
                                        const updated = [...pdfScanResult.expenses];
                                        updated[idx].category = e.target.value;
                                        setPdfScanResult({ ...pdfScanResult, expenses: updated });
                                      }}
                                      className="w-full bg-[#151515] border border-white/5 rounded px-2 py-1 text-xs text-white focus:outline-none"
                                    >
                                      <option value="Matériel">Matériel</option>
                                      <option value="Logistique">Logistique</option>
                                      <option value="Recherche">Recherche</option>
                                      <option value="RH">RH</option>
                                      <option value="Autre">Autre</option>
                                    </select>
                                  </td>
                                  <td className="py-2 px-3 text-right">
                                    <input
                                      type="number"
                                      value={exp.amount}
                                      onChange={(e) => {
                                        const updated = [...pdfScanResult.expenses];
                                        updated[idx].amount = parseFloat(e.target.value) || 0;
                                        setPdfScanResult({ ...pdfScanResult, expenses: updated });
                                      }}
                                      className="w-20 bg-transparent border-none text-right font-mono text-white focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/30 rounded px-1 py-0.5 text-xs"
                                    />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    {/* Summary calculation of what is about to be imported */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-[#151515] border border-white/5 rounded-xl p-4 gap-3">
                      <div>
                        <p className="text-xs font-bold text-white font-display">Prêt à l'importation consolidée</p>
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {pdfScanResult.expenses.filter(e => e.selected).length} dépenses sélectionnées sur {pdfScanResult.expenses.length} extraites du rapport
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] text-slate-500 uppercase font-mono tracking-wider">Total à inscrire au budget</p>
                        <p className="text-base font-bold text-[#D4AF37] font-mono">
                          {pdfScanResult.expenses.filter(e => e.selected).reduce((sum, e) => sum + e.amount, 0).toLocaleString()} USD
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-white/5 bg-black/40 flex justify-between items-center shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    if (pdfScanResult) {
                      setPdfScanResult(null);
                    } else {
                      setIsPdfScanModalOpen(false);
                    }
                  }}
                  className="px-4 py-2 border border-white/10 hover:border-white/20 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer bg-transparent"
                >
                  {pdfScanResult ? "Recommencer" : "Fermer"}
                </button>

                {pdfScanResult && (
                  <button
                    onClick={async () => {
                      const selected = pdfScanResult.expenses.filter(e => e.selected);
                      if (selected.length === 0) {
                        alert("Veuillez sélectionner au moins une dépense à importer.");
                        return;
                      }

                      if (onBulkRegisterExpenses) {
                        const success = await onBulkRegisterExpenses(selected);
                        if (success) {
                          setSuccessMsg(`${selected.length} dépenses importées avec succès !`);
                          addToast(`${selected.length} dépenses numérisées et importées avec succès !`, "success", "Importation PDF");
                          setIsPdfScanModalOpen(false);
                          setTimeout(() => setSuccessMsg(""), 3000);
                        } else {
                          alert("Erreur lors de l'importation par lot.");
                        }
                      }
                    }}
                    className="bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-slate-950 px-5 py-2 rounded-lg text-xs font-bold transition-all shadow-md hover:shadow-lg flex items-center space-x-1.5 cursor-pointer border-none font-display"
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>Valider et Importer ({pdfScanResult.expenses.filter(e => e.selected).length})</span>
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* REUSABLE DATABASE DELETE CONFIRMATION MODAL */}
      <ConfirmationModal
        isOpen={!!deleteConfirmItem}
        title="Confirmation de suppression"
        message="Êtes-vous absolument sûr de vouloir supprimer définitivement cet élément de la base de données ?"
        itemType={deleteConfirmItem?.type}
        itemId={deleteConfirmItem?.id}
        itemLabel={deleteConfirmItem?.label}
        warningText="Cette suppression est définitive et irréversible. L'action sera consignée dans le journal d'audit administratif de l'UR-GEDT."
        confirmText="Supprimer définitivement"
        cancelText="Annuler"
        variant="danger"
        isLoading={isDeleting}
        onClose={() => setDeleteConfirmItem(null)}
        onConfirm={confirmExecuteDelete}
      />

      {/* REUSABLE GENERIC CONFIRMATION MODAL */}
      {genericConfirmModal && (
        <ConfirmationModal
          isOpen={genericConfirmModal.isOpen}
          title={genericConfirmModal.title}
          message={genericConfirmModal.message}
          itemType={genericConfirmModal.itemType}
          itemId={genericConfirmModal.itemId}
          itemLabel={genericConfirmModal.itemLabel}
          warningText={genericConfirmModal.warningText}
          confirmText={genericConfirmModal.confirmText}
          cancelText={genericConfirmModal.cancelText}
          variant={genericConfirmModal.variant}
          isLoading={isDeleting}
          onClose={() => setGenericConfirmModal(null)}
          onConfirm={genericConfirmModal.onConfirm}
        />
      )}

      {/* DEDICATED BUDGET MODAL (MODIFICATION & VENTILATION DU BUDGET) */}
      <AnimatePresence>
        {isBudgetModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md no-print">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="bg-[#121212] border border-[#D4AF37]/30 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-5 border-b border-white/10 flex justify-between items-center bg-[#181818] shrink-0">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-xl bg-[#D4AF37]/15 text-[#D4AF37] flex items-center justify-center border border-[#D4AF37]/30 shadow-md">
                    <Sliders className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider">
                      Gestion & Modification du Budget Annuel
                    </h3>
                    <p className="text-xs text-slate-400 font-mono">
                      Ajustement des enveloppes analytiques & enregistrement en Base de Données
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsBudgetModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSaveBudget} className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Year & Global Budget */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-white uppercase tracking-wider mb-1.5 font-display">
                      Exercice Budgétaire (Année)
                    </label>
                    <input
                      type="number"
                      required
                      min={2020}
                      max={2040}
                      value={budgetForm.year}
                      onChange={(e) => setBudgetForm({ ...budgetForm, year: parseInt(e.target.value) || new Date().getFullYear() })}
                      className="w-full bg-[#161616] border border-white/10 focus:border-[#D4AF37] rounded-xl p-3 text-sm text-white font-mono focus:outline-none"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-white uppercase tracking-wider font-display">
                        Budget Total Global (USD)
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const sum = (Number(budgetForm.allocatedResearch) || 0) +
                                      (Number(budgetForm.allocatedLogistics) || 0) +
                                      (Number(budgetForm.allocatedEquipment) || 0) +
                                      (Number(budgetForm.allocatedPersonnel) || 0);
                          setBudgetForm(prev => ({ ...prev, totalBudget: sum }));
                          addToast(`Budget total calculé automatiquement : ${sum.toLocaleString()} USD`, "info", "Calcul Auto");
                        }}
                        className="text-[11px] font-bold text-[#D4AF37] hover:underline flex items-center gap-1 cursor-pointer"
                        title="Régler le total égal à la somme des 4 postes ci-dessous"
                      >
                        <PieChart className="h-3 w-3" />
                        <span>Calculer la somme</span>
                      </button>
                    </div>
                    <input
                      type="number"
                      required
                      min={0}
                      step={100}
                      value={budgetForm.totalBudget}
                      onChange={(e) => setBudgetForm({ ...budgetForm, totalBudget: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-[#161616] border border-[#D4AF37]/40 focus:border-[#D4AF37] rounded-xl p-3 text-sm text-white font-mono font-bold focus:outline-none text-amber-300"
                    />
                  </div>
                </div>

                {/* Sub-budget allocations */}
                <div className="space-y-4 pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-300 uppercase tracking-wider font-display">
                      Ventilation par Postes de Dépenses (USD)
                    </p>
                    <span className="text-xs font-mono text-slate-400">
                      Somme des 4 postes : {((Number(budgetForm.allocatedResearch) || 0) + (Number(budgetForm.allocatedLogistics) || 0) + (Number(budgetForm.allocatedEquipment) || 0) + (Number(budgetForm.allocatedPersonnel) || 0)).toLocaleString()} USD
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Recherche & Etudes */}
                    <div className="p-3.5 bg-[#161616] border border-white/10 rounded-xl space-y-1.5">
                      <label className="block text-xs font-bold text-emerald-400 uppercase font-mono">
                        Recherche & Études
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={100}
                        value={budgetForm.allocatedResearch}
                        onChange={(e) => setBudgetForm({ ...budgetForm, allocatedResearch: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-[#0d0d0d] border border-white/10 focus:border-emerald-500 rounded-lg p-2.5 text-xs text-white font-mono focus:outline-none"
                      />
                    </div>

                    {/* Logistique Terrain */}
                    <div className="p-3.5 bg-[#161616] border border-white/10 rounded-xl space-y-1.5">
                      <label className="block text-xs font-bold text-blue-400 uppercase font-mono">
                        Logistique Terrain
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={100}
                        value={budgetForm.allocatedLogistics}
                        onChange={(e) => setBudgetForm({ ...budgetForm, allocatedLogistics: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-[#0d0d0d] border border-white/10 focus:border-blue-500 rounded-lg p-2.5 text-xs text-white font-mono focus:outline-none"
                      />
                    </div>

                    {/* Matériels Scientifiques */}
                    <div className="p-3.5 bg-[#161616] border border-white/10 rounded-xl space-y-1.5">
                      <label className="block text-xs font-bold text-[#D4AF37] uppercase font-mono">
                        Matériels Scientifiques
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={100}
                        value={budgetForm.allocatedEquipment}
                        onChange={(e) => setBudgetForm({ ...budgetForm, allocatedEquipment: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-[#0d0d0d] border border-white/10 focus:border-[#D4AF37] rounded-lg p-2.5 text-xs text-white font-mono focus:outline-none"
                      />
                    </div>

                    {/* Ressources Humaines */}
                    <div className="p-3.5 bg-[#161616] border border-white/10 rounded-xl space-y-1.5">
                      <label className="block text-xs font-bold text-purple-400 uppercase font-mono">
                        Ressources Humaines
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={100}
                        value={budgetForm.allocatedPersonnel}
                        onChange={(e) => setBudgetForm({ ...budgetForm, allocatedPersonnel: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-[#0d0d0d] border border-white/10 focus:border-purple-500 rounded-lg p-2.5 text-xs text-white font-mono focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Live Distribution Progress Bar */}
                {budgetForm.totalBudget > 0 && (
                  <div className="p-4 bg-[#161616] border border-white/10 rounded-xl space-y-2">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                      Répartition visuelle de l'enveloppe ({budgetForm.totalBudget.toLocaleString()} USD)
                    </p>
                    <div className="h-3 w-full bg-[#0d0d0d] rounded-full overflow-hidden flex">
                      <div
                        style={{ width: `${Math.min(100, (budgetForm.allocatedResearch / budgetForm.totalBudget) * 100)}%` }}
                        className="bg-emerald-500 h-full transition-all"
                        title={`Recherche: ${((budgetForm.allocatedResearch / budgetForm.totalBudget) * 100).toFixed(1)}%`}
                      />
                      <div
                        style={{ width: `${Math.min(100, (budgetForm.allocatedLogistics / budgetForm.totalBudget) * 100)}%` }}
                        className="bg-blue-500 h-full transition-all"
                        title={`Logistique: ${((budgetForm.allocatedLogistics / budgetForm.totalBudget) * 100).toFixed(1)}%`}
                      />
                      <div
                        style={{ width: `${Math.min(100, (budgetForm.allocatedEquipment / budgetForm.totalBudget) * 100)}%` }}
                        className="bg-[#D4AF37] h-full transition-all"
                        title={`Matériels: ${((budgetForm.allocatedEquipment / budgetForm.totalBudget) * 100).toFixed(1)}%`}
                      />
                      <div
                        style={{ width: `${Math.min(100, (budgetForm.allocatedPersonnel / budgetForm.totalBudget) * 100)}%` }}
                        className="bg-purple-500 h-full transition-all"
                        title={`RH: ${((budgetForm.allocatedPersonnel / budgetForm.totalBudget) * 100).toFixed(1)}%`}
                      />
                    </div>
                  </div>
                )}

                {/* Footer buttons */}
                <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsResetBudgetConfirmOpen(true);
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Réinitialiser à zéro (0 USD)</span>
                  </button>

                  <div className="w-full sm:w-auto flex items-center gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setIsBudgetModalOpen(false)}
                      className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black font-bold rounded-xl text-xs transition-all cursor-pointer shadow-lg flex items-center gap-1.5"
                    >
                      <Save className="h-3.5 w-3.5" />
                      <span>Enregistrer dans la Base de Données</span>
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRMATION MODAL FOR BUDGET RESET */}
      <ConfirmationModal
        isOpen={isResetBudgetConfirmOpen}
        title="Réinitialiser le Budget à zéro"
        message="Voulez-vous vraiment réinitialiser toutes les enveloppes budgétaires à zéro (0 USD) dans la base de données ?"
        warningText="Cette opération remettra l'enveloppe globale et la ventilation de toutes les sous-catégories à 0 USD dans la base de données de l'UR-GEDT. L'action sera consignée dans le journal d'audit administratif."
        confirmText="Oui, Réinitialiser à zéro"
        cancelText="Annuler"
        variant="danger"
        onClose={() => setIsResetBudgetConfirmOpen(false)}
        onConfirm={handleResetBudgetToZero}
      />

      {/* KEYBOARD SHORTCUTS GUIDE MODAL */}
      <AnimatePresence>
        {isShortcutsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="bg-[#121212] border border-[#D4AF37]/30 rounded-2xl max-w-lg w-full shadow-2xl no-print max-h-[90vh] overflow-y-auto my-4 sm:my-8"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-white/10 flex justify-between items-center bg-[#181818]">
                <div className="flex items-center space-x-3">
                  <div className="h-9 w-9 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37] flex items-center justify-center border border-[#D4AF37]/20">
                    <Keyboard className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider">
                      Guide des Raccourcis Clavier
                    </h3>
                    <p className="text-xs text-slate-400 font-mono">
                      Saisie & Navigation Rapide UR-GEDT
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsShortcutsModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 space-y-3 max-h-[65vh] overflow-y-auto">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Utilisez ces raccourcis clavier pour accélérer la saisie des pièces comptables, enregistrer vos opérations financières et naviguer sans quitter le clavier :
                </p>

                <div className="divide-y divide-white/5 border border-white/10 rounded-xl overflow-hidden bg-[#161616]">
                  <div className="p-3 flex items-center justify-between hover:bg-white/[0.02]">
                    <div className="space-y-0.5 pr-2">
                      <p className="text-xs font-bold text-slate-100">Enregistrer le Formulaire Actif</p>
                      <p className="text-[11px] text-slate-400">Valide et soumet automatiquement les données de la recette ou dépense en cours.</p>
                    </div>
                    <kbd className="shrink-0 font-mono text-xs font-bold bg-white/10 border border-white/20 text-[#D4AF37] px-2.5 py-1 rounded-lg shadow-sm">
                      Ctrl + S
                    </kbd>
                  </div>

                  <div className="p-3 flex items-center justify-between hover:bg-white/[0.02]">
                    <div className="space-y-0.5 pr-2">
                      <p className="text-xs font-bold text-slate-100">Saisie Rapide - Nouvelle Recette</p>
                      <p className="text-[11px] text-slate-400">Ouvre directement le formulaire de saisie de recette budgétaire.</p>
                    </div>
                    <kbd className="shrink-0 font-mono text-xs font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 px-2.5 py-1 rounded-lg shadow-sm">
                      Alt + R
                    </kbd>
                  </div>

                  <div className="p-3 flex items-center justify-between hover:bg-white/[0.02]">
                    <div className="space-y-0.5 pr-2">
                      <p className="text-xs font-bold text-slate-100">Saisie Rapide - Nouvelle Dépense</p>
                      <p className="text-[11px] text-slate-400">Ouvre directement le formulaire de décaissement avec scannage IA.</p>
                    </div>
                    <kbd className="shrink-0 font-mono text-xs font-bold bg-red-500/15 border border-red-500/30 text-red-300 px-2.5 py-1 rounded-lg shadow-sm">
                      Alt + E
                    </kbd>
                  </div>

                  <div className="p-3 flex items-center justify-between hover:bg-white/[0.02]">
                    <div className="space-y-0.5 pr-2">
                      <p className="text-xs font-bold text-slate-100">Focus sur la Recherche Globale</p>
                      <p className="text-[11px] text-slate-400">Active la barre de recherche instantanée (Finances, Projets, Membres).</p>
                    </div>
                    <kbd className="shrink-0 font-mono text-xs font-bold bg-white/10 border border-white/20 text-blue-300 px-2.5 py-1 rounded-lg shadow-sm">
                      Ctrl + F
                    </kbd>
                  </div>

                  <div className="p-3 flex items-center justify-between hover:bg-white/[0.02]">
                    <div className="space-y-0.5 pr-2">
                      <p className="text-xs font-bold text-slate-100">Impression Rapide / PDF</p>
                      <p className="text-[11px] text-slate-400">Imprime le rapport financier, reçu ou la vue active.</p>
                    </div>
                    <kbd className="shrink-0 font-mono text-xs font-bold bg-white/10 border border-white/20 text-purple-300 px-2.5 py-1 rounded-lg shadow-sm">
                      Ctrl + P
                    </kbd>
                  </div>

                  <div className="p-3 flex items-center justify-between hover:bg-white/[0.02]">
                    <div className="space-y-0.5 pr-2">
                      <p className="text-xs font-bold text-slate-100">Panneau Finances & Budget</p>
                      <p className="text-[11px] text-slate-400">Bascule instantanément vers la gestion comptable.</p>
                    </div>
                    <kbd className="shrink-0 font-mono text-xs font-bold bg-white/10 border border-white/20 text-amber-300 px-2.5 py-1 rounded-lg shadow-sm">
                      Alt + F
                    </kbd>
                  </div>

                  <div className="p-3 flex items-center justify-between hover:bg-white/[0.02]">
                    <div className="space-y-0.5 pr-2">
                      <p className="text-xs font-bold text-slate-100">Fermer la Fenêtre / Modal</p>
                      <p className="text-[11px] text-slate-400">Ferme les formulaires, fenêtres flottantes ou aperçus ouverts.</p>
                    </div>
                    <kbd className="shrink-0 font-mono text-xs font-bold bg-white/10 border border-white/20 text-slate-300 px-2.5 py-1 rounded-lg shadow-sm">
                      Échap (Esc)
                    </kbd>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-white/10 bg-[#181818] flex justify-between items-center text-xs">
                <span className="text-[11px] text-slate-500 font-mono">Appuyez sur <kbd className="text-[#D4AF37]">F1</kbd> à tout moment pour rouvrir</span>
                <button
                  onClick={() => setIsShortcutsModalOpen(false)}
                  className="px-4 py-2 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-slate-950 font-bold rounded-xl transition-all cursor-pointer shadow-md"
                >
                  Compris
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* QR SCANNER & RECEIPT VALIDATION MODAL */}
      {isQrScannerModalOpen && (
        <QrScannerModal
          db={db}
          onClose={() => setIsQrScannerModalOpen(false)}
          onOpenReceipt={(receiptItem) => {
            setIsQrScannerModalOpen(false);
            onTriggerPrint(receiptItem);
          }}
        />
      )}

      {/* MODAL DÉDIÉE DE MODIFICATION DU MOT DE PASSE DU PERSONNEL */}
      <AnimatePresence>
        {isPasswordModalOpen && passwordModalUser && (
          <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#121212] border border-amber-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto my-4 sm:my-8"
            >
              {/* Header Gradient Accent */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-[#D4AF37] to-amber-600" />

              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-500/15 border border-amber-500/30 rounded-xl text-amber-400">
                    <Key className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold font-display text-white">Changer le Mot de Passe</h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      Personnel : <span className="text-amber-300 font-bold">{passwordModalUser.name}</span> ({passwordModalUser.role || "Agent"})
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="p-1.5 bg-[#1a1a1a] hover:bg-white/10 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSaveUserPassword} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Nouveau Mot de Passe
                    </label>
                    <button
                      type="button"
                      onClick={() => handleGenerateRandomPassword("modal")}
                      className="text-xs font-bold text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 rounded border border-amber-500/30 cursor-pointer flex items-center gap-1.5 transition-colors"
                    >
                      <Sparkles className="h-3 w-3 text-amber-400" />
                      <span>Générer Auto</span>
                    </button>
                  </div>

                  <div className="relative flex items-center">
                    <input
                      type={showPasswordInModal ? "text" : "password"}
                      required
                      value={newPasswordInput}
                      onChange={(e) => setNewPasswordInput(e.target.value)}
                      placeholder="Saisissez ou générez un mot de passe..."
                      className="w-full bg-[#181818] border border-white/10 focus:border-amber-500/60 rounded-xl p-3 text-xs font-mono text-white focus:outline-none pr-10 shadow-inner"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordInModal(!showPasswordInModal)}
                      className="absolute right-3 text-slate-400 hover:text-white p-1 cursor-pointer"
                      title={showPasswordInModal ? "Masquer" : "Afficher"}
                    >
                      {showPasswordInModal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {/* Password strength meter */}
                  {newPasswordInput.length > 0 && (() => {
                    const pwd = newPasswordInput;
                    let score = 0;
                    if (pwd.length >= 6) score += 1;
                    if (pwd.length >= 10) score += 1;
                    if (/[A-Z]/.test(pwd)) score += 1;
                    if (/[0-9]/.test(pwd)) score += 1;
                    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

                    let strengthLabel = "Très Faible";
                    let colorClass = "bg-red-500 text-red-400";
                    if (score === 2) { strengthLabel = "Faible"; colorClass = "bg-orange-500 text-orange-400"; }
                    if (score === 3) { strengthLabel = "Moyen"; colorClass = "bg-amber-500 text-amber-400"; }
                    if (score === 4) { strengthLabel = "Fort"; colorClass = "bg-emerald-500 text-emerald-400"; }
                    if (score >= 5) { strengthLabel = "Très Fort"; colorClass = "bg-emerald-400 text-emerald-300"; }

                    return (
                      <div className="mt-2.5 p-2.5 bg-[#151515] border border-white/5 rounded-lg space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className="text-slate-400">Robustesse du mot de passe :</span>
                          <span className={`font-bold ${colorClass.split(' ')[1]}`}>{strengthLabel}</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden flex">
                          <div
                            className={`h-full transition-all duration-300 ${colorClass.split(' ')[0]}`}
                            style={{ width: `${(score / 5) * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2.5 text-xs text-amber-200/90 font-sans">
                  <ShieldCheck className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    Ce mot de passe permettra à <strong>{passwordModalUser.name}</strong> de se connecter avec son identifiant (<strong>{passwordModalUser.email}</strong>).
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsPasswordModalOpen(false)}
                    className="px-4 py-2.5 bg-[#1a1a1a] hover:bg-white/10 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingPassword || !newPasswordInput.trim()}
                    className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-[#D4AF37] hover:from-amber-400 hover:to-[#E5C158] text-slate-950 font-display font-extrabold rounded-xl text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border-none"
                  >
                    {isSavingPassword ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
                        <span>Enregistrement...</span>
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 text-slate-950" />
                        <span>Enregistrer le Mot de Passe</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AUDIT LOG INSPECTION MODAL */}
      <AnimatePresence>
        {selectedLogModal && (
          <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="bg-[#121212] border border-[#D4AF37]/30 rounded-2xl max-w-lg w-full shadow-2xl no-print max-h-[90vh] overflow-y-auto my-4 sm:my-8"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-white/10 flex justify-between items-center bg-[#181818]">
                <div className="flex items-center space-x-3">
                  <div className="h-9 w-9 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37] flex items-center justify-center border border-[#D4AF37]/20">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-display text-sm font-bold text-white uppercase tracking-wider">
                      Fiche d'Inspection du Log d'Audit
                    </h3>
                    <p className="text-[11px] text-slate-400 font-mono">
                      ID Référence: {selectedLogModal.id}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedLogModal(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3 bg-[#181818] p-3.5 rounded-xl border border-white/5">
                  <div>
                    <span className="text-[11px] uppercase font-bold text-slate-500 block">Horodatage Officiel</span>
                    <span className="text-xs font-mono font-bold text-white">
                      {new Date(selectedLogModal.timestamp).toLocaleString("fr-FR")}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] uppercase font-bold text-slate-500 block">Agent Responsable</span>
                    <span className="text-xs font-bold text-[#D4AF37] block">
                      {selectedLogModal.userName}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">
                      {selectedLogModal.userRole}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] uppercase font-bold text-slate-500 block">Type d'Opération</span>
                  <div className="flex items-center gap-2">
                    {getActionBadge(selectedLogModal.action)}
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                      Catégorie: {getLogCategory(selectedLogModal).toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] uppercase font-bold text-slate-500 block">Détail Opérationnel Renseigné</span>
                  <div className="p-3 bg-[#181818] border border-white/5 rounded-xl text-xs text-slate-200 font-sans leading-relaxed">
                    {selectedLogModal.details}
                  </div>
                </div>

                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between text-xs text-emerald-400 font-mono">
                  <span className="flex items-center gap-1.5 font-bold">
                    <Check className="h-4 w-4" />
                    <span>Empreinte de Sécurité UR-GEDT</span>
                  </span>
                  <span className="text-[11px] text-emerald-300">Intégrité Validée</span>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-white/10 bg-[#181818] flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(selectedLogModal, null, 2));
                    addToast("Détails du log copiés dans le presse-papier", "success", "Traçabilité");
                  }}
                  className="px-3 py-2 bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <FileText className="h-3.5 w-3.5 text-[#D4AF37]" />
                  <span>Copier les détails</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedLogModal(null)}
                  className="px-4 py-2 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black font-bold rounded-xl text-xs transition-all cursor-pointer shadow-md"
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Toast Notification Stack */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* FLOATING CORNER SYNC BADGE (BOTTOM RIGHT) */}
      <div className="fixed bottom-4 right-4 z-40 no-print flex items-center gap-2">
        <motion.div 
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.3 }}
          onClick={() => onSyncOfflineQueue?.(true)}
          className="bg-[#121212]/95 backdrop-blur-md border border-white/10 hover:border-[#D4AF37]/60 shadow-2xl rounded-xl px-3 py-2 flex items-center space-x-2 text-xs font-mono group cursor-pointer transition-all"
          title="Dernière synchronisation réussie avec le serveur. Cliquer pour forcer une nouvelle synchronisation."
        >
          <div className="flex items-center justify-center p-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 group-hover:scale-105 transition-transform">
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin text-blue-400" : ""}`} />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`}></span>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider group-hover:text-slate-200">
                {isOnline ? "Synchro Serveur" : "Mode Hors-Ligne"}
              </span>
            </div>
            <span className="text-[11px] font-bold text-emerald-400 font-mono">
              {formatSyncTimestamp(lastSyncTime)}
            </span>
          </div>
        </motion.div>
      </div>

    </div>
  );
}
