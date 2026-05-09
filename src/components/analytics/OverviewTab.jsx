import React, { useMemo } from "react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { startOfMonth, format, subMonths, isAfter, startOfWeek, addDays } from "date-fns";
import AnalyticsKPICard from "./AnalyticsKPICard";

function calcMRR(subs) {
  const active = subs.filter(s => s.status === "active");
  return active.reduce((sum, s) => sum + (s.price || 29), 0);
}

export default function OverviewTab({ currentUser, reports, subscriptions, follows, votes, filteredReports, filteredSubs, filteredFollows }) {
  const publishedReports = useMemo(() => reports.filter(r => r.status === "published"), [reports]);

  const activeSubs = useMemo(() => subscriptions.filter(s => s.status === "active"), [subscriptions]);
  const mrr = useMemo(() => calcMRR(activeSubs), [activeSubs]);
  const totalLikes = useMemo(() => publishedReports.reduce((sum, r) => sum + (r.likes || 0), 0), [publishedReports]);
  const engagement = useMemo(() => totalLikes + votes.length, [totalLikes, votes]);

  const resolvedReports = useMemo(() => publishedReports.filter(r => r.prediction_outcome && r.prediction_outcome !== "pending"), [publishedReports]);
  const hits = useMemo(() => resolvedReports.filter(r => r.prediction_outcome === "hit" || r.prediction_outcome === "near").length, [resolvedReports]);
  const accuracy = resolvedReports.length > 0 ? ((hits / resolvedReports.length) * 100).toFixed(1) : null;

  // MRR chart — last 6 months cumulative
  const mrrChart = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => subMonths(new Date(), 5 - i));
    return months.map(m => {
      const label = format(m, "MMM");
      const activeThen = subscriptions.filter(s =>
        s.status === "active" && isAfter(new Date(m), new Date(s.created_date))
      );
      const val = activeThen.reduce((sum, s) => sum + (s.price || 29), 0);
      return { month: label, MRR: val };
    });
  }, [subscriptions]);

  // Followers growth — last 8 weeks
  const followersChart = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => {
      const weekStart = startOfWeek(addDays(new Date(), -(7 - i) * 7));
      const weekEnd = addDays(weekStart, 7);
      const count = follows.filter(f => {
        const d = new Date(f.created_date);
        return d >= weekStart && d < weekEnd;
      }).length;
      return { week: format(weekStart, "MMM d"), followers: count };
    });
  }, [follows]);

  // Engagement per report — last 5 published
  const engagementChart = useMemo(() => {
    return publishedReports.slice(0, 5).map(r => ({
      name: (r.title || "Untitled").slice(0, 18),
      likes: r.likes || 0,
      votes: votes.filter(v => v.report_id === r.id).length,
    }));
  }, [publishedReports, votes]);

  const hasMRR = mrrChart.some(m => m.MRR > 0);

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <AnalyticsKPICard icon="💰" label="MRR" value={`$${mrr.toLocaleString()}`} sub="Monthly recurring" color="text-green-600" />
        <AnalyticsKPICard icon="👥" label="Subscribers" value={activeSubs.length} sub="Active paying" color="text-blue-600" />
        <AnalyticsKPICard icon="👁" label="Total Views" value={totalLikes > 0 ? totalLikes : "—"} sub="Likes as proxy" color="text-purple-600" />
        <AnalyticsKPICard icon="❤️" label="Engagement" value={engagement} sub="Likes + poll votes" color="text-pink-600" />
        <AnalyticsKPICard icon="🎯" label="Accuracy" value={accuracy ? `${accuracy}%` : "—"} sub="On resolved calls" color={accuracy >= 60 ? "text-green-600" : "text-amber-600"} />
      </div>

      {/* MRR Chart */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-semibold text-sm mb-4">Monthly Recurring Revenue</h3>
        {!hasMRR ? (
          <div className="text-center py-8">
            <p className="text-2xl font-bold text-muted-foreground/30 mb-2">$0</p>
            <p className="text-sm text-muted-foreground">Publish premium reports to start earning</p>
            <div className="h-1 mt-4 w-full border-t-2 border-dashed border-border" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={mrrChart}>
              <defs>
                <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
              <Tooltip formatter={v => [`$${v}`, "MRR"]} />
              <Area type="monotone" dataKey="MRR" stroke="#2563eb" strokeWidth={2} fill="url(#mrrGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Two charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Followers growth */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold text-sm mb-4">Followers Growth (weekly)</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={followersChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="week" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="followers" fill="#3b82f6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Engagement per report */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold text-sm mb-4">Engagement per Report</h3>
          {publishedReports.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">No published reports yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={engagementChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="likes" fill="#ec4899" radius={[3, 3, 0, 0]} name="Likes" />
                <Bar dataKey="votes" fill="#8b5cf6" radius={[3, 3, 0, 0]} name="Votes" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}