import React from "react";

export default function CalculationsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">Scoring & Calculations</h1>
      <p className="text-muted-foreground mb-8">How STOA calculates analyst accuracy and prediction scores.</p>
      <div className="space-y-6">
        {[
          { title: "Exact Hit (100% credit)", desc: "The stock price reaches the target price within the stated timeframe, within 5% variance." },
          { title: "Near Hit (50% credit)", desc: "The price moves in the correct direction and gets within 5–15% of the target." },
          { title: "Directional (25% credit)", desc: "The price moves in the correct direction but only gets 15–30% of the way to the target." },
          { title: "Miss (0% credit)", desc: "The price does not meaningfully move toward the target within the stated timeframe." },
          { title: "Overall Accuracy", desc: "Calculated as (total credits earned / total predictions) × 100%. This gives a weighted accuracy that rewards near hits." },
          { title: "Yearly Yield", desc: "The average percentage gain from all locked predictions (including misses weighted at 0), annualized." },
        ].map(item => (
          <div key={item.title} className="p-5 bg-card border border-border rounded-2xl">
            <h3 className="font-semibold mb-1">{item.title}</h3>
            <p className="text-sm text-muted-foreground">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}