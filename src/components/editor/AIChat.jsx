import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Sparkles, Send, X, Loader2, GripHorizontal, ChevronDown,
  TrendingUp, Plus, Copy, Check, MessageSquare, Minimize2,
  BarChart3, BookOpen, Shield, Zap, Coins, AlertTriangle
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import ChatChart from "@/components/editor/ChatChart";
import ChatCompareChart from "@/components/editor/ChatCompareChart";
import { spendAICredits, loadMyWallet } from "@/lib/walletService";

// ── AI Credit helpers ────────────────────────────────────────────────────────
const CREDITS_KEY   = "stoa_ai_credits";
const INITIAL_CREDITS = 100;
const COST_PER_MSG  = 1;

function getCredits() {
  const stored = localStorage.getItem(CREDITS_KEY);
  if (stored === null) {
    localStorage.setItem(CREDITS_KEY, String(INITIAL_CREDITS));
    return INITIAL_CREDITS;
  }
  return parseInt(stored, 10) || 0;
}

function spendCredits(n) {
  const current = getCredits();
  const next    = Math.max(0, current - n);
  localStorage.setItem(CREDITS_KEY, String(next));
  return next;
}

// ── System prompt ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are an elite equity research analyst at a top-tier investment bank with 15+ years of experience covering global markets. You have deep expertise in:

FUNDAMENTALS: DCF modeling, P/E, EV/EBITDA, EV/Sales, PEG ratio, revenue growth analysis, margin dynamics, free cash flow, balance sheet analysis, capital allocation.

TECHNICALS: Support/resistance, moving averages (50D, 200D), RSI, MACD, Bollinger Bands, volume analysis, chart patterns (breakouts, bases, flags, H&S), golden/death cross.

MACRO: Fed policy & rate cycles, inflation, yield curves, sector rotation, dollar strength, commodity cycles, geopolitical risk, credit spreads.

CRYPTO & ALTS: On-chain metrics, DeFi protocols, tokenomics, Bitcoin halving cycles, correlation with risk assets, institutional adoption.

OPTIONS: Implied volatility, IV percentile, Greeks, covered calls, protective puts, spreads, earnings plays, risk/reward structuring.

PORTFOLIO: Position sizing, Kelly criterion, correlation analysis, risk/reward, stop-loss discipline, portfolio construction.

⚠️ GROUND TRUTH (CRITICAL):
You are provided a "LIVE MARKET DATA" block before each user message containing
real-time price, 52-week range, P/E, EPS, market cap and volume for any tickers
the user mentions.

- ALWAYS use the LIVE MARKET DATA for any prices, support/resistance levels,
  P/E ratios, or 52-week highs/lows.
- NEVER quote price levels from memory. Your training data is outdated by
  months or years. Recent example: the model claimed NVDA support was $900
  when the live price was $200 — DO NOT make this kind of mistake.
- Support/resistance numbers must be inside the live 52-week range. Anchor
  technical analysis to the current price ± realistic % moves (e.g., "support
  at the 50-day MA near $X" where X is plausible given the current price).
- If a ticker the user asks about is NOT in the LIVE MARKET DATA block,
  explicitly say "I don't have live data for [TICKER] right now — could you
  confirm the symbol or paste a recent price?" rather than guessing.
- For valuation, use the provided P/E and market cap. Don't invent forward
  multiples — frame them as estimates ("at a forward P/E of ~X assuming Y%
  growth").

Rules:
- Be specific and data-driven. Avoid generic statements.
- When discussing a stock, mention real metrics from the LIVE MARKET DATA.
- When asked to write/draft/create report content, produce professional analyst-quality prose.
- Format bullet-point content using • prefix, one per line.
- Keep answers concise and actionable — 3–8 sentences for discussion, longer only for requested drafts.
- Conclude report drafts with a summary sentence.

CHART DIRECTIVES:
When the user asks for a chart, graph, plot, or visual of price action,
append a directive at the END of your text response.

  [CHART:TICKER]              — single ticker, defaults to 1-month daily
  [CHART:TICKER:TIMEFRAME]    — TIMEFRAME = 1W | 1M | 3M | 6M | 1Y

  [COMPARE:T1,T2]             — overlay 2-4 tickers, normalized to % return
  [COMPARE:T1,T2,T3:TIMEFRAME] — defaults to 3M timeframe

USE COMPARE when the user wants to see two or more stocks together,
versus, against each other, side-by-side, or "compare" them. COMPARE
normalizes each line to % change from the start of the period, so
stocks at very different price levels (NVDA $200, MSFT $400) become
visually comparable. Up to 4 tickers per COMPARE block.

USE CHART (separately, can do multiple) when the user explicitly wants
each plotted on its own chart with absolute prices, not relative returns.

Examples:
  User: "Show me Apple's chart"
  You:  "AAPL has been consolidating around \$180.\n\n[CHART:AAPL]"

  User: "Compare NVDA and MSFT over 3 months"
  You:  "Both are in uptrends but NVDA has outperformed MSFT by ~15% on AI demand.\n\n[COMPARE:NVDA,MSFT:3M]"

  User: "Plot Tesla, Apple, and Google for the past year"
  You:  "All three were positive but Tesla led on margin recovery.\n\n[COMPARE:TSLA,AAPL,GOOGL:1Y]"

  User: "Show NVDA and AMD separately"  (user explicitly asked separate)
  You:  "[CHART:NVDA:3M]\n[CHART:AMD:3M]"

Only emit chart directives when the user explicitly asks for a chart/graph/plot/visual/compare.
Tickers in CAPS, comma-separated for COMPARE.`;

// ── Quick prompt chips ───────────────────────────────────────────────────────
const QUICK_PROMPTS = [
  { icon: BarChart3,   label: "Chart",        prompt: "Show me a 1-month chart of " },
  { icon: BarChart3,   label: "Compare",      prompt: "Compare these two over 3 months: " },
  { icon: TrendingUp,  label: "Bull thesis",  prompt: "Write a compelling 4-point bull thesis for " },
  { icon: Shield,      label: "Key risks",    prompt: "What are the 5 biggest risks for " },
  { icon: BarChart3,   label: "Valuation",    prompt: "Analyze the current valuation of " },
  { icon: Zap,         label: "Technicals",   prompt: "Give me a technical analysis summary for " },
  { icon: BookOpen,    label: "Sector view",  prompt: "What is the current macro and sector outlook for " },
  { icon: MessageSquare, label: "Earnings",  prompt: "What should I watch in the next earnings for " },
];

// ── Ticker grounding ─────────────────────────────────────────────────────────
// The model hallucinates prices badly when relying on training data (e.g., it
// once told a user NVDA support was $900 while the stock was at $200). We
// extract any ticker the user mentions, fetch live data from Yahoo, and inject
// it into the prompt as ground truth. The system prompt is updated to forbid
// quoting prices/support/resistance numbers that aren't in the data block.

// Common all-caps acronyms that are NOT tickers — must skip to avoid noise
const NOT_TICKERS = new Set([
  "I", "A", "AM", "PM", "OK", "USA", "USD", "EUR", "GBP", "JPY", "CNY", "EU", "UK",
  "AI", "ML", "API", "IPO", "ETF", "GDP", "CPI", "PCE", "PPI", "ISM", "GDP",
  "FED", "ECB", "BOJ", "SEC", "FDA", "FTC", "DOJ", "IRS",
  "ATH", "ATL", "DCF", "ROE", "ROA", "ROI", "ROIC", "EBITDA", "EV", "PE", "EPS", "FCF",
  "DD", "TLDR", "IMO", "FYI", "ASAP", "AKA", "BTW", "ETA",
  "OEM", "SAAS", "B2B", "B2C", "ARR", "MRR", "CAC", "LTV", "TAM", "SAM",
  "Q1", "Q2", "Q3", "Q4", "YOY", "QOQ", "MOM",
  "ML", "NLP", "GPT", "LLM", "RAG", "ASIC", "GPU", "CPU", "RAM", "ROM",
  "BUY", "SELL", "HOLD", "LONG", "SHORT", "RSI", "MACD", "SMA", "EMA", "VWAP",
]);

function extractTickers(text) {
  if (!text) return [];
  const found = new Set();
  // Capture $TICKER or 1-5 uppercase letters as standalone tokens.
  // Crypto pairs like BTC-USD also caught.
  const re = /\$?\b([A-Z]{1,5}(?:-USD)?)\b/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const t = m[1].toUpperCase();
    if (t.length >= 2 && !NOT_TICKERS.has(t)) found.add(t);
  }
  // Limit to 4 to keep latency low
  return Array.from(found).slice(0, 4);
}

async function fetchMarketContext(tickers) {
  if (!tickers || tickers.length === 0) return [];
  try {
    const r = await base44.functions.invoke("proxyFetch", {
      url: `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(tickers.join(","))}&formatted=false`,
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    return (r?.data?.quoteResponse?.result || [])
      .filter(q => q.regularMarketPrice != null)
      .map(q => ({
        ticker:    q.symbol,
        name:      q.shortName || q.longName || q.symbol,
        price:     q.regularMarketPrice,
        change:    q.regularMarketChangePercent,
        dayHigh:   q.regularMarketDayHigh,
        dayLow:    q.regularMarketDayLow,
        yearHigh:  q.fiftyTwoWeekHigh,
        yearLow:   q.fiftyTwoWeekLow,
        volume:    q.regularMarketVolume,
        pe:        q.trailingPE,
        eps:       q.epsTrailingTwelveMonths,
        marketCap: q.marketCap,
      }));
  } catch {
    return [];
  }
}

function formatMarketContext(quotes) {
  if (!quotes || quotes.length === 0) return null;
  const cap = v => v >= 1e12 ? `$${(v/1e12).toFixed(2)}T` : v >= 1e9 ? `$${(v/1e9).toFixed(2)}B` : v >= 1e6 ? `$${(v/1e6).toFixed(0)}M` : `$${v}`;
  return quotes.map(q => {
    const parts = [
      `${q.ticker} (${q.name})`,
      `Current: $${q.price.toFixed(2)} (${q.change >= 0 ? "+" : ""}${q.change?.toFixed(2)}% today)`,
      q.yearLow && q.yearHigh ? `52W range: $${q.yearLow.toFixed(2)} – $${q.yearHigh.toFixed(2)}` : null,
      q.dayLow && q.dayHigh ? `Today range: $${q.dayLow.toFixed(2)} – $${q.dayHigh.toFixed(2)}` : null,
      q.pe ? `P/E (TTM): ${q.pe.toFixed(1)}` : null,
      q.eps ? `EPS (TTM): $${q.eps.toFixed(2)}` : null,
      q.marketCap ? `Market Cap: ${cap(q.marketCap)}` : null,
      q.volume ? `Volume: ${(q.volume / 1e6).toFixed(1)}M` : null,
    ].filter(Boolean);
    return parts.join(" · ");
  }).join("\n");
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function detectBlockType(content) {
  const lines = content.split("\n").filter(Boolean);
  const bulletLines = lines.filter(
    (l) => l.startsWith("•") || l.startsWith("- ") || /^\d+\./.test(l)
  );
  return bulletLines.length >= 2 && bulletLines.length >= lines.length * 0.5
    ? "bullets"
    : "text";
}

function normalizeForBlock(content, type) {
  if (type !== "bullets") return content;
  return content
    .split("\n")
    .filter(Boolean)
    .map((l) => (l.startsWith("•") ? l : `• ${l.replace(/^[-\d.]+\s*/, "")}`))
    .join("\n");
}

// Pull [CHART:TICKER], [CHART:TICKER:TIMEFRAME], and
// [COMPARE:T1,T2,T3:TIMEFRAME] directives out of the AI's response.
// Returns the cleaned text + an array of chart specs (single + compare).
// Allowed ticker chars: A-Z 0-9 . - = ^ (covers ^GSPC, BTC-USD, BRK.A, EURUSD=X)
function parseChartDirectives(content) {
  const charts = [];

  // First: COMPARE — multiple tickers, one normalized chart
  const compareRe = /\[COMPARE:([A-Z0-9.\-=^,\s]+?)(?::([1-9](?:W|M|Y)))?\]/gi;
  let cleanText = content.replace(compareRe, (_, list, tf) => {
    const tickers = list.split(",").map(s => s.trim().toUpperCase()).filter(Boolean).slice(0, 4);
    if (tickers.length < 2) return ""; // need at least 2 to compare
    charts.push({
      id:        `cmp_${charts.length}_${tickers.join("_")}`,
      kind:      "compare",
      tickers,
      timeframe: (tf || "3M").toUpperCase(), // 3M default for compare (more meaningful)
    });
    return "";
  });

  // Then: single CHART
  const singleRe = /\[CHART:([A-Z0-9.\-=^]+)(?::([1-9](?:W|M|Y)))?\]/gi;
  cleanText = cleanText.replace(singleRe, (_, ticker, tf) => {
    charts.push({
      id:        `chart_${charts.length}_${ticker}`,
      kind:      "single",
      ticker:    ticker.toUpperCase(),
      timeframe: (tf || "1M").toUpperCase(),
    });
    return "";
  })
  .replace(/\n{3,}/g, "\n\n").trim();

  return { text: cleanText, charts };
}

let msgCounter = 0;
const mkId = () => ++msgCounter;

const INIT_MSG = {
  id: mkId(),
  role: "assistant",
  content:
    "I'm your AI market analyst. Ask me anything — stock analysis, sector trends, macro themes, valuation models, or ask me to draft a paragraph for your report.\n\n📊 Charts:  \"show me NVDA chart\" or \"plot TSLA over 1 year\"\n📈 Compare: \"compare NVDA and MSFT over 3 months\" — both lines on one chart, normalized to % return\n\nYou can drag any of my answers directly into the report, or click the + button to insert.",
};

// ── Main component ───────────────────────────────────────────────────────────
export default function AIChat({ reportContent, onInsertBlock }) {
  const [open, setOpen]         = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState([INIT_MSG]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [quickTicker, setQuickTicker] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  // Wallet AI credits — single source of truth (not localStorage). The
  // legacy localStorage `stoa_ai_credits` is no longer authoritative.
  const [credits, setCredits]   = useState(null);
  useEffect(() => {
    if (!open) return;
    loadMyWallet().then(({ wallet }) => setCredits(wallet.ai_credits || 0)).catch(() => setCredits(0));
  }, [open]);

  // Draggable position — offset is held in closure inside onHeaderMouseDown
  const [pos, setPos]           = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const initialized             = useRef(false);

  const bottomRef     = useRef(null);
  const inputRef      = useRef(null);

  // Init position after mount
  useEffect(() => {
    if (open && !initialized.current) {
      setPos({
        x: Math.max(20, window.innerWidth - 400),
        y: 80,
      });
      initialized.current = true;
    }
  }, [open]);

  useEffect(() => {
    if (!minimized) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, minimized]);

  // Drag logic — attach listeners SYNCHRONOUSLY in mousedown so a fast
  // click-release on the header can't miss the mouseup and leave dragging
  // stuck true (which made the panel follow the cursor and prevented typing).
  const onHeaderMouseDown = useCallback((e) => {
    // Ignore mousedown on buttons inside the header (close, minimize)
    if (e.target.closest("button")) return;
    e.preventDefault();
    const startOffsetX = e.clientX - pos.x;
    const startOffsetY = e.clientY - pos.y;
    setDragging(true);

    const onMove = (ev) => {
      setPos({
        x: Math.max(0, Math.min(window.innerWidth  - 380, ev.clientX - startOffsetX)),
        y: Math.max(0, Math.min(window.innerHeight - 52,  ev.clientY - startOffsetY)),
      });
    };
    const onUp = () => {
      setDragging(false);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup",   onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
  }, [pos]);

  // Auto-focus the message input when the chat opens or un-minimizes
  useEffect(() => {
    if (open && !minimized) {
      // setTimeout 0 lets the panel finish rendering before we grab focus
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open, minimized]);

  // Click anywhere on the panel that ISN'T an interactive element → refocus
  // the input. Fixes the bug where clicking a message bubble (or any plain
  // text inside the chat) stole focus and the user could no longer type.
  const handlePanelClick = useCallback((e) => {
    // If the click landed on a button, link, input, textarea, or anything
    // explicitly marked as a control, let it do its thing.
    if (e.target.closest("button, a, input, textarea, [data-no-refocus]")) return;
    // Otherwise return focus to the message input.
    inputRef.current?.focus();
  }, []);

  // ── Send message ────────────────────────────────────────────────────────
  const send = useCallback(async (overrideText) => {
    const userText = (overrideText ?? input).trim();
    if (!userText || loading) return;

    // Credit check — read from wallet (source of truth)
    if (credits != null && credits < COST_PER_MSG) {
      toast.error("No AI credits remaining. Convert cash → credits in your Wallet.");
      return;
    }

    setInput("");

    const userMsg = { id: mkId(), role: "user", content: userText };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      // ── Ground the AI in real prices ────────────────────────────────────
      // Extract tickers from the user message AND the last ~3 assistant/user
      // turns (covers follow-up questions like "what about its competitors").
      // Then fetch real live data and inject it into the prompt as ground truth.
      const recentTurns = messages.slice(-6).map(m => m.content).join(" ");
      const tickers = extractTickers(`${userText} ${recentTurns}`);
      const liveData = await fetchMarketContext(tickers);
      const marketBlock = liveData.length > 0
        ? formatMarketContext(liveData)
        : "(none — user did not mention specific tickers, or symbols were unrecognized)";

      // Build full conversation context
      const history = messages
        .map((m) => `${m.role === "user" ? "User" : "Analyst"}: ${m.content}`)
        .join("\n\n");

      const prompt = `${SYSTEM_PROMPT}

---
LIVE MARKET DATA (fetched ${new Date().toISOString()}, source: Yahoo Finance):
${marketBlock}

---
CONVERSATION HISTORY:
${history}

---
CURRENT REPORT CONTEXT (for reference):
${(reportContent || "").slice(0, 600) || "No report content yet."}

---
User: ${userText}

Analyst:`;

      const res = await base44.integrations.Core.InvokeLLM({
        model: "claude_sonnet_4_6",
        prompt,
      });

      const raw =
        typeof res === "string"
          ? res
          : res?.content?.[0]?.text || res?.text || res?.response || "";

      const rawContent = raw.trim() || "I couldn't generate a response. Please try again.";
      // Extract any [CHART:...] directives the AI emitted
      const { text: content, charts } = parseChartDirectives(rawContent);
      const blockType = detectBlockType(content);

      // Deduct credit from wallet after successful response
      const res = await spendAICredits(COST_PER_MSG, "AIChat message").catch(() => null);
      const remaining = res?.remaining ?? credits;
      setCredits(remaining);
      if (remaining <= 10 && remaining > 0) {
        toast.warning(`${remaining} AI credits remaining`);
      }

      setMessages((prev) => [
        ...prev,
        { id: mkId(), role: "assistant", content, blockType, charts },
      ]);
    } catch {
      toast.error("AI assistant error. Please try again.");
      setMessages((prev) => [
        ...prev,
        {
          id: mkId(),
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, reportContent]);

  // ── Insert / drag helpers ───────────────────────────────────────────────
  const insertMsg = useCallback((msg) => {
    if (!onInsertBlock) return;
    const type    = msg.blockType || "text";
    const content = normalizeForBlock(msg.content, type);
    onInsertBlock(content, type);
    toast.success("Added to report");
  }, [onInsertBlock]);

  const copyMsg = useCallback((msg) => {
    navigator.clipboard.writeText(msg.content).catch(() => {});
    setCopiedId(msg.id);
    setTimeout(() => setCopiedId(null), 1500);
  }, []);

  const onDragStart = useCallback((e, msg) => {
    const type    = msg.blockType || "text";
    const content = normalizeForBlock(msg.content, type);
    e.dataTransfer.setData("ai-text", content);
    e.dataTransfer.setData("ai-type", type);
    e.dataTransfer.effectAllowed = "copy";
  }, []);

  const handleQuickPrompt = (chip) => {
    const ticker = quickTicker.trim().toUpperCase() || "[TICKER]";
    send(chip.prompt + ticker);
  };

  // ── Collapsed button ────────────────────────────────────────────────────
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-40 flex items-center gap-2 bg-primary text-white px-3 py-2.5 rounded-full shadow-lg hover:bg-primary/90 transition-all text-sm font-medium"
      >
        <Sparkles className="w-4 h-4" />
        AI Analyst
      </button>
    );
  }

  // ── Floating panel ──────────────────────────────────────────────────────
  return (
    <div
      style={{
        position:   "fixed",
        left:       pos.x,
        top:        pos.y,
        zIndex:     60,
        width:      370,
        userSelect: dragging ? "none" : "auto",
      }}
      className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      onClick={handlePanelClick}
    >
      {/* Header / drag handle */}
      <div
        onMouseDown={onHeaderMouseDown}
        className={`flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/50 select-none ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
      >
        <div className="flex items-center gap-2 pointer-events-none">
          <GripHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">AI Market Analyst</span>
          {/* Credit badge */}
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${
            credits == null ? "bg-secondary text-muted-foreground" :
            credits <= 0   ? "bg-loss/10 text-loss" :
            credits <= 10  ? "bg-amber-100 text-amber-700" :
            "bg-secondary text-muted-foreground"
          }`}>
            <Coins className="w-2.5 h-2.5" /> {credits == null ? "—" : credits}
          </span>
        </div>
        <div className="flex items-center gap-0.5 pointer-events-auto">
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => setMinimized((m) => !m)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            {minimized
              ? <ChevronDown className="w-3.5 h-3.5 rotate-180" />
              : <Minimize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {!minimized && (
        <>
          {/* Quick prompts row */}
          <div className="px-3 pt-2.5 pb-1.5 border-b border-border bg-secondary/20">
            <div className="flex items-center gap-1.5 mb-1.5">
              <input
                value={quickTicker}
                onChange={(e) => setQuickTicker(e.target.value.toUpperCase())}
                placeholder="Ticker (e.g. NVDA)"
                className="flex-1 text-[11px] font-mono border border-border rounded-lg px-2 py-1 bg-card focus:outline-none focus:ring-1 focus:ring-primary"
                maxLength={6}
              />
              <span className="text-[10px] text-muted-foreground">+ quick prompt:</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {QUICK_PROMPTS.map((chip) => {
                const Icon = chip.icon;
                return (
                  <button
                    key={chip.label}
                    onClick={() => handleQuickPrompt(chip)}
                    disabled={loading}
                    className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg bg-secondary hover:bg-primary/10 hover:text-primary border border-border hover:border-primary/30 transition-all disabled:opacity-50"
                  >
                    <Icon className="w-2.5 h-2.5" />
                    {chip.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Message list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3" style={{ height: 340, maxHeight: 340 }}>
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" ? (
                  <div className="group max-w-[92%] relative">
                    {/* Drag hint label */}
                    {msg.content && (
                      <div
                        draggable
                        onDragStart={(e) => onDragStart(e, msg)}
                        className="bg-secondary border border-border rounded-xl px-3 py-2.5 text-xs text-foreground leading-relaxed whitespace-pre-wrap cursor-grab active:cursor-grabbing hover:border-primary/30 transition-colors"
                        title="Drag to drop into report"
                      >
                        {msg.content}
                      </div>
                    )}

                    {/* Inline charts from [CHART:..] and [COMPARE:..] directives */}
                    {msg.charts?.length > 0 && (
                      <div className="space-y-1">
                        {msg.charts.map((c) =>
                          c.kind === "compare"
                            ? <ChatCompareChart key={c.id} tickers={c.tickers} timeframe={c.timeframe} />
                            : <ChatChart        key={c.id} ticker={c.ticker}   timeframe={c.timeframe} />
                        )}
                      </div>
                    )}

                    {/* Action row */}
                    <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Drag indicator */}
                      <span className="text-[9px] text-muted-foreground flex items-center gap-0.5 mr-1">
                        <GripHorizontal className="w-2.5 h-2.5" /> drag to report
                      </span>

                      {/* Insert button with type choice */}
                      {onInsertBlock && (
                        <div className="flex gap-0.5">
                          <button
                            onClick={() => insertMsg(msg)}
                            title="Add to report as text"
                            className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 border border-primary/20 transition-colors font-medium"
                          >
                            <Plus className="w-2.5 h-2.5" /> Add to report
                          </button>
                          {msg.blockType === "bullets" && (
                            <button
                              onClick={() => {
                                onInsertBlock(normalizeForBlock(msg.content, "text"), "text");
                                toast.success("Added as text");
                              }}
                              title="Add as plain text instead"
                              className="text-[9px] px-1.5 py-0.5 text-muted-foreground rounded-lg hover:bg-secondary border border-border transition-colors"
                            >
                              as text
                            </button>
                          )}
                        </div>
                      )}

                      {/* Copy */}
                      <button
                        onClick={() => copyMsg(msg)}
                        className="ml-auto p-0.5 text-muted-foreground hover:text-foreground rounded transition-colors"
                        title="Copy"
                      >
                        {copiedId === msg.id
                          ? <Check className="w-3 h-3 text-gain" />
                          : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="max-w-[80%] bg-primary text-white rounded-xl px-3 py-2 text-xs leading-relaxed">
                    {msg.content}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-secondary border border-border rounded-xl px-3 py-2.5 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">Analyzing…</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Out-of-credits banner */}
          {credits != null && credits <= 0 && (
            <div className="mx-3 mb-2 p-2.5 bg-loss/8 border border-loss/20 rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-loss flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-loss">No AI credits remaining</p>
                <p className="text-[10px] text-muted-foreground">Top up in your <a href="/wallet" className="underline text-primary">Wallet</a> to continue</p>
              </div>
            </div>
          )}

          {/* Input row */}
          <div className="p-3 border-t border-border flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
              placeholder="Ask about any stock, sector, or market…"
              className="flex-1 text-xs border border-border rounded-xl px-3 py-2 bg-card focus:outline-none focus:ring-1 focus:ring-primary"
              disabled={loading}
            />
            <button
              onClick={() => send()}
              disabled={loading || !input.trim()}
              className="flex items-center justify-center w-8 h-8 rounded-xl bg-primary text-white hover:bg-primary/90 disabled:opacity-40 transition-colors flex-shrink-0"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Drag tip */}
          <div className="px-3 pb-2 text-center">
            <p className="text-[9px] text-muted-foreground">
              Drag any response directly onto the report · or click <strong>Add to report</strong>
            </p>
          </div>
        </>
      )}
    </div>
  );
}
