import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import ReportCard from "@/components/feed/ReportCard";
import Leaderboard from "@/components/feed/Leaderboard";
import TrendingPanel from "@/components/feed/TrendingPanel";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { TrendingUp, SlidersHorizontal, X, Flame, Clock, Tag, Eye } from "lucide-react";
import EmptyFeedState from "@/components/feed/EmptyFeedState";
import OnboardingModal from "@/components/onboarding/OnboardingModal";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import LeftSidebar from "@/components/feed/LeftSidebar";

const FEED_TABS = [
  { id: "latest", label: "Latest", icon: Clock },
  { id: "trending", label: "Trending", icon: Flame },
  { id: "free", label: "Free Only", icon: Tag },
  { id: "most_viewed", label: "Most Viewed", icon: Eye },
];

const SECTORS = ["All", "AI & Semiconductors", "Big Tech", "EV & Clean Energy", "Financials", "Crypto & Web3", "Consumer Tech", "E-Commerce", "Healthcare"];
const MARKET_CAPS = ["All", "Mega", "Large", "Mid", "Small", "Micro"];
const SORT_OPTIONS = ["Latest", "Most Liked", "Premium Only", "Free Only"];

export default function HomeFeed() {
  const [activeTab, setActiveTab] = useState("latest");
  const [activeSector, setActiveSector] = useState("All");
  const [activeMarketCap, setActiveMarketCap] = useState("All");
  const [sortBy, setSortBy] = useState("Latest");
  const [showFilters, setShowFilters] = useState(false);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem("stoa_onboarded"));

  useEffect(() => {
    base44.entities.Report.filter({ status: "published" }, "-created_date", 50)
      .then(data => setReports(data || []))
      .finally(() => setLoading(false));
  }, []);

  const tabFiltered = reports
    .filter(r => activeTab === "free" ? !r.is_premium : true)
    .sort((a, b) => {
      if (activeTab === "trending") return (b.likes || 0) - (a.likes || 0);
      if (activeTab === "most_viewed") return (b.likes || 0) - (a.likes || 0);
      return new Date(b.created_date) - new Date(a.created_date);
    });

  const filtered = tabFiltered
    .filter(r => activeSector === "All" || r.industry === activeSector)
    .filter(r => activeMarketCap === "All" || (r.market_cap || "").toLowerCase() === activeMarketCap.toLowerCase())
    .filter(r => sortBy === "Premium Only" ? r.is_premium : sortBy === "Free Only" ? !r.is_premium : true)
    .sort((a, b) => sortBy === "Most Liked" ? (b.likes || 0) - (a.likes || 0) : sortBy === "Latest" ? new Date(b.created_date) - new Date(a.created_date) : 0);

  const activeFilterCount = (activeSector !== "All" ? 1 : 0) + (activeMarketCap !== "All" ? 1 : 0) + (sortBy !== "Latest" ? 1 : 0);

  const clearFilters = () => { setActiveSector("All"); setActiveMarketCap("All"); setSortBy("Latest"); };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 pb-20 lg:pb-6">
      {showOnboarding && <OnboardingModal onComplete={() => setShowOnboarding(false)} />}
      <MobileBottomNav onSearchClick={() => setShowFilters(true)} />
      <div className="flex gap-6">
        {/* Left Sidebar */}
        <aside className="hidden lg:block w-56 flex-shrink-0">
          <div className="sticky top-6">
            <LeftSidebar />
          </div>
        </aside>

        {/* Main Feed */}
        <div className="flex-1 min-w-0">
          {/* Feed tabs */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            {FEED_TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all border ${activeTab === tab.id ? "bg-primary text-white border-primary shadow-sm" : "bg-card border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Controls bar */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs text-muted-foreground">{filtered.length} Reports</span>
            <button
              onClick={() => setShowFilters(true)}
              className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${activeFilterCount > 0 ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
            </button>
          </div>

          {/* Active filter chips */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {activeSector !== "All" && (
                <span className="flex items-center gap-1 text-xs bg-primary/10 text-primary border border-primary/20 rounded-full px-2.5 py-0.5">
                  {activeSector}
                  <button onClick={() => setActiveSector("All")}><X className="w-3 h-3" /></button>
                </span>
              )}
              {activeMarketCap !== "All" && (
                <span className="flex items-center gap-1 text-xs bg-primary/10 text-primary border border-primary/20 rounded-full px-2.5 py-0.5">
                  {activeMarketCap} Cap
                  <button onClick={() => setActiveMarketCap("All")}><X className="w-3 h-3" /></button>
                </span>
              )}
              {sortBy !== "Latest" && (
                <span className="flex items-center gap-1 text-xs bg-primary/10 text-primary border border-primary/20 rounded-full px-2.5 py-0.5">
                  {sortBy}
                  <button onClick={() => setSortBy("Latest")}><X className="w-3 h-3" /></button>
                </span>
              )}
            </div>
          )}

          <div className="space-y-4">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-card border border-border rounded-2xl p-5 animate-pulse">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-full bg-muted" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-muted rounded w-32" />
                      <div className="h-2.5 bg-muted rounded w-20" />
                    </div>
                    <div className="h-5 bg-muted rounded-full w-16" />
                  </div>
                  <div className="h-5 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-3 bg-muted rounded w-full mb-1" />
                  <div className="h-3 bg-muted rounded w-4/5" />
                </div>
              ))
            ) : filtered.length === 0 ? (
              <EmptyFeedState onClearFilters={activeFilterCount > 0 ? clearFilters : null} />
            ) : (
              filtered.map(report => <ReportCard key={report.id} report={report} />)
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <aside className="hidden lg:flex flex-col gap-4 w-64 flex-shrink-0">
          <Leaderboard />
          <TrendingPanel />
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm text-primary">Become an Analyst</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-3">Publish research, lock predictions, build your audience.</p>
            <Link to="/editor">
              <Button size="sm" className="w-full text-xs">Start Writing</Button>
            </Link>
          </div>
        </aside>
      </div>

      {/* Filter Modal */}
      {showFilters && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setShowFilters(false)}>
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold">Filter Reports</h3>
              <button onClick={() => setShowFilters(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Sector</p>
              <div className="flex flex-wrap gap-1.5">
                {SECTORS.map(s => (
                  <button key={s} onClick={() => setActiveSector(s)} className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${activeSector === s ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>{s}</button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Market Cap</p>
              <div className="flex flex-wrap gap-1.5">
                {MARKET_CAPS.map(cap => (
                  <button key={cap} onClick={() => setActiveMarketCap(cap)} className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${activeMarketCap === cap ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>{cap}</button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Sort By</p>
              <div className="flex flex-wrap gap-1.5">
                {SORT_OPTIONS.map(s => (
                  <button key={s} onClick={() => setSortBy(s)} className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${sortBy === s ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>{s}</button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => { setActiveSector("All"); setActiveMarketCap("All"); setSortBy("Latest"); }} className="flex-1 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg py-2 transition-colors">Clear All</button>
              <button onClick={() => setShowFilters(false)} className="flex-1 bg-primary text-white rounded-lg py-2 text-sm font-medium hover:bg-primary/90 transition-colors">Apply</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}