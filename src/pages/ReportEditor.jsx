import React, { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Plus, Type, List, BarChart3, Image, Quote, AlertTriangle, Send, Save, FolderOpen, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { publishReport } from "@/lib/mockData";
import EditorBlock from "@/components/editor/EditorBlock";
import StockChartBlock from "@/components/editor/StockChartBlock";
import ImageBlock from "@/components/editor/ImageBlock";
import PredictionBlock from "@/components/editor/PredictionBlock";
import AISidebar from "@/components/editor/AISidebar";
import MonetizationPanel from "@/components/editor/MonetizationPanel";
import FactChecker from "@/components/report/FactChecker";
import AIChat from "@/components/editor/AIChat";
import BoostPanel from "@/components/editor/BoostPanel";

const DYOR_TEXT = "⚠️ Disclaimer: This report is for informational purposes only and does not constitute financial advice. Always do your own research (DYOR) before making any investment decisions.";

export default function ReportEditor() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [blocks, setBlocks] = useState([{ type: "text", content: "", id: 0 }]);
  const nextId = useRef(1);
  const [showAI, setShowAI] = useState(false);
  const [showPrediction, setShowPrediction] = useState(false);
  const [predictionData, setPredictionData] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [drafts, setDrafts] = useState(() => { try { return JSON.parse(localStorage.getItem("stoa_drafts")) || []; } catch { return []; } });
  const [showDrafts, setShowDrafts] = useState(false);

  const saveDraft = () => {
    if (!title.trim() && blocks.every(b => !b.content?.trim())) { toast.error("Nothing to save."); return; }
    const draft = { id: Date.now(), title: title || "Untitled Draft", blocks, predictionData, savedAt: new Date().toISOString() };
    const updated = [draft, ...drafts.slice(0, 9)];
    setDrafts(updated);
    localStorage.setItem("stoa_drafts", JSON.stringify(updated));
    toast.success("Draft saved!");
  };

  const loadDraft = (draft) => {
    setTitle(draft.title);
    setBlocks(draft.blocks);
    setPredictionData(draft.predictionData || null);
    setShowDrafts(false);
    toast.success("Draft loaded!");
  };

  const deleteDraft = (id) => {
    const updated = drafts.filter(d => d.id !== id);
    setDrafts(updated);
    localStorage.setItem("stoa_drafts", JSON.stringify(updated));
  };

  const handleBlockChange = useCallback((index, newBlock) => {
    setBlocks((prev) => prev.map((b, i) => (i === index ? newBlock : b)));
  }, []);

  const handleBlockDelete = useCallback((index) => {
    setBlocks((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleBlockKeyDown = useCallback((index, action) => {
    if (action === "enter") {
      setBlocks((prev) => { const n = [...prev]; n.splice(index + 1, 0, { type: "text", content: "", id: nextId.current++ }); return n; });
    }
  }, []);

  const addBlock = (type) => setBlocks((prev) => [...prev, { type, content: "", id: nextId.current++ }]);
  const addDYOR = () => { setBlocks((prev) => [...prev, { type: "text", content: DYOR_TEXT, id: nextId.current++ }]); toast.success("DYOR disclaimer added"); };

  const handlePublish = () => {
    if (!title.trim()) { toast.error("Please add a title before publishing."); return; }
    setPublishing(true);
    const tickers = blocks.map(b => b.content?.match(/\$([A-Z]{2,5})/g) || []).flat().map(t => t.replace("$", "")).filter((v, i, a) => a.indexOf(v) === i);
    const excerpt = blocks.find(b => b.type === "text" && b.content?.trim())?.content?.slice(0, 200) || "";
    const report = { title, content_blocks: blocks, tickers, excerpt, prediction: predictionData, industry: "AI & Semiconductors", marketCap: "large", isPremium: false };
    publishReport(report);
    toast.success("Report published! It's live on the feed.");
    setTimeout(() => navigate("/"), 1200);
  };

  const handleAIGenerate = (template) => {
    setBlocks(template.map((b) => ({ ...b, id: nextId.current++ })));
    toast.success("Template loaded! All blocks are editable.");
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-xl font-bold">Write Report</h1>
            <p className="text-xs text-muted-foreground">Create data-driven research for your followers</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={addDYOR} className="text-xs text-muted-foreground hidden sm:flex">DYOR</Button>
            <Button variant="outline" size="sm" onClick={() => setShowDrafts(v => !v)} className="text-xs relative">
              <FolderOpen className="w-3.5 h-3.5 mr-1" />
              Drafts
              {drafts.length > 0 && <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-primary text-white text-[8px] font-bold rounded-full flex items-center justify-center">{drafts.length}</span>}
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
              <div className="space-y-2">
                {drafts.map(d => (
                  <div key={d.id} className="flex items-center gap-3 p-2 bg-secondary rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{d.title}</p>
                      <p className="text-xs text-muted-foreground">{new Date(d.savedAt).toLocaleString()}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => loadDraft(d)} className="text-xs">Load</Button>
                    <button onClick={() => deleteDraft(d.id)} className="text-muted-foreground hover:text-loss transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Title */}
      <Input
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Untitled Report..."
        className="text-3xl font-bold border-none bg-transparent px-0 h-auto py-2 placeholder:text-muted-foreground/30 focus-visible:ring-0 mb-6"
        style={{ fontSize: "1.875rem" }}
      />

      {/* Blocks */}
      <div className="space-y-2 mb-4">
        {blocks.map((block, index) =>
          block.type === "stockchart" ? (
            <StockChartBlock key={block.id} onDelete={() => handleBlockDelete(index)} />
          ) : block.type === "image" ? (
            <ImageBlock key={block.id} onDelete={() => handleBlockDelete(index)} />
          ) : (
            <EditorBlock
              key={block.id}
              block={block}
              index={index}
              onChange={(nb) => handleBlockChange(index, nb)}
              onDelete={() => handleBlockDelete(index)}
              onKeyDown={(action) => handleBlockKeyDown(index, action)}
            />
          )
        )}
      </div>

      {/* Add block */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="text-xs gap-1.5 mb-6">
            <Plus className="w-3.5 h-3.5" />Add Block
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => addBlock("heading")}><Type className="w-3.5 h-3.5 mr-2" />Heading</DropdownMenuItem>
          <DropdownMenuItem onClick={() => addBlock("text")}><Type className="w-3.5 h-3.5 mr-2" />Text</DropdownMenuItem>
          <DropdownMenuItem onClick={() => addBlock("bullets")}><List className="w-3.5 h-3.5 mr-2" />Bullet List</DropdownMenuItem>
          <DropdownMenuItem onClick={() => addBlock("quote")}><Quote className="w-3.5 h-3.5 mr-2" />Quote</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => addBlock("stockchart")}><BarChart3 className="w-3.5 h-3.5 mr-2" />Stock Chart</DropdownMenuItem>
          <DropdownMenuItem onClick={() => addBlock("image")}><Image className="w-3.5 h-3.5 mr-2" />Image</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Prediction block */}
      {showPrediction && (
        <div className="mb-6">
          <PredictionBlock
            onPublish={(p) => {
              setPredictionData(p);
              toast.success(`Prediction locked: ${p.action} $${p.ticker}`);
            }}
          />
        </div>
      )}

      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => setShowPrediction(p => !p)}
          className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${showPrediction ? "bg-primary/10 border-primary/30 text-primary" : "border-border text-muted-foreground hover:border-primary/30"}`}
        >
          {showPrediction ? "✓ Prediction Block" : "+ Add Prediction"}
        </button>
        <span className="text-xs text-muted-foreground">Optional — skip for pure market analysis</span>
      </div>

      {/* Bottom panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <MonetizationPanel />
        <BoostPanel />
      </div>

      <div className="mb-6">
        <FactChecker content={[title, ...blocks.map(b => b.content)].filter(Boolean).join("\n\n")} />
      </div>

      <AISidebar isOpen={showAI} onClose={() => setShowAI(false)} onGenerate={handleAIGenerate} />
      <AIChat
        reportContent={[title, ...blocks.map(b => b.content)].filter(Boolean).join("\n\n")}
        onInsertBlock={(text) => {
          addBlock("text");
          setBlocks(prev => { const n = [...prev]; n[n.length - 1] = { ...n[n.length - 1], content: text }; return n; });
          toast.success("Block inserted!");
        }}
      />
    </div>
  );
}