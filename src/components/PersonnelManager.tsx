import React, { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { uploadFileToCloudinary, CloudinaryConfigError } from "../utils/cloudinaryUpload";
import {
  Users, UserPlus, Search, Edit, Trash2, Key, ShieldCheck, ShieldAlert,
  CheckCircle, RefreshCw, FileSpreadsheet, Eye, EyeOff, Sparkles,
  Printer, X, Check, Loader2, Phone, Mail, Building, Briefcase,
  AlertTriangle, QrCode, Lock, Filter, Grid, List, Copy, UserCheck, UserX,
  Radio, Wifi, Globe, Activity, Upload, Camera, Image as ImageIcon,
  Link as LinkIcon, FolderOpen, UploadCloud, RotateCcw
} from "lucide-react";
import { User } from "../types";

const PRESET_AVATARS = [
  { label: "Directrice", url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80" },
  { label: "Chercheuse", url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80" },
  { label: "Chercheur", url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80" },
  { label: "Administrateur", url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&q=80" },
  { label: "Scientifique", url: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&q=80" },
  { label: "Expert", url: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=300&q=80" }
];

interface PersonnelManagerProps {
  users: User[];
  currentUserRole: string;
  currentUserPermissions?: string[];
  currentUserId?: string;
  currentUserEmail?: string;
  onAddUser?: (user: Partial<User>) => Promise<boolean> | void;
  onUpdateUser?: (userId: string, updatedData: Partial<User>) => Promise<boolean> | void;
  onDeleteUser?: (userId: string) => Promise<boolean> | void;
  onResetPassword?: (userId: string, newPassword: string) => Promise<boolean> | void;
  onToggleStatus?: (user: User) => Promise<boolean> | void;
  onExportCSV?: () => void;
  onOpenFileManager?: (callback: (url: string) => void) => void;
  addToast: (msg: string, type: "success" | "error" | "info" | "warning", title?: string) => void;
}

export const PersonnelManager: React.FC<PersonnelManagerProps> = ({
  users,
  currentUserRole,
  currentUserPermissions = [],
  currentUserId,
  currentUserEmail,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onResetPassword,
  onToggleStatus,
  onExportCSV,
  onOpenFileManager,
  addToast
}) => {
  // Filtering & View state
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("Tous");
  const [statusFilter, setStatusFilter] = useState("Tous"); // 'Tous', 'En ligne', 'Hors ligne', 'Actifs', 'Révoqués'
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  // Form Modal State (Add / Edit)
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<Partial<User>>({
    name: "",
    email: "",
    role: "Chercheur",
    active: true,
    phone: "",
    department: "",
    function: "",
    bio: "",
    avatarUrl: "",
    password: ""
  });
  const [showFormPassword, setShowFormPassword] = useState(false);
  const [isSavingUser, setIsSavingUser] = useState(false);

  // Dedicated Password Reset Modal State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordModalUser, setPasswordModalUser] = useState<User | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [showPasswordInModal, setShowPasswordInModal] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Delete Confirmation Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Print Badge Modal State
  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);
  const [badgeUser, setBadgeUser] = useState<User | null>(null);

  // Photo Upload State & Handlers
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const processPhotoFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      addToast("Veuillez sélectionner un fichier image valide (JPG, PNG, WEBP).", "error", "Format non supporté");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      addToast("La photo ne doit pas dépasser 5 Mo.", "warning", "Fichier trop lourd");
      return;
    }

    addToast("Téléversement de la photo en cours...", "info", "Photo de profil");
    try {
      const result = await uploadFileToCloudinary(file);
      setFormData((prev) => ({ ...prev, avatarUrl: result.url }));
      addToast("Photo de profil mise à jour avec succès !", "success", "Photo téléversée");
    } catch (err: any) {
      console.error("Cloudinary upload error:", err);
      addToast(
        err instanceof CloudinaryConfigError
          ? err.message
          : "Échec du téléversement. Vérifiez votre connexion et réessayez.",
        "error",
        "Photo de profil"
      );
    }
  };

  const handlePhotoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processPhotoFile(file);
    }
  };

  const handlePhotoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingPhoto(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processPhotoFile(e.dataTransfer.files[0]);
    }
  };

  // Role permissions check — based on the real permission granted by the backend
  // (manage_users), not a hardcoded role-name string. A role-name check here would
  // drift out of sync with prisma/seed.ts (e.g. "Super Administrateur" never matched
  // the old "Administrateur" string, silently hiding this button for the top role).
  const canManage = currentUserPermissions.includes("all") || currentUserPermissions.includes("manage_users");

  // Check if a user is currently connected to the portal
  const isUserOnline = (u: User): boolean => {
    if (!u.active) return false;
    if (currentUserId && u.id === currentUserId) return true;
    if (currentUserEmail && u.email?.toLowerCase() === currentUserEmail.toLowerCase()) return true;
    if (typeof u.isOnline === "boolean") return u.isOnline;
    return false;
  };

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.phone && u.phone.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (u.department && u.department.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (u.function && u.function.toLowerCase().includes(searchQuery.toLowerCase())) ||
        u.role.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRole = roleFilter === "Tous" || u.role === roleFilter;

      let matchesStatus = true;
      if (statusFilter === "Actifs") matchesStatus = u.active;
      if (statusFilter === "Révoqués") matchesStatus = !u.active;
      if (statusFilter === "En ligne") matchesStatus = u.active && isUserOnline(u);
      if (statusFilter === "Hors ligne") matchesStatus = u.active && !isUserOnline(u);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter, currentUserId, currentUserEmail]);

  // Statistics
  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.active).length;
    const online = users.filter((u) => u.active && isUserOnline(u)).length;
    const researchers = users.filter((u) => u.role === "Chercheur").length;
    const admins = users.filter(
      (u) => u.role === "Administrateur" || u.role === "Directeur" || u.role === "Comptable" || u.role === "Secrétaire"
    ).length;
    return { total, active, online, researchers, admins };
  }, [users, currentUserId, currentUserEmail]);

  // Handle Password Generator
  const generateRandomPassword = (target: "modal" | "form") => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*";
    const generated =
      "UrGedt-" +
      Array.from({ length: 6 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join("") +
      "!";
    if (target === "modal") {
      setNewPasswordInput(generated);
      setShowPasswordInModal(true);
    } else {
      setFormData((prev) => ({ ...prev, password: generated }));
      setShowFormPassword(true);
    }
    addToast("Mot de passe fort généré automatiquement.", "info", "Générateur");
  };

  // Open Form Modal for Create / Edit
  const handleOpenForm = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        role: user.role,
        active: user.active,
        phone: user.phone || "",
        department: user.department || "",
        function: user.function || "",
        bio: user.bio || "",
        avatarUrl: user.avatarUrl || "",
        password: "" // Don't prefill existing password string for security
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: "",
        email: "",
        role: "Chercheur",
        active: true,
        phone: "",
        department: "Unité de Recherche GEDT",
        function: "Chercheur Associé",
        bio: "",
        avatarUrl: "",
        password: ""
      });
    }
    setShowFormPassword(false);
    setIsFormModalOpen(true);
  };

  // Submit User Form (Add / Update)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim() || !formData.email?.trim()) {
      addToast("Le nom et l'email sont obligatoires.", "error", "Validation");
      return;
    }

    setIsSavingUser(true);
    try {
      if (editingUser) {
        if (onUpdateUser) {
          await onUpdateUser(editingUser.id, formData);
        }
        addToast(`Fiche de ${formData.name} mise à jour avec succès.`, "success", "Gestion Personnel");
      } else {
        if (onAddUser) {
          await onAddUser(formData);
        }
        addToast(`Membre du personnel ${formData.name} créé avec succès.`, "success", "Nouveau Personnel");
      }
      setIsFormModalOpen(false);
    } catch (err: any) {
      addToast(`Erreur : ${err?.message || "Échec de l'enregistrement."}`, "error", "Erreur");
    } finally {
      setIsSavingUser(false);
    }
  };

  // Open Password Modal
  const handleOpenPasswordModal = (user: User) => {
    setPasswordModalUser(user);
    setNewPasswordInput("");
    setShowPasswordInModal(true);
    setIsPasswordModalOpen(true);
  };

  // Save Password
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalUser || !newPasswordInput.trim()) return;

    if (newPasswordInput.trim().length < 6) {
      addToast("Le mot de passe doit contenir au moins 6 caractères.", "error", "Validation");
      return;
    }

    setIsSavingPassword(true);
    try {
      if (onResetPassword) {
        await onResetPassword(passwordModalUser.id, newPasswordInput.trim());
      } else if (onUpdateUser) {
        await onUpdateUser(passwordModalUser.id, { password: newPasswordInput.trim() });
      }
      addToast(
        `Mot de passe réinitialisé pour ${passwordModalUser.name}.`,
        "success",
        "Réinitialisation Mot de Passe"
      );
      setIsPasswordModalOpen(false);
      setPasswordModalUser(null);
      setNewPasswordInput("");
    } catch (err: any) {
      addToast(`Erreur : ${err?.message || "Échec de la réinitialisation."}`, "error", "Erreur");
    } finally {
      setIsSavingPassword(false);
    }
  };

  // Open Delete Modal
  const handleOpenDeleteModal = (user: User) => {
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      if (onDeleteUser) {
        await onDeleteUser(userToDelete.id);
      }
      addToast(`Le compte de ${userToDelete.name} a été supprimé.`, "info", "Suppression");
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
    } catch (err: any) {
      addToast(`Erreur lors de la suppression : ${err?.message}`, "error", "Erreur");
    } finally {
      setIsDeleting(false);
    }
  };

  // Toggle Account Access Status
  const handleToggleAccess = async (user: User) => {
    try {
      if (onToggleStatus) {
        await onToggleStatus(user);
      } else if (onUpdateUser) {
        await onUpdateUser(user.id, { active: !user.active });
      }
      addToast(
        `Accès ${!user.active ? "activé" : "révoqué"} pour ${user.name}.`,
        !user.active ? "success" : "warning",
        "Gestion Accès"
      );
    } catch (err: any) {
      addToast(`Erreur lors du changement de statut : ${err?.message}`, "error", "Erreur");
    }
  };

  // Get Role Color Badge CSS
  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case "Administrateur":
      case "Super Administrateur":
        return "bg-amber-500/15 border-amber-500/30 text-amber-300";
      case "Directeur":
        return "bg-[#D4AF37]/15 border-[#D4AF37]/30 text-[#D4AF37]";
      case "Comptable":
        return "bg-emerald-500/15 border-emerald-500/30 text-emerald-300";
      case "Secrétaire":
        return "bg-purple-500/15 border-purple-500/30 text-purple-300";
      case "Chercheur":
        return "bg-blue-500/15 border-blue-500/30 text-blue-300";
      default:
        return "bg-slate-500/15 border-slate-500/30 text-slate-300";
    }
  };

  // Copy text helper
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    addToast(`${label} copié dans le presse-papier !`, "info", "Presse-papier");
  };

  return (
    <div className="space-y-6">
      {/* SECTION HEADER & KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#111111] border border-white/5 p-4 rounded-xl flex items-center space-x-4 shadow-sm">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Effectif Total</p>
            <p className="text-2xl font-black font-display text-white mt-0.5">{stats.total}</p>
            <p className="text-[10px] text-slate-500 font-mono">Membres du personnel</p>
          </div>
        </div>

        <div className="bg-[#111111] border border-white/5 p-4 rounded-xl flex items-center space-x-4 shadow-sm">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 relative">
            <Radio className="h-6 w-6 text-emerald-400 animate-pulse" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Connectés au Portail</p>
            <p className="text-2xl font-black font-display text-emerald-400 mt-0.5 flex items-center gap-2">
              <span>{stats.online}</span>
              <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                En ligne
              </span>
            </p>
            <p className="text-[10px] text-slate-500 font-mono">
              {stats.total > 0 ? `${Math.round((stats.online / stats.total) * 100)}% d'activité directe` : "0%"}
            </p>
          </div>
        </div>

        <div className="bg-[#111111] border border-white/5 p-4 rounded-xl flex items-center space-x-4 shadow-sm">
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
            <Briefcase className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Chercheurs & Enseignants</p>
            <p className="text-2xl font-black font-display text-blue-400 mt-0.5">{stats.researchers}</p>
            <p className="text-[10px] text-slate-500 font-mono">Corps scientifique UR-GEDT</p>
          </div>
        </div>

        <div className="bg-[#111111] border border-white/5 p-4 rounded-xl flex items-center space-x-4 shadow-sm">
          <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400">
            <Building className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Administration & Gestion</p>
            <p className="text-2xl font-black font-display text-purple-400 mt-0.5">{stats.admins}</p>
            <p className="text-[10px] text-slate-500 font-mono">Direction, Admin, Comptabilité</p>
          </div>
        </div>
      </div>

      {/* CONTROLS BAR: TITLE, ACTIONS, FILTERS, SEARCH */}
      <div className="bg-[#111111] p-5 sm:p-6 rounded-2xl border border-white/5 shadow-md space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-white/5">
          <div>
            <h2 className="font-display text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2.5">
              <Users className="h-5 w-5 text-[#D4AF37]" />
              <span>Gestion du Personnel & Répertoire des Comptes</span>
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-1">
              Enregistrez, modifiez, gérez les accès et réinitialisez les mots de passe des employés de l'UR-GEDT.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {onExportCSV && (
              <button
                onClick={onExportCSV}
                className="px-3.5 py-2 bg-[#151515] hover:bg-white/5 border border-white/10 hover:border-white/20 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                title="Exporter le répertoire du personnel au format CSV"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
                <span>Exporter CSV</span>
              </button>
            )}

            {canManage && (
              <button
                onClick={() => handleOpenForm()}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-[#D4AF37] hover:from-amber-400 hover:to-[#E5C158] text-slate-950 font-display rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 shadow-md cursor-pointer border-none"
              >
                <UserPlus className="h-4 w-4 text-slate-950" />
                <span>Nouveau Membre du Personnel</span>
              </button>
            )}
          </div>
        </div>

        {/* SEARCH & FILTERS BAR */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 pt-1">
          {/* Search Field */}
          <div className="relative flex-grow max-w-md">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Rechercher par nom, email, téléphone, fonction, rôle..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#151515] border border-white/10 rounded-xl pl-10 pr-9 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#D4AF37] shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2.5 text-slate-500 hover:text-white p-0.5 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filter Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Role Filter */}
            <div className="flex items-center space-x-1.5 bg-[#151515] border border-white/10 rounded-xl px-2.5 py-1.5">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer font-mono"
              >
                <option value="Tous" className="bg-[#1a1a1a] text-white">Tous les Rôles</option>
                <option value="Administrateur" className="bg-[#1a1a1a] text-white">Administrateurs</option>
                <option value="Directeur" className="bg-[#1a1a1a] text-white">Directeurs</option>
                <option value="Chercheur" className="bg-[#1a1a1a] text-white">Chercheurs</option>
                <option value="Comptable" className="bg-[#1a1a1a] text-white">Comptables</option>
                <option value="Secrétaire" className="bg-[#1a1a1a] text-white">Secrétaires</option>
                <option value="Visiteur" className="bg-[#1a1a1a] text-white">Visiteurs</option>
              </select>
            </div>

            {/* Status & Portal Presence Filter */}
            <div className="flex items-center space-x-1 bg-[#151515] border border-white/10 rounded-xl p-1 overflow-x-auto max-w-full">
              <button
                onClick={() => setStatusFilter("Tous")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === "Tous" ? "bg-white/15 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                Tous ({users.length})
              </button>

              <button
                onClick={() => setStatusFilter("En ligne")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  statusFilter === "En ligne" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "text-slate-400 hover:text-white"
                }`}
                title="Filtrer les employés actuellement en ligne au portail"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>En ligne ({users.filter((u) => u.active && isUserOnline(u)).length})</span>
              </button>

              <button
                onClick={() => setStatusFilter("Hors ligne")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  statusFilter === "Hors ligne" ? "bg-slate-800 text-slate-300 border border-white/10" : "text-slate-400 hover:text-white"
                }`}
                title="Filtrer les employés hors ligne / inactifs"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                <span>Hors ligne ({users.filter((u) => u.active && !isUserOnline(u)).length})</span>
              </button>

              <button
                onClick={() => setStatusFilter("Révoqués")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === "Révoqués" ? "bg-red-500/20 text-red-400 border border-red-500/30" : "text-slate-400 hover:text-white"
                }`}
              >
                Révoqués ({users.filter((u) => !u.active).length})
              </button>
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center space-x-1 bg-[#151515] border border-white/10 rounded-xl p-1">
              <button
                onClick={() => setViewMode("cards")}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === "cards" ? "bg-[#D4AF37] text-slate-950 font-bold" : "text-slate-400 hover:text-white"
                }`}
                title="Affichage Cartes"
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === "table" ? "bg-[#D4AF37] text-slate-950 font-bold" : "text-slate-400 hover:text-white"
                }`}
                title="Affichage Tableau"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* PERSONNEL CONTENT (CARDS OR TABLE) */}
      {filteredUsers.length === 0 ? (
        <div className="bg-[#111111] p-12 rounded-2xl border border-white/5 text-center space-y-4">
          <div className="h-16 w-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-slate-500 mx-auto">
            <Users className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Aucun membre du personnel trouvé</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Aucun résultat ne correspond aux critères de recherche actuels.
            </p>
          </div>
          {(searchQuery || roleFilter !== "Tous" || statusFilter !== "Tous") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setRoleFilter("Tous");
                setStatusFilter("Tous");
              }}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      ) : viewMode === "cards" ? (
        /* GRID CARDS VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredUsers.map((u) => {
            const online = isUserOnline(u);
            return (
              <div
                key={u.id}
                className={`bg-[#111111] p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between space-y-4 shadow-lg relative overflow-hidden group hover:border-[#D4AF37]/40 ${
                  !u.active
                    ? "border-red-500/20 bg-red-950/10 opacity-85"
                    : online
                    ? "border-emerald-500/25 bg-gradient-to-b from-[#141d17] to-[#111111]"
                    : "border-white/5"
                }`}
              >
                <div className="flex items-start space-x-3.5">
                  {/* Avatar with Presence Indicator */}
                  <div className="relative shrink-0">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-[#1a1a1a] to-[#2a2a2a] border border-white/10 flex items-center justify-center text-white text-xl font-black font-display overflow-hidden shadow-inner">
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
                    {/* Visual Presence Dot */}
                    <div
                      className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-[#111111] flex items-center justify-center ${
                        !u.active
                          ? "bg-red-500"
                          : online
                          ? "bg-emerald-400 shadow-emerald-400/50 shadow-md"
                          : "bg-slate-500"
                      }`}
                      title={!u.active ? "Compte révoqué" : online ? "En ligne actuellement sur le portail" : "Hors ligne / Inactif"}
                    >
                      {u.active && online && (
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      )}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold font-mono tracking-wide ${getRoleBadgeClass(u.role)}`}>
                        {u.role}
                      </span>

                      {/* Presence Status Badge */}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono inline-flex items-center gap-1 border ${
                          !u.active
                            ? "bg-red-500/15 border-red-500/30 text-red-400"
                            : online
                            ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300 ring-1 ring-emerald-500/20"
                            : "bg-slate-800/80 border-white/10 text-slate-400"
                        }`}
                        title={!u.active ? "Compte révoqué" : online ? "Actif actuellement sur le portail" : "Non connecté / Inactif"}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            !u.active ? "bg-red-400" : online ? "bg-emerald-400 animate-pulse" : "bg-slate-500"
                          }`}
                        />
                        <span>{!u.active ? "Révoqué" : online ? "En ligne" : "Hors ligne"}</span>
                      </span>
                    </div>

                    <h4 className="font-display font-bold text-white text-sm mt-1.5 truncate group-hover:text-[#D4AF37] transition-colors" title={u.name}>
                      {u.name}
                    </h4>

                    <p className="text-xs text-slate-400 truncate flex items-center gap-1.5 mt-0.5" title={u.email}>
                      <Mail className="h-3 w-3 text-slate-500 shrink-0" />
                      <span>{u.email}</span>
                    </p>

                    {(u.function || u.department) && (
                      <p className="text-[11px] text-amber-300/80 truncate flex items-center gap-1.5 mt-1" title={u.function || u.department}>
                        <Briefcase className="h-3 w-3 text-amber-400/70 shrink-0" />
                        <span>{u.function || u.department}</span>
                      </p>
                    )}

                    {u.phone && (
                      <p className="text-[11px] text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                        <Phone className="h-3 w-3 text-slate-500 shrink-0" />
                        <span>{u.phone}</span>
                      </p>
                    )}

                    {/* Portal Activity Footnote */}
                    <div className="mt-2 pt-1.5 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-400">
                      <span className="flex items-center gap-1">
                        <Globe className="h-3 w-3 text-slate-500" />
                        <span>{online ? "Session active" : "Dernière visite"} :</span>
                      </span>
                      <span className={online ? "text-emerald-400 font-bold" : "text-slate-400"}>
                        {u.lastLogin ? u.lastLogin : online ? "En cours" : "Non renseignée"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setBadgeUser(u);
                        setIsBadgeModalOpen(true);
                      }}
                      className="p-1.5 bg-[#181818] hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 rounded-lg transition-colors cursor-pointer"
                      title="Imprimer / Badge du personnel"
                    >
                      <Printer className="h-3.5 w-3.5" />
                    </button>

                    {canManage && (
                      <>
                        <button
                          onClick={() => handleOpenForm(u)}
                          className="p-1.5 bg-[#181818] hover:bg-[#D4AF37]/15 text-slate-300 hover:text-[#D4AF37] border border-white/10 rounded-lg transition-colors cursor-pointer"
                          title="Modifier la fiche employé"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>

                        <button
                          onClick={() => handleOpenPasswordModal(u)}
                          className="px-2.5 py-1.5 bg-[#181818] hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                          title="Réinitialiser le mot de passe"
                        >
                          <Key className="h-3.5 w-3.5 text-amber-400" />
                          <span className="text-[10px] font-bold font-mono">Mot de passe</span>
                        </button>
                      </>
                    )}
                  </div>

                  {canManage && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggleAccess(u)}
                        className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                          u.active
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/30"
                            : "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-emerald-500/20 hover:text-emerald-300 hover:border-emerald-500/30"
                        }`}
                        title={u.active ? "Révoquer l'accès" : "Activer l'accès"}
                      >
                        {u.active ? <UserCheck className="h-3.5 w-3.5" /> : <UserX className="h-3.5 w-3.5" />}
                      </button>

                      <button
                        onClick={() => handleOpenDeleteModal(u)}
                        className="p-1.5 bg-red-500/10 hover:bg-red-500/25 text-red-400 border border-red-500/20 hover:border-red-500/40 rounded-lg transition-colors cursor-pointer"
                        title="Supprimer la fiche employé"
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
        /* HIGH-DENSITY TABLE VIEW */
        <div className="bg-[#111111] rounded-2xl border border-white/5 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#161616] border-b border-white/10 text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                  <th className="p-4 font-bold">Employé / Identité</th>
                  <th className="p-4 font-bold">Rôle Institutionnel</th>
                  <th className="p-4 font-bold">Fonction & Département</th>
                  <th className="p-4 font-bold">Téléphone</th>
                  <th className="p-4 font-bold">Présence Portail & Accès</th>
                  <th className="p-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs text-slate-300">
                {filteredUsers.map((u) => {
                  const online = isUserOnline(u);
                  return (
                    <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          <div className="relative shrink-0">
                            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-[#1a1a1a] to-[#2a2a2a] border border-white/10 flex items-center justify-center text-white font-bold font-display overflow-hidden">
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
                              className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#111111] ${
                                !u.active
                                  ? "bg-red-500"
                                  : online
                                  ? "bg-emerald-400 animate-pulse"
                                  : "bg-slate-500"
                              }`}
                              title={!u.active ? "Compte révoqué" : online ? "En ligne actuellement sur le portail" : "Hors ligne / Inactif"}
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-white text-sm truncate">{u.name}</p>
                            <p className="text-[11px] text-slate-400 font-mono truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-md border text-[10px] font-bold font-mono inline-block ${getRoleBadgeClass(u.role)}`}>
                          {u.role}
                        </span>
                      </td>

                      <td className="p-4">
                        <p className="font-semibold text-slate-200">{u.function || "Membre"}</p>
                        <p className="text-[11px] text-slate-400 truncate max-w-[200px]">{u.department || "UR-GEDT"}</p>
                      </td>

                      <td className="p-4 font-mono text-slate-400">
                        {u.phone || "—"}
                      </td>

                      <td className="p-4">
                        <div className="flex flex-col gap-1 items-start">
                          <div className="flex items-center gap-2">
                            {/* Portal Connection Presence Badge */}
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono inline-flex items-center gap-1.5 border ${
                                !u.active
                                  ? "bg-red-500/15 border-red-500/30 text-red-400"
                                  : online
                                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300 ring-1 ring-emerald-500/20"
                                  : "bg-slate-800/80 border-white/10 text-slate-400"
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  !u.active ? "bg-red-400" : online ? "bg-emerald-400 animate-pulse" : "bg-slate-500"
                                }`}
                              />
                              <span>{!u.active ? "Révoqué" : online ? "En ligne" : "Hors ligne"}</span>
                            </span>

                            {/* Account Authorization Toggle Button */}
                            <button
                              onClick={() => canManage && handleToggleAccess(u)}
                              disabled={!canManage}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-mono transition-all cursor-pointer border ${
                                u.active
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-red-500/20 hover:text-red-300"
                                  : "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-emerald-500/20 hover:text-emerald-300"
                              }`}
                              title={canManage ? (u.active ? "Cliquer pour révoquer l'accès" : "Cliquer pour autoriser l'accès") : undefined}
                            >
                              {u.active ? "Autorisé" : "Révoqué"}
                            </button>
                          </div>

                          <p className="text-[10px] text-slate-400 font-mono">
                            {u.lastLogin ? u.lastLogin : online ? "Session active" : "Aucune connexion récente"}
                          </p>
                        </div>
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => {
                              setBadgeUser(u);
                              setIsBadgeModalOpen(true);
                            }}
                            className="p-1.5 bg-[#181818] hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 rounded-lg transition-colors cursor-pointer"
                            title="Badge du personnel"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </button>

                          {canManage && (
                            <>
                              <button
                                onClick={() => handleOpenForm(u)}
                                className="p-1.5 bg-[#181818] hover:bg-[#D4AF37]/15 text-slate-300 hover:text-[#D4AF37] border border-white/10 rounded-lg transition-colors cursor-pointer"
                                title="Modifier la fiche employé"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>

                              <button
                                onClick={() => handleOpenPasswordModal(u)}
                                className="px-2 py-1 bg-[#181818] hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg transition-colors flex items-center gap-1 font-mono text-[10px] font-bold cursor-pointer"
                                title="Réinitialiser le mot de passe"
                              >
                                <Key className="h-3 w-3 text-amber-400" />
                                <span>Mot de passe</span>
                              </button>

                              <button
                                onClick={() => handleOpenDeleteModal(u)}
                                className="p-1.5 bg-red-500/10 hover:bg-red-500/25 text-red-400 border border-red-500/20 hover:border-red-500/40 rounded-lg transition-colors cursor-pointer"
                                title="Supprimer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD / EDIT EMPLOYEE FORM */}
      <AnimatePresence>
        {isFormModalOpen && (
          <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#121212] border border-white/10 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto my-4 sm:my-8"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-xl text-[#D4AF37]">
                    <UserPlus className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-white text-base">
                      {editingUser ? `Modifier la Fiche : ${editingUser.name}` : "Nouveau Membre du Personnel"}
                    </h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      Renseignez les données administratives et académiques de l'employé.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsFormModalOpen(false)}
                  className="p-1.5 bg-[#181818] hover:bg-white/10 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitForm} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Nom complet */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Nom complet <span className="text-amber-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name || ""}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="ex: Dr. Marie-Claire Ilunga"
                      className="w-full bg-[#181818] border border-white/10 focus:border-[#D4AF37] rounded-xl p-2.5 text-xs text-white focus:outline-none"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Adresse Email <span className="text-amber-400">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email || ""}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="mc.ilunga@urgedt.org"
                      className="w-full bg-[#181818] border border-white/10 focus:border-[#D4AF37] rounded-xl p-2.5 text-xs text-white focus:outline-none font-mono"
                    />
                  </div>

                  {/* Role */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Rôle Institutionnel
                    </label>
                    <select
                      value={formData.role || "Chercheur"}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                      className="w-full bg-[#181818] border border-white/10 focus:border-[#D4AF37] rounded-xl p-2.5 text-xs text-white focus:outline-none font-mono cursor-pointer"
                    >
                      <option value="Chercheur" className="bg-[#1a1a1a]">Chercheur</option>
                      <option value="Coordonnateur Scientifique et Technique" className="bg-[#1a1a1a]">Coordonnateur Scientifique et Technique</option>
                      <option value="Coordonnateur Mobilisation Communautaire et Partenariats" className="bg-[#1a1a1a]">Coordonnateur Mobilisation Communautaire et Partenariats</option>
                      <option value="Coordonnatrice Administration, Finance et Genre" className="bg-[#1a1a1a]">Coordonnatrice Administration, Finance et Genre</option>
                      <option value="Administrateur" className="bg-[#1a1a1a]">Administrateur</option>
                      <option value="Directeur" className="bg-[#1a1a1a]">Directeur</option>
                      <option value="Comptable" className="bg-[#1a1a1a]">Comptable</option>
                      <option value="Secrétaire" className="bg-[#1a1a1a]">Secrétaire</option>
                      <option value="Visiteur" className="bg-[#1a1a1a]">Visiteur</option>
                    </select>
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Téléphone
                    </label>
                    <input
                      type="text"
                      value={formData.phone || ""}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+243 990 000 000"
                      className="w-full bg-[#181818] border border-white/10 focus:border-[#D4AF37] rounded-xl p-2.5 text-xs text-white focus:outline-none font-mono"
                    />
                  </div>

                  {/* Function */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Fonction / Titre Académique
                    </label>
                    <input
                      type="text"
                      value={formData.function || ""}
                      onChange={(e) => setFormData({ ...formData, function: e.target.value })}
                      placeholder="ex: Chercheur Principal / Professeur Associé"
                      className="w-full bg-[#181818] border border-white/10 focus:border-[#D4AF37] rounded-xl p-2.5 text-xs text-white focus:outline-none"
                    />
                  </div>

                  {/* Department */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Département / Division
                    </label>
                    <input
                      type="text"
                      value={formData.department || ""}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      placeholder="ex: Unité de Recherche Transition Énergétique"
                      className="w-full bg-[#181818] border border-white/10 focus:border-[#D4AF37] rounded-xl p-2.5 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* PHOTO DE PROFIL & PRÉVISUALISATION DYNAMIQUE */}
                <div className="p-4 bg-[#161616] border border-white/10 rounded-2xl space-y-3.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-white uppercase tracking-wider font-display flex items-center gap-2">
                      <Camera className="h-4 w-4 text-[#D4AF37]" />
                      <span>Photo de Profil & Aperçu Dynamique</span>
                    </label>
                    {formData.avatarUrl && (
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, avatarUrl: "" }))}
                        className="text-[11px] font-bold text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>Effacer la photo</span>
                      </button>
                    )}
                  </div>

                  {/* Hidden File Input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoFileSelect}
                    className="hidden"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                    {/* Dynamic Real-time Preview Box */}
                    <div className="sm:col-span-5 flex flex-col items-center justify-center p-4 bg-[#0d0d0d] border border-white/10 rounded-xl relative overflow-hidden group">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 font-mono">
                        Aperçu Dashboard
                      </p>

                      <div className="relative mb-2">
                        <div className="h-20 w-20 rounded-2xl bg-gradient-to-tr from-[#1a1a1a] to-[#2a2a2a] border-2 border-[#D4AF37]/60 flex items-center justify-center text-white text-2xl font-black font-display overflow-hidden shadow-xl">
                          {formData.avatarUrl ? (
                            <img
                              src={formData.avatarUrl}
                              alt="Aperçu photo"
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <span>{formData.name ? formData.name.split(" ").slice(-1)[0]?.[0] || "U" : "U"}</span>
                          )}
                        </div>

                        {/* Status dot in preview */}
                        <div
                          className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-[#0d0d0d] flex items-center justify-center ${
                            formData.active ? "bg-emerald-400 shadow-emerald-400/50 shadow-md" : "bg-red-500"
                          }`}
                          title={formData.active ? "Aperçu: Actif au portail" : "Aperçu: Inactif"}
                        >
                          {formData.active && (
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          )}
                        </div>
                      </div>

                      <p className="text-xs font-bold text-white font-display text-center truncate max-w-full">
                        {formData.name || "Nom de l'employé"}
                      </p>
                      <p className="text-[10px] text-[#D4AF37] font-mono font-bold mt-0.5">
                        {formData.role || "Chercheur"}
                      </p>
                    </div>

                    {/* Upload & Source Controls */}
                    <div className="sm:col-span-7 space-y-2.5">
                      {/* Drag and Drop / Upload Button */}
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDraggingPhoto(true);
                        }}
                        onDragLeave={() => setIsDraggingPhoto(false)}
                        onDrop={handlePhotoDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`p-3.5 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all text-center ${
                          isDraggingPhoto
                            ? "border-[#D4AF37] bg-[#D4AF37]/10"
                            : "border-white/15 hover:border-[#D4AF37]/50 bg-[#121212] hover:bg-white/[0.02]"
                        }`}
                      >
                        <UploadCloud className="h-6 w-6 text-[#D4AF37] mb-1 animate-bounce" />
                        <p className="text-xs font-bold text-white">
                          Glissez votre photo ici ou <span className="text-[#D4AF37] underline">parcourez</span>
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          Formats acceptés: PNG, JPG, WEBP (Max 5 Mo)
                        </p>
                      </div>

                      {/* Direct URL or File Manager */}
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <LinkIcon className="h-3.5 w-3.5 text-slate-500 absolute left-3 top-3" />
                          <input
                            type="text"
                            value={formData.avatarUrl || ""}
                            onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
                            placeholder="Ou coller l'URL d'une image..."
                            className="w-full bg-[#121212] border border-white/10 focus:border-[#D4AF37] rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none font-mono"
                          />
                        </div>
                        {onOpenFileManager && (
                          <button
                            type="button"
                            onClick={() =>
                              onOpenFileManager((url) => setFormData((prev) => ({ ...prev, avatarUrl: url })))
                            }
                            className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5"
                          >
                            <FolderOpen className="h-3.5 w-3.5 text-amber-400" />
                            <span>Médiathèque</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Preset Avatars Bar */}
                  <div className="pt-2 border-t border-white/5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                      Ou choisir une photo académique prédéfinie :
                    </p>
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      {PRESET_AVATARS.map((preset, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, avatarUrl: preset.url }))}
                          className={`h-9 w-9 rounded-xl border flex-shrink-0 overflow-hidden transition-all cursor-pointer ${
                            formData.avatarUrl === preset.url
                              ? "border-[#D4AF37] ring-2 ring-[#D4AF37]/40 scale-105"
                              : "border-white/10 opacity-70 hover:opacity-100 hover:border-white/30"
                          }`}
                          title={preset.label}
                        >
                          <img src={preset.url} alt={preset.label} className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Password field for creating or setting explicit password */}
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1">
                      <Key className="h-3.5 w-3.5 text-amber-400" />
                      <span>Mot de passe d'accès</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => generateRandomPassword("form")}
                      className="text-[10px] font-bold text-amber-300 hover:text-amber-200 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30 cursor-pointer flex items-center gap-1 transition-colors"
                    >
                      <Sparkles className="h-3 w-3 text-amber-400" />
                      <span>Générer Auto</span>
                    </button>
                  </div>

                  <div className="relative flex items-center">
                    <input
                      type={showFormPassword ? "text" : "password"}
                      value={formData.password || ""}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder={
                        editingUser
                          ? "•••••••• (Laissez vide pour conserver le mot de passe actuel)"
                          : "Saisissez ou générez un mot de passe..."
                      }
                      className="w-full bg-[#151515] border border-white/10 focus:border-amber-500/60 rounded-xl p-2.5 text-xs font-mono text-white focus:outline-none pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowFormPassword(!showFormPassword)}
                      className="absolute right-3 text-slate-400 hover:text-white p-1 cursor-pointer"
                    >
                      {showFormPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Active Toggle */}
                <div className="flex items-center justify-between p-3 bg-[#181818] border border-white/10 rounded-xl">
                  <div>
                    <span className="text-xs font-bold text-white block">Statut du Compte</span>
                    <span className="text-[11px] text-slate-400">
                      {formData.active ? "Accès autorisé aux outils UR-GEDT" : "Compte désactivé / accès révoqué"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, active: !formData.active })}
                    className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                      formData.active ? "bg-emerald-500 justify-end" : "bg-slate-700 justify-start"
                    }`}
                  >
                    <motion.div
                      layout
                      className="bg-white w-4 h-4 rounded-full shadow-md"
                    />
                  </button>
                </div>

                {/* Bio / Note */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Notes / Biographie synthétique
                  </label>
                  <textarea
                    rows={2}
                    value={formData.bio || ""}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="Brève présentation des compétences ou des travaux de recherche..."
                    className="w-full bg-[#181818] border border-white/10 focus:border-[#D4AF37] rounded-xl p-2.5 text-xs text-white focus:outline-none"
                  />
                </div>

                {/* Submit buttons */}
                <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsFormModalOpen(false)}
                    className="px-4 py-2 bg-[#181818] hover:bg-white/10 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingUser}
                    className="px-5 py-2 bg-gradient-to-r from-amber-500 to-[#D4AF37] hover:from-amber-400 hover:to-[#E5C158] text-slate-950 font-display font-extrabold rounded-xl text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer border-none"
                  >
                    {isSavingUser ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
                        <span>Enregistrement...</span>
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 text-slate-950" />
                        <span>{editingUser ? "Mettre à jour" : "Créer l'employé"}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: DEDICATED PASSWORD RESET MODAL */}
      <AnimatePresence>
        {isPasswordModalOpen && passwordModalUser && (
          <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#121212] border border-amber-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto my-4 sm:my-8"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-[#D4AF37] to-amber-600" />

              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-500/15 border border-amber-500/30 rounded-xl text-amber-400">
                    <Key className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold font-display text-white">Réinitialiser le Mot de Passe</h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      Employé : <span className="text-amber-300 font-bold">{passwordModalUser.name}</span> ({passwordModalUser.role})
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

              <form onSubmit={handleSavePassword} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Nouveau Mot de Passe
                    </label>
                    <button
                      type="button"
                      onClick={() => generateRandomPassword("modal")}
                      className="text-[11px] font-bold text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 rounded border border-amber-500/30 cursor-pointer flex items-center gap-1.5 transition-colors"
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
                    >
                      {showPasswordInModal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {newPasswordInput && (
                    <div className="flex justify-end mt-1">
                      <button
                        type="button"
                        onClick={() => copyToClipboard(newPasswordInput, "Mot de passe")}
                        className="text-[10px] text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="h-3 w-3" />
                        <span>Copier dans le presse-papier</span>
                      </button>
                    </div>
                  )}

                  {/* Password Strength Meter */}
                  {newPasswordInput.length > 0 && (() => {
                    const pwd = newPasswordInput;
                    let score = 0;
                    if (pwd.length >= 6) score += 1;
                    if (pwd.length >= 10) score += 1;
                    if (/[A-Z]/.test(pwd)) score += 1;
                    if (/[0-9]/.test(pwd)) score += 1;
                    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

                    let label = "Très Faible";
                    let color = "bg-red-500 text-red-400";
                    if (score === 2) { label = "Faible"; color = "bg-orange-500 text-orange-400"; }
                    if (score === 3) { label = "Moyen"; color = "bg-amber-500 text-amber-400"; }
                    if (score === 4) { label = "Fort"; color = "bg-emerald-500 text-emerald-400"; }
                    if (score >= 5) { label = "Très Fort"; color = "bg-emerald-400 text-emerald-300"; }

                    return (
                      <div className="mt-2.5 p-2.5 bg-[#151515] border border-white/5 rounded-lg space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <span className="text-slate-400">Robustesse du mot de passe :</span>
                          <span className={`font-bold ${color.split(' ')[1]}`}>{label}</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden flex">
                          <div
                            className={`h-full transition-all duration-300 ${color.split(' ')[0]}`}
                            style={{ width: `${(score / 5) * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2.5 text-xs text-amber-200/90">
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
                    className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-[#D4AF37] hover:from-amber-400 hover:to-[#E5C158] text-slate-950 font-display font-extrabold rounded-xl text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer border-none"
                  >
                    {isSavingPassword ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
                        <span>Mise à jour...</span>
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 text-slate-950" />
                        <span>Valider le Nouveau Mot de Passe</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {isDeleteModalOpen && userToDelete && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-personnel-modal-title"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-[#121212] border border-red-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden space-y-4"
            >
              <button
                type="button"
                onClick={() => !isDeleting && setIsDeleteModalOpen(false)}
                className="absolute top-4 right-4 text-slate-500 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center space-x-3 text-red-400 pr-6">
                <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-red-500 shrink-0">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div>
                  <h3 id="delete-personnel-modal-title" className="text-base font-bold text-white font-display">
                    Suppression Définitive du Personnel
                  </h3>
                  <p className="text-xs text-red-400 font-mono mt-0.5">Confirmation requise avant suppression en base de données</p>
                </div>
              </div>

              {/* Personnel Details Card */}
              <div className="p-3.5 bg-[#181818] border border-white/10 rounded-xl space-y-2">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-[#1a1a1a] to-[#2a2a2a] border border-white/10 flex items-center justify-center text-white font-bold font-display overflow-hidden shrink-0">
                    {userToDelete.avatarUrl ? (
                      <img
                        src={userToDelete.avatarUrl}
                        alt={userToDelete.name}
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      userToDelete.name.split(" ").slice(-1)[0]?.[0] || "U"
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-white text-sm truncate">{userToDelete.name}</p>
                    <p className="text-xs text-slate-400 font-mono truncate">{userToDelete.email}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold font-mono shrink-0 ${getRoleBadgeClass(userToDelete.role)}`}>
                    {userToDelete.role}
                  </span>
                </div>

                {(userToDelete.function || userToDelete.department) && (
                  <p className="text-[11px] text-slate-400 pt-1 border-t border-white/5 font-mono">
                    {userToDelete.function || "Membre du personnel"} — <span className="text-slate-300">{userToDelete.department || "UR-GEDT"}</span>
                  </p>
                )}
              </div>

              {/* Warning Notice */}
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-300 space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-red-400">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  <span>Action Irréversible</span>
                </p>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Êtes-vous sûr de vouloir supprimer définitivement <strong>{userToDelete.name}</strong> de la base de données ?
                  Toutes ses autorisations d'accès et son historique seront retirés.
                </p>
              </div>

              <div className="flex items-center justify-end space-x-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  disabled={isDeleting}
                  className="px-4 py-2.5 bg-[#181818] hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer border-none shadow-lg shadow-red-600/20 transition-all"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Suppression en cours...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      <span>Confirmer la suppression définitive</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 4: OFFICIAL BADGE PRINT PREVIEW */}
      <AnimatePresence>
        {isBadgeModalOpen && badgeUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[#121212] border border-white/10 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative space-y-5"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-display">
                  Carte de Service / Badge Officiel
                </h3>
                <button
                  onClick={() => setIsBadgeModalOpen(false)}
                  className="p-1 bg-[#1a1a1a] hover:bg-white/10 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Printable ID Badge */}
              <div id="employee-badge-printable" className="bg-gradient-to-b from-[#181818] to-[#0d0d0d] border-2 border-[#D4AF37]/50 rounded-2xl p-5 text-center relative overflow-hidden shadow-2xl">
                {/* Header emblem */}
                <div className="border-b border-white/10 pb-3 mb-4">
                  <p className="text-[10px] font-black font-display text-[#D4AF37] uppercase tracking-widest">
                    RECHERCHE ACCÉLÉRÉE UR-GEDT
                  </p>
                  <p className="text-[9px] text-slate-400 font-mono">Unité de Recherche & Gouvernance</p>
                </div>

                {/* Photo */}
                <div className="h-24 w-24 rounded-2xl mx-auto border-2 border-[#D4AF37] p-1 bg-[#111111] overflow-hidden mb-3 shadow-lg">
                  {badgeUser.avatarUrl ? (
                    <img src={badgeUser.avatarUrl} alt={badgeUser.name} className="h-full w-full object-cover rounded-xl" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="h-full w-full bg-slate-800 flex items-center justify-center text-white text-2xl font-black">
                      {badgeUser.name.split(" ").slice(-1)[0]?.[0] || "U"}
                    </div>
                  )}
                </div>

                <h4 className="font-display font-extrabold text-white text-base leading-tight">
                  {badgeUser.name}
                </h4>
                <p className="text-xs font-bold text-[#D4AF37] mt-1 font-mono uppercase">
                  {badgeUser.role}
                </p>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  {badgeUser.function || "Membre Effectif"}
                </p>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                  ID: <span className="text-white font-bold">{badgeUser.id}</span>
                </p>

                {/* Footer QR mock */}
                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                  <div className="text-left text-[9px] text-slate-400 font-mono">
                    <p>Statut: <span className="text-emerald-400 font-bold">{badgeUser.active ? "ACTIF" : "INACTIF"}</span></p>
                    <p>{badgeUser.email}</p>
                  </div>
                  <div className="p-1 bg-white rounded">
                    <QrCode className="h-8 w-8 text-black" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => window.print()}
                  className="w-full py-2.5 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <Printer className="h-4 w-4" />
                  <span>Imprimer le Badge</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
