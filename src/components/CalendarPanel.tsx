import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  Users,
  DollarSign,
  Filter,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Edit,
  Info,
  CalendarDays,
  ListTodo,
  CalendarRange
} from "lucide-react";
import { FieldActivity } from "../types";

interface CalendarPanelProps {
  activities: FieldActivity[];
  onOpenForm: (type: string, item?: any) => void;
  onDeleteItem: (type: string, id: string, label: string) => void;
  canManageActivities: boolean;
}

type EventType = "Recherche" | "Réunion" | "Séminaire";

interface ParsedEvent extends FieldActivity {
  parsedType: EventType;
  titleClean: string;
}

export default function CalendarPanel({
  activities,
  onOpenForm,
  onDeleteItem,
  canManageActivities
}: CalendarPanelProps) {
  const [viewDate, setViewDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week" | "list">("month");
  const [filterType, setFilterType] = useState<"all" | EventType>("all");
  const [selectedEvent, setSelectedEvent] = useState<ParsedEvent | null>(null);

  // Helper to check if an event is in the next 24 hours (today or tomorrow)
  const isUpcoming24h = (dateStr: string): boolean => {
    if (!dateStr) return false;
    const now = new Date();
    const eventDate = new Date(dateStr);
    
    const diffMs = eventDate.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    const eventLocalDateStr = dateStr.substring(0, 10);
    
    const formatLocal = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };
    
    const todayStr = formatLocal(now);
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = formatLocal(tomorrow);
    
    return (diffHours >= -12 && diffHours <= 24) || eventLocalDateStr === todayStr || eventLocalDateStr === tomorrowStr;
  };

  // Parse activities and extract event type and cleaned title
  const parsedEvents = useMemo<ParsedEvent[]>(() => {
    return activities.map((act) => {
      let type: EventType = "Recherche";
      let titleClean = act.title;

      if (act.title.startsWith("[Réunion]")) {
        type = "Réunion";
        titleClean = act.title.replace("[Réunion]", "").trim();
      } else if (act.title.startsWith("[Séminaire]")) {
        type = "Séminaire";
        titleClean = act.title.replace("[Séminaire]", "").trim();
      } else if (act.title.startsWith("[Recherche]")) {
        type = "Recherche";
        titleClean = act.title.replace("[Recherche]", "").trim();
      } else {
        // Fallback keyword matching
        const t = act.title.toLowerCase();
        const d = act.description.toLowerCase();
        if (t.includes("réunion") || d.includes("réunion") || t.includes("reunion") || d.includes("reunion")) {
          type = "Réunion";
        } else if (
          t.includes("séminaire") ||
          d.includes("séminaire") ||
          t.includes("seminaire") ||
          d.includes("seminaire") ||
          t.includes("colloque") ||
          t.includes("conférence") ||
          t.includes("atelier")
        ) {
          type = "Séminaire";
        }
      }

      return {
        ...act,
        parsedType: type,
        titleClean
      };
    });
  }, [activities]);

  // Filter events by type
  const filteredEvents = useMemo(() => {
    if (filterType === "all") return parsedEvents;
    return parsedEvents.filter((e) => e.parsedType === filterType);
  }, [parsedEvents, filterType]);

  // Convert Date object to YYYY-MM-DD local format
  const getLocalDateString = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  // Month navigation helpers
  const handlePrev = () => {
    if (viewMode === "month") {
      setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    } else if (viewMode === "week") {
      setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth(), viewDate.getDate() - 7));
    } else {
      setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    }
  };

  const handleNext = () => {
    if (viewMode === "month") {
      setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    } else if (viewMode === "week") {
      setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth(), viewDate.getDate() + 7));
    } else {
      setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    }
  };

  const handleToday = () => {
    setViewDate(new Date());
  };

  // Month names
  const monthNames = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];

  const currentMonthName = monthNames[viewDate.getMonth()];
  const currentYear = viewDate.getFullYear();

  // Month Grid Calculations
  const monthGridDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    // First day of current month
    const firstDayIndex = new Date(year, month, 1).getDay(); // Sun = 0, Mon = 1...
    // Convert to European layout (Mon = 0, Tue = 1 ... Sun = 6)
    const startOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

    // Total days in current month
    const totalDays = new Date(year, month + 1, 0).getDate();

    // Total days in previous month
    const prevMonthTotalDays = new Date(year, month, 0).getDate();

    const daysList: Array<{ date: Date; isCurrentMonth: boolean; key: string }> = [];

    // Previous month padding
    for (let i = startOffset - 1; i >= 0; i--) {
      const prevDay = prevMonthTotalDays - i;
      const d = new Date(year, month - 1, prevDay);
      daysList.push({
        date: d,
        isCurrentMonth: false,
        key: `prev-${prevDay}`
      });
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(year, month, i);
      daysList.push({
        date: d,
        isCurrentMonth: true,
        key: `current-${i}`
      });
    }

    // Next month padding (make it grid of 35 or 42)
    const remainingSlots = daysList.length <= 35 ? 35 - daysList.length : 42 - daysList.length;
    for (let i = 1; i <= remainingSlots; i++) {
      const d = new Date(year, month + 1, i);
      daysList.push({
        date: d,
        isCurrentMonth: false,
        key: `next-${i}`
      });
    }

    return daysList;
  }, [viewDate]);

  // Week Grid Calculations
  const weekDays = useMemo(() => {
    const currentDay = viewDate.getDay(); // 0 is Sunday, 1 is Monday...
    const diff = viewDate.getDate() - currentDay + (currentDay === 0 ? -6 : 1); // Adjust for Mon start
    const monday = new Date(viewDate.setDate(diff));

    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(d);
    }
    return days;
  }, [viewDate]);

  // Helper to get events on a specific day
  const getEventsForDay = (date: Date) => {
    const dateStr = getLocalDateString(date);
    return filteredEvents.filter((e) => e.date && e.date.substring(0, 10) === dateStr);
  };

  // Color mappings for event types
  const typeColors: Record<EventType, { badge: string; dot: string; bg: string; text: string; border: string }> = {
    Recherche: {
      badge: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
      dot: "bg-purple-400",
      bg: "bg-purple-950/20 hover:bg-purple-950/30",
      text: "text-purple-300",
      border: "border-purple-500/15"
    },
    Réunion: {
      badge: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
      dot: "bg-blue-400",
      bg: "bg-blue-950/20 hover:bg-blue-950/30",
      text: "text-blue-300",
      border: "border-blue-500/15"
    },
    Séminaire: {
      badge: "bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20",
      dot: "bg-[#D4AF37]",
      bg: "bg-amber-950/20 hover:bg-amber-950/30",
      text: "text-amber-300",
      border: "border-[#D4AF37]/15"
    }
  };

  const typeIcons: Record<EventType, string> = {
    Recherche: "🔬",
    Réunion: "👥",
    Séminaire: "🎓"
  };

  // Handle cell click to add a new event on that day
  const handleCellClick = (date: Date) => {
    if (!canManageActivities) return;
    const dateStr = getLocalDateString(date);
    onOpenForm("activity", {
      title: "",
      description: "",
      location: "",
      date: dateStr,
      status: "Planifié",
      budget: 0,
      researchers: [],
      type: filterType !== "all" ? filterType : "Recherche"
    });
  };

  // Handle event click to open detail popup
  const handleEventClick = (event: ParsedEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEvent(event);
  };

  // Calendar statistics
  const stats = useMemo(() => {
    const totalCount = parsedEvents.length;
    const rechercheCount = parsedEvents.filter(e => e.parsedType === "Recherche").length;
    const reunionCount = parsedEvents.filter(e => e.parsedType === "Réunion").length;
    const seminaireCount = parsedEvents.filter(e => e.parsedType === "Séminaire").length;
    const totalBudget = parsedEvents.reduce((sum, e) => sum + (e.budget || 0), 0);

    return {
      totalCount,
      rechercheCount,
      reunionCount,
      seminaireCount,
      totalBudget
    };
  }, [parsedEvents]);

  // Upcoming 24h events list
  const upcomingEvents = useMemo(() => {
    return parsedEvents.filter((e) => isUpcoming24h(e.date));
  }, [parsedEvents]);

  return (
    <div className="space-y-6">
      {/* UPCOMING 24H ALERT BANNER */}
      {upcomingEvents.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-950/20 border border-amber-500/20 rounded-xl p-4 flex items-start space-x-3.5 shadow-lg"
        >
          <div className="h-9 w-9 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center justify-center text-amber-400 shrink-0 animate-pulse">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div className="flex-grow space-y-1">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Activités imminentes (Prochaines 24 heures)</span>
              <span className="bg-amber-550 text-white border border-amber-450/30 text-[10px] font-mono px-2 py-0.5 rounded-full font-extrabold animate-pulse">
                {upcomingEvents.length} active{upcomingEvents.length > 1 ? "s" : ""}
              </span>
            </h4>
            <p className="text-slate-300 text-xs leading-relaxed">
              Les activités suivantes exigent une attention immédiate pour la logistique ou la préparation :
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {upcomingEvents.map((event) => (
                <div
                  key={event.id}
                  onClick={(e) => handleEventClick(event, e)}
                  className="bg-black/30 hover:bg-black/50 border border-amber-500/10 hover:border-amber-500/30 text-[10px] font-mono px-2.5 py-1.5 rounded-lg text-slate-300 flex items-center space-x-2 cursor-pointer transition-colors"
                >
                  <span className="text-xs">{typeIcons[event.parsedType]}</span>
                  <span className="font-semibold text-white truncate max-w-[150px]">{event.titleClean}</span>
                  <span className="text-amber-400">({new Date(event.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })})</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
      {/* STATS BAR */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-[#111111] p-4 rounded-xl border border-white/5 flex items-center justify-between shadow-md">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider font-semibold">Total Planifié</span>
            <p className="text-xl font-bold font-display text-white">{stats.totalCount}</p>
          </div>
          <div className="h-10 w-10 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center text-white">
            <CalendarIcon className="h-5 w-5" />
          </div>
        </div>
        <div className="bg-[#111111] p-4 rounded-xl border border-white/5 flex items-center justify-between shadow-md">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider font-semibold">Missions Recherche</span>
            <p className="text-xl font-bold font-display text-purple-400">{stats.rechercheCount}</p>
          </div>
          <div className="h-10 w-10 bg-purple-500/5 border border-purple-500/10 rounded-lg flex items-center justify-center text-purple-450">
            <span className="text-lg">🔬</span>
          </div>
        </div>
        <div className="bg-[#111111] p-4 rounded-xl border border-white/5 flex items-center justify-between shadow-md">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider font-semibold">Réunions</span>
            <p className="text-xl font-bold font-display text-blue-400">{stats.reunionCount}</p>
          </div>
          <div className="h-10 w-10 bg-blue-500/5 border border-blue-500/10 rounded-lg flex items-center justify-center text-blue-455">
            <span className="text-lg">👥</span>
          </div>
        </div>
        <div className="bg-[#111111] p-4 rounded-xl border border-white/5 flex items-center justify-between shadow-md">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider font-semibold">Séminaires</span>
            <p className="text-xl font-bold font-display text-[#D4AF37]">{stats.seminaireCount}</p>
          </div>
          <div className="h-10 w-10 bg-amber-500/5 border border-amber-500/10 rounded-lg flex items-center justify-center text-amber-500">
            <span className="text-lg">🎓</span>
          </div>
        </div>
        <div className="bg-[#111111] p-4 rounded-xl border border-white/5 flex items-center justify-between shadow-md">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider font-semibold">Budget Engagé</span>
            <p className="text-xl font-bold font-display text-[#D4AF37] font-mono">{(stats.totalBudget || 0).toLocaleString()} USD</p>
          </div>
          <div className="h-10 w-10 bg-[#D4AF37]/5 border border-[#D4AF37]/10 rounded-lg flex items-center justify-center text-[#D4AF37]">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* CALENDAR CONTROLS & HEADER */}
      <div className="bg-[#111111] border border-white/5 rounded-xl p-4 flex flex-col md:flex-row justify-between items-center gap-4 shadow-md">
        {/* Navigation buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrev}
            className="p-2 bg-[#151515] hover:bg-white/5 text-slate-300 rounded-lg border border-white/5 cursor-pointer transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="font-display font-extrabold text-sm md:text-base text-white tracking-wide uppercase px-2 min-w-[150px] text-center">
            {viewMode === "week"
              ? `Semaine du ${getLocalDateString(weekDays[0])}`
              : `${currentMonthName} ${currentYear}`}
          </span>
          <button
            onClick={handleNext}
            className="p-2 bg-[#151515] hover:bg-white/5 text-slate-300 rounded-lg border border-white/5 cursor-pointer transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={handleToday}
            className="px-3 py-1.5 bg-[#151515] hover:bg-white/5 text-xs text-slate-200 font-bold rounded-lg border border-white/5 cursor-pointer transition-colors"
          >
            Aujourd'hui
          </button>
        </div>

        {/* View filters / Categories */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
          <div className="flex items-center gap-1.5 mr-2 shrink-0 text-slate-450 text-xs">
            <Filter className="h-3.5 w-3.5 text-slate-500" />
            <span className="hidden sm:inline font-mono text-[10px]">Catégories :</span>
          </div>
          {[
            { id: "all", label: "Tous" },
            { id: "Recherche", label: "🔬 Recherche" },
            { id: "Réunion", label: "👥 Réunions" },
            { id: "Séminaire", label: "🎓 Séminaires" }
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilterType(cat.id as any)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-all border ${
                filterType === cat.id
                  ? "bg-[#D4AF37] text-black font-bold border-[#D4AF37]"
                  : "bg-[#151515] text-slate-400 hover:text-white border-white/5"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* View switcher */}
        <div className="flex bg-[#151515] p-1 rounded-lg border border-white/5 shrink-0">
          {[
            { id: "month", label: "Mois", icon: <CalendarDays className="h-3.5 w-3.5" /> },
            { id: "week", label: "Semaine", icon: <CalendarRange className="h-3.5 w-3.5" /> },
            { id: "list", label: "Agenda", icon: <ListTodo className="h-3.5 w-3.5" /> }
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => setViewMode(mode.id as any)}
              className={`px-3 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider transition-colors flex items-center space-x-1.5 cursor-pointer ${
                viewMode === mode.id
                  ? "bg-white/10 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {mode.icon}
              <span className="hidden sm:inline">{mode.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* CALENDAR BODY */}
      <div className="bg-[#111111] border border-white/5 rounded-xl overflow-hidden shadow-xl">
        {/* MONTH VIEW */}
        {viewMode === "month" && (
          <div>
            {/* Days of the week header */}
            <div className="grid grid-cols-7 border-b border-white/5 bg-black/30 text-center py-3 text-[10px] font-mono text-slate-550 font-extrabold uppercase tracking-widest">
              <div>Lun</div>
              <div>Mar</div>
              <div>Mer</div>
              <div>Jeu</div>
              <div>Ven</div>
              <div>Sam</div>
              <div>Dim</div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7 bg-[#111111] divide-x divide-y divide-white/5 border-t border-white/5">
              {monthGridDays.map((dayObj, index) => {
                const dayEvents = getEventsForDay(dayObj.date);
                const isToday = getLocalDateString(dayObj.date) === getLocalDateString(new Date());
                const hasUpcoming24hEvent = dayEvents.some(event => isUpcoming24h(event.date));

                return (
                  <div
                    key={dayObj.key}
                    onClick={() => handleCellClick(dayObj.date)}
                    className={`min-h-[110px] p-2 flex flex-col justify-between transition-all group ${
                      dayObj.isCurrentMonth ? "bg-transparent" : "bg-black/20 opacity-40"
                    } ${canManageActivities ? "hover:bg-white/[0.02] cursor-pointer" : ""} ${
                      hasUpcoming24hEvent ? "ring-1 ring-amber-500/20 bg-amber-500/[0.02]" : ""
                    }`}
                  >
                    {/* Day number & Quick add */}
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center space-x-1">
                        <span
                          className={`text-xs font-mono font-bold rounded-full h-6 w-6 flex items-center justify-center transition-colors ${
                            isToday
                              ? "bg-[#D4AF37] text-black shadow-md font-black"
                              : "text-slate-300 group-hover:text-white"
                          }`}
                        >
                          {dayObj.date.getDate()}
                        </span>
                        {hasUpcoming24hEvent && (
                          <span
                            className="h-2 w-2 rounded-full bg-amber-500 animate-pulse border border-black/50 shrink-0"
                            title="Activité planifiée dans les prochaines 24 heures !"
                          />
                        )}
                      </div>
                      {canManageActivities && (
                        <button
                          type="button"
                          className="opacity-0 group-hover:opacity-100 p-0.5 bg-white/5 hover:bg-[#D4AF37]/20 hover:text-[#D4AF37] text-slate-400 border border-white/10 rounded transition-all cursor-pointer"
                          title="Planifier une activité ce jour"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCellClick(dayObj.date);
                          }}
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      )}
                    </div>

                    {/* Events list inside cell */}
                    <div className="flex-grow flex flex-col space-y-1.5 overflow-y-auto max-h-[75px] mt-1 pr-0.5 custom-scrollbar">
                      {dayEvents.map((item) => {
                        const style = typeColors[item.parsedType];
                        const isUpcoming = isUpcoming24h(item.date);
                        return (
                          <div
                            key={item.id}
                            onClick={(e) => handleEventClick(item, e)}
                            className={`px-1.5 py-1 rounded text-[10px] leading-tight flex items-center space-x-1 border transition-all ${style.bg} ${style.border} ${style.text} ${
                              isUpcoming ? "ring-1 ring-amber-500/40 border-amber-500/50 bg-amber-955/20 text-amber-300" : ""
                            }`}
                            title={`${item.parsedType} : ${item.titleClean} ${isUpcoming ? "(Dans les prochaines 24h)" : ""}`}
                          >
                            <span className="shrink-0 text-xs">{typeIcons[item.parsedType]}</span>
                            <span className="truncate font-semibold">{item.titleClean}</span>
                            {isUpcoming && (
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* WEEK VIEW */}
        {viewMode === "week" && (
          <div className="grid grid-cols-7 divide-x divide-white/5 min-h-[400px]">
            {weekDays.map((day, idx) => {
              const dayEvents = getEventsForDay(day);
              const isToday = getLocalDateString(day) === getLocalDateString(new Date());
              const dayLabel = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"][idx];

              return (
                <div
                  key={idx}
                  onClick={() => handleCellClick(day)}
                  className={`p-3 flex flex-col h-full bg-transparent ${
                    isToday ? "bg-white/[0.01]" : ""
                  } ${canManageActivities ? "hover:bg-white/[0.01] cursor-pointer" : ""}`}
                >
                  {/* Column Header */}
                  <div className="border-b border-white/5 pb-2 mb-4 text-center space-y-1">
                    <span className="text-[10px] font-mono text-slate-500 uppercase font-extrabold tracking-widest block">{dayLabel}</span>
                    <span
                      className={`text-sm font-mono font-black inline-block rounded-full h-8 w-8 leading-8 text-center ${
                        isToday ? "bg-[#D4AF37] text-black shadow-md" : "text-slate-200"
                      }`}
                    >
                      {day.getDate()}
                    </span>
                  </div>

                  {/* Column events */}
                  <div className="flex-grow flex flex-col space-y-3 overflow-y-auto pr-1">
                    {dayEvents.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-center py-10 opacity-20">
                        <span className="text-[10px] font-mono">Aucun événement</span>
                      </div>
                    ) : (
                      dayEvents.map((item) => {
                        const style = typeColors[item.parsedType];
                        const isUpcoming = isUpcoming24h(item.date);
                        return (
                          <div
                            key={item.id}
                            onClick={(e) => handleEventClick(item, e)}
                            className={`p-2.5 rounded-xl border text-xs flex flex-col justify-between space-y-2 cursor-pointer shadow-lg transition-all hover:scale-[1.02] ${style.bg} ${style.border} ${
                              isUpcoming ? "ring-2 ring-amber-500/30 border-amber-500/40 bg-amber-950/20" : ""
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex justify-between items-center gap-1">
                                <span className={`text-[8px] uppercase tracking-wider font-mono font-bold px-1.5 py-0.5 rounded ${style.badge}`}>
                                  {typeIcons[item.parsedType]} {item.parsedType}
                                </span>
                                {isUpcoming && (
                                  <span className="bg-amber-500/20 text-amber-300 text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border border-amber-500/30 animate-pulse">
                                    🚨 PROCHE
                                  </span>
                                )}
                              </div>
                              <h5 className="font-bold text-white leading-snug line-clamp-2">{item.titleClean}</h5>
                            </div>
                            <div className="text-[9px] text-slate-450 flex items-center space-x-1.5 font-mono pt-1 border-t border-white/5">
                              <MapPin className="h-3 w-3 shrink-0" />
                              <span className="truncate">{item.location || "Non spécifié"}</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* LIST / AGENDA VIEW */}
        {viewMode === "list" && (
          <div className="divide-y divide-white/5 p-4 space-y-2">
            {filteredEvents.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-center">
                <span className="text-4xl mb-3">📅</span>
                <p className="text-slate-300 font-bold text-sm">Aucun événement planifié pour l'unité</p>
                <p className="text-slate-500 text-xs mt-1">Utilisez l'option "Créer une Activité" pour planifier des recherches, séminaires ou réunions.</p>
              </div>
            ) : (
              [...filteredEvents]
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .map((item) => {
                  const style = typeColors[item.parsedType];
                  const isPast = new Date(item.date).getTime() < new Date().setHours(0,0,0,0);
                  const isUpcoming = isUpcoming24h(item.date);

                  return (
                    <div
                      key={item.id}
                      onClick={(e) => handleEventClick(item, e)}
                      className={`p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all hover:bg-white/[0.02] cursor-pointer rounded-xl ${
                        isPast ? "opacity-60" : ""
                      } ${isUpcoming ? "border border-amber-500/25 bg-amber-950/5 hover:bg-amber-950/10" : ""}`}
                    >
                      {/* Date box & Info */}
                      <div className="flex items-center space-x-4 min-w-0">
                        <div className={`bg-[#151515] border rounded-xl p-3 text-center w-16 shrink-0 flex flex-col justify-center ${
                          isUpcoming ? "border-amber-500/40 bg-amber-950/10" : "border-white/5"
                        }`}>
                          <span className={`text-[10px] font-mono uppercase font-bold ${isUpcoming ? "text-amber-400 animate-pulse" : "text-slate-500"}`}>
                            {new Date(item.date).toLocaleDateString("fr-FR", { month: "short" })}
                          </span>
                          <span className={`text-lg font-bold font-display mt-0.5 ${isUpcoming ? "text-amber-300" : "text-white"}`}>
                            {new Date(item.date).getDate()}
                          </span>
                        </div>

                        <div className="space-y-1.5 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`text-[9px] uppercase tracking-wider font-mono font-bold px-2 py-0.5 rounded ${style.badge}`}>
                              {typeIcons[item.parsedType]} {item.parsedType}
                            </span>
                            <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded font-mono ${
                              item.status === "Réalisé" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/15" : item.status === "En cours" ? "bg-blue-500/10 text-blue-400 border border-blue-500/15" : "bg-amber-500/10 text-amber-400 border border-amber-500/15"
                            }`}>
                              {item.status}
                            </span>
                            {isUpcoming && (
                              <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded font-mono bg-amber-500 text-black animate-pulse flex items-center space-x-1">
                                <AlertCircle className="h-2.5 w-2.5" />
                                <span>Moins de 24h</span>
                              </span>
                            )}
                          </div>
                          <h4 className="font-display font-bold text-white text-sm leading-snug truncate" title={item.titleClean}>
                            {item.titleClean}
                          </h4>
                          <p className="text-slate-400 text-xs line-clamp-1 leading-relaxed">
                            {item.description}
                          </p>
                        </div>
                      </div>

                      {/* Location & Meta info */}
                      <div className="flex flex-wrap items-center sm:justify-end gap-x-6 gap-y-2 text-[10px] text-slate-450 font-mono shrink-0 w-full sm:w-auto">
                        <div className="flex items-center space-x-1.5">
                          <MapPin className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                          <span>{item.location || "Non spécifié"}</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <Users className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                          <span>{item.researchers?.length || 0} chercheurs</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <DollarSign className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                          <span className="font-bold text-slate-300">{(item.budget || 0).toLocaleString()} USD</span>
                        </div>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        )}
      </div>

      {/* EVENT DETAILS MODAL / SIDE DRAWER */}
      <AnimatePresence>
        {selectedEvent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedEvent(null)}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#111111] border border-white/10 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl text-slate-100 relative flex flex-col"
            >
              {/* Colored Category Banner */}
              <div className={`h-2.5 w-full ${selectedEvent.parsedType === "Recherche" ? "bg-purple-500" : selectedEvent.parsedType === "Réunion" ? "bg-blue-500" : "bg-[#D4AF37]"}`} />

              {/* Close Button */}
              <button
                onClick={() => setSelectedEvent(null)}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-black/40 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4 rotate-180" />
              </button>

              <div className="p-6 space-y-6">
                {/* Header */}
                <div className="space-y-3 pr-8">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-[10px] uppercase font-mono font-bold px-2.5 py-0.5 rounded border ${typeColors[selectedEvent.parsedType].badge}`}>
                      {typeIcons[selectedEvent.parsedType]} {selectedEvent.parsedType}
                    </span>
                    <span className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded font-mono ${
                      selectedEvent.status === "Réalisé" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/15" : selectedEvent.status === "En cours" ? "bg-blue-500/10 text-blue-400 border border-blue-500/15" : "bg-amber-500/10 text-amber-400 border border-amber-500/15"
                    }`}>
                      {selectedEvent.status}
                    </span>
                  </div>
                  <h3 className="font-display font-black text-lg text-white leading-snug uppercase tracking-tight">
                    {selectedEvent.titleClean}
                  </h3>
                </div>

                {/* Event Details Grid */}
                <div className="grid grid-cols-2 gap-4 bg-[#151515] p-4 rounded-xl border border-white/5 text-xs font-mono text-slate-300">
                  <div className="space-y-1 flex flex-col justify-center">
                    <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Date Prévue</span>
                    <div className="flex items-center space-x-1.5 font-bold text-white">
                      <Clock className="h-3.5 w-3.5 text-[#D4AF37]" />
                      <span>{new Date(selectedEvent.date).toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span>
                    </div>
                  </div>

                  <div className="space-y-1 flex flex-col justify-center">
                    <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Lieu / Salle</span>
                    <div className="flex items-center space-x-1.5 font-bold text-white">
                      <MapPin className="h-3.5 w-3.5 text-[#D4AF37]" />
                      <span>{selectedEvent.location || "Non spécifié"}</span>
                    </div>
                  </div>

                  <div className="space-y-1 flex flex-col justify-center border-t border-white/5 pt-3">
                    <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Budget Alloué</span>
                    <div className="flex items-center space-x-1.5 font-bold text-[#D4AF37]">
                      <DollarSign className="h-3.5 w-3.5" />
                      <span>{(selectedEvent.budget || 0).toLocaleString()} USD</span>
                    </div>
                  </div>

                  <div className="space-y-1 flex flex-col justify-center border-t border-white/5 pt-3">
                    <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Responsable / Équipe</span>
                    <div className="flex items-center space-x-1.5 font-bold text-white">
                      <Users className="h-3.5 w-3.5 text-purple-400" />
                      <span className="truncate">{selectedEvent.researchers?.[0] || "Aucun chercheur"}</span>
                    </div>
                  </div>
                </div>

                {/* Scientific Description */}
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-bold text-[#D4AF37] font-mono tracking-wider flex items-center gap-1">
                    <Info className="h-3.5 w-3.5" />
                    Description & objectifs
                  </span>
                  <p className="text-slate-300 text-xs leading-relaxed bg-[#151515] p-4 rounded-xl border border-white/5 italic">
                    "{selectedEvent.description || "Aucune description scientifique disponible pour cette activité."}"
                  </p>
                </div>

                {/* Mobilized Researchers list if any */}
                {selectedEvent.researchers && selectedEvent.researchers.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider">Chercheurs et Experts Mobilisés</span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedEvent.researchers.map((res, i) => (
                        <span key={i} className="bg-white/5 border border-white/5 text-slate-200 px-2.5 py-1 rounded text-[10px] font-mono font-medium">
                          🎓 {res}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                {canManageActivities && (
                  <div className="flex items-center justify-end space-x-3 pt-4 border-t border-white/5">
                    <button
                      type="button"
                      onClick={() => {
                        // Keep the bracketed title so the form edit retains the bracketed state!
                        // That way, submitting the form will spread it and preserve the bracketed type.
                        // Wait, let's make sure that if the item title does not have a bracket, we format it as `[${type}] ${titleClean}`
                        let rawItem = activities.find(a => a.id === selectedEvent.id) || selectedEvent;
                        // Let's ensure it has the bracketed prefix in title if not present
                        if (!rawItem.title.startsWith("[")) {
                          rawItem = {
                            ...rawItem,
                            title: `[${selectedEvent.parsedType}] ${selectedEvent.titleClean}`
                          };
                        }
                        onOpenForm("activity", rawItem);
                        setSelectedEvent(null);
                      }}
                      className="flex items-center space-x-1 px-4 py-2 bg-[#151515] hover:bg-white/5 border border-white/5 rounded-xl text-xs font-bold transition-all cursor-pointer text-white"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      <span>Modifier l'activité</span>
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        onDeleteItem("activity", selectedEvent.id, selectedEvent.titleClean);
                        setSelectedEvent(null);
                      }}
                      className="flex items-center space-x-1 px-4 py-2 bg-red-950/20 hover:bg-red-500 border border-red-500/10 hover:border-red-500 text-red-400 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Supprimer</span>
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
