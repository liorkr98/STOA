import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Loader2, ArrowLeft, BarChart3, DollarSign, Users, Heart, Target, TrendingUp, TrendingDown, FileText, Star, ArrowUpRight, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { subDays, format, startOfWeek, startOfMonth, isAfter, differenceInDays } from "date-fns";
import OverviewTab from "@/components/analytics/OverviewTab";
import RevenueTab from "@/components/analytics/RevenueTab";
import AudienceTab from "@/components/analytics/AudienceTab";
import ContentTab from "@/components/analytics/ContentTab";
import PredictionsTab from "@/components/analytics/PredictionsTab";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "revenue", label: "Revenue" },
  { id: "audience", label: "Audience" },
  { id: "content", label: "Content" },
  { id: "predictions", label: "Predictions" },
];

const DATE_RANGES = [
  { id: "7d", label: "Last 7 days", days: 7 },
  { id: "30d", label: "Last 30 days", days: 30 },
  { id: "90d", label: "Last 90 days", days: 90 },
  { id: "all", label: "All Time", days: null },
];

export default function CreatorAnalyticsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [dateRange, setDateRange] = useState("30d");
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  // Raw data
  const [reports, setReports] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [follows, setFollows] = useState([]);
  const [votes, setVotes] = useState([]);
  const [subscriberUsers, setSubscriberUsers] = useState({});
  const [followerUsers, setFollowerUsers] = useState({});

  useEffect(() => {
    const load = async () => {
      const user = await base44.auth.me().catch(() => null);
      if (!user) { navigate("/signin"); return; }
      setCurrentUser(user);

      const [reps, subs, fols] = await Promise.all([
        base44.entities.Report.filter({ created_by: user.email }, "-created_date", 200).catch(() => []),
        base44.entities.Subscription.filter({ analyst_email: user.email }, "-created_date", 200).catch(() => []),
        base44.entities.Follow.filter({ analyst_email: user.email }, "-created_date", 500).catch(() => []),
      ]);

      setReports(reps || []);
      setSubscriptions(subs || []);
      setFollows(fols || []);

      // Fetch votes for all reports
      const published = (reps || []).filter(r => r.status === "published");
      if (published.length > 0) {
        const allVotes = await Promise.all(
          published.slice(0, 20).map(r => base44.entities.Vote.filter({ report_id: r.id }).catch(() => []))
        );
        setVotes(allVotes.flat());
      }

      // Fetch user profiles for subscribers & followers (for display)
      const subEmails = [...new Set((subs || []).map(s => s.subscriber_email).filter(Boolean))];
      const folEmails = [...new Set((fols || []).map(f => f.follower_email).filter(Boolean))];
      const allEmails = [...new Set([...subEmails, ...folEmails])];

      if (allEmails.length > 0) {
        const allUsers = await base44.entities.User.list("-created_date", 500).catch(() => []);
        const userMap = {};
        (allUsers || []).forEach(u => { userMap[u.email] = u; });
        const subMap = {};
        subEmails.forEach(e => { if (userMap[e]) subMap[e] = userMap[e]; });
        const folMap = {};
        folEmails.forEach(e => { if (userMap[e]) folMap[e] = userMap[e]; });
        setSubscriberUsers(subMap);
        setFollowerUsers(folMap);
      }

      setLoading(false);
    };
    load();
  }, []);

  const rangeStart = useMemo(() => {
    const range = DATE_RANGES.find(r => r.id === dateRange);
    return range?.days ? subDays(new Date(), range.days) : null;
  }, [dateRange]);

  const filteredReports = useMemo(() =>
    rangeStart ? reports.filter(r => isAfter(new Date(r.created_date), rangeStart)) : reports,
    [reports, rangeStart]
  );

  const filteredSubs = useMemo(() =>
    rangeStart ? subscriptions.filter(s => isAfter(new Date(s.created_date), rangeStart)) : subscriptions,
    [subscriptions, rangeStart]
  );

  const filteredFollows = useMemo(() =>
    rangeStart ? follows.filter(f => isAfter(new Date(f.created_date), rangeStart)) : follows,
    [follows, rangeStart]
  );

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  const sharedProps = {
    currentUser,
    reports,
    subscriptions,
    follows,
    votes,
    subscriberUsers,
    followerUsers,
    filteredReports,
    filteredSubs,
    filteredFollows,
    rangeStart,
    dateRange,
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/dashboard")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </button>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-lg font-bold flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" /> Creator Analytics
        </h1>
      </div>

      {/* Sticky sub-nav */}
      <div className="sticky top-0 z-10 bg-background border-b border-border -mx-4 px-4 mb-6">
        <div className="flex items-center justify-between py-3 gap-4">
          <div className="flex gap-1 overflow-x-auto no-scrollbar">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${activeTab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1 flex-shrink-0">
            {DATE_RANGES.map(r => (
              <button
                key={r.id}
                onClick={() => setDateRange(r.id)}
                className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${dateRange === r.id ? "bg-secondary text-foreground font-bold" : "text-muted-foreground hover:bg-secondary/60"}`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab content */}
      {activeTab === "overview"    && <OverviewTab    {...sharedProps} />}
      {activeTab === "revenue"     && <RevenueTab     {...sharedProps} />}
      {activeTab === "audience"    && <AudienceTab    {...sharedProps} />}
      {activeTab === "content"     && <ContentTab     {...sharedProps} />}
      {activeTab === "predictions" && <PredictionsTab {...sharedProps} />}
    </div>
  );
}