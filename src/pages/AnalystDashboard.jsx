import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Target, TrendingUp, FileText, Star, Flame, Trophy, Users, Zap, ArrowUp, ArrowDown, Minus, BookOpen, Rocket, Shield, CheckCircle, BarChart3, ChevronRight, PenLine, Loader2 } from "lucide-react";
import { format } from "date-fns";
import RevenueInsightsPanel from "@/components/dashboard/RevenueInsightsPanel";
import TwitsPanel from "@/components/dashboard/TwitsPanel";
import InsightsPanel from "@/components/dashboard/InsightsPanel";
import { useNavigate, Link } from "react-router-dom";
import { calculateAccuracyScore } from "@/lib/accuracyEngine";

const ACTION_ICONS = { Long: ArrowUp, Short: ArrowDown, Hold: Minus };

export default function AnalystDashboard() {
  const [tab, setTab] = useState("published");
  const [boosts, setBoosts] = useState({ r6: true });
  const [profileBoosted, setProfileBoosted] = useState(false);
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(null);
  const [myReports, setMyReports] = useState([]);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingReports, setLoadingReports] = useState(true);

  useEffect(() => {
    base44.auth.me().then(user => setCurrentUser(user)).finally(() => setLoadingUser(false));
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    base44.entities.Report.filter({ created_by: currentUser.email }, "-created_date", 50)
      .then(data => setMyReports(data || []))
      .finally(() => setLoadingReports(false));
  }, [currentUser]);

  const localDrafts = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("stoa_drafts")) || []; } catch { return []; }
  }, []);

  const predictions = useMemo(() => myReports.filter(r => r.prediction_action), [myReports]);

  const accuracyScore = useMemo(() => {
    if (predictions.length === 0) return 0;
    const mapped = predictions.map(r => ({
      action: r.prediction_action,
      lockPrice: r.prediction_lock_price,
      targetPrice: r.prediction_target_price,
      lockTime: r.prediction_lock_time,
      timeframe: r.prediction_timeframe,
      outcome: null,
    }));
    return calculateAccuracyScore(mapped).toFixed(1);
  }, [predictions]);

  const achievements = useMemo(() => {
    if (!currentUser) return [];
    const hasFirstReport = myReports.length >= 1;
    const has10Preds = predictions.length >= 10;
    const has80Acc = parseFloat(accuracyScore) >= 80;
    const has100Followers = (currentUser.followers_count || 0) >= 100;
    const has500Followers = (currentUser.followers_count || 0) >= 500;
    const hasFirstPremium = myReports.some(r => r.is_premium);
    const hasStreak3 = false; // requires resolved prediction data
    const isTop10 = currentUser.leaderboard_rank > 0 && currentUser.leaderboard_rank <= 10;
    return [
      { label: "First Report", icon: FileText, earned: hasFirstReport },
      { label: "10 Predictions", icon: Target, earned: has10Preds },
      { label: "80%+ Accuracy", icon: BarChart3, earned: has80Acc },
      { label: "100 Followers", icon: Users, earned: has100Followers },
      { label: "500 Followers", icon: Users, earned: has500Followers },
      { label: "First Premium Report", icon: Star, earned: hasFirstPremium },
      { label: "Streak x3", icon: Flame, earned: hasStreak3 },
      { label: "Top 10 Analyst", icon: Trophy, earned: isTop10 },
      { label: "1,000 Likes", icon: CheckCircle, earned: false },
      { label: "50 Reports", icon: BookOpen, earned: myReports.length >= 50 },
      { label: "90%+ Accuracy", icon: Shield, earned: parseFloat(accuracyScore) >= 90 },
      { label: "Streak x10", icon: Rocket, earned: false },
    ];
  }, [currentUser, myReports, predictions, accuracyScore]);

  if (loadingUser) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );
  if (!currentUser) return null;

  const analyst = {
    name: currentUser.full_name || currentUser.email?.split("@")[0] || "Analyst",
    avatar: currentUser.picture || null,
    tagline: currentUser.tagline || "Analyst",
    reports: myReports.length,
    followers: currentUser.followers_count || 0,
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Profile Header */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <div className="flex items-start gap-4">
          {analyst.avatar
            ? <img src={analyst.avatar} alt={analyst.name} className="w-16 h-16 rounded-full border-2 border-border object-cover" />
            : <div className="w-16 h-16 rounded-full border-2 border-border bg-secondary flex items-center justify-center text-2xl font-bold text-primary">{analyst.name?.[0] || "A"}</div>
          }
          <div className="flex-1">
            <h1 className="text-xl font-bold">{analyst.name}</h1>
            <p className="text-sm text-muted-foreground mb-2">{analyst.tagline}</p>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span>{analyst.reports} Reports</span>
              <span>{analyst.followers.toLocaleString()} Followers</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Link to="/editor"><Button size="sm" className="text-xs gap-1"><span>+</span> Write Report</Button></Link>
            <Link to="/edit-profile"><Button variant="outline" size="sm" className="text-xs">Edit Profile</Button></Link>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { key: "predictions", label: "Prediction Accuracy", value: predictions.length > 0 ? `${accuracyScore}%` : "—", icon: Target, color: "text-green-600", bg: "bg-green-50 border-green-200", sub: `Based on ${predictions.length} predictions` },
          { key: "points", label: "AI Credits", value: (currentUser.ai_credits_balance ?? 100).toLocaleString(), icon: Zap, color: "text-amber-600", bg: "bg-amber-50 border-amber-200", sub: "Available balance" },
          { key: "yield", label: "Avg Prediction Yield", value: currentUser.yearly_yield ? `+${currentUser.yearly_yield.toFixed(1)}%` : "—", icon: TrendingUp, color: "text-primary", bg: "bg-primary/5 border-primary/20", sub: predictions.length > 0 ? "From resolved predictions" : "No resolved predictions yet" },
          { key: "followers", label: "Followers", value: analyst.followers.toLocaleString(), icon: Users, color: "text-blue-600", bg: "bg-blue-50 border-blue-200", sub: "Total followers" },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <button key={stat.key} onClick={() => navigate(stat.key === "predictions" ? "/predictions" : `/analytics?category=${stat.key}`)}
              className={`rounded-xl border p-4 text-left hover:shadow-md transition-all ${stat.bg}`}>
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-4 h-4 ${stat.color}`} />
                <span className="text-[10px] text-muted-foreground">{stat.label}</span>
              </div>
              <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-[10px] text-muted-foreground">{stat.sub}</p>
            </button>
          );
        })}
      </div>

      {/* Achievements */}
      <div className="bg-card border border-border rounded-2xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-4 h-4 text-amber-500" />
          <h2 className="font-semibold text-sm">Achievements <span className="text-muted-foreground">{achievements.filter(a => a.earned).length}/{achievements.length} earned</span></h2>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {achievements.map(a => {
            const Icon = a.icon;
            return (
              <div key={a.label} className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-center transition-all ${a.earned ? "bg-amber-50 border-amber-200" : "bg-secondary border-border opacity-40"}`}>
                <Icon className={`w-4 h-4 ${a.earned ? "text-amber-600" : "text-muted-foreground"}`} />
                <span className="text-[9px] font-medium leading-tight">{a.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reports Tabs */}
      <div className="bg-card border border-border rounded-2xl p-5 mb-6">
        <div className="flex flex-wrap gap-2 mb-4">
          {[
            { id: "published", label: `Published (${myReports.length})` },
            { id: "drafts", label: `Drafts (${localDrafts.length})` },
            { id: "boost", label: "Boost" },
            { id: "profile-boost", label: "Profile Boost" },
            { id: "subscriptions", label: "Subscribed" },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${tab === t.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === "published" && (
          <div className="space-y-2">
            {loadingReports ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : myReports.length === 0 ? (
              <div className="text-center py-10">
                <FileText className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No reports yet</p>
                <p className="text-xs text-muted-foreground/60 mb-4">Publish your first research report to see it here.</p>
                <Link to="/editor"><Button size="sm" variant="outline" className="text-xs">Write Your First Report</Button></Link>
              </div>
            ) : (
              myReports.map(report => (
                <div key={report.id} className="flex items-center gap-3 p-3 bg-secondary rounded-xl cursor-pointer hover:bg-secondary/70 transition-all" onClick={() => navigate(`/report?id=${report.id}`)}>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{report.title}</p>
                    <p className="text-xs text-muted-foreground">Published {format(new Date(report.created_date), "MMM d, yyyy")} · {report.likes || 0} likes</p>
                  </div>
                  {report.prediction_action && (
                    <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {React.createElement(ACTION_ICONS[report.prediction_action] || Minus, { className: "w-3 h-3" })}
                      {report.prediction_action}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              ))
            )}
          </div>
        )}

        {tab === "drafts" && (
          <div className="space-y-2">
            {localDrafts.length === 0 ? (
              <div className="text-center py-10">
                <PenLine className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No drafts yet</p>
                <p className="text-xs text-muted-foreground/60 mb-4">Start writing to auto-save drafts here.</p>
                <Link to="/editor"><Button size="sm" variant="outline" className="text-xs">Start Writing</Button></Link>
              </div>
            ) : (
              localDrafts.map(draft => (
                <div key={draft.id} className="flex items-center gap-3 p-3 bg-secondary rounded-xl">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{draft.title}</p>
                    <p className="text-xs text-muted-foreground">Last edited {format(new Date(draft.savedAt), "MMM d, yyyy")}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs">Draft</Badge>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "boost" && (
          <div>
            <p className="text-sm text-muted-foreground mb-4">Boost a report to increase its reach across the platform.</p>
            <div className="space-y-2">
              {myReports.map(report => (
                <div key={report.id} className="flex items-center gap-3 p-3 bg-secondary rounded-xl">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{report.title}</p>
                    <p className="text-xs text-muted-foreground">{report.likes || 0} likes</p>
                  </div>
                  {boosts[report.id] ? (
                    <span className="text-xs font-semibold text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">Boosted 🔥</span>
                  ) : (
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => setBoosts(prev => ({ ...prev, [report.id]: true }))}>Boost</Button>
                  )}
                </div>
              ))}
              {myReports.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Publish a report first to boost it.</p>}
            </div>
          </div>
        )}

        {tab === "profile-boost" && (
          <div>
            <p className="text-sm text-muted-foreground mb-4">Boost your analyst profile to appear higher in the Leaderboard and gain more followers.</p>
            {profileBoosted ? (
              <div className="text-center py-6">
                <p className="font-bold text-base mb-1">Profile is Boosted 🔥</p>
                <p className="text-sm text-muted-foreground">Your profile is being promoted to new followers for 7 days.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {[
                  { label: "7 Day Boost", price: "$9.99", reach: "~2,000 impressions", icon: "🚀" },
                  { label: "30 Day Boost", price: "$29.99", reach: "~10,000 impressions", icon: "🔥" },
                  { label: "Featured Analyst", price: "$79.99", reach: "Homepage feature for 7 days", icon: "⭐" },
                ].map(plan => (
                  <button key={plan.label} onClick={() => setProfileBoosted(true)} className="w-full flex items-center gap-4 p-4 border border-border rounded-xl hover:border-orange-300 hover:bg-orange-50/50 text-left transition-all">
                    <span className="text-xl">{plan.icon}</span>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{plan.label}</p>
                      <p className="text-xs text-muted-foreground">{plan.reach}</p>
                    </div>
                    <span className="font-bold text-sm text-primary">{plan.price}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "subscriptions" && (
          <div className="text-center py-8">
            <Users className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Subscriptions coming soon.</p>
          </div>
        )}
      </div>

      {/* Accuracy Trend */}
      <div className="mb-4">
        <InsightsPanel accuracyScore={parseFloat(accuracyScore) || 0} reports={myReports} />
      </div>

      {/* Revenue & Twits */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RevenueInsightsPanel />
        <TwitsPanel currentUser={currentUser} />
      </div>
    </div>
  );
}