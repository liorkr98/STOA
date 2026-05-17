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

const STUDIES_OPTIONS = ["RSI", "MACD", "BB", "EMA", "SMA"];

// ── Dynamic exchange resolution via Yahoo Finance ────────────
const exchangeCache = {};

async function resolveExchangeForTicker(ticker) {
  if (!ticker) return "NASDAQ";
  if (exchangeCache[ticker]) return exchangeCache[ticker];

  try {
    const res = await base44.functions.invoke("proxyFetch", {
      url: `https://query1.finance.yahoo.com/v8/finance/chart/${ticker.toUpperCase()}?interval=1d&range=1d`,
    });
    const meta = res?.data?.chart?.result?.[0]?.meta;
    if (!meta) return "NASDAQ";

    const exchangeName = meta.fullExchangeName || meta.exchangeName || "";
    const shortExchange = meta.exchange || "";
    let tvExchange = "NASDAQ";

    if (exchangeName.includes("NYSE") && !exchangeName.includes("NASDAQ")) tvExchange = "NYSE";
    else if (exchangeName.includes("NASDAQ")) tvExchange = "NASDAQ";
    else if (exchangeName.includes("AMEX") || exchangeName.includes("American")) tvExchange = "AMEX";
    else if (exchangeName.includes("OTC") || exchangeName.includes("Pink")) tvExchange = "OTC";
    else if (exchangeName.includes("TSX") || exchangeName.includes("Toronto")) tvExchange = "TSX";
    else if (exchangeName.includes("LSE") || exchangeName.includes("London")) tvExchange = "LSE";
    else if (shortExchange === "NYQ" || shortExchange === "NYS") tvExchange = "NYSE";
    else if (shortExchange === "NMS" || shortExchange === "NGM" || shortExchange === "NCM") tvExchange = "NASDAQ";
    else if (shortExchange === "ASE") tvExchange = "AMEX";

    exchangeCache[ticker] = tvExchange;
    return tvExchange;
  } catch {
    return "NASDAQ";
  }
}

let _chartCount = 0;

export default function StockChartBlock({ block, onDelete, onChange }) {
  const initialTicker = block?.ticker || block?.content || "AAPL";
  const [ticker, setTicker] = useState(initialTicker);
  const [inputTicker, setInputTicker] = useState(initialTicker);
  const [interval, setIntervalVal] = useState(block?.interval || "D");
  const [chartStyle, setChartStyle] = useState(block?.chartStyle || "1");
  const [chartTheme, setChartTheme] = useState(block?.chartTheme || "light");
  const [chartHeight, setChartHeight] = useState(block?.height || 420);
  const [studies, setStudies] = useState(block?.studies || []);
  const [frozen, setFrozen] = useState(block?.frozen || false);
  const [saving, setSaving] = useState(false);
  const [containerId] = useState(() => `tv_block_${block?.id || ++_chartCount}`);

  const chartResizingRef = useRef(false);
  const chartStartRef = useRef({ y: 0, h: 0 });
  const widgetRef = useRef(null);
  const chartContainerRef = useRef(null);
  const [loadingExchange, setLoadingExchange] = useState(false);

  const notify = useCallback((patch) => {
    if (onChange) onChange({ ...block, ticker, content: ticker, interval, chartStyle, chartTheme, height: chartHeight, studies, frozen, ...patch });
  }, [block, ticker, interval, chartStyle, chartTheme, chartHeight, studies, frozen, onChange]);

  // Init TradingView widget with dynamic exchange resolution
  useEffect(() => {
    if (frozen) return;

    let cancelled = false;

    async function initChart() {
      setLoadingExchange(true);
      const exchange = await resolveExchangeForTicker(ticker);
      if (cancelled) return;
      setLoadingExchange(false);

      if (!window.TradingView) return;
      try { if (widgetRef.current) widgetRef.current.remove(); } catch (e) {}
      widgetRef.current = null;

      const el = document.getElementById(containerId);
      if (el) el.innerHTML = "";

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
        disabled_features: ["header_compare", "header_undo_redo"],
        container_id: containerId,
      });
    }

    initChart();
    return () => { cancelled = true; };
  }, [ticker, interval, chartStyle, chartTheme, chartHeight, studies, frozen, containerId]);

  const startChartResize = useCallback((e) => {
    e.preventDefault();
    chartResizingRef.current = true;
    chartStartRef.current = { y: e.clientY, h: chartHeight };
    const onMove = (mv) => {
      if (!chartResizingRef.current) return;
      const newH = Math.max(300, chartStartRef.current.h + (mv.clientY - chartStartRef.current.y));
      setChartHeight(newH);
    };
    const onUp = () => {
      chartResizingRef.current = false;
      notify({ height: chartHeight });
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [chartHeight, notify]);

  const applyTicker = async () => {
    const t = inputTicker.trim().toUpperCase();
    if (!t) return;
    setTicker(t);
    notify({ ticker: t, content: t });
  };

  const toggleStudy = (study) => {
    const next = studies.includes(study) ? studies.filter(s => s !== study) : [...studies, study];
    setStudies(next);
    notify({ studies: next });
  };

  // Save chart — captures the chart WITH any user annotations (drawings,
  // text, signatures placed via TradingView's drawing tools).
  //
  // Previously we used html2canvas on the chart container, but TradingView
  // renders inside a cross-origin iframe — html2canvas can't see into it,
  // so all user annotations were silently lost (the saved PNG was blank
  // where the chart should be). TradingView's widget exposes
  // `takeClientScreenshot()` which returns a canvas with the chart AND
  // every drawing tool layer composited in. We use that as the primary
  // path and only fall back to html2canvas if the widget isn't ready
  // (e.g. resolving exchange).
  const handleSaveChart = async () => {
    setSaving(true);
    try {
      let canvas = null;

      // ── Primary: TradingView widget screenshot (includes annotations) ──
      // takeClientScreenshot returns different shapes depending on the
      // widget build: sometimes a Canvas, sometimes a string URL, sometimes
      // a Promise of either. Normalize all of those into a Canvas.
      const widget = widgetRef.current;
      if (widget && typeof widget.onChartReady === "function") {
        try {
          await new Promise((resolve) => widget.onChartReady(resolve));
          const chartApi = typeof widget.activeChart === "function" ? widget.activeChart() : null;
          let raw = null;
          if (chartApi && typeof chartApi.takeClientScreenshot === "function") {
            raw = await chartApi.takeClientScreenshot();
          } else if (typeof widget.takeClientScreenshot === "function") {
            raw = await widget.takeClientScreenshot();
          }
          if (raw instanceof HTMLCanvasElement) {
            canvas = raw;
          } else if (typeof raw === "string" && raw.startsWith("blob:") || (typeof raw === "string" && raw.startsWith("data:image"))) {
            // Convert returned URL into a canvas so the rest of the flow
            // (toBlob → File → UploadFile) stays uniform.
            const img = new Image();
            img.crossOrigin = "anonymous";
            await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = raw; });
            const c = document.createElement("canvas");
            c.width = img.naturalWidth; c.height = img.naturalHeight;
            c.getContext("2d").drawImage(img, 0, 0);
            canvas = c;
          }
        } catch (e) {
          console.warn("TradingView screenshot failed, falling back to html2canvas:", e);
        }
      }

      // ── Fallback: html2canvas on the container ──
      if (!canvas) {
        const container = chartContainerRef.current;
        if (!container) throw new Error("Chart container not found");
        const html2canvas = (await import("html2canvas")).default;
        canvas = await html2canvas(container, {
          useCORS: true,
          allowTaint: true,
          scale: 1,
          logging: false,
          foreignObjectRendering: false,
        });
      }

      // Sanity check: TradingView's *public embed* widget runs inside a
      // cross-origin iframe, which means:
      //   - takeClientScreenshot is only present on the paid Charting
      //     Library, so the primary path silently falls through to
      //     html2canvas.
      //   - html2canvas can't read pixels out of a cross-origin iframe,
      //     so it captures just the white wrapper background.
      // Sample a sparse grid of pixels — if almost all are the chart's
      // own background color, fail loudly with a useful message instead
      // of uploading a blank PNG.
      const ctx = canvas.getContext("2d");
      const w = canvas.width, h = canvas.height;
      if (w >= 20 && h >= 20) {
        const samples = 24;
        const bgIsDark = chartTheme === "dark";
        let blankCount = 0;
        for (let i = 0; i < samples; i++) {
          for (let j = 0; j < samples; j++) {
            const px = ctx.getImageData(
              Math.floor((i + 0.5) * w / samples),
              Math.floor((j + 0.5) * h / samples),
              1, 1
            ).data;
            const [r, g, b] = px;
            // "Blank" = solid white (light theme) or solid TV-dark (dark theme),
            // tolerant to a few rgb points of compression noise.
            const isBlank = bgIsDark
              ? (r < 30 && g < 30 && b < 40)
              : (r > 245 && g > 245 && b > 245);
            if (isBlank) blankCount++;
          }
        }
        const blankRatio = blankCount / (samples * samples);
        if (blankRatio > 0.94) {
          throw new Error(
            "TradingView's embed widget can't be screenshotted from the page (cross-origin iframe). " +
            "Workaround: take a manual screenshot of the chart (Cmd+Shift+4 on Mac / Win+Shift+S on Windows) and add it as an Image block."
          );
        }
      }

      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(b => b ? resolve(b) : reject(new Error("Canvas to blob failed")), "image/png", 0.92);
      });
      if (!blob || blob.size === 0) throw new Error("Captured image is empty");

      // Wrap as a File — Base44's UploadFile sees a raw Blob as an empty
      // object when it serializes the payload (because Blob has no
      // enumerable properties), producing the "field is an empty object"
      // error. File extends Blob and serializes correctly.
      const fileObj = new File([blob], `${ticker}-${interval}-${Date.now()}.png`, { type: "image/png" });
      const { file_url } = await base44.integrations.Core.UploadFile({ file: fileObj });

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
      toast.success(`Chart saved with annotations · ${ticker} · ${interval}`);
    } catch (e) {
      console.error(e);
      toast.error("Could not capture chart: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUnfreeze = () => {
    setFrozen(false);
    notify({ frozen: false, snapshot_url: null });
  };

  // ── Frozen snapshot view ──────────────────────────────────────────────────
  if (frozen && block?.snapshot_url) {
    return (
      <div className="bg-card border border-border rounded-xl overflow-hidden mb-2">
        <div className="relative">
          <img src={block.snapshot_url} alt={`${ticker} chart`} className="w-full object-cover" />
          <div className="absolute bottom-2 right-2 bg-black/65 text-white text-[11px] px-2 py-1 rounded">
            📊 {ticker} · {interval} · {block.savedAt ? new Date(block.savedAt).toLocaleDateString() : "Saved"}
          </div>
        </div>
        <div className="flex items-center justify-between px-3 py-2 bg-secondary/40 border-t border-border">
          <span className="text-xs text-muted-foreground font-mono">{ticker} · {INTERVALS.find(i => i.value === interval)?.label || interval}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs" onClick={handleUnfreeze}>
              <Pencil className="w-3 h-3" /> Edit Chart
            </Button>
            {onDelete && (
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={onDelete}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Live chart view ───────────────────────────────────────────────────────
  return (
    <div className="bg-card border border-border rounded-xl p-3 mb-2">
      {/* Config bar */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
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

        <div className="flex gap-0.5">
          {INTERVALS.map(i => (
            <button key={i.value} onClick={() => { setIntervalVal(i.value); notify({ interval: i.value }); }}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${interval === i.value ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}>
              {i.label}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-border" />

        <div className="flex gap-0.5">
          {CHART_STYLES.map(s => (
            <button key={s.value} onClick={() => { setChartStyle(s.value); notify({ chartStyle: s.value }); }}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${chartStyle === s.value ? "bg-primary/10 text-primary border border-primary/30" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}>
              {s.label}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-border" />

        <div className="flex gap-0.5">
          {CHART_THEMES.map(t => (
            <button key={t.value} onClick={() => { setChartTheme(t.value); notify({ chartTheme: t.value }); }}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${chartTheme === t.value ? "bg-primary/10 text-primary border border-primary/30" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {onDelete && (
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={onDelete}>
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

      {/* Chart container — captured by html2canvas */}
      <div ref={chartContainerRef} className="rounded-lg overflow-hidden relative" style={{ height: chartHeight, background: chartTheme === "dark" ? "#131722" : "#ffffff" }}>
        {loadingExchange && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-background/60">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mr-2" />
            <span className="text-xs text-muted-foreground">Resolving exchange for {ticker}…</span>
          </div>
        )}
        <div id={containerId} style={{ width: "100%", height: "100%" }} />
      </div>

      {/* Resize handle */}
      <div
        onMouseDown={startChartResize}
        style={{ width: "100%", height: 8, cursor: "s-resize", display: "flex", alignItems: "center", justifyContent: "center", marginTop: 2 }}
      >
        <div style={{ width: 40, height: 4, background: "#e2e8f0", borderRadius: 2, transition: "background 0.15s" }}
          onMouseEnter={e => e.target.style.background = "#2563eb"}
          onMouseLeave={e => e.target.style.background = "#e2e8f0"}
        />
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