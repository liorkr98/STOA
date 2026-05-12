import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { setMeta, injectJsonLd } from "@/lib/seo";
import {
  ArrowLeft, UserPlus, FileText, Users, TrendingUp,
  Loader2, CheckCircle2, Share2, ChevronRight, Award, Lock,
  Pencil, Eye, EyeOff, GripVertical, Globe, Twitter, Linkedin,
  MessageSquare, Save, X, Plus, Pin, Check,
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
import ShareModal from "@/components/profile/ShareModal";
import { CustomBlocksSection } from "@/components/profile/CustomBlocks";
import WalletConfirmDialog from "@/components/wallet/WalletConfirmDialog";
import { subscribeAnalyst } from "@/lib/walletService";
import { toast } from "sonner";

// ── Config helpers ────────────────────────────────────────────────────────────
const DEFAULT_CONFIG = {
  banner:         "slate",
  hidden_stats:   [],
  sections_order: ["Reports", "Track Record", "About"],
  pinned_reports: [],
  custom_blocks:  [],
};

const BANNER_THEMES = {
  slate:    { label: "Dark",       bg: "linear-gradient(135deg,#0f172a 0%,#1e293b 100%)",              dot: "#334155" },
  blue:     { label: "Navy",       bg: "linear-gradient(135deg,#0d1f3c 0%,#1e3a6e 100%)",              dot: "#2d5ba3" },
  navygold: { label: "Navy/Gold",  bg: "linear-gradient(135deg,#0d1f3c 0%,#1e3a6e 60%,#c99613 100%)", dot: "#c99613" },
  emerald:  { label: "Forest",     bg: "linear-gradient(135deg,#064e3b 0%,#059669 100%)",              dot: "#34d399" },
  purple:   { label: "Royal",      bg: "linear-gradient(135deg,#3b0764 0%,#7c3aed 100%)",              dot: "#a855f7" },
  rose:     { label: "Crimson",    bg: "linear-gradient(135deg,#881337 0%,#e11d48 100%)",              dot: "#fb7185" },
  amber:    { label: "Gold",       bg: "linear-gradient(135deg,#78350f 0%,#d97706 100%)",              dot: "#fbbf24" },
};

function parseConfig(analyst) {
  try { return { ...DEFAULT_CONFIG, ...JSON.parse(analyst?.profile_config || "{}") }; }
  catch { return { ...DEFAULT_CONFIG }; }
}

// ── Sub-components ────────────────────────────────────────────────────────────
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

function ReportMiniCard({ report, isPinned, isEditMode, onTogglePin }) {
  const directionColor = report.prediction_direction === "LONG"
    ? "text-green-600 bg-green-50 border-green-200"
    : report.prediction_direction === "SHORT"
    ? "text-red-600 bg-red-50 border-red-200"
    : "text-muted-foreground bg-secondary border-border";

  return (
    <div className="relative group">
      <Link to={`/report/${report.id}`} className="block">
        <div className={`border rounded-xl p-4 hover:border-primary/30 hover:shadow-sm transition-all bg-card h-full ${isPinned ? "border-amber-300 ring-1 ring-amber-200" : "border-border"}`}>
          {isPinned && (
            <span className="absolute -top-2 left-3 text-[9px] bg-amber-500 text-white px-2 py-0.5 rounded-full font-bold">
              📌 Pinned
            </span>
          )}
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
      {isEditMode && (
        <button
          onClick={e => { e.preventDefault(); e.stopPropagation(); onTogglePin(report.id); }}
          className={`absolute top-2 right-2 p-1.5 rounded-lg text-xs font-bold transition-all ${
            isPinned
              ? "bg-amber-100 text-amber-700 border border-amber-300"
              : "bg-card border border-border text-muted-foreground hover:text-amber-600 hover:border-amber-300 opacity-0 group-hover:opacity-100"
          }`}
          title={isPinned ? "Unpin" : "Pin to top"}
        >
          📌
        </button>
      )}
    </div>
  );
}

// ── Stat definitions ──────────────────────────────────────────────────────────
const ALL_STATS = [
  { key: "score",         label: "Score",         sub: s => `${s.total} calls`,                      bg: "bg-primary/5 border border-primary/10" },
  { key: "winRate",       label: "Win Rate",       sub: s => s.total > 0 ? `${s.hits}W · ${s.misses}L` : "",  bg: "bg-secondary" },
  { key: "profitFactor",  label: "Profit Factor",  sub: () => "avg win / avg loss",                   bg: "bg-secondary" },
  { key: "avgReturn",     label: "Avg Return",     sub: () => "per call",                             bg: "bg-secondary" },
  { key: "followers",     label: "Followers",      sub: (s, a) => `${(a.published || 0)} reports`,   bg: "bg-secondary" },
];

function StatCard({ statKey, scoring, analyst, publishedCount, isHidden, isEditMode, onToggle, onClick }) {
  const renderValue = () => {
    if (statKey === "score")
      return <span className="text-primary">{scoring.total >= 5 ? scoring.score : "—"}</span>;
    if (statKey === "winRate")
      return <span className={scoring.rawWR == null ? "text-muted-foreground" : scoring.rawWR >= 0.6 ? "text-green-600" : scoring.rawWR >= 0.45 ? "text-amber-600" : "text-red-500"}>
        {scoring.rawWR != null ? `${(scoring.rawWR * 100).toFixed(1)}%` : "—"}
      </span>;
    if (statKey === "profitFactor")
      return <span className={scoring.profitFactor == null ? "text-muted-foreground" : scoring.profitFactor >= 2 ? "text-green-600" : scoring.profitFactor >= 1 ? "text-amber-600" : "text-red-500"}>
        {scoring.profitFactor != null ? `${scoring.profitFactor.toFixed(2)}x` : "—"}
      </span>;
    if (statKey === "avgReturn")
      return <span className={scoring.avgReturn == null ? "text-muted-foreground" : scoring.avgReturn >= 0 ? "text-green-600" : "text-red-500"}>
        {scoring.avgReturn != null ? `${scoring.avgReturn >= 0 ? "+" : ""}${scoring.avgReturn.toFixed(1)}%` : "—"}
      </span>;
    if (statKey === "followers")
      return <span>{(analyst.followers_count || 0).toLocaleString()}</span>;
  };

  const def  = ALL_STATS.find(s => s.key === statKey);
  const subText = statKey === "followers"
    ? `${publishedCount} reports`
    : def?.sub(scoring, analyst) || "";

  if (isHidden && !isEditMode) return null;

  return (
    <div
      className={`relative text-center p-4 rounded-xl transition-all ${def?.bg || "bg-secondary"} ${
        isHidden ? "opacity-30" : ""
      } ${statKey === "score" && !isHidden && !isEditMode ? "cursor-pointer hover:bg-primary/10" : "cursor-default"}`}
      onClick={!isEditMode && statKey === "score" && !isHidden ? onClick : undefined}
    >
      {isEditMode && (
        <button
          onClick={e => { e.stopPropagation(); onToggle(statKey); }}
          className="absolute top-1.5 right-1.5 p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
        >
          {isHidden ? <EyeOff className="w-3.5 h-3.5 text-muted-foreground" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
      )}
      <p className="text-2xl font-extrabold leading-none mb-1">{renderValue()}</p>
      <p className="text-[11px] text-muted-foreground font-medium">{def?.label}</p>
      {subText && <p className="text-[10px] text-muted-foreground/60 mt-0.5">{subText}</p>}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AnalystProfilePage() {
  const navigate = useNavigate();
  const { username } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const [analyst,       setAnalyst]       = useState(null);
  const [myReports,     setMyReports]     = useState([]);
  const [twits,         setTwits]         = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [currentUser,   setCurrentUser]   = useState(null);
  const [following,     setFollowing]     = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [isSubscribed,  setIsSubscribed]  = useState(false);
  const [showSubModal,  setShowSubModal]  = useState(false);
  const [showAccModal,  setShowAccModal]  = useState(false);
  const [activeTab,       setActiveTab]       = useState("Reports");
  const [showShareModal,  setShowShareModal]  = useState(false);

  // Edit mode state
  const [isEditMode,  setIsEditMode]  = useState(false);
  const [editConfig,  setEditConfig]  = useState(DEFAULT_CONFIG);
  const [editBio,     setEditBio]     = useState("");
  const [editTagline, setEditTagline] = useState("");
  const [editSocial,  setEditSocial]  = useState({ twitter: "", linkedin: "", website: "" });
  const [editSpecialties, setEditSpecialties] = useState([]);
  const [newSpecialty,    setNewSpecialty]    = useState("");
  const [saving,      setSaving]      = useState(false);

  // Drag state for section reorder
  const dragIdx = useRef(null);

  // ── Load ──────────────────────────────────────────────────────────────────
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
          const displayName = userData.full_name || userData.email?.split("@")[0] || "Analyst";
          const tagline = userData.tagline || "Verified analyst on STOA";
          setMeta({
            title:       `${displayName} — Analyst Profile`,
            description: `${tagline}. ${userData.accuracy_score ? `${userData.accuracy_score.toFixed(1)}% prediction accuracy. ` : ""}Follow ${displayName}'s locked predictions on STOA.`,
            image:       userData.picture,
            type:        "profile",
          });
          // Person/Author JSON-LD — surfaces analyst as an author in Google
          injectJsonLd("ld-analyst", {
            "@context":    "https://schema.org",
            "@type":       "Person",
            name:          displayName,
            description:   userData.bio || tagline,
            image:         userData.picture,
            url:           window.location.href,
            knowsAbout:    userData.specialties || [],
            sameAs:        [
              userData.twitter_handle ? `https://x.com/${userData.twitter_handle}` : null,
              userData.linkedin_username ? `https://linkedin.com/in/${userData.linkedin_username}` : null,
              userData.website || null,
            ].filter(Boolean),
          });

          if (me && me.email !== userData.email) {
            const [follows, subs] = await Promise.all([
              base44.entities.Follow.filter({ follower_email: me.email, analyst_email: userData.email }).catch(() => []),
              base44.entities.Subscription.filter({ subscriber_email: me.email, analyst_email: userData.email, status: "active" }).catch(() => []),
            ]);
            setFollowing(follows.length > 0);
            setIsSubscribed(subs.length > 0);
          }

          const [reports, twitData] = await Promise.all([
            base44.entities.Report.filter({ created_by: userData.email }, "-created_date", 50).catch(() => []),
            base44.entities.Twit.filter({ author_id: userData.id }, "-created_date", 5).catch(() => []),
          ]);
          setMyReports(reports || []);
          setTwits(twitData || []);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [username]);

  // ── Follow ────────────────────────────────────────────────────────────────
  const handleFollow = async () => {
    if (!currentUser || !analyst) return;
    setFollowLoading(true);
    try {
      if (following) {
        const follows = await base44.entities.Follow.filter({ follower_email: currentUser.email, analyst_email: analyst.email });
        for (const f of follows) await base44.entities.Follow.delete(f.id);
        await base44.entities.User.update(analyst.id, { followers_count: Math.max(0, (analyst.followers_count || 1) - 1) });
        setAnalyst(p => ({ ...p, followers_count: Math.max(0, (p.followers_count || 1) - 1) }));
        setFollowing(false);
      } else {
        await base44.entities.Follow.create({
          follower_email: currentUser.email,
          analyst_email:  analyst.email,
          analyst_name:   analyst.full_name || analyst.email?.split("@")[0] || "Analyst",
          analyst_avatar: analyst.picture || "",
        });
        await base44.entities.User.update(analyst.id, { followers_count: (analyst.followers_count || 0) + 1 });
        setAnalyst(p => ({ ...p, followers_count: (p.followers_count || 0) + 1 }));
        setFollowing(true);
      }
    } finally {
      setFollowLoading(false);
    }
  };

  // ── Subscribe — paid via wallet (no PayPal popup, instant) ────────────────
  const SUBSCRIPTION_PRICE_USD = 9; // monthly; tweak per analyst pricing in future
  const handleSubscribe = async () => {
    if (!currentUser || !analyst) return;
    try {
      const result = await subscribeAnalyst({
        analystEmail:    analyst.email,
        analystName:     analyst.full_name || analyst.email?.split("@")[0] || "Analyst",
        monthlyPriceUSD: SUBSCRIPTION_PRICE_USD,
      });
      if (!result.ok && result.reason === "insufficient") {
        toast.error(`Need $${result.needed.toFixed(2)} more in wallet.`, {
          action: { label: "Top up", onClick: () => navigate("/pay?mode=deposit") },
          duration: 6000,
        });
        return;
      }
      setIsSubscribed(true);
      setShowSubModal(false);
      toast.success(`Subscribed to ${analyst.full_name || analyst.email.split("@")[0]}!`);
    } catch (err) {
      toast.error(err.message || "Subscription failed");
    }
  };

  // ── Share ─────────────────────────────────────────────────────────────────
  // Share button now opens a proper modal with copy + social options.
  // Old version silently failed in insecure contexts (no HTTPS, no permission).
  const openShare = () => setShowShareModal(true);

  // ── Edit mode ─────────────────────────────────────────────────────────────
  const enterEditMode = () => {
    const cfg = parseConfig(analyst);
    setEditConfig(cfg);
    setEditBio(analyst.bio || "");
    setEditTagline(analyst.tagline || "");
    setEditSocial({
      twitter:  analyst.twitter_handle   || "",
      linkedin: analyst.linkedin_username || "",
      website:  analyst.website          || "",
    });
    setEditSpecialties([...(analyst.specialties || [])]);
    setIsEditMode(true);
  };

  // Auto-enter edit mode when ?edit=1 in URL (from /branding, /edit-profile,
  // dropdown "Edit My Page", etc.). searchParams MUST be in deps — without it,
  // clicking the dropdown item while already on /analyst would no-op because
  // the component stays mounted and analyst/currentUser don't change.
  useEffect(() => {
    if (!analyst || !currentUser) return;
    const wantsEdit = searchParams.get("edit") === "1";
    if (wantsEdit && analyst.id === currentUser.id && !isEditMode) {
      enterEditMode();
      // Strip ?edit=1 from URL so refresh doesn't re-trigger
      searchParams.delete("edit");
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analyst, currentUser, searchParams]);

  const cancelEditMode = () => setIsEditMode(false);

  const saveChanges = async () => {
    if (!analyst || saving) return;
    setSaving(true);
    try {
      const updates = {
        profile_config:    JSON.stringify(editConfig),
        bio:               editBio,
        tagline:           editTagline,
        twitter_handle:    editSocial.twitter,
        linkedin_username: editSocial.linkedin,
        website:           editSocial.website,
        specialties:       editSpecialties,
      };
      const updated = await base44.entities.User.update(analyst.id, updates);
      setAnalyst(prev => ({ ...prev, ...updates }));
      setIsEditMode(false);
    } catch {
      // keep edit mode open on failure
    } finally {
      setSaving(false);
    }
  };

  const toggleHideStat = key =>
    setEditConfig(c => ({
      ...c,
      hidden_stats: c.hidden_stats.includes(key)
        ? c.hidden_stats.filter(k => k !== key)
        : [...c.hidden_stats, key],
    }));

  const togglePinReport = id =>
    setEditConfig(c => ({
      ...c,
      pinned_reports: c.pinned_reports.includes(id)
        ? c.pinned_reports.filter(x => x !== id)
        : [...c.pinned_reports, id],
    }));

  // Drag-to-reorder sections
  const handleDragStart = (e, idx) => { dragIdx.current = idx; e.dataTransfer.effectAllowed = "move"; };
  const handleDragOver  = e => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; };
  const handleDrop      = (e, dropIdx) => {
    e.preventDefault();
    if (dragIdx.current === null || dragIdx.current === dropIdx) return;
    const order = [...editConfig.sections_order];
    const [moved] = order.splice(dragIdx.current, 1);
    order.splice(dropIdx, 0, moved);
    setEditConfig(c => ({ ...c, sections_order: order }));
    dragIdx.current = null;
  };

  // ── Guards ────────────────────────────────────────────────────────────────
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

  // ── Computed values ───────────────────────────────────────────────────────
  const isOwnProfile     = currentUser && analyst.id === currentUser.id;
  const displayName      = analyst.full_name || analyst.email?.split("@")[0] || "Analyst";
  const resolvedReports  = myReports.filter(r => r.prediction_outcome && r.prediction_outcome !== "pending");
  const hitCount         = resolvedReports.filter(r => r.prediction_outcome === "hit" || r.prediction_outcome === "near").length;
  const scoring          = computeScore(resolvedReports);
  const tier             = computeAnalystTier(analyst, myReports);
  const achievements     = computeAchievements(analyst, myReports);
  const publishedReports = myReports.filter(r => r.status === "published");
  const activePredictions = myReports.filter(r => !r.prediction_outcome || r.prediction_outcome === "pending");

  const BUCKET_LABELS = { INTRADAY: "Intraday", SHORT: "Short-Term", MEDIUM: "Medium-Term", LONG: "Long-Term" };
  const bucketStats = { INTRADAY: { total: 0, hits: 0 }, SHORT: { total: 0, hits: 0 }, MEDIUM: { total: 0, hits: 0 }, LONG: { total: 0, hits: 0 } };
  resolvedReports.forEach(r => {
    const b = getTimeframeBucket(r.prediction_timeframe);
    if (!b) return;
    bucketStats[b].total++;
    if (r.prediction_outcome === "hit" || r.prediction_outcome === "near") bucketStats[b].hits++;
  });

  // Effective config (use editConfig in edit mode, else parse from analyst)
  const config       = isEditMode ? editConfig : parseConfig(analyst);
  const bannerTheme  = BANNER_THEMES[config.banner] || BANNER_THEMES.slate;
  const sectionOrder = config.sections_order || DEFAULT_CONFIG.sections_order;
  const tabsToShow   = isEditMode ? sectionOrder : sectionOrder;

  // Active tab must be in the current order
  const effectiveTab = sectionOrder.includes(activeTab) ? activeTab : sectionOrder[0];

  // Display values: use edit state when in edit mode
  const displayBio      = isEditMode ? editBio      : (analyst.bio      || "");
  const displayTagline  = isEditMode ? editTagline  : (analyst.tagline  || "");
  const displaySocial   = isEditMode ? editSocial   : {
    twitter:  analyst.twitter_handle   || "",
    linkedin: analyst.linkedin_username || "",
    website:  analyst.website          || "",
  };
  const displaySpecialties = isEditMode ? editSpecialties : (analyst.specialties || []);

  // Sorted reports: pinned first
  const sortedReports = [
    ...publishedReports.filter(r => config.pinned_reports.includes(r.id)),
    ...publishedReports.filter(r => !config.pinned_reports.includes(r.id)),
  ];

  return (
    <div className="min-h-screen bg-background">

      {/* ── Edit mode sticky bar ── */}
      {isEditMode && (
        <div className="sticky top-0 z-50 bg-amber-50 border-b-2 border-amber-300 px-4 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Pencil className="w-4 h-4 text-amber-700" />
            <span className="text-sm font-semibold text-amber-800">Editing your profile page</span>
            <span className="text-xs text-amber-600 hidden sm:block">· Changes are not public until you save</span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={cancelEditMode} className="border-amber-300 text-amber-800 hover:bg-amber-100 gap-1.5">
              <X className="w-3.5 h-3.5" /> Cancel
            </Button>
            <Button size="sm" onClick={saveChanges} disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-white border-0 gap-1.5">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save changes
            </Button>
          </div>
        </div>
      )}

      {/* ── Hero banner ── */}
      <div className="relative h-36 overflow-hidden" style={{ background: bannerTheme.bg }}>
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 40px,rgba(255,255,255,0.05) 40px,rgba(255,255,255,0.05) 41px),repeating-linear-gradient(90deg,transparent,transparent 40px,rgba(255,255,255,0.05) 40px,rgba(255,255,255,0.05) 41px)"
        }} />
        <div className="max-w-4xl mx-auto px-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-white/60 hover:text-white/90 transition-colors pt-4"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        </div>

        {/* Banner theme picker — edit mode only */}
        {isEditMode && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-full px-3 py-2">
            <span className="text-xs text-white/70 mr-1">Theme:</span>
            {Object.entries(BANNER_THEMES).map(([key, theme]) => (
              <button
                key={key}
                onClick={() => setEditConfig(c => ({ ...c, banner: key }))}
                className="relative w-6 h-6 rounded-full border-2 transition-all hover:scale-110"
                style={{
                  background: theme.dot,
                  borderColor: editConfig.banner === key ? "#fff" : "transparent",
                  boxShadow: editConfig.banner === key ? "0 0 0 2px rgba(255,255,255,0.4)" : "none",
                }}
                title={theme.label}
              />
            ))}
          </div>
        )}
      </div>

      <div className="max-w-4xl mx-auto px-4">

        {/* ── Profile header card ── */}
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

              {/* Name + tier + tagline */}
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

                {/* Tagline */}
                {isEditMode
                  ? <input
                      value={editTagline}
                      onChange={e => setEditTagline(e.target.value)}
                      placeholder="Add a tagline…"
                      className="mt-1.5 w-full text-sm border border-dashed border-amber-400 rounded-lg px-2 py-1 bg-amber-50/50 focus:outline-none focus:border-amber-500"
                    />
                  : displayTagline && <p className="text-sm text-muted-foreground mt-1">{displayTagline}</p>
                }
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                <button
                  onClick={openShare}
                  className="p-2 rounded-lg border border-border hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                  aria-label="Share profile"
                  title="Share profile"
                >
                  <Share2 className="w-4 h-4" />
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
                      <Link to={`/dm?with=${encodeURIComponent(analyst.email)}`}>
                        <Button size="sm" variant="outline" className="text-xs gap-1.5 text-green-600 border-green-200">
                          <MessageSquare className="w-3 h-3" /> Message
                        </Button>
                      </Link>
                    ) : (
                      <Button size="sm" onClick={() => setShowSubModal(true)} className="text-xs">
                        Subscribe
                      </Button>
                    )}
                  </>
                )}

                {isOwnProfile && !isEditMode && (
                  <>
                    <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={enterEditMode}>
                      <Pencil className="w-3.5 h-3.5" /> Edit page
                    </Button>
                    <Link to="/subscribers">
                      <Button size="sm" variant="outline" className="text-xs gap-1.5">
                        <Users className="w-3.5 h-3.5" /> Subscribers
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Specialties */}
            {!isEditMode && displaySpecialties.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-5">
                {displaySpecialties.map(s => (
                  <span key={s} className="text-xs px-2.5 py-1 rounded-full bg-primary/8 text-primary border border-primary/15 font-medium">{s}</span>
                ))}
              </div>
            )}

            {/* Specialty editor */}
            {isEditMode && (
              <div className="mb-5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Specialties</p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {editSpecialties.map(s => (
                    <span key={s} className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
                      {s}
                      <button onClick={() => setEditSpecialties(p => p.filter(x => x !== s))} className="hover:text-red-500">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={newSpecialty}
                    onChange={e => setNewSpecialty(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && newSpecialty.trim()) {
                        setEditSpecialties(p => [...p, newSpecialty.trim()]);
                        setNewSpecialty("");
                      }
                    }}
                    placeholder="Add specialty (e.g. Tech, Macro)…"
                    className="flex-1 text-xs border border-dashed border-amber-400 rounded-lg px-2.5 py-1.5 bg-amber-50/50 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    onClick={() => { if (newSpecialty.trim()) { setEditSpecialties(p => [...p, newSpecialty.trim()]); setNewSpecialty(""); } }}
                    className="text-xs bg-primary/10 text-primary px-3 rounded-lg border border-primary/20 font-semibold hover:bg-primary/20"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}

            {/* Stats strip */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {ALL_STATS.map(stat => (
                <StatCard
                  key={stat.key}
                  statKey={stat.key}
                  scoring={scoring}
                  analyst={analyst}
                  publishedCount={publishedReports.length}
                  isHidden={config.hidden_stats.includes(stat.key)}
                  isEditMode={isEditMode}
                  onToggle={toggleHideStat}
                  onClick={() => setShowAccModal(true)}
                />
              ))}
            </div>

            {/* Edit mode stat hint */}
            {isEditMode && (
              <p className="text-[10px] text-amber-700 mt-2 flex items-center gap-1">
                <Eye className="w-3 h-3" /> Click the eye icon on any stat to show/hide it from your public profile.
              </p>
            )}

            {/* Score breakdown */}
            {scoring.total >= 5 && !isEditMode && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Score breakdown</p>
                <div className="flex gap-4 flex-wrap">
                  {[
                    { label: "Win Rate component",     value: scoring._winRateScore, color: "#2563eb" },
                    { label: "Profit Factor component", value: scoring._pfScore,     color: "#16a34a" },
                    scoring._alphaScore != null && { label: "Alpha component", value: scoring._alphaScore, color: "#d97706" },
                  ].filter(Boolean).map(item => (
                    <div key={item.label} className="flex-1 min-w-[100px]">
                      <div className="flex justify-between text-[10px] mb-1">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className="font-bold" style={{ color: item.color }}>{item.value}</span>
                      </div>
                      <div className="h-1 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${item.value}%`, background: item.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Section reorder hint (edit mode) ── */}
        {isEditMode && (
          <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2">
            <GripVertical className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <p className="text-xs text-amber-800 font-medium">Drag the tabs below to reorder your profile sections.</p>
          </div>
        )}

        {/* ── Tab bar ── */}
        <div className="flex gap-0 border-b border-border mb-6">
          {tabsToShow.map((tab, idx) => (
            <div
              key={tab}
              draggable={isEditMode}
              onDragStart={e => handleDragStart(e, idx)}
              onDragOver={handleDragOver}
              onDrop={e => handleDrop(e, idx)}
              className={`flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold border-b-2 transition-all select-none ${
                effectiveTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              } ${isEditMode ? "cursor-grab" : "cursor-pointer"}`}
              onClick={() => !isEditMode && setActiveTab(tab)}
            >
              {isEditMode && <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />}
              {tab}
            </div>
          ))}
        </div>

        {/* ── Reports tab ── */}
        {effectiveTab === "Reports" && (
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

            {sortedReports.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-border rounded-xl text-muted-foreground">
                <FileText className="w-8 h-8 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No published reports yet.</p>
              </div>
            ) : (
              <>
                {isEditMode && (
                  <p className="text-xs text-amber-700 mb-3 flex items-center gap-1.5">
                    📌 Click the pin icon on any report to pin it to the top of your profile.
                  </p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {sortedReports.map(r => (
                    <ReportMiniCard
                      key={r.id}
                      report={r}
                      isPinned={config.pinned_reports.includes(r.id)}
                      isEditMode={isEditMode}
                      onTogglePin={togglePinReport}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Track Record tab ── */}
        {effectiveTab === "Track Record" && (
          <div className="pb-12 space-y-5">
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold mb-4">Accuracy by Timeframe</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(bucketStats).map(([key, stats]) => (
                  <div key={key} className="text-center p-4 bg-secondary rounded-xl">
                    <p className="text-[11px] text-muted-foreground mb-1">{BUCKET_LABELS[key]}</p>
                    {stats.total > 0 ? (
                      <>
                        <p className="text-xl font-bold">{Math.round((stats.hits / stats.total) * 100)}%</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{stats.hits}/{stats.total}</p>
                      </>
                    ) : (
                      <p className="text-xl font-bold text-muted-foreground/30">—</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <AccuracyBreakdown analystUser={analyst} />
            <PerformanceVsMarket analyst={analyst} />
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

        {/* ── About tab ── */}
        {effectiveTab === "About" && (
          <div className="pb-12 space-y-5">

            {/* Bio */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold mb-3">About</h3>
              {isEditMode ? (
                <textarea
                  value={editBio}
                  onChange={e => setEditBio(e.target.value)}
                  rows={5}
                  placeholder="Write a bio — your background, methodology, what you focus on…"
                  className="w-full text-sm border border-dashed border-amber-400 rounded-lg px-3 py-2 bg-amber-50/30 focus:outline-none focus:border-amber-500 resize-none"
                />
              ) : displayBio ? (
                <p className="text-sm text-foreground/80 leading-relaxed">{displayBio}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">No bio added yet.</p>
              )}
            </div>

            {/* Social links */}
            {(isEditMode || displaySocial.twitter || displaySocial.linkedin || displaySocial.website) && (
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-sm font-semibold mb-3">Links</h3>
                {isEditMode ? (
                  <div className="space-y-3">
                    {[
                      { key: "twitter",  icon: <Twitter className="w-4 h-4" />,  placeholder: "Twitter/X handle (without @)",  prefix: "x.com/" },
                      { key: "linkedin", icon: <Linkedin className="w-4 h-4" />, placeholder: "LinkedIn username",              prefix: "linkedin.com/in/" },
                      { key: "website",  icon: <Globe className="w-4 h-4" />,    placeholder: "Website URL",                   prefix: "" },
                    ].map(({ key, icon, placeholder, prefix }) => (
                      <div key={key} className="flex items-center gap-2">
                        <span className="text-muted-foreground w-8 flex justify-center">{icon}</span>
                        {prefix && <span className="text-xs text-muted-foreground">{prefix}</span>}
                        <input
                          value={editSocial[key]}
                          onChange={e => setEditSocial(s => ({ ...s, [key]: e.target.value }))}
                          placeholder={placeholder}
                          className="flex-1 text-sm border border-dashed border-amber-400 rounded-lg px-2.5 py-1.5 bg-amber-50/30 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {displaySocial.twitter && (
                      <a href={`https://x.com/${displaySocial.twitter}`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                        <Twitter className="w-4 h-4" /> @{displaySocial.twitter}
                      </a>
                    )}
                    {displaySocial.linkedin && (
                      <a href={`https://linkedin.com/in/${displaySocial.linkedin}`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                        <Linkedin className="w-4 h-4" /> LinkedIn
                      </a>
                    )}
                    {displaySocial.website && (
                      <a href={displaySocial.website.startsWith("http") ? displaySocial.website : `https://${displaySocial.website}`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                        <Globe className="w-4 h-4" /> Website
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Custom sections — owner-editable: text, image, links, ticker spotlight */}
            <CustomBlocksSection
              blocks={config.custom_blocks || []}
              isEditMode={isEditMode}
              onChange={blocks => setEditConfig(c => ({ ...c, custom_blocks: blocks }))}
            />

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
                  <div key={a.name} className="flex items-start gap-3 p-3 rounded-xl border transition-all"
                    style={{
                      background:   a.earned ? "#fefce8" : "#f8fafc",
                      borderColor:  a.earned ? "#fde68a" : "#e2e8f0",
                      opacity:      a.earned ? 1 : 0.4,
                      filter:       a.earned ? "none" : "grayscale(1)",
                    }}
                  >
                    <span className="text-2xl leading-none shrink-0">{a.icon}</span>
                    <div>
                      <p className="text-xs font-bold leading-tight">{a.name}</p>
                      <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{a.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Owner links */}
            {isOwnProfile && !isEditMode && (
              <Link to="/subscribers" className="flex items-center justify-between p-4 bg-purple-50 border border-purple-200 rounded-xl hover:border-purple-400 transition-colors">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="text-sm font-bold text-purple-700">Subscribers &amp; Following</p>
                    <p className="text-xs text-muted-foreground">Manage your audience</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-purple-500" />
              </Link>
            )}
          </div>
        )}
      </div>

      {/* ── Score modal ── */}
      {showAccModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAccModal(false)}>
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-base mb-1">Analyst Score</h3>
            <p className="text-5xl font-extrabold text-primary mb-1">{scoring.score}</p>
            <p className="text-xs text-muted-foreground mb-5">out of 100 · {scoring.total} resolved predictions</p>
            <div className="space-y-3 mb-5">
              {[
                { label: "Win Rate",       value: scoring.rawWR != null ? `${(scoring.rawWR * 100).toFixed(1)}%` : "—",             sub: `${hitCount} wins · ${scoring.misses} losses`,                                                                   color: "#2563eb", bar: scoring._winRateScore },
                { label: "Profit Factor",  value: scoring.profitFactor != null ? `${scoring.profitFactor.toFixed(2)}x` : "—",        sub: `avg win ${scoring.avgWin != null ? `+${scoring.avgWin.toFixed(1)}%` : "—"} · avg loss ${scoring.avgLoss != null ? `-${scoring.avgLoss.toFixed(1)}%` : "—"}`, color: "#16a34a", bar: scoring._pfScore },
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
              Score = Wilson-adjusted Win Rate (52%) + Profit Factor (48%). Alpha activates with 5+ benchmark-recorded calls. Sample-size adjusted.
            </p>
            <button onClick={() => setShowAccModal(false)} className="w-full text-sm text-muted-foreground hover:text-foreground">Close</button>
          </div>
        </div>
      )}

      {/* ── Subscribe modal (wallet-based) ── */}
      <WalletConfirmDialog
        open={showSubModal}
        onClose={() => setShowSubModal(false)}
        onConfirm={handleSubscribe}
        title={`Subscribe to ${displayName}`}
        amountUSD={SUBSCRIPTION_PRICE_USD}
        itemLabel={`${displayName} · Monthly subscription · ${publishedReports.length} published report${publishedReports.length !== 1 ? "s" : ""}`}
        showSplit={true}
        confirmLabel="Subscribe"
      />

      {/* Share modal */}
      <ShareModal
        open={showShareModal}
        onClose={() => setShowShareModal(false)}
        title={`${displayName} on STOA`}
        description={analyst.tagline || "Verified analyst on STOA"}
      />
    </div>
  );
}
