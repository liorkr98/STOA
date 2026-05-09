import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import ReportCard from "@/components/feed/ReportCard";
import Leaderboard from "@/components/feed/Leaderboard";
import TrendingPanel from "@/components/feed/TrendingPanel";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { TrendingUp, SlidersHorizontal, X, Flame, Users, Star } from "lucide-react";
import EmptyFeedState from "@/components/feed/EmptyFeedState";
import EmptyFollowingState from "@/components/feed/EmptyFollowingState";
import EmptySubscriptionsState from "@/components/feed/EmptySubscriptionsState";
import OnboardingModal from "@/components/onboarding/OnboardingModal";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import LeftSidebar from "@/components/feed/LeftSidebar";
import FeedCustomizer, { loadFeedPrefs } from "@/components/feed/FeedCustomizer";
import FeedSkeletonCard from "@/components/feed/FeedSkeletonCard";
import QuickFilterRow from "@/components/feed/QuickFilterRow";
import { TrendingDivider, AnalystSpotlight } from "@/components/feed/FeedDividerCard";

const FEED_TABS = [
  { id: "trending", label: "Trending", icon: Flame },
  { id: "following", label: "Following", icon: Users },
  { id: "subscriptions", label: "Subscriptions", icon: Star },
];

const PAGE_SIZE = 10;

// Determine default tab: following if user has follows, else trending
function getDefaultTab(hasFollows) {
  const stored = localStorage.getItem("stoa_active_tab");
  if (stored) return stored;
  return hasFollows ? "following" : "trending";
}

export default function HomeFeed() {
  const { user, isAuthenticated } = useAuth();

  const [activeTab, setActiveTab] = useState("trending");
  const [quickFilter, setQuickFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem("stoa_onboarded"));
  const [feedPrefs, setFeedPrefs] = useState(() => loadFeedPrefs());
  const [page, setPage] = useState(1);
  const [topAnalysts, setTopAnalysts] = useState([]);
  const [userMap, setUserMap] = useState({});

  // Follows & subscriptions
  const [followedAnalysts, setFollowedAnalysts] = useState([]);
  const [subscribedAnalysts, setSubscribedAnalysts] = useState([]);
  const [tabInitialized, setTabInitialized] = useState(false);

  // "New since last visit" tracking
  const lastVisit = useRef(parseInt(localStorage.getItem("stoa_last_visit") || "0"));
  const [newSinceLastVisit, setNewSinceLastVisit] = useState(0);

  // Load reports
  useEffect(() => {
    base44.entities.Report.filter({ status: "published" }, "-created_date", 200)
      .then(data => {
        const d = data || [];
        setReports(d);
        // Count new since last visit
        if (lastVisit.current > 0) {
          setNewSinceLastVisit(d.filter(r => new Date(r.created_date).getTime() > lastVisit.current).length);
        }
        localStorage.setItem("stoa_last_visit", Date.now().toString());
      })
      .finally(() => setLoading(false));
  }, []);

  // Load top analysts + build userMap for avatar fallback
  useEffect(() => {
    base44.entities.User.list("-accuracy_score", 50)
      .then(d => {
        const users = d || [];
        setTopAnalysts(users.filter(u => u.accuracy_score > 0).slice(0, 10));
        const map = {};
        users.forEach(u => { if (u.email) map[u.email] = u; });
        setUserMap(map);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      if (!tabInitialized) { setActiveTab("trending"); setTabInitialized(true); }
      return;
    }
    Promise.all([
      base44.entities.Follow.filter({ follower_email: user.email }, "-created_date", 100).catch(() => []),
      base44.entities.Subscription.filter({ subscriber_email: user.email, status: "active" }, "-created_date", 100).catch(() => []),
    ]).then(([follows, subs]) => {
      setFollowedAnalysts(follows || []);
      setSubscribedAnalysts(subs || []);
      if (!tabInitialized) {
        setActiveTab(getDefaultTab((follows || []).length > 0));
        setTabInitialized(true);
      }
    });
  }, [isAuthenticated, user]);

  const followedEmails = useMemo(() => followedAnalysts.map(f => f.analyst_email), [followedAnalysts]);
  const subscribedEmails = useMemo(() => subscribedAnalysts.map(s => s.analyst_email), [subscribedAnalysts]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setPage(1);
    localStorage.setItem("stoa_active_tab", tab);
  };

  // Quick follow from empty state
  const handleFollowAnalyst = async (analyst) => {
    if (!user) return;
    await base44.entities.Follow.create({
      follower_email: user.email,
      analyst_email: analyst.email,
      analyst_name: analyst.full_name || analyst.email?.split("@")[0] || "Analyst",
      analyst_avatar: analyst.picture || "",
    }).catch(() => {});
    setFollowedAnalysts(prev => [...prev, {
      analyst_email: analyst.email,
      analyst_name: analyst.full_name,
      analyst_avatar: analyst.picture,
    }]);
  };

  // Apply tab filter
  const applyTabFilter = useCallback((list) => {
    if (activeTab === "trending") return [...list].sort((a, b) => ((b.likes || 0) + (new Date(b.created_date) / 1e10)) - ((a.likes || 0) + (new Date(a.created_date) / 1e10)));
    if (activeTab === "following") return list.filter(r => followedEmails.includes(r.created_by));
    if (activeTab === "subscriptions") return list.filter(r => subscribedEmails.includes(r.created_by));
    return list;
  }, [activeTab, followedEmails, subscribedEmails]);

  // Apply quick filter
  const applyQuickFilter = useCallback((list) => {
    switch (quickFilter) {
      case "long": return list.filter(r => r.prediction_action === "Long");
      case "short": return list.filter(r => r.prediction_action === "Short");
      case "trending": return [...list].sort((a, b) => (b.likes || 0) - (a.likes || 0));
      case "small": return list.filter(r => r.market_cap === "small" || r.market_cap === "micro");
      case "large": return list.filter(r => r.market_cap === "large" || r.market_cap === "mega");
      case "Tech": case "Finance": case "Energy":
        return list.filter(r => r.industry?.toLowerCase().includes(quickFilter.toLowerCase()));
      default: return list;
    }
  }, [quickFilter]);

  // Apply pref filters
  const applyPrefFilters = useCallback((list) => {
    const { sectors = [], marketCaps = [], tickers = [] } = feedPrefs;
    if (!sectors.length && !marketCaps.length && !tickers.length) return list;
    return list.filter(r => {
      const sectorMatch = !sectors.length || sectors.includes(r.industry);
      const capMatch = !marketCaps.length || marketCaps.map(c => c.toLowerCase()).includes((r.market_cap || "").toLowerCase());
      const tickerList = (r.tickers || "").split(",").map(t => t.trim().toUpperCase());
      const tickerMatch = !tickers.length || tickers.some(t => tickerList.includes(t));
      return sectorMatch && capMatch && tickerMatch;
    });
  }, [feedPrefs]);

  const filtered = useMemo(() =>
    applyPrefFilters(applyQuickFilter(applyTabFilter(reports))),
    [reports, applyTabFilter, applyQuickFilter, applyPrefFilters]
  );

  const prefActiveCount = (feedPrefs.sectors?.length || 0) + (feedPrefs.marketCaps?.length || 0) + (feedPrefs.tickers?.length || 0);

  const clearPrefs = () => {
    const empty = { sectors: [], marketCaps: [], tickers: [] };
    setFeedPrefs(empty);
    localStorage.setItem("stoa_feed_prefs", JSON.stringify(empty));
  };

  // Infinite scroll: show page * PAGE_SIZE items
  const loadMoreRef = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && page * PAGE_SIZE < filtered.length) {
        setPage(p => p + 1);
      }
    }, { threshold: 0.1 });
    if (loadMoreRef.current) obs.observe(loadMoreRef.current);
    return () => obs.disconnect();
  }, [filtered.length, page]);

  const visibleReports = filtered.slice(0, page * PAGE_SIZE);

  // Top weekly report for divider card
  const topWeeklyReport = useMemo(() => {
    const oneWeekAgo = Date.now() - 7 * 24 * 3600 * 1000;
    return reports
      .filter(r => new Date(r.created_date).getTime() > oneWeekAgo)
      .sort((a, b) => (b.likes || 0) - (a.likes || 0))[0] || null;
  }, [reports]);

  // Build feed items with dividers every 5
  const feedItems = useMemo(() => {
    const items = [];
    visibleReports.forEach((report, i) => {
      items.push({ type: "report", data: report });
      if ((i + 1) % 5 === 0 && i < visibleReports.length - 1) {
        const isEven = Math.floor(i / 5) % 2 === 0;
        if (isEven && topWeeklyReport) {
          items.push({ type: "trending_divider" });
        } else if (!isEven && topAnalysts.length > 0) {
          const spotlightAnalyst = topAnalysts[Math.floor(i / 5) % topAnalysts.length];
          items.push({ type: "analyst_spotlight", data: spotlightAnalyst });
        }
      }
    });
    return items;
  }, [visibleReports, topWeeklyReport, topAnalysts]);

  const totalReports = filtered.length;
  const hasMore = visibleReports.length < filtered.length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 pb-20 lg:pb-6" style={{ background:'#f8fafc', minHeight:'100vh' }}>
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
          {/* Page title + FOMO counter */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-lg font-bold text-foreground">Research Feed</h1>
              {!loading && (
                <p className="text-xs text-muted-foreground">
                  {totalReports} reports{newSinceLastVisit > 0 ? ` · ` : ""}
                  {newSinceLastVisit > 0 && (
                    <span className="text-red-500 font-semibold">{newSinceLastVisit} new since your last visit</span>
                  )}
                </p>
              )}
            </div>
          </div>

          {/* Feed tabs */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1 no-scrollbar">
            {FEED_TABS.map(tab => {
              const Icon = tab.icon;
              const count = tab.id === "following" ? followedAnalysts.length : tab.id === "subscriptions" ? subscribedAnalysts.length : null;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all border ${activeTab === tab.id ? "bg-primary text-white border-primary shadow-sm" : "bg-card border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}{count != null && count > 0 ? ` (${count})` : ""}
                </button>
              );
            })}
          </div>

          {/* Quick filter row */}
          <QuickFilterRow active={quickFilter} onChange={q => { setQuickFilter(q); setPage(1); }} />

          {/* Controls bar */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-muted-foreground">{totalReports} reports</span>
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

          {/* Feed content */}
          <div className="space-y-4">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <FeedSkeletonCard key={i} />)
            ) : filtered.length === 0 ? (
              activeTab === "following" ? (
                <EmptyFollowingState onFollow={handleFollowAnalyst} />
              ) : activeTab === "subscriptions" ? (
                <EmptySubscriptionsState />
              ) : (
                <div className="text-center py-16">
                  <p className="text-2xl mb-2">🔍</p>
                  <p className="font-semibold text-foreground">Be the first to discover new research — check back soon</p>
                  <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters</p>
                  {prefActiveCount > 0 && (
                    <Button size="sm" variant="outline" className="mt-3 text-xs" onClick={clearPrefs}>Clear Filters</Button>
                  )}
                </div>
              )
            ) : (
              <>
                {feedItems.map((item, idx) => {
                  if (item.type === "report") {
                    return (
                      <ReportCard
                        key={item.data.id}
                        report={item.data}
                        isSubscribed={subscribedEmails.includes(item.data.created_by)}
                        currentUserEmail={user?.email}
                        followedEmails={followedEmails}
                        allReports={reports}
                        userMap={userMap}
                      />
                    );
                  }
                  if (item.type === "trending_divider") {
                    return <TrendingDivider key={`div-trending-${idx}`} report={topWeeklyReport} />;
                  }
                  if (item.type === "analyst_spotlight") {
                    return <AnalystSpotlight key={`div-analyst-${idx}`} analyst={item.data} />;
                  }
                  return null;
                })}

                {/* Infinite scroll trigger */}
                <div ref={loadMoreRef} className="py-2" />
                {hasMore && (
                  <div className="flex justify-center py-4">
                    <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  </div>
                )}
              </>
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