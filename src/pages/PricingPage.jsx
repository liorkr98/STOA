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
      "STOA keeps 10% of subscription revenue",
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
      <div className="text-center mb-14">
        <span className="eyebrow">Pricing</span>
        <h1 className="font-serif font-medium text-foreground mt-3 mb-4 tracking-tight" style={{ fontSize: "clamp(34px,5vw,52px)", letterSpacing: "-0.025em" }}>
          Pay only for the<br />research you want.
        </h1>
        <p className="text-muted-foreground text-[16px] max-w-[520px] mx-auto leading-relaxed">
          Every researcher sets their own subscription price. Typical readers subscribe to <span className="text-foreground font-medium">2–3 researchers</span> at <span className="font-display text-foreground font-medium">$9–18/mo</span>.
        </p>
      </div>

      {/* Cards — recommended tier is unmistakable: larger scale, gold CTA,
          stronger visual weight. Other tiers visually demoted. */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start mb-16">
        {PLANS.map((plan, i) => (
          <div
            key={i}
            className={`${plan.highlight ? "surface-premium" : "surface"} flex flex-col relative`}
            style={{
              padding: plan.highlight ? "36px 30px" : "26px 24px",
              marginTop: plan.highlight ? -16 : 8,
              transform: plan.highlight ? "scale(1.02)" : "none",
            }}
          >
            {plan.badge && (
              <span className="badge-founding absolute -top-3 left-1/2 -translate-x-1/2">
                {plan.badge}
              </span>
            )}
            <p className={`text-[11px] font-medium tracking-widest uppercase mb-3 ${plan.highlight ? "text-accent" : "text-muted-foreground"}`}>{plan.name}</p>
            <div className="mb-1">
              <span
                className="font-serif font-medium text-foreground tracking-tight"
                style={{
                  fontSize: plan.price.length > 5 ? (plan.highlight ? 22 : 18) : (plan.highlight ? 48 : 36),
                  letterSpacing: "-0.025em",
                }}
              >
                {plan.price}
              </span>
            </div>
            {plan.sub && <p className="text-xs text-muted-foreground mb-4">{plan.sub}</p>}
            <ul className="space-y-3 flex-1 mt-4 mb-7">
              {plan.features.map((f, j) => (
                <li key={j} className="flex items-start gap-2.5 text-[13px] text-foreground/90">
                  <Check className={`w-4 h-4 flex-shrink-0 mt-0.5 ${plan.highlight ? "text-accent" : "text-muted-foreground"}`} />
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => navigate(plan.dest)}
              className={`w-full font-medium text-sm flex items-center justify-center gap-2 transition-colors ${
                plan.highlight
                  ? "cta-gold py-3.5"
                  : "py-2.5 border border-border text-foreground hover:bg-secondary/60"
              }`}
              style={{ borderRadius: 6 }}
            >
              {plan.cta} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* FAQ / Notes */}
      <div className="surface p-8">
        <h2 className="font-serif text-[20px] text-foreground mb-5">Frequently Asked Questions</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {[
            { q: "How much does a researcher subscription cost?", a: "Each researcher independently sets their own subscription price. Rates typically range from $5 to $99/month. Browse researcher profiles to see individual pricing." },
            { q: "Can I cancel anytime?", a: "Yes. Researcher subscriptions can be cancelled at any time. Your access continues until the end of your current billing period." },
            { q: "What does STOA take as a platform fee?", a: "STOA retains 10% of subscription revenue generated through the platform. Researchers keep 90% of all subscription income." },
            { q: "Is financial advice included?", a: "No. STOA is an information and research platform. Nothing on STOA constitutes financial advice. Always do your own research (DYOR)." },
          ].map((item, i) => (
            <div key={i}>
              <p className="text-sm font-medium text-foreground mb-1.5">{item.q}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
