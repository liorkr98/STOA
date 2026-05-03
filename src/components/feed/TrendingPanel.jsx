import React from "react";
import { Flame, TrendingUp } from "lucide-react";
import { MOCK_STOCKS } from "@/lib/mockData";
import { useNavigate } from "react-router-dom";

const TRENDING_TICKERS = ["NVDA", "TSLA", "PLTR", "ARM", "AMD"];
const TRENDING_TOPICS = ["AI Infrastructure", "Fed Rate Decision", "Earnings Season", "Robotics & Automation", "Crypto Rally"];

export default function TrendingPanel() {
  const navigate = useNavigate();
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <Flame className="w-4 h-4 text-orange-500" />
        <h3 className="font-semibold text-sm">Trending Now</h3>
      </div>
      <div className="space-y-1 mb-4">
        {TRENDING_TICKERS.map((ticker, i) => {
          const stock = MOCK_STOCKS[ticker];
          const isUp = stock?.changePercent >= 0;
          return (
            <button
              key={ticker}
              onClick={() => navigate(`/stock?ticker=${ticker}`)}
              className="flex items-center gap-2 w-full hover:bg-secondary rounded-lg p-1.5 -mx-1.5 transition-colors text-left"
            >
              <span className="text-xs text-muted-foreground w-3">{i + 1}</span>
              <span className="text-xs font-mono font-bold text-foreground flex-1">${ticker}</span>
              {stock && (
                <span className={`text-xs font-semibold ${isUp ? "text-gain" : "text-loss"}`}>
                  {isUp ? "+" : ""}{stock.changePercent.toFixed(2)}%
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="border-t border-border pt-3">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Trending Topics</p>
        <div className="flex flex-wrap gap-1.5">
          {TRENDING_TOPICS.map(t => (
            <span key={t} className="text-[10px] px-2 py-0.5 bg-secondary border border-border rounded-full text-muted-foreground">{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}