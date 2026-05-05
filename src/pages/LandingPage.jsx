import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { setMeta, injectJsonLd } from "@/lib/seo";
import { BarChart2, Shield, Star, TrendingUp, Check, ArrowRight, ChevronRight } from "lucide-react";
import StoaLogo from "@/components/StoaLogo";
import { base44 } from "@/api/base44Client";

const TICKERS_DATA = [
  { t: "NVDA", chg: "+3.24%", up: true }, { t: "AAPL", chg: "+0.87%", up: true },
  { t: "TSLA", chg: "-1.42%", up: false }, { t: "MSFT", chg: "+1.15%", up: true },
  { t: "GOOGL", chg: "+2.03%", up: true }, { t: "AMD", chg: "-0.78%", up: false },
  { t: "META", chg: "+4.11%", up: true }, { t: "AMZN", chg: "+0.56%", up: true },
  { t: "NFLX", chg: "+1.89%", up: true }, { t: "COIN", chg: "-2.34%", up: false },
];

const FEATURES = [
  { icon: BarChart2, title: "Deep Research Reports", desc: "Institutional-quality equity research from verified analysts with real, auditable track records." },
  { icon: TrendingUp, title: "Locked Predictions", desc: "Every call is timestamped at lock time. No editing. No cherry-picking. Pure accountability." },
  { icon: Shield, title: "Verified Performance", desc: "Analyst accuracy is calculated algorithmically. You always know exactly who to trust." },
  { icon: Star, title: "Subscribe to the Best", desc: "Follow top analysts, get instant alerts, and access premium research before everyone else." },
];

const PLANS = [
  { name: "Free", price: "$0", period: "forever", features: ["Browse analyst profiles", "3 free reports/month", "Market news feed", "Trending stocks"], cta: "Get Started", highlight: false },
  { name: "Pro", price: "$19", period: "/month", features: ["Unlimited reports", "Full analyst history", "Prediction tracker", "Priority alerts", "Premium research"], cta: "Start Free Trial", highlight: true },
  { name: "Analyst", price: "$49", period: "/month", features: ["Everything in Pro", "Publish your research", "Monetize your calls", "Analytics dashboard", "Wallet & withdrawals"], cta: "Become an Analyst", highlight: false },
];

function TickerTape() {
  const items = [...TICKERS_DATA, ...TICKERS_DATA];
  return (
    <div className="overflow-hidden bg-slate-900/80 border-y border-slate-700/50 py-3 backdrop-blur">
      <div className="flex gap-10 animate-[marquee_35s_linear_infinite] whitespace-nowrap w-max">
        {items.map((item, i) => (
          <span key={i} className="flex items-center gap-2 text-sm font-mono">
            <span className="text-slate-400 font-semibold">{item.t}</span>
            <span className={item.up ? "text-emerald-400" : "text-red-400"}>{item.chg}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    setMeta({
      title: "STOA — Verified Financial Research",
      description: "Follow verified analysts with real track records. Every prediction is locked, timestamped, and performance-tracked. The research platform for serious investors.",
    });
    injectJsonLd("jsonld-org", {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "STOA",
      "url": "https://stakify-f5b3c3a0.base44.app",
      "description": "Verified financial research platform with locked predictions and analyst track records.",
    });
  }, []);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  useEffect(() => {
    Promise.all([
      base44.entities.User.list(undefined, 1).catch(() => []),
      base44.entities.Report.filter({ status: "published" }, undefined, 1).catch(() => []),
    ]).then(([users, reports]) => {
      setStats({ analysts: users?.length || 0, reports: reports?.length || 0 });
    }).catch(() => {});
  }, []);

  const go = () => base44.auth.redirectToLogin("/");

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      <style>{`
        @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        .fade-up { animation: fadeUp 0.7s ease forwards; }
        .fade-up-2 { animation: fadeUp 0.7s 0.15s ease forwards; opacity: 0; }
        .fade-up-3 { animation: fadeUp 0.7s 0.3s ease forwards; opacity: 0; }
      `}</style>

      {/* Nav */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? "bg-[#0a0a0f]/95 backdrop-blur-md border-b border-white/5 shadow-2xl" : ""}`}>
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <StoaLogo light size={26} textSize="text-lg" />
          <div className="hidden md:flex items-center gap-7 text-sm text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how" className="hover:text-white transition-colors">How it Works</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={go} className="text-sm text-slate-300 hover:text-white px-4 py-2 transition-colors">
              Log in
            </button>
            <button onClick={go} className="bg-white text-[#0a0a0f] text-sm font-bold px-5 py-2 rounded-full hover:bg-slate-100 transition-colors">
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex flex-col justify-center pt-16">
        {/* Multi-layer gradient background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-[#0d0d1a] via-[#0a0a0f] to-[#0a0a0f]" />
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
            <div className="absolute top-[-20%] left-[20%] w-[600px] h-[600px] bg-blue-600/8 rounded-full blur-[120px]" />
            <div className="absolute top-[-10%] right-[10%] w-[400px] h-[400px] bg-purple-600/6 rounded-full blur-[100px]" />
          </div>
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-5 py-20 text-center">
          <div className="fade-up inline-flex items-center gap-2 border border-white/10 bg-white/5 rounded-full px-4 py-1.5 text-xs text-slate-300 mb-8 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            The research platform for serious investors
          </div>

          <h1 className="fade-up-2 text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-black leading-[1.0] tracking-tight mb-6 mx-auto max-w-4xl">
            Your edge
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-cyan-300 bg-clip-text text-transparent">
              in the markets
            </span>
          </h1>

          <p className="fade-up-3 text-lg text-slate-400 max-w-xl mx-auto mb-10 leading-relaxed">
            Follow verified analysts. Track every prediction. Subscribe to premium research.
            Every call is locked, timestamped, and performance-tracked.
          </p>

          <div className="fade-up-3 flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <button onClick={go} className="bg-white text-[#0a0a0f] font-bold px-8 py-4 rounded-full text-base hover:bg-slate-100 transition-all hover:scale-105 flex items-center gap-2 shadow-2xl">
              Start for Free <ArrowRight className="w-4 h-4" />
            </button>
            <a href="#how" className="text-slate-300 border border-white/15 hover:border-white/30 font-semibold px-8 py-4 rounded-full text-base transition-colors">
              See How It Works
            </a>
          </div>

          {/* Stat row — only show when there's real data */}
          {stats && (stats.analysts > 0 || stats.reports > 0) && (
            <div className="fade-up-3 flex flex-wrap justify-center gap-6">
              {[
                { val: stats.analysts.toLocaleString(), label: "Analysts" },
                { val: stats.reports.toLocaleString(), label: "Published Reports" },
              ].map((s, i) => (
                <div key={i} className="text-center">
                  <p className="text-2xl font-black text-white">{s.val}</p>
                  <p className="text-xs text-slate-500">{s.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <TickerTape />

      {/* Features */}
      <section id="features" className="py-28 bg-[#0a0a0f]">
        <div className="max-w-6xl mx-auto px-5">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black mb-4">Built for serious investors</h2>
            <p className="text-slate-400 text-lg max-w-lg mx-auto">Everything you need to find, follow, and profit from the best research.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="border border-white/8 bg-white/3 rounded-2xl p-6 hover:border-blue-500/30 hover:bg-white/5 transition-all group">
                  <div className="w-11 h-11 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-500/20 transition-colors">
                    <Icon className="w-5 h-5 text-blue-400" />
                  </div>
                  <h3 className="font-bold text-base mb-2">{f.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-28 border-t border-white/5">
        <div className="max-w-5xl mx-auto px-5">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black mb-4">How Stoa Works</h2>
            <p className="text-slate-400 text-lg">Three steps to smarter investing.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-10">
            {[
              { num: "01", title: "Discover Analysts", desc: "Browse ranked analysts by accuracy, yield, and sector. Every metric is algorithmically verified — no self-reporting." },
              { num: "02", title: "Follow & Subscribe", desc: "Follow free analysts or unlock premium research. Get instant alerts the moment they publish or lock a new prediction." },
              { num: "03", title: "Track Everything", desc: "Every prediction is locked at publish time. Watch it play out in real time with live P&L and outcome tracking." },
            ].map((step, i) => (
              <div key={i} className="relative">
                <div className="text-8xl font-black text-white/5 mb-3 leading-none select-none">{step.num}</div>
                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{step.desc}</p>
                {i < 2 && <ChevronRight className="hidden md:block absolute top-10 -right-5 w-5 h-5 text-white/10" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-28 border-t border-white/5">
        <div className="max-w-5xl mx-auto px-5">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black mb-4">Simple Pricing</h2>
            <p className="text-slate-400 text-lg">Start free. Upgrade when you're ready.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5 items-start">
            {PLANS.map((plan, i) => (
              <div key={i} className={`rounded-2xl p-7 border transition-all ${plan.highlight ? "bg-blue-600 border-blue-500 md:-mt-4 shadow-2xl shadow-blue-900/40" : "bg-white/3 border-white/10 hover:border-white/20"}`}>
                <p className={`text-sm font-semibold mb-1 ${plan.highlight ? "text-blue-200" : "text-slate-400"}`}>{plan.name}</p>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-5xl font-black">{plan.price}</span>
                  <span className={`text-sm ${plan.highlight ? "text-blue-200" : "text-slate-500"}`}>{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-7">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2.5 text-sm">
                      <Check className={`w-4 h-4 flex-shrink-0 ${plan.highlight ? "text-blue-100" : "text-emerald-400"}`} />
                      <span className={plan.highlight ? "text-blue-50" : "text-slate-300"}>{f}</span>
                    </li>
                  ))}
                </ul>
                <button onClick={go} className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${plan.highlight ? "bg-white text-blue-600 hover:bg-blue-50" : "bg-white/8 text-white hover:bg-white/15 border border-white/10"}`}>
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-28 border-t border-white/5">
        <div className="max-w-2xl mx-auto px-5 text-center">
          <h2 className="text-4xl md:text-5xl font-black mb-5">Ready to invest smarter?</h2>
          <p className="text-slate-400 mb-10 text-lg">Join thousands of investors relying on Stoa for verified, accountable research.</p>
          <button onClick={go} className="bg-white text-[#0a0a0f] font-bold px-10 py-4 rounded-full text-lg hover:bg-slate-100 transition-all hover:scale-105 inline-flex items-center gap-2 shadow-2xl">
            Get Started Free <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8">
        <div className="max-w-6xl mx-auto px-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <StoaLogo light size={22} textSize="text-sm" />
          <p className="text-xs text-slate-600">© 2026 Stoa. Not financial advice. DYOR.</p>
          <div className="flex gap-5 text-xs text-slate-600">
            <Link to="/terms" className="hover:text-slate-300 transition-colors">Terms</Link>
            <Link to="/privacy" className="hover:text-slate-300 transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}