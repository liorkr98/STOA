import React, { useState } from "react";
import { getReports } from "@/lib/mockData";
import ReportCard from "@/components/feed/ReportCard";
import Leaderboard from "@/components/feed/Leaderboard";
import TrendingPanel from "@/components/feed/TrendingPanel";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { TrendingUp, SlidersHorizontal, X, Flame, Clock, Tag, Eye } from "lucide-react";

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
  const reports = getReports();

  const tabFiltered = reports
    .filter(r => activeTab === "free" ? !r.isPremium : true)
    .sort((a, b) => {
      if (activeTab === "trending") return (b.likes * 2 + (b.completed ? 1 : 0)) - (a.likes * 2 + (a.completed ? 1 : 0));
      if (activeTab === "most_viewed") return b.likes - a.likes;
      return new Date(b.publishedAt) - new Date(a.publishedAt);
    });

  const filtered = tabFiltered
    .filter(r => activeSector === "All" || r.industry === activeSector)
    .filter(r => activeMarketCap === "All" || (r.marketCap || "").toLowerCase() === activeMarketCap.toLowerCase())
    .filter(r => sortBy === "Premium Only" ? r.isPremium : sortBy === "Free Only" ? !r.isPremium : true)
    .sort((a, b) => sortBy === "Most Liked" ? b.likes - a.likes : sortBy === "Latest" ? new Date(b.publishedAt) - new Date(a.publishedAt) : 0);

  const activeFilterCount = (activeSector !== "All" ? 1 : 0) + (activeMarketCap !== "All" ? 1 : 0) + (sortBy !== "Latest" ? 1 : 0);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex gap-6">
        {/* Main Feed */}
        <div className="flex-1 min-w-0">
          {/* Feed tabs */}
          <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
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
          <div className="flex items-center gap-2 mb-3">
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
            <div className="flex flex-wrap gap-2 mb-3">
              {activeSector !== "All" && (
                <span className="flex items-center gap-1 text-xs bg-primary/10 text-primary rounded-full px-2.5 py-1">
                  {activeSector}
                  <button onClick={() => setActiveSector("All")}><X className="w-3 h-3" /></button>
                </span>
              )}
              {activeMarketCap !== "All" && (
                <span className="flex items-center gap-1 text-xs bg-primary/10 text-primary rounded-full px-2.5 py-1">
                  {activeMarketCap} Cap
                  <button onClick={() => setActiveMarketCap("All")}><X className="w-3 h-3" /></button>
                </span>
              )}
              {sortBy !== "Latest" && (
                <span className="flex items-center gap-1 text-xs bg-primary/10 text-primary rounded-full px-2.5 py-1">
                  {sortBy}
                  <button onClick={() => setSortBy("Latest")}><X className="w-3 h-3" /></button>
                </span>
              )}
            </div>
          )}

          <div className="space-y-4">
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">No reports match these filters.</div>
            ) : (
              filtered.map(report => <ReportCard key={report.id} report={report} />)
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-72 flex-shrink-0 hidden lg:block space-y-4">
          <TrendingPanel />
          <Leaderboard />
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-primary">Publish Your Analysis</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">Write research reports, lock in predictions, and build your analyst track record.</p>
            <Link to="/editor">
              <Button size="sm" className="w-full text-xs">Start Writing</Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Filter Modal */}
      {showFilters && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowFilters(false)}>
          <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Filter Reports</h3>
              <button onClick={() => setShowFilters(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Sector</p>
                <div className="flex flex-wrap gap-1.5">
                  {SECTORS.map(s => (
                    <button key={s} onClick={() => setActiveSector(s)} className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${activeSector === s ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>{s}</button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Market Cap</p>
                <div className="flex flex-wrap gap-1.5">
                  {MARKET_CAPS.map(cap => (
                    <button key={cap} onClick={() => setActiveMarketCap(cap)} className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${activeMarketCap === cap ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>{cap}</button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Sort By</p>
                <div className="flex flex-wrap gap-1.5">
                  {SORT_OPTIONS.map(s => (
                    <button key={s} onClick={() => setSortBy(s)} className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${sortBy === s ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>{s}</button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button onClick={() => { setActiveSector("All"); setActiveMarketCap("All"); setSortBy("Latest"); }} className="flex-1 text-sm text-muted-foreground hover:text-foreground">Clear All</button>
              <Button onClick={() => setShowFilters(false)} className="flex-1">Apply</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}