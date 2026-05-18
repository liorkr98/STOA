import React, { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Loader2, X, TrendingUp, ChevronDown, GripHorizontal, Coins } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { spendAICredits, loadMyWallet } from "@/lib/walletService";

const COST_ELITE   = 5; // credits — full institutional research with live internet
const COST_GENERIC = 2; // credits — standard AI outline

const SKELETON_TEMPLATE = [
  { type: "heading", content: "Executive Summary" },
  { type: "text", content: "This report examines the current market positioning and future outlook for the subject company. Our analysis suggests significant upside potential driven by key catalysts in the sector." },
  { type: "heading", content: "Market Analysis" },
  { type: "bullets", content: "• Revenue growth accelerating QoQ with 23% YoY increase\n• Market share expanding in core segments\n• Competitive moat strengthening through R&D investment\n• Favorable regulatory tailwinds expected in H2 2026" },
  { type: "heading", content: "Key Catalysts" },
  { type: "bullets", content: "• New product cycle driving re-rating\n• Expanding TAM in adjacent markets\n• Management execution improving" },
  { type: "heading", content: "Risks" },
  { type: "bullets", content: "• Macro headwinds could delay revenue ramp\n• Competitive pressure from well-funded rivals\n• Valuation pricing in optimistic scenario" },
  { type: "heading", content: "Valuation & Price Target" },
  { type: "text", content: "Using a DCF model with a 10% discount rate and 5-year projection period, we arrive at a fair value that suggests meaningful upside from current levels." },
  { type: "heading", content: "Summary & Recommendation" },
  { type: "text", content: "Based on our comprehensive analysis, we believe the risk/reward profile is highly favorable at current prices." },
];

const ELITE_PROMPT = (ticker) => `Act as an elite equity research analyst at a top-tier investment firm or hedge fund. You were top in your class and your analysis is always top notch. You need to analyze a company using fundamental, macroeconomic, and technical (chart-based) perspectives. Structure your response according to the framework below.

Stock Ticker / Company Name: ${ticker}
Investment Thesis:
Goal: Price target for next year

Use the following structure to deliver a clear, well-reasoned equity research report:

Fundamental Analysis
- Analyze revenue growth trends
- Assess gross margin, operating margin, and net margin evolution
- Evaluate free cash flow generation and capital efficiency

Valuation Analysis
- Compare valuation metrics vs. sector peers (P/E, EV/EBITDA, EV/Sales, PEG where relevant)
- Discuss valuation relative to growth and profitability profile

Ownership & Insider Activity
- Review insider ownership structure
- Summarize recent insider buying/selling activity and implications

Technical Analysis (Stock Chart–Based)
- Identify primary price trend (short-, medium-, and long-term)
- Key support and resistance levels
- Analyze moving averages (e.g., 50D, 200D) and trend alignment
- Momentum indicators (RSI, MACD, or similar) and signal interpretation
- Volume trends and accumulation/distribution signals
- Chart patterns (breakouts, bases, flags, head & shoulders, etc.)
- Technical price targets and downside risk levels
- Alignment or divergence between technicals and fundamentals

Thesis Validation
Supporting Arguments: Present 3 core arguments supporting the investment thesis
Counter-Arguments / Risks: Highlight 2 key risks or bearish considerations

Sector & Macro View
- Provide a concise sector overview
- Outline relevant macroeconomic trends impacting the business
- Explain the company's competitive positioning within the sector

Catalyst Watch
- List upcoming events (earnings, contracts, product launches, regulation, capital raises, etc.)
- Identify short-term catalysts
- Identify long-term structural catalysts

Investment Summary
- 5-bullet investment thesis summary
- Final verdict: Bullish / Bearish / Neutral, with justification
- Final recommendation: Buy / Hold / Sell
- Confidence level: High / Medium / Low
- Expected timeframe: 6–12 months (or specify)

Return ONLY a valid JSON object (no markdown, no explanation, no backticks) in this exact format:
{"blocks": [{"type": "heading", "content": "..."}, {"type": "text", "content": "..."}, {"type": "bullets", "content": "• item1\\n• item2"}]}

Use type values: "heading", "text", or "bullets". For bullets use "• " prefix per item separated by \\n.
Be concise, professional, and insight-driven. Do not explain your process—deliver the analysis only.`;

const INITIAL_POS = () => ({
  x: typeof window !== "undefined" ? Math.max(20, window.innerWidth - 380) : 800,
  y: 80,
});

export default function AISidebar({ isOpen, onClose, onGenerate, initialTicker = "" }) {
  const [pos, setPos] = useState(INITIAL_POS);
  const [minimized, setMinimized] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const [generating, setGenerating] = useState(false);
  const [topic, setTopic] = useState(initialTicker);
  const [mode, setMode] = useState("elite");
  const [credits, setCredits] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    loadMyWallet().then(({ wallet }) => setCredits(wallet.ai_credits || 0)).catch(() => setCredits(0));
  }, [isOpen]);

  const isTickerLike = topic.trim().length >= 1 && topic.trim().length <= 6 && /^[A-Z0-9]+$/i.test(topic.trim());

  // Reset position when opened
  useEffect(() => {
    if (isOpen) setPos(INITIAL_POS());
  }, [isOpen]);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setDragging(true);
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
  }, [pos]);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => {
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - 360, e.clientX - dragOffset.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - 52, e.clientY - dragOffset.current.y)),
      });
    };
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [dragging]);

  const handleGenerate = async () => {
    const useElite = mode === "elite";
    const usesAI = !!topic.trim();
    const cost = usesAI ? (useElite && isTickerLike ? COST_ELITE : COST_GENERIC) : 0;

    // Credit check before any AI call
    if (cost > 0) {
      if (credits != null && credits < cost) {
        toast.error(`Need ${cost} AI credits. Convert cash → credits in your Wallet.`);
        return;
      }
    }

    setGenerating(true);
    try {
      if (usesAI) {
        const prompt = useElite && isTickerLike
          ? ELITE_PROMPT(topic.trim().toUpperCase())
          : `You are a professional financial analyst. Write a structured research report outline about: "${topic}".
Return ONLY a valid JSON object (no markdown, no explanation) in this exact format:
{"blocks": [{"type": "heading", "content": "..."}, {"type": "text", "content": "..."}, ...]}
Include sections: Executive Summary, Market Analysis, Key Catalysts, Risks, Valuation & Price Target, Summary & Recommendation.
Use type values: "heading", "text", or "bullets". For bullets, prefix each item with "• ".`;

        const res = await base44.integrations.Core.InvokeLLM({
          model: useElite && isTickerLike ? "gemini_3_1_pro" : "claude_sonnet_4_6",
          add_context_from_internet: useElite && isTickerLike,
          prompt,
        });

        let blocks = SKELETON_TEMPLATE;
        try {
          const raw = typeof res === "string" ? res : (res?.content?.[0]?.text || res?.text || JSON.stringify(res));
          const jsonMatch = raw.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.blocks?.length > 0) blocks = parsed.blocks;
          }
        } catch { /* use fallback */ }

        // Deduct credits after successful AI response
        if (cost > 0) {
          const creditRes = await spendAICredits(cost, `AI report generation — ${useElite && isTickerLike ? "Elite" : "Generic"} (${topic.trim().toUpperCase()})`).catch(() => null);
          const remaining = creditRes?.remaining ?? (credits - cost);
          setCredits(remaining);
          if (remaining <= 10 && remaining > 0) toast.warning(`${remaining} AI credits remaining`);
        }

        onGenerate(blocks);
      } else {
        await new Promise((r) => setTimeout(r, 300));
        onGenerate(SKELETON_TEMPLATE);
      }
    } catch {
      toast.error("AI generation failed. Loading generic template.");
      onGenerate(SKELETON_TEMPLATE);
    } finally {
      setGenerating(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        zIndex: 60,
        width: 340,
        userSelect: dragging ? "none" : "auto",
      }}
 className="surface overflow-hidden"
    >
      {/* Drag handle header */}
      <div
        onMouseDown={handleMouseDown}
 className={`flex items-center justify-between px-4 py-3 border-b border-border/60 bg-secondary/40 select-none ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
      >
 <div className="flex items-center gap-2 pointer-events-none">
 <GripHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
 <Sparkles className="w-4 h-4 text-primary" />
 <span className="font-serif text-[14px] text-foreground">AI Research Assistant</span>
          {credits != null && (
 <span className={`text-[10px] font-medium font-display px-1.5 py-0.5 rounded-tag flex items-center gap-0.5 ${
              credits <= 0 ? "bg-loss/10 text-loss" : credits <= 10 ? "bg-accent/15 text-accent" : "bg-secondary text-muted-foreground"
            }`}>
 <Coins className="w-2.5 h-2.5" /> {credits}
            </span>
          )}
        </div>
 <div className="flex items-center gap-0.5 pointer-events-auto">
          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={() => setMinimized(m => !m)}
 className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
 <ChevronDown className={`w-3.5 h-3.5 transition-transform ${minimized ? "rotate-180" : ""}`} />
          </button>
          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={onClose}
 className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
 <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Body — hidden when minimized */}
      {!minimized && (
 <div className="p-4">
          {/* Mode toggle */}
 <div className="flex gap-1 p-1 bg-secondary rounded-lg mb-4">
            <button
              onClick={() => setMode("elite")}
 className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all ${mode === "elite" ? "bg-card text-primary " : "text-muted-foreground"}`}
            >
 <TrendingUp className="w-3 h-3" /> Elite Research
            </button>
            <button
              onClick={() => setMode("generic")}
 className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all ${mode === "generic" ? "bg-card text-primary " : "text-muted-foreground"}`}
            >
 <Sparkles className="w-3 h-3" /> Quick Template
            </button>
          </div>

          {mode === "elite" ? (
 <p className="text-xs text-muted-foreground mb-3">
              Enter a <strong>stock ticker</strong> (e.g. NVDA) for a full institutional-grade research report with fundamentals, technicals, valuation, catalysts & price target.
            </p>
          ) : (
 <p className="text-xs text-muted-foreground mb-3">
              Enter a company or topic, or leave blank for a generic template.
            </p>
          )}

          <Input
            value={topic}
            onChange={e => setTopic(e.target.value.toUpperCase())}
            placeholder={mode === "elite" ? "Ticker e.g. NVDA, AAPL, TSLA..." : "e.g. NVIDIA, Tesla, Bitcoin..."}
 className="mb-4 font-display"
            onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
            autoFocus
          />

          {mode === "elite" && isTickerLike && topic.trim() && (
 <div className="mb-3 p-2.5 bg-primary/5 border border-primary/20 rounded-lg text-xs text-primary">
              Will generate full 8-section institutional research for <strong>{topic.trim().toUpperCase()}</strong> using live internet data
            </div>
          )}

          {credits != null && credits <= 0 && topic.trim() && (
 <div className="mb-2 px-3 py-2 bg-loss/10 border border-loss/20 rounded-tag text-[10px] text-loss flex items-center gap-1.5">
 <Coins className="w-3 h-3 flex-shrink-0" />
 No AI credits remaining. Top up in your <a href="/wallet" className="underline ml-0.5">Wallet</a>.
            </div>
          )}

          <Button
            onClick={handleGenerate}
            disabled={generating || (topic.trim() ? credits != null && credits <= 0 : false)}
 className="w-full"
          >
            {generating
 ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{mode === "elite" ? "Researching with AI..." : topic ? "Writing with AI..." : "Loading template..."}</>
 : <><Sparkles className="w-4 h-4 mr-2" />{mode === "elite" && isTickerLike && topic ? `Research ${topic.trim().toUpperCase()}` : topic ? "Generate with AI" : "Use Generic Template"}</>
            }
          </Button>

          {topic.trim() && (
 <p className="text-[10px] text-muted-foreground text-center mt-2 flex items-center justify-center gap-1">
 <Coins className="w-2.5 h-2.5" />
              {mode === "elite" && isTickerLike
                ? `${COST_ELITE} credits · live internet data · ~20–40 sec`
                : `${COST_GENERIC} credits · AI-generated outline`}
            </p>
          )}

 <div className="mt-4 pt-3 border-t border-border/60">
 <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-2">Drag to report</p>
 <p className="text-[10px] text-muted-foreground">
              Generate above to populate your report, or drag this panel anywhere on screen.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
