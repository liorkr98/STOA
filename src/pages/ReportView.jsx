import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { getReports } from "@/lib/mockData";
import PredictionBadge from "@/components/feed/PredictionBadge";
import TickerTag from "@/components/feed/TickerTag";
import ShareMenu from "@/components/feed/ShareMenu";
import CommentsSection from "@/components/report/CommentsSection";
import FactChecker from "@/components/report/FactChecker";

const FULL_CONTENT = `NVIDIA's dominance in the AI infrastructure market has never been more apparent than in Q1 2026. The H200 chip, featuring 141 GB of HBM3e memory and 3.35 TB/s bandwidth, represents a 3x improvement in memory bandwidth over its predecessor.

Data center revenue grew 427% year-over-year in the latest quarter, far outpacing any comparable period in semiconductor history. The company's CUDA ecosystem — with over 4 million developers — creates an almost unassailable competitive moat that rivals simply cannot replicate in the near term.

Our DCF model, using a 10% discount rate and conservative 5-year growth projections of 30% annually, yields a fair value of approximately $1,050 per share. This assumes no further market share gains and modest margin compression from competition.

Enterprise AI capex is expected to triple by 2027, with hyperscalers like Microsoft, Google, and Amazon already committing multi-billion dollar orders for Blackwell architecture chips.

Catalysts include: the Blackwell ramp in H2 2026, Project DIGITS expansion, and sovereign AI initiatives across Europe and Asia.`;

export default function ReportView() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const reportId = urlParams.get("id") || "r1";
  const isPaid = urlParams.get("paid") === "true";
  const allReports = getReports();
  const report = allReports.find((r) => r.id === reportId) || allReports[0];
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(report.likes);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Feed
      </button>

      <div className="flex flex-wrap gap-2 mb-4">
        {report.tickers.map((t) => <TickerTag key={t} ticker={t} />)}
      </div>

      <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-4 leading-tight">{report.title}</h1>

      <div className="flex flex-wrap items-center gap-4 mb-6">
        <button onClick={() => navigate(`/analyst?id=${report.author.id}`)} className="flex items-center gap-2">
          <img src={report.author.avatar} alt={report.author.name} className="w-9 h-9 rounded-full border border-border" />
          <div>
            <p className="font-semibold text-sm text-foreground hover:text-primary transition-colors">{report.author.name}</p>
            <p className="text-xs text-muted-foreground">{report.author.accuracy}% Acc.</p>
          </div>
        </button>
        <span className="text-xs text-muted-foreground">{format(new Date(report.publishedAt), "MMMM d, yyyy · h:mm a")}</span>
        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={() => { setLiked(!liked); setLikeCount(p => liked ? p - 1 : p + 1); }}
            className={`flex items-center gap-1.5 text-sm transition-colors ${liked ? "text-loss" : "text-muted-foreground"}`}
          >
            <Heart className={`w-4 h-4 ${liked ? "fill-loss" : ""}`} />
            {likeCount}
          </button>
          <ShareMenu title={report.title} reportId={report.id} />
        </div>
      </div>

      {report.prediction?.outcome && (
        <div className={`flex items-start gap-3 p-4 rounded-xl border mb-6 ${report.prediction.outcome === "hit" ? "bg-gain/10 border-gain/20" : "bg-loss/10 border-loss/20"}`}>
          {report.prediction.outcome === "hit" ? <CheckCircle2 className="w-5 h-5 text-gain flex-shrink-0 mt-0.5" /> : <XCircle className="w-5 h-5 text-loss flex-shrink-0 mt-0.5" />}
          <div>
            <p className={`font-semibold text-sm ${report.prediction.outcome === "hit" ? "text-gain" : "text-loss"}`}>
              {report.prediction.outcome === "hit" ? "Prediction Hit ✓" : "Prediction Missed ✗"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{report.prediction.outcomeNote}</p>
          </div>
        </div>
      )}

      {report.prediction && <div className="mb-6"><PredictionBadge prediction={report.prediction} /></div>}

      <div className="prose prose-sm max-w-none">
        {(!report.isPremium || isPaid) ? (
          FULL_CONTENT.split("\n\n").map((para, i) => (
            <p key={i} className="text-sm text-foreground/90 leading-relaxed mb-4">{para}</p>
          ))
        ) : (
          <>
            <p className="text-sm text-foreground/90 leading-relaxed mb-4">{report.excerpt}</p>
            <p className="text-sm text-muted-foreground line-clamp-3 mb-6">
              NVIDIA's H200 chip, featuring 141 GB of HBM3e memory, represents a significant leap in memory bandwidth. Data center revenue grew 427% year-over-year in the latest quarter...
            </p>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center mb-6">
              <Badge className="bg-amber-500 text-white mb-3">Premium Report</Badge>
              <h3 className="font-bold text-lg mb-2">This is a Premium Report</h3>
              <p className="text-sm text-muted-foreground mb-4">Unlock the full analysis, DCF model, and detailed catalysts.</p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button
                  onClick={() => navigate(`/pay?mode=report&id=${report.id}&title=${encodeURIComponent(report.title)}&price=${report.price || 4.99}&analyst=${encodeURIComponent(report.author.name)}`)}
                  className="bg-amber-500 hover:bg-amber-600 text-white"
                >
                  Unlock for ${report.price || 4.99}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate(`/pay?mode=analyst&analyst=${encodeURIComponent(report.author.name)}`)}
                >
                  Subscribe from $9/mo
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {(!report.isPremium || isPaid) && (
        <FactChecker reportContent={FULL_CONTENT} />
      )}

      <CommentsSection />
    </div>
  );
}