import React from "react";
import { PenLine, Lock, TrendingUp, Award } from "lucide-react";

const STEPS = [
  { icon: PenLine, title: "Analysts Write Reports", desc: "Professional analysts publish research reports with their thesis, analysis, and a locked price prediction." },
  { icon: Lock, title: "Predictions are Locked", desc: "When published, the stock price is locked. The prediction target and timeframe cannot be changed retroactively." },
  { icon: TrendingUp, title: "Outcomes are Tracked", desc: "STOA automatically tracks whether predictions hit their target within the stated timeframe." },
  { icon: Award, title: "Accuracy is Verified", desc: "Each analyst's accuracy score is calculated across all their predictions, giving you a transparent track record." },
];

export default function HowItWorksPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">How It Works</h1>
      <p className="text-muted-foreground mb-10">STOA brings transparency to financial research through verified predictions.</p>
      <div className="space-y-6">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <div key={i} className="flex gap-4 p-5 bg-card border border-border rounded-2xl">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}