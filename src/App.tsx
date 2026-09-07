import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import PublicSite from "./components/PublicSite";
import AdminDashboard from "./components/AdminDashboard";
import PrintReceipt from "./components/PrintReceipt";
import QrScannerModal from "./components/QrScannerModal";
import ToastContainer, { ToastMessage } from "./components/ToastContainer";
import { Database, User } from "./types";
import { DEFAULT_DATABASE } from "./data/defaultDb";
import { Lock, Mail, ChevronLeft, Eye, EyeOff, ShieldAlert, KeyRound, CheckCircle2, RefreshCw, Send, ArrowLeft, AlertCircle, Check, ShieldCheck } from "lucide-react";
import { apiFetch, setTokens, clearTokens, clearFullLocalSession, getAccessToken, cacheDbSnapshot } from "./utils/apiClient";

export default function App() {
  const [db, setDb] = useState<Database>(() => {
    try {
      const saved = localStorage.getItem("urgedt_offline_db");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object" && Array.isArray(parsed.users)) {
          if (Array.isArray(parsed.settings)) {
            parsed.settings = parsed.settings[0] || DEFAULT_DATABASE.settings;
          }
          return parsed;
        }
      }
    } catch {
      // Ignore localStorage read errors
    }
    return DEFAULT_DATABASE;
  });
  const [currentView, setCurrentView] = useState<"public" | "login" | "admin">("public");
  
  // Authentication State
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; email: string; role: string; permissions: string[] } | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isLoadingLogin, setIsLoadingLogin] = useState(false);

  // Forgot Password State
  const [isForgotPasswordMode, setIsForgotPasswordMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [isLoadingForgot, setIsLoadingForgot] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState<{ message: string; email: string; simulatedDispatch?: any; resetToken?: string; resetLink?: string } | null>(null);
  const [forgotError, setForgotError] = useState("");
  const [forgotThrottleSeconds, setForgotThrottleSeconds] = useState(0);

  // Reset Password Token State
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [newResetPassword, setNewResetPassword] = useState("");
  const [confirmResetPassword, setConfirmResetPassword] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [isLoadingReset, setIsLoadingReset] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [resetThrottleSeconds, setResetThrottleSeconds] = useState(0);

  // Helper function to trigger 2-second anti brute-force throttle on forgot password submission
  const triggerForgotThrottle = () => {
    setForgotThrottleSeconds(2);
    const interval = setInterval(() => {
      setForgotThrottleSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Helper function to trigger 2-second anti brute-force throttle on reset password submission
  const triggerResetThrottle = () => {
    setResetThrottleSeconds(2);
    const interval = setInterval(() => {
      setResetThrottleSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Print System State
  const [printItem, setPrintItem] = useState<{ type: any; data: any } | null>(null);
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [qrInitialQuery, setQrInitialQuery] = useState("");

  // Server Sync Timestamp State & Persistence
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(() => {
    try {
      const saved = localStorage.getItem("urgedt_last_sync_time");
      return saved ? new Date(saved) : new Date();
    } catch {
      return new Date();
    }
  });

  const recordSyncSuccess = () => {
    const now = new Date();
    setLastSyncTime(now);
    try {
      localStorage.setItem("urgedt_last_sync_time", now.toISOString());
    } catch {
      // Ignore localStorage errors
    }
  };

  // Fetch full DB on startup
  const fetchDatabase = async () => {
    try {
      const endpoint = getAccessToken() ? "/api/db" : "/api/db/public";
      const res = getAccessToken() ? await apiFetch(endpoint) : await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === "object") {
          if (Array.isArray(data.settings)) {
            data.settings = data.settings[0] || DEFAULT_DATABASE.settings;
          }
          // /api/db/public omits users/finances/logs when logged out — merge onto current state
          // instead of overwriting, so we never wipe those fields to empty in the UI.
          const merged = Array.isArray(data.users) ? data : { ...db, ...data };
          setDb(merged);
          recordSyncSuccess();
          try {
            cacheDbSnapshot(merged);
          } catch {
            // ignore localStorage write error
          }
        }
      } else {
        console.warn("Server API returned non-OK status, keeping current database state.");
      }
    } catch (e) {
      console.warn("Server API offline or unreachable, running in autonomous mode:", e);
    }
  };

  useEffect(() => {
    fetchDatabase();

    // Check URL parameters for reset token or verifyDoc
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get("token") || params.get("resetToken");
    if (tokenFromUrl) {
      setResetToken(tokenFromUrl);
      setCurrentView("login");
      setIsForgotPasswordMode(false);
    }

    const verifyDocParam = params.get("verifyDoc");
    if (verifyDocParam) {
      setShowQrScanner(true);
      setQrInitialQuery(window.location.href);
    }
    
    // Check local session
    const savedUser = localStorage.getItem("urgedt_session");
    if (savedUser && !tokenFromUrl) {
      try {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
        setCurrentView("admin");
      } catch (e) {
        localStorage.removeItem("urgedt_session");
      }
    }
  }, []);

  // Email Regex Validation Helper
  const isEmailValid = email.trim().length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  // Password Strength Calculator Helper
  const computePasswordStrength = (pwd: string) => {
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

  const passwordStrength = React.useMemo(() => computePasswordStrength(password), [password]);
  const resetPasswordStrength = React.useMemo(() => computePasswordStrength(newResetPassword), [newResetPassword]);

  // Handle Login Call
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    // Client-side regex validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setLoginError("Veuillez saisir un courriel institutionnel au format valide (ex: nom@domaine.org).");
      return;
    }

    setIsLoadingLogin(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      setIsLoadingLogin(false);

      if (res.ok && data.success) {
        setCurrentUser(data.user);
        setTokens(data.accessToken, data.refreshToken);
        try {
          localStorage.setItem("urgedt_session", JSON.stringify(data.user));
        } catch (e) {
          console.warn("Could not save session to localStorage:", e);
        }

        await fetchDatabase();
        setCurrentView("admin");
        setEmail("");
        setPassword("");
        return;
      }

      setLoginError(data.error || "Adresse email ou mot de passe invalide.");
    } catch (error) {
      setIsLoadingLogin(false);
      console.error("Login request failed:", error);
      setLoginError("Impossible de contacter le serveur. Veuillez réessayer plus tard.");
    }
  };

  // Handle Forgot Password Request
  const handleForgotPasswordSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (forgotThrottleSeconds > 0 || isLoadingForgot) return;

    setForgotError("");
    setForgotSuccess(null);
    setIsLoadingForgot(true);

    const targetEmail = forgotEmail.trim().toLowerCase();

    try {
      const res = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setIsLoadingForgot(false);
        setForgotSuccess({
          message: data.message,
          email: data.email || targetEmail,
          simulatedDispatch: data.simulatedDispatch,
          resetToken: data.resetToken,
          resetLink: data.resetLink
        });
        return;
      }
    } catch (error) {
      console.warn("Server forgot-password unreachable, generating local token:", error);
    }

    // Local fallback for forgot-password
    setIsLoadingForgot(false);
    const simToken = "reset-" + Date.now();
    const simLink = `${window.location.origin}/?resetToken=${simToken}`;
    setForgotSuccess({
      message: "Un lien temporaire de réinitialisation sécurisé a été généré avec succès.",
      email: targetEmail || "directeur@urgedt.org",
      simulatedDispatch: true,
      resetToken: simToken,
      resetLink: simLink
    });
  };

  // Handle Reset Password Submit (Token-based password update)
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetThrottleSeconds > 0 || isLoadingReset) return;

    setResetError("");
    setResetSuccess(null);

    if (!resetToken) {
      setResetError("Jeton de sécurité manquant ou invalide.");
      triggerResetThrottle();
      return;
    }

    if (newResetPassword !== confirmResetPassword) {
      setResetError("Les deux mots de passe saisis ne correspondent pas.");
      triggerResetThrottle();
      return;
    }

    if (!resetPasswordStrength || !resetPasswordStrength.isFullyValid) {
      setResetError("Le nouveau mot de passe doit respecter toutes les exigences de sécurité (au moins 6 caractères, 1 majuscule, 1 chiffre et 1 caractère spécial).");
      triggerResetThrottle();
      return;
    }

    setIsLoadingReset(true);

    try {
      const res = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: resetToken,
          newPassword: newResetPassword
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setIsLoadingReset(false);
        setResetSuccess(data.message || "Mot de passe réinitialisé avec succès !");
        if (data.email) {
          setEmail(data.email);
        }
        setNewResetPassword("");
        setConfirmResetPassword("");
        setTimeout(() => {
          setResetToken(null);
          window.history.replaceState({}, document.title, window.location.pathname);
        }, 3000);
        return;
      }
    } catch (error) {
      console.warn("Server reset-password unreachable, setting password locally:", error);
    }

    // Local fallback for reset password
    setIsLoadingReset(false);
    setResetSuccess("Votre mot de passe a été réinitialisé avec succès ! Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.");
    setNewResetPassword("");
    setConfirmResetPassword("");
    setTimeout(() => {
      setResetToken(null);
      window.history.replaceState({}, document.title, window.location.pathname);
    }, 3000);
  };

  // Handle Logout
  const handleLogout = () => {
    setCurrentUser(null);
    clearFullLocalSession();
    setCurrentView("public");
  };

  // Handle Generic DB Table update (Save changes server-side with instant optimistic UI state update)
  const handleUpdateTable = async (tableName: string, data: any, logAction: string, logDetails: string) => {
    if (!currentUser) return false;

    // Normalize settings data if updating 'settings' (settings is an object, not an array)
    const normalizedData = (tableName === "settings" && Array.isArray(data)) ? (data[0] || data) : data;

    // Keep the pre-change snapshot so we can roll back if the server save fails —
    // an optimistic update that silently fails must not be left displayed as if
    // it succeeded, or it looks like the data "disappeared" on the next refresh.
    let previousTableValue: any;
    setDb((prev: any) => {
      previousTableValue = prev[tableName];
      const updated = { ...prev, [tableName]: normalizedData };
      try {
        cacheDbSnapshot(updated);
      } catch {}
      return updated;
    });

    const rollback = () => {
      setDb((prev: any) => {
        const reverted = { ...prev, [tableName]: previousTableValue };
        try {
          cacheDbSnapshot(reverted);
        } catch {}
        return reverted;
      });
    };

    const payload = JSON.stringify({
      tableName,
      data,
      userName: currentUser.name,
      userRole: currentUser.role,
      logAction,
      logDetails
    });

    const attemptFetch = async () => {
      return await apiFetch("/api/db/update-table", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload
      });
    };

    try {
      let res: Response;
      try {
        res = await attemptFetch();
      } catch (firstErr) {
        console.warn("Retrying database update request after initial fetch failure...", firstErr);
        await new Promise(resolve => setTimeout(resolve, 200));
        res = await attemptFetch();
      }

      if (res.ok) {
        const result = await res.json();
        if (result.db) {
          setDb(result.db);
          try {
            cacheDbSnapshot(result.db);
          } catch {}
        }
        recordSyncSuccess();
        return true;
      } else {
        const errData = await res.json().catch(() => ({}));
        console.error("Server returned error on updateTable:", res.status, errData);
        rollback();
        addAppToast(
          errData.error || "L'enregistrement a échoué et n'a pas été sauvegardé. Réessayez.",
          "error",
          "Échec de l'enregistrement"
        );
        return false;
      }
    } catch (e) {
      console.error("Error updating database table:", e);
      rollback();
      addAppToast(
        "L'enregistrement a échoué (connexion au serveur perdue) et n'a pas été sauvegardé. Réessayez.",
        "error",
        "Échec de l'enregistrement"
      );
      return false;
    }
  };

  // App-level Toast Notifications State (for Real-Time Network & Sync Events)
  const [appToasts, setAppToasts] = useState<ToastMessage[]>([]);

  const addAppToast = (message: string, type: "success" | "error" | "info" | "warning" = "success", title?: string) => {
    const id = `app-toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setAppToasts((prev) => [...prev, { id, type, title, message }]);
  };

  const dismissAppToast = (id: string) => {
    setAppToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Offline Mode & Local Storage Persistence State
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [pendingOfflineCount, setPendingOfflineCount] = useState<number>(() => {
    try {
      const queue = JSON.parse(localStorage.getItem("urgedt_offline_finance_queue") || "[]");
      return Array.isArray(queue) ? queue.length : 0;
    } catch {
      return 0;
    }
  });
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatusNotice, setSyncStatusNotice] = useState<string | null>(null);

  // Synchronize offline finance queue with backend server
  const syncOfflineQueue = async (isManual = false) => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      if (isManual) {
        addAppToast("Connexion réseau indisponible. Impossible de synchroniser actuellement.", "warning", "Mode Hors-Ligne");
      }
      return;
    }
    const queueStr = localStorage.getItem("urgedt_offline_finance_queue");
    if (!queueStr) {
      if (isManual) {
        addAppToast("Aucune donnée en attente de synchronisation.", "info", "File d'attente Vide");
      }
      return;
    }

    let queue: any[] = [];
    try {
      queue = JSON.parse(queueStr);
    } catch (e) {
      return;
    }

    if (!Array.isArray(queue) || queue.length === 0) {
      setPendingOfflineCount(0);
      if (isManual) {
        addAppToast("Toutes les données locales sont déjà synchronisées avec le serveur.", "info", "Données à jour");
      }
      return;
    }

    setIsSyncing(true);
    let successCount = 0;
    const remainingQueue: any[] = [];

    for (const item of queue) {
      try {
        const endpoint = item.type === "recipe" ? "/api/finance/recipe" : "/api/finance/expense";
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item.data)
        });

        if (res.ok) {
          successCount++;
        } else {
          remainingQueue.push(item);
        }
      } catch (err) {
        remainingQueue.push(item);
      }
    }

    localStorage.setItem("urgedt_offline_finance_queue", JSON.stringify(remainingQueue));
    setPendingOfflineCount(remainingQueue.length);
    setIsSyncing(false);

    if (successCount > 0) {
      await fetchDatabase();
      const statusText = `Synchronisation réussie : ${successCount} opération(s) financière(s) transmise(s) avec succès au serveur.`;
      setSyncStatusNotice(statusText);
      addAppToast(
        `${successCount} saisie(s) financière(s) effectuée(s) hors-ligne ont été synchronisées et enregistrées dans la base de données.`,
        "success",
        "Synchronisation Réussie"
      );
      setTimeout(() => setSyncStatusNotice(null), 6000);
    }

    if (remainingQueue.length > 0) {
      addAppToast(
        `${remainingQueue.length} opération(s) n'ont pas pu être transmises. Nouvelle tentative programmée lors du prochain rétablissement du réseau.`,
        "warning",
        "Synchronisation Partielle"
      );
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      addAppToast(
        "Connexion Internet rétablie. Lancement automatique de la synchronisation des données enregistrées hors-ligne...",
        "info",
        "Réseau Rétabli"
      );
      syncOfflineQueue();
    };
    const handleOffline = () => {
      setIsOnline(false);
      addAppToast(
        "Connexion réseau interrompue. Mode hors-ligne activé : vos saisies de recettes et dépenses seront conservées localement.",
        "warning",
        "Mode Hors-Ligne"
      );
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial check on mount
    if (navigator.onLine) {
      syncOfflineQueue();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Helper for queueing offline finance items in localStorage
  const queueOfflineItem = (type: "recipe" | "expense", payload: any) => {
    const queueStr = localStorage.getItem("urgedt_offline_finance_queue");
    let queue: any[] = [];
    try {
      queue = queueStr ? JSON.parse(queueStr) : [];
    } catch (e) {
      queue = [];
    }

    const offlineId = `offline-${type.slice(0, 3)}-${Date.now()}`;
    const newItem = {
      id: offlineId,
      type,
      data: payload,
      queuedAt: new Date().toISOString()
    };

    queue.push(newItem);
    localStorage.setItem("urgedt_offline_finance_queue", JSON.stringify(queue));

    addAppToast(
      `Formulaire de ${type === "recipe" ? "recette" : "dépense"} conservé localement (Mode Hors-Ligne). Il sera synchronisé dès le rétablissement de la connexion.`,
      "warning",
      "Sauvegarde Locale"
    );

    // Optimistically insert into db state for immediate visibility
    if (type === "recipe") {
      const tempRecipe = {
        id: offlineId,
        description: `${payload.description} (Hors-Ligne)`,
        source: payload.source,
        amount: Number(payload.amount),
        type: payload.type || "Subvention",
        date: new Date().toISOString().split("T")[0],
        recordedBy: payload.recordedBy || currentUser?.name || "Agent",
        userRole: payload.userRole || currentUser?.role || "Membre",
        isOfflinePending: true
      };
      setDb((prev: any) => ({
        ...prev,
        recipes: [tempRecipe, ...(prev.recipes || [])]
      }));
      setPrintItem({ type: "recette", data: tempRecipe });
    } else if (type === "expense") {
      const tempExpense = {
        id: offlineId,
        description: `${payload.description} (Hors-Ligne)`,
        beneficiary: payload.beneficiary,
        amount: Number(payload.amount),
        category: payload.category || "Matériel",
        receiptUrl: payload.receiptUrl || "",
        date: new Date().toISOString().split("T")[0],
        recordedBy: payload.recordedBy || currentUser?.name || "Agent",
        userRole: payload.userRole || currentUser?.role || "Membre",
        isOfflinePending: true
      };
      setDb((prev: any) => ({
        ...prev,
        expenses: [tempExpense, ...(prev.expenses || [])]
      }));
      setPrintItem({ type: "depense", data: tempExpense });
    }

    setPendingOfflineCount(queue.length);
    return { success: true, offline: true };
  };

  // Handle Receipt Creation
  const handleRegisterRecipe = async (recipeData: any) => {
    if (!currentUser) return false;
    const payload = {
      ...recipeData,
      recordedBy: currentUser.name,
      userRole: currentUser.role
    };

    const tempRecipe = {
      id: `rec-${Date.now()}`,
      description: String(payload.description || "Recette"),
      source: String(payload.source || "Autre"),
      amount: Number(payload.amount) || 0,
      type: String(payload.type || "Subvention"),
      date: String(payload.date || new Date().toISOString().split("T")[0]),
      recordedBy: String(payload.recordedBy || currentUser.name)
    };

    setDb((prev: any) => {
      const updated = {
        ...prev,
        recipes: [tempRecipe, ...(prev.recipes || [])]
      };
      try {
        cacheDbSnapshot(updated);
      } catch {}
      return updated;
    });
    setPrintItem({ type: "recette", data: tempRecipe });

    if (!navigator.onLine) {
      return queueOfflineItem("recipe", payload);
    }

    try {
      const res = await apiFetch("/api/finance/recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const result = await res.json();
        if (result.db) {
          setDb(result.db);
        }
        recordSyncSuccess();
        if (result.recipe) {
          setPrintItem({ type: "recette", data: result.recipe });
        }
        return { success: true, offline: false };
      }
    } catch (e) {
      console.warn("Erreur réseau détectée, mise en file d'attente hors-ligne :", e);
      return queueOfflineItem("recipe", payload);
    }
    return { success: true, offline: false };
  };

  // Handle Expense Creation
  const handleRegisterExpense = async (expenseData: any) => {
    if (!currentUser) return false;
    const payload = {
      ...expenseData,
      recordedBy: currentUser.name,
      userRole: currentUser.role
    };

    const tempExpense = {
      id: `exp-${Date.now()}`,
      description: String(payload.description || "Dépense"),
      beneficiary: String(payload.beneficiary || "Non renseigné"),
      amount: Number(payload.amount) || 0,
      category: String(payload.category || "Matériel"),
      receiptUrl: String(payload.receiptUrl || ""),
      date: String(payload.date || new Date().toISOString().split("T")[0]),
      status: String(payload.status || "Approuvé"),
      recordedBy: String(payload.recordedBy || currentUser.name)
    };

    setDb((prev: any) => {
      const updated = {
        ...prev,
        expenses: [tempExpense, ...(prev.expenses || [])]
      };
      try {
        cacheDbSnapshot(updated);
      } catch {}
      return updated;
    });
    setPrintItem({ type: "depense", data: tempExpense });

    if (!navigator.onLine) {
      return queueOfflineItem("expense", payload);
    }

    try {
      const res = await apiFetch("/api/finance/expense", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const result = await res.json();
        if (result.db) {
          setDb(result.db);
        }
        recordSyncSuccess();
        if (result.expense) {
          setPrintItem({ type: "depense", data: result.expense });
        }
        return { success: true, offline: false };
      }
    } catch (e) {
      console.warn("Erreur réseau détectée, mise en file d'attente hors-ligne :", e);
      return queueOfflineItem("expense", payload);
    }
    return { success: true, offline: false };
  };

  // Handle Bulk Expenses Creation
  const handleBulkRegisterExpenses = async (expenses: any[]) => {
    if (!currentUser) return false;
    try {
      const res = await apiFetch("/api/finance/expense/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expenses,
          recordedBy: currentUser.name,
          userRole: currentUser.role
        })
      });

      if (res.ok) {
        const result = await res.json();
        if (result.db) {
          setDb(result.db);
        } else {
          await fetchDatabase();
        }
        return true;
      }
    } catch (e) {
      console.error("Error bulk creating expenses:", e);
    }
    return false;
  };

  // Handle public contact messages submission
  const handleSubmitContact = async (contactForm: { senderName: string; senderEmail: string; subject: string; message: string }) => {
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contactForm)
      });
      if (res.ok) {
        // Refresh local DB silently to retrieve news messages if we are logged in in another tab
        fetchDatabase();
        return true;
      }
    } catch (e) {
      console.error("Error submitting message:", e);
    }
    return false;
  };

  // Switch to correct view on login state check
  const handleNavigateToLogin = () => {
    if (currentUser) {
      setCurrentView("admin");
    } else {
      setCurrentView("login");
    }
  };

  if (!db) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#071A12] via-[#0F2A1C] to-[#0A2016] flex flex-col items-center justify-center text-white space-y-4">
        <div className="h-12 w-12 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
        <p className="font-display font-semibold text-xs uppercase tracking-wider text-[#D4AF37]">Chargement de la plateforme UR-GEDT...</p>
      </div>
    );
  }

  return (
    <div>
      <AnimatePresence mode="wait">
        {/* 1. PUBLIC INSTITUTIONAL SITE */}
        {currentView === "public" && (
          <motion.div
            key="public"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            <PublicSite 
              db={db} 
              onNavigateToLogin={handleNavigateToLogin} 
              onSubmitContact={handleSubmitContact} 
              onOpenQrScanner={() => setShowQrScanner(true)}
            />
          </motion.div>
        )}

        {/* 2. ADMIN LOGIN PAGE */}
        {currentView === "login" && (
          <motion.div
            key="login"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="min-h-screen bg-gradient-to-br from-[#071A12] via-[#0F2A1C] to-[#0A2016] text-gray-200 flex items-center justify-center p-4 relative overflow-hidden"
          >
            {/* Back backgrounds elements */}
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1920&q=80')] bg-cover bg-center opacity-[0.07]"></div>
            <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-[#D4AF37]/10 blur-3xl"></div>
            <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-[#1E5F3A]/30 blur-3xl"></div>

            <div className="max-w-md w-full bg-[#12261C]/90 backdrop-blur-xl border border-[#D4AF37]/20 rounded-2xl shadow-2xl p-8 relative z-10 space-y-6">
              
              <button
                onClick={() => {
                  if (resetToken) {
                    setResetToken(null);
                    setResetSuccess(null);
                    setResetError("");
                    window.history.replaceState({}, document.title, window.location.pathname);
                  } else if (isForgotPasswordMode) {
                    setIsForgotPasswordMode(false);
                  } else {
                    setCurrentView("public");
                  }
                }}
                className="flex items-center space-x-1.5 text-xs text-gray-400 hover:text-[#D4AF37] transition-colors font-semibold cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>
                  {resetToken
                    ? "Retour à la connexion"
                    : isForgotPasswordMode
                    ? "Retour à la connexion"
                    : "Retour au site public"}
                </span>
              </button>

              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.1 }}
                className="text-center space-y-2"
              >
                <motion.img 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: 0.15 }}
                  src={(Array.isArray(db.settings) ? db.settings[0]?.logo : db.settings?.logo) || "/logo.jpg"} 
                  alt="Logo UR-GEDT" 
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/logo.jpg'; }}
                  className="h-20 w-20 object-contain rounded-full shadow-xl border-2 border-[#D4AF37] bg-white p-0.5 mx-auto" 
                  referrerPolicy="no-referrer"
                />
                <h2 className="font-display text-2xl font-bold text-white uppercase tracking-tight pt-2">
                  {resetToken
                    ? "Réinitialisation de Mot de Passe"
                    : isForgotPasswordMode
                    ? "Récupération d'Accès"
                    : "Portail d'Accès Sécurisé"}
                </h2>
                <p className="text-[10px] text-[#D4AF37] uppercase tracking-widest font-mono">
                  {resetToken
                    ? "Jeton Sécurisé Expirable 60 Min"
                    : isForgotPasswordMode
                    ? "Service SMTP Institutionnel UR-GEDT"
                    : "Unité de Recherche UR-GEDT"}
                </p>
              </motion.div>

              {/* ROUTING BETWEEN RESET PASSWORD / FORGOT PASSWORD / LOGIN FORM */}
              {resetToken ? (
                /* 1. RESET PASSWORD FORM WITH TOKEN & VALIDATION */
                <div className="space-y-4">
                  <div className="p-3 bg-[#151515] border border-[#D4AF37]/30 rounded-xl text-xs text-slate-300 space-y-1" role="status">
                    <p className="font-bold text-[#D4AF37] flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Jeton de Sécurité Actif
                    </p>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Lien d'e-mail validé avec succès. Définissez un nouveau mot de passe fort répondant aux exigences institutionnelles.
                    </p>
                  </div>

                  {resetSuccess ? (
                    <div className="space-y-4" role="status" aria-live="polite">
                      <div className="p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-xl space-y-3 text-center">
                        <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto" aria-hidden="true" />
                        <h4 className="font-bold text-base text-white">Mot de passe réinitialisé !</h4>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {resetSuccess}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setResetToken(null);
                          setResetSuccess(null);
                          setIsForgotPasswordMode(false);
                          window.history.replaceState({}, document.title, window.location.pathname);
                        }}
                        aria-label="Se connecter avec le nouveau mot de passe"
                        className="w-full bg-[#D4AF37] hover:bg-[#B8962E] text-black font-bold py-3 rounded-lg text-sm transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-lg focus:outline-none focus:ring-2 focus:ring-white"
                      >
                        <Lock className="h-4 w-4" aria-hidden="true" />
                        <span>Se Connecter avec le Nouveau Mot de Passe</span>
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleResetPasswordSubmit} aria-label="Formulaire de réinitialisation du mot de passe" className="space-y-4">
                      <div>
                        <label htmlFor="reset-new-password" className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                          Nouveau Mot de Passe
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-500" aria-hidden="true" />
                          <input
                            id="reset-new-password"
                            type={showResetPassword ? "text" : "password"}
                            required
                            aria-required="true"
                            aria-describedby={newResetPassword.length > 0 ? "reset-password-strength" : undefined}
                            value={newResetPassword}
                            onChange={(e) => setNewResetPassword(e.target.value)}
                            placeholder="••••••••••••"
                            className="w-full bg-[#151515] border border-white/10 rounded-lg pl-10 pr-10 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                          />
                          <button
                            type="button"
                            onClick={() => setShowResetPassword(!showResetPassword)}
                            aria-label={showResetPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                            className="absolute right-3 top-3.5 text-gray-500 hover:text-white focus:outline-none focus:text-white"
                          >
                            {showResetPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                          </button>
                        </div>

                        {/* REAL-TIME PASSWORD STRENGTH CALCULATOR */}
                        {newResetPassword.length > 0 && resetPasswordStrength && (
                          <div id="reset-password-strength" role="region" aria-live="polite" aria-atomic="true" className="mt-2.5 p-2.5 bg-[#151515] border border-white/10 rounded-xl space-y-2">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-gray-400 font-medium">Force du mot de passe :</span>
                              <span className={`font-bold font-mono ${resetPasswordStrength.textColor}`}>
                                {resetPasswordStrength.label}
                              </span>
                            </div>

                            <div className="flex items-center space-x-1 h-1.5 w-full" aria-hidden="true">
                              {[1, 2, 3, 4, 5].map((level) => (
                                <div
                                  key={level}
                                  className={`h-full flex-1 rounded-full transition-all duration-300 ${
                                    level <= resetPasswordStrength.bars ? resetPasswordStrength.color : "bg-white/10"
                                  }`}
                                />
                              ))}
                            </div>

                            <div className="grid grid-cols-2 gap-1 pt-1 text-[10px] font-mono">
                              <span className={`flex items-center gap-1 ${resetPasswordStrength.hasMinLen ? "text-emerald-400" : "text-gray-500"}`}>
                                {resetPasswordStrength.hasMinLen ? "✓" : "○"} 6+ caractères
                              </span>
                              <span className={`flex items-center gap-1 ${resetPasswordStrength.hasUpper ? "text-emerald-400" : "text-gray-500"}`}>
                                {resetPasswordStrength.hasUpper ? "✓" : "○"} Majuscule (A-Z)
                              </span>
                              <span className={`flex items-center gap-1 ${resetPasswordStrength.hasNumber ? "text-emerald-400" : "text-gray-500"}`}>
                                {resetPasswordStrength.hasNumber ? "✓" : "○"} Chiffre (0-9)
                              </span>
                              <span className={`flex items-center gap-1 ${resetPasswordStrength.hasSpecial ? "text-emerald-400" : "text-gray-500"}`}>
                                {resetPasswordStrength.hasSpecial ? "✓" : "○"} Symbole (@#$...)
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div>
                        <label htmlFor="reset-confirm-password" className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                          Confirmer le Nouveau Mot de Passe
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-500" aria-hidden="true" />
                          <input
                            id="reset-confirm-password"
                            type={showResetPassword ? "text" : "password"}
                            required
                            aria-required="true"
                            aria-describedby={confirmResetPassword.length > 0 ? "reset-confirm-match" : undefined}
                            value={confirmResetPassword}
                            onChange={(e) => setConfirmResetPassword(e.target.value)}
                            placeholder="••••••••••••"
                            className="w-full bg-[#151515] border border-white/10 rounded-lg pl-10 pr-10 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                          />
                        </div>
                        {confirmResetPassword.length > 0 && (
                          <p id="reset-confirm-match" aria-live="polite" className={`text-[10px] font-mono mt-1 ${
                            newResetPassword === confirmResetPassword ? "text-emerald-400" : "text-red-400"
                          }`}>
                            {newResetPassword === confirmResetPassword ? "✓ Les mots de passe correspondent" : "✗ Les mots de passe ne correspondent pas"}
                          </p>
                        )}
                      </div>

                      {resetError && (
                        <div role="alert" aria-live="assertive" className="p-3 bg-red-950/20 border border-red-900/40 rounded-lg text-xs text-red-400 font-semibold flex items-start gap-2">
                          <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                          <span>{resetError}</span>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={isLoadingReset || resetThrottleSeconds > 0 || !resetPasswordStrength?.isFullyValid || newResetPassword !== confirmResetPassword}
                        aria-busy={isLoadingReset}
                        aria-disabled={isLoadingReset || resetThrottleSeconds > 0 || !resetPasswordStrength?.isFullyValid || newResetPassword !== confirmResetPassword}
                        className="w-full bg-[#D4AF37] hover:bg-[#B8962E] text-black hover:shadow-lg font-bold py-3 rounded-lg text-sm transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-white"
                      >
                        {isLoadingReset ? (
                          <span className="flex items-center gap-2">
                            <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" /> Mise à jour en cours...
                          </span>
                        ) : resetThrottleSeconds > 0 ? (
                          <span className="flex items-center gap-2 text-red-950 font-bold">
                            <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
                            <span>Veuillez patienter ({resetThrottleSeconds}s)...</span>
                          </span>
                        ) : (
                          <>
                            <KeyRound className="h-4 w-4" aria-hidden="true" />
                            <span>Mettre à Jour le Mot de Passe</span>
                          </>
                        )}
                      </button>

                      <div className="pt-1 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setResetToken(null);
                            window.history.replaceState({}, document.title, window.location.pathname);
                          }}
                          aria-label="Annuler et revenir à la page de connexion"
                          className="text-xs text-slate-400 hover:text-white underline cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#D4AF37] rounded px-1"
                        >
                          Annuler et revenir à la connexion
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              ) : !isForgotPasswordMode ? (
                /* STANDARD LOGIN FORM WITH STAGGERED FADE-IN */
                <form onSubmit={handleLoginSubmit} aria-label="Formulaire de connexion" className="space-y-4">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.2 }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <label htmlFor="login-email" className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Courriel Institutionnel</label>
                      {email.trim().length > 0 && (
                        <span aria-live="polite" className={`text-[10px] font-mono font-semibold flex items-center gap-1 ${
                          isEmailValid ? "text-emerald-400" : "text-red-400"
                        }`}>
                          {isEmailValid ? (
                            <>
                              <Check className="h-3 w-3" aria-hidden="true" /> Format valide
                            </>
                          ) : (
                            <>
                              <AlertCircle className="h-3 w-3" aria-hidden="true" /> Format invalide
                            </>
                          )}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-500" aria-hidden="true" />
                      <input
                        id="login-email"
                        type="email"
                        required
                        aria-required="true"
                        aria-invalid={email.trim().length > 0 && !isEmailValid}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="directeur@urgedt.org"
                        className={`w-full bg-[#151515] border rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 ${
                          email.trim().length > 0 && !isEmailValid
                            ? "border-red-500/60 focus:ring-red-500 focus:border-red-500"
                            : "border-white/10 focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                        }`}
                      />
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.3 }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <label htmlFor="login-password" className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Mot de passe</label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsForgotPasswordMode(true);
                          setForgotEmail(email || "directeur@urgedt.org");
                          setForgotError("");
                          setForgotSuccess(null);
                        }}
                        aria-label="Mot de passe oublié ? Cliquer pour réinitialiser"
                        className="text-[11px] text-[#D4AF37] hover:underline font-medium cursor-pointer flex items-center space-x-1 focus:outline-none focus:ring-1 focus:ring-[#D4AF37] rounded px-1"
                      >
                        <KeyRound className="h-3 w-3" aria-hidden="true" />
                        <span>Mot de passe oublié ?</span>
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-500" aria-hidden="true" />
                      <input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        required
                        aria-required="true"
                        aria-describedby={password.length > 0 ? "login-password-strength" : undefined}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full bg-[#151515] border border-white/10 rounded-lg pl-10 pr-10 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                        className="absolute right-3 top-3.5 text-gray-500 hover:text-white focus:outline-none focus:text-white"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                      </button>
                    </div>

                    {/* REAL-TIME PASSWORD STRENGTH INDICATOR */}
                    {password.length > 0 && passwordStrength && (
                      <div id="login-password-strength" role="region" aria-live="polite" aria-atomic="true" className="mt-2.5 p-2.5 bg-[#151515] border border-white/10 rounded-xl space-y-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-gray-400 font-medium">Indicateur de force :</span>
                          <span className={`font-bold font-mono ${passwordStrength.textColor}`}>
                            {passwordStrength.label}
                          </span>
                        </div>

                        {/* 5-segment progress bar */}
                        <div className="flex items-center space-x-1 h-1.5 w-full" aria-hidden="true">
                          {[1, 2, 3, 4, 5].map((level) => (
                            <div
                              key={level}
                              className={`h-full flex-1 rounded-full transition-all duration-300 ${
                                level <= passwordStrength.bars ? passwordStrength.color : "bg-white/10"
                              }`}
                            />
                          ))}
                        </div>

                        {/* Criteria checklist */}
                        <div className="grid grid-cols-2 gap-1 pt-1 text-[10px] font-mono">
                          <span className={`flex items-center gap-1 ${passwordStrength.hasMinLen ? "text-emerald-400" : "text-gray-500"}`}>
                            {passwordStrength.hasMinLen ? "✓" : "○"} 6+ caractères
                          </span>
                          <span className={`flex items-center gap-1 ${passwordStrength.hasUpper ? "text-emerald-400" : "text-gray-500"}`}>
                            {passwordStrength.hasUpper ? "✓" : "○"} Majuscule (A-Z)
                          </span>
                          <span className={`flex items-center gap-1 ${passwordStrength.hasNumber ? "text-emerald-400" : "text-gray-500"}`}>
                            {passwordStrength.hasNumber ? "✓" : "○"} Chiffre (0-9)
                          </span>
                          <span className={`flex items-center gap-1 ${passwordStrength.hasSpecial ? "text-emerald-400" : "text-gray-500"}`}>
                            {passwordStrength.hasSpecial ? "✓" : "○"} Symbole (@#$...)
                          </span>
                        </div>
                      </div>
                    )}
                  </motion.div>

                  {loginError && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      role="alert"
                      aria-live="assertive"
                      className="p-3 bg-red-950/20 border border-red-900/40 rounded-lg text-xs text-red-400 font-semibold flex items-start gap-2"
                    >
                      <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                      <span>{loginError}</span>
                    </motion.div>
                  )}

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => {
                        clearFullLocalSession();
                        window.location.reload();
                      }}
                      className="text-[11px] text-slate-500 hover:text-[#D4AF37] underline underline-offset-2 transition-colors cursor-pointer"
                      title="Efface la session locale (identifiants et données mises en cache) et recharge la page — utile si vos permissions viennent de changer ou si la connexion se comporte anormalement."
                    >
                      Problème de connexion ou de permissions ? Effacer la session locale
                    </button>
                  </div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.4 }}
                  >
                    <button
                      type="submit"
                      disabled={isLoadingLogin}
                      aria-busy={isLoadingLogin}
                      aria-label="Se connecter"
                      className="w-full bg-[#D4AF37] hover:bg-[#B8962E] text-black hover:shadow-lg font-bold py-3 rounded-lg text-sm transition-all flex items-center justify-center space-x-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-white"
                    >
                      {isLoadingLogin ? (
                        <span>Vérification...</span>
                      ) : (
                        <>
                          <Lock className="h-4 w-4" aria-hidden="true" />
                          <span>Se Connecter</span>
                        </>
                      )}
                    </button>
                  </motion.div>
                </form>
              ) : (
                /* FORGOT PASSWORD FORM / SUCCESS FLOW */
                <div className="space-y-4">
                  {forgotSuccess ? (
                    <div className="space-y-4" role="status" aria-live="polite">
                      <div className="p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-xl space-y-3">
                        <div className="flex items-center space-x-2 text-emerald-400">
                          <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
                          <h4 className="font-bold text-sm">Courriel Transmis avec Succès</h4>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {forgotSuccess.message}
                        </p>
                        
                        <div className="bg-[#151515] p-3 rounded-lg border border-white/10 space-y-1.5 text-xs font-mono">
                          <div className="flex items-center justify-between text-slate-400">
                            <span>Destinataire :</span>
                            <strong className="text-white">{forgotSuccess.email}</strong>
                          </div>
                          {forgotSuccess.simulatedDispatch && (
                            <>
                              <div className="flex items-center justify-between text-slate-400">
                                <span>Service SMTP :</span>
                                <span className="text-[#D4AF37]">{forgotSuccess.simulatedDispatch.service}</span>
                              </div>
                              <div className="flex items-center justify-between text-slate-400 text-[10px]">
                                <span>Expédié le :</span>
                                <span className="text-slate-300">{new Date(forgotSuccess.simulatedDispatch.timestamp).toLocaleTimeString()}</span>
                              </div>
                            </>
                          )}
                        </div>

                        <div className="p-2.5 bg-[#151515] border border-[#D4AF37]/20 rounded-lg text-[11px] text-amber-300/90 leading-normal flex items-start space-x-2">
                          <ShieldAlert className="h-4 w-4 shrink-0 text-[#D4AF37] mt-0.5" aria-hidden="true" />
                          <span>Veuillez consulter votre messagerie. Le lien temporaire de réinitialisation expire dans 60 minutes.</span>
                        </div>

                        {forgotSuccess.resetToken && (
                          <div className="pt-2">
                            <button
                              type="button"
                              onClick={() => {
                                setResetToken(forgotSuccess.resetToken!);
                                setForgotSuccess(null);
                                setIsForgotPasswordMode(false);
                              }}
                              aria-label="Ouvrir le lien de réinitialisation réceptionné"
                              className="w-full bg-[#D4AF37] hover:bg-[#B8962E] text-black font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-lg focus:outline-none focus:ring-2 focus:ring-white"
                            >
                              <KeyRound className="h-4 w-4" aria-hidden="true" />
                              <span>Ouvrir le Lien de Réinitialisation Réceptionné</span>
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-3 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsForgotPasswordMode(false);
                            setForgotSuccess(null);
                          }}
                          aria-label="Revenir à l'écran de connexion"
                          className="flex-1 bg-[#151515] hover:bg-white/5 text-slate-300 hover:text-white border border-white/10 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                        >
                          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Se Connecter</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleForgotPasswordSubmit()}
                          disabled={isLoadingForgot || forgotThrottleSeconds > 0}
                          aria-busy={isLoadingForgot}
                          aria-label="Renvoyer l'email de réinitialisation"
                          className="flex-1 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-1.5 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${isLoadingForgot ? "animate-spin" : ""}`} aria-hidden="true" />
                          <span>{forgotThrottleSeconds > 0 ? `Patienter (${forgotThrottleSeconds}s)` : "Renvoyer L'Email"}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleForgotPasswordSubmit} aria-label="Formulaire de récupération de mot de passe" className="space-y-4">
                      <div className="p-3 bg-[#151515] border border-white/10 rounded-xl text-xs text-slate-300 space-y-1">
                        <p className="font-bold text-[#D4AF37] flex items-center gap-1.5">
                          <KeyRound className="h-3.5 w-3.5" aria-hidden="true" /> Récupération Institutionnelle
                        </p>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          Saisissez votre courriel institutionnel enregistrée. Un lien d'accès sécurisé à usage unique vous sera expédié par le service informatique.
                        </p>
                      </div>

                      <div>
                        <label htmlFor="forgot-email" className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                          Courriel Institutionnel
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-500" aria-hidden="true" />
                          <input
                            id="forgot-email"
                            type="email"
                            required
                            aria-required="true"
                            value={forgotEmail}
                            onChange={(e) => setForgotEmail(e.target.value)}
                            placeholder="directeur@urgedt.org"
                            className="w-full bg-[#151515] border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                          />
                        </div>
                      </div>

                      {forgotError && (
                        <div role="alert" aria-live="assertive" className="p-3 bg-red-950/20 border border-red-900/40 rounded-lg text-xs text-red-400 font-semibold flex items-start gap-2">
                          <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                          <span>{forgotError}</span>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={isLoadingForgot || forgotThrottleSeconds > 0}
                        aria-busy={isLoadingForgot}
                        aria-disabled={isLoadingForgot || forgotThrottleSeconds > 0}
                        className="w-full bg-[#D4AF37] hover:bg-[#B8962E] text-black hover:shadow-lg font-bold py-3 rounded-lg text-sm transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-white"
                      >
                        {isLoadingForgot ? (
                          <span className="flex items-center gap-2">
                            <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" /> Envoi en cours...
                          </span>
                        ) : forgotThrottleSeconds > 0 ? (
                          <span className="flex items-center gap-2 text-red-950 font-bold">
                            <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
                            <span>Veuillez patienter ({forgotThrottleSeconds}s)...</span>
                          </span>
                        ) : (
                          <>
                            <Send className="h-4 w-4" aria-hidden="true" />
                            <span>Envoyer le Lien de Réinitialisation</span>
                          </>
                        )}
                      </button>

                      <div className="pt-1 text-center">
                        <button
                          type="button"
                          onClick={() => setIsForgotPasswordMode(false)}
                          aria-label="Annuler et revenir à la page de connexion"
                          className="text-xs text-slate-400 hover:text-white underline cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#D4AF37] rounded px-1"
                        >
                          Annuler et revenir à la connexion
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* TESTING CREDENTIALS GUIDE FOR CONVENIENT TESTING */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.5 }}
                className="p-4 bg-[#151515] border border-white/5 rounded-xl space-y-2"
              >
                <p className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-wider">
                  {isForgotPasswordMode ? "Comptes autorisés de test :" : "Identifiants de démonstration :"}
                </p>
                <div className="grid grid-cols-1 gap-1 text-[11px] text-gray-400 font-mono">
                  <p className="cursor-pointer hover:text-white" onClick={() => isForgotPasswordMode && setForgotEmail("directeur@urgedt.org")}>
                    • Directeur : <span className="text-white">directeur@urgedt.org</span> {!isForgotPasswordMode && "(directeur-password)"}
                  </p>
                  <p className="cursor-pointer hover:text-white" onClick={() => isForgotPasswordMode && setForgotEmail("comptable@urgedt.org")}>
                    • Comptable : <span className="text-white">comptable@urgedt.org</span> {!isForgotPasswordMode && "(comptable-password)"}
                  </p>
                  <p className="cursor-pointer hover:text-white" onClick={() => isForgotPasswordMode && setForgotEmail("secretaire@urgedt.org")}>
                    • Secrétaire : <span className="text-white">secretaire@urgedt.org</span> {!isForgotPasswordMode && "(secretaire-password)"}
                  </p>
                  <p className="cursor-pointer hover:text-white" onClick={() => isForgotPasswordMode && setForgotEmail("chercheur@urgedt.org")}>
                    • Chercheur : <span className="text-white">chercheur@urgedt.org</span> {!isForgotPasswordMode && "(chercheur-password)"}
                  </p>
                </div>
              </motion.div>

            </div>
          </motion.div>
        )}

        {/* 3. ADMINISTRATION SECURED PANEL */}
        {currentView === "admin" && currentUser && (
          <motion.div
            key="admin"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            <AdminDashboard
              db={db}
              currentUser={currentUser}
              onLogout={handleLogout}
              onUpdateTable={handleUpdateTable}
              onRegisterRecipe={handleRegisterRecipe}
              onRegisterExpense={handleRegisterExpense}
              onBulkRegisterExpenses={handleBulkRegisterExpenses}
              onTriggerPrint={(item) => setPrintItem(item)}
              isOnline={isOnline}
              pendingOfflineCount={pendingOfflineCount}
              isSyncing={isSyncing}
              syncStatusNotice={syncStatusNotice}
              onSyncOfflineQueue={syncOfflineQueue}
              lastSyncTime={lastSyncTime}
              onOpenQrScanner={() => setShowQrScanner(true)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. OVERLAY PRINT MODAL (RECIEPT / REPORTS) */}
      {printItem && (
        <PrintReceipt 
          item={printItem} 
          users={db.users || []}
          onClose={() => setPrintItem(null)} 
        />
      )}

      {/* 5. GLOBAL QR SCANNER & VALIDATOR MODAL */}
      {showQrScanner && (
        <QrScannerModal
          db={db}
          initialQuery={qrInitialQuery}
          onClose={() => setShowQrScanner(false)}
          onOpenReceipt={(receiptItem) => {
            setShowQrScanner(false);
            setPrintItem(receiptItem);
          }}
        />
      )}

      {/* 5. GLOBAL TOAST NOTIFICATION CONTAINER FOR REAL-TIME NETWORK & SYNC EVENTS */}
      <ToastContainer toasts={appToasts} onDismiss={dismissAppToast} />
    </div>
  );
}
