import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import {
  Star, TrendingUp, TrendingDown, RefreshCw, Trophy, Sparkles,
  ArrowRight, Flame, Users, BarChart3, ChevronRight, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAnalystSlug } from "@/lib/analystSlug";
import { computeAvgYield } from "@/lib/yieldCalc";

const WATCHLIST_KEY = "stoa_watchlist";

async function fetchQuotes(symbols) {
  if (!symbols.length) return [];
  const r = await base44.functions.invoke("proxyFetch", {
    url: `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols.join(","))}&formatted=false`,
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  return (r.data?.quoteResponse?.result || []).map(q => ({
    symbol:    q.symbol,
    price:     q.regularMarketPrice,
    change:    q.regularMarketChangePercent,
  }));
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
  if (d === "LONG" || d === "Long") return "text-green-600 bg-green-50 border-green-200";
  if (d === "SHORT" || d === "Short") return "text-red-600 bg-red-50 border-red-200";
  return "text-muted-foreground bg-secondary border-border";
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function WatchItem({ entry, live }) {
  const isUp = (live?.change ?? 0) >= 0;
  return (
    <Link
      to={`/stock?ticker=${entry.symbol}`}
      className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-secondary/50 transition-colors group"
    >
      <span className="text-xs font-mono font-bold group-hover:text-primary transition-colors">{entry.symbol}</span>
      {live?.price != null ? (
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold tabular-nums">${live.price.toFixed(2)}</span>
          <span className={`text-[11px] font-semibold flex items-center gap-0.5 ${isUp ? "text-green-600" : "text-red-500"}`}>
            {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {isUp ? "+" : ""}{live.change?.toFixed(2)}%
          </span>
        </div>
      ) : (
        <span className="text-[11px] text-muted-foreground">—</span>
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
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 mt-0.5 ${directionColor(dir)}`}>
          {dir}
        </span>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {report.title || "Untitled"}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[11px] text-muted-foreground">{report.author_name || report.created_by?.split("@")[0]}</span>
          {report.stock_ticker && <span className="text-[10px] font-mono font-bold text-primary/80">{report.stock_ticker}</span>}
          <span className="text-[11px] text-muted-foreground ml-auto">{timeAgo(report.created_date)}</span>
        </div>
      </div>
    </button>
  );
}

function AnalystRow({ analyst, rank, followedEmails, onFollow, currentUserEmail }) {
  const navigate = useNavigate();
  const name  = analyst.full_name || analyst.email?.split("@")[0] || "Analyst";
  const acc   = analyst.accuracy_score || 0;
  const following = followedEmails.includes(analyst.email);
  const MEDALS = { 1: "🥇", 2: "🥈", 3: "🥉" };

  return (
    <div
      className="flex items-center gap-2.5 py-2 hover:bg-secondary/50 rounded-lg px-1 transition-colors cursor-pointer group"
      onClick={() => navigate(`/analyst/${getAnalystSlug(analyst)}`)}
    >
      <span className="text-xs font-bold w-5 text-center shrink-0 text-muted-foreground">{MEDALS[rank] || rank}</span>
      <div className="w-8 h-8 rounded-full bg-primary/10 border border-border flex items-center justify-center text-xs font-bold text-primary shrink-0 overflow-hidden">
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
          className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-all shrink-0 ${
            following
              ? "border-green-300 text-green-600 bg-green-50"
              : "border-primary/30 text-primary hover:bg-primary/5"
          }`}
        >
          {following ? "✓" : "Follow"}
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
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${directionColor(dir)}`}>
          {dir}
        </span>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate group-hover:text-primary transition-colors">{report.title}</p>
        {report.stock_ticker && <p className="text-[10px] font-mono font-bold text-primary/70">{report.stock_ticker}</p>}
      </div>
      {isResolved && (
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${isHit ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
          {isHit ? "HIT" : "MISS"}
        </span>
      )}
    </button>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function InvestorHome() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [watchlist,         setWatchlist]         = useState([]);
  const [watchData,         setWatchData]         = useState([]);
  const [wlLoading,         setWlLoading]         = useState(false);
  const [followedReports,   setFollowedReports]   = useState([]);
  const [followedEmails,    setFollowedEmails]    = useState([]);
  const [topAnalysts,       setTopAnalysts]       = useState([]);
  const [trendingPredictions, setTrendingPredictions] = useState([]);
  const [trendingTickers,   setTrendingTickers]   = useState([]);
  const [loading,           setLoading]           = useState(true);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(WATCHLIST_KEY) || "[]");
      setWatchlist(stored);
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

  useEffect(() => {
    if (!user) return;
    const email = user.email;
    const load = async () => {
      try {
        const [allPub, users, follows] = await Promise.all([
          base44.entities.Report.filter({ status: "published" }, "-likes", 100).catch(() => []),
          base44.entities.User.list("-accuracy_score", 15).catch(() => []),
          base44.entities.Follow.filter({ follower_email: email }, "-created_date", 100).catch(() => []),
        ]);

        setTopAnalysts((users || []).filter(u => u.accuracy_score > 0 && u.email !== email).slice(0, 7));

        const fEmails = (follows || []).map(f => f.analyst_email);
        setFollowedEmails(fEmails);

        const followedPub = (allPub || []).filter(r => fEmails.includes(r.created_by)).slice(0, 6);
        setFollowedReports(followedPub);

        const withDir = (allPub || []).filter(r => r.prediction_direction || r.prediction_action);
        setTrendingPredictions(withDir.slice(0, 6));

        const tickerCount = {};
        (allPub || []).forEach(r => {
          if (r.stock_ticker) tickerCount[r.stock_ticker] = (tickerCount[r.stock_ticker] || 0) + 1;
        });
        setTrendingTickers(Object.entries(tickerCount).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([t]) => t));
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
          follower_email: user.email,
          analyst_email:  analyst.email,
          analyst_name:   analyst.full_name || analyst.email?.split("@")[0],
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

  const displayName = user?.full_name || user?.email?.split("@")[0] || "Investor";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 pb-16">

      {/* Welcome */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">
          {greeting}, {displayName.split(" ")[0]}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">Your daily research overview.</p>
      </div>

      <div className="flex gap-6 items-start">

        {/* ═══ LEFT COLUMN ═══ */}
        <div className="flex-1 min-w-0 space-y-5">

          {/* Become Analyst CTA — big, hard to miss */}
          <Link to="/become-analyst" className="block group">
            <div className="relative overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-amber-50 to-orange-50 p-6 hover:border-amber-300 hover:shadow-md transition-all">
              <div className="absolute top-3 right-3 opacity-10 text-7xl select-none">📈</div>
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-200 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-amber-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold uppercase tracking-widest text-amber-700 mb-0.5">Have a market view?</p>
                  <h2 className="text-lg font-extrabold text-amber-900">Become an Analyst</h2>
                  <p className="text-xs text-amber-800 mt-0.5">
                    Publish research, build a verified track record, and monetize your insights.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4 text-xs text-amber-700">
                <span className="bg-amber-200/60 rounded-full px-2 py-0.5 font-semibold">Free</span>
                <span>·</span>
                <span>3 quick steps</span>
                <span className="ml-auto font-bold flex items-center gap-1 group-hover:gap-2 transition-all">
                  Get started <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </Link>

          {/* My Watchlist */}
          <section className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-sm flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                My Watchlist
                {watchlist.length > 0 && <span className="text-xs text-muted-foreground">({watchlist.length})</span>}
              </h2>
              <div className="flex items-center gap-3">
                <button onClick={refreshWatchlist} disabled={wlLoading} className="text-muted-foreground hover:text-foreground">
                  <RefreshCw className={`w-3.5 h-3.5 ${wlLoading ? "animate-spin" : ""}`} />
                </button>
                <Link to="/stocks" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                  Manage <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
            {watchlist.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-border rounded-xl">
                <Star className="w-7 h-7 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-3">Track stocks you care about</p>
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

          {/* From analysts you follow */}
          <section className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                From Analysts You Follow
              </h2>
              <Link to="/feed" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                Full feed <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {followedReports.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-border rounded-xl">
                <Users className="w-7 h-7 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-1">Follow analysts to see their latest calls</p>
                <Button size="sm" variant="outline" onClick={() => navigate("/leaderboard")} className="text-xs mt-2">
                  Discover Analysts
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {followedReports.map(r => <FollowedReportCard key={r.id} report={r} />)}
              </div>
            )}
          </section>
        </div>

        {/* ═══ RIGHT COLUMN ═══ */}
        <div className="hidden lg:flex flex-col gap-5 w-72 flex-shrink-0">

          {/* Top Analysts */}
          <section className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-sm flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" /> Top Analysts
              </h2>
              <Link to="/leaderboard" className="text-xs text-primary hover:underline">See all</Link>
            </div>
            <div className="space-y-0.5">
              {topAnalysts.map((analyst, i) => (
                <AnalystRow
                  key={analyst.id}
                  analyst={analyst}
                  rank={i + 1}
                  followedEmails={followedEmails}
                  onFollow={handleFollow}
                  currentUserEmail={user?.email}
                />
              ))}
            </div>
          </section>

          {/* Hot Predictions */}
          <section className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-sm flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-500" /> Hot Predictions
              </h2>
              <Link to="/feed" className="text-xs text-primary hover:underline">More</Link>
            </div>
            <div className="space-y-0.5">
              {trendingPredictions.map(r => <TrendingPredictionCard key={r.id} report={r} />)}
            </div>
          </section>

          {/* Trending tickers */}
          {trendingTickers.length > 0 && (
            <section className="bg-card border border-border rounded-2xl p-5">
              <h2 className="font-semibold text-sm flex items-center gap-2 mb-3">
                <BarChart3 className="w-4 h-4 text-muted-foreground" /> Most Covered
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {trendingTickers.map(t => (
                  <button
                    key={t}
                    onClick={() => navigate(`/stock?ticker=${t}`)}
                    className="text-[11px] font-mono font-bold px-2 py-1 rounded-lg bg-secondary hover:bg-primary/10 hover:text-primary border border-border transition-all"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
