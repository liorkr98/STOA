import React, { useState, useMemo, useEffect } from "react";
import {
  Sparkles, CheckCircle2, AlertTriangle, Info, MessageSquareQuote,
  Loader2, X, TrendingUp, ExternalLink, Flag
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { spendAICredits, loadMyWallet } from "@/lib/walletService";
import { Coins } from "lucide-react";

const COST_FACT_CHECK = 3; // credits — Claude classify + Yahoo Finance + SEC EDGAR

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
  "SEC-Verified": {
    icon: CheckCircle2, color: "text-violet-700",
    bg: "bg-violet-50 border-violet-200", label: "SEC Filing Verified",
  },
  "SEC-Disputed": {
    icon: AlertTriangle, color: "text-red-700",
    bg: "bg-red-50 border-red-200", label: "Disputed by SEC Filing",
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
            {/* See ReportView.ClaimCard: "Unverified — high confidence" is self-contradictory. */}
            {claim.confidence && claim.type !== "Unverified" && (
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

          {claim.secCheck && (
            <div className={`mt-1.5 p-1.5 rounded-lg text-[10px] ${
              claim.secCheck.match ? "bg-violet-50 text-violet-700" : "bg-red-50 text-red-700"
            }`}>
              <strong>SEC EDGAR:</strong> {claim.secCheck.detail}
              {claim.secCheck.edgarLink && (
                <a
                  href={claim.secCheck.edgarLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1.5 underline opacity-70 hover:opacity-100 inline-flex items-center gap-0.5"
                >
                  <ExternalLink className="w-2.5 h-2.5 inline" /> View 10-K
                </a>
              )}
            </div>
          )}

          {/* Report mistake — amber pill, always visible */}
          <div className="mt-2">
            {reportSent ? (
              <span className="inline-flex items-center gap-1 text-[10px] bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-medium">
                <CheckCircle2 className="w-2.5 h-2.5" /> Reported — thanks!
              </span>
            ) : (
              <button
                onClick={handleReportMistake}
                aria-label="Report AI mistake for this claim"
                className="inline-flex items-center gap-1 text-[10px] bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 px-2 py-0.5 rounded-full font-medium transition-colors"
              >
                <Flag className="w-2.5 h-2.5" aria-hidden="true" /> AI mistaken? Report us
              </button>
            )}
          </div>

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
  const [credits, setCredits] = useState(null);

  useEffect(() => {
    loadMyWallet().then(({ wallet }) => setCredits(wallet.ai_credits || 0)).catch(() => setCredits(0));
  }, []);

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

  // ── EDGAR helpers ──────────────────────────────────────────────────────────
  // SEC requires User-Agent: "<company> <email>" on every request.
  const EDGAR_HEADERS = { "User-Agent": "Stakify admin@stakify.com", "Accept-Encoding": "gzip, deflate" };

  // Resolve ticker → zero-padded 10-digit CIK via the EDGAR company_tickers file.
  const resolveCIK = async (ticker) => {
    const res = await base44.functions.invoke("proxyFetch", {
      url: "https://www.sec.gov/files/company_tickers.json",
      headers: EDGAR_HEADERS,
    });
    const raw = res?.data || res;
    const body = typeof raw === "string" ? JSON.parse(raw) : raw;
    // body shape: { "0": { cik_str, ticker, title }, "1": ... }
    const entry = Object.values(body).find(e => e.ticker?.toUpperCase() === ticker.toUpperCase());
    if (!entry) return null;
    return String(entry.cik_str).padStart(10, "0");
  };

  // Fetch a specific XBRL concept and return the most-recent annual value.
  const fetchEdgarConcept = async (cik, concept) => {
    const url = `https://data.sec.gov/api/xbrl/companyconcept/CIK${cik}/us-gaap/${concept}.json`;
    const res = await base44.functions.invoke("proxyFetch", { url, headers: EDGAR_HEADERS });
    const raw = res?.data || res;
    const body = typeof raw === "string" ? JSON.parse(raw) : raw;
    // units → USD (for revenue/netIncome) or USD/shares (for EPS)
    const unitKey = Object.keys(body?.units || {})[0];
    const entries = body?.units?.[unitKey];
    if (!entries?.length) return null;
    // Keep only 10-K annual filings, sorted newest first
    const annual = entries
      .filter(e => e.form === "10-K" && e.val != null)
      .sort((a, b) => new Date(b.end) - new Date(a.end));
    return annual[0] || null; // { val, end, accn, form, ... }
  };

  // ── SEC EDGAR cross-check (revenue & EPS from actual 10-K filings) ────────
  const runFinancialsCheck = async (enrichedClaims) => {
    const verifiable = enrichedClaims.filter(
      c => c.verifiableTicker && (c.verifiableMetric === "revenue" || c.verifiableMetric === "eps")
    );
    if (!verifiable.length) return enrichedClaims;

    const tickers = [...new Set(verifiable.map(c => c.verifiableTicker))];
    const edgarData = {}; // ticker → { revenue?, eps?, revenueYear?, epsYear? }

    for (const ticker of tickers) {
      try {
        const cik = await resolveCIK(ticker);
        if (!cik) continue;

        // Try common revenue concepts in order of preference
        let revEntry = null;
        for (const concept of ["Revenues", "RevenueFromContractWithCustomerExcludingAssessedTax", "SalesRevenueNet"]) {
          revEntry = await fetchEdgarConcept(cik, concept).catch(() => null);
          if (revEntry) break;
        }

        const epsEntry = await fetchEdgarConcept(cik, "EarningsPerShareDiluted").catch(() => null);

        edgarData[ticker] = {
          cik,
          revenue:     revEntry?.val  ?? null,
          revenueYear: revEntry?.end  ?? null,
          eps:         epsEntry?.val  ?? null,
          epsYear:     epsEntry?.end  ?? null,
        };
      } catch {
        // Best-effort; Yahoo Financials already ran as a prior step
      }
    }

    return enrichedClaims.map(claim => {
      if (!claim.verifiableTicker || !claim.verifiableMetric) return claim;
      const ed = edgarData[claim.verifiableTicker];
      if (!ed) return claim;

      let secCheck = null;
      const filingYear = ed.revenueYear?.slice(0, 4) || ed.epsYear?.slice(0, 4) || "";
      const edgarLink  = ed.cik
        ? `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${ed.cik}&type=10-K&dateb=&owner=include&count=5`
        : null;

      if (claim.verifiableMetric === "revenue" && ed.revenue != null) {
        const billions = ed.revenue / 1e9;
        const numMatch = claim.text.match(/\$?([\d,.]+)\s*(B|billion|T|trillion|M|million|K|thousand)?/i);
        if (numMatch) {
          const claimedRaw = parseFloat(numMatch[1].replace(/,/g, ""));
          const unit = numMatch[2] || "";
          const multiplier = /T|trillion/i.test(unit) ? 1000
            : /B|billion/i.test(unit)                ? 1
            : /M|million/i.test(unit)                ? 0.001
            : /K|thousand/i.test(unit)               ? 0.000001
            : claimedRaw > 500 ? 0.001               : 1; // bare number heuristic
          const claimedB = claimedRaw * multiplier;
          const diff = Math.abs(claimedB - billions) / (billions || 1);
          secCheck = diff < 0.15
            ? { match: true,  detail: `SEC 10-K (${filingYear}): Revenue $${billions.toFixed(1)}B — consistent with claim.`, edgarLink }
            : { match: false, detail: `SEC 10-K (${filingYear}): Revenue $${billions.toFixed(1)}B vs claimed ~$${claimedB.toFixed(1)}B.`, edgarLink };
        } else {
          secCheck = { match: true, detail: `SEC 10-K (${filingYear}): Revenue $${billions.toFixed(1)}B on record.`, edgarLink };
        }
      } else if (claim.verifiableMetric === "eps" && ed.eps != null) {
        const numMatch = claim.text.match(/(?:EPS|earnings per share)[^$\d]*\$?([\d.]+)/i);
        if (numMatch) {
          const claimed = parseFloat(numMatch[1]);
          const diff = Math.abs(claimed - ed.eps) / Math.abs(ed.eps || 1);
          secCheck = diff < 0.2
            ? { match: true,  detail: `SEC 10-K (${filingYear}): EPS $${ed.eps.toFixed(2)} — consistent.`, edgarLink }
            : { match: false, detail: `SEC 10-K (${filingYear}): EPS $${ed.eps.toFixed(2)} vs claimed $${claimed.toFixed(2)}.`, edgarLink };
        } else {
          secCheck = { match: true, detail: `SEC 10-K (${filingYear}): EPS $${ed.eps.toFixed(2)} on record.`, edgarLink };
        }
      }

      if (!secCheck) return claim;

      const prevType = claim.type;
      const newType = secCheck.match
        ? (prevType === "Unverified" || prevType === "Fact" ? "SEC-Verified" : prevType)
        : (prevType === "Fact" ? "SEC-Disputed" : prevType);

      return { ...claim, secCheck, type: newType };
    });
  };

  const runCheck = async () => {
    if (!text || text.length < 50) { setError("Write more content before fact-checking."); return; }

    // Credit check
    if (credits != null && credits < COST_FACT_CHECK) {
      toast.error(`Need ${COST_FACT_CHECK} AI credits to fact-check. Convert cash → credits in your Wallet.`);
      return;
    }

    setLoading(true);
    setClaims(null);
    setError(null);
    try {
      setPhase("claude");
      const claudeClaims = await runClaudeCheck();

      // Deduct credits right after Claude responds (most expensive step)
      const creditRes = await spendAICredits(COST_FACT_CHECK, "AI Fact Check (Claude + Yahoo + EDGAR)").catch(() => null);
      const remaining = creditRes?.remaining ?? (credits != null ? credits - COST_FACT_CHECK : null);
      setCredits(remaining);
      if (remaining != null && remaining <= 10 && remaining > 0) toast.warning(`${remaining} AI credits remaining`);

      setPhase("yahoo");
      const yahooClaims = await runYahooCheck(claudeClaims);
      setPhase("financials");
      const enrichedClaims = await runFinancialsCheck(yahooClaims);
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
            <p className="text-[10px] text-muted-foreground">Claude AI · Yahoo Finance · SEC EDGAR</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Credit badge */}
          {credits != null && (
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${
              credits <= 0 ? "bg-loss/10 text-loss" : credits <= 10 ? "bg-amber-100 text-amber-700" : "bg-secondary text-muted-foreground"
            }`} title={`${COST_FACT_CHECK} credits per fact-check`}>
              <Coins className="w-2.5 h-2.5" /> {credits}
            </span>
          )}
          {claims && (
            <button onClick={() => setClaims(null)} className="text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <Button
            onClick={runCheck}
            disabled={loading || !text || (credits != null && credits < COST_FACT_CHECK && !claims)}
            size="sm" variant="outline" className="text-xs"
          >
            {loading
              ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />{phase === "claude" ? "Claude analyzing..." : phase === "yahoo" ? "Yahoo Finance..." : "SEC EDGAR..."}</>
              : claims ? "Re-run" : <><Coins className="w-3 h-3 mr-1" />{COST_FACT_CHECK} · Check Facts</>
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
            <span>Step 2: Cross-checking prices &amp; ratios with Yahoo Finance</span>
          </div>
          <div className={`flex items-center gap-2 text-xs py-1 ${phase === "financials" ? "text-primary" : "text-muted-foreground"}`}>
            {phase === "financials"
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : <div className="w-3 h-3 rounded-full border border-current opacity-30" />}
            <span>Step 3: Cross-checking revenue &amp; EPS with SEC EDGAR 10-K filings</span>
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