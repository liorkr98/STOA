import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronRight, Lock, Eye, FileText, Columns, BarChart3,
  TrendingUp, TrendingDown, Plus, X, Zap, ArrowRight, Image as ImageIcon, Bookmark,
  List, ListOrdered, Quote, Minus, LineChart, GitCompare, ShieldAlert,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";
import { Avatar } from "@/components/AnalystCard";
import { fetchLockPrice } from "@/lib/priceLockProvider";
import { fetchQuote, fetchFundamentals, fmtCap } from "@/lib/stockData";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import AISidebar from "@/components/editor/AISidebar";
import AIChat from "@/components/editor/AIChat";
import TemplatesPanel from "@/components/editor/TemplatesPanel";
import DesignPanel from "@/components/editor/DesignPanel";
import StockChartBlock from "@/components/editor/StockChartBlock";
import ImageBlock from "@/components/editor/ImageBlock";
import MetricsBlock from "@/components/editor/MetricsBlock";

// DYOD disclaimer text — every Stoa report needs this regulatory line.
// Inserted via the DYOD button in the top toolbar (also restorable from
// the slash menu under Text → Disclaimer).
const DYOD_TEXT = "DO YOUR OWN DILIGENCE. This research is for informational " +
  "purposes only and is not investment advice. Past performance does not " +
  "guarantee future results. Always verify claims and consult a licensed " +
  "advisor before making investment decisions.";

const AUTOSAVE_MS = 1500;

let _nextId = Date.now();
const newId = () => ++_nextId;

// ── Default blocks for a new draft ───────────────────────────────────────────
const DEFAULT_BLOCKS = [
  { id: newId(), type: "title", text: "" },
  { id: newId(), type: "dek", text: "" },
  { id: newId(), type: "p", text: "" },
];

const BLOCK_LABEL = {
  title: "Title", dek: "Subhead", h: "Heading",
  p: "Body", prediction: "Locked prediction",
  metrics: "Metrics block", bullbear: "Bull / Bear thesis",
  pullquote: "Pull quote", image: "Image",
};

const BLOCK_ICON = {
  title: FileText, dek: Bookmark, h: Columns, p: Columns,
  prediction: Lock, metrics: BarChart3, bullbear: TrendingUp,
  pullquote: Zap, image: ImageIcon,
};

// ── Insertion zone ───────────────────────────────────────────────────────────
function InsertionZone({ onAdd, persistent = false }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onAdd}
      style={{
        position: "relative",
        height: hover || persistent ? 32 : 12,
        margin: "0 -10px",
        cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "height var(--t-fast) var(--ease)",
      }}
    >
      <div style={{
        height: 1, width: "100%",
        background: hover ? "var(--gold-hex)" : "transparent",
        transition: "background var(--t-fast) var(--ease)",
      }}/>
      {(hover || persistent) && (
        <div style={{
          position: "absolute", left: "50%", top: "50%",
          transform: "translate(-50%, -50%)",
          display: "flex", alignItems: "center", gap: 8,
          padding: "4px 10px 4px 6px",
          background: "var(--bg-elev)",
          border: "0.5px solid",
          borderColor: hover ? "var(--gold-hex)" : "var(--border-strong)",
          borderRadius: 16,
          color: hover ? "var(--gold-hex)" : "var(--text-mute)",
          fontSize: 11, fontFamily: "var(--f-sans)", fontWeight: 500,
          letterSpacing: "0.04em",
        }}>
          <span style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 18, height: 18, borderRadius: "50%",
            background: hover ? "var(--gold-hex)" : "var(--bg-soft)",
            color: hover ? "var(--deepest-navy)" : "var(--text-mute)",
          }}>
            <Plus size={11} strokeWidth={1.8}/>
          </span>
          <span>Add block</span>
          <span style={{
            padding: "0 5px",
            border: "0.5px solid currentColor",
            borderRadius: 3, fontSize: 9.5,
            fontFamily: "var(--f-mono)", opacity: 0.7,
          }}>/</span>
        </div>
      )}
    </div>
  );
}

// ── Slash menu ───────────────────────────────────────────────────────────────
function SlashMenu({ onClose, onInsert }) {
  const sections = [
    {
      title: "Text",
      items: [
        { type: "h", Icon: FileText, name: "Heading", desc: "Section heading · H2 in print" },
        { type: "p", Icon: Columns, name: "Body", desc: "Plain serif paragraph" },
        { type: "pullquote", Icon: Quote, name: "Pull quote", desc: "Big italic callout" },
        { type: "dek", Icon: Bookmark, name: "Subhead", desc: "Bold lead-in line" },
        { type: "bullets", Icon: List, name: "Bullets", desc: "Unordered list" },
        { type: "numbered", Icon: ListOrdered, name: "Numbered list", desc: "Ordered list" },
        { type: "callout", Icon: Zap, name: "Callout", desc: "Surfaced highlight" },
        { type: "divider", Icon: Minus, name: "Divider", desc: "Hairline section break" },
        { type: "dyod", Icon: ShieldAlert, name: "DYOD Disclaimer", desc: "Do Your Own Diligence — regulatory" },
      ],
    },
    {
      title: "Finance",
      items: [
        { type: "prediction", Icon: Lock, name: "Locked Prediction", desc: "Ticker, direction, target — locks at publish", premium: true },
        { type: "metrics", Icon: BarChart3, name: "Key Metrics", desc: "Live P/E, market cap, EPS — fetched by ticker", premium: true },
        { type: "bullbear", Icon: TrendingUp, name: "Bull / Bear thesis", desc: "Two-column case + counter-case" },
        { type: "stockchart", Icon: LineChart, name: "Stock chart", desc: "TradingView-style price chart", premium: true },
        { type: "comparechart", Icon: GitCompare, name: "Comparison chart", desc: "Compare 2-4 tickers side by side", premium: true },
      ],
    },
    {
      title: "Media",
      items: [
        { type: "image", Icon: ImageIcon, name: "Image", desc: "Drop, paste, or pick" },
      ],
    },
  ];

  return (
    <>
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, zIndex: 80,
        background: "rgba(10,26,63,0.18)",
        backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)",
      }}/>
      <div className="surface" style={{
        position: "fixed", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 81, width: 520, maxHeight: "70vh", overflow: "hidden",
        background: "var(--bg-elev)", borderColor: "var(--border-strong)",
        display: "flex", flexDirection: "column",
      }}>
        <div style={{ display: "flex", alignItems: "center", padding: "12px 14px", borderBottom: "0.5px solid var(--border-rgba)", gap: 10 }}>
          <span className="t-num" style={{
            padding: "2px 7px",
            border: "0.5px solid var(--border-strong)",
            borderRadius: 3, fontSize: 11,
          }}>/</span>
          <input
            autoFocus
            placeholder="Search blocks — type 'pred', 'chart', 'metric'…"
            style={{
              flex: 1, background: "transparent", border: 0, outline: 0,
              fontSize: 14, color: "var(--text)",
            }}
          />
          <button onClick={onClose} className="btn btn-text btn-sm" style={{ width: 26, padding: 0 }}>
            <X size={14} strokeWidth={1.7}/>
          </button>
        </div>
        <div style={{ overflowY: "auto", padding: "10px 0" }}>
          {sections.map((s) => (
            <div key={s.title} style={{ marginBottom: 10 }}>
              <div className="t-eyebrow" style={{ padding: "6px 14px" }}>{s.title}</div>
              {s.items.map((it) => {
                const Ic = it.Icon;
                return (
                  <button key={it.name}
                    onClick={() => { onInsert(it.type); onClose(); }}
                    style={{
                      display: "flex", alignItems: "center",
                      width: "100%", padding: "8px 14px", gap: 12,
                      background: "transparent", textAlign: "left",
                      border: 0, cursor: "pointer",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-soft)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    <div style={{
                      display: "flex", alignItems: "center", justifyContent: "center",
                      width: 32, height: 32, borderRadius: 6,
                      background: it.premium ? "rgba(212,175,55,0.10)" : "var(--bg-soft)",
                      border: "0.5px solid",
                      borderColor: it.premium ? "rgba(212,175,55,0.32)" : "var(--border-rgba)",
                      color: it.premium ? "var(--gold-hex)" : "var(--text-mute)",
                      flexShrink: 0,
                    }}>
                      <Ic size={15} strokeWidth={1.55}/>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 13, color: "var(--text)" }}>{it.name}</span>
                        {it.premium && <span className="badge-founding" style={{ height: 16, padding: "0 5px", fontSize: 8.5 }}>Finance</span>}
                      </div>
                      <div className="t-meta" style={{ fontSize: 11.5, marginTop: 2 }}>{it.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: 14,
          padding: "10px 14px",
          borderTop: "0.5px solid var(--border-rgba)",
          background: "var(--bg-soft)",
        }}>
          {[["↑↓", "navigate"], ["↵", "insert"], ["esc", "close"]].map(([k, l]) => (
            <span key={k} className="t-meta" style={{ fontSize: 10.5, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{
                padding: "1px 5px",
                border: "0.5px solid var(--border-strong)",
                borderRadius: 3, fontFamily: "var(--f-mono)",
              }}>{k}</span>
              {l}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}

// ── Common US tickers for the prediction-block autocomplete. Curated
// rather than fetched live so the dropdown is always fast — the analyst
// can still type any symbol freely. ───────────────────────────────────
const POPULAR_TICKERS = [
  { sym: "NVDA", name: "NVIDIA" },
  { sym: "AAPL", name: "Apple" },
  { sym: "MSFT", name: "Microsoft" },
  { sym: "GOOGL", name: "Alphabet" },
  { sym: "AMZN", name: "Amazon" },
  { sym: "META", name: "Meta Platforms" },
  { sym: "TSLA", name: "Tesla" },
  { sym: "AMD", name: "AMD" },
  { sym: "AVGO", name: "Broadcom" },
  { sym: "TSM", name: "TSMC" },
  { sym: "ASML", name: "ASML" },
  { sym: "INTC", name: "Intel" },
  { sym: "MU", name: "Micron" },
  { sym: "QCOM", name: "Qualcomm" },
  { sym: "JPM", name: "JPMorgan" },
  { sym: "BAC", name: "Bank of America" },
  { sym: "GS", name: "Goldman Sachs" },
  { sym: "WMT", name: "Walmart" },
  { sym: "PG", name: "Procter & Gamble" },
  { sym: "JNJ", name: "Johnson & Johnson" },
  { sym: "UNH", name: "UnitedHealth" },
  { sym: "PFE", name: "Pfizer" },
  { sym: "XOM", name: "Exxon" },
  { sym: "CVX", name: "Chevron" },
  { sym: "TLT", name: "20-Yr Treasury ETF" },
  { sym: "SPY", name: "S&P 500 ETF" },
  { sym: "QQQ", name: "Nasdaq-100 ETF" },
  { sym: "GLD", name: "Gold ETF" },
];

// ── Prediction block (gold-edged) ────────────────────────────────────────────
// On ticker change/blur, fetches live price + company info + market cap +
// sector so the analyst sees what they're predicting on. Ticker input has
// inline autocomplete from POPULAR_TICKERS.
function PredictionBlockEditor({ block, onChange }) {
  const data = block.data || { ticker: "", dir: "LONG", entry: "", target: "", stop: "", days: 90 };
  const set = (k, v) => onChange({ ...block, data: { ...data, [k]: v } });

  const [quote, setQuote] = useState(null);
  const [fund, setFund] = useState(null);
  const [loading, setLoading] = useState(false);
  const [acOpen, setAcOpen] = useState(false);

  const lookupTicker = useCallback(async (sym) => {
    if (!sym) { setQuote(null); setFund(null); return; }
    setLoading(true);
    try {
      const [q, f] = await Promise.all([
        fetchQuote(sym).catch(() => null),
        fetchFundamentals(sym).catch(() => null),
      ]);
      setQuote(q);
      setFund(f);
      // Auto-fill entry price (locked at publish anyway, but useful as a hint)
      if (q?.price && !data.entry) set("entry", q.price.toFixed(2));
    } finally {
      setLoading(false);
    }
  }, [data.entry, set]);

  const acMatches = useMemo(() => {
    const t = (data.ticker || "").toUpperCase();
    if (!t) return POPULAR_TICKERS.slice(0, 6);
    return POPULAR_TICKERS
      .filter((p) => p.sym.startsWith(t) || p.name.toUpperCase().includes(t))
      .slice(0, 6);
  }, [data.ticker]);

  return (
    <div className="surface" style={{
      padding: 0, margin: "12px 0",
      background: "var(--bg-elev)",
      border: "0.5px solid rgba(212,175,55,0.32)",
      overflow: "hidden",
    }}>
      <div style={{
        display: "flex", alignItems: "center", padding: "10px 16px",
        background: "rgba(212,175,55,0.06)",
        borderBottom: "0.5px solid rgba(212,175,55,0.16)",
        gap: 10,
      }}>
        <Lock size={12} strokeWidth={1.6} style={{ color: "var(--gold-hex)" }}/>
        <span className="receipt" style={{ color: "var(--gold-hex)", fontSize: 10.5 }}>
          {quote?.companyName ? `${data.ticker} · ${quote.companyName}` : "ADD A PREDICTION · TICKER, DIRECTION, TARGET PRICE"}
        </span>
        {loading && <span className="t-meta" style={{ marginLeft: 8 }}>fetching…</span>}
      </div>

      {(quote || fund) && (
        <div style={{
          display: "flex", alignItems: "center", gap: 18,
          padding: "10px 18px",
          background: "var(--bg-soft)",
          borderBottom: "0.5px solid var(--border-rgba)",
          fontSize: 11.5,
          flexWrap: "wrap",
        }}>
          {quote?.price != null && (
            <span className="t-num" style={{ color: "var(--text)" }}>
              ${quote.price.toFixed(2)}
              {quote.changePct != null && (
                <span style={{ marginLeft: 6, color: quote.changePct >= 0 ? "var(--rolex-green)" : "var(--velvet-red)" }}>
                  {quote.changePct >= 0 ? "+" : ""}{quote.changePct.toFixed(2)}%
                </span>
              )}
            </span>
          )}
          {fund?.marketCap && <span className="t-meta">Cap · <span className="t-num">{fmtCap(fund.marketCap)}</span></span>}
          {fund?.sector && <span className="t-meta">{fund.sector}</span>}
          {fund?.pe != null && <span className="t-meta">P/E · <span className="t-num">{fund.pe.toFixed(1)}</span></span>}
        </div>
      )}

      <div style={{ padding: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "0.9fr 0.7fr 0.8fr 0.8fr 0.8fr 0.6fr", gap: 8 }}>
          {[
            { l: "Ticker", k: "ticker", mono: false, autocomplete: true },
            { l: "Direction", k: "dir", mono: false, opts: ["LONG", "SHORT", "HOLD"] },
            { l: "Entry", k: "entry", mono: true },
            { l: "Target", k: "target", mono: true },
            { l: "Stop", k: "stop", mono: true },
            { l: "Days", k: "days", mono: true },
          ].map((f) => (
            <div key={f.k} style={{ position: "relative" }}>
              <div className="t-meta" style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: "0.10em", marginBottom: 4 }}>
                {f.l}
              </div>
              {f.opts ? (
                <select
                  value={data[f.k]}
                  onChange={(e) => set(f.k, e.target.value)}
                  style={{
                    width: "100%", height: 32, padding: "0 10px",
                    border: "0.5px solid var(--border-strong)",
                    borderRadius: 4, background: "var(--bg)",
                    fontSize: 13, fontFamily: "var(--f-sans)",
                    color: data[f.k] === "LONG" ? "var(--rolex-green)"
                      : data[f.k] === "SHORT" ? "var(--velvet-red)" : "var(--text)",
                    fontWeight: 500, letterSpacing: "0.04em",
                  }}
                >
                  {f.opts.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : f.autocomplete ? (
                <>
                  <input
                    value={data[f.k]}
                    onChange={(e) => {
                      const v = e.target.value.toUpperCase();
                      set(f.k, v);
                      setAcOpen(true);
                    }}
                    onFocus={() => setAcOpen(true)}
                    onBlur={() => setTimeout(() => setAcOpen(false), 150)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setAcOpen(false);
                        lookupTicker(data.ticker?.toUpperCase());
                      }
                    }}
                    placeholder="NVDA"
                    style={{
                      width: "100%", height: 32, padding: "0 10px",
                      border: "0.5px solid var(--border-strong)",
                      borderRadius: 4, background: "var(--bg)",
                      fontSize: 13, fontFamily: "var(--f-mono)",
                      color: "var(--text)", letterSpacing: "0.04em",
                      textTransform: "uppercase",
                    }}
                  />
                  {acOpen && acMatches.length > 0 && (
                    <div
                      style={{
                        position: "absolute", left: 0, right: 0, top: "100%",
                        marginTop: 4, zIndex: 30,
                        background: "var(--bg-elev)",
                        border: "0.5px solid var(--border-strong)",
                        borderRadius: 6, overflow: "hidden",
                        maxHeight: 220, overflowY: "auto",
                      }}
                    >
                      {acMatches.map((p) => (
                        <button
                          key={p.sym}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            set("ticker", p.sym);
                            setAcOpen(false);
                            lookupTicker(p.sym);
                          }}
                          style={{
                            display: "flex", alignItems: "center", gap: 8,
                            width: "100%", padding: "7px 10px",
                            background: "transparent", border: 0,
                            textAlign: "left", cursor: "pointer",
                            fontSize: 12,
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-soft)"}
                          onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                        >
                          <span className="t-num" style={{ width: 52, color: "var(--text)" }}>{p.sym}</span>
                          <span className="t-meta" style={{ fontSize: 11 }}>{p.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <input
                  value={data[f.k]}
                  onChange={(e) => set(f.k, e.target.value)}
                  placeholder={f.l}
                  style={{
                    width: "100%", height: 32, padding: "0 10px",
                    border: "0.5px solid var(--border-strong)",
                    borderRadius: 4, background: "var(--bg)",
                    fontSize: 13,
                    fontFamily: f.mono ? "var(--f-mono)" : "var(--f-sans)",
                    color: "var(--text)",
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Block renderer (editor view) ─────────────────────────────────────────────
function BlockRenderer({ block, onChange }) {
  const setText = (text) => onChange({ ...block, text });

  if (block.type === "title") {
    return (
      <input
        value={block.text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Your report title"
        className="t-display"
        style={{
          width: "100%", fontSize: 42, border: 0, outline: 0, padding: 0,
          color: "var(--text)", background: "transparent",
          fontFamily: "var(--f-serif)", fontWeight: 500,
          letterSpacing: "-0.02em", lineHeight: 1.08,
        }}
      />
    );
  }
  if (block.type === "dek") {
    return (
      <input
        value={block.text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add a subtitle or one-line summary"
        style={{
          width: "100%", fontSize: 19, border: 0, outline: 0, padding: 0,
          color: "var(--text-mute)", background: "transparent",
          fontFamily: "var(--f-serif)", fontStyle: "italic", lineHeight: 1.5,
        }}
      />
    );
  }
  if (block.type === "h") {
    return (
      <input
        value={block.text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Section heading"
        className="t-title"
        style={{
          width: "100%", fontSize: 22, border: 0, outline: 0, padding: 0,
          color: "var(--text)", background: "transparent",
          fontFamily: "var(--f-serif)", fontWeight: 500, lineHeight: 1.3,
        }}
      />
    );
  }
  if (block.type === "p") {
    return (
      <textarea
        value={block.text}
        onChange={(e) => setText(e.target.value)}
        rows={Math.max(2, Math.ceil((block.text || "").length / 80))}
        placeholder="Start writing your analysis..."
        style={{
          width: "100%", border: 0, outline: 0, padding: 0, resize: "none",
          color: "var(--text-body)", background: "transparent",
          fontFamily: "var(--f-serif)", fontSize: 18, lineHeight: 1.7,
        }}
      />
    );
  }
  if (block.type === "prediction") {
    return <PredictionBlockEditor block={block} onChange={onChange}/>;
  }
  if (block.type === "pullquote") {
    return (
      <blockquote style={{ margin: "16px -24px", padding: "0 0 0 24px", borderLeft: "0.5px solid var(--gold-hex)" }}>
        <textarea
          value={block.text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          placeholder="Add a notable quote or key insight"
          style={{
            width: "100%", border: 0, outline: 0, padding: 0, resize: "none",
            color: "var(--text)", background: "transparent",
            fontFamily: "var(--f-serif)", fontStyle: "italic",
            fontSize: 24, lineHeight: 1.35, letterSpacing: "-0.014em",
          }}
        />
      </blockquote>
    );
  }
  if (block.type === "metrics") {
    // Full key-metrics block: delegate to MetricsBlock which fetches live
    // P/E, EPS, revenue, market cap, etc. from Yahoo Finance and offers a
    // ticker autofill plus manual edit fallback. Replaces the old static
    // 2-cell placeholder that was outputting nonsense.
    return (
      <MetricsBlock
        block={block}
        onChange={onChange}
        onDelete={() => {}}
      />
    );
  }
  if (block.type === "bullets" || block.type === "numbered") {
    const isOrdered = block.type === "numbered";
    return (
      <div style={{ paddingLeft: 22, fontFamily: "var(--f-serif)", fontSize: 17, lineHeight: 1.7, color: "var(--text-body)" }}>
        {isOrdered ? <span className="t-meta">1.</span> : <span style={{ color: "var(--gold-hex)" }}>•</span>}{" "}
        <textarea
          value={block.text}
          onChange={(e) => setText(e.target.value)}
          rows={Math.max(2, Math.ceil((block.text || "").length / 60))}
          placeholder={isOrdered ? "Numbered list — one item per line" : "Bulleted list — one item per line"}
          style={{
            width: "calc(100% - 22px)", border: 0, outline: 0, padding: 0, resize: "none",
            color: "var(--text-body)", background: "transparent",
            fontFamily: "var(--f-serif)", fontSize: 17, lineHeight: 1.7,
            verticalAlign: "top",
          }}
        />
      </div>
    );
  }
  if (block.type === "callout") {
    return (
      <div className="surface" style={{ padding: 18, margin: "12px 0", background: "var(--bg-elev)" }}>
        <textarea
          value={block.text}
          onChange={(e) => setText(e.target.value)}
          rows={Math.max(2, Math.ceil((block.text || "").length / 60))}
          placeholder="A highlighted note or aside"
          style={{
            width: "100%", border: 0, outline: 0, padding: 0, resize: "none",
            color: "var(--text-body)", background: "transparent",
            fontFamily: "var(--f-sans)", fontSize: 14, lineHeight: 1.6,
          }}
        />
      </div>
    );
  }
  if (block.type === "divider") {
    return (
      <div style={{ margin: "20px 0" }}>
        <div style={{ height: 1, background: "var(--border-strong)" }}/>
      </div>
    );
  }
  if (block.type === "dyod") {
    return (
      <div
        style={{
          margin: "20px 0",
          padding: "14px 18px",
          background: "rgba(212,175,55,0.06)",
          border: "0.5px solid rgba(212,175,55,0.32)",
          borderRadius: 10,
          display: "flex",
          gap: 12,
        }}
      >
        <ShieldAlert size={14} strokeWidth={1.7} style={{ color: "var(--gold-hex)", flexShrink: 0, marginTop: 2 }}/>
        <div style={{ flex: 1 }}>
          <div className="t-eyebrow" style={{ color: "var(--gold-hex)", marginBottom: 6 }}>Do Your Own Diligence</div>
          <div style={{ fontSize: 12, lineHeight: 1.6, color: "var(--text-mute)", fontFamily: "var(--f-sans)" }}>
            {block.text || DYOD_TEXT}
          </div>
        </div>
      </div>
    );
  }
  if (block.type === "stockchart") {
    return <StockChartBlock block={block} onChange={onChange} onDelete={() => {}}/>;
  }
  if (block.type === "comparechart") {
    // Editor-side comparison: tickers + label inputs; renders side-by-side
    // on the published view. Kept minimal here — analyst types 2-4 tickers
    // separated by commas.
    const data = block.data || { tickers: ["", ""] };
    return (
      <div className="surface" style={{ padding: 18, margin: "12px 0", background: "var(--bg-elev)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <GitCompare size={13} strokeWidth={1.55} style={{ color: "var(--text-meta)" }}/>
          <span className="t-eyebrow">Comparison chart</span>
        </div>
        <input
          value={(data.tickers || []).join(", ")}
          onChange={(e) => onChange({ ...block, data: { ...data, tickers: e.target.value.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean) } })}
          placeholder="NVDA, AMD, INTC"
          style={{
            width: "100%", height: 36, padding: "0 12px",
            border: "0.5px solid var(--border-strong)",
            borderRadius: 4, background: "var(--bg)",
            fontSize: 13, fontFamily: "var(--f-mono)", color: "var(--text)",
            letterSpacing: "0.04em",
          }}
        />
        <div className="t-meta" style={{ marginTop: 8, fontSize: 11 }}>
          Up to 4 tickers, comma-separated. Renders as a comparison chart on the published report.
        </div>
      </div>
    );
  }
  if (block.type === "image") {
    return <ImageBlock block={block} onChange={onChange} onDelete={() => {}}/>;
  }
  if (block.type === "bullbear") {
    const data = block.data || { bull: [""], bear: [""] };
    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, margin: "8px 0" }}>
        <div className="surface" style={{ padding: 18, borderColor: "rgba(14,107,69,0.32)", background: "rgba(14,107,69,0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <TrendingUp size={13} strokeWidth={1.7} style={{ color: "var(--rolex-green)" }}/>
            <span className="t-eyebrow" style={{ color: "var(--rolex-green)" }}>Bull</span>
          </div>
          {data.bull.map((t, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
              <span style={{ marginTop: 8, width: 6, height: 1, background: "var(--rolex-green)", flexShrink: 0 }}/>
              <input value={t}
                onChange={(e) => {
                  const next = [...data.bull]; next[i] = e.target.value;
                  onChange({ ...block, data: { ...data, bull: next } });
                }}
                placeholder="Bull case"
                style={{ flex: 1, border: 0, outline: 0, background: "transparent", fontFamily: "var(--f-serif)", fontSize: 13.5, color: "var(--text-body)" }}
              />
            </div>
          ))}
        </div>
        <div className="surface" style={{ padding: 18, borderColor: "rgba(146,43,62,0.32)", background: "rgba(146,43,62,0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <TrendingDown size={13} strokeWidth={1.7} style={{ color: "var(--velvet-red)" }}/>
            <span className="t-eyebrow" style={{ color: "var(--velvet-red)" }}>Bear</span>
          </div>
          {data.bear.map((t, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
              <span style={{ marginTop: 8, width: 6, height: 1, background: "var(--velvet-red)", flexShrink: 0 }}/>
              <input value={t}
                onChange={(e) => {
                  const next = [...data.bear]; next[i] = e.target.value;
                  onChange({ ...block, data: { ...data, bear: next } });
                }}
                placeholder="Bear case"
                style={{ flex: 1, border: 0, outline: 0, background: "transparent", fontFamily: "var(--f-serif)", fontSize: 13.5, color: "var(--text-body)" }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
}

// ── A single editor block wrapper ────────────────────────────────────────────
function EditorBlockWrap({ block, active, setActive, onShowSlash, onChange, onDelete }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={setActive}
      style={{
        position: "relative",
        padding: "6px 0",
        borderRadius: 4,
        background: active ? "rgba(30,58,138,0.025)" : "transparent",
        margin: "0 -10px", paddingLeft: 10, paddingRight: 10,
        transition: "background var(--t-fast) var(--ease)",
        cursor: "text",
      }}
    >
      <div style={{
        position: "absolute", left: -42, top: 8,
        display: "flex", gap: 2, alignItems: "center",
        opacity: hover || active ? 1 : 0.32,
        transition: "opacity var(--t-fast) var(--ease)",
      }}>
        <button
          onClick={(e) => { e.stopPropagation(); onShowSlash(); }}
          title="Add block · /"
          style={{
            width: 22, height: 22, borderRadius: 4,
            color: hover || active ? "var(--gold-hex)" : "var(--text-meta)",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "transparent", border: 0, cursor: "pointer",
          }}
        >
          <Plus size={13} strokeWidth={1.8}/>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          title="Delete block"
          style={{
            width: 22, height: 22, borderRadius: 4,
            color: "var(--text-meta)",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "transparent", border: 0, cursor: "pointer",
          }}
        >
          <X size={11} strokeWidth={1.8}/>
        </button>
      </div>
      <BlockRenderer block={block} onChange={onChange}/>
    </div>
  );
}

/**
 * ReportEditor — full-bleed compose (v3 rebuild).
 * Layout per prototype/src/screens/compose.jsx: 56px top bar, 3-col body
 * (260px outline / 720px editor / 340px collapsible AI rail), block-based
 * editor with insertion zones, slash menu, gold-edged prediction block.
 *
 * Persists drafts to base44.entities.Report with autosave on 1.5s debounce.
 */
export default function ReportEditor() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const urlParams = new URLSearchParams(window.location.search);
  const draftIdParam = urlParams.get("id");

  const [draftId, setDraftId] = useState(draftIdParam);
  const [blocks, setBlocks] = useState(DEFAULT_BLOCKS);
  const [activeBlockId, setActiveBlockId] = useState(DEFAULT_BLOCKS[0].id);
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashAt, setSlashAt] = useState(null); // index to insert at
  const [aiOpen, setAiOpen] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [monetized, setMonetized] = useState(true);
  // Pay-per-report monetization (PRD §monetization): analysts can offer their
  // report to non-subscribers for a one-off price between $1 and $50. Both
  // toggles can be on at once — subscribers read it for free, anyone else
  // pays the individual price.
  const [individualPurchase, setIndividualPurchase] = useState(false);
  const [individualPrice, setIndividualPrice] = useState(5);
  // Restored from backup: floating AISidebar (report skeleton generator)
  // and AIChat (conversational), plus Templates + Design panels.
  const [aiSidebarOpen, setAiSidebarOpen] = useState(false);
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [designOpen, setDesignOpen] = useState(false);
  const [reportTheme, setReportTheme] = useState("default");
  const [reportFont, setReportFont] = useState("inter");
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const autosaveTimer = useRef(null);
  const mountedRef = useRef(false);

  // Load existing draft
  useEffect(() => {
    if (!draftIdParam) return;
    base44.entities.Report.get(draftIdParam).then((r) => {
      if (!r) return;
      try {
        const parsed = JSON.parse(r.content_blocks || "[]");
        if (Array.isArray(parsed) && parsed.length) setBlocks(parsed);
      } catch {}
      setMonetized(!!r.is_premium);
      setIndividualPurchase(!!r.individual_purchase_enabled);
      if (typeof r.individual_price === "number") setIndividualPrice(r.individual_price);
    }).catch(() => {});
  }, [draftIdParam]);

  // Global "/" slash trigger
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "/" && !slashOpen && !previewOpen) {
        const tag = (e.target.tagName || "").toLowerCase();
        const isField = tag === "input" || tag === "textarea" || e.target.isContentEditable;
        if (!isField) {
          e.preventDefault();
          setSlashOpen(true);
          setSlashAt(null);
        }
      }
      if (e.key === "Escape") {
        if (slashOpen) setSlashOpen(false);
        if (previewOpen) setPreviewOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [slashOpen, previewOpen]);

  // Autosave — debounced 1.5s
  const save = useCallback(async (silent = true) => {
    if (!user?.email) return null;
    const title = blocks.find((b) => b.type === "title")?.text || "Untitled";
    const excerpt = blocks.find((b) => b.type === "dek")?.text || "";
    const predBlock = blocks.find((b) => b.type === "prediction");
    const patch = {
      title,
      excerpt,
      content_blocks: JSON.stringify(blocks),
      is_premium: monetized,
      individual_purchase_enabled: individualPurchase,
      individual_price: individualPurchase ? Math.min(50, Math.max(1, Number(individualPrice) || 5)) : null,
      status: "draft",
      created_by: user.email,
      author_name: user.full_name || user.email,
      kind: "Research Report",
      prediction_ticker: predBlock?.data?.ticker || null,
      prediction_action: predBlock?.data?.dir
        ? predBlock.data.dir.charAt(0) + predBlock.data.dir.slice(1).toLowerCase()
        : null,
      prediction_entry_price: predBlock?.data?.entry ? Number(predBlock.data.entry.toString().replace(/[^0-9.-]/g, "")) : null,
      prediction_target_price: predBlock?.data?.target ? Number(predBlock.data.target.toString().replace(/[^0-9.-]/g, "")) : null,
      prediction_stop_price: predBlock?.data?.stop ? Number(predBlock.data.stop.toString().replace(/[^0-9.-]/g, "")) : null,
      prediction_timeframe: predBlock?.data?.days ? `${predBlock.data.days} days` : null,
    };
    setSaving(true);
    try {
      let id = draftId;
      if (id) {
        await base44.entities.Report.update(id, patch);
      } else {
        const created = await base44.entities.Report.create(patch);
        id = created?.id;
        if (id) setDraftId(id);
      }
      setLastSavedAt(new Date());
      if (!silent) toast.success("Saved.");
      return id;
    } catch (e) {
      if (!silent) toast.error("Save failed.");
      return null;
    } finally {
      setSaving(false);
    }
  }, [blocks, draftId, monetized, individualPurchase, individualPrice, user]);

  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return; }
    clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => { save(true); }, AUTOSAVE_MS);
    return () => clearTimeout(autosaveTimer.current);
  }, [blocks, monetized, individualPurchase, individualPrice, save]);

  // Block ops
  const insertAt = (type, idx) => {
    let newBlock;
    switch (type) {
      case "prediction":
        newBlock = { id: newId(), type, data: { ticker: "", dir: "LONG", entry: "", target: "", stop: "", days: 90 } };
        break;
      case "metrics":
        newBlock = { id: newId(), type, content: "" };
        break;
      case "bullbear":
        newBlock = { id: newId(), type, data: { bull: [""], bear: [""] } };
        break;
      case "comparechart":
        newBlock = { id: newId(), type, data: { tickers: ["", ""] } };
        break;
      case "stockchart":
        newBlock = { id: newId(), type, ticker: "", interval: "D", style: "1", studies: [] };
        break;
      case "image":
        newBlock = { id: newId(), type, url: "", caption: "" };
        break;
      case "dyod":
        newBlock = { id: newId(), type, text: DYOD_TEXT };
        break;
      case "divider":
        newBlock = { id: newId(), type };
        break;
      default:
        newBlock = { id: newId(), type, text: "" };
    }
    setBlocks((prev) => {
      const next = [...prev];
      const at = idx == null ? next.length : idx;
      next.splice(at, 0, newBlock);
      return next;
    });
    setActiveBlockId(newBlock.id);
  };

  // Top-toolbar shortcut for inserting a DYOD disclaimer — regulatory
  // requirement on every published report. Idempotent: if a DYOD block
  // already exists, scrolls to it instead of duplicating.
  const insertDYOD = () => {
    const existing = blocks.findIndex((b) => b.type === "dyod");
    if (existing >= 0) {
      setActiveBlockId(blocks[existing].id);
      toast.info("DYOD disclaimer already in the report.");
      return;
    }
    insertAt("dyod", blocks.length);
    toast.success("DYOD disclaimer added.");
  };

  // Top-toolbar shortcut for inserting a locked Prediction block. Adds it
  // after the title/dek so it sits prominently near the top of the draft.
  const insertPrediction = () => {
    const existing = blocks.findIndex((b) => b.type === "prediction");
    if (existing >= 0) {
      setActiveBlockId(blocks[existing].id);
      toast.info("Prediction block already in the report.");
      return;
    }
    const dekIdx = blocks.findIndex((b) => b.type === "dek");
    insertAt("prediction", dekIdx >= 0 ? dekIdx + 1 : blocks.length);
  };

  const updateBlock = (id, patch) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? patch : b)));
  };
  const deleteBlock = (id) => {
    setBlocks((prev) => prev.length > 1 ? prev.filter((b) => b.id !== id) : prev);
  };

  // Publish flow: lock entry prices + flip status
  const publish = async () => {
    if (publishing) return;
    setPublishing(true);
    try {
      const id = await save(true);
      if (!id) throw new Error("Could not save before publish");
      const predBlock = blocks.find((b) => b.type === "prediction");
      let lockData = {};
      if (predBlock?.data?.ticker && fetchLockPrice) {
        try {
          const live = await fetchLockPrice(predBlock.data.ticker);
          if (live?.price) {
            lockData.prediction_entry_price = live.price;
            lockData.prediction_locked_at = new Date().toISOString();
          }
        } catch {}
      }
      await base44.entities.Report.update(id, {
        ...lockData,
        status: "published",
        published_at: new Date().toISOString(),
      });

      // Create the Prediction entity so it lands on the analyst's record
      if (predBlock?.data?.ticker) {
        await base44.entities.Prediction.create({
          ticker: predBlock.data.ticker,
          direction: predBlock.data.dir.charAt(0) + predBlock.data.dir.slice(1).toLowerCase(),
          entry_price: lockData.prediction_entry_price || Number(predBlock.data.entry || 0),
          target_price: Number(predBlock.data.target || 0),
          stop_price: Number(predBlock.data.stop || 0),
          timeframe_days: Number(predBlock.data.days || 90),
          status: "active",
          report_id: id,
          thesis: blocks.find((b) => b.type === "dek")?.text || "",
        }).catch(() => {});
      }

      toast.success("Published & locked.");
      navigate(`/report?id=${id}`);
    } catch (e) {
      toast.error(e?.message || "Publish failed");
    } finally {
      setPublishing(false);
    }
  };

  // Derived UI bits
  const outlineBlocks = useMemo(
    () => blocks.filter((b) => ["title", "h", "metrics", "prediction", "bullbear"].includes(b.type)),
    [blocks]
  );
  const wordCount = useMemo(() => {
    const text = blocks
      .map((b) => b.text || "")
      .filter(Boolean).join(" ");
    return text.split(/\s+/).filter(Boolean).length;
  }, [blocks]);
  const readMin = Math.max(1, Math.ceil(wordCount / 200));
  const qualityScore = Math.min(100, Math.round((wordCount / 1000) * 100));

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* ── Top bar ── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50, height: 56,
        background: "color-mix(in srgb, var(--bg) 92%, transparent)",
        backdropFilter: "blur(18px) saturate(1.2)",
        WebkitBackdropFilter: "blur(18px) saturate(1.2)",
        borderBottom: "0.5px solid var(--border-rgba)",
        display: "flex", alignItems: "center", padding: "0 22px", gap: 18,
      }}>
        <button className="btn btn-text btn-sm" onClick={() => navigate("/dashboard")} style={{ paddingLeft: 0 }}>
          <ChevronRight size={13} style={{ transform: "rotate(180deg)" }}/> Studio
        </button>
        <span className="t-meta" style={{ fontSize: 11 }}>·</span>
        <span className="t-meta" style={{ fontSize: 12, color: "var(--text-mute)" }}>Draft · Research Report</span>
        <span className="receipt" style={{ fontSize: 10.5 }}>
          <span className="pulse-dot" style={{ width: 5, height: 5, background: "var(--rolex-green)", borderRadius: "50%" }}/>
          {saving ? "SAVING…" : lastSavedAt ? `AUTOSAVED · ${lastSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : "READY"}
        </span>

        <div style={{ flex: 1 }}/>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="t-meta" style={{ fontSize: 11 }}>Quality</span>
            <span className="t-num" style={{ fontSize: 12, color: qualityScore >= 80 ? "var(--rolex-green)" : "var(--text-mute)" }}>
              {qualityScore}
            </span>
            <span style={{ width: 60, height: 3, background: "var(--border-rgba)", borderRadius: 2, overflow: "hidden" }}>
              <span style={{ display: "block", width: `${qualityScore}%`, height: "100%", background: qualityScore >= 80 ? "var(--rolex-green)" : "var(--primary-blue)" }}/>
            </span>
          </div>
          <span className="vr" style={{ height: 16 }}/>
          <span className="t-meta" style={{ fontSize: 11 }}>
            <span className="t-num">{wordCount.toLocaleString()}</span> words · ~<span className="t-num">{readMin}</span> min
          </span>
        </div>

        <span className="vr" style={{ height: 18 }}/>

        {/* Prediction + DYOD shortcuts — surfaced in the top bar so the two
            most-important "insert" actions are always one click away. The
            Prediction button is gold-edged to signal it's the call-to-action;
            DYOD is a ghost button (it's the regulatory disclaimer). */}
        <button
          className="btn btn-ghost-gold btn-sm"
          onClick={insertPrediction}
          title="Insert a locked prediction (ticker, direction, target)"
        >
          <Lock size={12} strokeWidth={1.7}/> Prediction
        </button>
        <button
          className="btn btn-ghost btn-sm"
          onClick={insertDYOD}
          title="Insert the Do Your Own Diligence disclaimer"
        >
          <ShieldAlert size={12} strokeWidth={1.7}/> DYOD
        </button>

        <span className="vr" style={{ height: 18 }}/>

        {/* Templates + Design panel buttons — restored from backup */}
        <button className="btn btn-ghost btn-sm" onClick={() => setTemplatesOpen(true)}>
          Templates
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => setDesignOpen(true)}>
          Design
        </button>

        <span className="vr" style={{ height: 18 }}/>

        <button className="btn btn-ghost btn-sm" onClick={() => setPreviewOpen(true)}>
          <Eye size={13} strokeWidth={1.55}/> Preview
        </button>
        <button className="btn btn-gold btn-sm" onClick={publish} disabled={publishing}>
          <Lock size={12} strokeWidth={1.6}/> {publishing ? "Publishing…" : "Lock & publish"}
        </button>
        <button
          onClick={() => {
            const next = !aiOpen;
            setAiOpen(next);
            // The floating AI Research Assistant chat shares the right edge
            // of the editor with the rail — close the chat whenever the rail
            // opens so the two surfaces never overlap.
            if (next) setAiChatOpen(false);
          }}
          className="btn btn-ghost btn-sm"
          style={{
            width: 32, padding: 0,
            color: aiOpen ? "var(--gold-hex)" : "var(--text-mute)",
            borderColor: aiOpen ? "var(--gold-hex)" : undefined,
          }}
        >
          <Zap size={13} strokeWidth={1.7}/>
        </button>
      </header>

      {/* ── Body: 3-col grid ── */}
      <div style={{
        flex: 1,
        display: "grid",
        gridTemplateColumns: aiOpen ? "260px 1fr 340px" : "260px 1fr 0",
        transition: "grid-template-columns var(--t-base) var(--ease)",
      }}>
        {/* Outline rail */}
        <aside style={{
          borderRight: "0.5px solid var(--border-rgba)",
          padding: "32px 18px",
          background: "color-mix(in srgb, var(--bg) 96%, transparent)",
          position: "sticky", top: 56, alignSelf: "flex-start",
          maxHeight: "calc(100vh - 56px)", overflowY: "auto",
        }}>
          <div className="t-eyebrow" style={{ marginBottom: 14, paddingLeft: 8 }}>Outline</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {outlineBlocks.length === 0 ? (
              <div className="t-meta" style={{ fontSize: 11, padding: "8px 10px" }}>
                Add a heading or section to build the outline.
              </div>
            ) : (
              outlineBlocks.map((b) => {
                const Ic = BLOCK_ICON[b.type] || Columns;
                const active = activeBlockId === b.id;
                const label = b.type === "title" ? (b.text || "Untitled") : BLOCK_LABEL[b.type];
                return (
                  <button
                    key={b.id}
                    onClick={() => setActiveBlockId(b.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      width: "100%", justifyContent: "flex-start",
                      padding: "7px 10px", borderRadius: 6,
                      background: active ? "var(--bg-soft)" : "transparent",
                      color: active ? "var(--text)" : "var(--text-mute)",
                      fontSize: 12.5, fontFamily: "var(--f-sans)",
                      border: 0, cursor: "pointer", textAlign: "left", lineHeight: 1.4,
                    }}
                  >
                    <Ic size={13} strokeWidth={1.5}/>
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {label}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          <div className="hr" style={{ margin: "20px 0" }}/>

          <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "0 8px" }}>
            <div>
              <div className="t-meta" style={{ marginBottom: 6 }}>Monetization</div>

              {/* Toggle 1 — Members only (subscription required) */}
              <button onClick={() => setMonetized(!monetized)} style={{
                display: "flex", alignItems: "center", gap: 10,
                width: "100%", padding: "8px 10px",
                background: "var(--bg-elev)",
                border: "0.5px solid var(--border-strong)",
                borderRadius: 6, cursor: "pointer", textAlign: "left",
              }}>
                <span style={{
                  width: 28, height: 16,
                  background: monetized ? "var(--gold-hex)" : "var(--border-strong)",
                  borderRadius: 8, position: "relative", flexShrink: 0,
                  transition: "background var(--t-fast) var(--ease)",
                }}>
                  <span style={{
                    position: "absolute", top: 2, left: monetized ? 14 : 2,
                    width: 12, height: 12, background: "#fff", borderRadius: "50%",
                    transition: "left var(--t-fast) var(--ease)",
                  }}/>
                </span>
                <span style={{ flex: 1, fontSize: 12 }}>Members only</span>
              </button>
              <div className="t-meta" style={{ fontSize: 10.5, marginTop: 4, lineHeight: 1.4 }}>
                {monetized ? "Subscribers read free; everyone else hits the paywall." : "Anyone can read the full report."}
              </div>

              {/* Toggle 2 — Available for individual purchase */}
              <button
                onClick={() => setIndividualPurchase(!individualPurchase)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  width: "100%", padding: "8px 10px", marginTop: 8,
                  background: "var(--bg-elev)",
                  border: "0.5px solid var(--border-strong)",
                  borderRadius: 6, cursor: "pointer", textAlign: "left",
                }}
              >
                <span style={{
                  width: 28, height: 16,
                  background: individualPurchase ? "var(--gold-hex)" : "var(--border-strong)",
                  borderRadius: 8, position: "relative", flexShrink: 0,
                  transition: "background var(--t-fast) var(--ease)",
                }}>
                  <span style={{
                    position: "absolute", top: 2, left: individualPurchase ? 14 : 2,
                    width: 12, height: 12, background: "#fff", borderRadius: "50%",
                    transition: "left var(--t-fast) var(--ease)",
                  }}/>
                </span>
                <span style={{ flex: 1, fontSize: 12 }}>Available for individual purchase</span>
              </button>

              {/* Price input — only shown when individual purchase is on */}
              {individualPurchase && (
                <div
                  style={{
                    marginTop: 8, padding: "10px 12px",
                    background: "rgba(212,175,55,0.06)",
                    border: "0.5px solid rgba(212,175,55,0.32)",
                    borderRadius: 6,
                  }}
                >
                  <div className="t-meta" style={{ fontSize: 10.5, marginBottom: 6, color: "var(--gold-hex)" }}>
                    Per-report price
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span className="t-num" style={{ color: "var(--gold-hex)", fontSize: 18 }}>$</span>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      step={1}
                      value={individualPrice}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        if (Number.isFinite(v)) setIndividualPrice(Math.min(50, Math.max(1, v)));
                      }}
                      style={{
                        width: 64, height: 30, padding: "0 8px",
                        border: "0.5px solid var(--border-strong)",
                        borderRadius: 4, background: "var(--bg)",
                        fontFamily: "var(--f-mono)", fontSize: 14,
                        color: "var(--text)", textAlign: "right",
                      }}
                    />
                    <span className="t-meta" style={{ fontSize: 10.5 }}>per report</span>
                  </div>
                  <div className="t-meta" style={{ fontSize: 10, marginTop: 6, lineHeight: 1.4 }}>
                    $1–$50 range. 90% goes to you, 10% Stoa fee.
                  </div>
                </div>
              )}
            </div>
            <div>
              <div className="t-meta" style={{ marginBottom: 6 }}>Track record</div>
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 10px",
                background: "rgba(212,175,55,0.06)",
                border: "0.5px solid rgba(212,175,55,0.32)",
                borderRadius: 6,
              }}>
                <Lock size={12} strokeWidth={1.6} style={{ color: "var(--gold-hex)", flexShrink: 0 }}/>
                <span style={{ fontSize: 11.5, color: "var(--gold-hex)", lineHeight: 1.45 }}>
                  Predictions in this report will lock on publish.
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* Editor */}
        <main
          style={{ padding: "48px 32px 120px", overflow: "hidden" }}
          onDragOver={(e) => {
            // Accept drops carrying AI-generated content from the rail.
            // Without preventDefault the browser refuses the drop entirely.
            if (e.dataTransfer.types.includes("ai-text")) {
              e.preventDefault();
              e.dataTransfer.dropEffect = "copy";
            }
          }}
          onDrop={(e) => {
            const text = e.dataTransfer.getData("ai-text");
            if (!text) return;
            e.preventDefault();
            const rawType = e.dataTransfer.getData("ai-type") || "text";
            // Map AIChat block types onto the editor's block schema. AIChat
            // uses {text, heading, bullets, quote, callout, stockchart}; the
            // editor uses {p, h, bullets, pullquote, callout, stockchart}.
            const TYPE_MAP = {
              text: "p", paragraph: "p",
              heading: "h", h2: "h", h3: "h",
              bullets: "bullets",
              quote: "pullquote", pullquote: "pullquote",
              callout: "callout",
              stockchart: "stockchart",
              image: "image",
            };
            const type = TYPE_MAP[rawType] || "p";
            const newBlock = type === "stockchart"
              ? { id: newId(), type, ticker: text.toUpperCase(), interval: "D", style: "1", studies: [] }
              : { id: newId(), type, text };
            setBlocks((prev) => [...prev, newBlock]);
            setActiveBlockId(newBlock.id);
            toast.success("Dropped AI content into your report.");
          }}
        >
          <div style={{ maxWidth: 720, margin: "0 auto", position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
              <span className="tag" style={{ borderColor: "rgba(30,58,138,0.25)", color: "var(--primary-blue)" }}>
                Research Report
              </span>
              {monetized && <span className="badge-founding">Premium</span>}
              {user && (<>
                <span className="t-meta">·</span>
                <span className="t-meta" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Avatar a={{
                    initials: (user.full_name || user.email || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase(),
                    avatarColor: "var(--primary-blue)",
                  }} size="sm"/>
                  {user.full_name || user.email?.split("@")[0]}
                </span>
              </>)}
            </div>

            {/* ── Drag-and-drop block list — restored from backup ──
                @hello-pangea/dnd wraps the block list so users can reorder
                by dragging the grip handle on each block. Reordering keeps
                insertion zones outside the drag context so they still
                respond to clicks. */}
            <DragDropContext
              onDragEnd={(result) => {
                if (!result.destination) return;
                if (result.destination.index === result.source.index) return;
                setBlocks((prev) => {
                  const next = Array.from(prev);
                  const [moved] = next.splice(result.source.index, 1);
                  next.splice(result.destination.index, 0, moved);
                  return next;
                });
              }}
            >
              <Droppable droppableId="editor-blocks">
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    style={{ display: "flex", flexDirection: "column", gap: 0 }}
                  >
                    {blocks.map((b, i) => (
                      <Draggable key={b.id} draggableId={String(b.id)} index={i}>
                        {(dragProvided, snapshot) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            style={{
                              ...dragProvided.draggableProps.style,
                              background: snapshot.isDragging ? "var(--bg-soft)" : undefined,
                              borderRadius: snapshot.isDragging ? 6 : undefined,
                            }}
                          >
                            <InsertionZone onAdd={() => { setSlashAt(i); setSlashOpen(true); }}/>
                            <div style={{ position: "relative" }}>
                              {/* Drag grip — left of block, only visible on hover */}
                              <div
                                {...dragProvided.dragHandleProps}
                                title="Drag to reorder"
                                style={{
                                  position: "absolute", left: -64, top: 10,
                                  width: 18, height: 22, borderRadius: 4,
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  color: "var(--text-meta)", cursor: "grab",
                                  opacity: 0.4,
                                }}
                              >
                                <svg width="9" height="14" viewBox="0 0 9 14" fill="currentColor">
                                  <circle cx="2" cy="2" r="1"/><circle cx="7" cy="2" r="1"/>
                                  <circle cx="2" cy="7" r="1"/><circle cx="7" cy="7" r="1"/>
                                  <circle cx="2" cy="12" r="1"/><circle cx="7" cy="12" r="1"/>
                                </svg>
                              </div>
                              <EditorBlockWrap
                                block={b}
                                active={activeBlockId === b.id}
                                setActive={() => setActiveBlockId(b.id)}
                                onShowSlash={() => { setSlashAt(i + 1); setSlashOpen(true); }}
                                onChange={(patch) => updateBlock(b.id, patch)}
                                onDelete={() => deleteBlock(b.id)}
                              />
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              <InsertionZone
                onAdd={() => { setSlashAt(blocks.length); setSlashOpen(true); }}
                persistent
              />

              <button
                onClick={() => { setSlashAt(blocks.length); setSlashOpen(true); }}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  width: "100%", padding: "14px 16px", marginTop: 18,
                  color: "var(--text-mute)", fontSize: 13,
                  fontFamily: "var(--f-sans)",
                  background: "var(--bg-soft)",
                  border: "0.5px dashed var(--border-strong)",
                  borderRadius: 8, cursor: "pointer",
                }}
              >
                <span style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: 22, height: 22, borderRadius: 4,
                  background: "var(--bg-elev)", border: "0.5px solid var(--border-strong)",
                }}>
                  <Plus size={12} strokeWidth={1.7}/>
                </span>
                <span>Add a block</span>
                <div style={{ flex: 1 }}/>
                <span style={{
                  padding: "2px 6px",
                  border: "0.5px solid var(--border-strong)",
                  borderRadius: 3, fontSize: 10.5, fontFamily: "var(--f-mono)",
                  background: "var(--bg-elev)",
                }}>/</span>
                <span style={{ fontSize: 11, opacity: 0.8 }}>or click anywhere between blocks</span>
              </button>
            </div>

            {slashOpen && (
              <SlashMenu
                onClose={() => setSlashOpen(false)}
                onInsert={(type) => insertAt(type, slashAt ?? blocks.length)}
              />
            )}
          </div>
        </main>

        {/* AI rail */}
        {aiOpen && (
          <aside style={{
            borderLeft: "0.5px solid var(--border-rgba)",
            background: "var(--bg-elev)",
            display: "flex", flexDirection: "column",
            position: "sticky", top: 56, height: "calc(100vh - 56px)",
          }}>
            <div style={{
              display: "flex", alignItems: "center",
              padding: "16px 20px",
              borderBottom: "0.5px solid var(--border-rgba)",
              gap: 10,
            }}>
              <Zap size={14} strokeWidth={1.7} style={{ color: "var(--gold-hex)" }}/>
              <div style={{ flex: 1 }}>
                <div className="t-title" style={{ fontSize: 13 }}>AI co-analyst</div>
                <div className="t-meta" style={{ fontSize: 10.5 }}>
                  Knows fundamentals, technicals, macro.
                </div>
              </div>
              <button onClick={() => setAiOpen(false)} className="btn btn-text btn-sm" style={{ width: 26, padding: 0 }}>
                <X size={14} strokeWidth={1.7}/>
              </button>
            </div>

            <div style={{
              flex: 1, overflowY: "auto", padding: 20,
              display: "flex", flexDirection: "column", gap: 16,
            }}>
              {/* Two power tools — restored from backup */}
              <button
                onClick={() => setAiSidebarOpen(true)}
                className="btn btn-gold"
                style={{ width: "100%", justifyContent: "flex-start", gap: 10 }}
              >
                <Zap size={13} strokeWidth={1.7}/>
                Generate report skeleton
              </button>
              <button
                onClick={() => { setAiChatOpen(true); setAiOpen(false); }}
                className="btn btn-ghost"
                style={{ width: "100%", justifyContent: "flex-start", gap: 10 }}
              >
                <Zap size={13} strokeWidth={1.7} style={{ color: "var(--gold-hex)" }}/>
                Open AI chat
              </button>

              <div className="hr"/>

              <div style={{ fontSize: 12, color: "var(--text-mute)", lineHeight: 1.5 }}>
                The skeleton generator drafts a full institutional-style report from a ticker. The chat answers questions, sanity-checks claims, and drops snippets into the editor.
              </div>
            </div>

            <div style={{
              padding: "12px 16px 16px",
              borderTop: "0.5px solid var(--border-rgba)",
              background: "var(--bg-elev)",
            }}>
              <div style={{
                padding: "10px 12px",
                background: "var(--bg)",
                border: "0.5px solid var(--border-strong)",
                borderRadius: 8,
              }}>
                <textarea
                  placeholder="Ask about fundamentals, technicals, comp set, or paste a paragraph for sanity check…"
                  rows={2}
                  style={{
                    width: "100%", border: 0, outline: 0, resize: "none",
                    fontSize: 13, fontFamily: "var(--f-sans)",
                    color: "var(--text)", background: "transparent",
                    lineHeight: 1.5,
                  }}
                />
                <div style={{ display: "flex", alignItems: "center", marginTop: 8 }}>
                  <button className="btn btn-text btn-sm" style={{ padding: 0, fontSize: 11.5, gap: 6 }}>
                    <Zap size={11} strokeWidth={1.7} style={{ color: "var(--gold-hex)" }}/>
                    Cite my open positions
                  </button>
                  <div style={{ flex: 1 }}/>
                  <button className="btn btn-gold btn-sm" style={{ height: 28, padding: "0 12px", fontSize: 11.5 }}>
                    Send <ArrowRight size={11}/>
                  </button>
                </div>
              </div>
              <div className="t-meta" style={{ marginTop: 8, fontSize: 10, textAlign: "center" }}>
                Drafts never leave Stoa · Not financial advice
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Preview modal */}
      {previewOpen && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 100,
          background: "rgba(10,26,63,0.32)",
          backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 40,
        }}
          onClick={() => setPreviewOpen(false)}
        >
          <div className="surface" style={{
            background: "var(--bg)", maxWidth: 820, width: "100%",
            maxHeight: "90vh", overflow: "auto", padding: 0,
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              display: "flex", alignItems: "center",
              padding: "14px 24px",
              borderBottom: "0.5px solid var(--border-rgba)",
              position: "sticky", top: 0, background: "var(--bg)", zIndex: 1,
            }}>
              <span className="t-eyebrow">Preview · how subscribers will see this</span>
              <div style={{ flex: 1 }}/>
              <button onClick={() => setPreviewOpen(false)} className="btn btn-ghost btn-sm">
                Close <X size={12} strokeWidth={1.7}/>
              </button>
            </div>
            <div style={{ padding: "40px 64px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
                <span className="tag" style={{ borderColor: "rgba(30,58,138,0.25)", color: "var(--primary-blue)" }}>
                  Research Report
                </span>
                {monetized && <span className="badge-founding">Premium</span>}
              </div>
              {blocks.map((b) => (
                <div key={b.id} style={{ marginBottom: 18 }}>
                  <BlockRenderer block={b} onChange={() => {}}/>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Floating AI panels — restored from backup ── */}
      <AISidebar
        isOpen={aiSidebarOpen}
        onClose={() => setAiSidebarOpen(false)}
        onGenerate={(generated) => {
          // The generator returns [{type: "heading"|"text"|"bullets", content}]
          // Convert to my editor's block shape and append before the last block.
          const newBlocks = (generated || []).map((g) => {
            const type = g.type === "heading" ? "h"
              : g.type === "bullets" ? "p"   // bullets render as multi-line paragraph
              : "p";
            return { id: newId(), type, text: g.content || "" };
          });
          if (!newBlocks.length) return;
          setBlocks((prev) => [...prev, ...newBlocks]);
          setAiSidebarOpen(false);
          toast.success(`Added ${newBlocks.length} block${newBlocks.length === 1 ? "" : "s"} from AI.`);
        }}
      />
      {aiChatOpen && (
        <AIChat
          reportContent={blocks.map((b) => b.text || "").join("\n\n")}
          onClose={() => setAiChatOpen(false)}
          onInsertBlock={(block) => {
            // AIChat returns {type, content} → convert and append
            const type = block.type === "heading" ? "h" : "p";
            setBlocks((prev) => [...prev, { id: newId(), type, text: block.content || "" }]);
          }}
        />
      )}

      {/* ── Templates + Design panels — restored from backup ── */}
      {templatesOpen && (
        <TemplatesPanel
          onClose={() => setTemplatesOpen(false)}
          onSelectTemplate={(templateBlocks) => {
            // Replace the editor body with the template's block sequence.
            // Each template block is {id, type, content, ...}. Adapt to my shape.
            const adapted = (templateBlocks || []).map((b) => ({
              id: newId(),
              type: b.type === "heading" ? "h"
                : b.type === "text" ? "p"
                : b.type === "bullets" ? "p"
                : b.type === "quote" ? "pullquote"
                : b.type === "callout" ? "p"
                : b.type === "thesis" ? "bullbear"
                : b.type === "metrics" ? "metrics"
                : "p",
              text: b.content || "",
              data: b.data,
            }));
            if (adapted.length) {
              setBlocks(adapted);
              toast.success(`Applied template (${adapted.length} blocks).`);
            }
            setTemplatesOpen(false);
          }}
        />
      )}
      {designOpen && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setDesignOpen(false); }}
          style={{
            position: "fixed", inset: 0, zIndex: 100,
            background: "rgba(10,26,63,0.32)",
            backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 40,
          }}
        >
          <div className="surface" style={{
            background: "var(--bg)", maxWidth: 520, width: "100%",
            maxHeight: "90vh", overflow: "auto", padding: 24,
          }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
              <h3 className="t-title" style={{ fontSize: 18, margin: 0 }}>Design</h3>
              <div style={{ flex: 1 }}/>
              <button onClick={() => setDesignOpen(false)} className="btn btn-ghost btn-sm">
                Close <X size={12} strokeWidth={1.7}/>
              </button>
            </div>
            <DesignPanel
              theme={reportTheme}
              font={reportFont}
              onThemeChange={setReportTheme}
              onFontChange={setReportFont}
            />
          </div>
        </div>
      )}
    </div>
  );
}
