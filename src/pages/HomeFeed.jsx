import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import ReportCard from "@/components/feed/ReportCard";
import Leaderboard from "@/components/feed/Leaderboard";
import TrendingPanel from "@/components/feed/TrendingPanel";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { TrendingUp, SlidersHorizontal, X, Flame, Users, Star } from "lucide-react";
import EmptyFeedState from "@/components/feed/EmptyFeedState";
import OnboardingModal from "@/components/onboarding/OnboardingModal";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import LeftSidebar from "@/components/feed/LeftSidebar";
import FeedCustomizer, { loadFeedPrefs } from "@/components/feed/FeedCustomizer";

const FEED_TABS = [
  { id: "trending", label: "Trending", icon: Flame },
  { id: "following", label: "Following", icon: Users },
  { id: "subscriptions", label: "Subscriptions", icon: Star },
];

export default function HomeFeed() {
  const [activeTab, setActiveTab] = useState("trending");
  const [showFilters, setShowFilters] = useState(false);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem("stoa_onboarded"));
  const [feedPrefs, setFeedPrefs] = useState(() => loadFeedPrefs());

  // Load following/subscriptions from localStorage
  const following = JSON.parse(localStorage.getItem("stoa_following") || "[]");
  const subscriptions = JSON.parse(localStorage.getItem("stoa_subscriptions") || "[]");
  const followingEmails = following.map(a => a.id); // ids which might be emails
  const subEmails = subscriptions.map(a => a.id);

  useEffect(() => {
    base44.entities.Report.filter({ status: "published" }, "-created_date", 100)
      .then(data => setReports(data || []))
      .finally(() => setLoading(false));
  }, []);

  const applyTabFilter = (list) => {
    if (activeTab === "trending") return [...list].sort((a, b) => (b.likes || 0) - (a.likes || 0));
    if (activeTab === "following") return list.filter(r => followingEmails.includes(r.created_by) || followingEmails.includes(r.author?.id));
    if (activeTab === "subscriptions") return list.filter(r => subEmails.includes(r.created_by) || subEmails.includes(r.author?.id));
    return [...list].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  };

  const applyPrefFilters = (list) => {
    const { sectors = [], marketCaps = [], tickers = [] } = feedPrefs;
    if (!sectors.length && !marketCaps.length && !tickers.length) return list;
    return list.filter(r => {
      const sectorMatch = !sectors.length || sectors.includes(r.industry);
      const capMatch = !marketCaps.length || marketCaps.map(c => c.toLowerCase()).includes((r.market_cap || "").toLowerCase());
      const tickerList = (r.tickers || "").split(",").map(t => t.trim().toUpperCase());
      const tickerMatch = !tickers.length || tickers.some(t => tickerList.includes(t));
      return sectorMatch && capMatch && tickerMatch;
    });
  };

  const filtered = applyPrefFilters(applyTabFilter(reports));
  const prefActiveCount = (feedPrefs.sectors?.length || 0) + (feedPrefs.marketCaps?.length || 0) + (feedPrefs.tickers?.length || 0);

  const clearPrefs = () => {
    const empty = { sectors: [], marketCaps: [], tickers: [] };
    setFeedPrefs(empty);
    localStorage.setItem("stoa_feed_prefs", JSON.stringify(empty));
  };

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
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1 no-scrollbar">
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
            <span className="text-xs text-muted-foreground">{filtered.length} reports</span>
            <button
              onClick={() => setShowFilters(true)}
              className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${prefActiveCount > 0 ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Customize{prefActiveCount > 0 ? ` · ${prefActiveCount}` : ""}
            </button>
          </div>

          {/* Active pref chips */}
          {prefActiveCount > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {(feedPrefs.sectors || []).map(s => (
                <span key={s} className="flex items-center gap-1 text-xs bg-primary/10 text-primary border border-primary/20 rounded-full px-2.5 py-0.5">
                  {s} <button onClick={() => setFeedPrefs(p => { const upd = {...p, sectors: p.sectors.filter(x=>x!==s)}; localStorage.setItem("stoa_feed_prefs",JSON.stringify(upd)); return upd; })}><X className="w-3 h-3" /></button>
                </span>
              ))}
              {(feedPrefs.tickers || []).map(t => (
                <span key={t} className="flex items-center gap-1 text-xs bg-primary/10 text-primary border border-primary/20 rounded-full px-2.5 py-0.5">
                  ${t} <button onClick={() => setFeedPrefs(p => { const upd = {...p, tickers: p.tickers.filter(x=>x!==t)}; localStorage.setItem("stoa_feed_prefs",JSON.stringify(upd)); return upd; })}><X className="w-3 h-3" /></button>
                </span>
              ))}
              {(feedPrefs.marketCaps || []).map(c => (
                <span key={c} className="flex items-center gap-1 text-xs bg-primary/10 text-primary border border-primary/20 rounded-full px-2.5 py-0.5">
                  {c} Cap <button onClick={() => setFeedPrefs(p => { const upd = {...p, marketCaps: p.marketCaps.filter(x=>x!==c)}; localStorage.setItem("stoa_feed_prefs",JSON.stringify(upd)); return upd; })}><X className="w-3 h-3" /></button>
                </span>
              ))}
              <button onClick={clearPrefs} className="text-xs text-muted-foreground hover:text-foreground underline">clear all</button>
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
              <EmptyFeedState onClearFilters={prefActiveCount > 0 ? clearPrefs : null} />
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

      {showFilters && (
        <FeedCustomizer
          onClose={() => setShowFilters(false)}
          onApply={(prefs) => setFeedPrefs(prefs)}
        />
      )}
    </div>
  );
}