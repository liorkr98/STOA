import React from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const PLANS = [
  { name: "Free", price: "$0", period: "forever", features: ["Browse published reports", "Follow analysts", "View prediction outcomes", "Basic search & filters"], cta: "Get Started", highlight: false },
  { name: "Pro", price: "$29", period: "/month", features: ["Everything in Free", "Locked prediction access", "Premium reports included", "Direct analyst DMs", "Weekly live Q&A", "Export to PDF", "Early access to reports"], cta: "Start Pro", highlight: true },
  { name: "Analyst", price: "Revenue share", period: "", features: ["Publish unlimited reports", "Lock predictions publicly", "Monetize with subscriptions", "AI writing assistant", "Analytics dashboard", "15% platform fee on sales"], cta: "Start Writing", highlight: false },
];

export default function PricingPage() {
  const navigate = useNavigate();
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-center mb-2">Simple Pricing</h1>
      <p className="text-muted-foreground text-center mb-10">Start free. Upgrade when you're ready.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map(plan => (
          <div key={plan.name} className={`p-6 rounded-2xl border-2 ${plan.highlight ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
            {plan.highlight && <span className="text-[10px] bg-primary text-white rounded-full px-2 py-0.5 mb-3 inline-block">Most Popular</span>}
            <h3 className="font-bold text-lg mb-1">{plan.name}</h3>
            <div className="flex items-baseline gap-1 mb-4">
              <span className="text-3xl font-bold">{plan.price}</span>
              <span className="text-sm text-muted-foreground">{plan.period}</span>
            </div>
            <ul className="space-y-2 mb-6">
              {plan.features.map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="w-3.5 h-3.5 text-gain flex-shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <Button onClick={() => navigate(plan.name === "Analyst" ? "/editor" : "/pay?mode=subscription")} className="w-full" variant={plan.highlight ? "default" : "outline"}>{plan.cta}</Button>
          </div>
        ))}
      </div>
    </div>
  );
}