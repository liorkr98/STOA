import React from "react";
import { Check, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PLANS = [
  {
    name: "FREE FOREVER",
    price: "$0",
    badge: null,
    features: [
      "Browse all public reports",
      "Follow researchers",
      "See prediction outcomes",
      "Access the leaderboard",
    ],
    cta: "Get Started Free",
    dest: "/feed",
    highlight: false,
  },
  {
    name: "RESEARCHER SUBSCRIPTIONS",
    price: "Set by each researcher",
    badge: "FLEXIBLE",
    sub: "Typically $5 – $99/month",
    features: [
      "Each researcher sets their own monthly rate",
      "Full access to that researcher's premium reports",
      "Locked predictions and price targets",
      "Real-time alerts when they publish",
      "Cancel anytime",
    ],
    cta: "Browse Researchers",
    dest: "/leaderboard",
    highlight: true,
  },
  {
    name: "BECOME A RESEARCHER",
    price: "Free to publish",
    badge: null,
    features: [
      "Publish unlimited free reports",
      "Charge subscribers your chosen rate",
      "STOA keeps 15% of subscription revenue",
      "Full analytics dashboard & wallet",
    ],
    cta: "Start Writing",
    dest: "/editor",
    highlight: false,
  },
];

export default function PricingPage() {
  const navigate = useNavigate();
  return (
    <div className="max-w-5xl mx-auto px-4 py-14">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold mb-3 tracking-tight">Transparent Pricing</h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
          Every researcher sets their own subscription price. Pay only for the research you want.
        </p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start mb-14">
        {PLANS.map((plan, i) => (
          <div
            key={i}
            className={`rounded-2xl p-7 flex flex-col border-2 transition-all relative ${
              plan.highlight
                ? "border-primary shadow-lg shadow-primary/10 bg-primary/5"
                : "border-border bg-card hover:border-primary/30"
            }`}
            style={{ marginTop: plan.highlight ? -8 : 0 }}
          >
            {plan.badge && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-bold px-3 py-1 rounded-full">
                {plan.badge}
              </span>
            )}
            <p className="text-xs font-bold text-muted-foreground tracking-widest uppercase mb-3">{plan.name}</p>
            <div className="mb-1">
              <span className={`font-extrabold ${plan.price.length > 5 ? "text-xl" : "text-4xl"}`}>{plan.price}</span>
            </div>
            {plan.sub && <p className="text-xs text-muted-foreground mb-4">{plan.sub}</p>}
            <ul className="space-y-3 flex-1 mt-4 mb-7">
              {plan.features.map((f, j) => (
                <li key={j} className="flex items-start gap-2.5 text-sm text-foreground/80">
                  <Check className="w-4 h-4 text-gain flex-shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => navigate(plan.dest)}
              className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                plan.highlight
                  ? "bg-primary text-white hover:bg-primary/90"
                  : "bg-secondary text-foreground hover:bg-secondary/70 border border-border"
              }`}
            >
              {plan.cta} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* FAQ / Notes */}
      <div className="bg-secondary rounded-2xl p-8">
        <h2 className="text-lg font-bold mb-5">Frequently Asked Questions</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {[
            { q: "How much does a researcher subscription cost?", a: "Each researcher independently sets their own subscription price. Rates typically range from $5 to $99/month. Browse researcher profiles to see individual pricing." },
            { q: "Can I cancel anytime?", a: "Yes. Researcher subscriptions can be cancelled at any time. Your access continues until the end of your current billing period." },
            { q: "What does STOA take as a platform fee?", a: "STOA retains 15% of subscription revenue generated through the platform. Researchers keep 85% of all subscription income." },
            { q: "Is financial advice included?", a: "No. STOA is an information and research platform. Nothing on STOA constitutes financial advice. Always do your own research (DYOR)." },
          ].map((item, i) => (
            <div key={i}>
              <p className="text-sm font-semibold mb-1.5">{item.q}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}