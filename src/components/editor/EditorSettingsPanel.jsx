import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageIcon, Palette, Trash2, Zap, ChevronDown, X } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import BoostPanel from "@/components/editor/BoostPanel";

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

export default function EditorSettingsPanel({
  coverImage, onCoverImageChange, onDeleteAll,
  isPremium, setIsPremium, reportPrice, setReportPrice,
  industry, setIndustry, marketCap, setMarketCap,
  tags, setTags, tagInput, setTagInput, addTag,
}) {
  const [uploading, setUploading] = useState(false);

  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onCoverImageChange(file_url);
      toast.success("Cover image uploaded!");
    } catch { toast.error("Upload failed"); }
    finally { setUploading(false); }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Cover image */}
      <div className="surface p-5">
        <h3 className="font-serif text-[14px] text-foreground mb-3 flex items-center gap-2">
          <Palette className="w-4 h-4 text-primary" /> Cover Image
        </h3>
        {coverImage ? (
          <div className="relative rounded-tag overflow-hidden aspect-[3/1] bg-secondary mb-3">
            <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="rounded-tag border border-dashed border-border aspect-[3/1] flex items-center justify-center mb-3 text-muted-foreground text-sm bg-secondary/30">
            No cover image
          </div>
        )}
        <div className="flex gap-2">
          <label>
            <Button variant="outline" size="sm" className="cursor-pointer" disabled={uploading} asChild>
              <span><ImageIcon className="w-3.5 h-3.5 mr-1.5" />{uploading ? "Uploading..." : "Upload Cover"}</span>
            </Button>
            <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
          </label>
          {coverImage && (
            <Button variant="ghost" size="sm" onClick={() => onCoverImageChange("")} className="text-muted-foreground text-xs">
              Remove
            </Button>
          )}
        </div>
      </div>

      {/* Monetization */}
      <div className="surface p-5">
        <h3 className="font-serif text-[14px] text-foreground mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-accent" /> Monetization
        </h3>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {[
            { val: false, icon: "🔓", label: "Free", desc: "Public" },
            { val: true,  icon: "💎", label: "Premium", desc: "Paid" },
          ].map(({ val, icon, label, desc }) => (
            <button
              key={label}
              onClick={() => setIsPremium(val)}
              className={`flex flex-col items-center gap-1 p-3 rounded-tag border transition-all text-xs font-medium ${
                isPremium === val ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
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
              You keep ${(parseFloat(reportPrice || 0) * 0.90).toFixed(2)} after 10% fee
            </p>
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="surface p-5">
        <h3 className="font-serif text-[14px] text-foreground mb-3 flex items-center gap-2">
          <Palette className="w-4 h-4 text-primary" /> Metadata
        </h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Industry</label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-full flex items-center justify-between border border-border rounded-lg px-3 h-9 text-xs hover:bg-secondary transition-colors">
                  <span className={industry ? "text-foreground" : "text-muted-foreground"}>{industry || "Select industry..."}</span>
                  <ChevronDown className="w-3 h-3 opacity-50" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-52 max-h-60 overflow-y-auto">
                {INDUSTRIES.map(i => <DropdownMenuItem key={i} onClick={() => setIndustry(i)} className="text-xs">{i}</DropdownMenuItem>)}
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
                {MARKET_CAPS.map(m => <DropdownMenuItem key={m.value} onClick={() => setMarketCap(m.value)} className="text-xs">{m.label}</DropdownMenuItem>)}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Tags <span className="opacity-60">(press Enter)</span></label>
            <Input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={addTag} placeholder="e.g. NVDA, AI, Semiconductor" className="h-9 text-xs" />
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {tags.map(tag => (
                  <span key={tag} className="flex items-center gap-0.5 text-[10px] bg-secondary px-2 py-0.5 rounded-tag text-muted-foreground">
                    #{tag}
                    <button onClick={() => setTags(prev => prev.filter(t => t !== tag))}>
                      <X className="w-2.5 h-2.5 hover:text-foreground" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Boost */}
      <BoostPanel />

      {/* Danger zone */}
      {onDeleteAll && (
        <div className="surface p-5">
          <h3 className="font-serif text-[14px] text-foreground mb-2 flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-destructive" /> Clear All
          </h3>
          <p className="text-xs text-muted-foreground mb-3">Clear all content and start fresh.</p>
          <Button variant="destructive" size="sm" onClick={onDeleteAll} className="text-xs gap-1.5">
            <Trash2 className="w-3.5 h-3.5" /> Delete Everything
          </Button>
        </div>
      )}
    </div>
  );
}