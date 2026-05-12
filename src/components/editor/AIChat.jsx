import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Sparkles, Send, X, Loader2, GripHorizontal, ChevronDown,
  TrendingUp, Plus, Copy, Check, MessageSquare, Minimize2,
  BarChart3, BookOpen, Shield, Zap, Coins, AlertTriangle
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

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

Rules:
- Be specific and data-driven. Avoid generic statements.
- When discussing a stock, mention real metrics (P/E, revenue growth, margin trends).
- When asked to write/draft/create report content, produce professional analyst-quality prose.
- Format bullet-point content using • prefix, one per line.
- Keep answers concise and actionable — 3–8 sentences for discussion, longer only for requested drafts.
- Conclude report drafts with a summary sentence.`;

// ── Quick prompt chips ───────────────────────────────────────────────────────
const QUICK_PROMPTS = [
  { icon: TrendingUp,  label: "Bull thesis",  prompt: "Write a compelling 4-point bull thesis for " },
  { icon: Shield,      label: "Key risks",    prompt: "What are the 5 biggest risks for " },
  { icon: BarChart3,   label: "Valuation",    prompt: "Analyze the current valuation of " },
  { icon: Zap,         label: "Technicals",   prompt: "Give me a technical analysis summary for " },
  { icon: BookOpen,    label: "Sector view",  prompt: "What is the current macro and sector outlook for " },
  { icon: MessageSquare, label: "Earnings",  prompt: "What should I watch in the next earnings for " },
];

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

let msgCounter = 0;
const mkId = () => ++msgCounter;

const INIT_MSG = {
  id: mkId(),
  role: "assistant",
  content:
    "I'm your AI market analyst. Ask me anything — stock analysis, sector trends, macro themes, valuation models, or ask me to draft a paragraph for your report.\n\nYou can drag any of my answers directly into the report, or click the + button to insert.",
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
  const [credits, setCredits]   = useState(() => getCredits());

  // Draggable position
  const [pos, setPos]           = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragOffset              = useRef({ x: 0, y: 0 });
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

  // Drag logic
  const onHeaderMouseDown = useCallback((e) => {
    e.preventDefault();
    setDragging(true);
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
  }, [pos]);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => {
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - 380, e.clientX - dragOffset.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - 52, e.clientY - dragOffset.current.y)),
      });
    };
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging]);

  // ── Send message ────────────────────────────────────────────────────────
  const send = useCallback(async (overrideText) => {
    const userText = (overrideText ?? input).trim();
    if (!userText || loading) return;

    // Credit check
    const currentCredits = getCredits();
    if (currentCredits < COST_PER_MSG) {
      toast.error("No AI credits remaining. Purchase more in your Wallet.");
      return;
    }

    setInput("");

    const userMsg = { id: mkId(), role: "user", content: userText };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      // Build full conversation context
      const history = messages
        .map((m) => `${m.role === "user" ? "User" : "Analyst"}: ${m.content}`)
        .join("\n\n");

      const prompt = `${SYSTEM_PROMPT}

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

      const content = raw.trim() || "I couldn't generate a response. Please try again.";
      const blockType = detectBlockType(content);

      // Deduct credit after successful response
      const remaining = spendCredits(COST_PER_MSG);
      setCredits(remaining);
      if (remaining <= 10 && remaining > 0) {
        toast.warning(`${remaining} AI credits remaining`);
      }

      setMessages((prev) => [
        ...prev,
        { id: mkId(), role: "assistant", content, blockType },
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
            credits <= 0 ? "bg-loss/10 text-loss" :
            credits <= 10 ? "bg-amber-100 text-amber-700" :
            "bg-secondary text-muted-foreground"
          }`}>
            <Coins className="w-2.5 h-2.5" /> {credits}
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
                    <div
                      draggable
                      onDragStart={(e) => onDragStart(e, msg)}
                      className="bg-secondary border border-border rounded-xl px-3 py-2.5 text-xs text-foreground leading-relaxed whitespace-pre-wrap cursor-grab active:cursor-grabbing hover:border-primary/30 transition-colors"
                      title="Drag to drop into report"
                    >
                      {msg.content}
                    </div>

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
          {credits <= 0 && (
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
