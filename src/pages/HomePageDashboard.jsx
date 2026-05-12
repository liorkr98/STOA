import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import InvestorHome from "@/pages/InvestorHome";
import {
  PenLine, Star, TrendingUp, TrendingDown, RefreshCw, Trophy,
  ArrowRight, FileText, Clock, Flame, Users, BarChart3,
  ChevronRight, Loader2, Target, Zap, Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAnalystSlug } from "@/lib/analystSlug";
import { computeAvgYield, formatYield } from "@/lib/yieldCalc";

const WATCHLIST_KEY = "stoa_watchlist";

// ── helpers ──────────────────────────────────────────────────────────────────
async function fetchQuotes(symbols) {
  if (!symbols.length) return [];
  const r = await base44.functions.invoke("proxyFetch", {
    url: `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols.join(","))}&formatted=false`,
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  return (r.data?.quoteResponse?.result || []).map(q => ({
    symbol: q.symbol,
    price: q.regularMarketPrice,
    change: q.regularMarketChangePercent,
  }));
}

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function directionColor(d) {
  if (d === "LONG" || d === "Long") return "text-green-600 bg-green-50 border-green-200";
  if (d === "SHORT" || d === "Short") return "text-red-600 bg-red-50 border-red-200";
  return "text-muted-foreground bg-secondary border-border";
}

// ── sub-components ────────────────────────────────────────────────────────────
function StatChip({ label, value, color = "text-foreground", to }) {
  const inner = (
    <div className="flex flex-col items-center px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/70 transition-colors cursor-default">
      <span className={`text-lg font-extrabold leading-none ${color}`}>{value}</span>
      <span className="text-[10px] text-muted-foreground mt-0.5 font-medium">{label}</span>
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
          {report.stock_ticker && (
            <span className="text-[10px] font-mono font-bold text-primary/80">{report.stock_ticker}</span>
          )}
          <span className="text-[11px] text-muted-foreground ml-auto">{timeAgo(report.created_date)}</span>
        </div>
      </div>
    </button>
  );
}

function AnalystRow({ analyst, rank, allReports, followedEmails, onFollow, currentUserEmail }) {
  const navigate = useNavigate();
  const name = analyst.full_name || analyst.email?.split("@")[0] || "Analyst";
  const acc = analyst.accuracy_score || 0;
  const isFollowing = followedEmails.includes(analyst.email);
  const computed = (() => {
    const resolved = (allReports || []).filter(r =>
      r.created_by === analyst.email &&
      r.prediction_outcome && r.prediction_outcome !== "pending"
    );
    return computeAvgYield(resolved);
  })();
  const MEDALS = { 1: "🥇", 2: "🥈", 3: "🥉" };

  return (
    <div
      className="flex items-center gap-2.5 py-2 hover:bg-secondary/50 rounded-lg px-1 transition-colors cursor-pointer group"
      onClick={() => navigate(`/analyst/${getAnalystSlug(analyst)}`)}
    >
      <span className="text-xs font-bold w-5 text-center shrink-0 text-muted-foreground">
        {MEDALS[rank] || rank}
      </span>
      <div className="w-8 h-8 rounded-full bg-primary/10 border border-border flex items-center justify-center text-xs font-bold text-primary shrink-0 overflow-hidden">
        {analyst.picture
          ? <img src={analyst.picture} alt={name} className="w-full h-full object-cover" />
          : name[0]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate group-hover:text-primary transition-colors">{name}</p>
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] font-bold ${acc >= 75 ? "text-green-600" : acc >= 55 ? "text-amber-600" : "text-red-500"}`}>
            {acc.toFixed(1)}%
          </span>
          {computed != null && (
            <span className={`text-[10px] font-semibold ${computed >= 0 ? "text-green-600" : "text-red-500"}`}>
              {computed >= 0 ? "+" : ""}{computed.toFixed(1)}% yield
            </span>
          )}
        </div>
      </div>
      {currentUserEmail && currentUserEmail !== analyst.email && (
        <button
          onClick={e => { e.stopPropagation(); onFollow(analyst); }}
          className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-all shrink-0 ${
            isFollowing
              ? "border-green-300 text-green-600 bg-green-50"
              : "border-primary/30 text-primary hover:bg-primary/5"
          }`}
        >
          {isFollowing ? "✓" : "Follow"}
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
        {report.stock_ticker && (
          <p className="text-[10px] font-mono font-bold text-primary/70">{report.stock_ticker}</p>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {isResolved && (
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isHit ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
            {isHit ? "HIT" : "MISS"}
          </span>
        )}
        <span className="text-[10px] text-muted-foreground">♥ {report.likes || 0}</span>
      </div>
    </button>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────
export default function HomePageDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Investors see the consumer home; analysts/admins see the creator dashboard
  const isAnalyst = user?.role === "analyst" || user?.role === "admin";
  if (user && !isAnalyst) return <InvestorHome />;

  // left column
  const [drafts, setDrafts] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [watchData, setWatchData] = useState([]);
  const [wlLoading, setWlLoading] = useState(false);
  const [followedReports, setFollowedReports] = useState([]);
  const [myStats, setMyStats] = useState(null);

  // right column
  const [topAnalysts, setTopAnalysts] = useState([]);
  const [allReports, setAllReports] = useState([]);
  const [trendingPredictions, setTrendingPredictions] = useState([]);
  const [trendingTickers, setTrendingTickers] = useState([]);
  const [trendingSectors, setTrendingSectors] = useState([]);
  const [followedEmails, setFollowedEmails] = useState([]);

  const [loading, setLoading] = useState(true);

  // load watchlist from localStorage
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
        const [myReports, allPub, users, follows] = await Promise.all([
          base44.entities.Report.filter({ created_by: email }, "-updated_date", 10).catch(() => []),
          base44.entities.Report.filter({ status: "published" }, "-likes", 100).catch(() => []),
          base44.entities.User.list("-accuracy_score", 15).catch(() => []),
          base44.entities.Follow.filter({ follower_email: email }, "-created_date", 100).catch(() => []),
        ]);

        // drafts
        setDrafts((myReports || []).filter(r => r.status !== "published").slice(0, 5));

        // my stats
        const myPub = (myReports || []).filter(r => r.status === "published");
        const me = users.find(u => u.email === email) || user;
        setMyStats({
          accuracy: me.accuracy_score || 0,
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

  const displayName = user?.full_name || user?.email?.split("@")[0] || "Analyst";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 pb-16">

      {/* ── Welcome header ── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">
          {greeting}, {displayName.split(" ")[0]}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">Here's your research intelligence overview.</p>
      </div>

      {/* ── Stat chips ── */}
      {myStats && (
        <div className="flex flex-wrap gap-2 mb-8">
          <StatChip
            label="Accuracy"
            value={myStats.accuracy > 0 ? `${myStats.accuracy.toFixed(1)}%` : "—"}
            color={myStats.accuracy >= 70 ? "text-green-600" : myStats.accuracy > 0 ? "text-amber-600" : "text-muted-foreground"}
            to="/analyst"
          />
          <StatChip label="Published" value={myStats.reports} to="/analyst" />
          <StatChip label="Followers" value={(myStats.followers).toLocaleString()} to="/analyst" />
          {myStats.yield != null && (
            <StatChip
              label="Avg Yield"
              value={formatYield(myStats.yield)}
              color={myStats.yield >= 0 ? "text-green-600" : "text-red-500"}
              to="/analyst"
            />
          )}
          <Link to="/editor">
            <div className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-white hover:bg-primary/90 transition-colors cursor-pointer">
              <PenLine className="w-3.5 h-3.5" />
              <span className="text-sm font-bold leading-none">Write</span>
            </div>
          </Link>
          <Link to="/analyst">
            <div className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-secondary transition-colors cursor-pointer">
              <span className="text-sm font-semibold leading-none text-foreground">View public profile →</span>
            </div>
          </Link>
        </div>
      )}

      {/* ── Two-column layout ── */}
      <div className="flex gap-6 items-start">

        {/* ═══ LEFT COLUMN ═══ */}
        <div className="flex-1 min-w-0 space-y-5">

          {/* My Drafts */}
          <section className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-sm flex items-center gap-2">
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

          {/* My Watchlist */}
          {watchlist.length > 0 && (
            <section className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-sm flex items-center gap-2">
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
                <p className="text-sm text-muted-foreground mb-1">You're not following anyone yet</p>
                <p className="text-xs text-muted-foreground/70 mb-3">Follow top analysts to see their latest calls here</p>
                <Button size="sm" variant="outline" onClick={() => navigate("/leaderboard")} className="text-xs">
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
                <Trophy className="w-4 h-4 text-amber-500" />
                Top Analysts
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
              <h2 className="font-semibold text-sm flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-500" />
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

          {/* Trending tickers + sectors */}
          <section className="bg-card border border-border rounded-2xl p-5">
            <h2 className="font-semibold text-sm flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              Market Activity
            </h2>

            {trendingTickers.length > 0 && (
              <>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Most Covered</p>
                <div className="flex flex-wrap gap-1.5 mb-4">
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
              </>
            )}

            {trendingSectors.length > 0 && (
              <>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Top Sectors</p>
                <div className="space-y-2">
                  {trendingSectors.map(({ name, pct }) => (
                    <div key={name}>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-foreground/80 truncate pr-2">{name}</span>
                        <span className="font-semibold shrink-0">{pct}%</span>
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

          {/* Quick nav */}
          <section className="bg-card border border-border rounded-2xl p-5">
            <h2 className="font-semibold text-sm mb-3">Quick Access</h2>
            <div className="space-y-1">
              {[
                { icon: BarChart3, label: "My Dashboard", to: "/dashboard" },
                { icon: Target, label: "My Predictions", to: "/predictions" },
                { icon: Users, label: "My Subscribers", to: "/subscribers" },
                { icon: Zap, label: "AI Credits & Wallet", to: "/wallet" },
                { icon: TrendingUp, label: "Full Research Feed", to: "/feed" },
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
    </div>
  );
}
