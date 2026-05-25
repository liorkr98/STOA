import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  Globe, Users, MessageSquare, Share2, Check,
  Lock, ChevronRight, Clock, Pencil, Save, X, Loader2, Camera, Plus,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";
import TrackChart from "@/components/charts/TrackChart";
import LockedPredictionCard from "@/components/PredictionCard";
import SubscribeCTA from "@/components/SubscribeCTA";
import ShareModal from "@/components/profile/ShareModal";
import WalletConfirmDialog from "@/components/wallet/WalletConfirmDialog";
import { CustomBlocksSection } from "@/components/profile/CustomBlocks";
import AccuracyTierBadge from "@/components/feed/AccuracyTierBadge";
import TierProgressBar from "@/components/analyst/TierProgressBar";
import { computeAvgYield } from "@/lib/yieldCalc";
import { computeAnalystTier } from "@/lib/analystTier";
import { subscribeAnalyst } from "@/lib/walletService";
import BackButton from "@/components/BackButton";
import InlineFollowButton from "@/components/feed/InlineFollowButton";

// ── Banner themes (edit mode only) ──────────────────────────────────────────
const BANNER_THEMES = {
  navy:     { label: "Navy",       bg: "var(--deepest-navy)" },
  navygold: { label: "Navy + Gold", bg: "linear-gradient(135deg, var(--deepest-navy) 0%, var(--primary-blue) 70%)" },
  slate:    { label: "Slate",      bg: "linear-gradient(135deg, #1a2842 0%, #243652 100%)" },
};

// Avatar uploader — client-side square-crop + upload through Base44.
function AvatarUploader({ onUploaded }) {
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  const cropToSquare = (file, size = 512) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const min = Math.min(img.width, img.height);
        const sx = (img.width - min) / 2;
        const sy = (img.height - min) / 2;
        const canvas = document.createElement("canvas");
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
        canvas.toBlob((blob) => {
          if (!blob) return reject(new Error("Crop failed"));
          resolve(new File([blob], "avatar.jpg", { type: "image/jpeg" }));
        }, "image/jpeg", 0.88);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });

  const handlePick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please choose an image file"); return; }
    if (file.size > 8 * 1024 * 1024) { toast.error("Image must be under 8 MB"); return; }
    setBusy(true);
    try {
      const cropped = await cropToSquare(file);
      const { file_url } = await base44.integrations.Core.UploadFile({ file: cropped });
      const me = await base44.auth.me();
      if (!me?.id) throw new Error("Could not resolve current user");
      await base44.entities.User.update(me.id, { profile_picture_url: file_url });
      onUploaded(file_url);
      // Broadcast to every avatar in the app so they refresh in-place.
      window.dispatchEvent(
        new CustomEvent("stoa-avatar-updated", { detail: { url: file_url } })
      );
      toast.success("Profile picture updated");
    } catch (err) {
      toast.error(err?.message || "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        title="Change profile picture"
        style={{
          position: "absolute",
          bottom: -4,
          right: -4,
          width: 28,
          height: 28,
          borderRadius: 6,
          background: "var(--gold-hex)",
          color: "var(--deepest-navy)",
          border: "0.5px solid var(--border-rgba)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        }}
      >
        {busy ? <Loader2 size={13} className="animate-spin"/> : <Camera size={13} strokeWidth={1.7}/>}
      </button>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePick}/>
    </>
  );
}

// ── Direction → tag class helper ─────────────────────────────────────────────
const DIR_TAG = { LONG: "tag-long", SHORT: "tag-short", Long: "tag-long", Short: "tag-short", Hold: "tag-hold" };

// ── Map a Prediction entity to the LockedPredictionCard call shape ───────────
function predictionToCall(p) {
  const status = (p.status || "active") === "active" ? "open" : "resolved";
  const outcome = (p.outcome || "").toLowerCase();
  const grade = status === "open"
    ? "OPEN"
    : outcome === "hit" ? "HIT"
    : outcome === "near" ? "NEAR"
    : outcome === "partial" ? "PARTIAL"
    : "MISS";
  const entry = Number(p.entry_price || p.locked_entry_price || 0);
  const target = Number(p.target_price || 0);
  const exit = Number(p.exit_price || p.current_price || 0);
  const change = entry && exit ? ((exit - entry) / entry) * 100 * (p.direction === "Short" ? -1 : 1) : 0;
  const created = p.created_date ? new Date(p.created_date) : new Date();
  return {
    id: p.id?.toString()?.slice(0, 6) || "p",
    ticker: p.ticker,
    dir: (p.direction || "LONG").toUpperCase(),
    entry, target, exit,
    change: Number(change.toFixed(1)),
    grade,
    date: created.toLocaleDateString("en-US", { month: "short", day: "2-digit" }),
    year: created.getFullYear(),
    days: p.timeframe_days || 90,
    thesis: p.thesis || p.headline || "",
    status,
  };
}

// ── Sentiment from predictions ───────────────────────────────────────────────
function sentimentFor(preds) {
  let long = 0, short = 0, hold = 0;
  preds.forEach((p) => {
    const d = (p.direction || "").toLowerCase();
    if (d === "long") long++;
    else if (d === "short") short++;
    else hold++;
  });
  return { long, short, hold };
}

// ── Resolved-calls table row ─────────────────────────────────────────────────
function CallRow({ call, last }) {
  const isPos = call.change >= 0;
  const isOpen = call.status === "open";
  const gradeStyle = {
    HIT: { bg: "rgba(14,107,69,0.10)", fg: "var(--rolex-green)" },
    NEAR: { bg: "rgba(14,107,69,0.06)", fg: "var(--rolex-green)" },
    PARTIAL: { bg: "rgba(212,175,55,0.10)", fg: "#8a6d2a" },
    MISS: { bg: "rgba(146,43,62,0.10)", fg: "var(--velvet-red)" },
    OPEN: { bg: "rgba(30,58,138,0.07)", fg: "var(--primary-blue)" },
  }[call.grade] || { bg: "var(--bg-soft)", fg: "var(--text-mute)" };

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "0.5fr 0.8fr 1.6fr 0.8fr 0.8fr 0.8fr 0.5fr",
      padding: "16px 18px",
      borderBottom: last ? "none" : "0.5px solid var(--border-rgba)",
      alignItems: "center",
    }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span className="t-num" style={{ fontSize: 12, color: "var(--text)" }}>{call.date}</span>
        <span className="t-meta" style={{ fontSize: 10.5 }}>{call.year}</span>
      </div>
      <div>
        <span className={`tag ${DIR_TAG[call.dir] || "tag-hold"}`}>
          {call.dir} {call.ticker}
        </span>
      </div>
      <div style={{ paddingRight: 18 }}>
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: "var(--text-body)" }}>
          {call.thesis || "—"}
        </p>
        <span className="receipt" style={{ fontSize: 10.5, marginTop: 4, display: "inline-flex" }}>
          <Lock size={10} strokeWidth={1.5}/> {call.days}d window
        </span>
      </div>
      <div className="t-num" style={{ fontSize: 12, color: "var(--text)" }}>
        ${call.entry.toFixed(2)} <span style={{ color: "var(--text-meta)", margin: "0 4px" }}>→</span> ${call.target.toFixed(2)}
      </div>
      <div className="t-num" style={{ fontSize: 12, color: isOpen ? "var(--text-meta)" : "var(--text)" }}>
        {isOpen ? "—" : `$${call.exit.toFixed(2)}`}
      </div>
      <div className="t-num" style={{
        fontSize: 13,
        color: isOpen ? "var(--text-meta)" : (isPos ? "var(--rolex-green)" : "var(--velvet-red)"),
      }}>
        {isOpen ? "Tracking" : `${call.change > 0 ? "+" : ""}${call.change}%`}
      </div>
      <div>
        <span style={{
          fontSize: 10.5, fontWeight: 500, padding: "3px 8px", borderRadius: 4,
          letterSpacing: "0.08em", textTransform: "uppercase",
          background: gradeStyle.bg, color: gradeStyle.fg,
        }}>{call.grade}</span>
      </div>
    </div>
  );
}

// ── Track record tab ─────────────────────────────────────────────────────────
function TrackRecordTab({ analyst, calls, trackSeries, gradeStats }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Elo chart hero */}
      <div className="surface" style={{ padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <div>
            <div className="t-eyebrow">Elo rating · all time</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
              <span className="t-num" style={{ fontSize: 34, color: "var(--primary-blue)", letterSpacing: "-0.02em" }}>
                {analyst.elo}
              </span>
              {analyst.eloDelta != null && (
                <span className="t-num" style={{ fontSize: 14, color: analyst.eloDelta >= 0 ? "var(--rolex-green)" : "var(--velvet-red)" }}>
                  {analyst.eloDelta >= 0 ? "+" : ""}{analyst.eloDelta}
                </span>
              )}
              <span className="t-meta">since launch</span>
            </div>
          </div>
          <div style={{
            display: "flex", gap: 6, padding: 3,
            border: "0.5px solid var(--border-strong)", borderRadius: 6,
          }}>
            {["1M", "3M", "6M", "1Y", "ALL"].map((r) => (
              <span key={r} className="btn btn-sm" style={{
                height: 24, padding: "0 10px", fontSize: 11,
                background: r === "ALL" ? "var(--deepest-navy)" : "transparent",
                color: r === "ALL" ? "#fff" : "var(--text-mute)",
                borderRadius: 4,
              }}>{r}</span>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 18 }}>
          {trackSeries.length > 0 ? (
            <TrackChart
              data={trackSeries}
              calls={calls.filter((c) => c.status === "resolved").map((c) => ({
                dir: c.dir, ticker: c.ticker, change: c.change,
              }))}
            />
          ) : (
            <div style={{ height: 240, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span className="t-meta">No Elo history yet.</span>
            </div>
          )}
        </div>
        <div style={{
          display: "flex", gap: 24, marginTop: 16, paddingTop: 16,
          borderTop: "0.5px solid var(--border-rgba)",
        }}>
          {[
            ["Stoic", "1200–1400", "var(--gold-hex)"],
            ["Disciple", "1000–1200", "var(--primary-blue)"],
            ["Adept", "800–1000", "var(--text-mute)"],
            ["Novitiate", "600–800", "var(--text-meta)"],
          ].map(([tier, range, color]) => (
            <div key={tier} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 8, height: 8, background: color, borderRadius: 2 }}/>
              <span className="t-meta" style={{ fontSize: 11.5, color: "var(--text-mute)" }}>{tier}</span>
              <span className="t-meta" style={{ fontSize: 11.5 }}>{range}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Grade distribution */}
      <div className="surface" style={{ padding: 24 }}>
        <div className="t-eyebrow" style={{ marginBottom: 18 }}>
          Grade distribution · {gradeStats.total} resolved
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
          {[
            { l: "Hit", v: gradeStats.hit, c: "var(--rolex-green)", note: "Target reached within window" },
            { l: "Near", v: gradeStats.near, c: "var(--green-light)", note: "Within 5% of target" },
            { l: "Partial", v: gradeStats.partial, c: "var(--gold-hex)", note: "50–95% of target move" },
            { l: "Miss", v: gradeStats.miss, c: "var(--velvet-red)", note: "Reverse direction / no progress" },
            { l: "Open", v: gradeStats.open, c: "var(--primary-blue)", note: "Window not yet closed" },
          ].map((g) => {
            const denom = gradeStats.total + gradeStats.open || 1;
            return (
              <div key={g.l}>
                <div style={{ height: 4, background: "var(--border-rgba)", borderRadius: 2, overflow: "hidden", marginBottom: 10 }}>
                  <div style={{ height: "100%", width: `${(g.v / denom) * 100}%`, background: g.c }}/>
                </div>
                <div className="t-num" style={{ fontSize: 24, color: g.c, letterSpacing: "-0.02em" }}>{g.v}</div>
                <div className="t-meta" style={{ marginTop: 4, color: "var(--text)" }}>{g.l}</div>
                <div className="t-meta" style={{ fontSize: 11, marginTop: 4, lineHeight: 1.4 }}>{g.note}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Resolved calls table */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
          <h3 className="t-title" style={{ fontSize: 18, margin: 0 }}>Every call. On the record.</h3>
          <span className="t-meta">{calls.length} total</span>
        </div>
        <div className="surface" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "0.5fr 0.8fr 1.6fr 0.8fr 0.8fr 0.8fr 0.5fr",
            padding: "12px 18px",
            borderBottom: "0.5px solid var(--border-rgba)",
            background: "var(--bg-elev)",
          }}>
            {["Date", "Position", "Thesis", "Entry → Target", "Outcome", "Return", "Grade"].map((h) => (
              <div key={h} className="t-meta" style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.10em" }}>
                {h}
              </div>
            ))}
          </div>
          {calls.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center" }}>
              <span className="t-meta">No locked predictions yet.</span>
            </div>
          ) : (
            calls.map((c, i) => <CallRow key={c.id + i} call={c} last={i === calls.length - 1}/>)
          )}
        </div>
      </div>
    </div>
  );
}

// ── Research tab ─────────────────────────────────────────────────────────────
function ResearchTab({ reports, navigate }) {
  if (!reports.length) {
    return (
      <div className="surface" style={{ padding: 40, textAlign: "center" }}>
        <span className="t-meta">No research published yet.</span>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {reports.map((r) => (
        <article
          key={r.id}
          className="surface surface-interactive"
          style={{ padding: 22, cursor: "pointer" }}
          onClick={() => navigate(`/report?id=${r.id}`)}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span className="tag" style={{ borderColor: "rgba(30,58,138,0.25)", color: "var(--primary-blue)" }}>
              {(r.kind || "REPORT").toUpperCase()}
            </span>
            {r.is_premium && <span className="badge-founding">Premium</span>}
            <span className="t-meta">·</span>
            <span className="t-meta">
              {r.created_date ? new Date(r.created_date).toLocaleDateString() : ""}
            </span>
            <div style={{ flex: 1 }}/>
            {r.read_time_min && (
              <span className="t-meta" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Clock size={12} strokeWidth={1.5}/> {r.read_time_min} min
              </span>
            )}
          </div>
          <h3 className="t-title" style={{ fontSize: 18, lineHeight: 1.3, margin: "0 0 8px" }}>
            {r.title || "Untitled"}
          </h3>
          {r.excerpt && (
            <p className="t-body" style={{ fontSize: 14, lineHeight: 1.6, color: "var(--text-mute)", margin: 0 }}>
              {r.excerpt}
            </p>
          )}
        </article>
      ))}
    </div>
  );
}

// ── Predictions tab ──────────────────────────────────────────────────────────
function PredictionsTab({ open, resolved, analyst }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <h3 className="t-title" style={{ fontSize: 18, margin: 0 }}>Open positions</h3>
          <span className="t-meta">{open.length} live · grading on close</span>
        </div>
        {open.length === 0 ? (
          <div className="surface" style={{ padding: 32, textAlign: "center" }}>
            <span className="t-meta">No open positions.</span>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {open.map((c) => <LockedPredictionCard key={c.id} call={c} analyst={analyst}/>)}
          </div>
        )}
      </div>
      <div>
        <h3 className="t-title" style={{ fontSize: 18, margin: "0 0 12px" }}>Recently resolved</h3>
        {resolved.length === 0 ? (
          <div className="surface" style={{ padding: 32, textAlign: "center" }}>
            <span className="t-meta">No resolved calls yet.</span>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {resolved.slice(0, 6).map((c) => (
              <LockedPredictionCard key={c.id} call={c} analyst={analyst} compact/>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── About tab ────────────────────────────────────────────────────────────────
function AboutTab({ analyst }) {
  return (
    <div className="surface" style={{ padding: 32 }}>
      <h3 className="t-title" style={{ fontSize: 20, margin: "0 0 16px" }}>About the research</h3>
      <div style={{ fontFamily: "var(--f-serif)", fontSize: 16, lineHeight: 1.7, color: "var(--text-body)" }}>
        {analyst.bio ? (
          analyst.bio.split("\n\n").map((p, i) => <p key={i}>{p}</p>)
        ) : (
          <p>This researcher hasn't published a bio yet.</p>
        )}
      </div>
      <div className="hr" style={{ margin: "28px 0" }}/>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 28 }}>
        {[
          { l: "Coverage universe", v: analyst.specialties?.join(", ") || "—" },
          { l: "Publishing cadence", v: "2–3 reports / mo" },
          { l: "Avg. holding period", v: analyst.avgHolding || "—" },
          { l: "Verification", v: "Auto · price-locked" },
        ].map((r) => (
          <div key={r.l}>
            <div className="t-meta">{r.l}</div>
            <div className="t-body" style={{ marginTop: 4, color: "var(--text)", fontSize: 14 }}>{r.v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Sentiment breakdown ──────────────────────────────────────────────────────
function SentimentBreakdown({ sentiment }) {
  const total = sentiment.long + sentiment.short + sentiment.hold || 1;
  const longPct = (sentiment.long / total) * 100;
  const shortPct = (sentiment.short / total) * 100;
  const holdPct = (sentiment.hold / total) * 100;
  return (
    <div className="surface" style={{ padding: 22 }}>
      <div className="t-eyebrow" style={{ marginBottom: 14 }}>Position bias</div>
      <div style={{ display: "flex", height: 6, borderRadius: 3, overflow: "hidden", marginBottom: 14 }}>
        <div style={{ width: longPct + "%", background: "var(--rolex-green)" }}/>
        <div style={{ width: shortPct + "%", background: "var(--velvet-red)" }}/>
        <div style={{ width: holdPct + "%", background: "var(--text-faint)" }}/>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {[
          ["Long", sentiment.long, longPct, "var(--rolex-green)"],
          ["Short", sentiment.short, shortPct, "var(--velvet-red)"],
          ["Hold", sentiment.hold, holdPct, "var(--text-faint)"],
        ].map(([l, n, p, c]) => (
          <div key={l} style={{ display: "flex", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 8, height: 8, background: c, borderRadius: 2 }}/>
              <span style={{ fontSize: 13, color: "var(--text)" }}>{l}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="t-num" style={{ fontSize: 13 }}>{n}</span>
              <span className="t-meta" style={{ fontSize: 11, width: 32, textAlign: "right" }}>{p.toFixed(0)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * AnalystProfilePage — v3 rebuild.
 * Layout per prototype/src/screens/profile.jsx: ambient header (avatar + name +
 * bio + action stack), KPI strip, tabs (Track / Research / Predictions / About),
 * sidebar with Subscribe + sentiment + sector mix.
 */
export default function AnalystProfilePage() {
  const navigate = useNavigate();
  const { username } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user: currentUser, isAuthenticated } = useAuth();

  const [analyst, setAnalyst] = useState(null);
  const [reports, setReports] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("track");
  const [subscribed, setSubscribed] = useState(false);
  const [subBusy, setSubBusy] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showWalletConfirm, setShowWalletConfirm] = useState(false);

  // ── Edit-mode state ──
  const [isEditMode, setIsEditMode] = useState(false);
  const [editBio, setEditBio] = useState("");
  const [editTagline, setEditTagline] = useState("");
  const [editSpecialties, setEditSpecialties] = useState([]);
  const [newSpecialty, setNewSpecialty] = useState("");
  const [editBanner, setEditBanner] = useState("navy");
  const [editCustomBlocks, setEditCustomBlocks] = useState([]);
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const allUsers = await base44.entities.User.list("-created_date", 200).catch(() => []);
        const u = username
          ? allUsers.find((x) =>
              (x.username && x.username.toLowerCase() === username.toLowerCase()) ||
              (x.email && x.email.toLowerCase() === username.toLowerCase()) ||
              x.id === username
            )
          : (isAuthenticated && currentUser ? allUsers.find((x) => x.email === currentUser.email) : allUsers[0]);

        if (!u || cancelled) { setLoading(false); return; }
        setAnalyst(u);

        const [reportList, predList] = await Promise.all([
          base44.entities.Report.filter({ created_by: u.email }, "-created_date", 50).catch(() => []),
          base44.entities.Prediction.filter({ created_by: u.email }, "-created_date", 100).catch(() => []),
        ]);
        if (cancelled) return;
        setReports(reportList || []);
        setPredictions(predList || []);

        if (isAuthenticated && currentUser) {
          const subs = await base44.entities.Subscription
            .filter({ subscriber_email: currentUser.email, analyst_email: u.email, status: "active" })
            .catch(() => []);
          if (!cancelled) setSubscribed((subs || []).length > 0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [username, isAuthenticated, currentUser]);

  const calls = useMemo(() => predictions.map(predictionToCall), [predictions]);
  const openCalls = calls.filter((c) => c.status === "open");
  const resolvedCalls = calls.filter((c) => c.status === "resolved");

  const gradeStats = useMemo(() => {
    const stats = { hit: 0, near: 0, partial: 0, miss: 0, open: 0, total: 0 };
    calls.forEach((c) => {
      const g = c.grade.toLowerCase();
      if (g === "hit") stats.hit++;
      else if (g === "near") stats.near++;
      else if (g === "partial") stats.partial++;
      else if (g === "miss") stats.miss++;
      else if (g === "open") stats.open++;
    });
    stats.total = stats.hit + stats.near + stats.partial + stats.miss;
    return stats;
  }, [calls]);

  const sentiment = useMemo(() => sentimentFor(predictions), [predictions]);

  // Synthesized Elo trajectory (Base44 doesn't store week-by-week history)
  const trackSeries = useMemo(() => {
    if (!analyst) return [];
    const elo = analyst.elo ?? Math.round(((analyst.accuracy_score || 60) / 100) * 800 + 600);
    const start = Math.max(600, elo - 600);
    const N = 20;
    const series = [];
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      series.push(Math.round(start + (elo - start) * t));
    }
    return series;
  }, [analyst]);

  const scoring = useMemo(() => {
    try { return computeScore ? computeScore(reports.filter((r) => r.prediction_outcome)) : null; }
    catch { return null; }
  }, [reports]);

  // Open the wallet-confirm dialog rather than subscribing directly. The
  // dialog shows current balance + cost + new balance and only fires the
  // actual subscribe call once the user confirms.
  // ── Own-profile check + edit mode handlers ──
  const isOwnProfile = isAuthenticated && currentUser && analyst && (
    analyst.id === currentUser.id ||
    (analyst.email && currentUser.email && analyst.email.toLowerCase() === currentUser.email.toLowerCase())
  );

  const parseProfileConfig = (a) => {
    try { return JSON.parse(a?.profile_config || "{}"); } catch { return {}; }
  };

  const enterEditMode = () => {
    if (!analyst) return;
    const cfg = parseProfileConfig(analyst);
    setEditBio(analyst.bio || "");
    setEditTagline(analyst.tagline || "");
    setEditSpecialties([...(analyst.specialties || [])]);
    setEditBanner(cfg.banner || "navy");
    setEditCustomBlocks(cfg.custom_blocks || []);
    setIsEditMode(true);
  };

  const cancelEditMode = () => {
    setIsEditMode(false);
    setNewSpecialty("");
  };

  const saveProfile = async () => {
    if (!analyst || savingProfile) return;
    setSavingProfile(true);
    try {
      const cfg = { ...parseProfileConfig(analyst), banner: editBanner, custom_blocks: editCustomBlocks };
      const updates = {
        bio: editBio,
        tagline: editTagline,
        specialties: editSpecialties,
        profile_config: JSON.stringify(cfg),
      };
      await base44.entities.User.update(analyst.id, updates);
      setAnalyst((prev) => ({ ...prev, ...updates }));
      setIsEditMode(false);
      toast.success("Profile saved.");
    } catch (err) {
      toast.error(err?.message || "Save failed.");
    } finally {
      setSavingProfile(false);
    }
  };

  // Auto-enter edit mode when ?edit=1 (e.g. from the Studio "Edit My Profile" CTA)
  useEffect(() => {
    if (!analyst || !currentUser) return;
    const wantsEdit = searchParams.get("edit") === "1";
    if (wantsEdit && isOwnProfile && !isEditMode) {
      enterEditMode();
      searchParams.delete("edit");
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analyst, currentUser, searchParams]);

  const handleSubscribe = () => {
    if (!isAuthenticated) { navigate("/signin"); return; }
    if (!analyst) return;
    if (subscribed) { toast.info("Manage subscriptions on the Wallet page."); return; }
    setShowWalletConfirm(true);
  };

  const confirmSubscribe = async () => {
    if (!analyst) return;
    setSubBusy(true);
    try {
      await subscribeAnalyst(analyst.email, analyst.monthly_price || 9);
      setSubscribed(true);
      toast.success(`Subscribed to ${analyst.full_name || "researcher"}.`);
    } catch (e) {
      toast.error(e?.message || "Subscribe failed");
      throw e;
    } finally {
      setSubBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="page" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 120 }}>
        <span className="t-meta">Loading researcher…</span>
      </div>
    );
  }

  if (!analyst) {
    return (
      <div className="page" style={{ padding: 120, textAlign: "center" }}>
        <h2 className="t-display" style={{ fontSize: 28 }}>Researcher not found</h2>
        <p className="t-meta" style={{ marginTop: 8 }}>Try <Link to="/feed">browsing the feed</Link>.</p>
      </div>
    );
  }

  const elo = analyst.elo ?? Math.round(((analyst.accuracy_score || 60) / 100) * 800 + 600);
  const tier = elo >= 1200 ? "Stoic" : elo >= 1000 ? "Disciple" : elo >= 800 ? "Adept" : "Novitiate";
  const rank = analyst.rank || analyst.leaderboard_rank;
  const price = analyst.monthly_price || 9;
  const subscribers = analyst.subscribers_count || analyst.followers_count || 0;
  const avgReturn = computeAvgYield ? computeAvgYield(reports) : null;
  const initials = (analyst.full_name || analyst.email || "?")
    .split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  const tabs = [
    { id: "track", label: "Track record" },
    { id: "research", label: "Research" },
    { id: "predictions", label: "Predictions" },
    { id: "about", label: "About" },
  ];

  const profileConfig = parseProfileConfig(analyst);
  const activeBannerKey = isEditMode ? editBanner : (profileConfig.banner || "navy");
  const activeBanner = BANNER_THEMES[activeBannerKey] || BANNER_THEMES.navy;
  const displayBio = isEditMode ? editBio : (analyst.bio || "");
  const displayTagline = isEditMode ? editTagline : (analyst.tagline || analyst.bio?.split("\n")[0] || "Researcher on Stoa.");
  const displaySpecialties = isEditMode ? editSpecialties : (analyst.specialties || []);
  const profileCustomBlocks = isEditMode ? editCustomBlocks : (profileConfig.custom_blocks || []);

  return (
    <div className="page" style={{ background: "var(--bg)" }}>
      {/* ── Sticky edit bar (edit mode only) ── */}
      {isEditMode && (
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 50,
            background: "color-mix(in srgb, var(--gold-hex) 14%, var(--bg))",
            borderBottom: "0.5px solid rgba(212,175,55,0.4)",
            backdropFilter: "blur(18px)",
            WebkitBackdropFilter: "blur(18px)",
            padding: "10px 0",
          }}
        >
          <div className="shell" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Pencil size={14} strokeWidth={1.7} style={{ color: "var(--gold-hex)" }}/>
            <span className="t-title" style={{ fontSize: 13 }}>Editing your profile</span>
            <span className="t-meta" style={{ fontSize: 11 }}>· Changes are private until you save</span>
            <div style={{ flex: 1 }}/>
            <button className="btn btn-ghost btn-sm" onClick={cancelEditMode}>
              <X size={13} strokeWidth={1.7}/> Cancel
            </button>
            <button className="btn btn-gold btn-sm" disabled={savingProfile} onClick={saveProfile}>
              {savingProfile ? <Loader2 size={13} className="animate-spin"/> : <Save size={13} strokeWidth={1.7}/>}
              {savingProfile ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      )}

      {/* ── Banner (edit mode only — sets the chrome behind the avatar) ── */}
      {isEditMode && (
        <div
          style={{
            height: 110,
            background: activeBanner.bg,
            position: "relative",
            overflow: "hidden",
            borderBottom: "0.5px solid var(--border-rgba)",
          }}
        >
          <div
            style={{
              position: "absolute",
              bottom: 10,
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              gap: 8,
              padding: "8px 12px",
              background: "rgba(0,0,0,0.35)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              borderRadius: 6,
            }}
          >
            <span className="t-meta" style={{ color: "rgba(255,255,255,0.75)", fontSize: 11, alignSelf: "center" }}>
              Banner:
            </span>
            {Object.entries(BANNER_THEMES).map(([key, theme]) => (
              <button
                key={key}
                onClick={() => setEditBanner(key)}
                title={theme.label}
                aria-label={`Banner: ${theme.label}`}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 4,
                  background: theme.bg,
                  border: "0.5px solid",
                  borderColor: editBanner === key ? "var(--gold-hex)" : "rgba(255,255,255,0.4)",
                  boxShadow: editBanner === key ? "0 0 0 2px var(--gold-hex)" : "none",
                  cursor: "pointer",
                  padding: 0,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Profile header — navy hero ── */}
      <section className="ambient profile-navy-hero" style={{
        padding: "44px 0 0",
        borderBottom: "0.5px solid var(--border-rgba)",
        background: "var(--deepest-navy)",
        color: "#fff",
        position: "relative",
        overflow: "hidden",
      }}>
        <style>{`
          .profile-navy-hero::before { background: var(--primary-blue); opacity: 0.22; }
          .profile-navy-hero::after  { background: var(--gold-hex); opacity: 0.10; }
          .profile-navy-hero .t-meta { color: rgba(255,255,255,0.55); }
          .profile-navy-hero .t-display { color: #fff; }
          .profile-navy-hero .t-title { color: #fff; }
          .profile-navy-hero .receipt { color: rgba(255,255,255,0.55); }
          .profile-navy-hero .tag {
            background: rgba(255,255,255,0.06);
            border-color: rgba(255,255,255,0.18);
            color: rgba(255,255,255,0.78);
          }
          .profile-navy-hero .t-body { color: rgba(255,255,255,0.78); }
          .profile-navy-hero .nav-link { color: rgba(255,255,255,0.65); }
          .profile-navy-hero .nav-link.active { color: #fff; }
        `}</style>
        <div className="shell" style={{ position: "relative", zIndex: 1 }}>
          <div style={{ marginBottom: 14 }}>
            <BackButton fallback="/feed" />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 28 }}>
            <span className="t-meta" style={{ cursor: "pointer" }} onClick={() => navigate("/feed")}>Discover</span>
            <ChevronRight size={12} style={{ color: "rgba(255,255,255,0.40)" }}/>
            <span className="t-meta" style={{ color: "#fff" }}>{analyst.full_name || analyst.email}</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 32, alignItems: "flex-start" }}>
            {/* Avatar (+ camera badge in edit mode) */}
            <div style={{ position: "relative" }}>
              {(analyst.profile_picture_url || analyst.picture) ? (
                <img
                  src={analyst.profile_picture_url || analyst.picture}
                  alt={analyst.full_name || ""}
                  className="av av-xl"
                  style={{
                    objectFit: "cover",
                    background: "var(--primary-blue)",
                    boxShadow: "0 0 0 4px var(--deepest-navy), 0 0 0 5px var(--gold-hex)",
                  }}
                />
              ) : (
                <div className="av av-xl" style={{
                  background: "var(--primary-blue)",
                  boxShadow: "0 0 0 4px var(--deepest-navy), 0 0 0 5px var(--gold-hex)",
                }}>
                  {initials}
                </div>
              )}
              {isEditMode && isOwnProfile && (
                <AvatarUploader
                  onUploaded={(url) => setAnalyst((a) => ({ ...a, profile_picture_url: url }))}
                />
              )}
              {rank && !isEditMode && (
                <div style={{ position: "absolute", bottom: -6, left: "50%", transform: "translateX(-50%)" }}>
                  <span className="badge-founding">{tier} · #{rank}</span>
                </div>
              )}
            </div>

            {/* Identity */}
            <div style={{ paddingTop: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
                <h1 className="t-display" style={{ fontSize: 38, margin: 0, letterSpacing: "-0.018em" }}>
                  {analyst.full_name || analyst.email?.split("@")[0]}
                </h1>
                {analyst.username && (
                  <span className="receipt" style={{ fontSize: 11 }}>@{analyst.username}</span>
                )}
              </div>
              {isEditMode ? (
                <input
                  value={editTagline}
                  onChange={(e) => setEditTagline(e.target.value)}
                  placeholder="Add a tagline…"
                  className="t-body"
                  style={{
                    width: "100%",
                    maxWidth: 580,
                    margin: "0 0 14px",
                    background: "var(--bg-elev)",
                    border: "0.5px dashed rgba(212,175,55,0.55)",
                    borderRadius: 6,
                    padding: "8px 10px",
                    fontSize: 15,
                    color: "var(--text)",
                    outline: "none",
                  }}
                />
              ) : (
                <p className="t-body" style={{ fontSize: 15, color: "var(--text-mute)", margin: "0 0 14px", maxWidth: 580, lineHeight: 1.55 }}>
                  {displayTagline}
                </p>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                {analyst.location && (
                  <span className="t-meta" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <Globe size={12} strokeWidth={1.5}/> {analyst.location}
                  </span>
                )}
                <span className="t-meta">·</span>
                <span className="t-meta" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Users size={12} strokeWidth={1.5}/>
                  {subscribers.toLocaleString()} subscribers
                </span>
                {!isEditMode && displaySpecialties.slice(0, 3).map((s) => (
                  <React.Fragment key={s}>
                    <span className="t-meta">·</span>
                    <span className="tag">{s}</span>
                  </React.Fragment>
                ))}
              </div>

              {/* Specialties editor — edit mode only */}
              {isEditMode && (
                <div style={{ marginTop: 14 }}>
                  <div className="t-meta" style={{ fontSize: 11, marginBottom: 6 }}>Specialties</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                    {editSpecialties.map((s) => (
                      <span key={s} className="tag" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        {s}
                        <button
                          type="button"
                          aria-label={`Remove ${s}`}
                          onClick={() => setEditSpecialties((p) => p.filter((x) => x !== s))}
                          style={{ background: "transparent", border: 0, color: "inherit", padding: 0, cursor: "pointer", display: "inline-flex" }}
                        >
                          <X size={10} strokeWidth={1.8}/>
                        </button>
                      </span>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input
                      value={newSpecialty}
                      onChange={(e) => setNewSpecialty(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newSpecialty.trim()) {
                          setEditSpecialties((p) => [...p, newSpecialty.trim()]);
                          setNewSpecialty("");
                        }
                      }}
                      placeholder="Add specialty (e.g. Tech, Macro)…"
                      style={{
                        flex: 1,
                        maxWidth: 280,
                        background: "var(--bg-elev)",
                        border: "0.5px dashed rgba(212,175,55,0.55)",
                        borderRadius: 6,
                        padding: "6px 10px",
                        fontSize: 12,
                        color: "var(--text)",
                        outline: "none",
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        if (newSpecialty.trim()) {
                          setEditSpecialties((p) => [...p, newSpecialty.trim()]);
                          setNewSpecialty("");
                        }
                      }}
                    >
                      <Plus size={12} strokeWidth={1.7}/> Add
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "stretch", minWidth: 240 }}>
              {/* Owner-only: Edit profile toggles the inline edit surface */}
              {isOwnProfile && !isEditMode && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={enterEditMode}
                  style={{ justifyContent: "center" }}
                >
                  <Pencil size={13} strokeWidth={1.7}/> Edit profile
                </button>
              )}
              <button
                onClick={handleSubscribe}
                disabled={subBusy}
                className={subscribed ? "btn btn-ghost btn-lg" : "btn btn-gold btn-lg"}
                style={{ minWidth: 220, justifyContent: "space-between", gap: 14 }}
              >
                {subscribed ? (
                  <><Check size={15} strokeWidth={1.7}/> Subscribed</>
                ) : (
                  <>
                    <span>Subscribe</span>
                    <span style={{ fontFamily: "var(--f-mono)", fontSize: 13, opacity: 0.72, fontWeight: 500 }}>
                      ${price}/mo
                    </span>
                  </>
                )}
              </button>
              <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
                {/* Follow is FREE and independent from Subscribe (paid).
                    InlineFollowButton hides itself when viewing your own
                    profile or unauthenticated. */}
                <div style={{ flex: 1, display: "flex" }}>
                  <InlineFollowButton
                    analystEmail={analyst.email}
                    analystName={analyst.full_name}
                    analystAvatar={analyst.profile_picture_url || ""}
                  />
                </div>
                <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => navigate("/dm")}>
                  <MessageSquare size={13} strokeWidth={1.6}/> Message
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ width: 38, padding: 0 }}
                  onClick={() => setShowShare(true)}
                  aria-label="Share profile"
                >
                  <Share2 size={13} strokeWidth={1.6}/>
                </button>
              </div>
              <div className="t-meta" style={{ fontSize: 11, textAlign: "center", marginTop: 6, color: "var(--text-meta)" }}>
                Cancel anytime · 90% goes to {(analyst.full_name || "the analyst").split(" ")[0]}
              </div>
            </div>
          </div>

          {/* KPI strip — sits at the bottom edge of the navy hero */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 0,
            marginTop: 40,
            borderTop: "0.5px solid rgba(255,255,255,0.14)",
            borderBottom: "0.5px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.03)",
          }}>
            {[
              { l: "Elo Rating", v: elo, sub: `${tier}${rank ? ` · #${rank}` : ""}`, tone: "gold" },
              { l: "Accuracy", v: `${analyst.accuracy_score || 0}%`, sub: `${gradeStats.total} resolved` },
              { l: "Total Calls", v: calls.length, sub: `${openCalls.length} open · ${resolvedCalls.length} closed` },
              { l: "Avg. Return", v: avgReturn != null ? `${avgReturn >= 0 ? "+" : ""}${avgReturn.toFixed(1)}%` : "—", sub: "Per resolved call", tone: avgReturn != null && avgReturn < 0 ? "red" : "green" },
              { l: "Subscribers", v: subscribers.toLocaleString(), sub: analyst.subscribers_growth ? `+${analyst.subscribers_growth} this mo.` : "" },
            ].map((s, i) => (
              <div key={i} style={{ padding: "20px 22px", borderRight: i < 4 ? "0.5px solid rgba(255,255,255,0.14)" : "none" }}>
                <div className="t-meta" style={{ color: "rgba(255,255,255,0.55)" }}>{s.l}</div>
                <div className="t-num" style={{
                  fontSize: 26, marginTop: 6, letterSpacing: "-0.02em",
                  color: s.tone === "green" ? "#7AD6A3" : s.tone === "red" ? "#E58B97" : s.tone === "gold" ? "var(--gold-light-hex)" : "#fff",
                }}>
                  {s.v}
                </div>
                {s.sub && <div className="t-meta" style={{ marginTop: 4, fontSize: 11, color: "rgba(255,255,255,0.45)" }}>{s.sub}</div>}
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div role="tablist" aria-label="Analyst profile sections" style={{ display: "flex", gap: 28, padding: "20px 0 0" }}>
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                className={"nav-link" + (tab === t.id ? " active" : "")}
                onClick={() => setTab(t.id)}
                style={{ paddingBottom: 16, fontSize: 13, letterSpacing: "0.04em", fontWeight: 500, background: "transparent", border: 0, cursor: "pointer", fontFamily: "inherit" }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Body ── */}
      <div className="shell" style={{
        padding: "32px 32px 96px",
        display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 32,
      }}>
        <main>
          {tab === "track" && (
            <TrackRecordTab
              analyst={{ elo, eloDelta: 782 }}
              calls={calls}
              trackSeries={trackSeries}
              gradeStats={gradeStats}
            />
          )}
          {tab === "research" && <ResearchTab reports={reports} navigate={navigate}/>}
          {tab === "predictions" && <PredictionsTab open={openCalls} resolved={resolvedCalls} analyst={analyst}/>}
          {tab === "about" && (
            <>
              {/* Bio editor (edit mode) — restyled with .surface + v2 tokens */}
              {isEditMode ? (
                <div className="surface" style={{ padding: 24, marginBottom: 20 }}>
                  <div className="t-eyebrow" style={{ marginBottom: 10 }}>About</div>
                  <textarea
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    rows={6}
                    placeholder="Your background, methodology, what you focus on…"
                    style={{
                      width: "100%",
                      background: "var(--bg-elev)",
                      border: "0.5px dashed rgba(212,175,55,0.55)",
                      borderRadius: 6,
                      padding: "10px 12px",
                      fontFamily: "var(--f-serif)",
                      fontSize: 15,
                      lineHeight: 1.6,
                      color: "var(--text-body)",
                      resize: "vertical",
                      outline: "none",
                    }}
                  />
                </div>
              ) : (
                <AboutTab analyst={{ ...analyst, bio: displayBio, specialties: displaySpecialties }}/>
              )}
              {/* Custom researcher blocks — text / link-tree / image / chart.
                  Read-only on the public profile; editable when the owner is
                  in edit mode (writes go through saveProfile). */}
              <div style={{ marginTop: 20 }}>
                <CustomBlocksSection
                  blocks={profileCustomBlocks}
                  isEditMode={isEditMode}
                  onChange={isEditMode ? setEditCustomBlocks : undefined}
                />
              </div>
            </>
          )}
        </main>

        <aside style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <SubscribeCTA
            analyst={{
              name: analyst.full_name || "this analyst",
              price,
              founding: analyst.is_founding || rank <= 25,
            }}
            subscribed={subscribed}
            onSubscribe={handleSubscribe}
          />
          <SentimentBreakdown sentiment={sentiment}/>

          {/* Tier progress + achievements — restored from backup */}
          {(() => {
            const tierData = computeAnalystTier ? computeAnalystTier(analyst) : null;
            return tierData ? (
              <div className="surface" style={{ padding: 22 }}>
                <div className="t-eyebrow" style={{ marginBottom: 12 }}>Tier progress</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <AccuracyTierBadge accuracy={analyst.accuracy_score || 0}/>
                </div>
                <TierProgressBar tier={tierData}/>
              </div>
            ) : null;
          })()}
        </aside>
      </div>

      {/* ── Modals ── */}
      <ShareModal
        open={showShare}
        onClose={() => setShowShare(false)}
        url={typeof window !== "undefined" ? window.location.href : ""}
        title={`${analyst.full_name || "Researcher"} on Stoa`}
        description={analyst.tagline || analyst.bio?.split("\n")[0] || ""}
      />
      <WalletConfirmDialog
        open={showWalletConfirm}
        onClose={() => setShowWalletConfirm(false)}
        onConfirm={async () => { await confirmSubscribe(); setShowWalletConfirm(false); }}
        title={`Subscribe to ${(analyst.full_name || "researcher").split(" ")[0]}`}
        amountUSD={price}
        itemLabel={`${analyst.full_name || analyst.email} · monthly subscription`}
        showSplit
        confirmLabel={subBusy ? "Subscribing…" : `Confirm · $${price}/mo`}
      />
    </div>
  );
}
