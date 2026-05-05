import React, { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sparkles, Plus, Type, List, BarChart3, ImageIcon, Quote,
  Send, Save, FolderOpen, Trash2, Clock, CheckCircle2,
  ChevronDown
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import EditorBlock from "@/components/editor/EditorBlock";
import StockChartBlock from "@/components/editor/StockChartBlock";
import ImageBlock from "@/components/editor/ImageBlock";
import PredictionBlock from "@/components/editor/PredictionBlock";
import AISidebar from "@/components/editor/AISidebar";
import MonetizationPanel from "@/components/editor/MonetizationPanel";
import BoostPanel from "@/components/editor/BoostPanel";
import AIChat from "@/components/editor/AIChat";

// ─── Constants ───────────────────────────────────────────────────────────────
const DYOR_TEXT =
  "⚠️ Disclaimer: This report is for informational purposes only and does not constitute financial advice. Always do your own research (DYOR) before making any investment decisions.";

const BLOCK_TYPES = [
  { type: "heading",    label: "Heading",     icon: Type      },
  { type: "text",       label: "Text",        icon: Type      },
  { type: "bullets",   label: "Bullet List", icon: List      },
  { type: "quote",     label: "Quote",       icon: Quote     },
  { type: "stockchart",label: "Stock Chart", icon: BarChart3 },
  { type: "image",     label: "Image",       icon: ImageIcon },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
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
  };
};

const sanitizeBlocks = (arr) => {
  if (!Array.isArray(arr)) return [makeBlock("text")];
  const clean = arr.map(sanitizeBlock).filter(Boolean);
  return clean.length > 0 ? clean : [makeBlock("text")];
};

// ─── Component ───────────────────────────────────────────────────────────────
export default function ReportEditor() {
  const navigate = useNavigate();

  const [title,          setTitle]          = useState("");
  const [blocks,         setBlocks]         = useState([makeBlock("text")]);
  const [predictionData, setPredictionData] = useState(null);
  const [isPremium,      setIsPremium]      = useState(false);
  const [reportPrice,    setReportPrice]    = useState("4.99");
  const [showPrediction, setShowPrediction] = useState(false);
  const [showAI,         setShowAI]         = useState(false);
  const [showDrafts,     setShowDrafts]     = useState(false);
  const [publishing,     setPublishing]     = useState(false);
  const [lastSaved,      setLastSaved]      = useState(null);
  const [drafts,         setDrafts]         = useState(() => {
    try { return JSON.parse(localStorage.getItem("stoa_drafts") || "[]"); } catch { return []; }
  });

  const wordCount = useMemo(() => {
    return blocks
      .filter(b => ["text", "heading", "bullets", "quote"].includes(b.type))
      .reduce((n, b) => n + (b.content || "").trim().split(/\s+/).filter(Boolean).length, 0);
  }, [blocks]);

  const readingTime = Math.max(1, Math.ceil(wordCount / 200));
  const saveStatus  = lastSaved && Date.now() - lastSaved < 60_000 ? "saved" : "unsaved";

  // Auto-save every 30 seconds
  useEffect(() => {
    const hasContent = title.trim() || blocks.some(b => b.content?.trim());
    if (!hasContent) return;
    const t = setTimeout(() => persistDraft(title, blocks, predictionData, true), 30_000);
    return () => clearTimeout(t);
  }, [title, blocks, predictionData]);

  // ── Block operations ──
  const updateBlock = useCallback((id, updatedBlock) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, ...updatedBlock, id: b.id } : b));
  }, []);

  const deleteBlock = useCallback((id) => {
    setBlocks(prev => {
      const next = prev.filter(b => b.id !== id);
      return next.length > 0 ? next : [makeBlock("text")];
    });
  }, []);

  const insertBlockAfter = useCallback((id, type = "text") => {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === id);
      const next = [...prev];
      next.splice(idx + 1, 0, makeBlock(type));
      return next;
    });
  }, []);

  const addBlock    = useCallback((type) => setBlocks(prev => [...prev, makeBlock(type)]), []);
  const addDYOR     = useCallback(() => { setBlocks(prev => [...prev, makeBlock("text", DYOR_TEXT)]); toast.success("DYOR disclaimer added"); }, []);

  // ── Draft operations ──
  const persistDraft = (t, b, pred, silent = false) => {
    const cleanBlocks = sanitizeBlocks(b);
    const draft = { id: Date.now(), title: t || "Untitled Draft", blocks: cleanBlocks, predictionData: pred || null, savedAt: new Date().toISOString() };
    const updated = [draft, ...drafts.slice(0, 9)];
    setDrafts(updated);
    localStorage.setItem("stoa_drafts", JSON.stringify(updated));
    setLastSaved(Date.now());
    if (!silent) toast.success("Draft saved!");
  };

  const saveDraft = () => {
    if (!title.trim() && blocks.every(b => !b.content?.trim())) { toast.error("Nothing to save."); return; }
    persistDraft(title, blocks, predictionData);
  };

  const loadDraft = (draft) => {
    setTitle(draft.title || "");
    setBlocks(sanitizeBlocks(draft.blocks));
    setPredictionData(draft.predictionData || null);
    setShowDrafts(false);
    toast.success("Draft loaded!");
  };

  const deleteDraft = (id) => {
    const updated = drafts.filter(d => d.id !== id);
    setDrafts(updated);
    localStorage.setItem("stoa_drafts", JSON.stringify(updated));
  };

  // ── AI template ──
  const handleAIGenerate = useCallback((template) => {
    setBlocks(sanitizeBlocks(template.map(b => makeBlock(b.type || "text", b.content || ""))));
    toast.success("Template loaded! All blocks are editable.");
  }, []);

  // ── Publish ──
  const handlePublish = async () => {
    if (!title.trim()) { toast.error("Please add a title before publishing."); return; }

    const validBlocks = sanitizeBlocks(blocks);
    if (validBlocks.every(b => !b.content?.trim() && b.type !== "stockchart" && b.type !== "image")) {
      toast.error("Please write some content before publishing.");
      return;
    }

    setPublishing(true);
    try {
      const currentUser = await base44.auth.me();
      if (!currentUser) throw new Error("Not logged in.");

      const fullText = [title, ...validBlocks.map(b => b.content || "")].filter(Boolean).join("\n\n");

      // Extract tickers from text + chart blocks
      const tickers = [
        ...validBlocks.flatMap(b => (b.content || "").match(/\$([A-Z]{2,5})/g) || []).map(t => t.replace("$", "")),
        ...validBlocks.filter(b => b.type === "stockchart" && b.ticker).map(b => b.ticker),
      ].filter((v, i, a) => v && a.indexOf(v) === i);

      const excerpt = validBlocks.find(b => b.type === "text" && b.content?.trim())?.content?.slice(0, 200) || "";

      // Fact check (non-blocking)
      let factCheckJson = null;
      try {
        toast.info("Running AI fact check...", { duration: 2500 });
        const res = await base44.integrations.Core.InvokeLLM({
          model: "claude_sonnet_4_6",
          prompt: `Fact-check this financial report. Return ONLY valid JSON with no markdown:
{"claims":[{"text":"...","type":"Fact|Opinion|Misleading|Unverified","note":"...","confidence":"high|medium|low"}]}
Report:"""${fullText.slice(0, 3000)}"""`,
        });
        const raw = typeof res === "string" ? res : (res?.content?.[0]?.text || res?.text || "");
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) factCheckJson = match[0];
      } catch (e) {
        console.warn("Fact check skipped:", e);
      }

      // content_blocks stored as JSON string (Long Text field)
      const created = await base44.entities.Report.create({
        title,
        content_blocks:           JSON.stringify(validBlocks),
        tickers:                  tickers.join(","),
        excerpt,
        fact_check_results:       factCheckJson,
        prediction_action:        predictionData?.action       || null,
        prediction_ticker:        predictionData?.ticker       || null,
        prediction_target_price:  predictionData?.targetPrice  || null,
        prediction_lock_price:    predictionData?.lockPrice    || null,
        prediction_lock_time:     predictionData?.lockTime     || null,
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

      toast.success("Report published!");
      setTimeout(() => navigate(`/report?id=${created.id}`), 1000);
    } catch (err) {
      toast.error("Failed to publish: " + (err?.message || "Unknown error"));
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">

      {/* Top bar */}
      <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
        <div>
          <h1 className="text-lg font-bold">Write Report</h1>
          <p className="text-xs text-muted-foreground">Create data-driven research for your followers</p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button variant="ghost" size="sm" onClick={addDYOR} className="text-xs text-muted-foreground hidden sm:flex">DYOR</Button>
          <Button variant="outline" size="sm" onClick={() => setShowDrafts(v => !v)} className="text-xs relative">
            <FolderOpen className="w-3.5 h-3.5 mr-1" />Drafts
            {drafts.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-white text-[8px] font-bold rounded-full flex items-center justify-center">{drafts.length}</span>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={saveDraft} className="text-xs">
            <Save className="w-3.5 h-3.5 mr-1" />Save Draft
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowAI(true)} className="text-xs border-primary/30 text-primary hover:bg-primary/5">
            <Sparkles className="w-3.5 h-3.5 mr-1" />AI Assist
          </Button>
          <Button size="sm" onClick={handlePublish} disabled={publishing} className="text-xs">
            <Send className="w-3.5 h-3.5 mr-1" />{publishing ? "Publishing..." : "Publish"}
          </Button>
        </div>
      </div>

      {/* Drafts panel */}
      {showDrafts && (
        <div className="bg-card border border-border rounded-xl p-4 mb-4">
          <h3 className="font-semibold text-sm mb-3">Saved Drafts</h3>
          {drafts.length === 0 ? (
            <p className="text-xs text-muted-foreground">No drafts saved yet.</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {drafts.map(d => (
                <div key={d.id} className="flex items-center gap-2 p-2 bg-secondary rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{d.title}</p>
                    <p className="text-xs text-muted-foreground">{new Date(d.savedAt).toLocaleString()}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => loadDraft(d)} className="text-xs h-7">Load</Button>
                  <button onClick={() => deleteDraft(d.id)} className="text-muted-foreground hover:text-red-500 p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Title */}
      <Input
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Report title..."
        className="text-2xl font-bold border-none bg-transparent px-0 h-auto py-2 placeholder:text-muted-foreground/30 focus-visible:ring-0 mb-4"
        style={{ fontSize: "1.5rem" }}
      />

      {/* Status bar */}
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground border-b border-border pb-2 mb-4">
        <span>{wordCount} words</span>
        <span>·</span>
        <span>{readingTime} min read</span>
        <span>·</span>
        <span className={`flex items-center gap-1 ${saveStatus === "saved" ? "text-green-600" : "text-amber-500"}`}>
          {saveStatus === "saved"
            ? <><CheckCircle2 className="w-3 h-3" />Saved</>
            : <><Clock className="w-3 h-3" />Not saved yet</>}
        </span>
      </div>

      {/* Blocks */}
      <div className="space-y-1 mb-4">
        {blocks.map((block) => {
          if (!block || typeof block !== "object" || !block.type) return null;

          if (block.type === "stockchart") return (
            <StockChartBlock
              key={block.id}
              block={block}
              onChange={(updated) => updateBlock(block.id, updated)}
              onDelete={() => deleteBlock(block.id)}
            />
          );

          if (block.type === "image") return (
            <ImageBlock
              key={block.id}
              block={block}
              onDelete={() => deleteBlock(block.id)}
            />
          );

          return (
            <EditorBlock
              key={block.id}
              block={block}
              onChange={(updated) => updateBlock(block.id, updated)}
              onDelete={() => deleteBlock(block.id)}
              onEnter={() => insertBlockAfter(block.id, "text")}
            />
          );
        })}
      </div>

      {/* Add block */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="text-xs gap-1.5 mb-6">
            <Plus className="w-3.5 h-3.5" />Add Block<ChevronDown className="w-3 h-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {BLOCK_TYPES.map((bt, i) => {
            const Icon = bt.icon;
            return (
              <React.Fragment key={bt.type}>
                {i === 4 && <DropdownMenuSeparator />}
                <DropdownMenuItem onClick={() => addBlock(bt.type)}>
                  <Icon className="w-3.5 h-3.5 mr-2" />{bt.label}
                </DropdownMenuItem>
              </React.Fragment>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Prediction block */}
      <div className="mb-6">
        <button
          onClick={() => setShowPrediction(p => !p)}
          className={`text-xs px-3 py-1.5 rounded-lg border transition-all mb-3 ${showPrediction ? "bg-primary/10 border-primary/30 text-primary" : "border-border text-muted-foreground hover:border-primary/30"}`}
        >
          {showPrediction ? "✓ Prediction added" : "+ Add Prediction"}
        </button>
        <span className="text-xs text-muted-foreground ml-2">Optional — skip for pure analysis</span>
        {showPrediction && (
          <div className="mt-3">
            <PredictionBlock onPublish={(p) => { setPredictionData(p); toast.success(`Prediction locked: ${p.action} $${p.ticker}`); }} />
          </div>
        )}
      </div>

      {/* Monetization & Boost */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <MonetizationPanel
          isPremium={isPremium}
          price={reportPrice}
          onIsPremiumChange={setIsPremium}
          onPriceChange={setReportPrice}
        />
        <BoostPanel />
      </div>

      <AISidebar isOpen={showAI} onClose={() => setShowAI(false)} onGenerate={handleAIGenerate} />
      <AIChat
        reportContent={[title, ...blocks.map(b => b.content || "")].filter(Boolean).join("\n\n")}
        onInsertBlock={(text) => {
          addBlock("text");
          setBlocks(prev => { const n = [...prev]; n[n.length - 1] = { ...n[n.length - 1], content: text }; return n; });
          toast.success("Block inserted from AI!");
        }}
      />
    </div>
  );
}