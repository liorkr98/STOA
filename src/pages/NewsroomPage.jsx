import React from "react";

const NEWS = [
  { date: "May 1, 2026", title: "STOA Reaches 50,000 Registered Analysts", excerpt: "The platform's analyst community has grown 3x in Q1 2026, driven by increased demand for transparent financial research." },
  { date: "Apr 15, 2026", title: "Introducing AI Research Assistant", excerpt: "STOA now offers an AI-powered writing assistant to help analysts produce higher quality research reports faster." },
  { date: "Mar 22, 2026", title: "STOA Prediction Accuracy Methodology Updated", excerpt: "We've improved our prediction scoring algorithm to better reflect partial hits and directional accuracy." },
  { date: "Feb 10, 2026", title: "Premium Report Monetization Now Available", excerpt: "Analysts can now charge for their research reports, with STOA taking a 15% platform fee." },
];

export default function NewsroomPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">Newsroom</h1>
      <p className="text-muted-foreground mb-8">Latest news and updates from STOA.</p>
      <div className="space-y-4">
        {NEWS.map((item, i) => (
          <div key={i} className="p-5 bg-card border border-border rounded-2xl">
            <p className="text-xs text-muted-foreground mb-1">{item.date}</p>
            <h3 className="font-semibold text-base mb-2">{item.title}</h3>
            <p className="text-sm text-muted-foreground">{item.excerpt}</p>
          </div>
        ))}
      </div>
    </div>
  );
}