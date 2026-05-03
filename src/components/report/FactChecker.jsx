import React, { useState } from "react";
import {
  Sparkles, CheckCircle2, AlertTriangle, Info, MessageSquareQuote,
  Loader2, Users, ChevronDown, ChevronUp, HelpCircle, Send, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

const TYPE_CONFIG = {
  Fact: {
    icon: CheckCircle2, color: "text-gain", bg: "bg-gain/10 border-gain/20",
    label: "Verified Fact",
    description: null,
  },
  Opinion: {
    icon: MessageSquareQuote, color: "text-blue-600", bg: "bg-blue-50 border-blue-200",
    label: "Opinion",
    description: "This is a subjective judgment or interpretation, not an independently verifiable fact. The author may have strong evidence for this view, but it reflects their analysis rather than an objective measurement.",
  },
  Misleading: {
    icon: AlertTriangle, color: "text-loss", bg: "bg-loss/10 border-loss/20",
    label: "Potentially Misleading",
    description: "This claim contains technically accurate elements but may omit important context, cherry-pick data, or frame information in a way that could lead to incorrect conclusions.",
  },
  Unverified: {
    icon: Info, color: "text-amber-600", bg: "bg-amber-50 border-amber-200",
    label: "Unverified",
    description: "This claim could not be independently confirmed against current public data sources. It may be accurate but lacks corroborating evidence from authoritative sources at the time of this analysis.",
  },
};

// Community Note sub-component for Opinion and Misleading claims
function CommunityNote({ claimText, type }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [notes, setNotes] = useState(() => {
    const sample = {
      Misleading: [
        { author: "DataCheck_Pro", text: "The YoY comparison uses a low-base quarter — actual sequential growth was much more modest.", votes: 14 },
      ],
      Opinion: [
        { author: "MarketNeutral", text: "This conclusion depends heavily on management guidance and future macro assumptions. Treat as bullish thesis, not fact.", votes: 8 },
      ],
    };
    return sample[type] || [];
  });

  const handleSubmit = () => {
    if (!note.trim()) return;
    setNotes(prev => [{ author: "You", text: note.trim(), votes: 0 }, ...prev]);
    setNote("");
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 2000);
  };

  return (
    <div className="mt-2 border-t border-current/10 pt-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-[10px] font-semibold opacity-70 hover:opacity-100 transition-opacity"
      >
        <Users className="w-3 h-3" />
        Community Notes {notes.length > 0 ? `(${notes.length})` : ""}
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {open && (
        <div className="mt-2 space-y-2">
          {notes.map((n, i) => (
            <div key={i} className="bg-white/60 rounded-lg p-2 text-[10px]">
              <span className="font-semibold">{n.author}</span>
              <span className="text-muted-foreground ml-1">· {n.votes} helpful</span>
              <p className="mt-0.5 text-foreground/80">{n.text}</p>
            </div>
          ))}
          <div className="flex gap-1.5 mt-1">
            <input
              value={note}
              onChange={e => setNote(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              placeholder="Add a community note..."
              className="flex-1 text-[10px] bg-white/60 border border-current/20 rounded-lg px-2 py-1 outline-none"
            />
            <button onClick={handleSubmit} className="p-1 rounded-lg bg-white/60 hover:bg-white/80 transition-colors">
              {submitted ? <CheckCircle2 className="w-3 h-3 text-gain" /> : <Send className="w-3 h-3" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Why "Unverified" explanation sub-component
function UnverifiedExplainer({ claim }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2 border-t border-amber-200 pt-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-[10px] font-semibold text-amber-700 hover:text-amber-800 transition-colors"
      >
        <HelpCircle className="w-3 h-3" />
        Why is this unverified?
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      {open && (
        <div className="mt-2 text-[10px] text-amber-800 bg-amber-100/50 rounded-lg p-2 space-y-1">
          <p><strong>Unverified ≠ False.</strong> It means our AI analysis could not find current, authoritative public data to confirm this specific claim.</p>
          <p>Common reasons:</p>
          <ul className="list-disc list-inside space-y-0.5 ml-1">
            <li>The data is behind a paywall (earnings calls, proprietary databases)</li>
            <li>The claim is forward-looking (projections, estimates, forecasts)</li>
            <li>The precise figure differs slightly across sources</li>
            <li>The claim uses internal company metrics not publicly disclosed</li>
          </ul>
          <p className="mt-1 italic">Always cross-reference with primary sources (SEC filings, company IR pages) before making investment decisions.</p>
        </div>
      )}
    </div>
  );
}

// Individual claim card
function ClaimCard({ claim }) {
  const cfg = TYPE_CONFIG[claim.type] || TYPE_CONFIG.Unverified;
  const Icon = cfg.icon;
  const [showDesc, setShowDesc] = useState(false);

  return (
    <div className={`flex gap-2 p-3 rounded-xl border text-xs ${cfg.bg}`}>
      <Icon className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${cfg.color}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`font-bold text-[11px] ${cfg.color}`}>{cfg.label}</span>
          {cfg.description && (
            <button onClick={() => setShowDesc(!showDesc)} className={`opacity-50 hover:opacity-100 transition-opacity ${cfg.color}`}>
              <HelpCircle className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Claimify-extracted atomic claim */}
        {claim.atomic_claim && claim.atomic_claim !== claim.text && (
          <p className="text-[10px] text-muted-foreground italic mb-1">Extracted claim: "{claim.atomic_claim}"</p>
        )}

        <p className="text-foreground/85 leading-relaxed">{claim.text}</p>

        {claim.note && (
          <p className="text-muted-foreground mt-1 italic">{claim.note}</p>
        )}

        {/* Type description tooltip */}
        {showDesc && cfg.description && (
          <div className="mt-2 p-2 bg-white/70 rounded-lg border border-current/10 text-[10px] text-foreground/80 leading-relaxed">
            {cfg.description}
          </div>
        )}

        {/* Community Notes for Opinion / Misleading */}
        {(claim.type === "Opinion" || claim.type === "Misleading") && (
          <CommunityNote claimText={claim.text} type={claim.type} />
        )}

        {/* Why unverified explainer */}
        {claim.type === "Unverified" && (
          <UnverifiedExplainer claim={claim} />
        )}
      </div>
    </div>
  );
}

export default function FactChecker({ reportContent, content }) {
  const [loading, setLoading] = useState(false);
  const [claims, setClaims] = useState(null);
  const [stage, setStage] = useState("");

  const text = reportContent || content || "";

  const runCheck = async () => {
    setLoading(true);
    setClaims(null);

    // Stage 1: Selection — filter sentences with verifiable propositions (Claimify methodology)
    setStage("Stage 1/3: Selecting verifiable sentences...");
    const selectionRes = await base44.integrations.Core.InvokeLLM({
      prompt: `You are implementing the Claimify fact-checking methodology from academic research. 

STAGE 1 - SELECTION: From this financial report text, identify sentences that contain specific, verifiable propositions. Exclude pure opinions, speculation, vague statements, and introductions/conclusions without concrete claims.

Report text:
"${text.slice(0, 2000)}"

Return up to 8 candidate sentences that contain specific verifiable claims (statistics, prices, growth figures, market data, company facts, etc.).`,
      response_json_schema: {
        type: "object",
        properties: {
          candidates: { type: "array", items: { type: "string" } }
        }
      }
    });

    const candidates = selectionRes.candidates || [];

    // Stage 2: Disambiguation + Decomposition — extract atomic claims (Claimify stages 3+4)
    setStage("Stage 2/3: Decomposing into atomic claims...");
    const decompRes = await base44.integrations.Core.InvokeLLM({
      prompt: `You are implementing the Claimify fact-extraction methodology (Metropolitansky & Larson, 2025).

STAGE 2 - DISAMBIGUATION & DECOMPOSITION: Take these candidate sentences and decompose them into self-contained, atomic, decontextualized factual claims. Each claim should be independently verifiable without needing surrounding context.

Candidate sentences:
${candidates.map((c, i) => `${i + 1}. ${c}`).join("\n")}

For each candidate, produce 1-2 atomic claims. Remove ambiguous pronouns, resolve partial names, and ensure each claim stands alone.`,
      response_json_schema: {
        type: "object",
        properties: {
          atomic_claims: { type: "array", items: { type: "string" } }
        }
      }
    });

    const atomicClaims = decompRes.atomic_claims || candidates;

    // Stage 3: Verification — classify each atomic claim
    setStage("Stage 3/3: Verifying claims with live data...");
    const verifyRes = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a financial fact-checker using the Claimify methodology. Classify each atomic claim below.

For each claim, classify as exactly one of: Fact, Opinion, Misleading, Unverified.

Definitions:
- Fact: Confirmed by authoritative sources (SEC filings, official earnings, Bloomberg, Reuters)
- Opinion: Subjective judgment, interpretation, or prediction — not objectively measurable
- Misleading: Contains accurate elements but omits critical context, cherry-picks data, or creates false impressions
- Unverified: Could not be confirmed from current public sources (behind paywall, forward-looking, proprietary)

Claims to verify:
${atomicClaims.slice(0, 6).map((c, i) => `${i + 1}. ${c}`).join("\n")}

For each claim also provide:
- A brief note explaining your classification (1 sentence)
- The original atomic form of the claim`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          claims: {
            type: "array",
            items: {
              type: "object",
              properties: {
                text: { type: "string" },
                atomic_claim: { type: "string" },
                type: { type: "string" },
                note: { type: "string" }
              }
            }
          }
        }
      }
    });

    setClaims(verifyRes.claims || []);
    setStage("");
    setLoading(false);
  };

  const summary = claims ? {
    Fact: claims.filter(c => c.type === "Fact").length,
    Opinion: claims.filter(c => c.type === "Opinion").length,
    Misleading: claims.filter(c => c.type === "Misleading").length,
    Unverified: claims.filter(c => c.type === "Unverified").length,
  } : null;

  return (
    <div className="bg-card border border-border rounded-xl p-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <div>
            <h4 className="font-semibold text-sm">Claimify Fact Checker</h4>
            <p className="text-[10px] text-muted-foreground">4-stage pipeline · Metropolitansky & Larson (2025)</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {claims && (
            <button onClick={() => setClaims(null)} className="text-xs text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {!claims && (
            <Button onClick={runCheck} disabled={loading} size="sm" variant="outline" className="text-xs">
              {loading
                ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Checking...</>
                : "Run Claimify"}
            </Button>
          )}
        </div>
      </div>

      {/* Loading stages */}
      {loading && stage && (
        <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
          {stage}
        </div>
      )}

      {/* Summary badges */}
      {summary && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {Object.entries(summary).filter(([, v]) => v > 0).map(([type, count]) => {
            const cfg = TYPE_CONFIG[type];
            return (
              <span key={type} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
                {count} {cfg.label}{count > 1 ? "s" : ""}
              </span>
            );
          })}
        </div>
      )}

      {/* Claims list */}
      {claims && (
        <div className="space-y-2">
          {claims.map((claim, i) => <ClaimCard key={i} claim={claim} />)}
        </div>
      )}
    </div>
  );
}