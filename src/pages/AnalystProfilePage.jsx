import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { setMeta, injectJsonLd } from "@/lib/seo";
import {
  ArrowLeft, UserPlus, FileText, Users, TrendingUp,
  Loader2, CheckCircle2, Share2, ChevronRight, Award, Lock,
  Pencil, Eye, EyeOff, GripVertical, Globe, Twitter, Linkedin,
  MessageSquare, Save, X, Plus, Pin, Check, Camera,
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
import WatchlistPanel from "@/components/dashboard/WatchlistPanel";
import useGoBack from "@/hooks/useGoBack";

// ── Config helpers ────────────────────────────────────────────────────────────
const DEFAULT_CONFIG = {
  banner:         "slate",
  hidden_stats:   [],
  sections_order: ["Reports", "Track Record", "About"],
  pinned_reports: [],
  custom_blocks:  [],
};

// Banner themes — all on-brand, drawn from the Stoa palette.
// (Previous palette stacked emerald/purple/rose/amber gradients that read as
// off-brand third-party themes. Limited the set to navy and navy-gold per
// design system MASTER.md.)
const BANNER_THEMES = {
  slate:    { label: "Navy",       bg: "linear-gradient(135deg,#0A1A3F 0%,#1E3A8A 100%)",              dot: "#2E5090" },
  blue:     { label: "Navy",       bg: "linear-gradient(135deg,#0A1A3F 0%,#1E3A8A 100%)",              dot: "#2E5090" },
  navygold: { label: "Navy/Gold",  bg: "linear-gradient(135deg,#0A1A3F 0%,#1E3A8A 60%,#D4AF37 100%)", dot: "#D4AF37" },
  emerald:  { label: "Navy",       bg: "linear-gradient(135deg,#0A1A3F 0%,#1E3A8A 100%)",              dot: "#2E5090" },
  purple:   { label: "Navy",       bg: "linear-gradient(135deg,#0A1A3F 0%,#1E3A8A 100%)",              dot: "#2E5090" },
  rose:     { label: "Navy",       bg: "linear-gradient(135deg,#0A1A3F 0%,#1E3A8A 100%)",              dot: "#2E5090" },
  amber:    { label: "Navy/Gold",  bg: "linear-gradient(135deg,#0A1A3F 0%,#1E3A8A 60%,#D4AF37 100%)", dot: "#D4AF37" },
};

// Monthly subscription price — shared across handleSubscribe + the Subscribe
// CTA label so they stay in sync.
const SUBSCRIPTION_PRICE_USD = 9;

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
    <span className="text-[10px] font-medium px-2 py-0.5 rounded-tag bg-accent/15 text-accent border border-accent/30">ACTIVE</span>
  );
  if (outcome === "hit" || outcome === "near") return (
    <span className="text-[10px] font-medium px-2 py-0.5 rounded-tag bg-gain/10 text-gain border border-gain/20">HIT</span>
  );
  return (
    <span className="text-[10px] font-medium px-2 py-0.5 rounded-tag bg-loss/10 text-loss border border-loss/20">MISS</span>
  );
}

function PredictionRow({ report }) {
  const yld = report.prediction_yield;
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border/60 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{report.title || "Untitled"}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {report.stock_ticker && (
            <span className="text-[11px] font-display font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-tag border border-primary/20">
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
          <p className={`text-sm font-medium font-display ${yld >= 0 ? "text-gain" : "text-loss"}`}>
            {yld >= 0 ? "+" : ""}{yld.toFixed(1)}%
          </p>
        )}
        <OutcomeBadge outcome={report.prediction_outcome} />
      </div>
    </div>
  );
}

// Avatar upload — appears as a camera badge over the avatar in edit mode.
// Crops to a centered square client-side before upload so the result is
// always 1:1 regardless of source aspect ratio.
function AvatarUploader({ onUploaded }) {
  const [busy, setBusy] = React.useState(false);
  const inputRef = React.useRef(null);

  async function cropToSquare(file, size = 512) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const min = Math.min(img.width, img.height);
        const sx  = (img.width  - min) / 2;
        const sy  = (img.height - min) / 2;
        const canvas = document.createElement("canvas");
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
        canvas.toBlob(blob => {
          if (!blob) return reject(new Error("Crop failed"));
          resolve(new File([blob], "avatar.jpg", { type: "image/jpeg" }));
        }, "image/jpeg", 0.88);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  async function handlePick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Image must be under 8 MB");
      return;
    }
    setBusy(true);
    try {
      const cropped = await cropToSquare(file);
      const { file_url } = await base44.integrations.Core.UploadFile({ file: cropped });
      // updateMyUserData isn't exposed on the entity SDK in this Base44 build —
      // the canonical pattern (used by BecomeAnalystPage etc.) is to load
      // the current user via auth.me() and call User.update(id, patch).
      const me = await base44.auth.me();
      if (!me?.id) throw new Error("Could not resolve current user");
      await base44.entities.User.update(me.id, { profile_picture_url: file_url });
      onUploaded(file_url);
      toast.success("Profile picture updated");
    } catch (err) {
      toast.error(err?.message || "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        title="Change profile picture"
        className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary text-primary-foreground border border-background flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-60"
      >
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
      </button>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handlePick} />
    </>
  );
}

function ReportMiniCard({ report, isPinned, isEditMode, onTogglePin }) {
  const directionTone = report.prediction_direction === "LONG"
    ? "text-gain bg-gain/10 border-gain/20"
    : report.prediction_direction === "SHORT"
    ? "text-loss bg-loss/10 border-loss/20"
    : "text-muted-foreground bg-secondary border-border";

  return (
    <div className="relative group">
      <Link to={`/report?id=${report.id}`} className="block">
        <div className={`surface surface-interactive p-4 h-full ${isPinned ? "border-accent/40" : ""}`}>
          {isPinned && (
            <span className="absolute top-2 right-2 flex items-center gap-1 text-[9px] font-medium uppercase tracking-wider text-accent">
              <Pin className="w-2.5 h-2.5" /> Pinned
            </span>
          )}
          <div className="flex items-start justify-between gap-2 mb-2">
            {report.prediction_direction && (
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-tag border ${directionTone}`}>
                {report.prediction_direction}
              </span>
            )}
            {report.prediction_outcome && report.prediction_outcome !== "pending" && (
              <OutcomeBadge outcome={report.prediction_outcome} />
            )}
          </div>
          <h4 className="text-sm font-medium leading-snug line-clamp-2 group-hover:text-primary transition-colors font-serif mb-2">
            {report.title || "Untitled Report"}
          </h4>
          {report.stock_ticker && (
            <p className="text-xs font-display font-medium text-primary/80 mb-1">{report.stock_ticker}</p>
          )}
          <p className="text-[11px] text-muted-foreground">
            {report.created_date ? new Date(report.created_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}
          </p>
        </div>
      </Link>
      {isEditMode && (
        <button
          onClick={e => { e.preventDefault(); e.stopPropagation(); onTogglePin(report.id); }}
          className={`absolute top-2 left-2 p-1.5 rounded-tag transition-all ${
            isPinned
              ? "bg-accent/15 border border-accent/40 text-accent"
              : "bg-background border border-border text-muted-foreground hover:text-accent hover:border-accent/40 opacity-0 group-hover:opacity-100"
          }`}
          title={isPinned ? "Unpin" : "Pin to top"}
        >
          <Pin className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

// ── Stat definitions ──────────────────────────────────────────────────────────
// Stat cards use the .stat-card glass utility from the design system. Win-rate
// and profit-factor are not market sentiment — they keep neutral foreground.
// Average-return is a gain/loss percentage indicator (allowed market color).
const ALL_STATS = [
  { key: "score",         label: "Score",         sub: s => `${s.total} calls` },
  { key: "winRate",       label: "Win Rate",       sub: s => s.total > 0 ? `${s.hits}W · ${s.misses}L` : "" },
  { key: "profitFactor",  label: "Profit Factor",  sub: () => "avg win / avg loss" },
  { key: "avgReturn",     label: "Avg Return",     sub: () => "per call" },
  { key: "followers",     label: "Followers",      sub: (s, a) => `${(a.published || 0)} reports` },
];

function StatCard({ statKey, scoring, analyst, publishedCount, isHidden, isEditMode, onToggle, onClick }) {
  const renderValue = () => {
    if (statKey === "score")
      return <span className="text-primary">{scoring.total >= 5 ? scoring.score : "—"}</span>;
    if (statKey === "winRate")
      return <span className="text-foreground">
        {scoring.rawWR != null ? `${(scoring.rawWR * 100).toFixed(1)}%` : "—"}
      </span>;
    if (statKey === "profitFactor")
      return <span className="text-foreground">
        {scoring.profitFactor != null ? `${scoring.profitFactor.toFixed(2)}x` : "—"}
      </span>;
    if (statKey === "avgReturn")
      return <span className={scoring.avgReturn == null ? "text-muted-foreground" : scoring.avgReturn >= 0 ? "text-gain" : "text-loss"}>
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
      className={`stat-card text-center ${isHidden ? "opacity-30" : ""} ${
        statKey === "score" && !isHidden && !isEditMode ? "cursor-pointer" : ""
      }`}
      onClick={!isEditMode && statKey === "score" && !isHidden ? onClick : undefined}
    >
      {isEditMode && (
        <button
          onClick={e => { e.stopPropagation(); onToggle(statKey); }}
          className="absolute top-1.5 right-1.5 p-0.5 rounded-tag text-muted-foreground hover:text-foreground transition-colors"
        >
          {isHidden ? <EyeOff className="w-3.5 h-3.5 text-muted-foreground" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
      )}
      <p className="text-2xl font-medium font-display leading-none mb-1">{renderValue()}</p>
      <p className="stat-card-label">{def?.label}</p>
      {subText && <p className="text-[10px] text-muted-foreground/70 mt-0.5"><span className="font-display">{subText}</span></p>}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AnalystProfilePage() {
  const navigate = useNavigate();
  const goBack   = useGoBack("/");
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

        // Disambiguator: when multiple users share the same name they
        // collide on the slug. ReportCard now appends ?u=<email> to the
        // profile URL — when present, we resolve by email FIRST so each
        // user gets their own profile regardless of name collisions.
        const emailParam = searchParams.get("u");

        if (emailParam) {
          userData = allUsers.find(
            u => (u.email || "").toLowerCase() === emailParam.toLowerCase()
          ) || null;
        }

        if (!userData && username) {
          const target = username.toLowerCase();
          userData = allUsers.find(u => getAnalystSlug(u) === target) || null;
          if (!userData) userData = allUsers.find(u => u.id === username || u.email === username) || null;
          // Last-resort fallback: match by email-prefix (case-insensitive).
          // ReportCard now routes here when no full_name is available, so the
          // username param may be the email's local-part rather than a slug.
          if (!userData) {
            userData = allUsers.find(u =>
              (u.email || "").toLowerCase().split("@")[0] === target
            ) || null;
          }
          // If we STILL didn't resolve anyone, fall back to a stub object so
          // we render an "unknown analyst" page rather than silently
          // defaulting to the current user (which was the original bug).
          if (!userData) {
            userData = { full_name: "Unknown Researcher", email: "", _notFound: true };
          }
        } else if (!userData && !username && me) {
          userData = me;
        }

        if (userData) {
          setAnalyst(userData);
          const displayName = userData.full_name || userData.email?.split("@")[0] || "Researcher";
          const tagline = userData.tagline || "Verified researcher on STOA";
          setMeta({
            title:       `${displayName} — Researcher Profile`,
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
          // Fallback: if the created_by filter returned nothing but the
          // analyst clearly has published reports in the feed (common when
          // RLS blocks the filter for non-owners, or when reports were
          // baked with a different email than the User record), pull the
          // full published list and match by author_name. This is what
          // fixes "0 reports" on a profile whose reports show up in /feed.
          let myReports = reports || [];
          if (myReports.length === 0 && userData.email) {
            try {
              const all = await base44.entities.Report.filter(
                { status: "published" },
                "-created_date",
                200
              ).catch(() => []);
              myReports = (all || []).filter(r => {
                const byEmail = r.created_by && r.created_by.toLowerCase() === userData.email.toLowerCase();
                const byName  = userData.full_name &&
                  r.author_name &&
                  r.author_name.trim().toLowerCase() === userData.full_name.trim().toLowerCase();
                return byEmail || byName;
              });
            } catch {}
          }
          setMyReports(myReports);
          setTwits(twitData || []);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
    // searchParams included so switching between two users that share a
    // name (same slug, different ?u=) actually re-loads the correct user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, searchParams.get("u")]);

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
          analyst_name:   analyst.full_name || analyst.email?.split("@")[0] || "Researcher",
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

  const handleSubscribe = async () => {
    if (!currentUser || !analyst) return;
    try {
      const result = await subscribeAnalyst({
        analystEmail:    analyst.email,
        analystName:     analyst.full_name || analyst.email?.split("@")[0] || "Researcher",
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

  const MAX_PINNED = 3;
  const togglePinReport = id =>
    setEditConfig(c => {
      const already = c.pinned_reports.includes(id);
      if (already) {
        return { ...c, pinned_reports: c.pinned_reports.filter(x => x !== id) };
      }
      if (c.pinned_reports.length >= MAX_PINNED) {
        toast.error(`You can pin at most ${MAX_PINNED} reports. Unpin one first.`);
        return c;
      }
      return { ...c, pinned_reports: [...c.pinned_reports, id] };
    });

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
  // Content-shaped skeleton that mirrors the actual page layout: banner +
  // avatar + name + tagline + 5-stat row + tab bar. Uses the shimmer
  // utility from index.css so all skeletons across the app feel uniform.
  if (loading) return (
    <div className="min-h-screen bg-background" aria-busy="true" aria-label="Loading profile">
      <div className="relative h-36 overflow-hidden shimmer" />
      <div className="max-w-4xl mx-auto px-4">
        <div className="relative -mt-12 mb-6">
          <div className="surface-premium p-6" style={{ background: "hsl(var(--card))" }}>
            <div className="flex items-end gap-4 mb-5">
              <div className="w-20 h-20 rounded-full shimmer -mt-10 ring-4 ring-background" />
              <div className="flex-1 min-w-0 pb-1 space-y-2">
                <div className="h-5 w-48 shimmer rounded-tag" />
                <div className="h-3 w-72 shimmer rounded-tag" />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[0, 1, 2, 3, 4].map(i => (
                <div key={i} className="h-20 shimmer rounded-tag" />
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-0 border-b border-border/60 mb-6">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-10 w-32 shimmer mx-2" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="h-32 shimmer rounded-tag" />
          ))}
        </div>
      </div>
    </div>
  );

  if (!analyst) return (
    <div className="max-w-3xl mx-auto px-4 py-12 text-center">
      <p className="text-muted-foreground">Researcher not found.</p>
      <Button onClick={goBack} variant="outline" className="mt-4 text-sm">Go Back</Button>
    </div>
  );

  // ── Computed values ───────────────────────────────────────────────────────
  const isOwnProfile     = currentUser && analyst.id === currentUser.id;
  const displayName      = analyst.full_name || analyst.email?.split("@")[0] || "Researcher";
  const resolvedReports  = myReports.filter(r => r.prediction_outcome && r.prediction_outcome !== "pending");
  const hitCount         = resolvedReports.filter(r => r.prediction_outcome === "hit" || r.prediction_outcome === "near").length;
  const scoring          = computeScore(resolvedReports);
  const tier             = computeAnalystTier(analyst, myReports);
  const achievements     = computeAchievements(analyst, myReports);
  const publishedReports = myReports.filter(r => r.status === "published");
  // An "active call" = a published report with a locked prediction that hasn't been resolved yet.
  // Filtering only on prediction_outcome counted every report (incl. ones with no
  // prediction attached) and inflated the header count above what /predictions,
  // /analytics, and the dashboard show. Those all gate on prediction_action.
  const activePredictions = publishedReports.filter(r =>
    r.prediction_action &&
    (!r.prediction_outcome || r.prediction_outcome === "pending")
  );

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

  // Substack-style persistent Subscribe bar. Slides in after the hero
  // scrolls out of view so investors always have a one-click path to
  // subscribe — never more than one scroll away.
  const showStickySubscribe = !isOwnProfile && !isSubscribed && currentUser;

  return (
    <div className="min-h-screen bg-background">

      {showStickySubscribe && (
        <div className="sticky top-14 z-40 bg-background/85 backdrop-blur-xl border-b border-border/60">
          <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center gap-3">
            <div className="shrink-0">
              {(analyst.profile_picture_url || analyst.picture)
                ? <img src={analyst.profile_picture_url || analyst.picture} alt={displayName} className="w-7 h-7 rounded-full object-cover border border-border" />
                : <div className="w-7 h-7 rounded-full bg-primary/10 border border-border flex items-center justify-center text-[11px] font-medium text-primary">{displayName?.[0]}</div>}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-foreground truncate">{displayName}</div>
              <div className="text-[11px] text-muted-foreground">
                {scoring.total >= 1 && <><span className="font-display">{scoring.score}</span> score · </>}
                <span className="font-display">{analyst.followers_count || 0}</span> followers
              </div>
            </div>
            <Button size="sm" onClick={() => setShowSubModal(true)} className="cta-gold text-xs shrink-0" style={{ borderRadius: 6 }}>
              Subscribe · ${SUBSCRIPTION_PRICE_USD}/mo
            </Button>
          </div>
        </div>
      )}

      {/* ── Edit mode sticky bar ── */}
      {isEditMode && (
        <div className="sticky top-0 z-50 bg-accent/10 border-b border-accent/30 px-4 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Pencil className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-foreground">Editing your profile page</span>
            <span className="text-xs text-muted-foreground hidden sm:block">· Changes are not public until you save</span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={cancelEditMode} className="gap-1.5">
              <X className="w-3.5 h-3.5" /> Cancel
            </Button>
            <Button size="sm" onClick={saveChanges} disabled={saving} className="cta-gold gap-1.5" style={{ borderRadius: 6 }}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save changes
            </Button>
          </div>
        </div>
      )}

      {/* ── Hero banner ── */}
      <div className="relative h-36 overflow-hidden ambient-section" style={{ background: bannerTheme.bg }}>
        {/* Decorative grid pattern — pointer-events-none so it doesn't
            swallow clicks on the Back button below. Without this, the
            absolute overlay sat on top of the entire banner including
            the back button, which is why Back was visible but unclickable. */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{
          backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 40px,rgba(255,255,255,0.05) 40px,rgba(255,255,255,0.05) 41px),repeating-linear-gradient(90deg,transparent,transparent 40px,rgba(255,255,255,0.05) 40px,rgba(255,255,255,0.05) 41px)"
        }} />
        <div className="max-w-4xl mx-auto px-4 relative z-10">
          <button
            type="button"
            onClick={goBack}
            className="flex items-center gap-1.5 text-sm text-white/60 hover:text-white/90 transition-colors pt-4"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        </div>

        {/* Banner theme picker — edit mode only.
            Two options now (Navy / Navy+Gold) since the off-brand themes were
            removed. The third "Gold" duplicates Navy+Gold for backwards-compat
            with old saved configs. */}
        {isEditMode && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-tag px-3 py-2">
            <span className="text-xs text-white/70 mr-1">Theme:</span>
            {[["slate", BANNER_THEMES.slate], ["navygold", BANNER_THEMES.navygold]].map(([key, theme]) => (
              <button
                key={key}
                onClick={() => setEditConfig(c => ({ ...c, banner: key }))}
                className="relative w-6 h-6 rounded-full border transition-all hover:scale-110"
                style={{
                  background: theme.dot,
                  borderColor: editConfig.banner === key ? "#FAFAFA" : "transparent",
                }}
                title={theme.label}
              />
            ))}
          </div>
        )}
      </div>

      <div className="max-w-4xl mx-auto px-4">

        {/* ── Profile header card ── */}
        {/* `surface-premium` defaults to a near-transparent glass background
            (3% navy in light mode, 4.5% white in dark). That works fine for
            cards floating over the page background, but this card is pulled
            UP by -mt-12 so its top 48px overlaps the dark navy banner.
            With a translucent fill the banner bled straight through, making
            the upper area of the card look navy and the analyst name appear
            as dark-text-on-dark. Inline style overrides the glass fill with
            the opaque theme card color so the top-edge highlight + gradient
            border still work, but the banner can't bleed through anymore. */}
        <div className="relative -mt-12 mb-6">
          <div className="surface-premium p-6" style={{ background: "hsl(var(--card))" }}>
            <div className="flex items-end gap-4 mb-5">

              {/* Avatar — uploaded profile_picture_url overrides auth-provider picture */}
              <div className="shrink-0 -mt-10 ring-4 ring-background rounded-full relative">
                {(() => {
                  const src = analyst.profile_picture_url || analyst.picture;
                  return src
                    ? <img src={src} alt={displayName} className="w-20 h-20 rounded-full object-cover border border-border" />
                    : <div className="w-20 h-20 rounded-full bg-primary/10 border border-border flex items-center justify-center text-3xl font-medium text-primary font-serif">
                        {displayName?.[0] || "A"}
                      </div>;
                })()}
                {isEditMode && (
                  <AvatarUploader
                    onUploaded={(url) => {
                      setAnalyst(a => ({ ...a, profile_picture_url: url }));
                    }}
                  />
                )}
              </div>

              {/* Name + tier + tagline */}
              <div className="flex-1 min-w-0 pb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-serif text-[20px] text-foreground font-medium">{displayName}</h1>
                  {tier && (
                    <AccuracyTierBadge tierData={tier} />
                  )}
                  {activePredictions.length > 0 && (
                    <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-tag bg-accent/15 text-accent border border-accent/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                      <span className="font-display">{activePredictions.length}</span> active call{activePredictions.length > 1 ? "s" : ""}
                    </span>
                  )}
                </div>

                {/* Tagline */}
                {isEditMode
                  ? <input
                      value={editTagline}
                      onChange={e => setEditTagline(e.target.value)}
                      placeholder="Add a tagline…"
                      className="mt-1.5 w-full text-sm border border-dashed border-accent/50 rounded-tag px-2 py-1 bg-accent/5 focus:outline-none focus:border-accent"
                    />
                  : displayTagline && <p className="text-sm text-muted-foreground mt-1">{displayTagline}</p>
                }
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                <button
                  onClick={openShare}
                  className="p-2 rounded-tag border border-border hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
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
                      className={`gap-1.5 text-xs ${following ? "text-primary border-primary/30" : ""}`}
                      onClick={handleFollow}
                      disabled={followLoading}
                    >
                      {followLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : following ? <CheckCircle2 className="w-3 h-3" /> : <UserPlus className="w-3 h-3" />}
                      {following ? "Following" : "Follow"}
                    </Button>
                    {isSubscribed ? (
                      <Link to={`/dm?with=${encodeURIComponent(analyst.email)}`}>
                        <Button size="sm" variant="outline" className="text-xs gap-1.5 text-primary border-primary/30">
                          <MessageSquare className="w-3 h-3" /> Message
                        </Button>
                      </Link>
                    ) : (
                      <Button size="sm" onClick={() => setShowSubModal(true)} className="cta-gold text-xs" style={{ borderRadius: 6 }}>
                        Subscribe · ${SUBSCRIPTION_PRICE_USD}/mo
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
                  <span key={s} className="pill-primary">{s}</span>
                ))}
              </div>
            )}

            {/* Specialty editor */}
            {isEditMode && (
              <div className="mb-5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Specialties</p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {editSpecialties.map(s => (
                    <span key={s} className="flex items-center gap-1 pill-primary">
                      {s}
                      <button onClick={() => setEditSpecialties(p => p.filter(x => x !== s))} className="hover:text-foreground">
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
                    className="flex-1 text-xs border border-dashed border-accent/50 rounded-tag px-2.5 py-1.5 bg-accent/5 focus:outline-none focus:border-accent"
                  />
                  <button
                    onClick={() => { if (newSpecialty.trim()) { setEditSpecialties(p => [...p, newSpecialty.trim()]); setNewSpecialty(""); } }}
                    className="text-xs bg-primary/10 text-primary px-3 rounded-tag border border-primary/20 font-medium hover:bg-primary/20"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}

            {/* Followers count + social-proof row — Patreon-style.
                Sits above the stat grid so it reads as the dominant trust
                signal even when there's no resolved-prediction data yet. */}
            <div className="flex items-center gap-5 text-[13px] text-muted-foreground mb-5 pb-5 border-b border-border/60">
              <span><span className="font-display text-foreground font-medium">{analyst.followers_count || 0}</span> followers</span>
              <span className="text-border">|</span>
              <span><span className="font-display text-foreground font-medium">{publishedReports.length}</span> reports</span>
              {scoring.total >= 1 && (
                <>
                  <span className="text-border">|</span>
                  <span><span className="font-display text-foreground font-medium">{scoring.total}</span> resolved predictions</span>
                </>
              )}
            </div>

            {/* Stats strip — hidden until there is at least one resolved
                prediction. Showing five "—" tiles is anti-conversion: it
                screams "no track record" before the visitor has even seen
                the analyst's content. */}
            {scoring.total >= 1 && (
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
            )}

            {/* Edit mode stat hint */}
            {isEditMode && (
              <p className="text-[10px] text-accent mt-2 flex items-center gap-1">
                <Eye className="w-3 h-3" /> Click the eye icon on any stat to show/hide it from your public profile.
              </p>
            )}

            {/* Score breakdown */}
            {scoring.total >= 5 && !isEditMode && (
              <div className="mt-3 pt-3 border-t border-border/60">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2">Score breakdown</p>
                <div className="flex gap-4 flex-wrap">
                  {[
                    { label: "Win Rate component",     value: scoring._winRateScore, tone: "primary" },
                    { label: "Profit Factor component", value: scoring._pfScore,     tone: "gain" },
                    scoring._alphaScore != null && { label: "Alpha component", value: scoring._alphaScore, tone: "accent" },
                  ].filter(Boolean).map(item => (
                    <div key={item.label} className="flex-1 min-w-[100px]">
                      <div className="flex justify-between text-[10px] mb-1">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className={`font-medium font-display text-${item.tone === "gain" ? "gain" : item.tone === "accent" ? "accent" : "primary"}`}>{item.value}</span>
                      </div>
                      <div className="h-1 bg-secondary rounded-tag overflow-hidden">
                        <div className={`h-full rounded-tag bg-${item.tone === "gain" ? "gain" : item.tone === "accent" ? "accent" : "primary"}`} style={{ width: `${item.value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── HERO: Track Record Visualization ──
            eToro-style equity curve as the dominant element above the
            fold. This is the 2-second proof — "does this analyst know
            their stuff?" — and answers that question before any tab is
            tapped. Only renders when there are resolved predictions to
            chart; otherwise we'd just be drawing a flat line. */}
        {resolvedReports.length > 0 && (
          <div className="mb-6">
            <PerformanceVsMarket resolvedReports={resolvedReports} />
          </div>
        )}

        {/* ── Section reorder hint (edit mode) ── */}
        {isEditMode && (
          <div className="mb-3 p-3 bg-accent/10 border border-accent/30 rounded-tag flex items-center gap-2">
            <GripVertical className="w-4 h-4 text-accent flex-shrink-0" />
            <p className="text-xs text-foreground font-medium">Drag the tabs below to reorder your profile sections.</p>
          </div>
        )}

        {/* ── Tab bar ── */}
        <div role="tablist" aria-label="Profile sections" className="flex gap-0 border-b border-border/60 mb-6">
          {tabsToShow.map((tab, idx) => {
            const isActive = effectiveTab === tab;
            return (
              <div
                key={tab}
                role="tab"
                aria-selected={isActive}
                tabIndex={isEditMode ? -1 : 0}
                draggable={isEditMode}
                onDragStart={e => handleDragStart(e, idx)}
                onDragOver={handleDragOver}
                onDrop={e => handleDrop(e, idx)}
                className={`flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium border-b transition-all select-none ${
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                } ${isEditMode ? "cursor-grab" : "cursor-pointer"}`}
                onClick={() => !isEditMode && setActiveTab(tab)}
                onKeyDown={e => { if (!isEditMode && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); setActiveTab(tab); } }}
              >
                {isEditMode && <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />}
                {tab}
              </div>
            );
          })}
        </div>

        {/* ── Reports tab ── */}
        {effectiveTab === "Reports" && (
          <div className="pb-12">
            {twits.length > 0 && (
              <div className="surface p-4 mb-5">
                <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">Quick Notes</h3>
                <div className="space-y-3">
                  {twits.map(t => (
                    <div key={t.id} className="flex gap-3">
                      {analyst.picture
                        ? <img src={analyst.picture} alt={displayName} className="w-7 h-7 rounded-full flex-shrink-0 object-cover" />
                        : <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs font-medium text-primary flex-shrink-0">{displayName?.[0]}</div>
                      }
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-medium">{displayName}</span>
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
              <div className="text-center py-16 border border-dashed border-border rounded-tag text-muted-foreground">
                <FileText className="w-8 h-8 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No published reports yet.</p>
              </div>
            ) : (
              <>
                {isEditMode && (
                  <p className="text-xs text-accent mb-3 flex items-center gap-1.5">
                    <Pin className="w-3 h-3" /> Click the pin icon on any report to pin it to the top of your profile.
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
            <div className="surface p-5">
              <h3 className="font-serif text-[14px] text-foreground mb-4">Accuracy by Timeframe</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(bucketStats).map(([key, stats]) => (
                  <div key={key} className="stat-card text-center">
                    <p className="stat-card-label mb-1">{BUCKET_LABELS[key]}</p>
                    {stats.total > 0 ? (
                      <>
                        <p className="text-xl font-medium font-display">{Math.round((stats.hits / stats.total) * 100)}%</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 font-display">{stats.hits}/{stats.total}</p>
                      </>
                    ) : (
                      <p className="text-xl font-medium font-display text-muted-foreground/30">—</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <AccuracyBreakdown analystUser={analyst} />
            <PerformanceVsMarket resolvedReports={resolvedReports} />
            <div className="surface p-5">
              <h3 className="font-serif text-[14px] text-foreground mb-1">All Predictions</h3>
              <p className="text-xs text-muted-foreground mb-4"><span className="font-display">{resolvedReports.length}</span> resolved · <span className="font-display">{activePredictions.length}</span> active</p>
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
            <div className="surface p-5">
              <h3 className="font-serif text-[14px] text-foreground mb-3">About</h3>
              {isEditMode ? (
                <textarea
                  value={editBio}
                  onChange={e => setEditBio(e.target.value)}
                  rows={5}
                  placeholder="Write a bio — your background, methodology, what you focus on…"
                  className="w-full text-sm border border-dashed border-accent/50 rounded-tag px-3 py-2 bg-accent/5 focus:outline-none focus:border-accent resize-none"
                />
              ) : displayBio ? (
                <p className="text-sm text-foreground/80 leading-relaxed">{displayBio}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">No bio added yet.</p>
              )}
            </div>

            {/* Social links */}
            {(isEditMode || displaySocial.twitter || displaySocial.linkedin || displaySocial.website) && (
              <div className="surface p-5">
                <h3 className="font-serif text-[14px] text-foreground mb-3">Links</h3>
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
                          className="flex-1 text-sm border border-dashed border-accent/50 rounded-tag px-2.5 py-1.5 bg-accent/5 focus:outline-none focus:border-accent"
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
            <div className="surface p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif text-[14px] text-foreground">Achievements</h3>
                <span className="text-xs text-muted-foreground"><span className="font-display">{achievements.filter(a => a.earned).length}/{achievements.length}</span> unlocked</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[...achievements.filter(a => a.earned), ...achievements.filter(a => !a.earned)].map(a => (
                  <div
                    key={a.name}
                    className={`flex items-start gap-3 p-3 rounded-tag border transition-colors ${
                      a.earned
                        ? "bg-accent/10 border-accent/30"
                        : "bg-secondary border-border opacity-40 grayscale"
                    }`}
                  >
                    <span className="text-2xl leading-none shrink-0">{a.icon}</span>
                    <div>
                      <p className="text-xs font-medium leading-tight">{a.name}</p>
                      <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{a.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Watchlist (own profile only) */}
            {isOwnProfile && (
              <WatchlistPanel reports={myReports} />
            )}

            {/* Owner links */}
            {isOwnProfile && !isEditMode && (
              <Link to="/subscribers" className="flex items-center justify-between p-4 surface surface-interactive">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-serif text-[14px] text-foreground">Subscribers &amp; Following</p>
                    <p className="text-xs text-muted-foreground">Manage your audience</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </Link>
            )}
          </div>
        )}
      </div>

      {/* ── Score modal ── */}
      {showAccModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAccModal(false)}>
          <div className="surface p-6 w-full max-w-sm" style={{ background: "hsl(var(--card))" }} onClick={e => e.stopPropagation()}>
            <h3 className="font-serif text-[16px] text-foreground mb-1">Researcher Score</h3>
            <p className="text-5xl font-medium font-display text-primary mb-1">{scoring.score}</p>
            <p className="text-xs text-muted-foreground mb-5">out of 100 · <span className="font-display">{scoring.total}</span> resolved predictions</p>
            <div className="space-y-3 mb-5">
              {[
                { label: "Win Rate",       value: scoring.rawWR != null ? `${(scoring.rawWR * 100).toFixed(1)}%` : "—",             sub: `${hitCount} wins · ${scoring.misses} losses`,                                                                   tone: "primary", bar: scoring._winRateScore },
                { label: "Profit Factor",  value: scoring.profitFactor != null ? `${scoring.profitFactor.toFixed(2)}x` : "—",        sub: `avg win ${scoring.avgWin != null ? `+${scoring.avgWin.toFixed(1)}%` : "—"} · avg loss ${scoring.avgLoss != null ? `-${scoring.avgLoss.toFixed(1)}%` : "—"}`, tone: "gain", bar: scoring._pfScore },
                scoring._alphaScore != null && { label: "Alpha vs S&P 500", value: scoring.avgAlpha != null ? `${scoring.avgAlpha >= 0 ? "+" : ""}${scoring.avgAlpha.toFixed(1)}%` : "—", sub: "excess return vs benchmark", tone: "accent", bar: scoring._alphaScore },
              ].filter(Boolean).map(item => {
                const toneClass = item.tone === "gain" ? "text-gain" : item.tone === "accent" ? "text-accent" : "text-primary";
                const barClass = item.tone === "gain" ? "bg-gain" : item.tone === "accent" ? "bg-accent" : "bg-primary";
                return (
                  <div key={item.label}>
                    <div className="flex justify-between mb-1">
                      <div>
                        <span className="text-sm font-medium">{item.label}</span>
                        <p className="text-[10px] text-muted-foreground">{item.sub}</p>
                      </div>
                      <span className={`text-sm font-medium font-display ${toneClass}`}>{item.value}</span>
                    </div>
                    {item.bar != null && (
                      <div className="h-1.5 bg-secondary rounded-tag overflow-hidden">
                        <div className={`h-full rounded-tag ${barClass}`} style={{ width: `${item.bar}%` }} />
                      </div>
                    )}
                  </div>
                );
              })}
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
        description={analyst.tagline || "Verified researcher on STOA"}
      />
    </div>
  );
}
