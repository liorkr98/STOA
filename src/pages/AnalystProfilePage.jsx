import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { setMeta } from "@/lib/seo";
import { ArrowLeft, UserPlus, MessageCircle, BarChart3, FileText, Star, Target, Users, Flame, Trophy, TrendingUp, Eye, DollarSign, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import ReportCard from "@/components/feed/ReportCard";
import AccuracyBreakdown from "@/components/analyst/AccuracyBreakdown";
import PerformanceVsMarket from "@/components/analyst/PerformanceVsMarket";

const ACHIEVEMENT_DEFS = [
  { label: "First Report", icon: FileText },
  { label: "10 Predictions", icon: Target },
  { label: "80%+ Accuracy", icon: BarChart3 },
  { label: "100 Followers", icon: Users },
  { label: "500 Followers", icon: Users },
  { label: "First Premium", icon: Star },
  { label: "Streak x3", icon: Flame },
  { label: "Top 10", icon: Trophy },
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
  const analystId = urlParams.get("id");

  const [analyst, setAnalyst] = useState(null);
  const [myReports, setMyReports] = useState([]);
  const [twits, setTwits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [following, setFollowing] = useState(false);
  const [subscriptionPlan, setSubscriptionPlan] = useState(null);
  const [showSubModal, setShowSubModal] = useState(false);
  const [showAccModal, setShowAccModal] = useState(false);
  const [showYieldModal, setShowYieldModal] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const me = await base44.auth.me().catch(() => null);
        setCurrentUserId(me?.id || null);

        let userData;
        if (!analystId || analystId === me?.id) {
          userData = me;
        } else {
          const users = await base44.entities.User.filter({ id: analystId });
          userData = users?.[0] || null;
        }

        if (userData) {
          setAnalyst(userData);
          setMeta({
            title: `${userData.full_name || userData.email?.split("@")[0] || "Analyst"} — Analyst Profile`,
            description: `${userData.accuracy_score || 0}% prediction accuracy. Follow ${userData.full_name || "this analyst"} on STOA for verified financial research.`,
            image: userData.picture,
          });
          const reports = await base44.entities.Report.filter({ created_by: userData.email }, "-created_date", 20).catch(() => []);
          setMyReports(reports || []);
          const twitData = await base44.entities.Twit.filter({ author_id: userData.id }, "-created_date", 5).catch(() => []);
          setTwits(twitData || []);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [analystId]);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  if (!analyst) return (
    <div className="max-w-3xl mx-auto px-4 py-12 text-center">
      <p className="text-muted-foreground">Analyst not found.</p>
      <Button onClick={() => navigate(-1)} variant="outline" className="mt-4 text-sm">Go Back</Button>
    </div>
  );

  const isOwnProfile = analyst.id === currentUserId;
  const displayName = analyst.full_name || analyst.email?.split("@")[0] || "Analyst";
  const saved = (() => { try { return JSON.parse(localStorage.getItem("stakify_profile")) || {}; } catch { return {}; } })();
  const SUB_PLANS = getSubPlans(isOwnProfile ? saved : {});
  const hasDM = subscriptionPlan?.dm;

  const achievements = ACHIEVEMENT_DEFS.map(a => ({
    ...a,
    earned: false, // only known from real data — start false
  }));

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Profile card */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <div className="flex items-start gap-4 mb-4">
          {analyst.picture
            ? <img src={analyst.picture} alt={displayName} loading="lazy" className="w-16 h-16 rounded-full border-2 border-border object-cover" />
            : <div className="w-16 h-16 rounded-full border-2 border-border bg-secondary flex items-center justify-center text-2xl font-bold text-primary">{displayName?.[0] || "A"}</div>
          }
          <div className="flex-1">
            <h1 className="text-xl font-bold mb-1">{displayName}</h1>
            {analyst.tagline && <p className="text-sm text-muted-foreground mb-2">{analyst.tagline}</p>}
            {analyst.bio && <p className="text-sm text-muted-foreground mb-3">{analyst.bio}</p>}
            <div className="flex flex-wrap gap-1.5">
              {(analyst.specialties || []).map(s => (
                <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">{s}</span>
              ))}
            </div>
          </div>
          {!isOwnProfile && (
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
                {following ? "Following ✓" : <><UserPlus className="w-3 h-3 mr-1" />Follow</>}
              </Button>
            </div>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            { label: "Accuracy", value: analyst.accuracy_score > 0 ? `${analyst.accuracy_score.toFixed(1)}%` : "—", icon: BarChart3, color: "text-primary", onClick: analyst.accuracy_score > 0 ? () => setShowAccModal(true) : null },
            { label: "Yearly Yield", value: analyst.yearly_yield > 0 ? `+${analyst.yearly_yield.toFixed(1)}%` : "—", icon: TrendingUp, color: "text-amber-500", onClick: analyst.yearly_yield > 0 ? () => setShowYieldModal(true) : null },
            { label: "Followers", value: (analyst.followers_count || 0).toLocaleString(), icon: UserPlus, color: "text-blue-500", onClick: null },
            { label: "Reports", value: myReports.length, icon: FileText, color: "text-muted-foreground", onClick: null },
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

        {/* Extra insights — views and revenue only visible to owner */}
        <div className="grid grid-cols-3 gap-2">
          {[
            ...(isOwnProfile ? [
              { label: "Total Views", value: "—", icon: Eye, color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
              { label: "Avg. Report Revenue", value: "—", icon: DollarSign, color: "text-primary", bg: "bg-primary/5 border-primary/20" },
            ] : []),
            { label: "Subscribers", value: "—", icon: Users, color: "text-purple-600", bg: "bg-purple-50 border-purple-200" },
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

      <AccuracyBreakdown analystName={displayName} />
      <PerformanceVsMarket analyst={analyst} />

      {/* Achievements */}
      <div className="bg-card border border-border rounded-2xl p-5 mb-6">
        <h2 className="font-semibold text-sm mb-3">Achievements <span className="text-muted-foreground">0/{achievements.length}</span></h2>
        <div className="grid grid-cols-4 gap-2">
          {achievements.map(a => {
            const Icon = a.icon;
            return (
              <div key={a.label} className="flex flex-col items-center gap-1 p-2 rounded-xl border text-center bg-secondary border-border opacity-40">
                <Icon className="w-4 h-4 text-muted-foreground" />
                <span className="text-[9px] font-medium leading-tight">{a.label}</span>
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 text-center">Achievements unlock as you publish reports and hit predictions</p>
      </div>

      {/* Twits */}
      {twits.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5 mb-6">
          <h2 className="font-semibold text-sm mb-3">Quick Twits</h2>
          <div className="space-y-3">
            {twits.map(t => (
              <div key={t.id} className="flex gap-3">
                {analyst.picture
                  ? <img src={analyst.picture} alt="" className="w-8 h-8 rounded-full flex-shrink-0 object-cover" />
                  : <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">{displayName?.[0]}</div>
                }
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-semibold">{displayName}</span>
                    <span className="text-[10px] text-muted-foreground">{new Date(t.created_date).toLocaleDateString()}</span>
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
          <p className="text-sm text-muted-foreground">No reports published yet.</p>
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
            <p className="text-3xl font-bold text-primary mb-4">{analyst.accuracy_score?.toFixed(1)}%</p>
            <p className="text-sm text-muted-foreground mb-4">Based on resolved locked predictions using STOA's weighted scoring system.</p>
            <button onClick={() => setShowAccModal(false)} className="w-full text-sm text-muted-foreground hover:text-foreground mt-2">Close</button>
          </div>
        </div>
      )}

      {/* Yield Modal */}
      {showYieldModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowYieldModal(false)}>
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-base mb-1">Yearly Yield</h3>
            <p className="text-3xl font-bold text-amber-500 mb-4">+{analyst.yearly_yield?.toFixed(1)}%</p>
            <p className="text-sm text-muted-foreground">Average annualized return across all resolved predictions.</p>
            <button onClick={() => setShowYieldModal(false)} className="w-full text-sm text-muted-foreground hover:text-foreground mt-4">Close</button>
          </div>
        </div>
      )}

      {/* Subscription modal */}
      {showSubModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowSubModal(false)}>
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-base mb-1">Subscribe to {displayName}</h3>
            <p className="text-sm text-muted-foreground mb-4">Get full access to reports and predictions.</p>
            <div className="space-y-3 mb-4">
              {SUB_PLANS.map(plan => (
                <button key={plan.id} onClick={() => { setSubscriptionPlan(plan); setShowSubModal(false); }} className="w-full text-left border border-border rounded-xl p-4 hover:border-primary/40 transition-all">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm">{plan.label}</span>
                    <span className="font-bold text-primary">${plan.price.toFixed(2)}/mo</span>
                  </div>
                  <ul className="space-y-0.5">
                    {plan.features.map(f => <li key={f} className="text-xs text-muted-foreground">✓ {f}</li>)}
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