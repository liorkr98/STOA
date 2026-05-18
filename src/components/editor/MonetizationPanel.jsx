import React from "react";
import { DollarSign, Unlock, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function MonetizationPanel({ isPremium, price, onIsPremiumChange, onPriceChange }) {
  const mode = isPremium ? "paid" : "free";

  return (
    <div className="surface p-4">
      <div className="flex items-center gap-2 mb-3">
        <DollarSign className="w-4 h-4 text-primary" />
        <h4 className="font-serif text-[14px] text-foreground">Report Pricing</h4>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <button
          onClick={() => onIsPremiumChange(false)}
          className={`flex flex-col items-center gap-1.5 p-3 rounded-tag border transition-all ${mode === "free" ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`}
        >
          <Unlock className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-medium">Free</span>
          <span className="text-[10px] text-muted-foreground">Anyone can read</span>
        </button>
        <button
          onClick={() => onIsPremiumChange(true)}
          className={`flex flex-col items-center gap-1.5 p-3 rounded-tag border transition-all ${mode === "paid" ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`}
        >
          <Lock className="w-4 h-4 text-accent" />
          <span className="text-xs font-medium">Premium</span>
          <span className="text-[10px] text-muted-foreground">Paid unlock</span>
        </button>
      </div>
      {mode === "paid" && (
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Price (USD)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
            <Input value={price} onChange={e => onPriceChange(e.target.value)} className="pl-6 h-9" placeholder="4.99" type="number" min="0.99" step="0.50" />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            You keep ${(parseFloat(price || 0) * 0.90).toFixed(2)} after 10% platform fee
          </p>
        </div>
      )}
    </div>
  );
}