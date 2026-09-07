import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  BookOpen, Users, Briefcase, Calendar, MapPin, Mail, 
  Lock, FileText, Image, Search, Menu, X, ArrowRight, 
  Map, GraduationCap, ChevronRight, MessageSquare, Shield,
  Facebook, Twitter, Linkedin, Youtube, Music, File, FileDown, Eye, QrCode,
  Sparkles, Filter, ExternalLink, Phone, Compass, Award, CheckCircle2, Globe, Layers
} from "lucide-react";
import { Database, News, Project, FieldActivity, Publication, GalleryItem, Partner, User } from "../types";
import ToastContainer, { ToastMessage } from "./ToastContainer";

interface PublicSiteProps {
  db: Database;
  onNavigateToLogin: () => void;
  onSubmitContact: (form: { senderName: string; senderEmail: string; subject: string; message: string }) => Promise<boolean>;
  onOpenQrScanner?: () => void;
}

export default function PublicSite({ db, onNavigateToLogin, onSubmitContact, onOpenQrScanner }: PublicSiteProps) {
  const siteSettings = useMemo(() => {
    if (Array.isArray(db.settings)) return db.settings[0] || {};
    return db.settings || {};
  }, [db.settings]);

  const [activeTab, setActiveTab] = useState<string>("accueil");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("Tous");
  const [galleryFilter, setGalleryFilter] = useState("Tous");
  const [selectedImage, setSelectedImage] = useState<GalleryItem | null>(null);

  // Contact Form State
  const [contactForm, setContactForm] = useState({
    senderName: "",
    senderEmail: "",
    subject: "",
    message: ""
  });
  const [contactSuccess, setContactSuccess] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Toast State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (message: string, type: "success" | "error" | "info" | "warning" = "success", title?: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.senderName || !contactForm.senderEmail || !contactForm.subject || !contactForm.message) {
      addToast("Veuillez remplir tous les champs obligatoires du formulaire.", "warning", "Champs Incomplets");
      return;
    }
    setIsSubmitting(true);
    const success = await onSubmitContact(contactForm);
    setIsSubmitting(false);
    if (success) {
      setContactSuccess(true);
      addToast("Votre message a été transmis avec succès au secrétariat de l'UR-GEDT !", "success", "Message Transmis");
      setContactForm({ senderName: "", senderEmail: "", subject: "", message: "" });
      setTimeout(() => setContactSuccess(null), 5000);
    } else {
      setContactSuccess(false);
      addToast("Erreur lors de l'envoi de votre message. Veuillez réessayer.", "error", "Échec d'Envoi");
      setTimeout(() => setContactSuccess(null), 5000);
    }
  };

  const navItems = [
    { id: "accueil", label: "Accueil" },
    { id: "propos", label: "À propos" },
    { id: "equipe", label: "Notre Équipe" },
    { id: "projets", label: "Projets" },
    { id: "activites", label: "Activités Terrain" },
    { id: "publications", label: "Publications" },
    { id: "actualites", label: "Actualités" },
    { id: "galerie", label: "Galerie" },
    { id: "partenaires", label: "Partenaires" },
    { id: "contact", label: "Contact" }
  ];

  const navigateTo = (tabId: string) => {
    setActiveTab(tabId);
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Filtered publications
  const filteredPublications = useMemo(() => {
    return db.publications.filter(pub => {
      const matchesSearch = pub.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           pub.authors.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           pub.journal.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = filterCategory === "Tous" || pub.type === filterCategory;
      return matchesSearch && matchesFilter;
    });
  }, [db.publications, searchQuery, filterCategory]);

  // Filtered gallery
  const filteredGallery = useMemo(() => {
    return db.gallery.filter(item => {
      if (galleryFilter === "Tous") return true;
      if (galleryFilter === "Photos") return item.type === "photo";
      if (galleryFilter === "Vidéos") return item.type === "video";
      if (galleryFilter === "Audios") return item.type === "audio";
      if (galleryFilter === "Documents") return item.type === "pdf";
      return true;
    });
  }, [db.gallery, galleryFilter]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#071A12] via-[#0F2A1C] to-[#0A2016] text-slate-100 selection:bg-[#D4AF37] selection:text-black font-sans antialiased overflow-x-hidden">
      
      {/* TOP ANNOUNCEMENT / UTILITY BAR */}
      <div className="bg-[#0A121E] border-b border-white/5 py-2 text-slate-400 text-xs hidden sm:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center space-x-6">
            <a 
              href={`mailto:${siteSettings?.email || "urgedt.rdcongo@gmail.com"}`} 
              className="flex items-center space-x-2 font-mono text-xs text-slate-300 hover:text-[#D4AF37] transition-colors group"
              title="Envoyer un courriel au secrétariat"
            >
              <Mail className="h-3.5 w-3.5 text-[#D4AF37] group-hover:scale-110 transition-transform" />
              <span>{siteSettings?.email || "urgedt.rdcongo@gmail.com"}</span>
            </a>
            <a 
              href={`tel:${(siteSettings?.phone || "+243 800 827 348").replace(/\s+/g, '')}`} 
              className="flex items-center space-x-2 font-mono text-xs text-slate-300 hover:text-[#D4AF37] transition-colors group"
              title="Appeler le secrétariat"
            >
              <Phone className="h-3.5 w-3.5 text-[#D4AF37] group-hover:scale-110 transition-transform" />
              <span>{siteSettings?.phone || "+243 800 827 348"}</span>
            </a>
            <span className="hidden lg:inline-flex items-center gap-1.5 text-[11px] text-slate-400 font-mono bg-white/5 px-2.5 py-0.5 rounded-full border border-white/5">
              <MapPin className="h-3 w-3 text-[#D4AF37]" />
              <span>{siteSettings?.address || "Campus de la Kasapa, Lubumbashi, RDC"}</span>
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider font-mono">Suivez-nous :</span>
            <div className="flex items-center space-x-3">
              <a href={siteSettings?.linkedin || "https://www.linkedin.com/in/ur-getd-unilu-4172bb425"} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-[#D4AF37] transition-colors" title="LinkedIn">
                <Linkedin className="h-3.5 w-3.5" />
              </a>
              <a href={siteSettings?.facebook || "https://web.facebook.com/profile.php?id=61592205587276"} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-[#D4AF37] transition-colors" title="Facebook">
                <Facebook className="h-3.5 w-3.5" />
              </a>
              <a href={siteSettings?.twitter || "https://x.com/URGEDTUNILu"} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-[#D4AF37] transition-colors" title="X (Twitter)">
                <Twitter className="h-3.5 w-3.5" />
              </a>
              {siteSettings?.youtube && (
                <a href={siteSettings.youtube} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-[#D4AF37] transition-colors" title="YouTube">
                  <Youtube className="h-3.5 w-3.5" />
                </a>
              )}
              <span className="h-3 w-[1px] bg-white/10"></span>
              <a href="https://scholar.google.com" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-[#D4AF37] transition-colors flex items-center gap-1" title="Google Scholar">
                <GraduationCap className="h-3.5 w-3.5 text-[#D4AF37]" />
                <span className="text-[11px] font-mono font-bold uppercase tracking-tight">Scholar</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* STICKY GLASS HEADER */}
      <header className="sticky top-0 z-50 bg-[#0F2A1C]/85 backdrop-blur-xl border-b border-[#D4AF37]/20 shadow-2xl transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Logo & Institution Brand */}
          <div className="flex items-center space-x-3.5 cursor-pointer group flex-shrink-0" onClick={() => navigateTo("accueil")}>
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-[#D4AF37] to-amber-600 rounded-full blur opacity-30 group-hover:opacity-70 transition duration-300"></div>
              <img 
                src={siteSettings?.logo || "/logo.jpg"} 
                alt="Logo UR-GEDT" 
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/logo.jpg'; }}
                className="relative h-12 w-12 sm:h-14 sm:w-14 object-contain rounded-full shadow-xl border-2 border-[#D4AF37] bg-white p-0.5 transition-transform group-hover:scale-105 duration-200" 
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-lg sm:text-xl font-black tracking-tight text-white group-hover:text-[#D4AF37] transition-colors">
                  {siteSettings?.siteName || "UR-GEDT"}
                </h1>
                <span className="hidden sm:inline-block bg-[#D4AF37]/15 text-[#D4AF37] text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border border-[#D4AF37]/30">
                  UNILU
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 font-medium tracking-wide uppercase mt-0.5">
                Université de Lubumbashi
              </p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden xl:flex items-center space-x-1 bg-white/[0.03] p-1.5 rounded-full border border-white/10 shadow-inner overflow-x-auto max-w-full">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => navigateTo(item.id)}
                className={`relative px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap flex-shrink-0 ${
                  activeTab === item.id 
                    ? "text-black bg-[#D4AF37] shadow-md shadow-[#D4AF37]/20 font-bold" 
                    : "text-slate-300 hover:text-white hover:bg-white/10"
                }`}
                id={`nav-item-${item.id}`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Action Buttons */}
          <div className="hidden lg:flex items-center space-x-2.5 flex-shrink-0">
            {onOpenQrScanner && (
              <button
                onClick={onOpenQrScanner}
                className="flex items-center space-x-1.5 bg-white/5 hover:bg-[#D4AF37]/15 text-slate-200 hover:text-[#D4AF37] font-sans text-xs font-semibold px-3.5 py-2 rounded-xl border border-white/10 hover:border-[#D4AF37]/40 transition-all cursor-pointer shadow-sm hover:shadow-md"
                title="Vérifier et valider un reçu imprimé avec son QR Code"
              >
                <QrCode className="h-4 w-4 text-[#D4AF37]" />
                <span className="hidden xl:inline">Valider QR</span>
              </button>
            )}
            <button
              onClick={onNavigateToLogin}
              className="flex items-center space-x-2 bg-gradient-to-r from-[#D4AF37] to-amber-500 hover:from-amber-400 hover:to-[#D4AF37] text-slate-950 font-sans text-sm font-bold px-4 py-2 rounded-xl shadow-lg shadow-[#D4AF37]/20 hover:shadow-xl transition-all duration-200 cursor-pointer active:scale-95"
              id="header-login-btn"
            >
              <Lock className="h-4 w-4" />
              <span>Espace Interne</span>
            </button>
          </div>

          {/* Mobile Menu Controls */}
          <div className="xl:hidden flex items-center space-x-2">
            {onOpenQrScanner && (
              <button
                onClick={onOpenQrScanner}
                className="bg-white/5 text-[#D4AF37] p-2 rounded-lg border border-white/10 hover:bg-[#D4AF37]/20 transition-colors"
                title="Valider QR Code"
              >
                <QrCode className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={onNavigateToLogin}
              className="bg-[#D4AF37]/15 text-[#D4AF37] p-2 rounded-lg border border-[#D4AF37]/30 hover:bg-[#D4AF37]/30 transition-colors"
              title="Connexion"
            >
              <Lock className="h-4 w-4" />
            </button>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-slate-200 hover:text-white p-2 rounded-lg bg-white/5 border border-white/10"
              id="mobile-menu-toggle"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6 text-[#D4AF37]" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Slide Panel */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="xl:hidden bg-[#12261C] border-t border-[#D4AF37]/20 shadow-2xl overflow-hidden"
            >
              <div className="px-4 pt-3 pb-6 space-y-1">
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {navItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => navigateTo(item.id)}
                      className={`text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        activeTab === item.id 
                          ? "text-black bg-[#D4AF37] font-bold shadow" 
                          : "text-slate-300 hover:text-white hover:bg-white/5 border border-white/5"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <div className="pt-3 border-t border-white/10 flex flex-col gap-2">
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onNavigateToLogin();
                    }}
                    className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-[#D4AF37] to-amber-500 text-slate-950 font-bold py-3 rounded-xl shadow-lg"
                  >
                    <Lock className="h-4 w-4" />
                    <span>Accéder à l'Espace Interne</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* MAIN DYNAMIC CONTENT */}
      <main className="flex-grow">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            {/* ACCUEIL PAGE */}
            {activeTab === "accueil" && (
              <div>
                {/* HERO SECTION */}
                <section className="relative bg-[#0A2016] py-20 lg:py-28 overflow-hidden border-b border-[#D4AF37]/20">
                  {/* Animated Background Video */}
                  <video
                    className="absolute inset-0 z-0 h-full w-full object-cover opacity-20 mix-blend-luminosity"
                    src="/hero-animation.mp4"
                    autoPlay
                    loop
                    muted
                    playsInline
                    aria-hidden="true"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-[#0A2016]/80 via-[#0A2016]/95 to-[#0A2016] z-0"></div>
                  <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#D4AF37]/10 rounded-full blur-[120px] pointer-events-none"></div>

                  <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
                    <div className="max-w-3xl">
                      
                      {/* Pill Tag */}
                      <div className="inline-flex items-center space-x-2.5 bg-white/[0.05] border border-[#D4AF37]/40 rounded-full px-4 py-1.5 mb-6 backdrop-blur-md shadow-lg">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D4AF37] opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#D4AF37]"></span>
                        </span>
                        <span className="text-xs font-mono font-bold text-[#D4AF37] tracking-wider uppercase">Unité de Recherche · Université de Lubumbashi</span>
                      </div>

                      {/* Main Title */}
                      <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.15]">
                        Gouvernance, Environnement & <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] via-amber-300 to-amber-500">Développement Territorial</span>
                      </h1>

                      <p className="mt-6 text-base sm:text-lg lg:text-xl text-slate-300 font-sans leading-relaxed">
                        L'UR-GEDT de l'Université de Lubumbashi produit des connaissances scientifiques multidisciplinaires pour répondre aux défis majeurs de l'aménagement du territoire, de la transition écologique minière et de la gouvernance locale au Katanga.
                      </p>

                      {/* Action CTA Buttons */}
                      <div className="mt-8 sm:mt-10 flex flex-wrap items-center gap-4">
                        <motion.button
                          whileHover={{ scale: 1.05, y: -2 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => navigateTo("propos")}
                          className="px-6 py-3.5 bg-gradient-to-r from-[#D4AF37] to-amber-500 hover:from-amber-400 hover:to-[#D4AF37] text-slate-950 font-bold rounded-xl shadow-xl shadow-[#D4AF37]/20 hover:shadow-2xl transition-all duration-200 flex items-center space-x-2 cursor-pointer active:scale-95"
                        >
                          <span>Découvrir l'UR-GEDT</span>
                          <ArrowRight className="h-5 w-5" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05, y: -2 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => navigateTo("projets")}
                          className="px-6 py-3.5 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl border border-white/10 hover:border-[#D4AF37]/30 transition-all cursor-pointer backdrop-blur-md flex items-center space-x-2"
                        >
                          <Compass className="h-4 w-4 text-[#D4AF37]" />
                          <span>Voir nos projets</span>
                        </motion.button>
                      </div>

                    </div>
                  </div>
                </section>

                {/* STATS OVERLAY CARDS */}
                <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 sm:-mt-14 relative z-20">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                    {[
                      { icon: <Users className="h-6 w-6 sm:h-8 sm:w-8 text-[#D4AF37]" />, count: db.users.length, label: "Chercheurs & Experts", detail: "Pluridisciplinaires" },
                      { icon: <Briefcase className="h-6 w-6 sm:h-8 sm:w-8 text-[#D4AF37]" />, count: db.projects.length, label: "Projets Majeurs", detail: "Actifs & Financés" },
                      { icon: <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 text-[#D4AF37]" />, count: db.publications.length, label: "Publications Scientifiques", detail: "Revues, Livres & Thèses" },
                      { icon: <Map className="h-6 w-6 sm:h-8 sm:w-8 text-[#D4AF37]" />, count: db.activities.length, label: "Missions de Terrain", detail: "Axe Haut-Katanga" }
                    ].map((stat, idx) => (
                      <motion.div 
                        key={idx} 
                        whileHover={{ y: -8, scale: 1.02 }} 
                        transition={{ type: "spring", stiffness: 350, damping: 22 }}
                        className="bg-[#12261C] p-5 sm:p-6 rounded-2xl shadow-2xl border border-[#D4AF37]/20 hover:border-[#D4AF37]/60 hover:shadow-[#D4AF37]/10 transition-all duration-300 group flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="p-2.5 sm:p-3 bg-[#D4AF37]/10 rounded-xl border border-[#D4AF37]/20 group-hover:scale-110 transition-transform">
                            {stat.icon}
                          </div>
                          <span className="font-display text-2xl sm:text-4xl font-black text-white group-hover:text-[#D4AF37] transition-colors">
                            {stat.count}
                          </span>
                        </div>
                        <div>
                          <p className="font-bold text-sm sm:text-base text-slate-100">{stat.label}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{stat.detail}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </section>

                {/* DOMAINES D'EXCELLENCE / PILIERS */}
                <section className="py-20 sm:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="text-center max-w-3xl mx-auto mb-16">
                    <span className="text-xs font-bold text-[#D4AF37] tracking-widest uppercase font-mono bg-[#D4AF37]/10 px-3 py-1 rounded-full border border-[#D4AF37]/20">
                      Piliers Scientifiques
                    </span>
                    <h2 className="font-display text-3xl sm:text-4xl font-black text-white mt-3">
                      Domaines d'Excellence & Axes Thématiques
                    </h2>
                    <p className="text-slate-300 mt-4 text-sm sm:text-base leading-relaxed">
                      Nous combinons rigueur académique et enquêtes de terrain pour éclairer les décideurs politiques et la société civile sur les mutations environnementales et territoriales.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
                    {[
                      {
                        icon: <Shield className="h-8 w-8 text-[#D4AF37]" />,
                        title: "Gouvernance Territoriale & Législation",
                        desc: "Analyse critique du code minier, de la gestion foncière provinciale, des conflits coutumiers et de l'intégration de la RSE au profit des populations locales."
                      },
                      {
                        icon: <MapPin className="h-8 w-8 text-[#D4AF37]" />,
                        title: "Environnement & Éco-toxicologie",
                        desc: "Suivi des métaux lourds dans les zones agricoles, pollution acide minière, monitoring de la biodiversité et déforestation dans le bassin du miombo."
                      },
                      {
                        icon: <GraduationCap className="h-8 w-8 text-[#D4AF37]" />,
                        title: "Développement Local & Économie",
                        desc: "Encadrement du secteur artisanal, structuration du développement rural, reboisement et transition vers une économie circulaire résiliente."
                      }
                    ].map((pillar, idx) => (
                      <motion.div 
                        key={idx} 
                        whileHover={{ y: -8, scale: 1.02 }}
                        transition={{ type: "spring", stiffness: 350, damping: 22 }}
                        className="bg-[#12261C] p-7 sm:p-8 rounded-2xl border border-white/10 hover:border-[#D4AF37]/50 shadow-xl transition-all duration-300 group"
                      >
                        <div className="p-3.5 bg-[#D4AF37]/10 inline-block rounded-2xl mb-6 border border-[#D4AF37]/20 group-hover:bg-[#D4AF37] group-hover:text-black transition-all">
                          {pillar.icon}
                        </div>
                        <h3 className="font-display text-lg sm:text-xl font-bold text-white mb-3 group-hover:text-[#D4AF37] transition-colors">{pillar.title}</h3>
                        <p className="text-slate-300 leading-relaxed text-xs sm:text-sm">{pillar.desc}</p>
                      </motion.div>
                    ))}
                  </div>
                </section>

                {/* LATEST NEWS SECTION */}
                <section className="bg-[#0A2016] py-20 border-y border-white/5">
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-12">
                      <div>
                        <span className="text-xs font-bold text-[#D4AF37] tracking-widest uppercase font-mono">Actualités Récentes</span>
                        <h2 className="font-display text-2xl sm:text-4xl font-bold text-white mt-1">Dernières Nouvelles du Portail</h2>
                      </div>
                      <button 
                        onClick={() => navigateTo("actualites")}
                        className="text-[#D4AF37] font-bold text-xs sm:text-sm flex items-center space-x-1 hover:text-amber-300 transition-colors group cursor-pointer"
                      >
                        <span>Consulter toutes les actualités</span>
                        <ChevronRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
                      {db.news.slice(0, 3).map((item) => (
                        <motion.div 
                          key={item.id} 
                          whileHover={{ y: -8, scale: 1.01 }}
                          transition={{ type: "spring", stiffness: 350, damping: 22 }}
                          className="bg-[#12261C] rounded-2xl shadow-xl overflow-hidden border border-white/10 flex flex-col justify-between hover:border-[#D4AF37]/50 transition-all duration-300 group"
                        >
                          <div>
                            <div className="relative h-48 w-full overflow-hidden bg-black/40">
                              <img src={item.image || "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80"} alt={item.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
                              <div className="absolute top-3 left-3">
                                <span className="bg-[#0F2A1C]/90 backdrop-blur-md text-[#D4AF37] border border-[#D4AF37]/30 px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold uppercase">
                                  {item.category}
                                </span>
                              </div>
                            </div>
                            <div className="p-6">
                              <div className="flex items-center space-x-2 text-xs text-slate-400 font-mono mb-3">
                                <Calendar className="h-3.5 w-3.5 text-[#D4AF37]" />
                                <span>{new Date(item.date).toLocaleDateString("fr-FR")}</span>
                              </div>
                              <h3 className="font-display font-bold text-base sm:text-lg text-white line-clamp-2 group-hover:text-[#D4AF37] transition-colors cursor-pointer" onClick={() => navigateTo("actualites")}>
                                {item.title}
                              </h3>
                              <p className="text-slate-300 text-xs sm:text-sm mt-3 line-clamp-3 leading-relaxed">
                                {item.content}
                              </p>
                            </div>
                          </div>
                          <div className="p-6 pt-0 flex items-center justify-between border-t border-white/5 mt-4">
                            <span className="text-xs text-slate-400 font-medium">Par <strong className="text-slate-200">{item.author}</strong></span>
                            <button onClick={() => navigateTo("actualites")} className="text-xs text-[#D4AF37] font-bold hover:underline cursor-pointer flex items-center gap-1">
                              <span>Lire</span>
                              <ArrowRight className="h-3 w-3" />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </section>

                {/* FEATURED PROJECTS */}
                <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-12">
                    <div>
                      <span className="text-xs font-bold text-[#D4AF37] tracking-widest uppercase font-mono">Recherche en Action</span>
                      <h2 className="font-display text-2xl sm:text-4xl font-bold text-white mt-1">Projets de Recherche Majeurs</h2>
                    </div>
                    <button 
                      onClick={() => navigateTo("projets")}
                      className="text-[#D4AF37] font-bold text-xs sm:text-sm flex items-center space-x-1 hover:text-amber-300 transition-colors group cursor-pointer"
                    >
                      <span>Voir tous les projets</span>
                      <ChevronRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {db.projects.slice(0, 2).map((proj) => (
                      <motion.div 
                        key={proj.id} 
                        whileHover={{ y: -8, scale: 1.01 }}
                        transition={{ type: "spring", stiffness: 350, damping: 22 }}
                        className="bg-[#12261C] p-7 sm:p-8 rounded-2xl border border-white/10 hover:border-[#D4AF37]/50 shadow-2xl flex flex-col justify-between group"
                      >
                        <div>
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                            <span className={`text-[11px] px-3 py-1 rounded-full font-bold uppercase ${
                              proj.status === "En cours" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" : "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                            }`}>
                              {proj.status}
                            </span>
                            <span className="text-xs text-[#D4AF37] font-mono font-bold bg-white/5 px-3 py-1 rounded-full border border-white/5">
                              Budget : {(proj.budget || 0).toLocaleString()} USD
                            </span>
                          </div>
                          <h3 className="font-display text-lg sm:text-xl font-bold text-white mb-3 leading-snug group-hover:text-[#D4AF37] transition-colors">{proj.title}</h3>
                          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed line-clamp-3 mb-6">{proj.description}</p>
                        </div>
                        <div className="pt-4 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                          <span>Chef de projet : <strong className="text-slate-200">{proj.leader}</strong></span>
                          <span className="bg-[#D4AF37]/10 text-[#D4AF37] px-2.5 py-1 rounded-md font-semibold text-xs">Bailleur : {proj.funding}</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {/* À PROPOS PAGE */}
            {activeTab === "propos" && (
              <div className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-3xl mx-auto mb-16">
                  <span className="text-xs font-bold text-[#D4AF37] tracking-widest uppercase font-mono bg-[#D4AF37]/10 px-3 py-1 rounded-full border border-[#D4AF37]/20">
                    Institution Académique
                  </span>
                  <h2 className="font-display text-3xl sm:text-5xl font-black text-white mt-3">À Propos de l'UR-GEDT</h2>
                  <p className="text-slate-300 mt-4 text-sm sm:text-base leading-relaxed">
                    Une unité d'excellence dédiée à l'analyse scientifique et à l'orientation stratégique du Haut-Katanga face aux défis environnementaux, fonciers et sociétaux.
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
                  <div className="space-y-6">
                    <h3 className="font-display text-2xl font-bold text-white flex items-center gap-2">
                      <Award className="h-6 w-6 text-[#D4AF37]" />
                      <span>Notre Mission Institutionnelle</span>
                    </h3>
                    <p className="text-slate-300 leading-relaxed text-sm sm:text-base">
                      L'Unité de Recherche sur la Gouvernance, l'Environnement et le Développement Territorial (UR-GEDT) est un centre rattaché à l'Université de Lubumbashi. Nous étudions la gouvernance des ressources naturelles, la dynamique des territoires et les impacts sociaux et écologiques de l'exploitation minière.
                    </p>
                    <p className="text-slate-300 leading-relaxed text-sm sm:text-base">
                      Notre objectif est d'éclairer les décideurs publics, les bailleurs de fonds internationaux, les entreprises et les communautés locales avec des données spatiales et sociologiques vérifiées pour promouvoir un développement durable et équitable.
                    </p>
                    <div className="border-l-4 border-[#D4AF37] pl-4 py-3 italic text-slate-200 bg-white/5 rounded-r-xl text-xs sm:text-sm leading-relaxed">
                      "Nous produisons des faits scientifiques à l'intersection entre l'industrie minière, l'environnement et la justice sociale au Katanga."
                    </div>
                  </div>
                  <div className="relative">
                    <div className="absolute -inset-2 bg-gradient-to-tr from-[#D4AF37] to-amber-600 rounded-2xl blur opacity-20"></div>
                    <img 
                      src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80" 
                      alt="Recherche académique" 
                      className="relative rounded-2xl shadow-2xl border border-white/10 w-full object-cover h-80 sm:h-96"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute -bottom-6 -right-6 bg-[#D4AF37] text-slate-950 p-5 rounded-2xl shadow-2xl hidden sm:block">
                      <p className="text-2xl font-black font-display">UNILU</p>
                      <p className="text-[11px] font-bold uppercase tracking-wider">Unité de Recherche Certifiée</p>
                    </div>
                  </div>
                </div>

                {/* AXES STRATÉGIQUES */}
                <div className="bg-[#12261C] text-white rounded-3xl p-8 sm:p-12 shadow-2xl border border-white/10 mb-20">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div>
                      <h3 className="font-display text-xl sm:text-2xl font-bold text-[#D4AF37] mb-6 flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5" />
                        <span>Missions Principales</span>
                      </h3>
                      <ul className="space-y-4 text-slate-300 text-xs sm:text-sm leading-relaxed">
                        <li className="flex items-start space-x-3">
                          <span className="h-6 w-6 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">1</span>
                          <span><strong>Recherche scientifique fondamentale & appliquée</strong> sur la déforestation, la dégradation des sols, la pollution industrielle et la gouvernance foncière.</span>
                        </li>
                        <li className="flex items-start space-x-3">
                          <span className="h-6 w-6 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">2</span>
                          <span><strong>Expertise conseil stratégique</strong> auprès des ministères provinciaux, bailleurs de fonds et institutions partenaires.</span>
                        </li>
                        <li className="flex items-start space-x-3">
                          <span className="h-6 w-6 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">3</span>
                          <span><strong>Ateliers de renforcement de capacités</strong> pour les coopératives minières, organisations paysannes et acteurs locaux.</span>
                        </li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-display text-xl sm:text-2xl font-bold text-[#D4AF37] mb-6 flex items-center gap-2">
                        <Layers className="h-5 w-5" />
                        <span>Axes Thématiques de Recherche</span>
                      </h3>
                      <div className="space-y-3.5">
                        {[
                          { title: "Axe A: Gouvernance minière et foncière", desc: "Suivi des compensations de déplacement, gestion du cadastre minier et droits d'usage coutumiers." },
                          { title: "Axe B: Éco-toxicologie & Changement global", desc: "Mesure de la bio-accumulation de métaux lourds dans les cultures alimentaires autour de Kipushi et Lubumbashi." },
                          { title: "Axe C: Aménagement du territoire & Énergie", desc: "Analyse des flux de makala (charbon de bois) et reforestation de la ceinture périurbaine." }
                        ].map((axe, i) => (
                          <motion.div 
                            key={i} 
                            whileHover={{ x: 6, borderColor: "rgba(212,175,55,0.4)" }}
                            transition={{ type: "spring", stiffness: 350, damping: 22 }}
                            className="bg-white/5 p-4 rounded-xl border border-white/5 transition-colors"
                          >
                            <h4 className="font-display font-bold text-xs sm:text-sm text-white">{axe.title}</h4>
                            <p className="text-xs text-slate-400 mt-1 leading-relaxed">{axe.desc}</p>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* NOTRE ÉQUIPE */}
            {activeTab === "equipe" && (
              <div className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-3xl mx-auto mb-16">
                  <span className="text-xs font-bold text-[#D4AF37] tracking-widest uppercase font-mono bg-[#D4AF37]/10 px-3 py-1 rounded-full border border-[#D4AF37]/20">
                    Les Scientifiques
                  </span>
                  <h2 className="font-display text-3xl sm:text-5xl font-black text-white mt-3">Notre Équipe de Recherche</h2>
                  <p className="text-slate-300 mt-4 text-sm sm:text-base leading-relaxed">
                    L'UR-GEDT réunit des professeurs, chercheurs, docteurs, doctorants et gestionnaires travaillant en synergie.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
                  {db.users.map((member) => (
                    <motion.div 
                      key={member.id} 
                      whileHover={{ y: -8, scale: 1.02 }}
                      transition={{ type: "spring", stiffness: 350, damping: 22 }}
                      className="bg-[#12261C] rounded-2xl shadow-xl border border-white/10 overflow-hidden text-center p-6 flex flex-col justify-between hover:border-[#D4AF37]/50 transition-all duration-300 group"
                    >
                      <div>
                        <div className="relative h-24 w-24 rounded-full mx-auto mb-4 p-1 bg-gradient-to-tr from-[#D4AF37] to-amber-500 shadow-xl group-hover:scale-105 transition-transform">
                          <div className="h-full w-full rounded-full bg-[#0A2016] overflow-hidden flex items-center justify-center">
                            {member.avatarUrl ? (
                              <img src={member.avatarUrl} alt={member.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <span className="text-2xl font-black font-display text-[#D4AF37]">
                                {member.name.split(" ").slice(-1)[0]?.[0] || "M"}
                              </span>
                            )}
                          </div>
                        </div>
                        <h3 className="font-display text-base sm:text-lg font-bold text-white group-hover:text-[#D4AF37] transition-colors">{member.name}</h3>
                        <p className="text-xs font-mono font-bold uppercase tracking-wider text-[#D4AF37] mt-1">{member.role}</p>
                        
                        <a 
                          href={`mailto:${member.email}`}
                          className="mt-4 pt-4 border-t border-white/5 flex items-center justify-center space-x-2 text-xs text-slate-300 hover:text-[#D4AF37] transition-colors font-mono cursor-pointer"
                          title={`Envoyer un courriel à ${member.name}`}
                        >
                          <Mail className="h-3.5 w-3.5 text-[#D4AF37]" />
                          <span className="truncate max-w-[180px]">{member.email}</span>
                        </a>
                      </div>
                      
                      <div className="mt-6">
                        <span className="inline-flex items-center space-x-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-medium">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          <span>Membre Actif</span>
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* PROJETS PAGE */}
            {activeTab === "projets" && (
              <div className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-3xl mx-auto mb-16">
                  <span className="text-xs font-bold text-[#D4AF37] tracking-widest uppercase font-mono bg-[#D4AF37]/10 px-3 py-1 rounded-full border border-[#D4AF37]/20">
                    Recherche Financée
                  </span>
                  <h2 className="font-display text-3xl sm:text-5xl font-black text-white mt-3">Nos Projets de Recherche</h2>
                  <p className="text-slate-300 mt-4 text-sm sm:text-base leading-relaxed">
                    Découvrez nos programmes phares d'études territoriales menés avec les bailleurs internationaux et universités partenaires.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {db.projects.map((proj) => (
                    <motion.div 
                      key={proj.id} 
                      whileHover={{ y: -8, scale: 1.01 }}
                      transition={{ type: "spring", stiffness: 350, damping: 22 }}
                      className="bg-[#12261C] rounded-2xl shadow-xl border border-white/10 overflow-hidden flex flex-col justify-between hover:border-[#D4AF37]/50 transition-all duration-300 group"
                    >
                      <div className="p-6">
                        <div className="flex justify-between items-center mb-4">
                          <span className={`text-[11px] px-3 py-1 rounded-full font-bold uppercase ${
                            proj.status === "En cours" 
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" 
                              : proj.status === "Terminé"
                              ? "bg-slate-500/15 text-slate-400 border border-slate-500/30"
                              : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                          }`}>
                            {proj.status}
                          </span>
                          <span className="text-xs font-mono font-bold text-[#D4AF37] bg-white/5 px-2.5 py-1 rounded border border-white/5">
                            {(proj.budget || 0).toLocaleString()} USD
                          </span>
                        </div>
                        <h3 className="font-display text-lg font-bold text-white mb-3 leading-snug group-hover:text-[#D4AF37] transition-colors">
                          {proj.title}
                        </h3>
                        <p className="text-slate-300 text-xs sm:text-sm leading-relaxed line-clamp-4">
                          {proj.description}
                        </p>
                      </div>

                      <div className="p-6 bg-[#0F2A1C] border-t border-white/5 space-y-2 text-xs text-slate-300">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 font-medium">Bailleur:</span>
                          <span className="font-semibold text-white">{proj.funding}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 font-medium">Directeur d'Axe:</span>
                          <span className="font-semibold text-white">{proj.leader}</span>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-white/5">
                          <span className="text-slate-400 font-medium">Période:</span>
                          <span className="font-mono text-slate-400 text-xs">
                            {new Date(proj.startDate).toLocaleDateString("fr-FR")} - {new Date(proj.endDate).toLocaleDateString("fr-FR")}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* ACTIVITÉS TERRAIN PAGE */}
            {activeTab === "activites" && (
              <div className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-3xl mx-auto mb-16">
                  <span className="text-xs font-bold text-[#D4AF37] tracking-widest uppercase font-mono bg-[#D4AF37]/10 px-3 py-1 rounded-full border border-[#D4AF37]/20">
                    Missions d'investigation
                  </span>
                  <h2 className="font-display text-3xl sm:text-5xl font-black text-white mt-3">Activités de Terrain</h2>
                  <p className="text-slate-300 mt-4 text-sm sm:text-base leading-relaxed">
                    La recherche de l'UR-GEDT s'effectue en contact direct avec les communautés locales, les mines et les gestionnaires fonciers.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {db.activities.map((act) => (
                    <motion.div 
                      key={act.id} 
                      whileHover={{ y: -8, scale: 1.01 }}
                      transition={{ type: "spring", stiffness: 350, damping: 22 }}
                      className="bg-[#12261C] rounded-2xl shadow-xl border border-white/10 overflow-hidden flex flex-col justify-between hover:border-[#D4AF37]/50 transition-all duration-300 group"
                    >
                      <div className="p-6">
                        <div className="flex justify-between items-center mb-4">
                          <div className="flex items-center space-x-1.5 text-xs text-slate-300 font-semibold">
                            <MapPin className="h-4 w-4 text-[#D4AF37]" />
                            <span>{act.location}</span>
                          </div>
                          <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                            act.status === "Réalisé" 
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" 
                              : act.status === "En cours"
                              ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                              : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                          }`}>
                            {act.status}
                          </span>
                        </div>
                        <h3 className="font-display text-base sm:text-lg font-bold text-white mb-3 group-hover:text-[#D4AF37] transition-colors">{act.title}</h3>
                        <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-4 line-clamp-3">
                          {act.description}
                        </p>
                      </div>

                      <div className="p-6 bg-[#0F2A1C] border-t border-white/5 text-xs space-y-3">
                        <div className="flex items-center justify-between text-slate-400">
                          <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-[#D4AF37]" /> Date :</span>
                          <span className="font-mono text-white font-semibold">{new Date(act.date).toLocaleDateString("fr-FR")}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-400">
                          <span>Alloc. Budgétaire :</span>
                          <span className="font-mono text-white font-semibold">{(act.budget || 0).toLocaleString()} USD</span>
                        </div>
                        <div className="pt-2 border-t border-white/5">
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Missions confiées à :</p>
                          <div className="flex flex-wrap gap-1.5">
                            {act.researchers.map((res, i) => (
                              <span key={i} className="bg-white/10 text-white px-2.5 py-0.5 rounded-md text-[11px] font-medium border border-white/5">
                                {res}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* PUBLICATIONS PAGE */}
            {activeTab === "publications" && (
              <div className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-3xl mx-auto mb-16">
                  <span className="text-xs font-bold text-[#D4AF37] tracking-widest uppercase font-mono bg-[#D4AF37]/10 px-3 py-1 rounded-full border border-[#D4AF37]/20">
                    Production Scientifique
                  </span>
                  <h2 className="font-display text-3xl sm:text-5xl font-black text-white mt-3">Publications Académiques</h2>
                  <p className="text-slate-300 mt-4 text-sm sm:text-base leading-relaxed">
                    Consultez nos ouvrages, articles dans revues internationales à comité de lecture et rapports d'expertise.
                  </p>
                </div>

                {/* SEARCH AND FILTER BAR */}
                <div className="bg-[#12261C] p-4 sm:p-5 rounded-2xl shadow-xl border border-white/10 flex flex-col md:flex-row gap-4 items-center justify-between mb-10">
                  <div className="relative w-full md:max-w-md">
                    <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Rechercher par titre, auteur, revue..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-white/10 rounded-xl bg-[#0A2016] text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#D4AF37] text-xs sm:text-sm"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 w-full md:w-auto justify-start md:justify-end">
                    {["Tous", "Article", "Livre", "Rapport", "Thèse"].map((type) => (
                      <button
                        key={type}
                        onClick={() => setFilterCategory(type)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          filterCategory === type 
                            ? "bg-[#D4AF37] text-slate-950 font-bold shadow-md shadow-[#D4AF37]/20" 
                            : "bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5"
                        }`}
                      >
                        {type}s
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  {filteredPublications.map((pub) => (
                    <motion.div 
                      key={pub.id} 
                      whileHover={{ y: -4, x: 4, borderColor: "rgba(212,175,55,0.5)" }}
                      transition={{ type: "spring", stiffness: 350, damping: 22 }}
                      className="bg-[#12261C] p-6 rounded-2xl shadow-xl border border-white/10 hover:border-[#D4AF37]/50 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                    >
                      <div className="space-y-2 flex-grow">
                        <div className="flex items-center space-x-2">
                          <span className="bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30 px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase font-mono">
                            {pub.type}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">Année : {pub.year}</span>
                        </div>
                        <h3 className="font-display font-bold text-base sm:text-lg text-white leading-snug">
                          {pub.title}
                        </h3>
                        <p className="text-xs text-slate-300">Auteurs : <strong className="text-[#D4AF37]">{pub.authors}</strong></p>
                        <p className="text-xs italic text-slate-400">Revue / Éditeur : {pub.journal}</p>
                      </div>
                      <a 
                        href={pub.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center space-x-2 bg-[#0A2016] text-slate-200 border border-[#D4AF37]/30 hover:bg-[#D4AF37] hover:text-slate-950 px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all shrink-0 cursor-pointer"
                      >
                        <BookOpen className="h-4 w-4" />
                        <span>Consulter</span>
                      </a>
                    </motion.div>
                  ))}
                  {filteredPublications.length === 0 && (
                    <div className="p-12 text-center text-slate-400 bg-[#12261C] rounded-2xl border border-white/5">
                      Aucune publication ne correspond à votre recherche.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ACTUALITÉS PAGE */}
            {activeTab === "actualites" && (
              <div className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-3xl mx-auto mb-16">
                  <span className="text-xs font-bold text-[#D4AF37] tracking-widest uppercase font-mono bg-[#D4AF37]/10 px-3 py-1 rounded-full border border-[#D4AF37]/20">
                    Portail d'informations
                  </span>
                  <h2 className="font-display text-3xl sm:text-5xl font-black text-white mt-3">Dernières Actualités & Ateliers</h2>
                  <p className="text-slate-300 mt-4 text-sm sm:text-base leading-relaxed">
                    Suivez la vie académique de l'UR-GEDT à Lubumbashi : colloques, rapports publiés, interventions de terrain, et séminaires.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {db.news.map((item) => (
                    <motion.div 
                      key={item.id} 
                      whileHover={{ y: -8, scale: 1.01 }}
                      transition={{ type: "spring", stiffness: 350, damping: 22 }}
                      className="bg-[#12261C] rounded-2xl shadow-xl border border-white/10 overflow-hidden flex flex-col justify-between hover:border-[#D4AF37]/50 transition-all duration-300 group"
                    >
                      <div>
                        {item.image && (item.image.startsWith("data:application/pdf") || item.image.endsWith(".pdf") || item.image.includes("pdf")) ? (
                          <div className="h-52 w-full bg-slate-950 flex flex-col items-center justify-center border-b border-white/5 relative group p-4">
                            <div className="p-4 bg-red-500/10 rounded-full text-red-400 border border-red-500/20 group-hover:scale-110 transition-transform mb-3">
                              <FileText className="h-10 w-10" />
                            </div>
                            <span className="text-xs text-slate-400 font-mono">Document PDF Joint</span>
                            <a 
                              href={item.image} 
                              download={`${item.title}.pdf`}
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs font-bold text-white uppercase"
                            >
                              <span className="bg-[#D4AF37] text-slate-950 px-4 py-2.5 rounded-xl font-bold shadow-lg">Ouvrir le PDF</span>
                            </a>
                          </div>
                        ) : (
                          <div className="relative h-52 w-full overflow-hidden bg-black/40">
                            <img src={item.image || "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80"} alt={item.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
                          </div>
                        )}
                        <div className="p-6">
                          <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                            <span className="bg-[#D4AF37]/15 text-[#D4AF37] px-2.5 py-0.5 rounded-md font-bold uppercase font-mono text-[11px] border border-[#D4AF37]/30">
                              {item.category}
                            </span>
                            <span className="flex items-center gap-1 font-mono text-xs">
                              <Calendar className="h-3.5 w-3.5 text-[#D4AF37]" />
                              {new Date(item.date).toLocaleDateString("fr-FR")}
                            </span>
                          </div>
                          <h3 className="font-display font-bold text-lg text-white leading-snug mb-3 group-hover:text-[#D4AF37] transition-colors">
                            {item.title}
                          </h3>
                          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed whitespace-pre-line">
                            {item.content}
                          </p>
                        </div>
                      </div>

                      <div className="p-6 bg-[#0F2A1C] border-t border-white/5 text-xs text-slate-400 flex justify-between items-center">
                        <span>Auteur : <strong className="text-white">{item.author}</strong></span>
                        <span className="text-[#D4AF37] font-bold font-mono">UR-GEDT</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* GALERIE & MÉDIATHÈQUE PAGE */}
            {activeTab === "galerie" && (
              <div className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-3xl mx-auto mb-12">
                  <span className="text-xs font-bold text-[#D4AF37] tracking-widest uppercase font-mono bg-[#D4AF37]/10 px-3 py-1 rounded-full border border-[#D4AF37]/20">
                    Médiathèque
                  </span>
                  <h2 className="font-display text-3xl sm:text-5xl font-black text-white mt-3">Galerie Photos & Documents</h2>
                  <p className="text-slate-300 mt-4 text-sm sm:text-base leading-relaxed">
                    Rétrospective visuelle de nos missions sur le terrain, nos ateliers scientifiques et nos enregistrements.
                  </p>
                </div>

                {/* MEDIA TYPE FILTER CHIPS */}
                <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
                  {["Tous", "Photos", "Vidéos", "Audios", "Documents"].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setGalleryFilter(cat)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        galleryFilter === cat
                          ? "bg-[#D4AF37] text-slate-950 shadow-md shadow-[#D4AF37]/20"
                          : "bg-[#12261C] text-slate-300 hover:text-white border border-white/10"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredGallery.map((item) => (
                    <motion.div 
                      key={item.id} 
                      whileHover={{ scale: 1.03, y: -6 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ type: "spring", stiffness: 350, damping: 22 }}
                      onClick={() => setSelectedImage(item)}
                      className="bg-[#12261C] rounded-2xl overflow-hidden shadow-xl border border-white/10 group cursor-pointer hover:border-[#D4AF37]/50 transition-all duration-300 flex flex-col justify-between"
                    >
                      <div className="relative overflow-hidden h-60 w-full bg-black/40">
                        {item.type === "photo" ? (
                          <img 
                            src={item.url} 
                            alt={item.title} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            referrerPolicy="no-referrer"
                          />
                        ) : item.type === "video" ? (
                          <div className="w-full h-full bg-[#0A2016] flex flex-col items-center justify-center relative">
                            {item.url && item.url.startsWith("data:image") ? (
                              <img src={item.url} alt={item.title} className="w-full h-full object-cover opacity-50" />
                            ) : (
                              <div className="text-center p-4">
                                <span className="text-4xl">🎥</span>
                              </div>
                            )}
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                              <div className="h-12 w-12 bg-[#D4AF37]/20 border border-[#D4AF37]/50 rounded-full flex items-center justify-center text-[#D4AF37] group-hover:scale-110 transition-transform">
                                <span className="text-sm ml-0.5">▶</span>
                              </div>
                            </div>
                          </div>
                        ) : item.type === "audio" ? (
                          <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center relative p-6 text-center">
                            <div className="h-14 w-14 bg-amber-500/10 rounded-full flex items-center justify-center text-[#D4AF37] mb-2 border border-[#D4AF37]/20 group-hover:scale-105 transition-transform">
                              <Music className="h-6 w-6" />
                            </div>
                            <span className="text-xs font-bold text-white uppercase font-display">Audio</span>
                          </div>
                        ) : (
                          <div className="w-full h-full bg-[#0F2A1C] flex flex-col items-center justify-center relative p-6 text-center">
                            <div className="h-14 w-14 bg-red-500/10 rounded-full flex items-center justify-center text-red-400 mb-2 border border-red-500/20 group-hover:scale-105 transition-transform">
                              <File className="h-6 w-6" />
                            </div>
                            <span className="text-xs font-bold text-white uppercase font-display">Rapport PDF</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-white border border-[#D4AF37]/50 rounded-xl px-4 py-2 text-xs font-bold bg-black/70 flex items-center gap-2">
                            <Eye className="h-4 w-4 text-[#D4AF37]" />
                            <span>Consulter</span>
                          </span>
                        </div>
                        <span className="absolute bottom-3 right-3 bg-black/85 text-[#D4AF37] font-mono text-[10px] font-bold px-2.5 py-0.5 rounded border border-[#D4AF37]/20 uppercase">
                          {item.type}
                        </span>
                      </div>
                      <div className="p-5 flex-grow flex flex-col justify-between">
                        <div>
                          <h3 className="font-display font-bold text-sm text-white leading-snug line-clamp-1 group-hover:text-[#D4AF37] transition-colors">{item.title}</h3>
                          <p className="text-xs text-slate-400 line-clamp-2 mt-1">{item.description}</p>
                        </div>
                        <p className="text-[11px] text-slate-500 font-mono mt-3">{new Date(item.date).toLocaleDateString("fr-FR")}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* LIGHTBOX MODAL */}
                <AnimatePresence>
                  {selectedImage && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setSelectedImage(null)}
                      className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-4 overflow-y-auto backdrop-blur-md"
                    >
                      <button className="absolute top-6 right-6 text-white bg-white/10 hover:bg-white/20 p-3 rounded-full transition-colors cursor-pointer border border-white/10">
                        <X className="h-6 w-6" />
                      </button>
                      <div className="max-w-4xl w-full text-center my-8" onClick={(e) => e.stopPropagation()}>
                        
                        <div className="bg-[#12261C] p-6 rounded-3xl border border-white/10 max-w-2xl mx-auto shadow-2xl">
                          {selectedImage.type === "photo" && (
                            <img 
                              src={selectedImage.url} 
                              alt={selectedImage.title} 
                              className="max-h-[60vh] max-w-full mx-auto object-contain rounded-xl border border-white/10 shadow-2xl"
                              referrerPolicy="no-referrer"
                            />
                          )}

                          {selectedImage.type === "video" && (
                            <div className="aspect-video w-full rounded-xl overflow-hidden bg-black border border-white/10">
                              {(() => {
                                const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
                                const match = selectedImage.url.match(regExp);
                                if (match && match[2].length === 11) {
                                  return (
                                    <iframe
                                      src={`https://www.youtube.com/embed/${match[2]}`}
                                      title={selectedImage.title}
                                      className="w-full h-full border-none"
                                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                      allowFullScreen
                                    ></iframe>
                                  );
                                } else {
                                  return (
                                    <video
                                      src={selectedImage.url}
                                      controls
                                      className="w-full h-full object-contain"
                                    ></video>
                                  );
                                }
                              })()}
                            </div>
                          )}

                          {selectedImage.type === "audio" && (
                            <div className="p-8 bg-slate-950 rounded-2xl border border-white/5 text-center space-y-6">
                              <div className="h-20 w-20 bg-[#D4AF37]/15 rounded-full flex items-center justify-center text-[#D4AF37] mx-auto border border-[#D4AF37]/30">
                                <Music className="h-10 w-10" />
                              </div>
                              <div className="space-y-1">
                                <span className="text-[11px] text-slate-500 font-mono uppercase tracking-wider">Lecteur Audio Intégré</span>
                                <h4 className="font-display font-bold text-white text-base">{selectedImage.title}</h4>
                              </div>
                              <audio 
                                src={selectedImage.url} 
                                controls 
                                className="w-full max-w-md mx-auto"
                              ></audio>
                            </div>
                          )}

                          {selectedImage.type === "pdf" && (
                            <div className="p-8 bg-black/40 rounded-2xl border border-white/5 text-center space-y-6">
                              <div className="h-20 w-20 bg-red-500/10 rounded-full flex items-center justify-center text-red-400 mx-auto border border-red-500/20">
                                <File className="h-10 w-10" />
                              </div>
                              <div className="space-y-1">
                                <span className="text-[11px] text-slate-500 font-mono uppercase tracking-wider">Document / Rapport PDF</span>
                                <h4 className="font-display font-bold text-white text-base">{selectedImage.title}</h4>
                                <p className="text-xs text-slate-400 max-w-md mx-auto mt-2">{selectedImage.description}</p>
                              </div>
                              <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
                                <a 
                                  href={selectedImage.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="bg-[#D4AF37] hover:bg-amber-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-2"
                                >
                                  <Eye className="h-4 w-4" />
                                  <span>Ouvrir dans un nouvel onglet</span>
                                </a>
                                <a 
                                  href={selectedImage.url} 
                                  download={`${selectedImage.title.toLowerCase().replace(/ /g, "_")}.pdf`}
                                  className="bg-[#12261C] hover:bg-white/10 text-white border border-white/10 font-bold px-5 py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-2"
                                >
                                  <FileDown className="h-4 w-4 text-[#D4AF37]" />
                                  <span>Télécharger le document</span>
                                </a>
                              </div>
                            </div>
                          )}

                          <div className="mt-6 text-left border-t border-white/5 pt-4">
                            <h3 className="font-display font-bold text-lg text-[#D4AF37]">{selectedImage.title}</h3>
                            <p className="text-xs text-slate-300 mt-1.5">{selectedImage.description}</p>
                            <p className="text-[11px] text-slate-500 font-mono mt-3">Date : {new Date(selectedImage.date).toLocaleDateString("fr-FR")}</p>
                          </div>
                        </div>

                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* PARTENAIRES PAGE */}
            {activeTab === "partenaires" && (
              <div className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-3xl mx-auto mb-16">
                  <span className="text-xs font-bold text-[#D4AF37] tracking-widest uppercase font-mono bg-[#D4AF37]/10 px-3 py-1 rounded-full border border-[#D4AF37]/20">
                    Soutiens & Alliances
                  </span>
                  <h2 className="font-display text-3xl sm:text-5xl font-black text-white mt-3">Partenaires Stratégiques</h2>
                  <p className="text-slate-300 mt-4 text-sm sm:text-base leading-relaxed">
                    La crédibilité et l'impact de nos recherches s'appuient sur un réseau d'institutions académiques et d'agences de développement.
                  </p>
                </div>

                {["Académique", "Financier", "Institutionnel"].map((cat) => (
                  <div key={cat} className="mb-14">
                    <h3 className="font-display text-base sm:text-lg font-bold text-slate-200 border-b border-[#D4AF37]/30 pb-3 mb-6 uppercase tracking-wider flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[#D4AF37]"></span>
                      <span>Partenaires {cat}s</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {db.partners.filter(p => p.type === cat).map((p) => (
                        <motion.div 
                          key={p.id} 
                          whileHover={{ y: -6, scale: 1.02 }}
                          transition={{ type: "spring", stiffness: 350, damping: 22 }}
                          className="bg-[#12261C] p-6 rounded-2xl shadow-xl border border-white/10 flex items-center space-x-4 hover:border-[#D4AF37]/50 transition-all cursor-pointer group"
                        >
                          <img 
                            src={p.logo} 
                            alt={p.name} 
                            className="h-16 w-16 rounded-xl object-cover bg-black/40 border border-white/10 shrink-0 group-hover:scale-105 transition-transform" 
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <h4 className="font-display font-bold text-sm text-white group-hover:text-[#D4AF37] transition-colors">{p.name}</h4>
                            <p className="text-xs text-[#D4AF37] font-semibold uppercase font-mono tracking-wider mt-0.5">{p.type}</p>
                            <a 
                              href={p.website} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-xs text-slate-400 hover:text-[#D4AF37] hover:underline mt-2 inline-flex items-center gap-1 font-mono"
                            >
                              <span>Visiter le site</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* CONTACT PAGE */}
            {activeTab === "contact" && (
              <div className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-3xl mx-auto mb-16">
                  <span className="text-xs font-bold text-[#D4AF37] tracking-widest uppercase font-mono bg-[#D4AF37]/10 px-3 py-1 rounded-full border border-[#D4AF37]/20">
                    Écrivez-nous
                  </span>
                  <h2 className="font-display text-3xl sm:text-5xl font-black text-white mt-3">Nous Contacter</h2>
                  <p className="text-slate-300 mt-4 text-sm sm:text-base leading-relaxed">
                    Vous souhaitez collaborer, commander une étude environnementale, solliciter un stage ou soumettre un projet ? Contactez notre secrétariat.
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
                  
                  {/* COORDONNÉES */}
                  <div className="space-y-8 bg-[#12261C] text-white p-8 sm:p-10 rounded-3xl shadow-2xl border border-white/10">
                    <div>
                      <h3 className="font-display text-xl font-bold text-[#D4AF37] mb-3">Secrétariat UR-GEDT</h3>
                      <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                        L'Unité de Recherche est implantée au sein du campus universitaire principal de la Kasapa à Lubumbashi. Nos bureaux sont ouverts du lundi au vendredi de 8h00 à 16h00.
                      </p>
                    </div>

                    <div className="space-y-5 text-xs sm:text-sm text-slate-300">
                      <div className="flex items-start space-x-3.5">
                        <MapPin className="h-5 w-5 text-[#D4AF37] shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-white block mb-0.5">Adresse physique :</strong>
                          <span>Faculté des Sciences Sociales, Campus de la Kasapa, Université de Lubumbashi, Haut-Katanga, RDC</span>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3.5">
                        <Mail className="h-5 w-5 text-[#D4AF37] shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-white block mb-0.5">Courriel Officiel :</strong>
                          <a href="mailto:urgedt.rdcongo@gmail.com" className="text-slate-200 hover:text-[#D4AF37] hover:underline font-mono text-xs block">
                            urgedt.rdcongo@gmail.com
                          </a>
                          <a href="mailto:secretariat@urgedt.org" className="text-slate-400 hover:text-[#D4AF37] hover:underline font-mono text-xs block mt-0.5">
                            secretariat@urgedt.org
                          </a>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3.5">
                        <Phone className="h-5 w-5 text-[#D4AF37] shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-white block mb-0.5">Téléphone Secrétariat :</strong>
                          <a href="tel:+243800827348" className="text-slate-200 hover:text-[#D4AF37] hover:underline font-mono text-xs block">
                            +243 800 827 348
                          </a>
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-white/10 space-y-3">
                      <p className="text-xs uppercase font-bold text-[#D4AF37] tracking-wider font-mono">Réseaux Sociaux Officiels</p>
                      <div className="flex flex-wrap gap-2">
                        <a href="https://www.linkedin.com/in/ur-getd-unilu-4172bb425" target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-white/5 hover:bg-[#D4AF37] text-slate-300 hover:text-slate-950 rounded-xl border border-white/5 text-xs font-semibold flex items-center gap-1.5 transition-all">
                          <Linkedin className="h-3.5 w-3.5" />
                          <span>LinkedIn</span>
                        </a>
                        <a href="https://web.facebook.com/profile.php?id=61592205587276" target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-white/5 hover:bg-[#D4AF37] text-slate-300 hover:text-slate-950 rounded-xl border border-white/5 text-xs font-semibold flex items-center gap-1.5 transition-all">
                          <Facebook className="h-3.5 w-3.5" />
                          <span>Facebook</span>
                        </a>
                        <a href="https://x.com/URGEDTUNILu" target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-white/5 hover:bg-[#D4AF37] text-slate-300 hover:text-slate-950 rounded-xl border border-white/5 text-xs font-semibold flex items-center gap-1.5 transition-all">
                          <Twitter className="h-3.5 w-3.5" />
                          <span>X / Twitter</span>
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* FORMULAIRE DE CONTACT */}
                  <div className="bg-[#12261C] p-8 sm:p-10 rounded-3xl shadow-2xl border border-white/10">
                    <h3 className="font-display text-xl font-bold text-white mb-6">Formulaire de Message</h3>
                    
                    <form onSubmit={handleContactSubmit} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Votre Nom Complet</label>
                        <input
                          type="text"
                          required
                          value={contactForm.senderName}
                          onChange={(e) => setContactForm({ ...contactForm, senderName: e.target.value })}
                          placeholder="Ex: Prof. Maurice Ntububa"
                          className="w-full px-4 py-2.5 border border-white/10 rounded-xl bg-[#0A2016] text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#D4AF37] text-xs sm:text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Votre Courriel</label>
                          <input
                            type="email"
                            required
                            value={contactForm.senderEmail}
                            onChange={(e) => setContactForm({ ...contactForm, senderEmail: e.target.value })}
                            placeholder="Ex: contact@unilu.ac.cd"
                            className="w-full px-4 py-2.5 border border-white/10 rounded-xl bg-[#0A2016] text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#D4AF37] text-xs sm:text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Sujet de la demande</label>
                          <input
                            type="text"
                            required
                            value={contactForm.subject}
                            onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                            placeholder="Ex: Demande de partenariat"
                            className="w-full px-4 py-2.5 border border-white/10 rounded-xl bg-[#0A2016] text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#D4AF37] text-xs sm:text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Message</label>
                        <textarea
                          required
                          rows={5}
                          value={contactForm.message}
                          onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                          placeholder="Rédigez votre demande de façon claire et détaillée..."
                          className="w-full px-4 py-2.5 border border-white/10 rounded-xl bg-[#0A2016] text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#D4AF37] text-xs sm:text-sm"
                        ></textarea>
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-gradient-to-r from-[#D4AF37] to-amber-500 hover:from-amber-400 hover:to-[#D4AF37] text-slate-950 font-bold py-3.5 rounded-xl shadow-lg shadow-[#D4AF37]/20 transition-all flex items-center justify-center space-x-2 text-sm cursor-pointer active:scale-95"
                      >
                        {isSubmitting ? (
                          <span>Envoi en cours...</span>
                        ) : (
                          <>
                            <Mail className="h-4 w-4" />
                            <span>Envoyer le message</span>
                          </>
                        )}
                      </button>

                      {contactSuccess === true && (
                        <div className="p-4 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-medium">
                          Votre message a bien été envoyé ! Notre secrétariat vous répondra dans les plus brefs délais.
                        </div>
                      )}
                      {contactSuccess === false && (
                        <div className="p-4 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-xs font-medium">
                          Une erreur est survenue lors de l'envoi. Veuillez réessayer plus tard.
                        </div>
                      )}
                    </form>
                  </div>

                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* REFINED FOOTER */}
      <footer className="bg-[#0A121E] text-white border-t-2 border-[#D4AF37] py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <img 
                src={siteSettings?.logo || "/logo.jpg"} 
                alt="Logo UR-GEDT" 
                className="h-12 w-12 object-contain rounded-full bg-white p-0.5 border border-[#D4AF37]" 
                referrerPolicy="no-referrer"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/logo.jpg'; }}
              />
              <h3 className="font-display font-bold text-xl text-[#D4AF37]">{siteSettings?.siteName || "UR-GEDT"}</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Unité de Recherche sur la Gouvernance, l'Environnement et le Développement Territorial de l'Université de Lubumbashi (RDC).
            </p>
            <div className="pt-2 flex items-center space-x-2.5">
              <a href={siteSettings?.linkedin || "https://www.linkedin.com/in/ur-getd-unilu-4172bb425"} target="_blank" rel="noopener noreferrer" className="h-8 w-8 bg-white/5 hover:bg-[#D4AF37] text-slate-400 hover:text-slate-950 rounded-full flex items-center justify-center transition-all" title="LinkedIn">
                <Linkedin className="h-4 w-4" />
              </a>
              <a href={siteSettings?.facebook || "https://web.facebook.com/profile.php?id=61592205587276"} target="_blank" rel="noopener noreferrer" className="h-8 w-8 bg-white/5 hover:bg-[#D4AF37] text-slate-400 hover:text-slate-950 rounded-full flex items-center justify-center transition-all" title="Facebook">
                <Facebook className="h-4 w-4" />
              </a>
              <a href={siteSettings?.twitter || "https://x.com/URGEDTUNILu"} target="_blank" rel="noopener noreferrer" className="h-8 w-8 bg-white/5 hover:bg-[#D4AF37] text-slate-400 hover:text-slate-950 rounded-full flex items-center justify-center transition-all" title="X (Twitter)">
                <Twitter className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-display font-semibold text-xs uppercase tracking-widest text-[#D4AF37] mb-4">Navigation</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><button onClick={() => navigateTo("accueil")} className="hover:text-white transition-colors">Accueil</button></li>
              <li><button onClick={() => navigateTo("propos")} className="hover:text-white transition-colors">À propos de l'UR-GEDT</button></li>
              <li><button onClick={() => navigateTo("equipe")} className="hover:text-white transition-colors">Notre équipe de chercheurs</button></li>
              <li><button onClick={() => navigateTo("projets")} className="hover:text-white transition-colors">Projets de recherche</button></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-semibold text-xs uppercase tracking-widest text-[#D4AF37] mb-4">Médiathèque & Travaux</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><button onClick={() => navigateTo("publications")} className="hover:text-white transition-colors">Publications scientifiques</button></li>
              <li><button onClick={() => navigateTo("activites")} className="hover:text-white transition-colors">Missions d'enquêtes terrain</button></li>
              <li><button onClick={() => navigateTo("galerie")} className="hover:text-white transition-colors">Galerie & Rapports PDF</button></li>
              <li><button onClick={() => navigateTo("partenaires")} className="hover:text-white transition-colors">Partenaires institutionnels</button></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-semibold text-xs uppercase tracking-widest text-[#D4AF37] mb-4">Contact Direct</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              {siteSettings?.address || "Campus Universitaire Kasapa, Bâtiment Faculté des Sciences Sociales. Lubumbashi, Haut-Katanga, RDC"}
            </p>
            <p className="text-xs text-[#D4AF37] mt-3 font-mono flex flex-col gap-1">
              <a href={`mailto:${siteSettings?.email || "urgedt.rdcongo@gmail.com"}`} className="hover:underline hover:text-white transition-colors">{siteSettings?.email || "urgedt.rdcongo@gmail.com"}</a>
              <a href={`tel:${(siteSettings?.phone || "+243 800 827 348").replace(/\s+/g, '')}`} className="hover:underline hover:text-white transition-colors">{siteSettings?.phone || "+243 800 827 348"}</a>
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 mt-8 border-t border-white/10 text-center text-xs text-slate-500 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>© 2026 UR-GEDT - Université de Lubumbashi. Tous droits réservés.</p>
          <p className="text-[11px] uppercase font-mono tracking-wider">Université de Lubumbashi · Portail de Recherche Intégrée</p>
        </div>
      </footer>

      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
