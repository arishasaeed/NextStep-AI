import React, { useState, useEffect, useRef } from "react";
import { Wallet, SearchX, ShieldCheck, Sparkles, Filter,
         ChevronRight, ChevronDown, CheckCircle2, TrendingUp,
         Calendar, Target, BookOpen, Star, AlertCircle } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import Header from "../components/Header";
import NavTabs from "../components/NavTabs";
import SkeletonLoader from "../components/SkeletonLoader";
import { STATUS_STYLE, SAVINGS_TOTAL } from "../constants";

function AnimatedNumber({ value, suffix = "" }) {
  const prefersReduced = useReducedMotion();
  const [display, setDisplay] = useState(0);
  const raf = useRef(null);
  useEffect(() => {
    if (prefersReduced) { setDisplay(value); return; }
    const start = Date.now();
    const duration = 900;
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(ease * value));
      if (progress < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value, prefersReduced]);
  return <>{display}{suffix}</>;
}

function ScoreRing({ score }) {
  const prefersReduced = useReducedMotion();
  const radius = 42;
  const circ = 2 * Math.PI * radius;
  const [displayed, setDisplayed] = useState(0);
  useEffect(() => {
    if (prefersReduced) { setDisplayed(score); return; }
    const start = Date.now();
    const duration = 1100;
    const tick = () => {
      const p = Math.min((Date.now() - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setDisplayed(Math.round(ease * score));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [score, prefersReduced]);
  const dashOffset = circ - (circ * displayed) / 100;
  return (
    <div className="relative w-28 h-28 flex items-center justify-center">
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full -rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(0,168,120,0.12)" strokeWidth="7" />
        <circle cx="50" cy="50" r={radius} fill="none"
          stroke="url(#scoreGrad)" strokeWidth="7" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={prefersReduced ? circ - (circ * score) / 100 : dashOffset}
          style={{ transition: prefersReduced ? "none" : "stroke-dashoffset 0.05s" }}
        />
        <defs>
          <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00A878" />
            <stop offset="100%" stopColor="#00D4B0" />
          </linearGradient>
        </defs>
      </svg>
      <div className="text-center">
        <div className="font-display text-2xl font-bold text-slate-900">
          <AnimatedNumber value={score} suffix="%" />
        </div>
        <div className="text-xs text-slate-500 font-medium">Score</div>
      </div>
    </div>
  );
}

export default function DashboardScreen({ screen, setScreen, matches, analysis, loading, onSelect, onRestart }) {
  const prefersReduced = useReducedMotion();
  const [activeTab, setActiveTab] = useState("all");
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [showIneligible, setShowIneligible] = useState(false);
  const [showAllMap, setShowAllMap] = useState({ all: false, planA: false, planB: false, planC: false });

  const viableMatches = matches.filter((m) => m.status === "eligible" || m.status === "partial");
  const ineligibleMatches = matches.filter((m) => {
    return m.status === "ineligible";
  });

  const topEligible = viableMatches.find((m) => m.status === "eligible") || viableMatches[0];
  const topAwardPkr = topEligible?.financials?.coveredAmountPkr || 0;
  const avgScore = viableMatches.length
    ? Math.round(viableMatches.reduce((s, m) => s + (m.score || 0), 0) / viableMatches.length)
    : 0;

  // Normalize country to Pakistan vs Overseas (matching original 3-option filter)
  const countryFilter = selectedCountry === "Overseas"
    ? (m) => m.country && m.country !== "Pakistan"
    : selectedCountry === "Pakistan"
    ? (m) => m.country === "Pakistan"
    : () => true;

  const filteredMatches = viableMatches.filter((m) => {
    if (!countryFilter(m)) return false;
    if (activeTab === "planA") return m.score >= 80 || (m.country !== "Pakistan" && (m.status === "eligible" || m.status === "partial"));
    if (activeTab === "planB") return m.status === "eligible" && m.score < 80;
    if (activeTab === "planC") return (m.status === "eligible" && m.country === "Pakistan") || m.status === "partial";
    return true; // "all" — shows both eligible + partial
  });
  const visibleMatches = showAllMap[activeTab] ? filteredMatches : filteredMatches.slice(0, 5);

  // Fixed 3 country options: All, Pakistan, Overseas
  const hasOverseas = viableMatches.some((m) => m.country && m.country !== "Pakistan");
  const hasPakistan = viableMatches.some((m) => m.country === "Pakistan");
  const countries = ["all", ...(hasPakistan ? ["Pakistan"] : []), ...(hasOverseas ? ["Overseas"] : [])];

  // AI summary
  const aiSummary = analysis?.recommendations?.[0]?.why_suitable || analysis?.top_scholarships?.[0]?.why_suitable;

  const eligibleCount = viableMatches.filter(m => m.status === "eligible").length;
  const partialCount = viableMatches.filter(m => m.status === "partial").length;

  const STAT_CARDS = [
    { icon: Star,        label: "Match Score",        value: avgScore,        suffix: "%", color: "#00A878" },
    { icon: CheckCircle2,label: "Fully Eligible",     value: eligibleCount,   suffix: "",  color: "#00A878" },
    { icon: AlertCircle, label: "Partial Matches",    value: partialCount,    suffix: "",  color: "#F59E0B" },
    { icon: BookOpen,    label: "Total Viable",       value: viableMatches.length, suffix: "", color: "#4F7CFF" },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      <Header subtitle="Your matched scholarships, ranked by academic & financial fit" />
      <NavTabs screen={screen} setScreen={setScreen} />

      {/* Welcome stats row */}
      {viableMatches.length > 0 && (
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6"
          initial={prefersReduced ? {} : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {STAT_CARDS.map((card, i) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.label}
                className="bg-white rounded-2xl p-4 border text-center shadow-sm"
                style={{ borderColor: `${card.color}22` }}
                initial={prefersReduced ? {} : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07, duration: 0.35 }}
              >
                <div className="flex justify-center mb-2">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${card.color}18` }}>
                    <Icon size={18} style={{ color: card.color }} />
                  </div>
                </div>
                <div className="font-display text-2xl font-bold text-slate-900">
                  <AnimatedNumber value={card.value} suffix={card.suffix} />
                </div>
                <div className="text-xs text-slate-500 mt-0.5">{card.label}</div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Score + award widget */}
      <div className="rounded-2xl p-4 mb-6 shadow-md border text-white flex flex-col sm:flex-row items-center justify-between gap-4"
        style={{ background: "linear-gradient(135deg, #071A3D 0%, #063B46 50%, #071A3D 100%)", borderColor: "rgba(0,212,176,0.2)" }}>
        <div className="flex items-center gap-4">
          <ScoreRing score={avgScore} />
          <div>
            <div className="flex items-center gap-1.5 text-xs mb-1" style={{ color: "#00D4B0" }}>
              <ShieldCheck size={14} />
              <span>Top Match Award Coverage</span>
            </div>
            <p className="font-display text-2xl font-bold">
              {topAwardPkr > 0 ? `PKR ${(topAwardPkr / 100000).toFixed(1)}L` : "—"}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.55)" }}>
              estimated annual value
            </p>
          </div>
        </div>
        {aiSummary && (
          <div className="flex-1 max-w-sm text-left sm:text-right">
            <p className="text-xs font-medium mb-1 flex items-center gap-1 sm:justify-end" style={{ color: "#00A878" }}>
              <Sparkles size={13} /> AI Insight
            </p>
            <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.72)" }}>
              {aiSummary.slice(0, 140)}{aiSummary.length > 140 ? "…" : ""}
            </p>
          </div>
        )}
      </div>

      {/* Tabs */}
      {/* Tabs Bar inside rounded segmented container */}
      <div className="bg-slate-100/80 p-1.5 rounded-2xl flex flex-wrap gap-1.5 mb-4 border border-slate-200/80 shadow-xs">
        {[
          { id: "all", label: `All Matches (${viableMatches.length})` },
          { id: "planA", label: "✨ Plan A (Reach)" },
          { id: "planB", label: "Plan B (Realistic)" },
          { id: "planC", label: `Plan C (Safety) • ${partialCount} Partial` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
              activeTab === tab.id
                ? "bg-white text-slate-900 shadow-sm border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Country Filter */}
      {countries.length > 2 && (
        <div className="flex items-center gap-2 flex-wrap mb-5 text-xs text-slate-500 font-medium">
          <span className="flex items-center gap-1 text-slate-600 font-semibold">
            <Filter size={13} /> Country:
          </span>
          {countries.map((c) => (
            <button
              key={c}
              onClick={() => setSelectedCountry(c)}
              className={`text-xs px-3 py-1 rounded-full border transition-all duration-200 font-medium ${
                selectedCountry === c
                  ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              }`}
            >
              {c === "all" ? "All" : c}
            </button>
          ))}
        </div>
      )}

      {/* Match list */}
      {loading && <SkeletonLoader />}

      {!loading && visibleMatches.length === 0 && (
        <div className="text-center py-16">
          <SearchX size={36} className="mx-auto mb-3 text-slate-300" />
          <p className="text-slate-500 font-medium">No matches for this filter.</p>
          <button onClick={() => { setActiveTab("all"); setSelectedCountry("all"); }}
            className="mt-3 text-sm font-medium" style={{ color: "#00A878" }}>
            Clear filters
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {visibleMatches.map((m, idx) => {
          const style = STATUS_STYLE[m.status] || STATUS_STYLE.partial;
          return (
            <motion.div
              key={m.id || idx}
              initial={prefersReduced ? {} : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04, duration: 0.3 }}
              onClick={() => onSelect(m)}
              className={`bg-white rounded-2xl p-4 border cursor-pointer transition-all duration-200 hover:shadow-md group ${
                m.status === "partial" ? "border-amber-200/80 hover:border-amber-400" : "border-slate-200/90 hover:border-emerald-500"
              }`}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ""; }}
            >
              <div className="flex items-center gap-4">
                {/* Left Badge: Distinct ELIGIBLE / PARTIAL MATCH indicator */}
                <div
                  className={`w-20 h-16 rounded-xl border flex flex-col items-center justify-center text-center shrink-0 p-1 font-bold ${
                    m.status === "eligible"
                      ? "border-emerald-500 bg-emerald-50/60 text-emerald-800"
                      : "border-amber-500 bg-amber-50/60 text-amber-800"
                  }`}
                >
                  <span className="text-[10px] tracking-wider uppercase leading-tight font-extrabold">
                    {m.status === "eligible" ? "ELIGIBLE" : "PARTIAL"}
                  </span>
                  {m.status === "partial" && (
                    <span className="text-[9px] tracking-wider uppercase leading-tight font-extrabold text-amber-700">
                      MATCH
                    </span>
                  )}
                </div>

                {/* Middle details */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 text-sm leading-snug truncate group-hover:text-emerald-700 transition-colors">
                    {m.name}
                  </h3>
                  
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {m.tag && (
                      <span className="text-[11px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                        {m.tag}
                      </span>
                    )}
                    {m.country && (
                      <span className="text-[11px] text-slate-400">
                        • {m.country}
                      </span>
                    )}
                  </div>

                  {m.reason && (
                    <p className={`text-xs mt-1.5 line-clamp-2 ${
                      m.status === "partial" ? "text-amber-800 italic" : "text-slate-500 italic"
                    }`}>
                      {m.reason}
                    </p>
                  )}

                  {m.status === "partial" && m.gap && (
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-200/60 rounded-md px-2 py-0.5 w-fit">
                      <AlertCircle size={12} className="shrink-0 text-amber-600" />
                      <span className="truncate">{m.gap}</span>
                    </div>
                  )}
                </div>

                {/* Right score box with chevron */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-1.5 text-center min-w-[70px]">
                    <span className="font-display text-lg font-bold text-slate-900 block leading-tight">
                      {m.score > 0 ? m.score : "—"}
                    </span>
                    <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider block">
                      FIT SCORE
                    </span>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {filteredMatches.length > 5 && !showAllMap[activeTab] && (
        <button
          onClick={() => setShowAllMap(prev => ({ ...prev, [activeTab]: true }))}
          className="w-full mt-4 py-2.5 rounded-xl text-sm font-medium border transition-colors duration-200 flex items-center justify-center gap-2"
          style={{ borderColor: "rgba(0,168,120,0.3)", color: "#00A878" }}
        >
          Show all {filteredMatches.length} matches <ChevronDown size={16} />
        </button>
      )}

      {/* Ineligible toggle */}
      {ineligibleMatches.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setShowIneligible(v => !v)}
            className="text-xs font-medium flex items-center gap-1.5 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <Filter size={13} /> {showIneligible ? "Hide" : "Show"} {ineligibleMatches.length} ineligible
          </button>
          {showIneligible && (
            <div className="mt-3 flex flex-col gap-2">
              {ineligibleMatches.map((m, i) => (
                <div key={i} onClick={() => onSelect(m)} className="bg-white rounded-xl p-3 border border-rose-100 cursor-pointer hover:border-rose-300 transition-colors">
                  <p className="text-sm font-medium text-slate-700">{m.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{m.reason}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Restart */}
      <div className="mt-8 text-center">
        <button onClick={onRestart} className="text-sm font-medium text-slate-400 hover:text-slate-600 transition-colors">
          ← Refine my profile
        </button>
      </div>
    </div>
  );
}
