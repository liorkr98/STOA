import React, { useState, useMemo } from "react";
import {
  Sparkles, CheckCircle2, AlertTriangle, Info, MessageSquareQuote,
  Loader2, X, TrendingUp, ExternalLink, Flag
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const TYPE_CONFIG = {
  Fact: {
    icon: CheckCircle2, color: "text-gain",
    bg: "bg-gain/10 border-gain/20", label: "Verified Fact",
  },
  Opinion: {
    icon: MessageSquareQuote, color: "text-blue-600",
    bg: "bg-blue-50 border-blue-200", label: "Opinion",
  },
  Misleading: {
    icon: AlertTriangle, color: "text-loss",
    bg: "bg-loss/10 border-loss/20", label: "Potentially Misleading",
  },
  Unverified: {
    icon: Info, color: "text-amber-600",
    bg: "bg-amber-50 border-amber-200", label: "Unverified",
  },
  "Yahoo-Verified": {
    icon: TrendingUp, color: "text-emerald-700",
    bg: "bg-emerald-50 border-emerald-200", label: "Yahoo Finance Verified",
  },
  "Yahoo-Disputed": {
    icon: AlertTriangle, color: "text-orange-600",
    bg: "bg-orange-50 border-orange-200", label: "Disputed by Yahoo Finance",
  },
};

function ClaimCard({ claim }) {
  const cfg = TYPE_CONFIG[claim.type] || TYPE_CONFIG.Unverified;
  const Icon = cfg.icon;
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState([]);
  const [noteText, setNoteText] = useState("");
  const [reportSent, setReportSent] = useState(false);

  const handleReportMistake = async () => {
    try {
      await base44.integrations.Core.SendEmail({
        to: "baramsalem1@gmail.com",
        subject: `AI Fact Check Dispute — ${claim.type}`,
        body: `A user flagged a potential AI fact-check mistake.\n\nClaim type: ${claim.type}\nConfidence: ${claim.confidence || "N/A"}\n\nClaim text:\n"${claim.text}"\n\nAI note: ${claim.note || "N/A"}\n\nPlease review this claim.`,
      });
      setReportSent(true);
      toast.success("Thanks! We'll review this claim.");
    } catch {
      toast.error("Failed to send. Please try again.");
    }
  };

  const addNote = () => {
    if (!noteText.trim()) return;
    setNotes(prev => [...prev, { id: Date.now(), text: noteText.trim(), time: "just now" }]);
    setNoteText("");
  };

  return (
    <div className={`p-3 rounded-xl border text-xs ${cfg.bg}`}>
      <div className="flex items-start gap-2">
        <Icon className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${cfg.color}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className={`font-bold text-[11px] ${cfg.color}`}>{cfg.label}</span>
            {claim.confidence && (
              <span className={`text-[9px] rounded-full px-1.5 py-0.5 font-semibold ${
                claim.confidence === "high"   ? "bg-gain/10 text-gain"
                : claim.confidence === "medium" ? "bg-amber-50 text-amber-700"
                : "bg-muted text-muted-foreground"
              }`}>{claim.confidence}</span>
            )}
            {claim.yahooData && (
              <a
                href={`https://finance.yahoo.com/quote/${claim.yahooTicker}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-0.5 text-[9px] text-blue-600 hover:underline"
              >
                <ExternalLink className="w-2.5 h-2.5" />Yahoo Finance
              </a>
            )}
          </div>

          <p className="text-foreground/85 leading-relaxed">{claim.text}</p>

          {claim.note && (
            <p className="text-muted-foreground mt-1 italic">{claim.note}</p>
          )}

          {claim.yahooCheck && (
            <div className={`mt-1.5 p-1.5 rounded-lg text-[10px] ${
              claim.yahooCheck.match ? "bg-gain/10 text-gain" : "bg-orange-50 text-orange-700"
            }`}>
              <strong>Yahoo Finance:</strong> {claim.yahooCheck.detail}
            </div>
          )}

          {/* AI Mistaken button for Fact, Unverified, Yahoo-Disputed */}
          {(claim.type === "Fact" || claim.type === "Unverified" || claim.type === "Yahoo-Disputed") && (
            <div className="mt-2">
              {reportSent ? (
                <span className="text-[10px] text-muted-foreground italic">✓ Reported — thanks!</span>
              ) : (
                <button
                  onClick={handleReportMistake}
                  className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-amber-600 transition-colors"
                >
                  <Flag className="w-2.5 h-2.5" /> AI mistaken? Tell us
                </button>
              )}
            </div>
          )}

          {claim.type === "Opinion" && (
            <div className="mt-2 pt-2 border-t border-current/10">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Community Notes</span>
              {notes.length === 0 && !showNotes && (
                <p className="text-[10px] text-muted-foreground italic mt-0.5">No community notes yet.</p>
              )}
              {notes.map(n => (
                <div key={n.id} className="text-[10px] bg-white/60 rounded-lg px-2 py-1 mb-1 mt-1 text-foreground/80">
                  {n.text} <span className="text-muted-foreground ml-1">{n.time}</span>
                </div>
              ))}
              {showNotes ? (
                <div className="flex gap-1 mt-1">
                  <input
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addNote()}
                    placeholder="Add context..."
                    className="flex-1 text-[10px] border border-blue-200 rounded px-2 py-1 bg-white/80 focus:outline-none"
                    autoFocus
                  />
                  <button onClick={addNote} className="text-[10px] text-blue-600 font-semibold px-2">Post</button>
                  <button onClick={() => setShowNotes(false)} className="text-[10px] text-muted-foreground px-1">✕</button>
                </div>
              ) : (
                <button onClick={() => setShowNotes(true)} className="block text-[10px] text-primary hover:underline mt-0.5">
                  + Add a note
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FactChecker({ reportContent, content }) {
  const [loading, setLoading] = useState(false);
  const [phase,   setPhase]   = useState("");
  const [claims,  setClaims]  = useState(null);
  const [error,   setError]   = useState(null);

  const text = (reportContent || content || "").trim();

  const runClaudeCheck = async () => {
    const res = await base44.integrations.Core.InvokeLLM({
      model: "claude_sonnet_4_6",
      prompt: `You are a rigorous financial analyst and fact-checker.
Read this report and identify the 5-8 most important claims.

For each claim classify as:
- Fact: verifiable statement that appears accurate
- Opinion: subjective judgment or forecast
- Misleading: accurate but missing critical context
- Unverified: specific claim that cannot easily be confirmed

For each claim also note if it contains a specific ticker symbol and a numerical figure
(price, revenue, growth rate, market cap, EPS, etc.) that could be verified against
live financial data. If so, include a "verifiableTicker" field with the ticker.

Return ONLY valid JSON (no markdown, no backticks):
{"claims":[{
  "text": "...",
  "type": "Fact|Opinion|Misleading|Unverified",
  "note": "one sentence explanation",
  "confidence": "high|medium|low",
  "verifiableTicker": "NVDA or null",
  "verifiableMetric": "price|revenue|marketCap|eps|peRatio or null"
}]}

Report:
"""${text.slice(0, 3500)}"""`,
    });
    const raw = typeof res === "string" ? res : (res?.content?.[0]?.text || res?.text || "");
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON in Claude response");
    return JSON.parse(match[0]).claims || [];
  };

  const runYahooCheck = async (claudeClaims) => {
    const verifiable = claudeClaims.filter(c => c.verifiableTicker && c.verifiableMetric);
    if (verifiable.length === 0) return claudeClaims;

    const tickers = [...new Set(verifiable.map(c => c.verifiableTicker))];
    const yahooData = {};

    for (const ticker of tickers) {
      try {
        const result = await base44.functions.invoke("getStockData", { ticker });
        const data = result?.data || result;
        if (data) yahooData[ticker] = data;
      } catch (e) {
        console.warn(`Yahoo fetch failed for ${ticker}:`, e);
      }
      try {
        const result = await base44.functions.invoke("getStockFinancials", { ticker });
        const data = result?.data || result;
        if (data && yahooData[ticker]) yahooData[ticker] = { ...yahooData[ticker], ...data };
      } catch {}
    }

    return claudeClaims.map(claim => {
      if (!claim.verifiableTicker || !claim.verifiableMetric) return claim;
      const yd = yahooData[claim.verifiableTicker];
      if (!yd) return claim;

      let yahooCheck = null;
      const metric = claim.verifiableMetric;

      if (metric === "price" && yd.price) {
        const priceMatch = claim.text.match(/\$?([\d,]+\.?\d*)/);
        if (priceMatch) {
          const claimedPrice = parseFloat(priceMatch[1].replace(",", ""));
          const livePct = Math.abs(claimedPrice - yd.price) / yd.price;
          yahooCheck = livePct < 0.15
            ? { match: true,  detail: `Current price $${yd.price?.toFixed(2)} — consistent with claim.` }
            : { match: false, detail: `Current price $${yd.price?.toFixed(2)} differs significantly from claimed $${claimedPrice.toFixed(2)}.` };
        }
      } else if (metric === "peRatio" && yd.peRatio) {
        const peMatch = claim.text.match(/([\d.]+)x?\s*(?:PE|P\/E)/i);
        if (peMatch) {
          const claimed = parseFloat(peMatch[1]);
          const livePct = Math.abs(claimed - yd.peRatio) / yd.peRatio;
          yahooCheck = livePct < 0.2
            ? { match: true,  detail: `Yahoo P/E is ${yd.peRatio?.toFixed(1)}x — consistent.` }
            : { match: false, detail: `Yahoo P/E is ${yd.peRatio?.toFixed(1)}x vs claimed ${claimed}x.` };
        }
      } else if (metric === "marketCap" && yd.marketCap) {
        const billions = yd.marketCap / 1e9;
        yahooCheck = { match: true, detail: `Market cap: $${billions.toFixed(1)}B per Yahoo Finance.` };
      }

      if (!yahooCheck) return claim;

      return {
        ...claim,
        yahooCheck,
        yahooTicker: claim.verifiableTicker,
        yahooData: true,
        type: yahooCheck.match
          ? (claim.type === "Unverified" ? "Yahoo-Verified" : claim.type)
          : (claim.type === "Fact" ? "Yahoo-Disputed" : claim.type),
      };
    });
  };

  const runCheck = async () => {
    if (!text || text.length < 50) { setError("Write more content before fact-checking."); return; }
    setLoading(true);
    setClaims(null);
    setError(null);
    try {
      setPhase("claude");
      const claudeClaims = await runClaudeCheck();
      setPhase("yahoo");
      const enrichedClaims = await runYahooCheck(claudeClaims);
      setClaims(enrichedClaims);
    } catch (err) {
      setError("Fact check failed. " + (err.message || "Please try again."));
    } finally {
      setLoading(false);
      setPhase("");
    }
  };

  const summary = useMemo(() => {
    if (!claims) return null;
    return Object.fromEntries(Object.keys(TYPE_CONFIG).map(t => [t, claims.filter(c => c.type === t).length]));
  }, [claims]);

  return (
    <div className="bg-card border border-border rounded-xl p-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <div>
            <h4 className="font-semibold text-sm">AI Fact Checker</h4>
            <p className="text-[10px] text-muted-foreground">Claude AI + Yahoo Finance cross-check</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {claims && (
            <button onClick={() => setClaims(null)} className="text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <Button onClick={runCheck} disabled={loading || !text} size="sm" variant="outline" className="text-xs">
            {loading
              ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />{phase === "claude" ? "Claude analyzing..." : "Checking Yahoo Finance..."}</>
              : claims ? "Re-run" : "Check Facts"
            }
          </Button>
        </div>
      </div>

      {loading && (
        <div className="space-y-1 mb-3">
          <div className={`flex items-center gap-2 text-xs py-1 ${phase === "claude" ? "text-primary" : "text-muted-foreground"}`}>
            {phase === "claude" ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3 text-gain" />}
            <span>Step 1: Claude reading report and classifying claims</span>
          </div>
          <div className={`flex items-center gap-2 text-xs py-1 ${phase === "yahoo" ? "text-primary" : "text-muted-foreground"}`}>
            {phase === "yahoo"
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : <div className="w-3 h-3 rounded-full border border-current opacity-30" />}
            <span>Step 2: Cross-checking numerical claims with Yahoo Finance</span>
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-loss flex items-center gap-1 mb-2">
          <AlertTriangle className="w-3.5 h-3.5" />{error}
        </p>
      )}

      {summary && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {Object.entries(summary).filter(([, v]) => v > 0).map(([type, count]) => {
            const cfg = TYPE_CONFIG[type];
            if (!cfg) return null;
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
        <p className="text-xs text-muted-foreground py-2">No specific verifiable claims found.</p>
      )}
    </div>
  );
}