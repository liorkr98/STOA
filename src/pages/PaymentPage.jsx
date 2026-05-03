import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Lock, ArrowLeft, Star, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const SUBSCRIPTION_PLANS = [
  { key: "basic", label: "Basic", price: 9, description: "For casual investors", features: ["All published reports", "Weekly market digest", "Community comments", "Prediction tracking"] },
  { key: "pro", label: "Pro", price: 29, description: "For serious analysts", features: ["Everything in Basic", "Locked predictions access", "Direct analyst DMs", "Weekly live Q&A", "Export reports to PDF", "Early access to reports"], highlight: true },
];

export default function PaymentPage() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const mode = urlParams.get("mode") || "subscription";
  const reportTitle = urlParams.get("title") || "Premium Report";
  const reportPrice = parseFloat(urlParams.get("price") || "4.99");
  const reportId = urlParams.get("id") || "";
  const analystName = urlParams.get("analyst") || "";
  const [selectedPlan, setSelectedPlan] = useState("pro");

  const handleCheckout = (label) => {
    toast.success(`${label} — payment flow coming soon (Stripe integration needed).`);
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {mode === "report" && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <h1 className="text-xl font-bold mb-1">Unlock Report</h1>
          <p className="text-sm text-muted-foreground mb-4">One-time purchase — yours forever.</p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
            <p className="text-xs text-amber-700 font-semibold mb-1">Premium Report</p>
            <p className="font-semibold text-sm">{reportTitle}</p>
            {analystName && <p className="text-xs text-muted-foreground">by {analystName}</p>}
          </div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-muted-foreground">One-time access</span>
            <span className="font-bold text-lg">${reportPrice.toFixed(2)}</span>
          </div>
          <Button onClick={() => handleCheckout(`Unlock for $${reportPrice}`)} className="w-full mb-3">
            <Lock className="w-4 h-4 mr-2" /> Unlock for ${reportPrice.toFixed(2)}
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Or <button onClick={() => navigate("/pay?mode=subscription")} className="text-primary hover:underline">subscribe from $9/mo</button> for unlimited access.
          </p>
          <p className="text-xs text-center text-muted-foreground mt-2 flex items-center justify-center gap-1"><Shield className="w-3 h-3" /> 256-bit SSL · Powered by Stripe</p>
        </div>
      )}

      {(mode === "subscription" || mode === "analyst") && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <h1 className="text-xl font-bold mb-1">{mode === "analyst" ? `Subscribe to ${analystName || "Analyst"}` : "Unlock Full Access"}</h1>
          <p className="text-sm text-muted-foreground mb-6">Monthly subscription · Cancel anytime.</p>
          <div className="space-y-3 mb-6">
            {SUBSCRIPTION_PLANS.map(plan => (
              <button key={plan.key} onClick={() => setSelectedPlan(plan.key)}
                className={`w-full text-left rounded-xl border-2 p-4 transition-all ${selectedPlan === plan.key ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{plan.label}</span>
                    {plan.highlight && <span className="text-[10px] bg-primary text-white rounded-full px-1.5 py-0.5">Popular</span>}
                  </div>
                  <span className="font-bold text-primary">${plan.price}/mo</span>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{plan.description}</p>
                {plan.features.map(f => (
                  <p key={f} className="text-xs text-muted-foreground flex items-center gap-1"><Check className="w-3 h-3 text-gain" /> {f}</p>
                ))}
              </button>
            ))}
          </div>
          <Button onClick={() => handleCheckout(`Subscribe ${SUBSCRIPTION_PLANS.find(p => p.key === selectedPlan)?.label}`)} className="w-full mb-3">
            <Zap className="w-4 h-4 mr-2" /> Subscribe for ${SUBSCRIPTION_PLANS.find(p => p.key === selectedPlan)?.price}/mo
          </Button>
          <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1"><Shield className="w-3 h-3" /> 256-bit SSL · Powered by Stripe · Cancel anytime</p>
        </div>
      )}
    </div>
  );
}