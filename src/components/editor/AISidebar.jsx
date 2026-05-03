import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Loader2, X } from "lucide-react";
import { base44 } from "@/api/base44Client";

const SKELETON_TEMPLATE = [
  { type: "heading", content: "Executive Summary" },
  { type: "text", content: "This report examines the current market positioning and future outlook for the subject company. Our analysis suggests significant upside potential driven by key catalysts in the sector." },
  { type: "heading", content: "Market Analysis" },
  { type: "bullets", content: "• Revenue growth accelerating QoQ with 23% YoY increase\n• Market share expanding in core segments\n• Competitive moat strengthening through R&D investment\n• Favorable regulatory tailwinds expected in H2 2026" },
  { type: "heading", content: "Valuation & Price Target" },
  { type: "text", content: "Using a DCF model with a 10% discount rate and 5-year projection period, we arrive at a fair value that suggests meaningful upside from current levels." },
  { type: "heading", content: "Summary & Recommendation" },
  { type: "text", content: "Based on our comprehensive analysis, we believe the risk/reward profile is highly favorable at current prices." },
];

export default function AISidebar({ isOpen, onClose, onGenerate }) {
  const [generating, setGenerating] = useState(false);
  const [topic, setTopic] = useState("");

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      if (topic.trim()) {
        const res = await base44.integrations.Core.InvokeLLM({
          prompt: `You are a professional financial analyst. Write a structured research report template about: "${topic}". Return a JSON array of blocks. Each block has "type" (heading/text/bullets) and "content" (string). Include: Executive Summary, Market Analysis, Key Catalysts, Risks, Valuation & Price Target, Summary & Recommendation.`,
          response_json_schema: { type: "object", properties: { blocks: { type: "array", items: { type: "object", properties: { type: { type: "string" }, content: { type: "string" } } } } } },
        });
        onGenerate(res.blocks || SKELETON_TEMPLATE);
      } else {
        await new Promise((r) => setTimeout(r, 500));
        onGenerate(SKELETON_TEMPLATE);
      }
    } catch { onGenerate(SKELETON_TEMPLATE); }
    setGenerating(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">AI Template Generator</h3>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-xs text-muted-foreground mb-3">Enter a company or topic, or leave blank for a generic template.</p>
        <Input
          value={topic}
          onChange={e => setTopic(e.target.value)}
          placeholder="e.g. NVIDIA, Tesla, Bitcoin..."
          className="mb-4"
          onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
        />
        <Button onClick={handleGenerate} disabled={generating} className="w-full">
          {generating
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{topic ? "Writing with AI..." : "Loading template..."}</>
            : <><Sparkles className="w-4 h-4 mr-2" />{topic ? "Generate with AI" : "Use Generic Template"}</>}
        </Button>
      </div>
    </div>
  );
}