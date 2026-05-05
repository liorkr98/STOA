import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Loader2, X, TrendingUp } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

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

export default function AISidebar({ isOpen, onClose, onGenerate, initialTicker = "" }) {
  const [generating, setGenerating] = useState(false);
  const [topic, setTopic] = useState(initialTicker);
  const [mode, setMode] = useState("elite"); // "elite" | "generic"

  // If opened with a ticker pre-filled from editor, detect it
  const isTickerLike = topic.trim().length >= 1 && topic.trim().length <= 6 && /^[A-Z0-9]+$/i.test(topic.trim());

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      if (topic.trim()) {
        const useElite = mode === "elite";
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
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">AI Report Generator</h3>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-1 p-1 bg-secondary rounded-lg mb-4">
          <button
            onClick={() => setMode("elite")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all ${mode === "elite" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}
          >
            <TrendingUp className="w-3 h-3" /> Elite Research
          </button>
          <button
            onClick={() => setMode("generic")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all ${mode === "generic" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}
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
          className="mb-4 font-mono"
          onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
          autoFocus
        />

        {mode === "elite" && isTickerLike && topic.trim() && (
          <div className="mb-3 p-2.5 bg-primary/5 border border-primary/20 rounded-lg text-xs text-primary">
            ✓ Will generate full 8-section institutional research for <strong>{topic.trim().toUpperCase()}</strong> using live internet data
          </div>
        )}

        <Button onClick={handleGenerate} disabled={generating} className="w-full">
          {generating
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{mode === "elite" ? "Researching with AI..." : topic ? "Writing with AI..." : "Loading template..."}</>
            : <><Sparkles className="w-4 h-4 mr-2" />{mode === "elite" && isTickerLike && topic ? `Research ${topic.trim().toUpperCase()}` : topic ? "Generate with AI" : "Use Generic Template"}</>
          }
        </Button>

        {mode === "elite" && (
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            Uses Claude Sonnet + live internet data. Takes ~20–40 seconds.
          </p>
        )}
      </div>
    </div>
  );
}