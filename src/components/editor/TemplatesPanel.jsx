import React, { useState } from "react";
import { Sparkles, FileText, TrendingUp, BarChart3, Zap, Shield, Target, Globe, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const TEMPLATES = [
  {
    id: "equity_deep",
    name: "Equity Deep Dive",
    tag: "Most Popular",
    tagColor: "bg-primary text-white",
    icon: TrendingUp,
    color: "from-blue-50 to-indigo-50 border-blue-200",
    iconColor: "text-primary",
    desc: "Full institutional-grade equity research with valuation, technicals, and catalysts.",
    preview: ["Executive Summary", "Investment Thesis", "Fundamental Analysis", "Valuation (DCF/Comps)", "Technical Setup", "Key Catalysts & Risks", "Price Target", "DYOR Disclaimer"],
    blocks: [
      { type: "heading", content: "Executive Summary" },
      { type: "text", content: "Write your 2-3 sentence executive summary here. This should capture the core thesis and price target clearly." },
      { type: "heading", content: "Investment Thesis" },
      { type: "bullets", content: "• Core reason #1 why this is a strong opportunity\n• Core reason #2 — competitive moat or catalyst\n• Core reason #3 — valuation or technical setup" },
      { type: "heading", content: "Fundamental Analysis" },
      { type: "text", content: "Revenue growth, margins, free cash flow analysis goes here. Compare to sector peers and historical trends." },
      { type: "heading", content: "Valuation" },
      { type: "text", content: "DCF assumptions, EV/EBITDA or P/E multiples vs. peers. Fair value range and upside/downside scenario." },
      { type: "heading", content: "Technical Setup" },
      { type: "text", content: "Current trend, key support/resistance levels, moving averages (50D, 200D), RSI/MACD signals." },
      { type: "heading", content: "Key Catalysts" },
      { type: "bullets", content: "• Near-term catalyst: e.g. earnings, product launch\n• Medium-term: market expansion\n• Long-term structural tailwind" },
      { type: "heading", content: "Risks" },
      { type: "bullets", content: "• Risk #1 — macro or sector headwind\n• Risk #2 — competitive threat\n• Risk #3 — execution or valuation risk" },
      { type: "heading", content: "Price Target & Recommendation" },
      { type: "text", content: "12-month price target: $___. Recommendation: BUY / HOLD / SELL. Confidence: High / Medium / Low." },
      { type: "text", content: "⚠️ Disclaimer: This report is for informational purposes only and does not constitute financial advice. Always do your own research (DYOR) before making any investment decisions." },
    ]
  },
  {
    id: "earnings_preview",
    name: "Earnings Preview",
    tag: "Timely",
    tagColor: "bg-amber-500 text-white",
    icon: BarChart3,
    color: "from-amber-50 to-orange-50 border-amber-200",
    iconColor: "text-amber-600",
    desc: "Pre-earnings analysis: expectations, estimates, options positioning, and key metrics to watch.",
    preview: ["Overview", "Consensus Estimates", "What to Watch", "Options Positioning", "My Expectations", "Trade Setup"],
    blocks: [
      { type: "heading", content: "Earnings Preview" },
      { type: "text", content: "Earnings date: ___. This report covers what to expect and how we're positioned." },
      { type: "heading", content: "Consensus Estimates" },
      { type: "bullets", content: "• EPS estimate: $___  (vs. $___ prior year)\n• Revenue estimate: $___B (vs. $___B prior year)\n• Guidance range: $___–$___" },
      { type: "heading", content: "Key Metrics to Watch" },
      { type: "bullets", content: "• Metric #1 — e.g. subscriber growth\n• Metric #2 — e.g. margin expansion\n• Metric #3 — e.g. forward guidance tone" },
      { type: "heading", content: "Options Positioning" },
      { type: "text", content: "Implied move: ±___%. Put/call ratio: ___. Key IV levels and notable flow." },
      { type: "heading", content: "My Expectations" },
      { type: "text", content: "I expect the company to ___ on revenue / __ on EPS. The key upside surprise would be ___. Key risk is ___." },
      { type: "heading", content: "Trade Setup" },
      { type: "text", content: "Entry: $___. Target: $___. Stop: $___. Risk/Reward: ___:1." },
      { type: "text", content: "⚠️ Disclaimer: This report is for informational purposes only and does not constitute financial advice." },
    ]
  },
  {
    id: "sector_macro",
    name: "Macro / Sector View",
    tag: "Big Picture",
    tagColor: "bg-green-600 text-white",
    icon: Globe,
    color: "from-green-50 to-emerald-50 border-green-200",
    iconColor: "text-green-600",
    desc: "Top-down macro analysis, sector rotation thesis, and best-in-class stock picks.",
    preview: ["Macro Backdrop", "Sector Thesis", "Winners & Losers", "Key Risks", "Top Picks"],
    blocks: [
      { type: "heading", content: "Macro Backdrop" },
      { type: "text", content: "Current interest rate environment, inflation dynamics, and Fed posture. How this shapes the investment landscape." },
      { type: "heading", content: "Sector Thesis" },
      { type: "text", content: "Why this sector is positioned to outperform / underperform over the next 6–12 months." },
      { type: "heading", content: "Sector Winners" },
      { type: "bullets", content: "• Company A — reason for outperformance\n• Company B — key differentiator\n• Company C — valuation + catalyst" },
      { type: "heading", content: "Sector Losers" },
      { type: "bullets", content: "• Company X — headwind\n• Company Y — overvalued vs. peers" },
      { type: "heading", content: "Key Macro Risks" },
      { type: "bullets", content: "• Risk #1 — e.g. recession probability\n• Risk #2 — geopolitical tension\n• Risk #3 — currency / commodity shock" },
      { type: "heading", content: "Top Picks" },
      { type: "text", content: "My highest-conviction ideas in this sector right now and why." },
      { type: "text", content: "⚠️ Disclaimer: This report is for informational purposes only and does not constitute financial advice." },
    ]
  },
  {
    id: "short_thesis",
    name: "Short Thesis",
    tag: "Bearish",
    tagColor: "bg-red-500 text-white",
    icon: Shield,
    color: "from-red-50 to-rose-50 border-red-200",
    iconColor: "text-red-500",
    desc: "A structured bearish thesis with overvaluation, red flags, and downside targets.",
    preview: ["Bear Case Summary", "Overvaluation Analysis", "Red Flags", "Catalysts for Decline", "Target Price", "Risk to Thesis"],
    blocks: [
      { type: "heading", content: "Bear Case Summary" },
      { type: "text", content: "One paragraph summarizing why this company is a strong short candidate and the core thesis." },
      { type: "heading", content: "Overvaluation Analysis" },
      { type: "text", content: "Current valuation multiples vs. historical average and peer group. Implied growth rates that are unrealistic." },
      { type: "heading", content: "Red Flags" },
      { type: "bullets", content: "• Red flag #1 — e.g. declining margins\n• Red flag #2 — insider selling\n• Red flag #3 — accounting irregularities or revenue quality\n• Red flag #4 — deteriorating competitive position" },
      { type: "heading", content: "Catalysts for Decline" },
      { type: "bullets", content: "• Near-term: earnings miss or guidance cut\n• Medium-term: market share loss\n• Long-term: business model disruption" },
      { type: "heading", content: "Downside Target" },
      { type: "text", content: "Bear case: $___. Base case target: $___. Assumes ___ multiple compression on forward earnings." },
      { type: "heading", content: "Risks to the Short Thesis" },
      { type: "bullets", content: "• What could make us wrong: buyout/M&A activity\n• Short squeeze risk\n• Regulatory tailwind" },
      { type: "text", content: "⚠️ Disclaimer: This report is for informational purposes only and does not constitute financial advice." },
    ]
  },
  {
    id: "quick_take",
    name: "Quick Take",
    tag: "Fast",
    tagColor: "bg-purple-500 text-white",
    icon: Zap,
    color: "from-purple-50 to-violet-50 border-purple-200",
    iconColor: "text-purple-500",
    desc: "A concise 200–400 word hot take on a stock, event, or market development.",
    preview: ["What Happened", "Why It Matters", "My Take", "Action"],
    blocks: [
      { type: "heading", content: "What Happened" },
      { type: "text", content: "2–3 sentences summarizing the news or event that triggered this note." },
      { type: "heading", content: "Why It Matters" },
      { type: "text", content: "Market impact, valuation implication, or strategic significance." },
      { type: "heading", content: "My Take" },
      { type: "text", content: "Concise opinion. Bullish / Bearish / Neutral and the single most important reason why." },
      { type: "heading", content: "Action" },
      { type: "text", content: "What I'm doing: Buy / Sell / Watch. At what price. With what stop." },
      { type: "text", content: "⚠️ Disclaimer: This report is for informational purposes only and does not constitute financial advice." },
    ]
  },
  {
    id: "blank",
    name: "Blank Canvas",
    tag: "",
    tagColor: "",
    icon: FileText,
    color: "from-slate-50 to-gray-50 border-slate-200",
    iconColor: "text-muted-foreground",
    desc: "Start with a completely blank report and build your own structure from scratch.",
    preview: ["Your structure, your rules"],
    blocks: [
      { type: "text", content: "" }
    ]
  },
];

export default function TemplatesPanel({ onSelectTemplate, onClose }) {
  const [hoveredId, setHoveredId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  const handleSelect = (template) => {
    setSelectedId(template.id);
    setTimeout(() => {
      onSelectTemplate(template.blocks);
      onClose();
    }, 150);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold">Report Templates</h2>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-secondary transition-colors">✕</button>
          </div>
          <p className="text-sm text-muted-foreground">Choose a professionally structured template to start with. All content is fully editable.</p>
        </div>

        {/* Grid */}
        <div className="overflow-y-auto p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TEMPLATES.map(template => {
            const Icon = template.icon;
            const isHovered = hoveredId === template.id;
            const isSelected = selectedId === template.id;
            return (
              <button
                key={template.id}
                onClick={() => handleSelect(template)}
                onMouseEnter={() => setHoveredId(template.id)}
                onMouseLeave={() => setHoveredId(null)}
                className={`text-left rounded-2xl border-2 overflow-hidden transition-all duration-200 group ${
                  isSelected ? "border-primary scale-[0.98]" :
                  isHovered ? "border-primary/50 shadow-lg -translate-y-0.5" :
                  "border-border hover:border-primary/30"
                }`}
              >
                {/* Card header */}
                <div className={`bg-gradient-to-br ${template.color} p-4`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className={`p-2 bg-white/70 rounded-xl`}>
                      <Icon className={`w-5 h-5 ${template.iconColor}`} />
                    </div>
                    {template.tag && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${template.tagColor}`}>
                        {template.tag}
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-sm text-foreground mb-1">{template.name}</h3>
                  <p className="text-xs text-muted-foreground leading-snug">{template.desc}</p>
                </div>

                {/* Sections preview */}
                <div className="p-3 bg-card">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Sections</p>
                  <div className="space-y-1">
                    {template.preview.slice(0, 5).map((s, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-xs text-foreground/70">
                        <div className="w-1 h-1 rounded-full bg-primary/40 flex-shrink-0" />
                        {s}
                      </div>
                    ))}
                    {template.preview.length > 5 && (
                      <div className="text-[10px] text-muted-foreground pl-2.5">+{template.preview.length - 5} more sections</div>
                    )}
                  </div>
                  <div className={`mt-3 flex items-center gap-1 text-xs font-semibold transition-colors ${isHovered ? "text-primary" : "text-muted-foreground"}`}>
                    Use this template <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}