import React, { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock, ArrowUp, ArrowDown, Minus, Loader2, RefreshCw, AlertCircle, Info } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const TIMEFRAMES = [
  "3 Days", "5 Days", "1 Week", "2 Weeks",
  "1 Month", "3 Months", "6 Months", "12 Months",
];

// New API:
//   onChange({ action, ticker, targetPrice, timeframe, stopLoss, portfolioPct, exitNote, companyName })
//   initialData?: prior draft form values (no lock price — that's set at publish)
export default function PredictionBlock({ onChange, onPublish, initialData }) {
  const emit = onChange || onPublish; // backward-compat with old onPublish prop name

  const [action,       setAction]       = useState(initialData?.action       || "");
  const [ticker,       setTicker]       = useState(initialData?.ticker       || "");
  const [targetPrice,  setTargetPrice]  = useState(initialData?.targetPrice  ?? "");
  const [timeframe,    setTimeframe]    = useState(initialData?.timeframe    || "");
  const [stopLoss,     setStopLoss]     = useState(initialData?.stopLoss     ?? "");
  const [portfolioPct, setPortfolioPct] = useState(initialData?.portfolioPct ?? "10");
  const [exitNote,     setExitNote]     = useState(initialData?.exitNote     || "");

  // Live price is informational only — actual lock happens at publish click
  const [livePrice,     setLivePrice]     = useState(null);
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [priceError,    setPriceError]    = useState(null);
  const [companyName,   setCompanyName]   = useState("");

  // Direction-vs-target sanity check. Long needs target > entry, Short needs target < entry.
  // Without this guard a Long AAPL @ $298 with $250 target would pass validation and
  // silently corrupt the scoring engine.
  const targetInvalid = (() => {
    if (!targetPrice || !livePrice || action === "Hold" || !action) return false;
    const t = parseFloat(targetPrice);
    if (action === "Long"  && t <= livePrice) return "Target must be above current price for a Long prediction.";
    if (action === "Short" && t >= livePrice) return "Target must be below current price for a Short prediction.";
    return false;
  })();

  // Push form state up on every change so the parent can save drafts + publish.
  // We emit targetPrice as null when invalid so the parent's required-field check
  // blocks publish until it's corrected.
  useEffect(() => {
    if (!emit) return;
    const hasAnything = action || ticker || targetPrice || timeframe;
    if (!hasAnything) { emit(null); return; }
    emit({
      action,
      ticker:       ticker.trim().toUpperCase(),
      targetPrice:  targetPrice && !targetInvalid ? parseFloat(targetPrice) : null,
      timeframe,
      stopLoss:     stopLoss ? parseFloat(stopLoss) : null,
      portfolioPct: portfolioPct ? parseFloat(portfolioPct) : null,
      exitNote:     exitNote || null,
      companyName,
    });
  }, [action, ticker, targetPrice, timeframe, stopLoss, portfolioPct, exitNote, companyName, emit, targetInvalid]);

  const fetchLivePrice = async (sym) => {
    const t = (sym || ticker).trim().toUpperCase();
    if (!t) return;
    setFetchingPrice(true);
    setPriceError(null);
    setLivePrice(null);
    setCompanyName("");
    try {
      const result = await base44.functions.invoke("getStockData", { ticker: t });
      const data = result?.data || result;
      const price = data?.price ?? data?.regularMarketPrice ?? null;
      if (price) {
        setLivePrice(price);
        setCompanyName(data.companyName || data.shortName || "");
      } else {
        setPriceError("Price not found. Check the ticker symbol.");
      }
    } catch (err) {
      setPriceError("Could not fetch price. Check ticker or try again.");
    } finally {
      setFetchingPrice(false);
    }
  };

  const handleTickerBlur = () => {
    if (ticker.trim().length >= 1) fetchLivePrice(ticker);
  };

  return (
    <div className="surface p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-primary" />
          <h4 className="font-serif text-[14px] text-foreground">Prediction</h4>
        </div>
        <span className="pill-accent">
          🔒 Locks at publish
        </span>
      </div>

      <div className="bg-accent/10 border border-accent/30 rounded-tag px-3 py-2 mb-3 flex items-start gap-2">
        <Info className="w-3.5 h-3.5 text-accent flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-foreground leading-snug">
          When you click <strong>Publish</strong>, we'll fetch the live price at that exact moment and lock it as your entry.
          Draft saves don't lock anything.
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Direction *</label>
          <Select value={action} onValueChange={setAction}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Long / Short / Hold" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Long">↑ Long (Bullish)</SelectItem>
              <SelectItem value="Short">↓ Short (Bearish)</SelectItem>
              <SelectItem value="Hold">— Hold (Neutral)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Ticker *</label>
          <div className="flex gap-2 items-center">
            <Input
              value={ticker}
              onChange={e => { setTicker(e.target.value.toUpperCase()); setLivePrice(null); setPriceError(null); }}
              onBlur={handleTickerBlur}
              onKeyDown={e => e.key === "Enter" && fetchLivePrice(ticker)}
              placeholder="e.g. AAPL"
              className="h-9 font-mono flex-1"
            />
            <Button
              size="sm" variant="outline" className="h-9 px-3 text-xs gap-1"
              onClick={() => fetchLivePrice(ticker)}
              disabled={!ticker || fetchingPrice}
            >
              {fetchingPrice ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              {fetchingPrice ? "Fetching…" : "Preview Price"}
            </Button>
          </div>
          {livePrice && !fetchingPrice && (
            <div className="mt-1.5 flex items-center gap-2 text-xs flex-wrap">
              <span className="text-gain font-semibold">✓ Current price: ${livePrice.toFixed(2)}</span>
              {companyName && <span className="text-muted-foreground">· {companyName}</span>}
              <span className="text-muted-foreground italic">· Lock price will be re-fetched at publish</span>
            </div>
          )}
          {priceError && !fetchingPrice && (
            <p className="text-xs text-loss mt-1.5 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {priceError}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Target Price *</label>
            <Input
              value={targetPrice}
              onChange={e => setTargetPrice(e.target.value)}
              placeholder="$0.00"
              className={`h-9 font-mono ${targetInvalid ? "border-loss" : ""}`}
              type="number" min="0" step="0.01"
            />
            {targetInvalid && (
              <p className="text-[10px] text-loss mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {targetInvalid}
              </p>
            )}
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Stop Loss <span className="font-normal opacity-60">(optional)</span></label>
            <Input
              value={stopLoss}
              onChange={e => setStopLoss(e.target.value)}
              placeholder="$0.00"
              className={`h-9 font-mono ${
                stopLoss && livePrice && (
                  (action === "Long"  && parseFloat(stopLoss) >= livePrice) ||
                  (action === "Short" && parseFloat(stopLoss) <= livePrice)
                ) ? "border-loss" : ""
              }`}
              type="number" min="0" step="0.01"
            />
            {/* Validation hint */}
            {stopLoss && livePrice && action === "Long" && parseFloat(stopLoss) >= livePrice && (
              <p className="text-[10px] text-loss mt-1">Stop loss should be below current price for a Long</p>
            )}
            {stopLoss && livePrice && action === "Short" && parseFloat(stopLoss) <= livePrice && (
              <p className="text-[10px] text-loss mt-1">Stop loss should be above current price for a Short</p>
            )}
          </div>
        </div>

        {/* Risk/Reward summary */}
        {targetPrice && stopLoss && livePrice && (
          (() => {
            const entry  = livePrice;
            const target = parseFloat(targetPrice);
            const stop   = parseFloat(stopLoss);
            const isLong = action === "Long";
            const reward = isLong ? target - entry : entry - target;
            const risk   = isLong ? entry - stop  : stop  - entry;
            const rr     = risk > 0 ? (reward / risk).toFixed(2) : null;
            const rewardPct = entry > 0 ? ((Math.abs(reward) / entry) * 100).toFixed(1) : null;
            const riskPct   = entry > 0 ? ((Math.abs(risk)   / entry) * 100).toFixed(1) : null;
            return rr ? (
              <div className={`rounded-tag px-3 py-2 text-xs flex items-center justify-between ${
                parseFloat(rr) >= 2 ? "bg-gain/10 border border-gain/20" : parseFloat(rr) >= 1 ? "bg-accent/10 border border-accent/30" : "bg-loss/10 border border-loss/20"
              }`}>
                <div>
                  <span className="font-medium font-display">R/R {rr}:1</span>
                  <span className="text-muted-foreground ml-2">
                    {rewardPct && `+${rewardPct}% reward`} · {riskPct && `-${riskPct}% risk`}
                  </span>
                </div>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                  parseFloat(rr) >= 2 ? "text-gain" : parseFloat(rr) >= 1 ? "text-amber-700" : "text-loss"
                }`}>
                  {parseFloat(rr) >= 2 ? "✓ Good setup" : parseFloat(rr) >= 1 ? "Marginal" : "Poor R/R"}
                </span>
              </div>
            ) : null;
          })()
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Timeframe *</label>
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Select timeframe" /></SelectTrigger>
              <SelectContent>
                {TIMEFRAMES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Portfolio % <span className="font-normal opacity-60">(optional)</span></label>
            <Input value={portfolioPct} onChange={e => setPortfolioPct(e.target.value)} placeholder="e.g. 10" className="h-9 font-mono" type="number" min="1" max="100" />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Exit strategy note <span className="font-normal opacity-60">(optional)</span></label>
          <Input value={exitNote} onChange={e => setExitNote(e.target.value)} placeholder="Brief exit plan for followers…" className="h-9 text-sm" maxLength={200} />
        </div>
      </div>
    </div>
  );
}
