import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, TrendingUp, Users, Globe, Eye, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { base44 } from "@/api/base44Client";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function parseYearMonth(ym) {
  const m = parseInt(ym.slice(4), 10) - 1;
  return MONTHS[m] || ym;
}

function metricVal(row, idx) {
  return parseFloat(row.metricValues?.[idx]?.value || 0);
}

export default function AnalyticsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('getGAData', {});
      setData(res.data);
    } catch (err) {
      setError(err.message || "Failed to load analytics data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const monthlyTrend = data?.monthlyTrend?.rows?.map(row => ({
    month: parseYearMonth(row.dimensionValues?.[0]?.value || ""),
    users: metricVal(row, 0),
    sessions: metricVal(row, 1),
    pageviews: metricVal(row, 2),
    newUsers: metricVal(row, 5),
  })) || [];

  const totalsRow = data?.totals?.rows?.[0];
  const totalUsers = totalsRow ? Math.round(metricVal(totalsRow, 0)).toLocaleString() : "—";
  const totalSessions = totalsRow ? Math.round(metricVal(totalsRow, 1)).toLocaleString() : "—";
  const totalPageviews = totalsRow ? Math.round(metricVal(totalsRow, 2)).toLocaleString() : "—";
  const bounceRate = totalsRow ? `${(metricVal(totalsRow, 3) * 100).toFixed(1)}%` : "—";
  const newUsers = totalsRow ? Math.round(metricVal(totalsRow, 4)).toLocaleString() : "—";

  const topPages = data?.topPages?.rows?.map(row => ({
    path: row.dimensionValues?.[0]?.value || "/",
    views: Math.round(metricVal(row, 0)),
    users: Math.round(metricVal(row, 1)),
  })) || [];

  const STAT_CARDS = [
    { label: "Active Users (30d)", value: totalUsers, icon: Users, color: "#3b82f6" },
    { label: "Sessions (30d)", value: totalSessions, icon: Globe, color: "#8b5cf6" },
    { label: "Page Views (30d)", value: totalPageviews, icon: Eye, color: "#22c55e" },
    { label: "Bounce Rate (30d)", value: bounceRate, icon: TrendingUp, color: "#f59e0b" },
    { label: "New Users (30d)", value: newUsers, icon: Users, color: "#10b981" },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
        <button onClick={fetchData} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      <h1 className="text-xl font-bold mb-1">Analytics Dashboard</h1>
      <p className="text-sm text-muted-foreground mb-6">
        {data?.propertyName ? `Google Analytics · ${data.propertyName}` : "Powered by Google Analytics 4"}
      </p>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 p-4 bg-loss/10 border border-loss/20 rounded-xl text-loss">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-sm">Failed to load analytics</p>
            <p className="text-xs opacity-80">{error}</p>
          </div>
          <button onClick={fetchData} className="ml-auto text-xs underline">Try again</button>
        </div>
      )}

      {data && !loading && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            {STAT_CARDS.map(card => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="bg-card border border-border rounded-xl p-3">
                  <Icon className="w-4 h-4 mb-1" style={{ color: card.color }} />
                  <p className="text-lg font-bold text-foreground">{card.value}</p>
                  <p className="text-[10px] text-muted-foreground">{card.label}</p>
                </div>
              );
            })}
          </div>

          {monthlyTrend.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4 mb-4">
              <h3 className="font-semibold text-sm mb-3">Active Users — 6-Month Trend</h3>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={monthlyTrend}>
                  <defs>
                    <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={v => v.toLocaleString()} width={45} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v) => [v.toLocaleString(), "Users"]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Area type="monotone" dataKey="users" stroke="hsl(var(--primary))" fill="url(#userGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {topPages.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="font-semibold text-sm mb-3">Top Pages (30 days)</h3>
              <div className="space-y-2">
                {topPages.map((page, i) => (
                  <div key={i} className="flex items-center gap-3 py-1.5 border-b border-border/50 last:border-0">
                    <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                    <span className="text-xs font-mono text-foreground flex-1 truncate">{page.path}</span>
                    <span className="text-xs text-muted-foreground">{page.views.toLocaleString()} views</span>
                    <span className="text-xs text-muted-foreground">{page.users.toLocaleString()} users</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}