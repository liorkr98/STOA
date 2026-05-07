import React, { useState, useRef, useCallback, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Trash2, Camera, Pencil, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const INTERVALS = [
  { label: "15m", value: "15" },
  { label: "1H",  value: "60" },
  { label: "1D",  value: "D" },
  { label: "1W",  value: "W" },
  { label: "1M",  value: "M" },
];

const CHART_STYLES = [
  { label: "Candle",      value: "1" },
  { label: "Line",        value: "2" },
  { label: "Area",        value: "3" },
  { label: "Heikin Ashi", value: "8" },
];

const CHART_THEMES = [
  { label: "Light", value: "light" },
  { label: "Dark",  value: "dark" },
];

const HEIGHT_OPTIONS = [300, 400, 500, 600];

const STUDIES_OPTIONS = ["RSI", "MACD", "BB", "EMA", "SMA"];

const NASDAQ_TICKERS = ["AAPL","MSFT","NVDA","AMZN","META","GOOGL","GOOG","TSLA","AVGO","COST","NFLX","AMD","INTC","QCOM","ADBE","TXN","CSCO","PYPL","SBUX","AMAT","ASML","MU","LRCX","PANW","KLAC","SNPS","CDNS","MRVL","WDAY","DXCM"];

function guessExchange(ticker) {
  const t = ticker.toUpperCase();
  if (NASDAQ_TICKERS.includes(t)) return "NASDAQ";
  return "NYSE";
}

let _chartCount = 0;

export default function StockChartBlock({ block, onDelete, onChange }) {
  const initialTicker = block?.ticker || block?.content || "AAPL";
  const [ticker, setTicker] = useState(initialTicker);
  const [inputTicker, setInputTicker] = useState(initialTicker);
  const [interval, setIntervalVal] = useState(block?.interval || "D");
  const [chartStyle, setChartStyle] = useState(block?.chartStyle || "1");
  const [chartTheme, setChartTheme] = useState(block?.chartTheme || "light");
  const [chartHeight, setChartHeight] = useState(block?.height || 400);
  const [studies, setStudies] = useState(block?.studies || []);
  const [frozen, setFrozen] = useState(block?.frozen || false);
  const [saving, setSaving] = useState(false);
  const [containerId] = useState(() => `tv_block_${block?.id || ++_chartCount}`);

  const widgetRef = useRef(null);
  const dragRef = useRef(null);

  const notify = useCallback((patch) => {
    if (onChange) onChange({ ...block, ticker, content: ticker, interval, chartStyle, chartTheme, height: chartHeight, studies, frozen, ...patch });
  }, [block, ticker, interval, chartStyle, chartTheme, chartHeight, studies, frozen, onChange]);

  // Init TradingView widget
  useEffect(() => {
    if (frozen) return;
    if (!window.TradingView) return;

    // destroy previous
    try { if (widgetRef.current) widgetRef.current.remove(); } catch (e) {}
    widgetRef.current = null;

    const el = document.getElementById(containerId);
    if (el) el.innerHTML = "";

    const exchange = guessExchange(ticker);

    widgetRef.current = new window.TradingView.widget({
      autosize: false,
      width: "100%",
      height: chartHeight,
      symbol: `${exchange}:${ticker}`,
      interval,
      timezone: "Etc/UTC",
      theme: chartTheme,
      style: chartStyle,
      locale: "en",
      studies,
      hide_side_toolbar: false,
      allow_symbol_change: false,
      enable_publishing: false,
      disabled_features: ["header_compare", "header_screenshot", "header_undo_redo"],
      container_id: containerId,
    });
  }, [ticker, interval, chartStyle, chartTheme, chartHeight, studies, frozen, containerId]);

  const applyTicker = () => {
    const t = inputTicker.trim().toUpperCase();
    if (t) { setTicker(t); notify({ ticker: t, content: t }); }
  };

  const toggleStudy = (study) => {
    const next = studies.includes(study) ? studies.filter(s => s !== study) : [...studies, study];
    setStudies(next);
    notify({ studies: next });
  };

  const handleSaveChart = async () => {
    setSaving(true);
    try {
      if (!widgetRef.current) throw new Error("Widget not ready");
      const canvas = await widgetRef.current.takeClientScreenshot();
      await new Promise((resolve, reject) => {
        canvas.toBlob(async (blob) => {
          try {
            const { file_url } = await base44.integrations.Core.UploadFile({ file: blob });
            const patch = {
              snapshot_url: file_url,
              ticker,
              interval,
              chartTheme,
              chartStyle,
              height: chartHeight,
              studies,
              savedAt: new Date().toISOString(),
              frozen: true,
            };
            setFrozen(true);
            notify(patch);
            toast.success(`Chart saved! ${ticker} · ${interval}`);
            resolve();
          } catch (err) { reject(err); }
        }, "image/png");
      });
    } catch (e) {
      toast.error("Could not capture chart. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleUnfreeze = () => {
    setFrozen(false);
    notify({ frozen: false, snapshot_url: null });
  };

  // Drag resize
  const startResize = useCallback((e) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = chartHeight;
    const onMove = (ev) => setChartHeight(Math.min(700, Math.max(200, startH + (ev.clientY - startY))));
    const onUp = (ev) => {
      const newH = Math.min(700, Math.max(200, startH + (ev.clientY - startY)));
      setChartHeight(newH);
      notify({ height: newH });
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [chartHeight, notify]);

  // Frozen snapshot view
  if (frozen && block?.snapshot_url) {
    return (
      <div className="bg-card border border-border rounded-xl overflow-hidden mb-2">
        <div className="relative">
          <img src={block.snapshot_url} alt={`${ticker} chart`} className="w-full object-cover" style={{ borderRadius: 0 }} />
          <div style={{
            position: "absolute", bottom: 8, right: 8,
            background: "rgba(0,0,0,0.65)", color: "white",
            fontSize: 11, padding: "3px 8px", borderRadius: 4,
          }}>
            📊 {ticker} · {interval} · {block.savedAt ? new Date(block.savedAt).toLocaleDateString() : "Saved"}
          </div>
        </div>
        <div className="flex items-center justify-between px-3 py-2 bg-secondary/40 border-t border-border">
          <span className="text-xs text-muted-foreground font-mono">{guessExchange(ticker)}:{ticker} · {INTERVALS.find(i => i.value === interval)?.label || interval}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs" onClick={handleUnfreeze}>
              <Pencil className="w-3 h-3" /> Edit Chart
            </Button>
            {onDelete && (
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-loss" onClick={onDelete}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-3 mb-2">
      {/* Config bar */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {/* Ticker input */}
        <div className="flex items-center gap-1">
          <Input
            value={inputTicker}
            onChange={e => setInputTicker(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === "Enter" && applyTicker()}
            placeholder="TICKER"
            className="w-24 h-7 text-sm font-mono"
          />
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={applyTicker}><Search className="w-3.5 h-3.5" /></Button>
          <span className="font-mono font-bold text-sm text-primary">{ticker}</span>
        </div>

        <div className="w-px h-5 bg-border" />

        {/* Interval */}
        <div className="flex gap-0.5">
          {INTERVALS.map(i => (
            <button key={i.value} onClick={() => { setIntervalVal(i.value); notify({ interval: i.value }); }}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${interval === i.value ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}>
              {i.label}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-border" />

        {/* Style */}
        <div className="flex gap-0.5">
          {CHART_STYLES.map(s => (
            <button key={s.value} onClick={() => { setChartStyle(s.value); notify({ chartStyle: s.value }); }}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${chartStyle === s.value ? "bg-primary/10 text-primary border border-primary/30" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}>
              {s.label}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-border" />

        {/* Theme */}
        <div className="flex gap-0.5">
          {CHART_THEMES.map(t => (
            <button key={t.value} onClick={() => { setChartTheme(t.value); notify({ chartTheme: t.value }); }}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${chartTheme === t.value ? "bg-primary/10 text-primary border border-primary/30" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Height presets */}
          <div className="flex gap-0.5">
            {HEIGHT_OPTIONS.map(h => (
              <button key={h} onClick={() => { setChartHeight(h); notify({ height: h }); }}
                className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-all ${chartHeight === h ? "bg-primary/10 text-primary border border-primary/30" : "text-muted-foreground hover:text-foreground"}`}>
                {h}
              </button>
            ))}
          </div>

          {onDelete && (
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-loss" onClick={onDelete}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Studies */}
      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        <span className="text-[10px] text-muted-foreground">Indicators:</span>
        {STUDIES_OPTIONS.map(s => (
          <button key={s} onClick={() => toggleStudy(s)}
            className={`px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all ${studies.includes(s) ? "bg-primary/10 text-primary border-primary/30" : "border-border text-muted-foreground hover:border-primary/30"}`}>
            {studies.includes(s) ? `× ${s}` : `+ ${s}`}
          </button>
        ))}
      </div>

      {/* Chart container */}
      <div className="relative rounded-lg overflow-hidden" style={{ height: chartHeight }}>
        <div id={containerId} style={{ width: "100%", height: "100%" }} />
        {/* Resize handle */}
        <div
          ref={dragRef}
          onMouseDown={startResize}
          className="absolute bottom-0 right-0 w-8 h-8 flex items-center justify-center cursor-s-resize z-10 group"
          title="Drag to resize"
          style={{ background: "rgba(0,0,0,0.15)", borderRadius: "8px 0 0 0" }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" className="text-white opacity-70 group-hover:opacity-100 transition-opacity">
            <path d="M2 12 L12 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M7 12 L12 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
      </div>

      {/* Save chart button */}
      <div className="mt-2 flex justify-end">
        <Button size="sm" onClick={handleSaveChart} disabled={saving} className="gap-1.5 text-xs h-8">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
          {saving ? "Capturing..." : "📸 Save Chart to Report"}
        </Button>
      </div>
    </div>
  );
}