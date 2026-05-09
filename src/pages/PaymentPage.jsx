import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Lock, ArrowLeft, Shield, Zap, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID || "sb"; // "sb" = sandbox for testing

const SUBSCRIPTION_PLANS = [
  { key: "basic", label: "Basic", price: 9, description: "For casual investors", features: ["All published reports", "Weekly market digest", "Community comments", "Prediction tracking"] },
  { key: "pro", label: "Pro", price: 29, description: "For serious analysts", features: ["Everything in Basic", "Locked predictions access", "Direct analyst DMs", "Weekly live Q&A", "Export reports to PDF", "Early access to reports"], highlight: true },
];

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

function PayPalButton({ amount, description, onSuccess }) {
  const containerRef = useRef(null);
  const [ready, setReady] = useState(false);
  const rendered = useRef(false);

  useEffect(() => {
    if (window.paypal) { setReady(true); return; }
    const script = document.createElement("script");
    script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=USD`;
    script.onload = () => setReady(true);
    script.onerror = () => toast.error("Failed to load PayPal. Please refresh.");
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!ready || !containerRef.current || rendered.current) return;
    rendered.current = true;
    window.paypal.Buttons({
      createOrder: (data, actions) => actions.order.create({
        purchase_units: [{ amount: { value: String(amount) }, description }]
      }),
      onApprove: async (data, actions) => {
        await actions.order.capture();
        toast.success("Payment successful!");
        onSuccess();
      },
      onError: () => toast.error("Payment failed. Please try again."),
      style: { layout: "vertical", color: "blue", shape: "rect", label: "pay" }
    }).render(containerRef.current);
  }, [ready, amount, description, onSuccess]);

  if (!ready) return (
    <div className="flex items-center justify-center py-6">
      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      <span className="ml-2 text-sm text-muted-foreground">Loading PayPal...</span>
    </div>
  );

  return <div ref={containerRef} className="mt-2" />;
}

export default function PaymentPage() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const mode = urlParams.get("mode") || "subscription";
  const reportTitle = urlParams.get("title") || "Premium Report";
  const reportPrice = parseFloat(urlParams.get("price") || "4.99");
  const analystName = urlParams.get("analyst") || "";
  const analystEmail = urlParams.get("analystEmail") || "";
  const [selectedPlan, setSelectedPlan] = useState("pro");

  if (urlParams.get("success") === "true" || urlParams.get("subscription") === "success" || urlParams.get("analyst_sub") === "success") {
    return <SuccessScreen mode={mode === "report" ? "report" : "subscription"} />;
  }
  if (urlParams.get("boost") === "success") {
    return <SuccessScreen mode="boost" />;
  }

  const handleSuccess = async () => {
    if (mode === "report" || mode === "analyst") {
      try {
        const user = await base44.auth.me();
        if (mode === "report") {
          const liked = await base44.entities.Like.create({ report_id: urlParams.get("reportId"), user_email: user.email }).catch(() => null);
        } else if (mode === "analyst") {
          await base44.entities.Subscription.create({
            subscriber_email: user.email,
            analyst_email: analystEmail,
            analyst_name: analystName,
            status: "active",
            plan: "monthly",
          }).catch(() => null);
        }
      } catch {}
    }
    navigate("?success=true");
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {mode === "report" && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <h1 className="text-xl font-bold mb-1">Unlock Report</h1>
          <p className="text-sm text-muted-foreground mb-4">One-time purchase — read forever.</p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
            <p className="text-xs text-amber-700 font-semibold mb-1">Premium Report</p>
            <p className="font-semibold text-sm">{reportTitle}</p>
            {analystName && <p className="text-xs text-muted-foreground">by {analystName}</p>}
          </div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-muted-foreground">One-time access</span>
            <span className="font-bold text-lg">${reportPrice.toFixed(2)}</span>
          </div>
          <PayPalButton amount={reportPrice} description={`${reportTitle} - Report Unlock`} onSuccess={handleSuccess} />
          <p className="text-xs text-center text-muted-foreground mt-3">
            Or <button onClick={() => navigate(`/pay?mode=analyst&analyst=${encodeURIComponent(analystName)}&analystEmail=${analystEmail}`)} className="text-primary hover:underline">subscribe to {analystName}</button> for unlimited access.
          </p>
          <p className="text-xs text-center text-muted-foreground mt-2 flex items-center justify-center gap-1">
            <Shield className="w-3 h-3" /> Secured by PayPal
          </p>
        </div>
      )}

      {mode === "analyst" && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <h1 className="text-xl font-bold mb-1">{`Subscribe to ${analystName}`}</h1>
          <p className="text-sm text-muted-foreground mb-6">Monthly subscription — access all reports and locked content.</p>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <p className="text-xs text-blue-700 font-semibold mb-1">Analyst Subscription</p>
            <p className="font-semibold text-sm">{analystName}</p>
            <p className="text-xs text-blue-700 mt-2">Get immediate access to all premium reports and predictions.</p>
          </div>
          <div className="flex items-center justify-between mb-6">
            <span className="text-sm text-muted-foreground">Monthly subscription</span>
            <span className="font-bold text-lg">$29/mo</span>
          </div>
          <ul className="space-y-2 mb-6">
            {[
              "All current & future reports",
              "Locked prediction details",
              "Direct messaging with analyst",
              "Cancel anytime"
            ].map((feature, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                <Check className="w-4 h-4 text-gain" /> {feature}
              </li>
            ))}
          </ul>
          <PayPalButton amount={29} description={`${analystName} - Monthly Subscription`} onSuccess={handleSuccess} />
          <p className="text-xs text-center text-muted-foreground mt-3 flex items-center justify-center gap-1">
            <Shield className="w-3 h-3" /> Secured by PayPal · Cancel anytime
          </p>
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
          <PayPalButton amount={reportPrice} description={`Boost: ${reportTitle}`} onSuccess={handleSuccess} />
          <p className="text-xs text-center text-muted-foreground mt-3 flex items-center justify-center gap-1">
            <Shield className="w-3 h-3" /> Secured by PayPal
          </p>
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
          {(() => {
            const plan = SUBSCRIPTION_PLANS.find(p => p.key === selectedPlan);
            return <PayPalButton amount={plan.price} description={`STOA ${plan.label} Subscription`} onSuccess={handleSuccess} />;
          })()}
          <p className="text-xs text-center text-muted-foreground mt-3 flex items-center justify-center gap-1">
            <Shield className="w-3 h-3" /> Secured by PayPal · Cancel anytime
          </p>
        </div>
      )}
    </div>
  );
}