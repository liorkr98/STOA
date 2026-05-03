import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, UserPlus, MessageCircle, BarChart3, FileText, Star, Target, Award, Users, Flame, Trophy, TrendingUp, Eye, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MOCK_ANALYSTS, MOCK_REPORTS } from "@/lib/mockData";
import ReportCard from "@/components/feed/ReportCard";
import AccuracyBreakdown from "@/components/analyst/AccuracyBreakdown";
import { getTwits } from "@/lib/twitsStore";

const ACHIEVEMENTS = [
  { label: "First Report", icon: FileText, earned: true }, { label: "10 Predictions", icon: Target, earned: true },
  { label: "80%+ Accuracy", icon: Award, earned: true }, { label: "100 Followers", icon: Users, earned: true },
  { label: "500 Followers", icon: Users, earned: true }, { label: "First Premium", icon: Star, earned: true },
  { label: "Streak x3", icon: Flame, earned: true }, { label: "Top 10", icon: Trophy, earned: false },
];

function getSubPlans(saved) {
  return [
    { id: "basic", label: "Basic", price: parseFloat(saved?.basicPrice || 9), features: ["All full reports", "Prediction outcomes", "Comment access"], dm: false },
    { id: "pro", label: "Pro + DM", price: parseFloat(saved?.proPrice || 19), features: ["Everything in Basic", "Direct message analyst", "Live Q&A access", "Early report access"], dm: true },
  ];
}

export default function AnalystProfilePage() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const analystId = urlParams.get("id") || "a2";
  const baseAnalyst = MOCK_ANALYSTS.find(a => a.id === analystId) || MOCK_ANALYSTS[1];
  const saved = (() => { try { return JSON.parse(localStorage.getItem("stakify_profile")) || {}; } catch { return {}; } })();
  const analyst = analystId === "a1" ? { ...baseAnalyst, ...saved } : baseAnalyst;
  const myReports = MOCK_REPORTS.filter(r => r.author.id === analyst.id);
  const [following, setFollowing] = useState(false);
  const [subscriptionPlan, setSubscriptionPlan] = useState(null);
  const [showSubModal, setShowSubModal] = useState(false);
  const [showAccModal, setShowAccModal] = useState(false);
  const [showYieldModal, setShowYieldModal] = useState(false);
  const twits = analystId === "a1" ? getTwits() : [
    { id: 1, content: `Watching $${analyst.specialties?.[0]?.split(" ")[0] || "NVDA"} closely. Strong momentum into earnings. 📈`, time: "3h ago" },
    { id: 2, content: "Market breadth improving — risk-on sentiment building. Adding exposure selectively.", time: "1d ago" },
  ];
  const SUB_PLANS = getSubPlans(analystId === "a1" ? saved : {});
  const hasDM = subscriptionPlan?.dm;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Profile card */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <div className="flex items-start gap-4 mb-4">
          <img src={analyst.avatar} alt={analyst.name} className="w-16 h-16 rounded-full border-2 border-border" />
          <div className="flex-1">
            <h1 className="text-xl font-bold mb-1">{analyst.name}</h1>
            <p className="text-sm text-muted-foreground mb-3">{analyst.bio}</p>
            <div className="flex flex-wrap gap-1.5">
              {(analyst.specialties || []).map(s => (
                <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">{s}</span>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {subscriptionPlan ? (
              <div className="flex flex-col items-end gap-1">
                <span className="text-xs font-semibold text-gain bg-gain/10 border border-gain/20 rounded-full px-2.5 py-0.5">{subscriptionPlan.label} Subscriber ✓</span>
                {hasDM && (
                  <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => navigate(`/dm?analyst=${analyst.id}`)}>
                    <MessageCircle className="w-3 h-3" />DM
                  </Button>
                )}
              </div>
            ) : (
              <Button size="sm" onClick={() => setShowSubModal(true)} className="text-xs">Subscribe</Button>
            )}
            <Button size="sm" variant="outline" className="text-xs" onClick={() => setFollowing(!following)}>
              {following ? "Following ✓" : "Follow"}
            </Button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            { label: "Accuracy", value: `${analyst.accuracy}%`, icon: BarChart3, color: "text-primary", onClick: () => setShowAccModal(true) },
            { label: "Yearly Yield", value: `+${analyst.yearlyYield}%`, icon: TrendingUp, color: "text-amber-500", onClick: () => setShowYieldModal(true) },
            { label: "Followers", value: analyst.followers?.toLocaleString(), icon: UserPlus, color: "text-blue-500", onClick: null },
            { label: "Reports", value: analyst.reports, icon: FileText, color: "text-muted-foreground", onClick: null },
          ].map(stat => {
            const Icon = stat.icon;
            return (
              <button key={stat.label} onClick={stat.onClick || undefined} className={`text-center p-3 bg-secondary rounded-xl ${stat.onClick ? "hover:bg-secondary/70 cursor-pointer" : "cursor-default"} transition-all`}>
                <p className={`text-base font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-[10px] text-muted-foreground">{stat.label}{stat.onClick ? " ↗" : ""}</p>
              </button>
            );
          })}
        </div>

        {/* Extra insights */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Total Views", value: "142K", icon: Eye, color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
            { label: "Avg. Report Revenue", value: "$312", icon: DollarSign, color: "text-primary", bg: "bg-primary/5 border-primary/20" },
            { label: "Subscribers", value: "142", icon: Users, color: "text-purple-600", bg: "bg-purple-50 border-purple-200" },
          ].map(s => {
            const Icon = s.icon;
            return (
              <div key={s.label} className={`rounded-xl border p-3 text-center ${s.bg}`}>
                <Icon className={`w-4 h-4 mx-auto mb-1 ${s.color}`} />
                <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            );
          })}
        </div>
      </div>

      <AccuracyBreakdown analystName={analyst.name} />

      {/* Achievements */}
      <div className="bg-card border border-border rounded-2xl p-5 mb-6">
        <h2 className="font-semibold text-sm mb-3">Achievements <span className="text-muted-foreground">{ACHIEVEMENTS.filter(a => a.earned).length}/{ACHIEVEMENTS.length}</span></h2>
        <div className="grid grid-cols-4 gap-2">
          {ACHIEVEMENTS.map(a => {
            const Icon = a.icon;
            return (
              <div key={a.label} className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-center ${a.earned ? "bg-amber-50 border-amber-200" : "bg-secondary border-border opacity-40"}`}>
                <Icon className={`w-4 h-4 ${a.earned ? "text-amber-600" : "text-muted-foreground"}`} />
                <span className="text-[9px] font-medium leading-tight">{a.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Twits */}
      {twits.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5 mb-6">
          <h2 className="font-semibold text-sm mb-3">Quick Twits</h2>
          <div className="space-y-3">
            {twits.slice(0, 5).map(t => (
              <div key={t.id} className="flex gap-3">
                <img src={analyst.avatar} alt="" className="w-8 h-8 rounded-full flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-semibold">{analyst.name}</span>
                    <span className="text-[10px] text-muted-foreground">{t.time}</span>
                  </div>
                  <p className="text-sm text-foreground/90">{t.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reports */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <h2 className="font-semibold text-sm mb-4">Published Reports</h2>
        {myReports.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reports yet.</p>
        ) : (
          <div className="space-y-3">
            {myReports.map(r => <ReportCard key={r.id} report={r} compact />)}
          </div>
        )}
      </div>

      {/* Accuracy Modal */}
      {showAccModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAccModal(false)}>
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-base mb-1">Prediction Accuracy</h3>
            <p className="text-3xl font-bold text-primary mb-4">{analyst.accuracy}%</p>
            {[
              { label: "Long predictions hit", pct: 89, color: "bg-gain" },
              { label: "Short predictions hit", pct: 84, color: "bg-loss" },
              { label: "Hold predictions correct", pct: 78, color: "bg-amber-400" },
            ].map(row => (
              <div key={row.label} className="mb-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="font-semibold">{row.pct}%</span>
                </div>
                <div className="h-1.5 bg-secondary rounded-full"><div className={`h-full rounded-full ${row.color}`} style={{ width: `${row.pct}%` }} /></div>
              </div>
            ))}
            <div className="grid grid-cols-3 gap-2 mt-4">
              {[{ label: "Total", v: "82" }, { label: "Hit", v: "72" }, { label: "Miss", v: "10" }].map(s => (
                <div key={s.label} className="text-center bg-secondary rounded-xl p-2">
                  <p className="font-bold text-sm">{s.v}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
            <button onClick={() => setShowAccModal(false)} className="w-full text-sm text-muted-foreground hover:text-foreground mt-4">Close</button>
          </div>
        </div>
      )}

      {/* Yield Modal */}
      {showYieldModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowYieldModal(false)}>
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-base mb-1">Yearly Yield Breakdown</h3>
            <p className="text-3xl font-bold text-amber-500 mb-0.5">+{analyst.yearlyYield}%</p>
            <p className="text-xs text-muted-foreground mb-4">vs S&P 500: +12.1% · Alpha: +{(analyst.yearlyYield - 12.1).toFixed(1)}%</p>
            {[{ q: "Q1 2025", yield: "+8.2%" }, { q: "Q2 2025", yield: "+6.7%" }, { q: "Q3 2025", yield: "+11.4%" }, { q: "Q4 2025", yield: "+4.9%" }].map(row => (
              <div key={row.q} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <span className="text-sm text-muted-foreground">{row.q}</span>
                <span className="text-sm font-bold text-gain">{row.yield}</span>
              </div>
            ))}
            <button onClick={() => setShowYieldModal(false)} className="w-full text-sm text-muted-foreground hover:text-foreground mt-4">Close</button>
          </div>
        </div>
      )}

      {/* Subscription modal */}
      {showSubModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowSubModal(false)}>
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-base mb-1">Subscribe to {analyst.name}</h3>
            <p className="text-sm text-muted-foreground mb-4">Get full access to reports and predictions.</p>
            <div className="space-y-3 mb-4">
              {SUB_PLANS.map(plan => (
                <button key={plan.id} onClick={() => { setSubscriptionPlan(plan); setShowSubModal(false); }} className="w-full text-left border border-border rounded-xl p-4 hover:border-primary/40 transition-all">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm">{plan.label}</span>
                    <span className="font-bold text-primary">${plan.price.toFixed(2)}/mo</span>
                  </div>
                  <ul className="space-y-0.5">
                    {plan.features.map(f => <li key={f} className="text-xs text-muted-foreground">• ✓ {f}</li>)}
                  </ul>
                </button>
              ))}
            </div>
            <button onClick={() => setShowSubModal(false)} className="w-full text-sm text-muted-foreground hover:text-foreground">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}