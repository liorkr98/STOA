import React from "react";
import { MOCK_STOCKS } from "@/lib/mockData";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function TickerTag({ ticker }) {
  const stock = MOCK_STOCKS[ticker];
  const navigate = useNavigate();
  const isPositive = stock ? stock.change >= 0 : true;

  return (
    <button
      onClick={(e) => { e.stopPropagation(); navigate(`/stock?ticker=${ticker}`); }}
      className="inline-flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded-md bg-secondary border border-border hover:border-primary/40 transition-colors"
    >
      <span className="font-bold">${ticker}</span>
      {stock && (
        <>
          <span className="text-foreground">${stock.price.toFixed(2)}</span>
          {isPositive ? <TrendingUp className="w-3 h-3 text-gain" /> : <TrendingDown className="w-3 h-3 text-loss" />}
          <span className={isPositive ? "text-gain" : "text-loss"}>{isPositive ? "+" : ""}{stock.changePercent.toFixed(2)}%</span>
        </>
      )}
    </button>
  );
}