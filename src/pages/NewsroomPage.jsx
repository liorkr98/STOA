import React, { useState } from "react";
import { ChevronRight, X, ArrowLeft } from "lucide-react";

// Newsroom items now expand into a detail view when clicked. They were
// previously static cards with no affordance — clicks did nothing.
// Each item has a `body` field with the full announcement; clicking the
// card opens an inline reader with full text.
const NEWS = [
  {
    date: "May 1, 2026",
    title: "STOA Reaches 50,000 Registered Analysts",
    excerpt: "The platform's analyst community has grown 3x in Q1 2026, driven by increased demand for transparent financial research.",
    body: "STOA's verified-track-record model continues to attract independent analysts who want to monetise their research without losing 50%+ to a platform fee. Q1 2026 saw the largest single-quarter influx since launch, with new researchers spanning macro, biotech, energy and small-cap equity coverage.\n\nThe milestone comes alongside steady growth in retail and institutional readers, who now follow more than 8,000 active researchers across the platform.",
  },
  {
    date: "Apr 15, 2026",
    title: "Introducing AI Research Assistant",
    excerpt: "STOA now offers an AI-powered writing assistant to help analysts produce higher quality research reports faster.",
    body: "The new AI Research Assistant — accessible from the editor sidebar — can pull live financial data, draft section openers, generate comparison charts, and run a pre-publish fact check against Yahoo Finance and SEC EDGAR. The assistant is included in every plan and metered via the AI Credits system in the wallet.",
  },
  {
    date: "Mar 22, 2026",
    title: "STOA Prediction Accuracy Methodology Updated",
    excerpt: "We've improved our prediction scoring algorithm to better reflect partial hits and directional accuracy.",
    body: "The scoring engine now uses three honest pillars — Wilson-adjusted win rate, profit factor, and alpha vs S&P benchmark — instead of an ELO-style competition score. Researchers with strong directional calls but small position sizes are no longer penalised, and partial hits now count proportionally toward the accuracy score.\n\nFull methodology is documented on the /scoring page.",
  },
  {
    date: "Feb 10, 2026",
    title: "Premium Report Monetization Now Available",
    excerpt: "Analysts can now charge for their research reports, with STOA taking a 10% platform fee.",
    body: "Premium reports unlock per-report pricing (set by the researcher) and persistent paid-subscription tiers. Payouts settle weekly to the researcher's wallet. STOA's 10% platform fee is the lowest of any major financial-content platform.",
  },
];

export default function NewsroomPage() {
  const [openIdx, setOpenIdx] = useState(null);
  const open = openIdx == null ? null : NEWS[openIdx];

  if (open) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <button
          type="button"
          onClick={() => setOpenIdx(null)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Newsroom
        </button>
        <p className="text-xs text-muted-foreground mb-2">{open.date}</p>
        <h1 className="text-2xl font-medium mb-4" style={{ fontFamily: "Lora, Georgia, serif" }}>{open.title}</h1>
        <p className="text-base text-foreground/85 leading-relaxed whitespace-pre-line">{open.body}</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-medium mb-2" style={{ fontFamily: "Lora, Georgia, serif" }}>Newsroom</h1>
      <p className="text-muted-foreground mb-8">Latest news and updates from STOA.</p>
      <div className="space-y-4">
        {NEWS.map((item, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setOpenIdx(i)}
            className="w-full text-left p-5 bg-card border border-border rounded-2xl hover:border-primary/30 hover:shadow-sm transition-all group flex items-start gap-3"
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-1">{item.date}</p>
              <h3 className="font-medium text-base mb-2 group-hover:text-primary transition-colors">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.excerpt}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
          </button>
        ))}
      </div>
    </div>
  );
}
