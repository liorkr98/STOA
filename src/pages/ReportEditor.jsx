import React, { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sparkles, Plus, Type, List, BarChart3, ImageIcon, Quote,
  Send, Save, FolderOpen, Trash2, Clock, CheckCircle2,
  ChevronDown, Settings2, TrendingUp, Lock,
  Hash, FileText, Zap, AlignLeft, Palette, X, Layout, Eye,
  Undo2, Redo2, GripVertical, Languages
} from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";

import EditorBlock from "@/components/editor/EditorBlock";
import StockChartBlock from "@/components/editor/StockChartBlock";
import ImageBlock from "@/components/editor/ImageBlock";
import PredictionBlock from "@/components/editor/PredictionBlock";
import { fetchLockPrice } from "@/lib/priceLockProvider";
import { loadMyWallet, spendAICredits } from "@/lib/walletService";
import AISidebar from "@/components/editor/AISidebar";
import AIChat from "@/components/editor/AIChat";
import EditorSettingsPanel from "@/components/editor/EditorSettingsPanel";
import BoostPanel from "@/components/editor/BoostPanel";
import TemplatesPanel from "@/components/editor/TemplatesPanel";
import DesignPanel, { REPORT_THEMES, REPORT_FONTS } from "@/components/editor/DesignPanel";
import FloatingToolbar from "@/components/editor/FloatingToolbar";
import ReportQualityScore from "@/components/editor/ReportQualityScore";
import QuickPostEditor from "@/components/editor/QuickPostEditor";
import ColumnsBlock from "@/components/editor/ColumnsBlock";
import MetricsBlock from "@/components/editor/MetricsBlock";
import ThesisBlock from "@/components/editor/ThesisBlock";


// ─── Constants ─────────────────────────────────────────────────────────────
const DYOR_TEXT =
  "Disclaimer: This report is for informational purposes only and does not constitute financial advice. Always do your own research (DYOR) before making any investment decisions.";

const BLOCK_TYPES = [
  { type: "heading",    label: "Heading",     icon: Type,      shortcut: "H" },
  { type: "text",       label: "Paragraph",   icon: AlignLeft, shortcut: "P" },
  { type: "bullets",   label: "Bullet List", icon: List,      shortcut: "B" },
  { type: "quote",     label: "Quote",       icon: Quote,     shortcut: "Q" },
  { type: "callout",   label: "Callout",     icon: FileText,  shortcut: "L" },
  { type: "divider",   label: "Divider",     icon: Layout,    shortcut: "D" },
  { type: "numbered",  label: "Numbered",    icon: List,      shortcut: "N" },
  { type: "stockchart",label: "Stock Chart", icon: BarChart3, shortcut: "C" },
  { type: "image",     label: "Image",       icon: ImageIcon, shortcut: "I" },
  { type: "columns",   label: "Text + Media", icon: Layout,    shortcut: "T" },
  { type: "metrics",   label: "Key Metrics",  icon: BarChart3, shortcut: "K" },
  { type: "thesis",    label: "Bull / Bear",  icon: TrendingUp, shortcut: "B" },
];

const INDUSTRIES = [
  "Technology","Healthcare","Financials","Energy","Consumer Discretionary",
  "Consumer Staples","Industrials","Materials","Real Estate","Utilities","Telecom","Crypto"
];

const MARKET_CAPS = [
  { value: "mega",  label: "Mega Cap  (>$200B)" },
  { value: "large", label: "Large Cap ($10–200B)" },
  { value: "mid",   label: "Mid Cap   ($2–10B)" },
  { value: "small", label: "Small Cap ($300M–2B)" },
  { value: "micro", label: "Micro Cap (<$300M)" },
];

// ─── Helpers ───────────────────────────────────────────────────────────────
let _nextId = Date.now();
const newId = () => ++_nextId;
const makeBlock = (type, content = "") => ({ id: newId(), type, content });

const sanitizeBlock = (b) => {
  if (!b || typeof b !== "object") return null;
  if (typeof b.type !== "string") return null;
  return {
    id:           typeof b.id === "number" ? b.id : newId(),
    type:         b.type,
    content:      typeof b.content === "string" ? b.content : "",
    ticker:       b.ticker       || undefined,
    height:       b.height       || undefined,
    snapshot_url: b.snapshot_url || undefined,
    frozen:       b.frozen       || undefined,
    interval:     b.interval     || undefined,
    chartStyle:   b.chartStyle   || undefined,
    chartTheme:   b.chartTheme   || undefined,
    studies:      b.studies      || undefined,
    savedAt:      b.savedAt      || undefined,
    rowGroup:     b.rowGroup     || undefined,
    blockAlign:   b.blockAlign   || undefined,
  };
};

const sanitizeBlocks = (arr) => {
  if (!Array.isArray(arr)) return [makeBlock("text")];
  const clean = arr.map(sanitizeBlock).filter(Boolean);
  return clean.length > 0 ? clean : [makeBlock("text")];
};

function buildRows(blocks) {
  const seen = new Set();
  const rows = [];
  for (const b of blocks) {
    if (b.rowGroup) {
      if (!seen.has(b.rowGroup)) {
        seen.add(b.rowGroup);
        rows.push({ type: "group", groupId: b.rowGroup, blocks: blocks.filter(x => x.rowGroup === b.rowGroup) });
      }
    } else {
      rows.push({ type: "single", block: b });
    }
  }
  return rows;
}

// ─── Main Component ────────────────────────────────────────────────────────
export default function ReportEditor() {
  const navigate = useNavigate();
  const urlTicker = new URLSearchParams(window.location.search).get("ticker")?.toUpperCase() || "";

  // Mode
  const [editorMode, setEditorMode] = useState("deep"); // "deep" | "quick"

  // Quick Post extra state
  const [quickImage, setQuickImage] = useState(null);
  const [quickShowPrediction, setQuickShowPrediction] = useState(false);
  const [quickAction, setQuickAction] = useState("BUY");
  const [quickTicker, setQuickTicker] = useState("");
  const [quickTimeframe, setQuickTimeframe] = useState("1d");
  const [quickTarget, setQuickTarget] = useState("");

  // Content state
  const [title,          setTitle]          = useState(urlTicker ? `${urlTicker} — Equity Research Report` : "");
  const [excerpt,        setExcerpt]        = useState("");
  const [blocks,         setBlocks]         = useState([makeBlock("text")]);
  const [predictionData, setPredictionData] = useState(null);

  // Settings state
  const [isPremium,      setIsPremium]      = useState(false);
  const [reportPrice,    setReportPrice]    = useState("4.99");
  const [industry,       setIndustry]       = useState("");
  const [marketCap,      setMarketCap]      = useState("");
  const [coverImage,     setCoverImage]     = useState("");
  const [tags,           setTags]           = useState([]);
  const [tagInput,       setTagInput]       = useState("");

  // Design state
  const [reportTheme,    setReportTheme]    = useState("default");
  const [reportFont,     setReportFont]     = useState("inter");
  const [reportLayout,   setReportLayout]   = useState("standard");
  const [accentColor,    setAccentColor]    = useState("#1d4ed8");
  const [isRTL,          setIsRTL]          = useState(false);
  const [brandName,      setBrandName]      = useState("");
  const [brandLogo,      setBrandLogo]      = useState("");
  const [reportFooter,   setReportFooter]   = useState("");

  // UI state
  const [showPrediction, setShowPrediction] = useState(false);
  const [showAI,         setShowAI]         = useState(() => !!urlTicker);
  const [showDrafts,     setShowDrafts]     = useState(false);
  const [showTemplates,  setShowTemplates]  = useState(false);
  const [activePanel,    setActivePanel]    = useState("write");
  const [publishing,     setPublishing]     = useState(false);
  const [lastSaved,      setLastSaved]      = useState(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [dropIndicatorAt, setDropIndicatorAt] = useState(null);

  // Undo/Redo
  const historyRef = useRef([]);
  const historyIndexRef = useRef(-1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const [drafts, setDrafts] = useState(() => {
    try { return JSON.parse(localStorage.getItem("stoa_drafts") || "[]"); } catch { return []; }
  });

  const wordCount = useMemo(() =>
    blocks
      .filter(b => ["text", "heading", "heading2", "bullets", "quote", "callout", "numbered"].includes(b.type))
      .reduce((n, b) => n + (b.content || "").trim().split(/\s+/).filter(Boolean).length, 0),
  [blocks]);

  const readingTime = Math.max(1, Math.ceil(wordCount / 200));
  const saveStatus  = lastSaved && Date.now() - lastSaved < 60_000 ? "saved" : "unsaved";

  const wordCountColor = wordCount >= 600 ? "text-gain" : wordCount >= 200 ? "text-foreground" : "text-amber-500";

  // Push to undo history
  const pushHistory = useCallback((newBlocks) => {
    const snapshot = JSON.stringify(newBlocks);
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(snapshot);
    if (historyRef.current.length > 20) historyRef.current.shift();
    historyIndexRef.current = historyRef.current.length - 1;
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(false);
  }, []);

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current--;
    const prev = JSON.parse(historyRef.current[historyIndexRef.current]);
    setBlocks(prev);
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(true);
  }, []);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current++;
    const next = JSON.parse(historyRef.current[historyIndexRef.current]);
    setBlocks(next);
    setCanUndo(true);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  }, []);

  // Auto-save every 30s
  useEffect(() => {
    const hasContent = title.trim() || blocks.some(b => b.content?.trim());
    if (!hasContent) return;
    const t = setTimeout(() => persistDraft(true), 30_000);
    return () => clearTimeout(t);
  }, [title, blocks, predictionData]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "s") { e.preventDefault(); persistDraft(); }
      if (mod && e.key === "Enter") { e.preventDefault(); handlePublish(); }
      if (mod && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      if (mod && e.key === "z" && e.shiftKey) { e.preventDefault(); redo(); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [undo, redo]);

  // ── Block operations ──────────────────────────────────────────────────────
  const setBlocksWithHistory = useCallback((newBlocks) => {
    setBlocks(newBlocks);
    pushHistory(newBlocks);
  }, [pushHistory]);

  const updateBlock = useCallback((id, updated) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, ...updated, id: b.id } : b));
  }, []);

  const deleteBlock = useCallback((id) => {
    setBlocks(prev => {
      const next = prev.filter(b => b.id !== id);
      const result = next.length > 0 ? next : [makeBlock("text")];
      pushHistory(result);
      return result;
    });
  }, [pushHistory]);

  const insertBlockAfter = useCallback((id, type = "text") => {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === id);
      const next = [...prev];
      next.splice(idx + 1, 0, makeBlock(type));
      pushHistory(next);
      return next;
    });
  }, [pushHistory]);

  const insertBlockAt = useCallback((index, blockData) => {
    setBlocks(prev => {
      const next = [...prev];
      next.splice(index, 0, makeBlock(blockData.type || "text", blockData.content || ""));
      pushHistory(next);
      return next;
    });
  }, [pushHistory]);

  const duplicateBlock = useCallback((id) => {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === id);
      if (idx < 0) return prev;
      const copy = { ...prev[idx], id: newId() };
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      pushHistory(next);
      return next;
    });
  }, [pushHistory]);

  const moveBlock = useCallback((id, dir) => {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === id);
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      pushHistory(next);
      return next;
    });
  }, [pushHistory]);

  const turnIntoBlock = useCallback((id, newType) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, type: newType } : b));
  }, []);

  const handleBlockDragEnd = useCallback((result) => {
    if (!result.destination || result.destination.index === result.source.index) return;
    setBlocks(prev => {
      const next = Array.from(prev);
      const [removed] = next.splice(result.source.index, 1);
      next.splice(result.destination.index, 0, removed);
      pushHistory(next);
      return next;
    });
  }, [pushHistory]);

  const addBlock = useCallback((type) => {
    const nb = makeBlock(type);
    setBlocks(prev => { const next = [...prev, nb]; pushHistory(next); return next; });
  }, [pushHistory]);

  const addDYOR = useCallback(() => {
    setBlocks(prev => { const next = [...prev, makeBlock("text", DYOR_TEXT)]; pushHistory(next); return next; });
    toast.success("DYOR disclaimer added");
  }, [pushHistory]);

  // ── Tags ─────────────────────────────────────────────────────────────────
  const addTag = (e) => {
    if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
      e.preventDefault();
      const t = tagInput.trim().replace(/,+$/, "");
      if (t && !tags.includes(t) && tags.length < 8) setTags(prev => [...prev, t]);
      setTagInput("");
    }
  };

  // ── Cover image upload ────────────────────────────────────────────────────
  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setCoverImage(file_url);
      toast.success("Cover image uploaded!");
    } catch { toast.error("Upload failed"); }
    finally { setUploadingCover(false); }
  };

  // ── Drafts ────────────────────────────────────────────────────────────────
  const persistDraft = (silent = false) => {
    const cleanBlocks = sanitizeBlocks(blocks);
    const draft = {
      id: Date.now(), title: title || "Untitled Draft",
      blocks: cleanBlocks, predictionData: predictionData || null,
      excerpt, industry, marketCap, coverImage, tags,
      savedAt: new Date().toISOString(),
    };
    const updated = [draft, ...drafts.slice(0, 9)];
    setDrafts(updated);
    localStorage.setItem("stoa_drafts", JSON.stringify(updated));
    setLastSaved(Date.now());
    if (!silent) toast.success("Draft saved!");
  };

  const loadDraft = (draft) => {
    setTitle(draft.title || "");
    setBlocks(sanitizeBlocks(draft.blocks));
    setPredictionData(draft.predictionData || null);
    setExcerpt(draft.excerpt || "");
    setIndustry(draft.industry || "");
    setMarketCap(draft.marketCap || "");
    setCoverImage(draft.coverImage || "");
    setTags(draft.tags || []);
    setShowDrafts(false);
    toast.success("Draft loaded!");
  };

  const deleteDraft = (id) => {
    const updated = drafts.filter(d => d.id !== id);
    setDrafts(updated);
    localStorage.setItem("stoa_drafts", JSON.stringify(updated));
  };

  // ── AI / Template generation ─────────────────────────────────────────────
  const handleAIGenerate = useCallback((template) => {
    const newBlocks = sanitizeBlocks(template.map(b => makeBlock(b.type || "text", b.content || "")));
    setBlocksWithHistory(newBlocks);
    toast.success("Template loaded!");
  }, [setBlocksWithHistory]);

  const handleTemplateSelect = useCallback((templateBlocks) => {
    const newBlocks = sanitizeBlocks(templateBlocks.map(b => makeBlock(b.type || "text", b.content || "")));
    setBlocksWithHistory(newBlocks);
    toast.success("Template applied!");
  }, [setBlocksWithHistory]);

  // ── AI drag-and-drop ──────────────────────────────────────────────────────
  const handleDragOver = (e, idx) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setDropIndicatorAt(idx);
  };

  const handleDrop = (e, idx) => {
    e.preventDefault();
    setDropIndicatorAt(null);
    const text = e.dataTransfer.getData("ai-text");
    const type = e.dataTransfer.getData("ai-type") || "text";
    if (text) insertBlockAt(idx, { type, content: text });
  };

  // ── Publish ───────────────────────────────────────────────────────────────
  // Publishing is the commitment moment:
  //   1. Validate content
  //   2. Verify AI credits (fact-check is paid work)
  //   3. If there's a prediction → fetch live price NOW, lock as entry
  //   4. Run AI fact check
  //   5. Write to DB with status=published
  //   6. Deduct credits + log transaction
  // Draft saves do NONE of this — drafting is free and fast.
  const PUBLISH_COST = 10; // AI credits

  const handlePublish = async () => {
    if (!title.trim()) { toast.error("Please add a title before publishing."); return; }
    const validBlocks = sanitizeBlocks(blocks);
    if (validBlocks.every(b => !b.content?.trim() && b.type !== "stockchart" && b.type !== "image" && b.type !== "divider")) {
      toast.error("Please write some content before publishing."); return;
    }

    setPublishing(true);
    try {
      const currentUser = await base44.auth.me();
      if (!currentUser) throw new Error("Not logged in.");

      // ── Step 1: AI credits gate — read from wallet (source of truth) ─────
      const { wallet } = await loadMyWallet();
      const credits = wallet.ai_credits || 0;
      if (credits < PUBLISH_COST) {
        toast.error(`Need ${PUBLISH_COST} AI credits to publish · You have ${credits}`, {
          action: { label: "Get credits", onClick: () => navigate("/wallet") },
          duration: 6000,
        });
        return;
      }

      // ── Step 2: Lock live price at publish moment (if prediction) ─────────
      // Uses the multi-source provider: Finnhub real-time → Polygon → Yahoo fallback.
      // The source is stored on the report so we can show data provenance.
      let lockPrice  = null;
      let lockTime   = null;
      let lockSource = null;
      if (predictionData?.ticker && predictionData?.action) {
        toast.info(`Locking live price for $${predictionData.ticker}…`, { duration: 1800 });
        try {
          const locked = await fetchLockPrice(predictionData.ticker);
          lockPrice  = locked.price;
          lockTime   = locked.timestamp;
          lockSource = locked.source;
        } catch {
          toast.error(`Could not fetch live price for $${predictionData.ticker}. Publish aborted — try again in a moment.`);
          return;
        }
      }

      // ── Step 3: Freeze stock chart blocks ─────────────────────────────────
      const frozenBlocks = validBlocks.map(b =>
        b.type === "stockchart" && !b.frozen ? { ...b, frozen: true } : b
      );
      setBlocks(frozenBlocks);

      const fullText = [title, ...frozenBlocks.map(b => b.content || "")].filter(Boolean).join("\n\n");
      const autoExcerpt = excerpt.trim() ||
        validBlocks.find(b => b.type === "text" && b.content?.trim())?.content?.slice(0, 200) || "";

      const tickers = [
        ...frozenBlocks.flatMap(b => (b.content || "").match(/\$([A-Z]{2,5})/g) || []).map(t => t.replace("$", "")),
        ...frozenBlocks.filter(b => b.type === "stockchart" && b.ticker).map(b => b.ticker),
      ].filter((v, i, a) => v && a.indexOf(v) === i);

      // ── Step 4: AI fact check ─────────────────────────────────────────────
      let factCheckJson = null;
      try {
        toast.info("Running AI fact check…", { duration: 2500 });
        const res = await base44.integrations.Core.InvokeLLM({
          model: "claude_sonnet_4_6",
          prompt: `Fact-check this financial report. Return ONLY valid JSON with no markdown:
{"claims":[{"text":"...","type":"Fact|Opinion|Misleading|Unverified","note":"...","confidence":"high|medium|low"}]}
Report:"""${fullText.slice(0, 3000)}"""`,
        });
        const raw = typeof res === "string" ? res : (res?.content?.[0]?.text || res?.text || "");
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) factCheckJson = match[0];
      } catch (e) { console.warn("Fact check skipped:", e); }

      // ── Step 5: Write report record ───────────────────────────────────────
      const created = await base44.entities.Report.create({
        title,
        content_blocks:           JSON.stringify(frozenBlocks),
        tickers:                  tickers.join(","),
        excerpt:                  autoExcerpt,
        fact_check_results:       factCheckJson,
        industry:                 industry || null,
        market_cap:               marketCap || null,
        prediction_action:        predictionData?.action       || null,
        prediction_ticker:        predictionData?.ticker       || null,
        prediction_target_price:  predictionData?.targetPrice  || null,
        prediction_lock_price:    lockPrice,                                 // ← snapshot AT publish
        prediction_lock_time:     lockTime,                                  // ← snapshot AT publish
        prediction_lock_source:   lockSource,                                // ← which data provider
        prediction_timeframe:     predictionData?.timeframe    || null,
        prediction_stop_loss:     predictionData?.stopLoss     || null,
        prediction_portfolio_pct: predictionData?.portfolioPct || null,
        is_premium:    isPremium,
        price:         isPremium ? parseFloat(reportPrice) : null,
        status:        "published",
        author_name:   currentUser?.full_name || currentUser?.email?.split("@")[0] || "Analyst",
        author_avatar: currentUser?.picture   || null,
        author_accuracy: currentUser?.accuracy_score || 0,
        likes: 0,
      });

      // ── Step 6: Deduct AI credits from wallet ─────────────────────────────
      await spendAICredits(PUBLISH_COST, `Publish: ${title.slice(0, 50)}`).catch(e =>
        console.warn("Credit deduction failed (non-fatal):", e)
      );

      toast.success(lockPrice
        ? `Published · Locked $${predictionData.ticker} @ $${lockPrice.toFixed(2)}`
        : "Report published!"
      );
      setTimeout(() => navigate(`/report?id=${created.id}`), 1000);
    } catch (err) {
      toast.error("Failed to publish: " + (err?.message || "Unknown error"));
    } finally {
      setPublishing(false);
    }
  };

  const themeObj = REPORT_THEMES.find(t => t.id === reportTheme) || REPORT_THEMES[0];
  const fontObj = REPORT_FONTS.find(f => f.id === reportFont) || REPORT_FONTS[0];

  const layoutMaxWidth = reportLayout === "compact" ? "560px" : reportLayout === "wide" ? "100%" : "680px";

  // ── Render a single block row (with drop zones) ───────────────────────────
  const renderBlockRow = (block, blockIdx) => (
    <React.Fragment key={block.id}>
      {/* Drop zone above each block */}
      <div
        className="relative"
        onDragOver={(e) => handleDragOver(e, blockIdx)}
        onDragLeave={() => setDropIndicatorAt(null)}
        onDrop={(e) => handleDrop(e, blockIdx)}
      >
        {dropIndicatorAt === blockIdx && (
          <div className="h-0.5 bg-primary rounded mx-2 my-1 animate-pulse" />
        )}
      </div>

      {block.type === "stockchart" ? (
        <StockChartBlock
          block={block}
          onChange={(u) => updateBlock(block.id, u)}
          onDelete={() => deleteBlock(block.id)}
        />
      ) : block.type === "image" ? (
        <ImageBlock
          block={block}
          onChange={(u) => updateBlock(block.id, u)}
          onDelete={() => deleteBlock(block.id)}
        />
      ) : block.type === "columns" ? (
        <ColumnsBlock
          block={block}
          onDelete={() => deleteBlock(block.id)}
          updateBlock={updateBlock}
          insertBlockAfter={insertBlockAfter}
          duplicateBlock={duplicateBlock}
          moveBlock={moveBlock}
          turnIntoBlock={turnIntoBlock}
        />
      ) : block.type === "metrics" ? (
        <MetricsBlock
          block={block}
          onChange={(u) => updateBlock(block.id, u)}
          onDelete={() => deleteBlock(block.id)}
        />
      ) : block.type === "thesis" ? (
        <ThesisBlock
          block={block}
          onChange={(u) => updateBlock(block.id, u)}
          onDelete={() => deleteBlock(block.id)}
        />
      ) : (
        <EditorBlock
          block={block}
          onChange={(u) => updateBlock(block.id, u)}
          onDelete={() => deleteBlock(block.id)}
          onEnter={() => insertBlockAfter(block.id, "text")}
          onInsertAfter={insertBlockAfter}
          onDuplicate={duplicateBlock}
          onMoveUp={(id) => moveBlock(id, -1)}
          onMoveDown={(id) => moveBlock(id, 1)}
          onTurnInto={turnIntoBlock}
          dropIndicator={dropIndicatorAt === blockIdx}
        />
      )}
    </React.Fragment>
  );

  // ─── Layout ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      {/* Floating rich text toolbar */}
      <FloatingToolbar />

      {/* ── Top Toolbar ── */}
      <div className="sticky top-14 z-20 bg-card/95 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-11 flex items-center gap-1.5">
          {/* Mode toggle */}
          <div className="flex items-center gap-0.5 bg-secondary rounded-lg p-0.5 mr-1">
            <button
              onClick={() => setEditorMode("deep")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${editorMode === "deep" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <FileText className="w-3 h-3" />Deep Report
            </button>
            <button
              onClick={() => setEditorMode("quick")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${editorMode === "quick" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Zap className="w-3 h-3" />Quick Post
            </button>
          </div>

          {editorMode === "deep" && (
            <>
              {/* Panel tabs */}
              <div className="flex items-center gap-0.5 bg-secondary rounded-lg p-0.5">
                {[
                  { id: "write",    label: "Write",    icon: FileText },
                  { id: "design",   label: "Design",   icon: Palette },
                  { id: "settings", label: "Settings", icon: Settings2 },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActivePanel(id)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
                      activePanel === id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />{label}
                  </button>
                ))}
              </div>

              <span className={`text-[11px] ml-3 hidden md:flex items-center gap-1 ${saveStatus === "saved" ? "text-gain" : "text-amber-500"}`}>
                {saveStatus === "saved" ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                {saveStatus === "saved" ? "Saved" : "Unsaved"}
              </span>

              <div className="flex items-center gap-1 ml-auto">
                {/* Undo/Redo */}
                <Button variant="ghost" size="sm" onClick={undo} disabled={!canUndo} className="h-8 w-8 p-0 text-muted-foreground" title="Undo (Cmd+Z)"><Undo2 className="w-3.5 h-3.5" /></Button>
                <Button variant="ghost" size="sm" onClick={redo} disabled={!canRedo} className="h-8 w-8 p-0 text-muted-foreground" title="Redo (Cmd+Shift+Z)"><Redo2 className="w-3.5 h-3.5" /></Button>

                <Button variant="ghost" size="sm" onClick={() => setShowTemplates(true)} className="text-xs text-muted-foreground hidden sm:flex h-8 gap-1.5 hover:text-foreground">
                  <Layout className="w-3.5 h-3.5" />Templates
                </Button>
                <Button variant="ghost" size="sm" onClick={addDYOR} className="text-xs text-muted-foreground hidden sm:flex h-8 gap-1">
                  <FileText className="w-3 h-3" />DYOR
                </Button>

                {/* Drafts */}
                <DropdownMenu open={showDrafts} onOpenChange={setShowDrafts}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="text-xs h-8 gap-1 relative">
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Drafts</span>
                      {drafts.length > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                          {drafts.length}
                        </span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-72">
                    <DropdownMenuLabel className="text-xs">Saved Drafts</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {drafts.length === 0 ? (
                      <div className="px-3 py-4 text-center text-xs text-muted-foreground">No drafts saved yet.</div>
                    ) : (
                      drafts.map(d => (
                        <div key={d.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-secondary rounded-md mx-1">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{d.title}</p>
                            <p className="text-[10px] text-muted-foreground">{new Date(d.savedAt).toLocaleString()}</p>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => loadDraft(d)} className="text-xs h-6 px-2">Load</Button>
                          <button onClick={() => deleteDraft(d.id)} className="text-muted-foreground hover:text-loss p-0.5"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      ))
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  variant={isRTL ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsRTL(r => !r)}
                  className="text-xs h-8 gap-1"
                  title="Toggle RTL writing (Hebrew / Arabic)"
                >
                  <Languages className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">RTL</span>
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowAI(true)} className="text-xs h-8 gap-1 border-primary/30 text-primary hover:bg-primary/5">
                  <Sparkles className="w-3.5 h-3.5" /><span className="hidden sm:inline">AI</span>
                </Button>
              </div>
            </>
          )}

          {editorMode === "quick" && (
            <div className="ml-auto">
              <span className="text-xs text-muted-foreground">Quick takes publish instantly to the feed</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="max-w-6xl mx-auto px-4 py-4">
        {editorMode === "quick" ? (
          <QuickPostEditor quickImage={quickImage} setQuickImage={setQuickImage}
            quickShowPrediction={quickShowPrediction} setQuickShowPrediction={setQuickShowPrediction}
            quickAction={quickAction} setQuickAction={setQuickAction}
            quickTicker={quickTicker} setQuickTicker={setQuickTicker}
            quickTimeframe={quickTimeframe} setQuickTimeframe={setQuickTimeframe}
            quickTarget={quickTarget} setQuickTarget={setQuickTarget}
            title={title} setTitle={setTitle} />
        ) : activePanel === "design" ? (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
            {/* Live preview */}
            <div>
              <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1.5">
                <Eye className="w-3 h-3" /> Live preview — changes apply instantly
              </p>
              <div
                style={{
                  fontFamily: fontObj?.style?.fontFamily,
                  background: themeObj?.bg,
                  color: themeObj?.text,
                  borderRadius: "1rem",
                  padding: "2rem",
                  boxShadow: "0 0 0 1px " + (themeObj?.border || "#e2e8f0"),
                  maxWidth: layoutMaxWidth,
                  minHeight: "320px",
                }}
              >
                {(brandName || brandLogo) && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, paddingBottom: 12, borderBottom: `1px solid ${themeObj?.border}` }}>
                    {brandLogo && <img src={brandLogo} alt="" style={{ height: 20, objectFit: "contain" }} onError={e => e.currentTarget.style.display = "none"} />}
                    {brandName && <span style={{ fontSize: 9, fontWeight: 700, color: themeObj?.text, opacity: 0.5, letterSpacing: "0.1em", textTransform: "uppercase" }}>{brandName}</span>}
                  </div>
                )}
                <h2 style={{ color: accentColor }} className="text-2xl font-bold mb-2">{title || "Your Report Title"}</h2>
                {excerpt && <p className="text-sm opacity-70 mb-4">{excerpt}</p>}
                <div className="space-y-3">
                  {blocks.slice(0, 5).filter(b => b.content || b.type === "divider").map((b, i) => (
                    <div key={i}>
                      {b.type === "heading" && <h3 style={{ color: accentColor }} className="text-xl font-bold">{b.content}</h3>}
                      {b.type === "heading2" && <h4 style={{ color: accentColor }} className="text-lg font-semibold">{b.content}</h4>}
                      {b.type === "text" && <p className="text-sm leading-relaxed">{b.content?.slice(0, 200)}{b.content?.length > 200 ? "..." : ""}</p>}
                      {b.type === "bullets" && <ul className="list-disc list-inside text-sm space-y-1">{(b.content || "").split("\n").slice(0, 3).map((l, j) => <li key={j}>{l.replace(/^[•\-]\s*/, "")}</li>)}</ul>}
                      {b.type === "quote" && <blockquote style={{ borderLeftColor: accentColor }} className="border-l-4 pl-3 italic text-sm opacity-80">{b.content}</blockquote>}
                      {b.type === "callout" && <div className="border-l-4 rounded-r p-2 text-sm" style={{ background: accentColor + "18", borderLeftColor: accentColor }}>{b.content}</div>}
                      {b.type === "divider" && <hr style={{ borderColor: accentColor }} className="border-t-2 opacity-30" />}
                    </div>
                  ))}
                  {blocks.every(b => !b.content && b.type !== "divider") && <p className="text-sm opacity-40 italic">Write some content to see the preview here.</p>}
                </div>
              </div>
            </div>
            <div>
              <DesignPanel
                theme={reportTheme}
                font={reportFont}
                layout={reportLayout}
                accentColor={accentColor}
                onThemeChange={setReportTheme}
                onFontChange={setReportFont}
                onLayoutChange={setReportLayout}
                onAccentColorChange={setAccentColor}
                brandName={brandName}
                brandLogo={brandLogo}
                reportFooter={reportFooter}
                onBrandNameChange={setBrandName}
                onBrandLogoChange={setBrandLogo}
                onReportFooterChange={setReportFooter}
              />
            </div>
          </div>
        ) : activePanel === "write" ? (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
            {/* ── Editor canvas ── */}
            <div
              style={{
                fontFamily: fontObj?.style?.fontFamily,
                background: reportTheme !== "default" ? themeObj?.bg : undefined,
                color: reportTheme !== "default" ? themeObj?.text : undefined,
                borderRadius: reportTheme !== "default" ? "1rem" : undefined,
                padding: reportTheme !== "default" ? "2rem" : undefined,
                boxShadow: reportTheme !== "default" ? "0 0 0 1px " + themeObj?.border : undefined,
                maxWidth: layoutMaxWidth,
              }}
              onDragOver={(e) => handleDragOver(e, blocks.length)}
              onDrop={(e) => handleDrop(e, blocks.length)}
            >
              {/* Cover image */}
              {coverImage ? (
                <div className="relative mb-6 rounded-2xl overflow-hidden aspect-[3/1] bg-secondary group">
                  <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setCoverImage("")}
                    className="absolute top-2 right-2 bg-black/50 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer hover:text-foreground mb-4 w-fit transition-colors">
                  <ImageIcon className="w-3.5 h-3.5" />
                  {uploadingCover ? "Uploading..." : "Add cover image"}
                  <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} disabled={uploadingCover} />
                </label>
              )}

              {/* Brand header */}
              {(brandName || brandLogo) && (
                <div className="flex items-center gap-2 mb-5 pb-4 border-b border-border" dir="ltr">
                  {brandLogo && <img src={brandLogo} alt={brandName} className="h-7 object-contain" onError={e => e.currentTarget.style.display = "none"} />}
                  {brandName && <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{brandName}</span>}
                </div>
              )}

              {/* Title */}
              <textarea
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Report title..."
                rows={1}
                dir={isRTL ? "rtl" : "ltr"}
                className="w-full text-3xl md:text-4xl font-bold text-foreground bg-transparent border-none outline-none resize-none placeholder:text-muted-foreground/30 mb-3 leading-tight overflow-hidden"
                style={{ fontFamily: fontObj?.style?.fontFamily, color: accentColor !== "#1d4ed8" ? accentColor : undefined }}
                onInput={e => { e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }}
              />

              {/* Excerpt */}
              <textarea
                value={excerpt}
                onChange={e => setExcerpt(e.target.value)}
                placeholder="Write a short summary or teaser..."
                rows={2}
                dir={isRTL ? "rtl" : "ltr"}
                className="w-full text-base text-muted-foreground bg-transparent border-none outline-none resize-none placeholder:text-muted-foreground/30 mb-6 leading-relaxed"
                onInput={e => { e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }}
              />

              <div className="border-b border-border mb-6" />

              {/* Tags */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {tags.map(tag => (
                    <span key={tag} className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">
                      <Hash className="w-2.5 h-2.5" />{tag}
                      <button onClick={() => setTags(prev => prev.filter(t => t !== tag))}><X className="w-2.5 h-2.5" /></button>
                    </span>
                  ))}
                </div>
              )}

              {/* Blocks — drag-to-reorder */}
              <DragDropContext onDragEnd={handleBlockDragEnd}>
                <Droppable droppableId="editor-blocks">
                  {(droppableProvided, droppableSnapshot) => (
                    <div
                      ref={droppableProvided.innerRef}
                      {...droppableProvided.droppableProps}
                      className={`space-y-0.5 mb-4 transition-colors rounded-xl ${droppableSnapshot.isDraggingOver ? "bg-primary/3" : ""}`}
                      dir={isRTL ? "rtl" : "ltr"}
                    >
                      {blocks.map((block, idx) => (
                        <Draggable key={String(block.id)} draggableId={String(block.id)} index={idx}>
                          {(dragProvided, dragSnapshot) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              className={`relative group/draggable ${dragSnapshot.isDragging ? "opacity-80 shadow-xl rounded-xl bg-card ring-2 ring-primary/20 z-20" : ""}`}
                            >
                              {/* Drop zone for AI content */}
                              <div
                                className="absolute top-0 left-0 right-0 h-2 -translate-y-1 z-10"
                                onDragOver={(e) => handleDragOver(e, idx)}
                                onDragLeave={() => setDropIndicatorAt(null)}
                                onDrop={(e) => handleDrop(e, idx)}
                              >
                                {dropIndicatorAt === idx && (
                                  <div className="h-0.5 bg-primary rounded mx-2 animate-pulse" />
                                )}
                              </div>

                              <div className="flex items-start gap-1">
                                {/* Drag handle */}
                                <div
                                  {...dragProvided.dragHandleProps}
                                  className="flex-shrink-0 mt-2 w-5 flex flex-col items-center gap-0.5 opacity-0 group-hover/draggable:opacity-100 transition-opacity"
                                  title="Drag to reorder"
                                >
                                  <GripVertical className="w-4 h-4 text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing" />
                                </div>

                                {/* Block content — alignment applied here */}
                                <div className="flex-1 min-w-0" style={(() => {
                                  const align = block.blockAlign;
                                  if (!align || align === "full") return {};
                                  if (align === "center") return { maxWidth: "65%", margin: "0 auto" };
                                  if (align === "left")   return { maxWidth: "55%", marginRight: "auto", marginLeft: 0 };
                                  if (align === "right")  return { maxWidth: "55%", marginLeft: "auto", marginRight: 0 };
                                  return {};
                                })()}>
                                  {renderBlockRow(block, idx)}
                                </div>

                                {/* Block alignment toggle — appears on hover */}
                                <div className="flex-shrink-0 flex flex-col gap-0.5 pt-2 opacity-0 group-hover/draggable:opacity-100 transition-opacity">
                                  {[
                                    { key: "full",   label: "⬛", title: "Full width" },
                                    { key: "left",   label: "◧",  title: "Align left (55%)" },
                                    { key: "center", label: "▣",  title: "Center (65%)" },
                                    { key: "right",  label: "◨",  title: "Align right (55%)" },
                                  ].map(({ key, label, title }) => (
                                    <button
                                      key={key}
                                      onClick={() => updateBlock(block.id, { blockAlign: key === "full" ? undefined : key })}
                                      title={title}
                                      className={`text-[9px] font-mono px-1 py-0.5 rounded border transition-colors ${(block.blockAlign || "full") === key ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}
                                    >
                                      {label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {droppableProvided.placeholder}
                      {/* Final AI drop zone */}
                      <div
                        className="h-6"
                        onDragOver={(e) => handleDragOver(e, blocks.length)}
                        onDragLeave={() => setDropIndicatorAt(null)}
                        onDrop={(e) => handleDrop(e, blocks.length)}
                      >
                        {dropIndicatorAt === blocks.length && (
                          <div className="h-0.5 bg-primary rounded mx-2 animate-pulse" />
                        )}
                      </div>
                    </div>
                  )}
                </Droppable>
              </DragDropContext>

              {/* Add block */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground border border-dashed border-border hover:border-primary/40 rounded-xl px-4 py-2 w-full transition-colors group mb-4">
                    <Plus className="w-4 h-4 group-hover:text-primary transition-colors" />
                    <span>Add a block</span>
                    <span className="ml-auto text-[10px] opacity-50">Type / in editor</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-52">
                  <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">Content Blocks</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {BLOCK_TYPES.map((bt, i) => {
                    const Icon = bt.icon;
                    return (
                      <React.Fragment key={bt.type}>
                        {i === 7 && <DropdownMenuSeparator />}
                        <DropdownMenuItem onClick={() => addBlock(bt.type)} className="cursor-pointer">
                          <Icon className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                          {bt.label}
                          <span className="ml-auto text-[10px] text-muted-foreground font-mono">{bt.shortcut}</span>
                        </DropdownMenuItem>
                      </React.Fragment>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Prediction */}
              <div className="mb-6">
                <button
                  onClick={() => setShowPrediction(p => !p)}
                  className={`flex items-center gap-2 text-xs px-4 py-2.5 rounded-xl border-2 font-medium transition-all mb-1 ${
                    showPrediction
                      ? "bg-primary/5 border-primary/30 text-primary"
                      : "border-dashed border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  {showPrediction ? "✓ Prediction added" : "+ Add Locked Prediction"}
                  <span className="ml-1 text-[10px] font-normal opacity-60">— builds your track record</span>
                </button>
                {showPrediction && (
                  <div className="mt-3">
                    <PredictionBlock initialData={predictionData} onChange={setPredictionData} />
                  </div>
                )}
              </div>
            </div>

            {/* ── Sidebar ── */}
            <div className="space-y-3">
              {/* Publish card */}
              <div className="bg-card border border-border rounded-xl p-3">
                <h3 className="text-xs font-semibold mb-2 flex items-center gap-2">
                  <Send className="w-3 h-3 text-primary" /> Publish
                </h3>
                <div className="space-y-2">
                  <Button onClick={handlePublish} disabled={publishing} className="w-full gap-1.5">
                    <Send className="w-3.5 h-3.5" />{publishing ? "Publishing..." : "Publish Report"}
                  </Button>
                  <Button variant="outline" onClick={() => persistDraft()} className="w-full gap-1.5 text-xs">
                    <Save className="w-3.5 h-3.5" />Save as Draft
                  </Button>
                </div>
              </div>

              {/* Quality Score */}
              <ReportQualityScore
                title={title}
                blocks={blocks}
                predictionData={predictionData}
                coverImage={coverImage}
              />

              {/* Stats */}
              <div className="bg-secondary/50 border border-border rounded-xl p-3">
                <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Stats</h3>
                <div className="space-y-1.5">
                  {[
                    { label: "Words", value: <span className={wordCountColor}>{wordCount}</span> },
                    { label: "Reading time", value: `${readingTime} min` },
                    { label: "Blocks", value: blocks.length },
                    { label: "Has prediction", value: predictionData ? "Yes ✓" : "No" },
                    { label: "Monetization", value: isPremium ? `$${reportPrice}` : "Free" },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-medium text-foreground">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tips */}
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
                <h3 className="text-xs font-semibold text-primary mb-1.5 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Tips
                </h3>
                <ul className="space-y-1 text-[10px] text-muted-foreground">
                  <li>✦ Type <code className="bg-secondary px-1 rounded">/</code> anywhere to insert a block</li>
                  <li>✦ Select text for rich formatting toolbar</li>
                  <li>✦ Cmd+Z / Cmd+Shift+Z to undo/redo</li>
                  <li>✦ 600+ words ranks higher in the feed</li>
                  <li>✦ Save chart as image for published reports</li>
                </ul>
              </div>
            </div>
          </div>
        ) : activePanel === "settings" ? (
          <EditorSettingsPanel
            coverImage={coverImage}
            onCoverImageChange={setCoverImage}
            isPremium={isPremium}
            setIsPremium={setIsPremium}
            reportPrice={reportPrice}
            setReportPrice={setReportPrice}
            industry={industry}
            setIndustry={setIndustry}
            marketCap={marketCap}
            setMarketCap={setMarketCap}
            tags={tags}
            setTags={setTags}
            tagInput={tagInput}
            setTagInput={setTagInput}
            addTag={addTag}
            onDeleteAll={() => {
              setTitle("");
              setExcerpt("");
              setBlocks([makeBlock("text")]);
              setPredictionData(null);
              setTags([]);
              setCoverImage("");
              toast.success("All content cleared");
            }}
          />
        ) : null}
      </div>

      {showTemplates && (
        <TemplatesPanel onSelectTemplate={handleTemplateSelect} onClose={() => setShowTemplates(false)} />
      )}

      <AISidebar isOpen={showAI} onClose={() => setShowAI(false)} onGenerate={handleAIGenerate} initialTicker={urlTicker} />
      <AIChat
        reportContent={[title, ...blocks.map(b => b.content || "")].filter(Boolean).join("\n\n")}
        onInsertBlock={(text, type = "text") => {
          const nb = makeBlock(type, text);
          setBlocks(prev => { const next = [...prev, nb]; pushHistory(next); return next; });
          toast.success("Block added to report!");
        }}
      />
    </div>
  );
}