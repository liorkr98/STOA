import React, { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sparkles, Plus, Type, List, BarChart3, ImageIcon, Quote,
  Send, Save, FolderOpen, Trash2, Clock, CheckCircle2,
  ChevronDown, Settings2, TrendingUp, Lock,
  Hash, FileText, Zap, AlignLeft, Palette, X, Layout, Eye
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import DraggableBlockList from "@/components/editor/DraggableBlockList.jsx";
import PredictionBlock from "@/components/editor/PredictionBlock";
import AISidebar from "@/components/editor/AISidebar";
import AIChat from "@/components/editor/AIChat";
import EditorSettingsPanel from "@/components/editor/EditorSettingsPanel";
import BoostPanel from "@/components/editor/BoostPanel";
import TemplatesPanel from "@/components/editor/TemplatesPanel";
import DesignPanel, { REPORT_THEMES, REPORT_FONTS } from "@/components/editor/DesignPanel";

// ─── Constants ─────────────────────────────────────────────────────────────
const DYOR_TEXT =
  "⚠️ Disclaimer: This report is for informational purposes only and does not constitute financial advice. Always do your own research (DYOR) before making any investment decisions.";

const BLOCK_TYPES = [
  { type: "heading",    label: "Heading",     icon: Type,      shortcut: "H" },
  { type: "text",       label: "Paragraph",   icon: AlignLeft, shortcut: "P" },
  { type: "bullets",   label: "Bullet List", icon: List,      shortcut: "B" },
  { type: "quote",     label: "Quote",       icon: Quote,     shortcut: "Q" },
  { type: "stockchart",label: "Stock Chart", icon: BarChart3, shortcut: "C" },
  { type: "image",     label: "Image",       icon: ImageIcon, shortcut: "I" },
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
  };
};

const sanitizeBlocks = (arr) => {
  if (!Array.isArray(arr)) return [makeBlock("text")];
  const clean = arr.map(sanitizeBlock).filter(Boolean);
  return clean.length > 0 ? clean : [makeBlock("text")];
};

// ─── Main Component ────────────────────────────────────────────────────────
export default function ReportEditor() {
  const navigate = useNavigate();
  const urlTicker = new URLSearchParams(window.location.search).get("ticker")?.toUpperCase() || "";

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

  // UI state
  const [showPrediction, setShowPrediction] = useState(false);
  const [showAI,         setShowAI]         = useState(() => !!urlTicker);
  const [showDrafts,     setShowDrafts]     = useState(false);
  const [showTemplates,  setShowTemplates]  = useState(false);
  const [activePanel,    setActivePanel]    = useState("write"); // "write" | "design" | "settings"
  const [publishing,     setPublishing]     = useState(false);
  const [lastSaved,      setLastSaved]      = useState(null);
  const [uploadingCover, setUploadingCover] = useState(false);

  const [drafts, setDrafts] = useState(() => {
    try { return JSON.parse(localStorage.getItem("stoa_drafts") || "[]"); } catch { return []; }
  });

  const wordCount = useMemo(() =>
    blocks
      .filter(b => ["text", "heading", "bullets", "quote"].includes(b.type))
      .reduce((n, b) => n + (b.content || "").trim().split(/\s+/).filter(Boolean).length, 0),
  [blocks]);

  const readingTime = Math.max(1, Math.ceil(wordCount / 200));
  const saveStatus  = lastSaved && Date.now() - lastSaved < 60_000 ? "saved" : "unsaved";

  // Auto-save every 30s
  useEffect(() => {
    const hasContent = title.trim() || blocks.some(b => b.content?.trim());
    if (!hasContent) return;
    const t = setTimeout(() => persistDraft(true), 30_000);
    return () => clearTimeout(t);
  }, [title, blocks, predictionData]);

  // ── Block operations ──────────────────────────────────────────────────────
  const updateBlock = useCallback((id, updated) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, ...updated, id: b.id } : b));
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

  const addBlock = useCallback((type) => setBlocks(prev => [...prev, makeBlock(type)]), []);
  const addDYOR  = useCallback(() => { setBlocks(prev => [...prev, makeBlock("text", DYOR_TEXT)]); toast.success("DYOR disclaimer added"); }, []);

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
    setBlocks(sanitizeBlocks(template.map(b => makeBlock(b.type || "text", b.content || ""))));
    toast.success("Template loaded! All blocks are editable.");
  }, []);

  const handleTemplateSelect = useCallback((templateBlocks) => {
    setBlocks(sanitizeBlocks(templateBlocks.map(b => makeBlock(b.type || "text", b.content || ""))));
    toast.success("Template applied! Start filling it in.");
  }, []);

  // ── Publish ───────────────────────────────────────────────────────────────
  const handlePublish = async () => {
    if (!title.trim()) { toast.error("Please add a title before publishing."); return; }
    const validBlocks = sanitizeBlocks(blocks);
    if (validBlocks.every(b => !b.content?.trim() && b.type !== "stockchart" && b.type !== "image")) {
      toast.error("Please write some content before publishing."); return;
    }

    setPublishing(true);
    try {
      const currentUser = await base44.auth.me();
      if (!currentUser) throw new Error("Not logged in.");

      const fullText = [title, ...validBlocks.map(b => b.content || "")].filter(Boolean).join("\n\n");
      const autoExcerpt = excerpt.trim() ||
        validBlocks.find(b => b.type === "text" && b.content?.trim())?.content?.slice(0, 200) || "";

      const tickers = [
        ...validBlocks.flatMap(b => (b.content || "").match(/\$([A-Z]{2,5})/g) || []).map(t => t.replace("$", "")),
        ...validBlocks.filter(b => b.type === "stockchart" && b.ticker).map(b => b.ticker),
      ].filter((v, i, a) => v && a.indexOf(v) === i);

      // Fact check
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
      } catch (e) { console.warn("Fact check skipped:", e); }

      const created = await base44.entities.Report.create({
        title,
        content_blocks:           JSON.stringify(validBlocks),
        tickers:                  tickers.join(","),
        excerpt:                  autoExcerpt,
        fact_check_results:       factCheckJson,
        industry:                 industry || null,
        market_cap:               marketCap || null,
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

  // ─── Layout ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      {/* ── Top Toolbar ── */}
      <div className="sticky top-14 z-20 bg-card/95 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-12 flex items-center gap-2">
          {/* Left: panel tabs */}
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

          {/* Center: status */}
          <div className="hidden md:flex items-center gap-3 text-[11px] text-muted-foreground ml-2">
            <span className="font-mono">{wordCount} words</span>
            <span>·</span>
            <span>{readingTime} min read</span>
            <span>·</span>
            <span className={`flex items-center gap-1 ${saveStatus === "saved" ? "text-gain" : "text-amber-500"}`}>
              {saveStatus === "saved"
                ? <><CheckCircle2 className="w-3 h-3" />Saved</>
                : <><Clock className="w-3 h-3" />Unsaved</>}
            </span>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-1.5 ml-auto">
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

            <Button variant="outline" size="sm" onClick={() => persistDraft()} className="text-xs h-8 gap-1">
              <Save className="w-3.5 h-3.5" /><span className="hidden sm:inline">Save</span>
            </Button>

            <Button variant="outline" size="sm" onClick={() => setShowAI(true)} className="text-xs h-8 gap-1 border-primary/30 text-primary hover:bg-primary/5">
              <Sparkles className="w-3.5 h-3.5" /><span className="hidden sm:inline">AI</span>
            </Button>

            <Button size="sm" onClick={handlePublish} disabled={publishing} className="text-xs h-8 gap-1.5 px-4">
              <Send className="w-3.5 h-3.5" />{publishing ? "Publishing..." : "Publish"}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {activePanel === "design" ? (
          /* ── Design panel as full main content ── */
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
            {/* Left: Live preview of canvas */}
            <div>
              <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1.5">
                <Eye className="w-3 h-3" /> Live preview — changes apply instantly
              </p>
              <div
                style={{
                  fontFamily: REPORT_FONTS.find(f => f.id === reportFont)?.style?.fontFamily,
                  background: REPORT_THEMES.find(t => t.id === reportTheme)?.bg,
                  color: REPORT_THEMES.find(t => t.id === reportTheme)?.text,
                  borderRadius: "1rem",
                  padding: "2rem",
                  boxShadow: "0 0 0 1px " + (REPORT_THEMES.find(t => t.id === reportTheme)?.border || "#e2e8f0"),
                  maxWidth: reportLayout === "compact" ? "640px" : "100%",
                  minHeight: "320px",
                }}
              >
                <h2 className="text-2xl font-bold mb-2">{title || "Your Report Title"}</h2>
                {excerpt && <p className="text-sm opacity-70 mb-4">{excerpt}</p>}
                <div className="space-y-3">
                  {blocks.slice(0, 4).filter(b => b.content).map((b, i) => (
                    <div key={i}>
                      {b.type === "heading" && <h3 className="text-lg font-bold">{b.content}</h3>}
                      {b.type === "text" && <p className="text-sm leading-relaxed">{b.content.slice(0, 200)}{b.content.length > 200 ? "..." : ""}</p>}
                      {b.type === "bullets" && <ul className="list-disc list-inside text-sm space-y-1">{b.content.split("\n").slice(0, 3).map((l, j) => <li key={j}>{l.replace(/^[•\-]\s*/, "")}</li>)}</ul>}
                      {b.type === "quote" && <blockquote className="border-l-4 pl-3 italic text-sm opacity-80">{b.content}</blockquote>}
                    </div>
                  ))}
                  {blocks.every(b => !b.content) && <p className="text-sm opacity-40 italic">Write some content in the editor to see it previewed here.</p>}
                </div>
              </div>
            </div>
            {/* Right: Design controls */}
            <div>
              <DesignPanel
                theme={reportTheme}
                font={reportFont}
                layout={reportLayout}
                onThemeChange={setReportTheme}
                onFontChange={setReportFont}
                onLayoutChange={setReportLayout}
              />
            </div>
          </div>
        ) : activePanel === "write" ? (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
            {/* ── Left: Editor canvas ── */}
            <div
              style={{
                fontFamily: REPORT_FONTS.find(f => f.id === reportFont)?.style?.fontFamily,
                background: REPORT_THEMES.find(t => t.id === reportTheme)?.bg,
                color: REPORT_THEMES.find(t => t.id === reportTheme)?.text,
                borderRadius: "1rem",
                padding: reportTheme !== "default" ? "2rem" : undefined,
                boxShadow: reportTheme !== "default" ? "0 0 0 1px " + REPORT_THEMES.find(t => t.id === reportTheme)?.border : undefined,
                maxWidth: reportLayout === "wide" ? "100%" : reportLayout === "compact" ? "640px" : undefined,
              }}
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

              {/* Title */}
              <textarea
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Report title..."
                rows={1}
                className="w-full text-3xl md:text-4xl font-bold text-foreground bg-transparent border-none outline-none resize-none placeholder:text-muted-foreground/30 mb-3 leading-tight overflow-hidden"
                style={{ fontFamily: "var(--font-sans)" }}
                onInput={e => { e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }}
              />

              {/* Excerpt / subtitle */}
              <textarea
                value={excerpt}
                onChange={e => setExcerpt(e.target.value)}
                placeholder="Write a short summary or teaser (shown in the feed)..."
                rows={2}
                className="w-full text-base text-muted-foreground bg-transparent border-none outline-none resize-none placeholder:text-muted-foreground/30 mb-6 leading-relaxed"
                onInput={e => { e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }}
              />

              {/* Divider */}
              <div className="border-b border-border mb-6" />

              {/* Tags (inline) */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {tags.map(tag => (
                    <span key={tag} className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">
                      <Hash className="w-2.5 h-2.5" />{tag}
                      <button onClick={() => setTags(prev => prev.filter(t => t !== tag))} className="hover:text-loss"><X className="w-2.5 h-2.5" /></button>
                    </span>
                  ))}
                </div>
              )}

              {/* Blocks — drag & drop */}
              <DraggableBlockList
                blocks={blocks}
                onReorder={setBlocks}
                onUpdate={updateBlock}
                onDelete={deleteBlock}
                onInsertAfter={insertBlockAfter}
              />

              {/* Add block */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground border border-dashed border-border hover:border-primary/40 rounded-xl px-4 py-3 w-full transition-colors group mb-6">
                    <Plus className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
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
                        {i === 4 && <DropdownMenuSeparator />}
                        <DropdownMenuItem onClick={() => addBlock(bt.type)}>
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
                    <PredictionBlock onPublish={(p) => { setPredictionData(p); toast.success(`Prediction locked: ${p.action} $${p.ticker}`); }} />
                  </div>
                )}
              </div>
            </div>

            {/* ── Right: Sidebar ── */}
            <div className="space-y-4">
              {/* Publish card */}
              <div className="bg-card border border-border rounded-2xl p-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Send className="w-3.5 h-3.5 text-primary" /> Publish
                </h3>
                <div className="space-y-3">
                  <Button onClick={handlePublish} disabled={publishing} className="w-full gap-1.5">
                    <Send className="w-3.5 h-3.5" />{publishing ? "Publishing..." : "Publish Report"}
                  </Button>
                  <Button variant="outline" onClick={() => persistDraft()} className="w-full gap-1.5 text-xs">
                    <Save className="w-3.5 h-3.5" />Save as Draft
                  </Button>
                </div>
              </div>

              {/* Pricing */}
              <div className="bg-card border border-border rounded-2xl p-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-amber-500" /> Monetization
                </h3>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {[
                    { val: false, icon: "🔓", label: "Free", desc: "Public" },
                    { val: true,  icon: "💎", label: "Premium", desc: "Paid" },
                  ].map(({ val, icon, label, desc }) => (
                    <button
                      key={label}
                      onClick={() => setIsPremium(val)}
                      className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-xs font-medium ${
                        isPremium === val ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/30"
                      }`}
                    >
                      <span className="text-base">{icon}</span>
                      <span>{label}</span>
                      <span className="font-normal opacity-70">{desc}</span>
                    </button>
                  ))}
                </div>
                {isPremium && (
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Price (USD)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                      <Input value={reportPrice} onChange={e => setReportPrice(e.target.value)} className="pl-6 h-9 text-sm" placeholder="4.99" type="number" min="0.99" step="0.50" />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      You keep ${(parseFloat(reportPrice || 0) * 0.85).toFixed(2)} after 15% fee
                    </p>
                  </div>
                )}
              </div>

              {/* Report metadata */}
              <div className="bg-card border border-border rounded-2xl p-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Palette className="w-3.5 h-3.5 text-primary" /> Metadata
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Industry / Sector</label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="w-full flex items-center justify-between border border-border rounded-lg px-3 h-9 text-xs hover:bg-secondary transition-colors">
                          <span className={industry ? "text-foreground" : "text-muted-foreground"}>{industry || "Select industry..."}</span>
                          <ChevronDown className="w-3 h-3 opacity-50" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-52 max-h-60 overflow-y-auto">
                        {INDUSTRIES.map(i => (
                          <DropdownMenuItem key={i} onClick={() => setIndustry(i)} className="text-xs">{i}</DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Market Cap</label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="w-full flex items-center justify-between border border-border rounded-lg px-3 h-9 text-xs hover:bg-secondary transition-colors">
                          <span className={marketCap ? "text-foreground" : "text-muted-foreground"}>
                            {MARKET_CAPS.find(m => m.value === marketCap)?.label || "Select market cap..."}
                          </span>
                          <ChevronDown className="w-3 h-3 opacity-50" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-56">
                        {MARKET_CAPS.map(m => (
                          <DropdownMenuItem key={m.value} onClick={() => setMarketCap(m.value)} className="text-xs">{m.label}</DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Tags <span className="opacity-60">(press Enter)</span></label>
                    <Input
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={addTag}
                      placeholder="e.g. NVDA, AI, Semiconductor"
                      className="h-9 text-xs"
                    />
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {tags.map(tag => (
                          <span key={tag} className="flex items-center gap-0.5 text-[10px] bg-secondary px-2 py-0.5 rounded-full text-muted-foreground">
                            #{tag}
                            <button onClick={() => setTags(prev => prev.filter(t => t !== tag))}><X className="w-2.5 h-2.5 hover:text-loss" /></button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="bg-secondary/50 border border-border rounded-2xl p-4">
                <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Report Stats</h3>
                <div className="space-y-2">
                  {[
                    { label: "Words", value: wordCount },
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

              {/* Boost */}
              <BoostPanel />

              {/* Tips */}
              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4">
                <h3 className="text-xs font-semibold text-primary mb-2 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" /> Tips for Great Reports
                </h3>
                <ul className="space-y-1.5 text-[11px] text-muted-foreground">
                  <li>✦ Lock a prediction to build your track record</li>
                  <li>✦ Add charts directly inside the report</li>
                  <li>✦ Use $TICKER to auto-tag stocks mentioned</li>
                  <li>✦ 600+ words ranks higher in the feed</li>
                  <li>✦ Add a DYOR disclaimer at the end</li>
                </ul>
              </div>
            </div>
          </div>
        ) : activePanel === "settings" ? (
          /* ── Settings panel ── */

          <EditorSettingsPanel
            isPremium={isPremium}
            reportPrice={reportPrice}
            onIsPremiumChange={setIsPremium}
            onPriceChange={setReportPrice}
            industry={industry}
            onIndustryChange={setIndustry}
            marketCap={marketCap}
            onMarketCapChange={setMarketCap}
            coverImage={coverImage}
            onCoverImageChange={setCoverImage}
          />
        ) : null}
      </div>

      {showTemplates && (
        <TemplatesPanel
          onSelectTemplate={handleTemplateSelect}
          onClose={() => setShowTemplates(false)}
        />
      )}

      <AISidebar isOpen={showAI} onClose={() => setShowAI(false)} onGenerate={handleAIGenerate} initialTicker={urlTicker} />
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