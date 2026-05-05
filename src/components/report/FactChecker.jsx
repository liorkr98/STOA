import React, { useState } from "react";
import {
  Sparkles, CheckCircle2, AlertTriangle, Info, MessageSquareQuote,
  Loader2, X, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const TYPE_CONFIG = {
  Fact: {
    icon: CheckCircle2, color: "text-gain", bg: "bg-gain/10 border-gain/20",
    label: "Verified Fact",
  },
  Opinion: {
    icon: MessageSquareQuote, color: "text-blue-600", bg: "bg-blue-50 border-blue-200",
    label: "Opinion",
  },
  Misleading: {
    icon: AlertTriangle, color: "text-loss", bg: "bg-loss/10 border-loss/20",
    label: "Potentially Misleading",
  },
  Unverified: {
    icon: Info, color: "text-amber-600", bg: "bg-amber-50 border-amber-200",
    label: "Unverified",
  },
};

function ClaimCard({ claim }) {
  const cfg = TYPE_CONFIG[claim.type] || TYPE_CONFIG.Unverified;
  const Icon = cfg.icon;

  return (
    <div className={`flex gap-2 p-3 rounded-xl border text-xs ${cfg.bg}`}>
      <Icon className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${cfg.color}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`font-bold text-[11px] ${cfg.color}`}>{cfg.label}</span>
          {claim.confidence && (
            <span className={`text-[9px] rounded-full px-1.5 py-0.5 font-semibold ml-auto ${
              claim.confidence === "high" ? "bg-gain/10 text-gain" :
              claim.confidence === "medium" ? "bg-amber-50 text-amber-700" :
              "bg-muted text-muted-foreground"
            }`}>{claim.confidence} confidence</span>
          )}
        </div>
        <p className="text-foreground/85 leading-relaxed">{claim.text}</p>
        {claim.note && (
          <p className="text-muted-foreground mt-1 italic">{claim.note}</p>
        )}
      </div>
    </div>
  );
}

export default function FactChecker({ reportContent, content }) {
  const [loading, setLoading] = useState(false);
  const [claims, setClaims] = useState(null);
  const [error, setError] = useState(null);

  const text = (reportContent || content || "").trim();

  const runCheck = async () => {
    if (text.length < 50) { toast.error("Write more content before fact-checking."); return; }
    setLoading(true);
    setClaims(null);
    setError(null);

    try {
      const res = await base44.integrations.Core.InvokeLLM({
        model: "claude_sonnet_4_6",
        prompt: `You are a rigorous financial analyst and fact-checker. Carefully read the following report text and identify the key factual claims made in it.

For each claim, classify it as one of:
- Fact: a specific, verifiable statement that is accurate based on known data
- Opinion: a subjective judgment, forecast, or interpretation — not independently measurable
- Misleading: contains accurate elements but omits critical context or creates false impressions
- Unverified: a specific claim that cannot be confirmed from public sources

IMPORTANT: Only extract claims that are ACTUALLY in the text below. Do not invent claims.

Report text:
"""
${text.slice(0, 3000)}
"""

Return 4 to 8 of the most important claims as a JSON object. Format:
{"claims": [{"text": "...", "type": "Fact|Opinion|Misleading|Unverified", "note": "...", "confidence": "high|medium|low"}]}

Return ONLY valid JSON, no markdown fences, no extra text.`,
      });

      // Normalize response — InvokeLLM may return string or object
      const raw = typeof res === "string" ? res : (res?.content?.[0]?.text || res?.text || JSON.stringify(res));
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setClaims(parsed.claims || []);
      } else {
        setClaims([]);
      }
    } catch (err) {
      setError("AI fact check failed. Please try again.");
    } finally {
      setLoading(false);
    }
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
            <h4 className="font-semibold text-sm">AI Fact Checker</h4>
            <p className="text-[10px] text-muted-foreground">Powered by Claude · Checks claims in this report</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {claims && (
            <button onClick={() => setClaims(null)} className="text-xs text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <Button onClick={runCheck} disabled={loading || text.length < 50} size="sm" variant="outline" className="text-xs">
            {loading
              ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Analyzing...</>
              : claims ? "Re-run" : "Check Facts"}
          </Button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
          Claude is reading the report and checking claims...
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 py-2 text-xs text-loss">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {error}
        </div>
      )}

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

      {claims && claims.length > 0 && (
        <div className="space-y-2">
          {claims.map((claim, i) => <ClaimCard key={i} claim={claim} />)}
        </div>
      )}

      {claims && claims.length === 0 && (
        <p className="text-xs text-muted-foreground py-2">No specific verifiable claims found in this text.</p>
      )}
    </div>
  );
}