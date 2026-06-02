import React, { useState, useEffect, useCallback } from "react";
import { computeScore } from "@/lib/scoringEngine";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import InvestorHome from "@/pages/InvestorHome";
import {
  PenLine, Star, TrendingUp, TrendingDown, RefreshCw, Trophy,
  ArrowRight, FileText, Clock, Flame, Users, BarChart3,
  ChevronRight, Loader2, Target, Zap, Plus, Lock, BookOpen, Crown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAnalystSlug, analystHref } from "@/lib/analystSlug";
import { computeAvgYield, formatYield } from "@/lib/yieldCalc";

const WATCHLIST_KEY = "stoa_watchlist";

// â”€â”€ helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function fetchQuotes(symbols) {
  if (!symbols.length) return [];
  const results = await Promise.allSettled(
    symbols.map(async sym => {
      const r = await base44.functions.invoke("getStockData", { ticker: sym });
      const d = r?.data || r;
      return {
        symbol: sym,
        price: d?.price ?? d?.regularMarketPrice ?? null,
        change: d?.regularMarketChangePercent ?? d?.changePercent ?? null,
      };
    })
  );
  return results
    .filter(r => r.status === "fulfilled" && r.value.price != null)
    .map(r => r.value);
}

// Parse SQL-style timestamps as UTC (otherwise an east-of-UTC client sees
// "just published" posts as several hours old). See ReportCard.timeAgo for context.
function parseUtcDate(s) {
  if (!s) return null;
  if (/Z|[+-]\d{2}:?\d{2}$/.test(s)) return new Date(s);
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(s)) return new Date(s.replace(" ", "T") + "Z");
  return new Date(s);
}

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const parsed = parseUtcDate(dateStr);
  if (!parsed) return "";
  const diff = Math.max(0, Date.now() - parsed.getTime());
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function directionColor(d) {
  if (d === "LONG" || d === "Long") return "text-gain bg-gain/10 border-gain/20";
  if (d === "SHORT" || d === "Short") return "text-red-600 bg-red-50 border-red-200";
  return "text-muted-foreground bg-secondary border-border";
}

// â”€â”€ sub-components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function StatChip({ label, value, color = "text-foreground", to }) {
  const inner = (
    <div className="group flex items-center gap-3 pl-4 pr-5 py-2.5 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-card-md transition-all cursor-pointer">
      <div className="flex flex-col">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</span>
        <span className={`text-lg font-medium leading-tight tabular-nums ${color}`}>{value}</span>
      </div>
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

function DraftCard({ report }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(`/editor?id=${report.id}`)}
      className="w-full text-left flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/40 hover:bg-secondary/30 transition-all group"
    >
      <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center shrink-0">
        <FileText className="w-4 h-4 text-primary/60" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-snug line-clamp-1 group-hover:text-primary transition-colors">
          {report.title || "Untitled draft"}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
          <Clock className="w-2.5 h-2.5" />
          {timeAgo(report.updated_date || report.created_date)}
        </p>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
    </button>
  );
}

function WatchItem({ entry, live }) {
  const isUp = (live?.change ?? 0) >= 0;
  return (
    <Link
      to={`/stock?ticker=${entry.symbol}`}
      className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-secondary/50 transition-colors group"
    >
      <span className="text-xs font-display font-medium group-hover:text-primary transition-colors">{entry.symbol}</span>
      {live?.price != null ? (
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium tabular-nums">${live.price.toFixed(2)}</span>
          <span className={`text-[11px] font-medium flex items-center gap-0.5 ${isUp ? "text-gain" : "text-loss"}`}>
            {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {isUp ? "+" : ""}{live.change?.toFixed(2)}%
          </span>
        </div>
      ) : (
        <span className="text-[11px] text-muted-foreground">â€”</span>
      )}
    </Link>
  );
}

function FollowedReportCard({ report }) {
  const navigate = useNavigate();
  const dir = report.prediction_direction || report.prediction_action;
  return (
    <button
      onClick={() => navigate(`/report?id=${report.id}`)}
      className="w-full text-left flex items-start gap-3 p-3 rounded-xl border border-border hover:border-primary/30 hover:shadow-sm transition-all group"
    >
      {dir && (
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border shrink-0 mt-0.5 ${directionColor(dir)}`}>
          {dir}
        </span>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {report.title || "Untitled"}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[11px] text-muted-foreground">{report.author_name || report.created_by?.split("@")[0]}</span>
          {report.stock_ticker && (
            <span className="text-[10px] font-display font-medium text-primary/80">{report.stock_ticker}</span>
          )}
          <span className="text-[11px] text-muted-foreground ml-auto">{timeAgo(report.created_date)}</span>
        </div>
      </div>
    </button>
  );
}

function AnalystRow({ analyst, rank, allReports, followedEmails, onFollow, currentUserEmail }) {
  const navigate = useNavigate();
  const name = analyst.full_name || analyst.email?.split("@")[0] || "Researcher";
  const acc = analyst.accuracy_score || 0;
  const isFollowing = followedEmails.includes(analyst.email);
  const computed = (() => {
    const resolved = (allReports || []).filter(r =>
      r.created_by === analyst.email &&
      r.prediction_outcome && r.prediction_outcome !== "pending"
    );
    return computeAvgYield(resolved);
  })();
  const MEDALS = { 1: "ðŸ¥‡", 2: "ðŸ¥ˆ", 3: "ðŸ¥‰" };

  return (
    <div
      className="flex items-center gap-2.5 py-2 hover:bg-secondary/50 rounded-lg px-1 transition-colors cursor-pointer group"
      onClick={() => navigate(analystHref(analyst))}
    >
      <span className="text-xs font-medium w-5 text-center shrink-0 text-muted-foreground">
        {MEDALS[rank] || rank}
      </span>
      <div className="w-8 h-8 rounded-full bg-primary/10 border border-border flex items-center justify-center text-xs font-medium text-primary shrink-0 overflow-hidden">
        {analyst.picture
          ? <img src={analyst.picture} alt={name} className="w-full h-full object-cover" />
          : name[0]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate group-hover:text-primary transition-colors">{name}</p>
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] font-medium ${acc >= 75 ? "text-gain" : acc >= 55 ? "text-amber-600" : "text-loss"}`}>
            {acc.toFixed(1)}%
          </span>
          {computed != null && (
            <span className={`text-[10px] font-medium ${computed >= 0 ? "text-gain" : "text-loss"}`}>
              {computed >= 0 ? "+" : ""}{computed.toFixed(1)}% yield
            </span>
          )}
        </div>
      </div>
      {currentUserEmail && currentUserEmail !== analyst.email && (
        <button
          onClick={e => { e.stopPropagation(); onFollow(analyst); }}
          className={`text-[10px] font-medium px-2 py-0.5 rounded border transition-all shrink-0 ${
            isFollowing
              ? "border-gain/30 text-gain bg-gain/10"
              : "border-primary/30 text-primary hover:bg-primary/5"
          }`}
        >
          {isFollowing ? "âœ“" : "Follow"}
        </button>
      )}
    </div>
  );
}

function TrendingPredictionCard({ report }) {
  const navigate = useNavigate();
  const dir = report.prediction_direction || report.prediction_action;
  const isResolved = report.prediction_outcome && report.prediction_outcome !== "pending";
  const isHit = report.prediction_outcome === "hit" || report.prediction_outcome === "near";

  return (
    <button
      onClick={() => navigate(`/report?id=${report.id}`)}
      className="w-full text-left flex items-center gap-2.5 py-2 hover:bg-secondary/40 rounded-lg px-1 transition-colors group"
    >
      {dir && (
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border shrink-0 ${directionColor(dir)}`}>
          {dir}
        </span>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate group-hover:text-primary transition-colors">{report.title}</p>
        {report.stock_ticker && (
          <p className="text-[10px] font-display font-medium text-primary/70">{report.stock_ticker}</p>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {isResolved && (
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${isHit ? "bg-gain/10 text-gain" : "bg-loss/10 text-loss"}`}>
            {isHit ? "HIT" : "MISS"}
          </span>
        )}
        <span className="text-[10px] text-muted-foreground">â™¥ {report.likes || 0}</span>
      </div>
    </button>
  );
}

// â”€â”€ main page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function HomePageDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // left column
  const [drafts, setDrafts] = useState([]);
  const [myPublished, setMyPublished] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [watchData, setWatchData] = useState([]);
  const [wlLoading, setWlLoading] = useState(false);
  const [followedReports, setFollowedReports] = useState([]);
  const [myStats, setMyStats] = useState(null);
  const [purchasedReports, setPurchasedReports] = useState([]);
  const [mySubscriptions, setMySubscriptions] = useState([]);
  const [subscriptionReports, setSubscriptionReports] = useState([]);

  // right column
  const [topAnalysts, setTopAnalysts] = useState([]);
  const [allReports, setAllReports] = useState([]);
  const [trendingPredictions, setTrendingPredictions] = useState([]);
  const [trendingTickers, setTrendingTickers] = useState([]);
  const [trendingSectors, setTrendingSectors] = useState([]);
  const [followedEmails, setFollowedEmails] = useState([]);
  const [indexQuotes, setIndexQuotes] = useState([]);

  const [loading, setLoading] = useState(true);

  // Investors see the consumer home; analysts/admins see the creator dashboard
  const isAnalyst = user?.role === "analyst" || user?.role === "admin";

  // load watchlist from localStorage â€” normalise ticker/symbol field
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(WATCHLIST_KEY) || "[]");
      // WatchlistPanel stores { ticker, timeframe }; normalise to { symbol }
      const normalised = stored.map(e =>
        typeof e === "string" ? { symbol: e } : { ...e, symbol: e.ticker || e.symbol }
      );
      setWatchlist(normalised);
    } catch {}
  }, []);

  const refreshWatchlist = useCallback(async () => {
    if (!watchlist.length) return;
    setWlLoading(true);
    try {
      const data = await fetchQuotes(watchlist.map(w => w.symbol));
      setWatchData(data);
    } catch {}
    finally { setWlLoading(false); }
  }, [watchlist]);

  useEffect(() => { refreshWatchlist(); }, [refreshWatchlist]);

  // main data load
  useEffect(() => {
    if (!user) return;
    const email = user.email;

    const load = async () => {
      try {
        const [myReports, allPub, users, follows, walletTxns, subs] = await Promise.all([
          base44.entities.Report.filter({ created_by: email }, "-updated_date", 30).catch(() => []),
          base44.entities.Report.filter({ status: "published" }, "-likes", 100).catch(() => []),
          base44.entities.User.list("-accuracy_score", 15).catch(() => []),
          base44.entities.Follow.filter({ follower_email: email }, "-created_date", 100).catch(() => []),
          base44.entities.WalletTransaction.filter({ created_by: email, type: "report_unlock" }, "-created_date", 50).catch(() => []),
          base44.entities.Subscription.filter({ subscriber_email: email, status: "active" }, "-created_date", 20).catch(() => []),
        ]);

        // drafts
        setDrafts((myReports || []).filter(r => r.status !== "published").slice(0, 5));

        // my stats + published reports for the left column
        const myPub = (myReports || []).filter(r => r.status === "published");
        setMyPublished(myPub.slice(0, 6));
        const me = users.find(u => u.email === email) || user;
        // Use STOA engine score (live-computed from reports) so the dashboard
        // chip matches what the leaderboard and profile page show.
        const stoaScore = computeScore(myPub);
        setMyStats({
          accuracy: stoaScore.score > 0 ? stoaScore.score : (me.accuracy_score || 0),
          reports: myPub.length,
          followers: me.followers_count || 0,
          yield: computeAvgYield(myPub.filter(r => r.prediction_outcome && r.prediction_outcome !== "pending")),
        });

        // all published reports for right column
        setAllReports(allPub || []);

        // top analysts (exclude self)
        setTopAnalysts((users || []).filter(u => u.accuracy_score > 0 && u.email !== email).slice(0, 7));

        // followed emails
        const fEmails = (follows || []).map(f => f.analyst_email);
        setFollowedEmails(fEmails);

        // reports from followed analysts
        const followedPub = (allPub || [])
          .filter(r => fEmails.includes(r.created_by))
          .slice(0, 6);
        setFollowedReports(followedPub);

        // purchased reports (unlocked via wallet)
        const unlockedIds = new Set((walletTxns || []).map(t => t.related_id).filter(Boolean));
        const purchased = (allPub || []).filter(r => unlockedIds.has(r.id)).slice(0, 8);
        setPurchasedReports(purchased);

        // subscription reports
        setMySubscriptions(subs || []);
        const subEmails = new Set((subs || []).map(s => s.analyst_email).filter(Boolean));
        const subReps = (allPub || [])
          .filter(r => subEmails.has(r.created_by))
          .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
          .slice(0, 8);
        setSubscriptionReports(subReps);

        // trending predictions = most liked reports with a direction
        const withDir = (allPub || []).filter(r => r.prediction_direction || r.prediction_action);
        setTrendingPredictions(withDir.slice(0, 6));

        // trending tickers
        const tickerCount = {};
        (allPub || []).forEach(r => {
          if (r.stock_ticker) tickerCount[r.stock_ticker] = (tickerCount[r.stock_ticker] || 0) + 1;
          (r.tickers || "").split(",").map(t => t.trim()).filter(Boolean).forEach(t => {
            tickerCount[t] = (tickerCount[t] || 0) + 1;
          });
        });
        setTrendingTickers(Object.entries(tickerCount).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([t]) => t));

        // sectors
        const sectorCount = {};
        (allPub || []).forEach(r => { if (r.industry) sectorCount[r.industry] = (sectorCount[r.industry] || 0) + 1; });
        const total = Object.values(sectorCount).reduce((a, b) => a + b, 0) || 1;
        setTrendingSectors(
          Object.entries(sectorCount).sort((a, b) => b[1] - a[1]).slice(0, 5)
            .map(([name, count]) => ({ name, pct: Math.round((count / total) * 100) }))
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user]);

  // Live index prices â€” SPY, QQQ, DIA, VIX
  useEffect(() => {
    const INDEX_TICKERS = [{ sym: "SPY", label: "SPY" }, { sym: "QQQ", label: "QQQ" }, { sym: "DIA", label: "DIA" }, { sym: "^VIX", label: "VIX" }];
    const fetchIndexes = async () => {
      try {
        const results = await Promise.allSettled(
          INDEX_TICKERS.map(async ({ sym, label }) => {
            const r = await base44.functions.invoke("getStockData", { ticker: sym });
            const d = r?.data || r;
            return {
              symbol: label,
              label,
              price: d?.price ?? d?.regularMarketPrice ?? null,
              change: d?.regularMarketChangePercent ?? d?.changePercent ?? null,
            };
          })
        );
        setIndexQuotes(results.filter(r => r.status === "fulfilled" && r.value.price != null).map(r => r.value));
      } catch {}
    };
    fetchIndexes();
    const interval = setInterval(fetchIndexes, 60000);
    return () => clearInterval(interval);
  }, []);


  const handleFollow = async (analyst) => {
    if (!user) return;
    const isNow = followedEmails.includes(analyst.email);
    setFollowedEmails(prev => isNow ? prev.filter(e => e !== analyst.email) : [...prev, analyst.email]);
    try {
      if (!isNow) {
        await base44.entities.Follow.create({
          follower_email: user.email,
          analyst_email: analyst.email,
          analyst_name: analyst.full_name || analyst.email?.split("@")[0],
          analyst_avatar: analyst.picture || "",
        });
      } else {
        const existing = await base44.entities.Follow.filter({ follower_email: user.email, analyst_email: analyst.email });
        if (existing?.[0]) await base44.entities.Follow.delete(existing[0].id);
      }
    } catch {
      setFollowedEmails(prev => isNow ? [...prev, analyst.email] : prev.filter(e => e !== analyst.email));
    }
  };

  // Investors see the consumer home; analysts/admins see the creator dashboard
  if (user && !isAnalyst) return <InvestorHome />;

  const displayName = user?.full_name || user?.email?.split("@")[0] || "Researcher";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="max-w-[1180px] mx-auto px-5 py-10 pb-16">

      {/* â”€â”€ Welcome header â€” editorial, single focus â”€â”€ */}
      <div className="mb-8 flex items-end justify-between flex-wrap gap-4">
        <div>
          <span className="eyebrow text-muted-foreground">Creator Studio</span>
          <h1 className="font-serif font-medium text-foreground tracking-tight mt-2" style={{ fontSize: 32, letterSpacing: "-0.02em" }}>
            {greeting}, {displayName.split(" ")[0]}.
          </h1>
        </div>
        <Link to="/editor">
          <Button className="cta-gold gap-2 px-6 py-2.5 text-[13px]" style={{ borderRadius: 6 }}>
            <PenLine className="w-4 h-4" /> Write Report
          </Button>
        </Link>
      </div>

      {/* â”€â”€ 3 hero stat cards â€” Beehiiv-style creator dashboard:
          Subscribers Â· Accuracy Â· Followers (proxy for earnings reach).
          Big numbers, clear labels, generous padding, NO gradient chips. */}
      {myStats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <Link to="/subscribers" className="stat-card surface-interactive no-underline">
            <p className="stat-card-label">Subscribers</p>
            <p className="stat-card-value text-foreground mt-2">{mySubscriptions.length}</p>
            <p className="stat-card-sub">Active paid Â· ${(mySubscriptions.length * 9).toLocaleString()}/mo run-rate</p>
          </Link>

          <Link to=”/analyst” className=”stat-card surface-interactive no-underline”>
            <p className=”stat-card-label”>STOA Score</p>
            <p className=”stat-card-value text-foreground mt-2”>
              {myStats.accuracy > 0 ? `${myStats.accuracy.toFixed(0)}/100` : “—“}
            </p>
            <p className=”stat-card-sub”>
              {myStats.accuracy > 0
                ? <><span className=”font-display”>{myStats.reports}</span> reports tracked</>
                : “Publish predictions to start your track record”}
            </p>
          </Link>

          <Link to="/analyst" className="stat-card surface-interactive no-underline">
            <p className="stat-card-label">Followers</p>
            <p className="stat-card-value text-foreground mt-2">{myStats.followers.toLocaleString()}</p>
            <p className="stat-card-sub">
              {myStats.yield != null
                ? <>Avg yield {formatYield(myStats.yield)}</>
                : "Free following â€” grow your audience"}
            </p>
          </Link>
        </div>
      )}

      {/* â”€â”€ Two-column layout â”€â”€ */}
      <div className="flex gap-6 items-start">

        {/* â•â•â• LEFT COLUMN â•â•â• */}
        <div className="flex-1 min-w-0 space-y-5">

          {/* My Drafts */}
          <section className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-medium text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                My Drafts
              </h2>
              <Link to="/editor" className="flex items-center gap-1 text-xs text-primary hover:underline">
                <Plus className="w-3 h-3" /> New report
              </Link>
            </div>
            {drafts.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-border rounded-xl">
                <PenLine className="w-7 h-7 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-3">No drafts yet</p>
                <Button size="sm" onClick={() => navigate("/editor")} className="text-xs gap-1.5">
                  <PenLine className="w-3.5 h-3.5" /> Start writing
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {drafts.map(d => <DraftCard key={d.id} report={d} />)}
              </div>
            )}
          </section>

          {/* My Published Reports */}
          <section className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-medium text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                My Reports
                {myPublished.length > 0 && (
                  <span className="text-xs text-muted-foreground font-normal">({myStats?.reports || myPublished.length})</span>
                )}
              </h2>
              <Link to="/analyst" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                See all <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            {myPublished.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-border rounded-xl">
                <FileText className="w-7 h-7 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-1">You haven't published yet</p>
                <p className="text-xs text-muted-foreground/70 mb-3">Publish your first report to start building your track record</p>
                <Button size="sm" onClick={() => navigate("/editor")} className="text-xs gap-1.5">
                  <PenLine className="w-3.5 h-3.5" /> Write a report
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {myPublished.map(r => {
                  const dir = r.prediction_direction || r.prediction_action;
                  const outcome = r.prediction_outcome;
                  const isHit  = outcome === "hit" || outcome === "near";
                  const isMiss = outcome === "miss";
                  const isPending = !outcome || outcome === "pending";
                  return (
                    <button
                      key={r.id}
                      onClick={() => navigate(`/report?id=${r.id}`)}
                      className="w-full text-left flex items-start gap-3 p-3 rounded-xl border border-border hover:border-primary/30 hover:bg-secondary/30 transition-all group"
                    >
                      {dir && (
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border shrink-0 mt-0.5 ${directionColor(dir)}`}>
                          {dir}
                        </span>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-snug line-clamp-1 group-hover:text-primary transition-colors">
                          {r.title || "Untitled report"}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {r.stock_ticker && (
                            <span className="text-[10px] font-display font-medium text-primary/80">{r.stock_ticker}</span>
                          )}
                          {!isPending && (
                            <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${
                              isHit  ? "bg-gain/10 text-gain"
                              : isMiss ? "bg-loss/10 text-loss"
                              : "bg-amber-100 text-amber-700"
                            }`}>
                              {(outcome || "").toUpperCase()}
                            </span>
                          )}
                          {isPending && r.prediction_action && (
                            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">
                              ACTIVE
                            </span>
                          )}
                          {r.views > 0 && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              ðŸ‘ {r.views}
                            </span>
                          )}
                          {r.likes > 0 && (
                            <span className="text-[10px] text-muted-foreground">â™¥ {r.likes}</span>
                          )}
                          <span className="text-[10px] text-muted-foreground ml-auto">{timeAgo(r.created_date)}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* My Watchlist */}
          {watchlist.length > 0 && (
            <section className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-medium text-sm flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  My Watchlist
                </h2>
                <div className="flex items-center gap-3">
                  <button
                    onClick={refreshWatchlist}
                    disabled={wlLoading}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${wlLoading ? "animate-spin" : ""}`} />
                  </button>
                  <Link to="/stocks" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                    Manage <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
              <div className="divide-y divide-border">
                {watchlist.map(entry => (
                  <WatchItem key={entry.symbol} entry={entry} live={watchData.find(d => d.symbol === entry.symbol)} />
                ))}
              </div>
            </section>
          )}

          {/* Reports You've Unlocked */}
          {(purchasedReports.length > 0) && (
            <section className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-medium text-sm flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-500" />
                  Reports You've Unlocked
                  <span className="text-xs text-muted-foreground font-normal">({purchasedReports.length})</span>
                </h2>
                <Link to="/feed" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                  Browse more <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="space-y-2">
                {purchasedReports.map(r => {
                  const dir = r.prediction_direction || r.prediction_action;
                  const outcome = r.prediction_outcome;
                  const isHit = outcome === "hit" || outcome === "near";
                  const isMiss = outcome === "miss";
                  const isPending = !outcome || outcome === "pending";
                  return (
                    <button
                      key={r.id}
                      onClick={() => navigate(`/report?id=${r.id}`)}
                      className="w-full text-left flex items-start gap-3 p-3 rounded-xl border border-amber-100 bg-amber-50/30 hover:border-amber-300/60 hover:bg-amber-50/50 transition-all group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                        <Lock className="w-3.5 h-3.5 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-snug line-clamp-1 group-hover:text-primary transition-colors">
                          {r.title || "Untitled report"}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-[10px] text-muted-foreground">{r.author_name || r.created_by?.split("@")[0]}</span>
                          {r.stock_ticker && (
                            <span className="text-[10px] font-display font-medium text-primary/80">{r.stock_ticker}</span>
                          )}
                          {dir && (
                            <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded border ${directionColor(dir)}`}>{dir}</span>
                          )}
                          {!isPending && (
                            <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${isHit ? "bg-gain/10 text-gain" : isMiss ? "bg-loss/10 text-loss" : "bg-amber-100 text-amber-700"}`}>
                              {(outcome || "").toUpperCase()}
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground ml-auto">{timeAgo(r.created_date)}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* From Your Subscriptions */}
          {(mySubscriptions.length > 0) && (
            <section className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-medium text-sm flex items-center gap-2">
                  <Crown className="w-4 h-4 text-primary" />
                  From Your Subscriptions
                  <span className="text-xs text-muted-foreground font-normal">({mySubscriptions.length} active)</span>
                </h2>
                <Link to="/feed" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                  Full feed <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              {/* Subscribed analyst chips */}
              <div className="flex flex-wrap gap-2 mb-4">
                {mySubscriptions.map(sub => {
                  const name = sub.analyst_name || sub.analyst_email?.split("@")[0] || "Researcher";
                  return (
                    <Link
                      key={sub.id}
                      to={analystHref({ email: sub.analyst_email, full_name: sub.analyst_name })}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 transition-all group"
                    >
                      <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-medium text-primary shrink-0">
                        {name[0].toUpperCase()}
                      </div>
                      <span className="text-[11px] font-medium text-foreground group-hover:text-primary transition-colors truncate max-w-[80px]">{name}</span>
                    </Link>
                  );
                })}
              </div>
              {subscriptionReports.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-border rounded-xl">
                  <BookOpen className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Your subscribed researchers haven't published yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {subscriptionReports.map(r => {
                    const dir = r.prediction_direction || r.prediction_action;
                    const outcome = r.prediction_outcome;
                    const isHit = outcome === "hit" || outcome === "near";
                    const isMiss = outcome === "miss";
                    const isPending = !outcome || outcome === "pending";
                    return (
                      <button
                        key={r.id}
                        onClick={() => navigate(`/report?id=${r.id}`)}
                        className="w-full text-left flex items-start gap-3 p-3 rounded-xl border border-border hover:border-primary/30 hover:bg-secondary/30 transition-all group"
                      >
                        {dir && (
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border shrink-0 mt-0.5 ${directionColor(dir)}`}>
                            {dir}
                          </span>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-snug line-clamp-1 group-hover:text-primary transition-colors">
                            {r.title || "Untitled"}
                          </p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-[10px] text-muted-foreground">{r.author_name || r.created_by?.split("@")[0]}</span>
                            {r.stock_ticker && (
                              <span className="text-[10px] font-display font-medium text-primary/80">{r.stock_ticker}</span>
                            )}
                            {!isPending && (
                              <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${isHit ? "bg-gain/10 text-gain" : isMiss ? "bg-loss/10 text-loss" : "bg-amber-100 text-amber-700"}`}>
                                {(outcome || "").toUpperCase()}
                              </span>
                            )}
                            <span className="text-[10px] text-muted-foreground ml-auto">{timeAgo(r.created_date)}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* From analysts you follow */}
          <section className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-medium text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                From Researchers You Follow
              </h2>
              <Link to="/feed" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                Full feed <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {followedReports.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-border rounded-xl">
                <Users className="w-7 h-7 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-1">You're not following anyone yet</p>
                <p className="text-xs text-muted-foreground/70 mb-3">Follow top researchers to see their latest calls here</p>
                <Button size="sm" variant="outline" onClick={() => navigate("/leaderboard")} className="text-xs">
                  Discover Researchers
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {followedReports.map(r => <FollowedReportCard key={r.id} report={r} />)}
              </div>
            )}
          </section>
        </div>

        {/* â•â•â• RIGHT COLUMN â•â•â• â€” slim, max 2 widgets per redesign brief.
            Quick Access + Market Activity removed; users find those via
            the global nav and /stocks. Right rail now shows only the
            two highest-leverage panels: Top Researchers and Hot
            Predictions. */}
        <div className="hidden lg:flex flex-col gap-8 w-64 flex-shrink-0">

          {/* Top Analysts */}
          <section className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-medium text-sm flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                Top Researchers
              </h2>
              <Link to="/leaderboard" className="text-xs text-primary hover:underline">See all</Link>
            </div>
            {topAnalysts.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No data yet.</p>
            ) : (
              <div className="space-y-0.5">
                {topAnalysts.map((analyst, i) => (
                  <AnalystRow
                    key={analyst.id}
                    analyst={analyst}
                    rank={i + 1}
                    allReports={allReports}
                    followedEmails={followedEmails}
                    onFollow={handleFollow}
                    currentUserEmail={user?.email}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Trending Predictions */}
          <section className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-medium text-sm flex items-center gap-2">
                <Flame className="w-4 h-4 text-accent" />
                Hot Predictions
              </h2>
              <Link to="/feed" className="text-xs text-primary hover:underline">More</Link>
            </div>
            {trendingPredictions.length === 0 ? (
              <p className="text-xs text-muted-foreground py-3 text-center">No predictions yet.</p>
            ) : (
              <div className="space-y-0.5">
                {trendingPredictions.map(r => (
                  <TrendingPredictionCard key={r.id} report={r} />
                ))}
              </div>
            )}
          </section>

          {/* Market Activity removed â€” third widget violated the
              "max 2 panels in the right rail" rule. Users find live
              market data on /stocks instead. */}
          {false && (
          <section className="surface p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-medium text-sm flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Market Activity
              </h2>
              <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-gain animate-pulse" /> Live
              </span>
            </div>

            {/* Live index prices */}
            {indexQuotes.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mb-4">
                {indexQuotes.map(q => {
                  const up = (q.change ?? 0) >= 0;
                  return (
                    <div key={q.symbol} className="group rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-card-md px-3 py-2 transition-all">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] font-display font-medium tracking-wide text-muted-foreground">{q.label}</span>
                        {up ? <TrendingUp className="w-2.5 h-2.5 text-gain" /> : <TrendingDown className="w-2.5 h-2.5 text-loss" />}
                      </div>
                      <div className="text-sm font-medium tabular-nums leading-tight">
                        {q.symbol === "VIX" ? q.price?.toFixed(2) : `$${q.price?.toFixed(2)}`}
                      </div>
                      <div className={`text-[11px] font-medium tabular-nums ${up ? "text-gain" : "text-loss"}`}>
                        {up ? "+" : ""}{q.change?.toFixed(2)}%
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {trendingTickers.length > 0 && (
              <>
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2">Most Covered</p>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {trendingTickers.map(t => (
                    <button
                      key={t}
                      onClick={() => navigate(`/stock?ticker=${t}`)}
                      className="text-[11px] font-display font-medium px-2 py-1 rounded-lg bg-secondary hover:bg-primary/10 hover:text-primary border border-border transition-all"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </>
            )}

            {trendingSectors.length > 0 && (
              <>
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2">Top Sectors</p>
                <div className="space-y-2">
                  {trendingSectors.map(({ name, pct }) => (
                    <div key={name}>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-foreground/80 truncate pr-2">{name}</span>
                        <span className="font-medium shrink-0">{pct}%</span>
                      </div>
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary/60 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
          )}

        </div>
      </div>
    </div>
  );
}
