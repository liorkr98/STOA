import React, { useState, useEffect } from "react";
import { Flame } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";

export default function TrendingPanel() {
  const navigate = useNavigate();
  const [trendingTickers, setTrendingTickers] = useState([]);
  const [trendingTopics, setTrendingTopics] = useState([]);

  useEffect(() => {
    base44.entities.Report.filter({ status: "published" }, "-created_date", 50).then(reports => {
      if (!reports?.length) return;

      // Count ticker frequency
      const tickerCount = {};
      reports.forEach(r => {
        (r.tickers || []).forEach(t => { tickerCount[t] = (tickerCount[t] || 0) + 1; });
      });
      const sorted = Object.entries(tickerCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t]) => t);
      setTrendingTickers(sorted);

      // Extract trending topics from industries
      const industryCount = {};
      reports.forEach(r => {
        if (r.industry) industryCount[r.industry] = (industryCount[r.industry] || 0) + 1;
      });
      const topics = Object.entries(industryCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t]) => t);
      setTrendingTopics(topics);
    }).catch(() => {});
  }, []);

  if (trendingTickers.length === 0 && trendingTopics.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <Flame className="w-4 h-4 text-orange-500" />
        <h3 className="font-semibold text-sm">Trending Now</h3>
      </div>
      {trendingTickers.length > 0 && (
        <div className="space-y-1 mb-4">
          {trendingTickers.map((ticker, i) => (
            <button
              key={ticker}
              onClick={() => navigate(`/stock?ticker=${ticker}`)}
              className="flex items-center gap-2 w-full hover:bg-secondary rounded-lg p-1.5 -mx-1.5 transition-colors text-left"
            >
              <span className="text-xs text-muted-foreground w-3">{i + 1}</span>
              <span className="text-xs font-mono font-bold text-foreground flex-1">${ticker}</span>
            </button>
          ))}
        </div>
      )}
      {trendingTopics.length > 0 && (
        <div className="border-t border-border pt-3">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Top Sectors</p>
          <div className="flex flex-wrap gap-1.5">
            {trendingTopics.map(t => (
              <span key={t} className="text-[10px] px-2 py-0.5 bg-secondary border border-border rounded-full text-muted-foreground">{t}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}