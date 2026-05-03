import React, { useState } from "react";
import { MOCK_ANALYSTS, getReports } from "@/lib/mockData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, TrendingUp, Award, FileText, Star, Flame, Trophy, Users, Zap, ArrowUp, ArrowDown, Minus, BookOpen, Rocket, Shield, CheckCircle, Clock, BarChart3, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import RevenueInsightsPanel from "@/components/dashboard/RevenueInsightsPanel";
import TwitsPanel from "@/components/dashboard/TwitsPanel";
import { useNavigate, Link } from "react-router-dom";

const MOCK_REPORTS = getReports();

function computeStats(myReports) {
  const pred = myReports.filter(r => r.prediction);
  const total = pred.length;
  const hit = pred.filter(r => r.prediction?.outcome === "hit").length;
  const accuracy = total > 0 ? ((hit / total) * 100).toFixed(1) : "87.5";
  const gains = pred.filter(r => r.prediction?.outcome === "hit" && r.prediction?.lockPrice && r.prediction?.targetPrice)
    .map(r => ((r.prediction.targetPrice - r.prediction.lockPrice) / r.prediction.lockPrice) * 100);
  const avgYield = gains.length > 0 ? (gains.reduce((a, b) => a + b, 0) / gains.length).toFixed(1) : "34.2";
  return { accuracy, avgYield };
}

const ACTION_ICONS = { Long: ArrowUp, Short: ArrowDown, Hold: Minus };

const ACHIEVEMENTS = [
  { label: "First Report", icon: FileText, earned: true }, { label: "10 Predictions", icon: Target, earned: true },
  { label: "80%+ Accuracy", icon: Award, earned: true }, { label: "100 Followers", icon: Users, earned: true },
  { label: "500 Followers", icon: Users, earned: true }, { label: "First Premium Report", icon: Star, earned: true },
  { label: "Streak x3", icon: Flame, earned: true }, { label: "Top 10 Analyst", icon: Trophy, earned: false },
  { label: "1,000 Likes", icon: CheckCircle, earned: false }, { label: "50 Reports", icon: BookOpen, earned: false },
  { label: "90%+ Accuracy", icon: Shield, earned: false }, { label: "Streak x10", icon: Rocket, earned: false },
];

export default function AnalystDashboard() {
  const [tab, setTab] = useState("published");
  const [boosts, setBoosts] = useState({ r6: true });
  const [profileBoosted, setProfileBoosted] = useState(false);
  const navigate = useNavigate();
  const saved = (() => { try { return JSON.parse(localStorage.getItem("stakify_profile")) || {}; } catch { return {}; } })();
  const analyst = { ...MOCK_ANALYSTS[0], ...saved };
  const myReports = MOCK_REPORTS.filter(r => r.author.id === analyst.id || r.author?.id === "a1");
  const { accuracy, avgYield } = computeStats(myReports);
  const drafts = [{ id: "d1", title: "Amazon's Healthcare Pivot: Underappreciated Opportunity", updatedAt: "2026-04-14" }, { id: "d2", title: "Semiconductor Supply Chain Deep Dive", updatedAt: "2026-04-13" }];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Profile Header */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <div className="flex items-start gap-4">
          <img src={analyst.avatar} alt={analyst.name} className="w-16 h-16 rounded-full border-2 border-border" />
          <div className="flex-1">
            <h1 className="text-xl font-bold">{analyst.name}</h1>
            <p className="text-sm text-muted-foreground mb-2">{analyst.tagline || "Senior Equity Research Analyst · Tech & AI"}</p>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span>{analyst.reports} Reports</span>
              <span>{analyst.followers?.toLocaleString()} Followers</span>
              <span>Joined Jan 2025</span>
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
          { key: "predictions", label: "Prediction Accuracy", value: `${accuracy}%`, icon: Target, color: "text-green-600", bg: "bg-green-50 border-green-200", sub: `Based on ${myReports.filter(r => r.prediction).length} predictions` },
          { key: "points", label: "Total Points", value: "8,750", icon: Zap, color: "text-amber-600", bg: "bg-amber-50 border-amber-200", sub: "Top 3% of analysts" },
          { key: "yield", label: "Avg Prediction Yield", value: `+${avgYield}%`, icon: TrendingUp, color: "text-primary", bg: "bg-primary/5 border-primary/20", sub: "vs S&P 500: +12.1%" },
          { key: "followers", label: "Followers", value: "12,400", icon: Users, color: "text-blue-600", bg: "bg-blue-50 border-blue-200", sub: "+340 this month" },
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
          <h2 className="font-semibold text-sm">Achievements <span className="text-muted-foreground">{ACHIEVEMENTS.filter(a => a.earned).length}/{ACHIEVEMENTS.length} earned</span></h2>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {ACHIEVEMENTS.map(a => {
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
            { id: "drafts", label: `Drafts (${drafts.length})` },
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
            {myReports.map(report => (
              <div key={report.id} className="flex items-center gap-3 p-3 bg-secondary rounded-xl cursor-pointer hover:bg-secondary/70 transition-all" onClick={() => navigate(`/report?id=${report.id}`)}>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{report.title}</p>
                  <p className="text-xs text-muted-foreground">Published {format(new Date(report.publishedAt), "MMM d, yyyy")} · {report.likes} likes</p>
                </div>
                {report.prediction && (
                  <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {React.createElement(ACTION_ICONS[report.prediction.action], { className: "w-3 h-3" })}
                    {report.prediction.action}
                  </span>
                )}
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            ))}
          </div>
        )}

        {tab === "drafts" && (
          <div className="space-y-2">
            {drafts.map(draft => (
              <div key={draft.id} className="flex items-center gap-3 p-3 bg-secondary rounded-xl">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{draft.title}</p>
                  <p className="text-xs text-muted-foreground">Last edited {format(new Date(draft.updatedAt), "MMM d, yyyy")}</p>
                </div>
                <Badge variant="secondary" className="text-xs">Draft</Badge>
              </div>
            ))}
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
                    <p className="text-xs text-muted-foreground">{report.likes} likes</p>
                  </div>
                  {boosts[report.id] ? (
                    <span className="text-xs font-semibold text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">Boosted 🔥</span>
                  ) : (
                    <Button size="sm" variant="outline" className="text-xs" onClick={(e) => { e.stopPropagation(); setBoosts(prev => ({ ...prev, [report.id]: true })); }}>
                      Boost
                    </Button>
                  )}
                </div>
              ))}
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
          <div className="space-y-2">
            {MOCK_ANALYSTS.slice(1, 4).map(a => (
              <div key={a.id} className="flex items-center gap-3 p-3 bg-secondary rounded-xl">
                <img src={a.avatar} alt={a.name} className="w-9 h-9 rounded-full" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{a.name}</p>
                  <p className="text-xs text-muted-foreground">{a.followers?.toLocaleString()} followers · {a.accuracy}%</p>
                </div>
                <Button size="sm" variant="outline" className="text-xs" onClick={() => navigate(`/analyst?id=${a.id}`)}>View</Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Revenue & Twits */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RevenueInsightsPanel />
        <TwitsPanel />
      </div>
    </div>
  );
}