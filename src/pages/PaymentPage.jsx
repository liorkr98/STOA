import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Lock, ArrowLeft, Shield, Zap, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

const SUBSCRIPTION_PLANS = [
  { key: "basic", label: "Basic", price: 9, description: "For casual investors", features: ["All published reports", "Weekly market digest", "Community comments", "Prediction tracking"] },
  { key: "pro", label: "Pro", price: 29, description: "For serious analysts", features: ["Everything in Basic", "Locked predictions access", "Direct analyst DMs", "Weekly live Q&A", "Export reports to PDF", "Early access to reports"], highlight: true },
];

async function createCheckoutSession(params) {
  const res = await base44.functions.invoke('stripeCheckout', params);
  return res.data;
}

function SuccessScreen({ mode }) {
  const navigate = useNavigate();
  return (
    <div className="max-w-sm mx-auto px-4 py-16 text-center">
      <CheckCircle2 className="w-12 h-12 text-gain mx-auto mb-4" />
      <h2 className="text-xl font-bold mb-2">
        {mode === 'report' ? 'Report Unlocked!' : mode === 'boost' ? 'Boost Activated!' : 'Subscription Active!'}
      </h2>
      <p className="text-sm text-muted-foreground mb-6">Your payment was processed successfully.</p>
      <Button onClick={() => navigate('/')}>Back to Feed</Button>
    </div>
  );
}

export default function PaymentPage() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const mode = urlParams.get("mode") || "subscription";
  const reportTitle = urlParams.get("title") || "Premium Report";
  const reportPrice = parseFloat(urlParams.get("price") || "4.99");
  const reportId = urlParams.get("id") || "";
  const analystName = urlParams.get("analyst") || "";
  const boostPlanId = urlParams.get("boostPlanId") || "";
  const [selectedPlan, setSelectedPlan] = useState("pro");
  const [loading, setLoading] = useState(false);

  // Handle Stripe success/cancel redirects
  if (urlParams.get("success") === "true" || urlParams.get("subscription") === "success" || urlParams.get("analyst_sub") === "success") {
    return <SuccessScreen mode="subscription" />;
  }
  if (urlParams.get("boost") === "success") {
    return <SuccessScreen mode="boost" />;
  }

  const handleCheckout = async (checkoutMode, extraParams = {}) => {
    setLoading(true);
    try {
      const { url } = await createCheckoutSession({ mode: checkoutMode, ...extraParams });
      if (url) {
        window.location.href = url;
      } else {
        toast.error("Could not create checkout session. Please try again.");
        setLoading(false);
      }
    } catch (err) {
      toast.error(err.message || "Payment error. Please try again.");
      setLoading(false);
    }
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
          <Button className="w-full mb-3" disabled={loading} onClick={() => handleCheckout('report', { price: reportPrice, title: reportTitle, reportId, analystName })}>
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Redirecting to Stripe...</> : <><Lock className="w-4 h-4 mr-2" />Unlock for ${reportPrice.toFixed(2)}</>}
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Or <button onClick={() => navigate("/pay?mode=subscription")} className="text-primary hover:underline">subscribe from $9/mo</button> for unlimited access.
          </p>
          <p className="text-xs text-center text-muted-foreground mt-2 flex items-center justify-center gap-1"><Shield className="w-3 h-3" /> 256-bit SSL · Powered by Stripe</p>
        </div>
      )}

      {mode === "boost" && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <h1 className="text-xl font-bold mb-1">Boost Report</h1>
          <p className="text-sm text-muted-foreground mb-4">Increase your report's visibility on the feed.</p>
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4">
            <p className="font-semibold text-sm">{reportTitle}</p>
          </div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-muted-foreground">One-time boost</span>
            <span className="font-bold text-lg">${reportPrice.toFixed(2)}</span>
          </div>
          <Button className="w-full mb-3" disabled={loading} onClick={() => handleCheckout('boost', { price: reportPrice, title: reportTitle, boostPlanId })}>
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Redirecting to Stripe...</> : `Boost for $${reportPrice.toFixed(2)}`}
          </Button>
          <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1"><Shield className="w-3 h-3" /> 256-bit SSL · Powered by Stripe</p>
        </div>
      )}

      {(mode === "subscription" || mode === "analyst") && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <h1 className="text-xl font-bold mb-1">{mode === "analyst" ? `Subscribe to ${analystName || "Analyst"}` : "Unlock Full Access"}</h1>
          <p className="text-sm text-muted-foreground mb-6">Monthly subscription · Cancel anytime.</p>
          <div className="space-y-3 mb-6">
            {SUBSCRIPTION_PLANS.map(plan => (
              <button key={plan.key} onClick={() => setSelectedPlan(plan.key)}
                className={`w-full text-left rounded-xl border-2 p-4 transition-all ${selectedPlan === plan.key ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
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
          <Button className="w-full mb-3" disabled={loading} onClick={() => {
            const plan = SUBSCRIPTION_PLANS.find(p => p.key === selectedPlan);
            if (mode === "subscription" && selectedPlan === "pro") {
              handleCheckout('subscription', {});
            } else {
              handleCheckout('analyst', { price: plan.price, analystName });
            }
          }}>
            {loading
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Redirecting to Stripe...</>
              : <><Zap className="w-4 h-4 mr-2" />Subscribe for ${SUBSCRIPTION_PLANS.find(p => p.key === selectedPlan)?.price}/mo via Stripe</>}
          </Button>
          <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1"><Shield className="w-3 h-3" /> 256-bit SSL · Powered by Stripe · Cancel anytime</p>
        </div>
      )}
    </div>
  );
}