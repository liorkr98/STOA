import React from "react";
import { BarChart3, Lock, Users, Sparkles, TrendingUp, Bell } from "lucide-react";

const FEATURES = [
  { icon: Lock, title: "Locked Predictions", desc: "All predictions are locked at time of publish. No retroactive changes — ever." },
  { icon: BarChart3, title: "Verified Accuracy Scores", desc: "Every analyst's accuracy is mathematically calculated and publicly visible." },
  { icon: Sparkles, title: "AI-Powered Research Tools", desc: "AI assistant, fact checker, and template generator to help analysts write better reports." },
  { icon: Users, title: "Follow Top Analysts", desc: "Subscribe to analysts, get notified of new reports and prediction outcomes." },
  { icon: TrendingUp, title: "Real-Time Stock Data", desc: "Integrated TradingView charts and live stock data for every ticker." },
  { icon: Bell, title: "Smart Notifications", desc: "Get notified when predictions hit or miss, and when new reports are published." },
];

export default function FeaturesPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">Features</h1>
      <p className="text-muted-foreground mb-10">Everything you need to follow, analyze, and create financial research.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {FEATURES.map((f) => {
          const Icon = f.icon;
          return (
            <div key={f.title} className="p-5 bg-card border border-border rounded-2xl">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                <Icon className="w-4.5 h-4.5 text-primary" />
              </div>
              <h3 className="font-semibold text-sm mb-1">{f.title}</h3>
              <p className="text-xs text-muted-foreground">{f.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}