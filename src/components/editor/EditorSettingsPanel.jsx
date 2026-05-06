import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ImageIcon, Zap, Unlock, Lock, Palette, BarChart3 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const INDUSTRIES = [
  "Technology","Healthcare","Financials","Energy","Consumer Discretionary",
  "Consumer Staples","Industrials","Materials","Real Estate","Utilities","Telecom","Crypto"
];

const MARKET_CAPS = [
  { value: "mega",  label: "Mega Cap (>$200B)" },
  { value: "large", label: "Large Cap ($10–200B)" },
  { value: "mid",   label: "Mid Cap ($2–10B)" },
  { value: "small", label: "Small Cap ($300M–2B)" },
  { value: "micro", label: "Micro Cap (<$300M)" },
];

export default function EditorSettingsPanel({
  isPremium, reportPrice, onIsPremiumChange, onPriceChange,
  industry, onIndustryChange, marketCap, onMarketCapChange,
  coverImage, onCoverImageChange,
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
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-lg font-bold mb-1">Report Settings</h2>
        <p className="text-sm text-muted-foreground">Configure metadata, pricing, and branding for your report.</p>
      </div>

      {/* Cover image */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Palette className="w-4 h-4 text-primary" /> Cover Image</h3>
        {coverImage ? (
          <div className="relative rounded-xl overflow-hidden aspect-[3/1] bg-secondary mb-3">
            <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="rounded-xl border-2 border-dashed border-border aspect-[3/1] flex items-center justify-center mb-3 text-muted-foreground text-sm bg-secondary/30">
            No cover image
          </div>
        )}
        <label>
          <Button variant="outline" size="sm" className="cursor-pointer" disabled={uploading} asChild>
            <span><ImageIcon className="w-3.5 h-3.5 mr-1.5" />{uploading ? "Uploading..." : "Upload Cover"}</span>
          </Button>
          <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
        </label>
        {coverImage && (
          <Button variant="ghost" size="sm" onClick={() => onCoverImageChange("")} className="ml-2 text-muted-foreground text-xs">Remove</Button>
        )}
      </div>

      {/* Pricing */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Zap className="w-4 h-4 text-amber-500" /> Monetization</h3>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button onClick={() => onIsPremiumChange(false)}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${!isPremium ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
            <Unlock className="w-5 h-5 text-gain" />
            <span className="text-sm font-semibold">Free</span>
            <span className="text-xs text-muted-foreground">Anyone can read</span>
          </button>
          <button onClick={() => onIsPremiumChange(true)}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${isPremium ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
            <Lock className="w-5 h-5 text-amber-500" />
            <span className="text-sm font-semibold">Premium</span>
            <span className="text-xs text-muted-foreground">Paid unlock</span>
          </button>
        </div>
        {isPremium && (
          <div className="max-w-xs">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Report Price (USD)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <Input value={reportPrice} onChange={e => onPriceChange(e.target.value)} className="pl-6 h-9" placeholder="4.99" type="number" min="0.99" step="0.50" />
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              You keep <strong>${(parseFloat(reportPrice || 0) * 0.85).toFixed(2)}</strong> after 15% platform fee
            </p>
          </div>
        )}
      </div>

      {/* Classification */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" /> Classification</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">Industry / Sector</label>
            <div className="flex flex-wrap gap-1.5">
              {INDUSTRIES.map(i => (
                <button key={i} onClick={() => onIndustryChange(i === industry ? "" : i)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-all ${i === industry ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                  {i}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">Market Cap</label>
            <div className="space-y-1.5">
              {MARKET_CAPS.map(m => (
                <button key={m.value} onClick={() => onMarketCapChange(m.value === marketCap ? "" : m.value)}
                  className={`w-full text-left text-xs px-3 py-2 rounded-lg border transition-all ${m.value === marketCap ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}