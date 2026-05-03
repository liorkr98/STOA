import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import StoaLogo from "@/components/StoaLogo";
import { TrendingUp, TrendingDown, ShieldCheck, Zap, BarChart2, Users, ArrowRight, CheckCircle } from "lucide-react";

const TICKERS = [
  { t: "NVDA", v: "+4.2%", up: true }, { t: "TSLA", v: "-1.8%", up: false },
  { t: "AAPL", v: "+1.1%", up: true }, { t: "META", v: "+3.4%", up: true },
  { t: "PLTR", v: "+6.7%", up: true }, { t: "AMD", v: "+2.3%", up: true },
  { t: "GOOGL", v: "-0.4%", up: false }, { t: "AMZN", v: "+1.9%", up: true },
  { t: "MSFT", v: "+0.8%", up: true }, { t: "ARM", v: "+5.1%", up: true },
];

const FEATURES = [
  { icon: ShieldCheck, title: "Locked Predictions", desc: "Every price target is cryptographically locked at publish time. No retroactive edits — ever." },
  { icon: BarChart2, title: "Track Records", desc: "Full historical accuracy scores for every analyst. See who actually delivers alpha." },
  { icon: Zap, title: "AI Fact-Checking", desc: "Every report is scanned by our Claimify engine to surface misleading claims before you read." },
  { icon: Users, title: "Analyst Community", desc: "Follow the analysts you trust, subscribe for premium research, and engage with their theses." },
];

const ANALYSTS = [
  { name: "Sarah Chen", specialty: "AI & Semiconductors", accuracy: "76%", yield: "+84%" },
  { name: "Marcus Webb", specialty: "EV & Clean Energy", accuracy: "71%", yield: "+63%" },
  { name: "Elena Rodriguez", specialty: "Big Tech", accuracy: "68%", yield: "+51%" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#09111f] text-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#09111f]/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <StoaLogo light size={28} textSize="text-xl" />
          <div className="flex items-center gap-3">
            <Link to="/signin">
              <Button variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10 text-sm">Sign In</Button>
            </Link>
            <Link to="/signin">
              <Button className="bg-primary hover:bg-primary/90 text-white text-sm px-5">Get Started Free</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Ticker Tape */}
      <div className="overflow-hidden border-b border-white/10 bg-white/5 py-2">
        <div className="flex gap-8 animate-[ticker_30s_linear_infinite] whitespace-nowrap w-max">
          {[...TICKERS, ...TICKERS].map((t, i) => (
            <span key={i} className="flex items-center gap-1.5 text-xs font-mono">
              <span className="font-bold text-white/90">${t.t}</span>
              <span className={t.up ? "text-green-400" : "text-red-400"}>{t.v}</span>
              {t.up ? <TrendingUp className="w-3 h-3 text-green-400" /> : <TrendingDown className="w-3 h-3 text-red-400" />}
            </span>
          ))}
        </div>
      </div>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-primary/20 border border-primary/30 rounded-full px-4 py-1.5 text-xs font-semibold text-primary mb-8">
          <Zap className="w-3 h-3" /> AI-powered financial research platform
        </div>
        <h1 className="text-5xl sm:text-6xl font-extrabold leading-tight mb-6 tracking-tight">
          Research you can<br />
          <span className="text-primary">actually trust.</span>
        </h1>
        <p className="text-lg text-white/60 max-w-2xl mx-auto mb-10">
          Every prediction locked on publish. Every analyst's track record transparent. Every claim fact-checked by AI. No noise — just verified alpha.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/signin">
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-white px-8 text-base">
              Start Reading Free <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
          <Link to="/how-it-works">
            <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 px-8 text-base">
              How It Works
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map(f => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-primary/40 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-bold mb-2">{f.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Top Analysts */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold mb-3">Top Analysts on Stoa</h2>
          <p className="text-white/50">Verified track records. Real predictions. Transparent performance.</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
          {ANALYSTS.map(a => (
            <div key={a.name} className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
              <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center text-xl font-bold text-primary mx-auto mb-3">
                {a.name[0]}
              </div>
              <p className="font-bold">{a.name}</p>
              <p className="text-xs text-white/50 mb-3">{a.specialty}</p>
              <div className="flex justify-around text-sm">
                <div>
                  <p className="font-bold text-primary">{a.accuracy}</p>
                  <p className="text-[10px] text-white/40">Accuracy</p>
                </div>
                <div>
                  <p className="font-bold text-green-400">{a.yield}</p>
                  <p className="text-[10px] text-white/40">Avg Yield</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-4 py-16 text-center">
        <div className="bg-primary/10 border border-primary/20 rounded-3xl p-12">
          <h2 className="text-3xl font-bold mb-4">Ready to find your edge?</h2>
          <p className="text-white/60 mb-8 max-w-xl mx-auto">Join thousands of investors who read verified research on Stoa. Free to start.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-6">
            <Link to="/signin">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-white px-10 text-base">
                Create Free Account
              </Button>
            </Link>
          </div>
          <div className="flex flex-wrap justify-center gap-4 text-xs text-white/40">
            {["No credit card required", "Free reports daily", "Cancel anytime"].map(t => (
              <span key={t} className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-primary" />{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 text-center text-xs text-white/30">
        <p>© 2026 Stoa Research. All rights reserved.</p>
      </footer>

      <style>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}