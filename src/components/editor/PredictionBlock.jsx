import React, { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { MOCK_STOCKS } from "@/lib/mockData";
import { format } from "date-fns";

export default function PredictionBlock({ onPublish }) {
  const [action, setAction] = useState("");
  const [ticker, setTicker] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [timeframe, setTimeframe] = useState("");
  const [locked, setLocked] = useState(false);
  const [lockData, setLockData] = useState(null);

  const handlePublish = () => {
    const stock = MOCK_STOCKS[ticker.toUpperCase()];
    const lockPrice = stock ? stock.price : parseFloat(targetPrice) * 0.9;
    const data = { action, ticker: ticker.toUpperCase(), targetPrice: parseFloat(targetPrice), timeframe, lockPrice, lockTime: new Date().toISOString() };
    setLockData(data);
    setLocked(true);
    if (onPublish) onPublish(data);
  };

  const isValid = action && ticker && targetPrice && timeframe;
  const ACTION_ICONS = { Long: ArrowUp, Short: ArrowDown, Hold: Minus };
  const ACTION_COLORS = { Long: "text-gain", Short: "text-loss", Hold: "text-amber-600" };

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
          <Button onClick={handlePublish} disabled={!isValid} size="sm" className="w-full">
            <Lock className="w-3.5 h-3.5 mr-1.5" />
            Publish & Lock Prediction
          </Button>
        </div>
      ) : (
        <div className={`flex items-center gap-3 p-3 rounded-lg ${ACTION_COLORS[lockData?.action] ? "bg-gain/5" : ""}`}>
          {lockData && (
            <>
              {React.createElement(ACTION_ICONS[lockData.action], { className: `w-5 h-5 ${ACTION_COLORS[lockData.action]}` })}
              <div>
                <div className="flex items-center gap-2">
                  <span className={`font-bold ${ACTION_COLORS[lockData.action]}`}>{lockData.action}</span>
                  <span className="font-mono font-bold text-foreground">${lockData.ticker}</span>
                </div>
                <p className="text-xs text-muted-foreground">Target: ${lockData.targetPrice} · {lockData.timeframe}</p>
                <p className="text-xs text-muted-foreground">{format(new Date(lockData.lockTime), "MMM d, yyyy · HH:mm")}</p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}