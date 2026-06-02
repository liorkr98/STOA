/**
 * ReportSidebar — NotebookLM-style context panel for the report reading view.
 *
 * Contains:
 *   1. AI key takeaways (lazily generated)
 *   2. Prediction summary card (if report has a prediction)
 *   3. Analyst mini-profile + subscribe CTA
 *   4. Tickers mentioned in this report
 *   5. Related reports from the same analyst
 */
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles, TrendingUp, TrendingDown, Minus, Lock, Target,
  Users, BadgeCheck, ChevronRight, Loader2, BookOpen, RefreshCw,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { computeScore, computeTier } from "@/lib/scoringEngine";
import AccuracyTierBadge from "@/components/feed/AccuracyTierBadge";
import { cn } from "@/lib/utils";

// ── Key Takeaways (AI) ────────────────────────────────────────────────────────
function KeyTakeawaysCard({ report, blocks }) {
  const [takeaways, setTakeaways] = useState(null);
  const [loading, setLoading]   = useState(false);

  const generate = async () => {
    if (loading || takeaways) return;
    setLoading(true);
    try {
      const textContent = [
        report?.title || "",
        report?.excerpt || "",
        ...(blocks || [])
          .filter(b => ["p", "dek", "h", "heading", "pullquote", "callout"].includes(b.type))
          .map(b => b.text || b.content || "")
          .filter(Boolean),
      ].join("\n").slice(0, 4000);

      const result = await base44.functions.invoke("aiProxy", {
        messages: [{
          role: "user",
          content: `Extract 4–6 key takeaways from this financial research report. Return a JSON array of short strings (max 15 words each). Focus on: the main thesis, key risks, price targets, and action items. Report:\n\n${textContent}\n\nReturn only a valid JSON array of strings.`,
        }],
      });

      const raw = result?.content?.[0]?.text || result?.text || "";
      const clean = raw.replace(/^```json?\n?/, "").replace(/\n?```$/, "").trim();
      const parsed = JSON.parse(clean);
      if (Array.isArray(parsed)) setTakeaways(parsed.slice(0, 6));
    } catch {
      setTakeaways(["Could not generate takeaways — read the full report above."]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/60 bg-secondary/30">
        <Sparkles className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-semibold text-foreground">AI Key Takeaways</span>
        {takeaways && (
          <button onClick={() => { setTakeaways(null); }} className="ml-auto text-muted-foreground hover:text-foreground">
            <RefreshCw className="w-3 h-3" />
          </button>
        )}
      </div>
      <div className="p-4">
        {!takeaways && !loading && (
          <button
            onClick={generate}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" /> Generate takeaways
          </button>
        )}
        {loading && (
          <div className="flex items-center justify-center gap-2 py-4">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Analysing report…</span>
          </div>
        )}
        {takeaways && (
          <ul className="space-y-2">
            {takeaways.map((t, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-foreground leading-relaxed">
                <span className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-bold flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                {t}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ── Prediction Summary ────────────────────────────────────────────────────────
function PredictionCard({ report, livePrice }) {
  const action = report.prediction_action;
  if (!action) return null;

  const lockPrice   = report.prediction_lock_price || report.prediction_entry_price;
  const targetPrice = report.prediction_target_price;
  const stopPrice   = report.prediction_stop_price;
  const outcome     = report.prediction_outcome;
  const ticker      = report.prediction_ticker;
  const timeframe   = report.prediction_timeframe;
  const isResolved  = outcome && outcome !== "pending";

  const current = livePrice || lockPrice;
  const dirMul  = action === "Short" ? -1 : 1;
  const pnlPct  = lockPrice && current
    ? (((current - lockPrice) / lockPrice) * 100 * dirMul).toFixed(2)
    : null;
  const isWinning = pnlPct != null && parseFloat(pnlPct) >= 0;

  const actionCfg = {
    Long:  { color: "text-gain",  bg: "bg-gain/10",  border: "border-gain/20",  icon: TrendingUp },
    Short: { color: "text-loss",  bg: "bg-loss/10",  border: "border-loss/20",  icon: TrendingDown },
    Hold:  { color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", icon: Minus },
  }[action] || { color: "text-muted-foreground", bg: "bg-secondary", border: "border-border", icon: Minus };
  const ActionIcon = actionCfg.icon;

  const outcomeStyle = {
    hit:     { label: "🎯 HIT",     cls: "bg-gain text-white" },
    near:    { label: "✅ NEAR HIT", cls: "bg-gain text-white" },
    partial: { label: "🟡 PARTIAL",  cls: "bg-amber-500 text-white" },
    miss:    { label: "❌ MISS",     cls: "bg-loss text-white" },
  }[outcome] || null;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className={cn("flex items-center gap-2 px-4 py-3 border-b border-border/60", actionCfg.bg)}>
        <Lock className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold text-foreground">Locked Prediction</span>
        {isResolved && outcomeStyle && (
          <span className={cn("ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full", outcomeStyle.cls)}>
            {outcomeStyle.label}
          </span>
        )}
      </div>

      <div className="p-4 space-y-3">
        {/* Action pill */}
        <div className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-bold", actionCfg.bg, actionCfg.border, actionCfg.color)}>
          <ActionIcon className="w-3.5 h-3.5" />
          {action} {ticker && `$${ticker}`}
        </div>

        {/* Price grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {lockPrice && (
            <div className="bg-secondary/50 rounded-lg p-2">
              <p className="text-muted-foreground mb-0.5">Lock Price</p>
              <p className="font-bold font-mono">${Number(lockPrice).toFixed(2)}</p>
            </div>
          )}
          {targetPrice && (
            <div className="bg-amber-50 border border-amber-100 rounded-lg p-2">
              <p className="text-muted-foreground mb-0.5 flex items-center gap-1">
                <Target className="w-2.5 h-2.5" /> Target
              </p>
              <p className="font-bold font-mono text-amber-700">${Number(targetPrice).toFixed(2)}</p>
            </div>
          )}
          {stopPrice && (
            <div className="bg-secondary/50 rounded-lg p-2">
              <p className="text-muted-foreground mb-0.5">Stop Loss</p>
              <p className="font-bold font-mono">${Number(stopPrice).toFixed(2)}</p>
            </div>
          )}
          {timeframe && (
            <div className="bg-secondary/50 rounded-lg p-2">
              <p className="text-muted-foreground mb-0.5">Timeframe</p>
              <p className="font-bold">{timeframe}</p>
            </div>
          )}
        </div>

        {/* Live P&L */}
        {pnlPct != null && !isResolved && (
          <div className={cn(
            "flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-semibold",
            isWinning ? "bg-gain/10 border-gain/20 text-gain" : "bg-loss/10 border-loss/20 text-loss"
          )}>
            <span>Live P&L</span>
            <span className="font-bold font-mono">{pnlPct > 0 ? "+" : ""}{pnlPct}%</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Analyst Mini-Profile ──────────────────────────────────────────────────────
function AnalystCard({ author, analystName, initials, accuracy, subscribed, onSubscribe, price, navigate, allReports }) {
  if (!author && !analystName) return null;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-full bg-primary/10 border border-border flex items-center justify-center text-sm font-bold text-primary overflow-hidden flex-shrink-0 cursor-pointer"
            onClick={() => navigate(`/analyst/${author?.email || author?.username}`)}
          >
            {author?.picture
              ? <img src={author.picture} alt={analystName} className="w-full h-full object-cover" />
              : initials}
          </div>
          <div className="flex-1 min-w-0">
            <button
              onClick={() => navigate(`/analyst/${author?.email || author?.username}`)}
              className="font-semibold text-sm text-foreground hover:text-primary transition-colors truncate block w-full text-left"
            >
              {analystName}
            </button>
            {author && (
              <AccuracyTierBadge user={author} allReports={allReports || []} />
            )}
          </div>
        </div>

        {author?.tagline && (
          <p className="text-xs text-muted-foreground leading-relaxed mb-3 italic">
            "{author.tagline}"
          </p>
        )}

        <div className="grid grid-cols-2 gap-2 text-xs mb-3">
          {accuracy > 0 && (
            <div className="text-center">
              <p className={cn("text-base font-bold font-mono", accuracy >= 65 ? "text-gain" : "text-amber-600")}>
                {accuracy}/100
              </p>
              <p className="text-[10px] text-muted-foreground">STOA Score</p>
            </div>
          )}
          {author?.followers_count > 0 && (
            <div className="text-center">
              <p className="text-base font-bold font-mono">{(author.followers_count).toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">Followers</p>
            </div>
          )}
        </div>

        {!subscribed && (
          <button
            onClick={onSubscribe}
            className="w-full bg-primary text-primary-foreground text-xs font-bold py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            Subscribe · ${price}/mo
          </button>
        )}
        {subscribed && (
          <div className="flex items-center justify-center gap-1.5 py-2 text-xs text-gain font-medium">
            <BadgeCheck className="w-3.5 h-3.5" /> Subscribed
          </div>
        )}
      </div>
    </div>
  );
}

// ── Related Reports ───────────────────────────────────────────────────────────
function RelatedReportsCard({ reports, authorName, navigate }) {
  if (!reports || reports.length === 0) return null;
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/60 bg-secondary/30">
        <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold text-foreground">More from {authorName.split(" ")[0]}</span>
      </div>
      <div className="divide-y divide-border/50">
        {reports.map(r => (
          <button
            key={r.id}
            onClick={() => navigate(`/report?id=${r.id}`)}
            className="w-full text-left px-4 py-3 hover:bg-secondary/40 transition-colors group"
          >
            <p className="text-xs font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-relaxed">
              {r.title}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              {new Date(r.created_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              {r.prediction_action && (
                <span className={cn("ml-2 font-bold", r.prediction_action === "Long" ? "text-gain" : r.prediction_action === "Short" ? "text-loss" : "text-amber-600")}>
                  {r.prediction_action}
                </span>
              )}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main Sidebar export ───────────────────────────────────────────────────────
export default function ReportSidebar({
  report,
  blocks,
  author,
  authorName,
  initials,
  accuracy,
  subscribed,
  onSubscribe,
  price,
  livePrice,
  moreReports,
  allReports,
  navigate,
}) {
  return (
    <aside className="hidden xl:block w-72 flex-shrink-0">
      <div className="sticky top-24 space-y-4 max-h-[calc(100vh-7rem)] overflow-y-auto pb-6 pr-1 [&::-webkit-scrollbar]:hidden">
        {/* 1 — AI Key Takeaways */}
        <KeyTakeawaysCard report={report} blocks={blocks} />

        {/* 2 — Locked prediction summary */}
        {report?.prediction_action && (
          <PredictionCard report={report} livePrice={livePrice} />
        )}

        {/* 3 — Analyst mini-card */}
        <AnalystCard
          author={author}
          analystName={authorName}
          initials={initials}
          accuracy={accuracy}
          subscribed={subscribed}
          onSubscribe={onSubscribe}
          price={price}
          navigate={navigate}
          allReports={allReports}
        />

        {/* 4 — Related reports */}
        <RelatedReportsCard
          reports={moreReports}
          authorName={authorName}
          navigate={navigate}
        />
      </div>
    </aside>
  );
}
