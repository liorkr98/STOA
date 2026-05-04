import React, { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { MOCK_STOCKS } from "@/lib/mockData";
import { format } from "date-fns";
import { Progress } from "@/components/ui/progress";

export default function PredictionBlock({ onPublish }) {
  const [action, setAction] = useState("");
  const [ticker, setTicker] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [timeframe, setTimeframe] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [portfolioPct, setPortfolioPct] = useState("");
  const [exitNote, setExitNote] = useState("");
  const [locked, setLocked] = useState(false);
  const [lockData, setLockData] = useState(null);

  const handlePublish = () => {
    const stock = MOCK_STOCKS[ticker.toUpperCase()];
    const lockPrice = stock ? stock.price : parseFloat(targetPrice) * 0.9;
    const data = {
      action,
      ticker: ticker.toUpperCase(),
      targetPrice: parseFloat(targetPrice),
      timeframe,
      lockPrice,
      lockTime: new Date().toISOString(),
      stopLoss: stopLoss ? parseFloat(stopLoss) : null,
      portfolioPct: portfolioPct ? parseFloat(portfolioPct) : null,
      exitNote: exitNote || null,
    };
    setLockData(data);
    setLocked(true);
    if (onPublish) onPublish(data);
  };

  const isValid = action && ticker && targetPrice && timeframe;
  const ACTION_ICONS = { Long: ArrowUp, Short: ArrowDown, Hold: Minus };
  const ACTION_COLORS = { Long: "text-gain", Short: "text-loss", Hold: "text-amber-600" };
  const ACTION_BG = { Long: "bg-gain/5", Short: "bg-loss/5", Hold: "bg-amber-50/50" };

  return (
    <div className="bg-secondary border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-primary" />
          <h4 className="font-semibold text-sm">Prediction Block</h4>
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${locked ? "bg-gain/10 text-gain" : "bg-amber-50 text-amber-700"}`}>
          {locked ? "Locked" : "Required"}
        </span>
      </div>

      {!locked ? (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Action</label>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Select direction" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Long">Long</SelectItem>
                <SelectItem value="Short">Short</SelectItem>
                <SelectItem value="Hold">Hold</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Ticker</label>
              <Input value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())} placeholder="e.g. AAPL" className="h-9 font-mono" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Target Price</label>
              <Input value={targetPrice} onChange={e => setTargetPrice(e.target.value)} placeholder="$0.00" className="h-9 font-mono" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Stop Loss <span className="text-muted-foreground/50">(optional)</span></label>
              <Input value={stopLoss} onChange={e => setStopLoss(e.target.value)} placeholder="$0.00" className="h-9 font-mono" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Portfolio % <span className="text-muted-foreground/50">(optional)</span></label>
              <Input value={portfolioPct} onChange={e => setPortfolioPct(e.target.value)} placeholder="e.g. 5" type="number" min="1" max="100" className="h-9 font-mono" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Timeframe</label>
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Select timeframe" /></SelectTrigger>
              <SelectContent>
                {["3 Days", "5 Days", "1 Week", "2 Weeks", "1 Month", "3 Months", "6 Months", "12 Months"].map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Exit Strategy Note <span className="text-muted-foreground/50">(optional)</span></label>
            <Input value={exitNote} onChange={e => setExitNote(e.target.value)} placeholder="e.g. Exit on earnings disappointment or if RSI > 80" className="h-9 text-xs" />
          </div>

          <Button onClick={handlePublish} disabled={!isValid} size="sm" className="w-full">
            <Lock className="w-3.5 h-3.5 mr-1.5" />
            Publish & Lock Prediction
          </Button>
        </div>
      ) : (
        <div className={`rounded-lg p-3 ${ACTION_BG[lockData?.action] || ""}`}>
          {lockData && (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                {React.createElement(ACTION_ICONS[lockData.action], { className: `w-5 h-5 ${ACTION_COLORS[lockData.action]}` })}
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${ACTION_COLORS[lockData.action]}`}>{lockData.action}</span>
                    <span className="font-mono font-bold text-foreground">${lockData.ticker}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Target: ${lockData.targetPrice} · {lockData.timeframe}
                    {lockData.stopLoss && ` · Stop: $${lockData.stopLoss}`}
                  </p>
                  <p className="text-xs text-muted-foreground">{format(new Date(lockData.lockTime), "MMM d, yyyy · HH:mm")}</p>
                </div>
              </div>

              {lockData.portfolioPct && (
                <div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Portfolio allocation</span>
                    <span className="font-semibold text-foreground">{lockData.portfolioPct}%</span>
                  </div>
                  <Progress value={lockData.portfolioPct} className="h-1.5" />
                </div>
              )}

              {lockData.exitNote && (
                <p className="text-xs text-muted-foreground italic border-l-2 border-border pl-2">
                  Exit: {lockData.exitNote}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}