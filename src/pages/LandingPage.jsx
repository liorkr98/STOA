import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { TrendingUp, TrendingDown, BarChart2, Shield, Star, ChevronRight, Check, ArrowRight } from "lucide-react";
import StoaLogo from "@/components/StoaLogo";
import { base44 } from "@/api/base44Client";

const TICKERS = ["NVDA", "AAPL", "TSLA", "MSFT", "GOOGL", "AMD", "META", "AMZN", "NFLX", "JPM", "COIN", "PLTR"];

const FEATURES = [
  { icon: BarChart2, title: "Deep Research Reports", desc: "Access institutional-quality equity research from verified analysts with real track records." },
  { icon: TrendingUp, title: "Locked Predictions", desc: "Every call is timestamped and verified. No editing, no cherry-picking. Pure accountability." },
  { icon: Shield, title: "Verified Performance", desc: "Analyst accuracy is calculated algorithmically — you always know who to trust." },
  { icon: Star, title: "Subscribe to the Best", desc: "Follow your favorite analysts and get notified the moment they publish new research." },
];

const PLANS = [
  { name: "Free", price: "$0", period: "forever", features: ["3 free reports/month", "Basic analyst profiles", "Market news feed", "Trending stocks"], cta: "Get Started", highlight: false },
  { name: "Pro", price: "$19", period: "per month", features: ["Unlimited reports", "Full analyst history", "Prediction tracker", "Priority alerts", "Premium research"], cta: "Start Free Trial", highlight: true },
  { name: "Analyst", price: "$49", period: "per month", features: ["Everything in Pro", "Publish research", "Monetize your calls", "Analytics dashboard", "Direct messaging"], cta: "Become an Analyst", highlight: false },
];

function TickerTape() {
  const items = [...TICKERS, ...TICKERS];
  return (
    <div className="overflow-hidden bg-slate-900 border-y border-slate-700 py-2.5">
      <div className="flex gap-8 animate-[marquee_30s_linear_infinite] whitespace-nowrap">
        {items.map((t, i) => (
          <span key={i} className="flex items-center gap-2 text-sm font-mono text-slate-200">
            <span className="text-slate-400">{t}</span>
            <span className="text-emerald-400">▲ {(Math.random() * 5 + 0.5).toFixed(2)}%</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const handleLogin = () => base44.auth.redirectToLogin("/");

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Sticky Nav */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-slate-950/95 backdrop-blur border-b border-slate-800 shadow-xl" : "bg-transparent"}`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <StoaLogo light size={26} textSize="text-lg" />
          <nav className="hidden md:flex items-center gap-8 text-sm text-slate-300">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how" className="hover:text-white transition-colors">How it Works</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </nav>
          <div className="flex items-center gap-3">
            <button onClick={handleLogin} className="text-sm text-slate-300 hover:text-white transition-colors px-3 py-1.5">
              Log in
            </button>
            <button onClick={handleLogin} className="bg-white text-slate-900 text-sm font-semibold px-4 py-2 rounded-full hover:bg-slate-100 transition-colors">
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative min-h-screen flex flex-col justify-center overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-slate-950 to-slate-950" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-blue-600/10 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-16">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 text-sm text-blue-300 mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              The research platform for serious investors
            </div>
            <h1 className="text-6xl sm:text-7xl md:text-8xl font-black leading-[0.9] tracking-tight mb-6">
              Your edge in
              <br />
              <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">the markets</span>
            </h1>
            <p className="text-xl text-slate-300 max-w-2xl mb-10 leading-relaxed">
              Follow verified analysts. Track their predictions. Subscribe to premium research.
              Every call is locked, timestamped, and performance-tracked.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button onClick={handleLogin} className="bg-blue-500 hover:bg-blue-400 text-white font-bold px-8 py-4 rounded-2xl text-lg transition-all hover:scale-105 flex items-center gap-2">
                Start for Free <ArrowRight className="w-5 h-5" />
              </button>
              <a href="#how" className="border border-slate-600 hover:border-slate-400 text-slate-200 font-semibold px-8 py-4 rounded-2xl text-lg transition-colors text-center">
                See How It Works
              </a>
            </div>
          </div>

          {/* Floating stat cards */}
          <div className="flex flex-wrap gap-4 mt-16">
            {[
              { val: "10,000+", label: "Analysts tracked" },
              { val: "98.3%", label: "Prediction accuracy recorded" },
              { val: "$2.4B+", label: "Portfolio value managed" },
              { val: "50,000+", label: "Reports published" },
            ].map((s, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 backdrop-blur">
                <p className="text-2xl font-black text-white">{s.val}</p>
                <p className="text-sm text-slate-400">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ticker tape */}
      <TickerTape />

      {/* Features */}
      <section id="features" className="py-24 bg-slate-950">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black mb-4">Built for serious investors</h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">Everything you need to follow, analyze, and act on the best research available.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-blue-500/40 hover:bg-slate-900/80 transition-all group">
                  <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-500/20 transition-colors">
                    <Icon className="w-6 h-6 text-blue-400" />
                  </div>
                  <h3 className="font-bold text-lg mb-2 text-white">{f.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-24 bg-gradient-to-b from-slate-950 to-slate-900">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black mb-4">How Stoa Works</h2>
            <p className="text-slate-400 text-lg">Three steps to smarter investing.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { num: "01", title: "Discover Analysts", desc: "Browse verified analysts ranked by accuracy, yield, and specialization. Every stat is algorithmically verified — no self-reporting." },
              { num: "02", title: "Follow & Subscribe", desc: "Follow free analysts or subscribe to premium research. Get alerted the moment they publish new reports or lock in predictions." },
              { num: "03", title: "Track Everything", desc: "Every prediction is timestamped at lock time. Watch the thesis play out in real time with live P&L tracking." },
            ].map((step, i) => (
              <div key={i} className="relative">
                <div className="text-7xl font-black text-slate-800 mb-4 leading-none">{step.num}</div>
                <h3 className="text-xl font-bold mb-3 text-white">{step.title}</h3>
                <p className="text-slate-400 leading-relaxed">{step.desc}</p>
                {i < 2 && <ChevronRight className="hidden md:block absolute top-8 -right-4 w-6 h-6 text-slate-700" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 bg-slate-900">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black mb-4">Simple Pricing</h2>
            <p className="text-slate-400 text-lg">Start free. Upgrade when you're ready.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {PLANS.map((plan, i) => (
              <div key={i} className={`rounded-2xl p-6 border transition-all ${plan.highlight ? "bg-blue-600 border-blue-500 scale-105 shadow-2xl shadow-blue-900/50" : "bg-slate-800 border-slate-700 hover:border-slate-600"}`}>
                <h3 className="font-bold text-xl mb-1">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-black">{plan.price}</span>
                  <span className={`text-sm ${plan.highlight ? "text-blue-200" : "text-slate-400"}`}>{plan.period}</span>
                </div>
                <ul className="space-y-3 my-6">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm">
                      <Check className={`w-4 h-4 flex-shrink-0 ${plan.highlight ? "text-blue-200" : "text-emerald-400"}`} />
                      <span className={plan.highlight ? "text-blue-100" : "text-slate-300"}>{f}</span>
                    </li>
                  ))}
                </ul>
                <button onClick={handleLogin} className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${plan.highlight ? "bg-white text-blue-600 hover:bg-blue-50" : "bg-slate-700 text-white hover:bg-slate-600"}`}>
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-gradient-to-b from-slate-900 to-slate-950">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-5xl font-black mb-6">Ready to invest smarter?</h2>
          <p className="text-slate-400 text-lg mb-10">Join thousands of investors who rely on Stoa for verified, accountable research.</p>
          <button onClick={handleLogin} className="bg-blue-500 hover:bg-blue-400 text-white font-bold px-10 py-4 rounded-2xl text-xl transition-all hover:scale-105 inline-flex items-center gap-2">
            Get Started Free <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 bg-slate-950">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <StoaLogo light size={22} textSize="text-base" />
          <p className="text-xs text-slate-500">© 2026 Stoa. Not financial advice. Do your own research.</p>
          <div className="flex gap-6 text-xs text-slate-500">
            <Link to="/terms" className="hover:text-slate-300">Terms</Link>
            <Link to="/privacy" className="hover:text-slate-300">Privacy</Link>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}