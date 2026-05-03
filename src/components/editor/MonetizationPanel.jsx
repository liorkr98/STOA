import React, { useState } from "react";
import { DollarSign, Unlock, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function MonetizationPanel() {
  const [mode, setMode] = useState("free");
  const [price, setPrice] = useState("4.99");

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <DollarSign className="w-4 h-4 text-primary" />
        <h4 className="font-semibold text-sm">Report Pricing</h4>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <button
          onClick={() => setMode("free")}
          className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${mode === "free" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}
        >
          <Unlock className="w-4 h-4 text-gain" />
          <span className="text-xs font-semibold">Free</span>
          <span className="text-[10px] text-muted-foreground">Anyone can read</span>
        </button>
        <button
          onClick={() => setMode("paid")}
          className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${mode === "paid" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}
        >
          <Lock className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-semibold">Premium</span>
          <span className="text-[10px] text-muted-foreground">Paid unlock</span>
        </button>
      </div>
      {mode === "paid" && (
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Price (USD)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
            <Input value={price} onChange={e => setPrice(e.target.value)} className="pl-6 h-9" placeholder="4.99" type="number" min="0.99" step="0.50" />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            You keep ${(parseFloat(price || 0) * 0.85).toFixed(2)} after 15% platform fee
          </p>
        </div>
      )}
    </div>
  );
}