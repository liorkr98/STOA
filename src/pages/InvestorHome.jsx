import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import {
  Star, TrendingUp, TrendingDown, RefreshCw, Trophy, Sparkles,
  ArrowRight, Flame, Users, BarChart3, ChevronRight, Loader2,
  Lock, Crown, BookOpen, Eye, Heart, Settings, Bell, Search,
  Target, Zap, FileText, PenLine,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAnalystSlug } from "@/lib/analystSlug";

const WATCHLIST_KEY = "stoa_watchlist";

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

function timeAgo(d) {
  if (!d) return "";
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function directionColor(d) {
  if (d === "LONG" || d === "Long" || d === "BUY" || d === "Buy") return "text-green-600 bg-green-50 border-green-200";
  if (d === "SHORT" || d === "Short" || d === "SELL" || d === "Sell") return "text-red-600 bg-red-50 border-red-200";
  return "text-muted-foreground bg-secondary border-border";
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, iconColor, onClick, hero }) {
  return (
    <button
      onClick={onClick}
      className={hero ? "stat-card stat-card-hero" : "stat-card"}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="stat-card-label flex items-center gap-1.5">
          {Icon && <Icon className="w-3.5 h-3.5" style={iconColor ? { color: iconColor } : undefined} />}
          {label}
        </span>
        <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
      </div>
      <p className="stat-card-value">{value}</p>
      {sub && <p className="stat-card-sub">{sub}</p>}
    </button>
  );
}

function WatchItem({ entry, live }) {
  const isUp = (live?.change ?? 0) >= 0;
  const ticker = entry.ticker || entry.symbol;
  return (
    <Link
      to={`/stock?ticker=${ticker}`}
      className="flex items-center justify-between py-2.5 px-2 rounded-lg hover:bg-secondary/50 transition-colors group"
    >
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-primary/8 flex items-center justify-center">
          <span className="text-[9px] font-mono font-black text-primary">{ticker?.slice(0, 2)}</span>
        </div>
        <span className="text-xs font-mono font-bold group-hover:text-primary transition-colors">{ticker}</span>
      </div>
      {live?.price != null ? (
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold tabular-nums">${live.price.toFixed(2)}</span>
          <span className={`text-[11px] font-semibold flex items-center gap-0.5 px-1.5 py-0.5 rounded-full ${isUp ? "text-green-700 bg-green-50" : "text-red-600 bg-red-50"}`}>
            {isUp ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
            {isUp ? "+" : ""}{live.change?.toFixed(2)}%
          </span>
        </div>
      ) : (
        <span className="text-[11px] text-muted-foreground">—</span>
      )}
    </Link>
  );
}

function ReportRow({ report, index }) {
  const navigate = useNavigate();
  const dir = report.prediction_direction || report.prediction_action;
  const outcome = report.prediction_outcome;
  const isHit = outcome === "hit" || outcome === "near";
  const isMiss = outcome === "miss";
  const isPending = !outcome || outcome === "pending";

  return (
    <div
      onClick={() => navigate(`/report?id=${report.id}`)}
      className="flex items-center gap-4 py-3.5 px-2 cursor-pointer hover:bg-secondary/40 rounded-xl transition-colors group"
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all group-hover:scale-105"
        style={{ background: isHit ? "hsl(var(--gain)/0.10)" : isMiss ? "hsl(var(--loss)/0.10)" : "hsl(var(--primary)/0.07)" }}
      >
        <FileText
          className="w-4 h-4"
          style={{ color: isHit ? "hsl(var(--gain))" : isMiss ? "hsl(var(--loss))" : "hsl(var(--primary))" }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm leading-snug truncate group-hover:text-primary transition-colors">{report.title}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-[10px] text-muted-foreground">{report.author_name || report.created_by?.split("@")[0]}</span>
          {report.stock_ticker && (
            <span className="text-[10px] font-mono font-bold text-primary/70 bg-primary/8 px-1.5 py-0.5 rounded">{report.stock_ticker}</span>
          )}
          {dir && (
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${directionColor(dir)}`}>{dir}</span>
          )}
        </div>
      </div>
      <div className="shrink-0 text-right">
        {!isPending ? (
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${isHit ? "bg-gain/10 text-gain" : "bg-loss/10 text-loss"}`}>
            {isHit ? "Hit ✓" : "Miss ✗"}
          </span>
        ) : (
          <span className="text-[11px] text-muted-foreground">{timeAgo(report.created_date)}</span>
        )}
        <p className="text-[10px] text-muted-foreground/50 mt-0.5 tabular-nums">#{String(index + 1).padStart(3, "0")}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground/30 shrink-0 group-hover:text-primary/50 transition-colors" />
    </div>
  );
}

function AnalystCard({ analyst, rank, followedEmails, onFollow, currentUserEmail }) {
  const navigate = useNavigate();
  const name = analyst.full_name || analyst.email?.split("@")[0] || "Researcher";
  const acc = analyst.accuracy_score || 0;
  const following = followedEmails.includes(analyst.email);
  const MEDALS = { 1: "🥇", 2: "🥈", 3: "🥉" };

  return (
    <div
      className="flex items-center gap-3 py-2.5 px-2 hover:bg-secondary/50 rounded-xl transition-colors cursor-pointer group"
      onClick={() => navigate(`/analyst/${getAnalystSlug(analyst)}`)}
    >
      <span className="text-xs font-bold w-5 text-center shrink-0 text-muted-foreground">{MEDALS[rank] || rank}</span>
      <div className="w-9 h-9 rounded-full bg-primary/10 border border-border flex items-center justify-center text-xs font-bold text-primary shrink-0 overflow-hidden">
        {analyst.picture ? <img src={analyst.picture} alt={name} className="w-full h-full object-cover" /> : name[0]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate group-hover:text-primary transition-colors">{name}</p>
        <span className={`text-[10px] font-bold ${acc >= 75 ? "text-green-600" : acc >= 55 ? "text-amber-600" : "text-red-500"}`}>
          {acc.toFixed(1)}% accuracy
        </span>
      </div>
      {currentUserEmail && currentUserEmail !== analyst.email && (
        <button
          onClick={e => { e.stopPropagation(); onFollow(analyst); }}
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all shrink-0 ${
            following
              ? "border-green-300 text-green-700 bg-green-50"
              : "border-primary/30 text-primary hover:bg-primary/5"
          }`}
        >
          {following ? "✓ Following" : "+ Follow"}
        </button>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function InvestorHome() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [watchlist,           setWatchlist]           = useState([]);
  const [watchData,           setWatchData]           = useState([]);
  const [wlLoading,           setWlLoading]           = useState(false);
  const [followedReports,     setFollowedReports]     = useState([]);
  const [followedEmails,      setFollowedEmails]      = useState([]);
  const [topAnalysts,         setTopAnalysts]         = useState([]);
  const [trendingPredictions, setTrendingPredictions] = useState([]);
  const [trendingTickers,     setTrendingTickers]     = useState([]);
  const [purchasedReports,    setPurchasedReports]    = useState([]);
  const [mySubscriptions,     setMySubscriptions]     = useState([]);
  const [subscriptionReports, setSubscriptionReports] = useState([]);
  const [indexQuotes,         setIndexQuotes]         = useState([]);
  const [loading,             setLoading]             = useState(true);

  // Normalise watchlist from localStorage
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(WATCHLIST_KEY) || "[]");
      const norm = stored.map(e =>
        typeof e === "string" ? { symbol: e } : { ...e, symbol: e.ticker || e.symbol }
      );
      setWatchlist(norm);
    } catch {}
  }, []);

  const refreshWatchlist = useCallback(async () => {
    if (!watchlist.length) return;
    setWlLoading(true);
    try {
      const data = await fetchQuotes(watchlist.map(w => w.symbol));
      setWatchData(data);
    } catch {} finally { setWlLoading(false); }
  }, [watchlist]);

  useEffect(() => { refreshWatchlist(); }, [refreshWatchlist]);

  // Live index prices
  useEffect(() => {
    const IDXS = [{ sym: "SPY", label: "SPY" }, { sym: "QQQ", label: "QQQ" }, { sym: "DIA", label: "DIA" }, { sym: "^VIX", label: "VIX" }];
    const fetch_ = async () => {
      try {
        const res = await Promise.allSettled(
          IDXS.map(async ({ sym, label }) => {
            const r = await base44.functions.invoke("getStockData", { ticker: sym });
            const d = r?.data || r;
            return { symbol: label, price: d?.price ?? d?.regularMarketPrice ?? null, change: d?.regularMarketChangePercent ?? d?.changePercent ?? null };
          })
        );
        setIndexQuotes(res.filter(r => r.status === "fulfilled" && r.value.price != null).map(r => r.value));
      } catch {}
    };
    fetch_();
    const iv = setInterval(fetch_, 60000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (!user) return;
    const email = user.email;
    const load = async () => {
      try {
        const [allPub, users, follows, walletTxns, subs] = await Promise.all([
          base44.entities.Report.filter({ status: "published" }, "-likes", 100).catch(() => []),
          base44.entities.User.list("-accuracy_score", 15).catch(() => []),
          base44.entities.Follow.filter({ follower_email: email }, "-created_date", 100).catch(() => []),
          base44.entities.WalletTransaction.filter({ created_by: email, type: "report_unlock" }, "-created_date", 50).catch(() => []),
          base44.entities.Subscription.filter({ subscriber_email: email, status: "active" }, "-created_date", 20).catch(() => []),
        ]);

        setTopAnalysts((users || []).filter(u => u.accuracy_score > 0 && u.email !== email).slice(0, 7));

        const fEmails = (follows || []).map(f => f.analyst_email);
        setFollowedEmails(fEmails);
        setFollowedReports((allPub || []).filter(r => fEmails.includes(r.created_by)).slice(0, 8));

        const withDir = (allPub || []).filter(r => r.prediction_direction || r.prediction_action);
        setTrendingPredictions(withDir.slice(0, 8));

        const tickerCount = {};
        (allPub || []).forEach(r => {
          if (r.stock_ticker) tickerCount[r.stock_ticker] = (tickerCount[r.stock_ticker] || 0) + 1;
        });
        setTrendingTickers(Object.entries(tickerCount).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([t]) => t));

        // Purchased
        const unlockedIds = new Set((walletTxns || []).map(t => t.related_id).filter(Boolean));
        setPurchasedReports((allPub || []).filter(r => unlockedIds.has(r.id)).slice(0, 6));

        // Subscriptions
        setMySubscriptions(subs || []);
        const subEmails = new Set((subs || []).map(s => s.analyst_email).filter(Boolean));
        setSubscriptionReports(
          (allPub || []).filter(r => subEmails.has(r.created_by))
            .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
            .slice(0, 6)
        );
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const handleFollow = async (analyst) => {
    if (!user) return;
    const isNow = followedEmails.includes(analyst.email);
    setFollowedEmails(prev => isNow ? prev.filter(e => e !== analyst.email) : [...prev, analyst.email]);
    try {
      if (!isNow) {
        await base44.entities.Follow.create({
          follower_email: user.email, analyst_email: analyst.email,
          analyst_name: analyst.full_name || analyst.email?.split("@")[0],
          analyst_avatar: analyst.picture || "",
        });
      } else {
        const ex = await base44.entities.Follow.filter({ follower_email: user.email, analyst_email: analyst.email });
        if (ex?.[0]) await base44.entities.Follow.delete(ex[0].id);
      }
    } catch {
      setFollowedEmails(prev => isNow ? [...prev, analyst.email] : prev.filter(e => e !== analyst.email));
    }
  };

  const displayName = user?.full_name || user?.email?.split("@")[0] || "Investor";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 pb-16">

      {/* ── Profile Header ── */}
      <div className="surface-premium p-7 mb-7">
        <div className="flex items-start gap-5 flex-wrap">
          {/* Avatar */}
          <div className="relative">
            {user?.picture
              ? <img src={user.picture} alt={displayName} className="w-20 h-20 rounded-full border-[3px] border-card object-cover shadow-card-md ring-1 ring-border" />
              : <div className="w-20 h-20 rounded-full border-[3px] border-card shadow-card-md ring-1 ring-border bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-3xl font-bold text-white">
                  {displayName[0].toUpperCase()}
                </div>
            }
            <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gain border-2 border-card" title="Online" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-[200px]">
            <span className="eyebrow">Investor Hub</span>
            <h1 className="text-2xl font-bold text-foreground mt-1.5 mb-1">
              {greeting}, {displayName.split(" ")[0]}
            </h1>
            <p className="text-sm text-muted-foreground mb-3">Your personalised research intelligence overview.</p>
            <div className="flex flex-wrap gap-2">
              <span className="pill"><Users className="w-3 h-3" />{followedEmails.length} Followed</span>
              <span className="pill"><Star className="w-3 h-3" />{watchlist.length} Watchlist</span>
              {mySubscriptions.length > 0 && (
                <span className="pill pill-accent"><Crown className="w-3 h-3" />{mySubscriptions.length} Subscriptions</span>
              )}
              {purchasedReports.length > 0 && (
                <span className="pill"><Lock className="w-3 h-3" />{purchasedReports.length} Unlocked</span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            <Link to="/feed"><Button size="sm" className="gap-1.5 shadow-card"><Search className="w-3.5 h-3.5" /> Browse Reports</Button></Link>
            <Link to="/stocks"><Button variant="outline" size="sm" className="gap-1.5"><BarChart3 className="w-3.5 h-3.5" /> Markets</Button></Link>
            <Link to="/edit-profile"><Button variant="outline" size="sm" className="gap-1.5"><Settings className="w-3.5 h-3.5" /> Settings</Button></Link>
          </div>
        </div>
      </div>

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-7">
        <StatCard
          label="Following"
          value={followedEmails.length}
          sub="Researchers you track"
          icon={Users}
          iconColor="hsl(var(--primary))"
          onClick={() => navigate("/leaderboard")}
          hero
        />
        <StatCard
          label="Watchlist"
          value={watchlist.length}
          sub="Stocks tracked"
          icon={Star}
          iconColor="hsl(42 96% 45%)"
          onClick={() => navigate("/stocks")}
        />
        <StatCard
          label="Subscriptions"
          value={mySubscriptions.length}
          sub={mySubscriptions.length > 0 ? "Premium access active" : "No active plans"}
          icon={Crown}
          iconColor="hsl(var(--accent))"
          onClick={() => navigate("/feed")}
        />
        <StatCard
          label="Unlocked Reports"
          value={purchasedReports.length}
          sub="Premium research"
          icon={Lock}
          iconColor="hsl(42 96% 45%)"
          onClick={() => navigate("/feed")}
        />
      </div>

      {/* ── Market Pulse — dark navy hero (Figma-inspired) ── */}
      {indexQuotes.length > 0 && (
        <div className="rounded-2xl p-6 mb-7 text-white relative overflow-hidden" style={{ background: "linear-gradient(135deg, #0d1f3c 0%, #1e3a6e 100%)" }}>
          <div className="absolute top-0 right-0 w-72 h-72 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(201,150,19,0.12) 0%, transparent 70%)", transform: "translate(30%,-30%)" }} />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-5">
              <span className="w-2 h-2 rounded-full bg-gain animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/50">Live Market Pulse</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
              {indexQuotes.map(q => {
                const up = (q.change ?? 0) >= 0;
                return (
                  <div key={q.symbol}>
                    <p className="text-white/45 text-[10px] uppercase tracking-wider mb-1">{q.symbol}</p>
                    <p className="text-2xl font-extrabold tracking-tight tabular-nums">
                      {q.symbol === "VIX" ? q.price?.toFixed(2) : `$${q.price?.toFixed(2)}`}
                    </p>
                    <p className={`text-[12px] font-bold mt-0.5 flex items-center gap-1 ${up ? "text-green-400" : "text-red-400"}`}>
                      {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {up ? "+" : ""}{q.change?.toFixed(2)}%
                    </p>
                  </div>
                );
              })}
            </div>
            {trendingTickers.length > 0 && (
              <div className="pt-4 border-t border-white/10">
                <p className="text-white/35 text-[10px] uppercase tracking-wider mb-2">Most Covered Tickers</p>
                <div className="flex flex-wrap gap-1.5">
                  {trendingTickers.map(t => (
                    <button
                      key={t}
                      onClick={() => navigate(`/stock?ticker=${t}`)}
                      className="text-[11px] font-mono font-bold px-2 py-1 rounded-lg border border-white/15 text-white/70 hover:bg-white/10 hover:text-white transition-all"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Two-column layout ── */}
      <div className="flex gap-6 items-start">

        {/* ═══ LEFT COLUMN ═══ */}
        <div className="flex-1 min-w-0 space-y-5">

          {/* My Watchlist */}
          <section className="surface p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "hsl(42 96% 45% / 0.12)" }}>
                  <Star className="w-4 h-4" style={{ color: "hsl(42 96% 45%)" }} />
                </div>
                <div>
                  <h2 className="font-semibold text-sm leading-tight">My Watchlist</h2>
                  <span className="text-[11px] text-muted-foreground">{watchlist.length} stocks</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={refreshWatchlist} disabled={wlLoading} className="text-muted-foreground hover:text-foreground transition-colors p-1">
                  <RefreshCw className={`w-3.5 h-3.5 ${wlLoading ? "animate-spin" : ""}`} />
                </button>
                <Link to="/stocks" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                  Manage <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
            {watchlist.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-border rounded-xl">
                <Star className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-1">No stocks tracked yet</p>
                <p className="text-xs text-muted-foreground/60 mb-3">Add stocks to monitor live prices and link to research.</p>
                <Button size="sm" onClick={() => navigate("/stocks")} className="text-xs">Browse Markets</Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {watchlist.map(entry => (
                  <WatchItem key={entry.symbol} entry={entry} live={watchData.find(d => d.symbol === entry.symbol)} />
                ))}
              </div>
            )}
          </section>

          {/* From Analysts You Follow */}
          <section className="surface p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center">
                  <Users className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-sm leading-tight">From Researchers You Follow</h2>
                  <span className="text-[11px] text-muted-foreground">{followedReports.length} recent reports</span>
                </div>
              </div>
              <Link to="/feed" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                Full feed <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {followedReports.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-border rounded-xl">
                <Users className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-1">Follow researchers to see their calls here</p>
                <p className="text-xs text-muted-foreground/60 mb-3">Track top performers and get their research in your feed.</p>
                <Button size="sm" variant="outline" onClick={() => navigate("/leaderboard")} className="text-xs">
                  Discover Researchers
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {followedReports.map((r, i) => <ReportRow key={r.id} report={r} index={i} />)}
              </div>
            )}
          </section>

          {/* From Your Subscriptions */}
          {mySubscriptions.length > 0 && (
            <section className="surface p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "hsl(var(--accent) / 0.12)" }}>
                    <Crown className="w-4 h-4" style={{ color: "hsl(var(--accent))" }} />
                  </div>
                  <div>
                    <h2 className="font-semibold text-sm leading-tight">From Your Subscriptions</h2>
                    <span className="text-[11px] text-muted-foreground">{mySubscriptions.length} active plans</span>
                  </div>
                </div>
                <Link to="/feed" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                  See all <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              {/* Analyst chips */}
              <div className="flex flex-wrap gap-2 mb-5">
                {mySubscriptions.map(sub => {
                  const name = sub.analyst_name || sub.analyst_email?.split("@")[0] || "Researcher";
                  return (
                    <Link
                      key={sub.id}
                      to={`/analyst/${sub.analyst_email?.split("@")[0]}`}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 transition-all group"
                    >
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0 overflow-hidden">
                        {sub.analyst_avatar
                          ? <img src={sub.analyst_avatar} alt={name} className="w-full h-full object-cover" />
                          : name[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold truncate max-w-[80px] group-hover:text-primary transition-colors">{name}</p>
                        <p className="text-[9px] text-muted-foreground capitalize">{sub.plan || "monthly"}</p>
                      </div>
                      <span className="text-[9px] font-bold text-gain bg-gain/10 border border-gain/20 px-1.5 py-0.5 rounded-full">Active</span>
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
                <div className="divide-y divide-border">
                  {subscriptionReports.map((r, i) => <ReportRow key={r.id} report={r} index={i} />)}
                </div>
              )}
            </section>
          )}

          {/* Reports You've Unlocked */}
          {purchasedReports.length > 0 && (
            <section className="surface p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                    <Lock className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-sm leading-tight">Reports You've Unlocked</h2>
                    <span className="text-[11px] text-muted-foreground">{purchasedReports.length} premium reports</span>
                  </div>
                </div>
                <Link to="/feed" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                  Discover more <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="divide-y divide-border">
                {purchasedReports.map((r, i) => <ReportRow key={r.id} report={r} index={i} />)}
              </div>
            </section>
          )}
        </div>

        {/* ═══ RIGHT COLUMN ═══ */}
        <div className="hidden lg:flex flex-col gap-5 w-72 flex-shrink-0">

          {/* Top Analysts */}
          <section className="surface p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "hsl(42 96% 45% / 0.12)" }}>
                  <Trophy className="w-3.5 h-3.5" style={{ color: "hsl(42 96% 45%)" }} />
                </div>
                <h2 className="font-semibold text-sm">Top Researchers</h2>
              </div>
              <Link to="/leaderboard" className="text-xs text-primary hover:underline">See all</Link>
            </div>
            {topAnalysts.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No data yet.</p>
            ) : (
              <div className="space-y-0.5">
                {topAnalysts.map((analyst, i) => (
                  <AnalystCard
                    key={analyst.id}
                    analyst={analyst}
                    rank={i + 1}
                    followedEmails={followedEmails}
                    onFollow={handleFollow}
                    currentUserEmail={user?.email}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Hot Predictions */}
          <section className="surface p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center">
                  <Flame className="w-3.5 h-3.5 text-orange-500" />
                </div>
                <h2 className="font-semibold text-sm">Hot Predictions</h2>
              </div>
              <Link to="/feed" className="text-xs text-primary hover:underline">More</Link>
            </div>
            {trendingPredictions.length === 0 ? (
              <p className="text-xs text-muted-foreground py-3 text-center">No predictions yet.</p>
            ) : (
              <div className="space-y-0.5">
                {trendingPredictions.map(r => {
                  const dir = r.prediction_direction || r.prediction_action;
                  const isResolved = r.prediction_outcome && r.prediction_outcome !== "pending";
                  const isHit = r.prediction_outcome === "hit" || r.prediction_outcome === "near";
                  return (
                    <button
                      key={r.id}
                      onClick={() => navigate(`/report?id=${r.id}`)}
                      className="w-full text-left flex items-center gap-2.5 py-2 hover:bg-secondary/40 rounded-lg px-1 transition-colors group"
                    >
                      {dir && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${directionColor(dir)}`}>{dir}</span>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate group-hover:text-primary transition-colors">{r.title}</p>
                        {r.stock_ticker && <p className="text-[10px] font-mono font-bold text-primary/70">{r.stock_ticker}</p>}
                      </div>
                      {isResolved && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${isHit ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {isHit ? "HIT" : "MISS"}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* Quick links */}
          <section className="surface p-5">
            <h2 className="font-semibold text-sm mb-3">Quick Access</h2>
            <div className="space-y-1">
              {[
                { icon: BarChart3, label: "Markets & Stocks", to: "/stocks" },
                { icon: Trophy, label: "Leaderboard", to: "/leaderboard" },
                { icon: Flame, label: "Research Feed", to: "/feed" },
                { icon: Zap, label: "Wallet & Credits", to: "/wallet" },
                { icon: Bell, label: "Notifications", to: "/notifications" },
              ].map(({ icon: Icon, label, to }) => (
                <Link
                  key={to}
                  to={to}
                  className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-secondary text-sm text-muted-foreground hover:text-foreground transition-colors group"
                >
                  <Icon className="w-3.5 h-3.5 shrink-0 group-hover:text-primary transition-colors" />
                  {label}
                  <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* ── Become an Analyst CTA — Figma navy/gold ── */}
      <div className="rounded-2xl p-7 relative overflow-hidden mt-7" style={{ background: "linear-gradient(135deg, #0d1f3c 0%, #1a3060 60%, #1e3a6e 100%)" }}>
        <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(201,150,19,0.18) 0%, transparent 65%)", transform: "translate(25%, 35%)" }} />
        <div className="absolute top-4 right-6 text-4xl select-none">📈</div>
        <div className="relative z-10 max-w-sm">
          <span className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: "hsl(var(--accent))" }}>Have a market view?</span>
          <h3 className="text-xl font-extrabold text-white mt-1.5 mb-2">Become a Researcher</h3>
          <p className="text-white/55 text-sm leading-relaxed mb-5">
            Publish research, build a verified track record, and monetize your insights on the platform.
          </p>
          <div className="flex gap-3">
            <Link to="/become-analyst">
              <button className="px-5 py-2.5 rounded-xl font-bold text-sm transition-all hover:opacity-90 hover:-translate-y-0.5 hover:shadow-lg" style={{ background: "linear-gradient(135deg, hsl(var(--accent)), hsl(var(--accent) / 0.8))", color: "#0d1f3c" }}>
                Get Started Free
              </button>
            </Link>
            <Link to="/leaderboard">
              <button className="px-5 py-2.5 rounded-xl font-bold text-sm border border-white/20 text-white/70 hover:text-white hover:border-white/40 transition-all">
                View Top Researchers
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
