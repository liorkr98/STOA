import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { setMeta } from "@/lib/seo";
import {
  ArrowLeft, UserPlus, BarChart3, FileText, Star, Target, Users, Trophy,
  TrendingUp, Eye, Loader2, CheckCircle2, Share2, ExternalLink,
  Flame, Shield, Clock, ChevronRight, BookOpen, Award, Zap, Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import ReportCard from "@/components/feed/ReportCard";
import AccuracyBreakdown from "@/components/analyst/AccuracyBreakdown";
import PerformanceVsMarket from "@/components/analyst/PerformanceVsMarket";
import { getAnalystSlug } from "@/lib/analystSlug";
import { computeAvgYield, formatYield } from "@/lib/yieldCalc";
import { computeAnalystTier, computeAchievements } from "@/lib/analystTier";
import { computeScore } from "@/lib/scoringEngine";
import AccuracyTierBadge from "@/components/feed/AccuracyTierBadge";
import TierProgressBar from "@/components/analyst/TierProgressBar";

function getTimeframeBucket(tf) {
  if (!tf) return null;
  const t = tf.toLowerCase();
  if (t.includes("intraday") || t === "day" || t === "1 day") return "INTRADAY";
  if (t.includes("week") || t.includes("1 month") || t.includes("short")) return "SHORT";
  if (t.includes("3 month") || t.includes("6 month") || t.includes("medium")) return "MEDIUM";
  if (t.includes("year") || t.includes("long")) return "LONG";
  return null;
}

function OutcomeBadge({ outcome }) {
  if (!outcome || outcome === "pending") return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">ACTIVE</span>
  );
  if (outcome === "hit" || outcome === "near") return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200">HIT</span>
  );
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">MISS</span>
  );
}

function PredictionRow({ report }) {
  const isHit = report.prediction_outcome === "hit" || report.prediction_outcome === "near";
  const isMiss = report.prediction_outcome === "miss";
  const isPending = !report.prediction_outcome || report.prediction_outcome === "pending";
  const yld = report.prediction_yield;

  return (
    <div className="flex items-center gap-3 py-3 border-b border-border last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{report.title || "Untitled"}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {report.stock_ticker && (
            <span className="text-[11px] font-mono font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
              {report.stock_ticker}
            </span>
          )}
          {report.prediction_timeframe && (
            <span className="text-[11px] text-muted-foreground">{report.prediction_timeframe}</span>
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
        {yld != null && (
          <p className={`text-sm font-bold ${yld >= 0 ? "text-green-600" : "text-red-500"}`}>
            {yld >= 0 ? "+" : ""}{yld.toFixed(1)}%
          </p>
        )}
        <OutcomeBadge outcome={report.prediction_outcome} />
      </div>
    </div>
  );
}

function ReportMiniCard({ report }) {
  const directionColor = report.prediction_direction === "LONG"
    ? "text-green-600 bg-green-50 border-green-200"
    : report.prediction_direction === "SHORT"
    ? "text-red-600 bg-red-50 border-red-200"
    : "text-muted-foreground bg-secondary border-border";

  return (
    <Link to={`/report/${report.id}`} className="block group">
      <div className="border border-border rounded-xl p-4 hover:border-primary/30 hover:shadow-sm transition-all bg-card h-full">
        <div className="flex items-start justify-between gap-2 mb-2">
          {report.prediction_direction && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${directionColor}`}>
              {report.prediction_direction}
            </span>
          )}
          {report.prediction_outcome && report.prediction_outcome !== "pending" && (
            <OutcomeBadge outcome={report.prediction_outcome} />
          )}
        </div>
        <h4 className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors font-serif mb-2">
          {report.title || "Untitled Report"}
        </h4>
        {report.stock_ticker && (
          <p className="text-xs font-mono font-bold text-primary/80 mb-1">{report.stock_ticker}</p>
        )}
        <p className="text-[11px] text-muted-foreground">
          {report.created_date ? new Date(report.created_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}
        </p>
      </div>
    </Link>
  );
}

const TABS = ["Reports", "Track Record", "About"];

export default function AnalystProfilePage() {
  const navigate = useNavigate();
  const { username } = useParams();

  const [analyst, setAnalyst] = useState(null);
  const [myReports, setMyReports] = useState([]);
  const [twits, setTwits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);
  const [showAccModal, setShowAccModal] = useState(false);
  const [showYieldModal, setShowYieldModal] = useState(false);
  const [activeTab, setActiveTab] = useState("Reports");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const me = await base44.auth.me().catch(() => null);
        setCurrentUser(me || null);

        let userData = null;
        const allUsers = await base44.entities.User.list("-created_date", 200).catch(() => []);

        if (username) {
          userData = allUsers.find(u => getAnalystSlug(u) === username) || null;
          if (!userData) userData = allUsers.find(u => u.id === username || u.email === username) || null;
        } else if (me) {
          userData = me;
        }

        if (userData) {
          setAnalyst(userData);
          setMeta({
            title: `${userData.full_name || userData.email?.split("@")[0] || "Analyst"} — Analyst Profile`,
            description: `Prediction accuracy track record. Follow ${userData.full_name || "this analyst"} on STOA.`,
            image: userData.picture,
          });

          if (me && me.email !== userData.email) {
            const follows = await base44.entities.Follow.filter({ follower_email: me.email, analyst_email: userData.email }).catch(() => []);
            setFollowing(follows.length > 0);
            const subs = await base44.entities.Subscription.filter({ subscriber_email: me.email, analyst_email: userData.email, status: "active" }).catch(() => []);
            setIsSubscribed(subs.length > 0);
          }

          const reports = await base44.entities.Report.filter({ created_by: userData.email }, "-created_date", 20).catch(() => []);
          setMyReports(reports || []);

          const twitData = await base44.entities.Twit.filter({ author_id: userData.id }, "-created_date", 5).catch(() => []);
          setTwits(twitData || []);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [username]);

  const handleFollow = async () => {
    if (!currentUser || !analyst) return;
    setFollowLoading(true);
    try {
      if (following) {
        const follows = await base44.entities.Follow.filter({ follower_email: currentUser.email, analyst_email: analyst.email });
        for (const f of follows) await base44.entities.Follow.delete(f.id);
        await base44.entities.User.update(analyst.id, { followers_count: Math.max(0, (analyst.followers_count || 1) - 1) });
        setAnalyst(prev => ({ ...prev, followers_count: Math.max(0, (prev.followers_count || 1) - 1) }));
        setFollowing(false);
      } else {
        await base44.entities.Follow.create({
          follower_email: currentUser.email,
          analyst_email: analyst.email,
          analyst_name: analyst.full_name || analyst.email?.split("@")[0] || "Analyst",
          analyst_avatar: analyst.picture || "",
        });
        await base44.entities.User.update(analyst.id, { followers_count: (analyst.followers_count || 0) + 1 });
        setAnalyst(prev => ({ ...prev, followers_count: (prev.followers_count || 0) + 1 }));
        setFollowing(true);
      }
    } finally {
      setFollowLoading(false);
    }
  };

  const handleSubscribe = async () => {
    if (!currentUser || !analyst) return;
    await base44.entities.Subscription.create({
      subscriber_email: currentUser.email,
      analyst_email: analyst.email,
      analyst_name: analyst.full_name || analyst.email?.split("@")[0] || "Analyst",
      analyst_avatar: analyst.picture || analyst.profile_picture || "",
      status: "active",
      plan: "monthly",
    });
    setIsSubscribed(true);
    setShowSubModal(false);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  if (!analyst) return (
    <div className="max-w-3xl mx-auto px-4 py-12 text-center">
      <p className="text-muted-foreground">Analyst not found.</p>
      <Button onClick={() => navigate(-1)} variant="outline" className="mt-4 text-sm">Go Back</Button>
    </div>
  );

  const isOwnProfile = currentUser && analyst.id === currentUser.id;
  const displayName = analyst.full_name || analyst.email?.split("@")[0] || "Analyst";

  const resolvedReports = myReports.filter(r => r.prediction_outcome && r.prediction_outcome !== "pending");
  const hitCount = resolvedReports.filter(r => r.prediction_outcome === "hit" || r.prediction_outcome === "near").length;
  const computedYield = computeAvgYield(resolvedReports);
  const displayYield = formatYield(computedYield);
  const yieldColor = computedYield == null ? "text-muted-foreground" : computedYield >= 0 ? "text-green-600" : "text-red-500";

  // New scoring
  const scoring = computeScore(resolvedReports);

  const BUCKET_LABELS = { INTRADAY: "Intraday", SHORT: "Short-Term", MEDIUM: "Medium-Term", LONG: "Long-Term" };
  const bucketStats = { INTRADAY: { total: 0, hits: 0 }, SHORT: { total: 0, hits: 0 }, MEDIUM: { total: 0, hits: 0 }, LONG: { total: 0, hits: 0 } };
  resolvedReports.forEach(r => {
    const bucket = getTimeframeBucket(r.prediction_timeframe);
    if (!bucket) return;
    bucketStats[bucket].total++;
    if (r.prediction_outcome === "hit" || r.prediction_outcome === "near") bucketStats[bucket].hits++;
  });

  const tier = computeAnalystTier(analyst, myReports);
  const achievements = computeAchievements(analyst, myReports);
  const publishedReports = myReports.filter(r => r.status === "published");
  const activePredictions = myReports.filter(r => !r.prediction_outcome || r.prediction_outcome === "pending");

  return (
    <div className="min-h-screen bg-background">
      {/* Hero banner */}
      <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 h-36">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(255,255,255,0.05) 40px, rgba(255,255,255,0.05) 41px), repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(255,255,255,0.05) 40px, rgba(255,255,255,0.05) 41px)"
        }} />
        <div className="max-w-4xl mx-auto px-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-white/60 hover:text-white/90 transition-colors pt-4"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4">
        {/* Profile header — overlaps hero */}
        <div className="relative -mt-12 mb-6">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="flex items-end gap-4 mb-5">
              {/* Avatar */}
              <div className="shrink-0 -mt-10 ring-4 ring-background rounded-full">
                {analyst.picture
                  ? <img src={analyst.picture} alt={displayName} className="w-20 h-20 rounded-full object-cover border border-border" />
                  : <div className="w-20 h-20 rounded-full bg-primary/10 border border-border flex items-center justify-center text-3xl font-bold text-primary">
                      {displayName?.[0] || "A"}
                    </div>
                }
              </div>

              {/* Name + badges */}
              <div className="flex-1 min-w-0 pb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold">{displayName}</h1>
                  {tier && (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: tier.bg, color: tier.color, border: `1px solid ${tier.border}` }}>
                      {tier.icon} {tier.label}
                    </span>
                  )}
                  {activePredictions.length > 0 && (
                    <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      {activePredictions.length} active call{activePredictions.length > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                {analyst.tagline && <p className="text-sm text-muted-foreground mt-1">{analyst.tagline}</p>}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleShare}
                  className="p-2 rounded-lg border border-border hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                  title="Copy profile link"
                >
                  {copied ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Share2 className="w-4 h-4" />}
                </button>
                {!isOwnProfile && currentUser && (
                  <>
                    <Button
                      size="sm"
                      variant={following ? "secondary" : "outline"}
                      className={`gap-1.5 text-xs ${following ? "text-green-600 border-green-200" : ""}`}
                      onClick={handleFollow}
                      disabled={followLoading}
                    >
                      {followLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : following ? <CheckCircle2 className="w-3 h-3" /> : <UserPlus className="w-3 h-3" />}
                      {following ? "Following" : "Follow"}
                    </Button>
                    {isSubscribed ? (
                      <span className="text-xs font-semibold text-green-600 bg-green-50 border border-green-200 rounded-full px-3 py-1.5">
                        Subscribed
                      </span>
                    ) : (
                      <Button size="sm" onClick={() => setShowSubModal(true)} className="text-xs">
                        Subscribe
                      </Button>
                    )}
                  </>
                )}
                {isOwnProfile && (
                  <Link to="/subscribers">
                    <Button size="sm" variant="outline" className="text-xs gap-1.5">
                      <Users className="w-3.5 h-3.5" /> Subscribers
                    </Button>
                  </Link>
                )}
              </div>
            </div>

            {/* Specialties */}
            {(analyst.specialties || []).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-5">
                {(analyst.specialties || []).map(s => (
                  <span key={s} className="text-xs px-2.5 py-1 rounded-full bg-primary/8 text-primary border border-primary/15 font-medium">{s}</span>
                ))}
              </div>
            )}

            {/* Key metrics strip */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">

              {/* Composite score — hero metric */}
              <button
                onClick={scoring.total > 0 ? () => setShowAccModal(true) : undefined}
                className={`text-center p-4 rounded-xl bg-primary/5 border border-primary/10 ${scoring.total > 0 ? "hover:bg-primary/10 cursor-pointer" : "cursor-default"} transition-all`}
              >
                <p className="text-2xl font-extrabold text-primary leading-none mb-1">
                  {scoring.total >= 5 ? scoring.score : "—"}
                </p>
                <p className="text-[11px] text-muted-foreground font-medium">Score</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                  {scoring.total > 0 ? `${scoring.total} calls` : "No calls yet"}
                </p>
              </button>

              {/* Win Rate (Wilson-adjusted) */}
              <div className="text-center p-4 rounded-xl bg-secondary cursor-default">
                <p className={`text-2xl font-extrabold leading-none mb-1 ${
                  scoring.rawWR == null ? "text-muted-foreground"
                  : scoring.rawWR >= 0.6 ? "text-green-600"
                  : scoring.rawWR >= 0.45 ? "text-amber-600"
                  : "text-red-500"
                }`}>
                  {scoring.rawWR != null ? `${(scoring.rawWR * 100).toFixed(1)}%` : "—"}
                </p>
                <p className="text-[11px] text-muted-foreground font-medium">Win Rate</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                  {scoring.total > 0 ? `${hitCount}W · ${scoring.misses}L` : ""}
                </p>
              </div>

              {/* Profit Factor */}
              <div className="text-center p-4 rounded-xl bg-secondary cursor-default">
                <p className={`text-2xl font-extrabold leading-none mb-1 ${
                  scoring.profitFactor == null ? "text-muted-foreground"
                  : scoring.profitFactor >= 2 ? "text-green-600"
                  : scoring.profitFactor >= 1 ? "text-amber-600"
                  : "text-red-500"
                }`}>
                  {scoring.profitFactor != null ? `${scoring.profitFactor.toFixed(2)}x` : "—"}
                </p>
                <p className="text-[11px] text-muted-foreground font-medium">Profit Factor</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">avg win / avg loss</p>
              </div>

              {/* Avg Return per call */}
              <div className="text-center p-4 rounded-xl bg-secondary cursor-default">
                <p className={`text-2xl font-extrabold leading-none mb-1 ${
                  scoring.avgReturn == null ? "text-muted-foreground"
                  : scoring.avgReturn >= 0 ? "text-green-600"
                  : "text-red-500"
                }`}>
                  {scoring.avgReturn != null
                    ? `${scoring.avgReturn >= 0 ? "+" : ""}${scoring.avgReturn.toFixed(1)}%`
                    : "—"}
                </p>
                <p className="text-[11px] text-muted-foreground font-medium">Avg Return</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">per call</p>
              </div>

              {/* Followers */}
              <div className="text-center p-4 rounded-xl bg-secondary cursor-default">
                <p className="text-2xl font-extrabold text-foreground leading-none mb-1">
                  {(analyst.followers_count || 0).toLocaleString()}
                </p>
                <p className="text-[11px] text-muted-foreground font-medium">Followers</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">{publishedReports.length} reports</p>
              </div>
            </div>

            {/* Score breakdown row — only if enough calls */}
            {scoring.total >= 5 && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Score breakdown</p>
                <div className="flex gap-4 flex-wrap">
                  {[
                    { label: "Win Rate component", value: scoring._winRateScore, color: "#2563eb" },
                    { label: "Profit Factor component", value: scoring._pfScore, color: "#16a34a" },
                    scoring._alphaScore != null && { label: "Alpha component", value: scoring._alphaScore, color: "#d97706" },
                  ].filter(Boolean).map(item => (
                    <div key={item.label} className="flex-1 min-w-[100px]">
                      <div className="flex justify-between text-[10px] mb-1">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className="font-bold" style={{ color: item.color }}>{item.value}</span>
                      </div>
                      <div className="h-1 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${item.value}%`, background: item.color }} />
                      </div>
                    </div>
                  ))}
                </div>
                {scoring._alphaScore == null && (
                  <p className="text-[10px] text-muted-foreground/60 mt-1.5">
                    Alpha vs benchmark will appear once 5+ calls have benchmark data recorded at resolution.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-border mb-6">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-all ${
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab: Reports */}
        {activeTab === "Reports" && (
          <div className="pb-12">
            {twits.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-4 mb-5">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Quick Notes</h3>
                <div className="space-y-3">
                  {twits.map(t => (
                    <div key={t.id} className="flex gap-3">
                      {analyst.picture
                        ? <img src={analyst.picture} alt="" className="w-7 h-7 rounded-full flex-shrink-0 object-cover" />
                        : <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">{displayName?.[0]}</div>
                      }
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-semibold">{displayName}</span>
                          <span className="text-[10px] text-muted-foreground">{new Date(t.created_date).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm text-foreground/90">{t.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {publishedReports.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-border rounded-xl text-muted-foreground">
                <FileText className="w-8 h-8 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No published reports yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {publishedReports.map(r => <ReportMiniCard key={r.id} report={r} />)}
              </div>
            )}
          </div>
        )}

        {/* Tab: Track Record */}
        {activeTab === "Track Record" && (
          <div className="pb-12 space-y-5">
            {/* Timeframe breakdown */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold mb-4">Accuracy by Timeframe</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(bucketStats).map(([key, stats]) => (
                  <div key={key} className="text-center p-4 bg-secondary rounded-xl">
                    <p className="text-[11px] text-muted-foreground mb-1">{BUCKET_LABELS[key]}</p>
                    {stats.total > 0 ? (
                      <>
                        <p className="text-xl font-bold text-foreground">{Math.round((stats.hits / stats.total) * 100)}%</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{stats.hits}/{stats.total}</p>
                      </>
                    ) : (
                      <p className="text-xl font-bold text-muted-foreground/30">—</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Charts */}
            <AccuracyBreakdown analystUser={analyst} />
            <PerformanceVsMarket analyst={analyst} />

            {/* Prediction list */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold mb-1">All Predictions</h3>
              <p className="text-xs text-muted-foreground mb-4">{resolvedReports.length} resolved · {activePredictions.length} active</p>
              {myReports.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No predictions yet.</p>
              ) : (
                <div>
                  {myReports.filter(r => r.prediction_direction || r.stock_ticker).map(r => (
                    <PredictionRow key={r.id} report={r} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab: About */}
        {activeTab === "About" && (
          <div className="pb-12 space-y-5">
            {/* Bio */}
            {analyst.bio && (
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-sm font-semibold mb-3">About</h3>
                <p className="text-sm text-foreground/80 leading-relaxed">{analyst.bio}</p>
              </div>
            )}

            {/* Tier progress (own profile) */}
            {isOwnProfile && <TierProgressBar user={analyst} allReports={myReports} />}

            {/* Achievements */}
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">Achievements</h3>
                <span className="text-xs text-muted-foreground">{achievements.filter(a => a.earned).length}/{achievements.length} unlocked</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[...achievements.filter(a => a.earned), ...achievements.filter(a => !a.earned)].map(a => (
                  <div
                    key={a.name}
                    className="flex items-start gap-3 p-3 rounded-xl border transition-all"
                    style={{
                      background: a.earned ? "#fefce8" : "#f8fafc",
                      borderColor: a.earned ? "#fde68a" : "#e2e8f0",
                      opacity: a.earned ? 1 : 0.4,
                      filter: a.earned ? "none" : "grayscale(1)",
                    }}
                    title={a.earned ? a.desc : `Locked: ${a.desc}`}
                  >
                    <span className="text-2xl leading-none shrink-0">{a.icon}</span>
                    <div>
                      <p className="text-xs font-bold text-foreground leading-tight">{a.name}</p>
                      <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{a.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Owner: manage */}
            {isOwnProfile && (
              <Link to="/subscribers" className="flex items-center justify-between p-4 bg-purple-50 border border-purple-200 rounded-xl hover:border-purple-400 transition-colors">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="text-sm font-bold text-purple-700">Subscribers & Following</p>
                    <p className="text-xs text-muted-foreground">Manage your audience</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-purple-500" />
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Accuracy Modal */}
      {showAccModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAccModal(false)}>
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-base mb-1">Analyst Score</h3>
            <p className="text-5xl font-extrabold text-primary mb-1">{scoring.score}</p>
            <p className="text-xs text-muted-foreground mb-5">out of 100 · {scoring.total} resolved predictions</p>

            <div className="space-y-3 mb-5">
              {[
                { label: "Win Rate", value: scoring.rawWR != null ? `${(scoring.rawWR * 100).toFixed(1)}%` : "—", sub: `${hitCount} wins · ${scoring.misses} losses`, color: "#2563eb", bar: scoring._winRateScore },
                { label: "Profit Factor", value: scoring.profitFactor != null ? `${scoring.profitFactor.toFixed(2)}x` : "—", sub: `avg win ${scoring.avgWin != null ? `+${scoring.avgWin.toFixed(1)}%` : "—"} · avg loss ${scoring.avgLoss != null ? `-${scoring.avgLoss.toFixed(1)}%` : "—"}`, color: "#16a34a", bar: scoring._pfScore },
                scoring._alphaScore != null && { label: "Alpha vs S&P 500", value: scoring.avgAlpha != null ? `${scoring.avgAlpha >= 0 ? "+" : ""}${scoring.avgAlpha.toFixed(1)}%` : "—", sub: "excess return vs benchmark", color: "#d97706", bar: scoring._alphaScore },
              ].filter(Boolean).map(item => (
                <div key={item.label}>
                  <div className="flex justify-between mb-1">
                    <div>
                      <span className="text-sm font-semibold">{item.label}</span>
                      <p className="text-[10px] text-muted-foreground">{item.sub}</p>
                    </div>
                    <span className="text-sm font-bold" style={{ color: item.color }}>{item.value}</span>
                  </div>
                  {item.bar != null && (
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${item.bar}%`, background: item.color }} />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <p className="text-[11px] text-muted-foreground mb-4 leading-relaxed">
              Score = Wilson-adjusted Win Rate (52%) + Profit Factor (48%). Alpha component adds when benchmark data is available. Sample-size adjusted — more calls = more reliable score.
            </p>
            <button onClick={() => setShowAccModal(false)} className="w-full text-sm text-muted-foreground hover:text-foreground">Close</button>
          </div>
        </div>
      )}

      {/* Yield Modal */}
      {showYieldModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowYieldModal(false)}>
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-base mb-1">Average Yield</h3>
            <p className={`text-4xl font-extrabold mb-4 ${yieldColor}`}>{displayYield}</p>
            <p className="text-sm text-muted-foreground">Average return across {resolvedReports.length} resolved prediction{resolvedReports.length !== 1 ? "s" : ""}.</p>
            <button onClick={() => setShowYieldModal(false)} className="w-full text-sm text-muted-foreground hover:text-foreground mt-4">Close</button>
          </div>
        </div>
      )}

      {/* Subscribe Modal */}
      {showSubModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowSubModal(false)}>
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-1">Subscribe to {displayName}</h3>
            <p className="text-sm text-muted-foreground mb-5">
              {analyst.accuracy_score > 0 ? `${analyst.accuracy_score.toFixed(1)}% prediction accuracy · ` : ""}
              {publishedReports.length} published report{publishedReports.length !== 1 ? "s" : ""}
            </p>
            <button
              onClick={handleSubscribe}
              className="w-full text-left border border-border rounded-xl p-4 hover:border-primary/40 transition-all mb-3"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">Monthly Access</span>
                <span className="font-bold text-primary text-sm">Free (Beta)</span>
              </div>
              <ul className="space-y-1.5">
                {["Full access to all reports", "Premium predictions & targets", "Direct analyst updates", "Track record transparency"].map(b => (
                  <li key={b} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" /> {b}
                  </li>
                ))}
              </ul>
            </button>
            <button onClick={() => setShowSubModal(false)} className="w-full text-sm text-muted-foreground hover:text-foreground">Maybe later</button>
          </div>
        </div>
      )}
    </div>
  );
}
