import React, { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock, ArrowUp, ArrowDown, Minus, Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { toast } from "sonner";

const ACTION_ICONS  = { Long: ArrowUp, Short: ArrowDown, Hold: Minus };
const ACTION_COLORS = { Long: "text-gain", Short: "text-loss", Hold: "text-amber-600" };
const ACTION_BG     = { Long: "bg-gain/5 border-gain/20", Short: "bg-loss/5 border-loss/20", Hold: "bg-amber-50 border-amber-200" };

const TIMEFRAMES = [
  "3 Days", "5 Days", "1 Week", "2 Weeks",
  "1 Month", "3 Months", "6 Months", "12 Months",
];

export default function PredictionBlock({ onPublish }) {
  const [action,       setAction]       = useState("");
  const [ticker,       setTicker]       = useState("");
  const [targetPrice,  setTargetPrice]  = useState("");
  const [timeframe,    setTimeframe]    = useState("");
  const [stopLoss,     setStopLoss]     = useState("");
  const [portfolioPct, setPortfolioPct] = useState("10");
  const [exitNote,     setExitNote]     = useState("");

  const [locked,        setLocked]        = useState(false);
  const [lockData,      setLockData]      = useState(null);

  const [livePrice,     setLivePrice]     = useState(null);
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [priceError,    setPriceError]    = useState(null);
  const [companyName,   setCompanyName]   = useState("");

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
      if (data?.price) {
        setLivePrice(data.price);
        setCompanyName(data.companyName || data.shortName || "");
        toast.success(`Live price fetched: $${data.price.toFixed(2)}`);
      } else {
        setPriceError("Price not found. Check the ticker symbol.");
      }
    } catch (err) {
      setPriceError("Could not fetch price. Check ticker or try again.");
      console.error("getStockData error:", err);
    } finally {
      setFetchingPrice(false);
    }
  };

  const handleTickerBlur = () => {
    if (ticker.trim().length >= 1) fetchLivePrice(ticker);
  };

  const handleLock = async () => {
    if (!action || !ticker || !targetPrice || !timeframe) {
      toast.error("Please fill in Action, Ticker, Target Price, and Timeframe.");
      return;
    }

    let lockPrice = livePrice;
    if (!lockPrice) {
      setFetchingPrice(true);
      try {
        const result = await base44.functions.invoke("getStockData", { ticker: ticker.trim().toUpperCase() });
        const data = result?.data || result;
        lockPrice = data?.price || null;
      } catch {}
      setFetchingPrice(false);
    }

    if (!lockPrice) {
      toast.error("Could not fetch live price. Cannot lock without a real price.");
      return;
    }

    const data = {
      action,
      ticker:       ticker.trim().toUpperCase(),
      targetPrice:  parseFloat(targetPrice),
      timeframe,
      lockPrice,
      lockTime:     new Date().toISOString(),
      stopLoss:     stopLoss ? parseFloat(stopLoss) : null,
      portfolioPct: portfolioPct ? parseFloat(portfolioPct) : 10,
      exitNote:     exitNote || null,
      companyName,
    };

    setLockData(data);
    setLocked(true);
    if (onPublish) onPublish(data);
    toast.success(`🔒 Prediction locked: ${action} $${data.ticker} @ $${lockPrice.toFixed(2)}`);
  };

  if (locked && lockData) {
    const Icon = ACTION_ICONS[lockData.action] || Minus;
    return (
      <div className={`border rounded-xl p-4 ${ACTION_BG[lockData.action] || "bg-secondary border-border"}`}>
        <div className="flex items-center gap-2 mb-3">
          <Lock className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">Locked Prediction</span>
          <span className="ml-auto text-xs font-semibold text-gain bg-gain/10 px-2 py-0.5 rounded-full">🔒 Locked</span>
        </div>
        <div className="flex items-start gap-3">
          <Icon className={`w-6 h-6 mt-0.5 flex-shrink-0 ${ACTION_COLORS[lockData.action]}`} />
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`font-bold text-base ${ACTION_COLORS[lockData.action]}`}>{lockData.action}</span>
              <span className="font-mono font-bold text-foreground text-base">${lockData.ticker}</span>
              {lockData.companyName && <span className="text-xs text-muted-foreground">({lockData.companyName})</span>}
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
              <span>Lock price: <strong className="text-foreground">${lockData.lockPrice.toFixed(2)}</strong></span>
              <span>Target: <strong className="text-foreground">${lockData.targetPrice}</strong></span>
              <span>Timeframe: <strong className="text-foreground">{lockData.timeframe}</strong></span>
              {lockData.stopLoss && <span>Stop loss: <strong className="text-foreground">${lockData.stopLoss}</strong></span>}
              {lockData.portfolioPct && <span>Portfolio: <strong className="text-foreground">{lockData.portfolioPct}%</strong></span>}
            </div>
            {lockData.exitNote && (
              <p className="text-xs text-muted-foreground italic mt-1">"{lockData.exitNote}"</p>
            )}
            <p className="text-[10px] text-muted-foreground mt-1">
              Locked {format(new Date(lockData.lockTime), "MMM d, yyyy 'at' HH:mm")} UTC
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-secondary border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-primary" />
          <h4 className="font-semibold text-sm">Prediction Block</h4>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
          Price locked at publish
        </span>
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
              size="sm"
              variant="outline"
              className="h-9 px-3 text-xs gap-1"
              onClick={() => fetchLivePrice(ticker)}
              disabled={!ticker || fetchingPrice}
            >
              {fetchingPrice ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              {fetchingPrice ? "Fetching..." : "Get Price"}
            </Button>
          </div>
          {fetchingPrice && (
            <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Fetching live price from Yahoo Finance...
            </p>
          )}
          {livePrice && !fetchingPrice && (
            <div className="mt-1.5 flex items-center gap-2 text-xs">
              <span className="text-gain font-semibold">✓ Live price: ${livePrice.toFixed(2)}</span>
              {companyName && <span className="text-muted-foreground">· {companyName}</span>}
              <span className="text-muted-foreground">· Will be locked at publish</span>
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
            <Input value={targetPrice} onChange={e => setTargetPrice(e.target.value)} placeholder="$0.00" className="h-9 font-mono" type="number" min="0" step="0.01" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Stop Loss <span className="font-normal opacity-60">(optional)</span></label>
            <Input value={stopLoss} onChange={e => setStopLoss(e.target.value)} placeholder="$0.00" className="h-9 font-mono" type="number" min="0" step="0.01" />
          </div>
        </div>

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
          <Input value={exitNote} onChange={e => setExitNote(e.target.value)} placeholder="Brief exit plan for followers..." className="h-9 text-sm" maxLength={200} />
        </div>

        <Button
          onClick={handleLock}
          disabled={!action || !ticker || !targetPrice || !timeframe || fetchingPrice}
          className="w-full"
          size="sm"
        >
          {fetchingPrice
            ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Fetching live price...</>
            : <><Lock className="w-3.5 h-3.5 mr-1.5" />Lock Prediction at Live Price</>
          }
        </Button>

        <p className="text-[10px] text-muted-foreground text-center">
          The current market price will be fetched from Yahoo Finance and locked at this exact moment.
          This cannot be changed after publishing.
        </p>
      </div>
    </div>
  );
}