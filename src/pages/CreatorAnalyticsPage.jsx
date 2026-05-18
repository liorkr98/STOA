import React, { useState, useEffect, useMemo, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate, Link } from "react-router-dom";
import { format, subDays, subMonths, isAfter, parseISO, startOfMonth } from "date-fns";
import {
  Loader2, TrendingUp, TrendingDown, Eye, Heart, DollarSign,
  Users, Target, BarChart3, Calendar, ChevronRight, RefreshCw,
  Download, Zap, Crown, FileText, Star, ArrowUpRight, ArrowDownRight,
  MoreHorizontal, PenLine, Settings,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend,
} from "recharts";
import { computeScore } from "@/lib/scoringEngine";
import { computeAvgYield, formatYield } from "@/lib/yieldCalc";

// ── Date range options ────────────────────────────────────────────────────────
const DATE_RANGES = [
  { label: "7D",  days: 7 },
  { label: "1M",  days: 30 },
  { label: "3M",  days: 90 },
  { label: "1Y",  days: 365 },
  { label: "All", days: null },
];

function cutoff(days) {
  return days ? subDays(new Date(), days) : new Date(0);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function pct(a, b) {
  if (!b || b === 0) return null;
  return ((a - b) / b) * 100;
}

function fmtPct(v) {
  if (v == null) return null;
  return `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
}

function buildMonthly(items, dateKey, valueKey) {
  const map = {};
  items.forEach(item => {
    const d = item[dateKey];
    if (!d) return;
    const key = d.slice(0, 7); // "YYYY-MM"
    map[key] = (map[key] || 0) + (item[valueKey] || 1);
  });
  return Object.entries(map)
    .sort()
    .slice(-12)
    .map(([month, value]) => ({ month: month.slice(5), value }));
}

// ── Trend indicator ───────────────────────────────────────────────────────────
function Trend({ value }) {
  if (value == null) return <span className="text-[11px] text-muted-foreground">—</span>;
  const up = value >= 0;
  return (
    <span className={`flex items-center gap-0.5 text-[11px] font-semibold ${up ? "text-green-500" : "text-red-500"}`}>
      {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {fmtPct(value)} from last period
    </span>
  );
}

// ── KPI Card (matching Figma top-row cards) ───────────────────────────────────
function KPICard({ label, value, trend, icon: Icon, iconBg, children }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: iconBg }}>
            {Icon && <Icon className="w-3.5 h-3.5 text-white" />}
          </div>
          <button className="text-muted-foreground hover:text-foreground transition-colors">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>
      {children || (
        <>
          <p className="text-3xl font-medium tracking-tight leading-none tabular-nums">{value}</p>
          <Trend value={trend} />
        </>
      )}
    </div>
  );
}

// ── Section card wrapper ──────────────────────────────────────────────────────
function SectionCard({ title, subtitle, action, children }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-sm">{title}</h3>
          {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

// ── Custom tooltip for charts ─────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="text-muted-foreground mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">
          {p.name}: {typeof p.value === "number" ? p.value.toLocaleString() : p.value}
        </p>
      ))}
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CreatorAnalyticsPage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser]     = useState(null);
  const [reports, setReports]             = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [transactions, setTransactions]   = useState([]);
  const [loading, setLoading]             = useState(true);
  const [range, setRange]                 = useState("1M");
  const [refreshKey, setRefreshKey]       = useState(0);

  // Revenue projector
  const [subPrice, setSubPrice]       = useState(29);
  const [targetSubs, setTargetSubs]   = useState(10);

  useEffect(() => {
    setLoading(true);
    base44.auth.me().then(async user => {
      setCurrentUser(user);
      const [reps, subs, txns] = await Promise.all([
        base44.entities.Report.filter({ created_by: user.email }, "-created_date", 300).catch(() => []),
        base44.entities.Subscription.filter({ analyst_email: user.email }, "-created_date", 200).catch(() => []),
        base44.entities.WalletTransaction.filter({ analyst_email: user.email }, "-created_date", 100).catch(() => []),
      ]);
      setReports(reps || []);
      setSubscriptions(subs || []);
      setTransactions(txns || []);
    }).finally(() => setLoading(false));
  }, [refreshKey]);

  // ── Date filtering ──────────────────────────────────────────────────────────
  const rangeObj  = DATE_RANGES.find(r => r.label === range);
  const cut       = cutoff(rangeObj?.days);
  const prevCut   = cutoff(rangeObj?.days ? rangeObj.days * 2 : null);

  const inRange   = useCallback((d) => d && isAfter(parseISO(d), cut), [cut]);
  const inPrev    = useCallback((d) => d && isAfter(parseISO(d), prevCut) && !isAfter(parseISO(d), cut), [cut, prevCut]);

  // ── Derived stats ───────────────────────────────────────────────────────────
  const published   = useMemo(() => reports.filter(r => r.status === "published"), [reports]);
  const curPub      = useMemo(() => published.filter(r => inRange(r.created_date)), [published, inRange]);
  const prevPub     = useMemo(() => published.filter(r => inPrev(r.created_date)), [published, inPrev]);

  const totalViews  = useMemo(() => published.reduce((s, r) => s + (r.views || 0), 0), [published]);
  const curViews    = useMemo(() => curPub.reduce((s, r) => s + (r.views || 0), 0), [curPub]);
  const prevViews   = useMemo(() => prevPub.reduce((s, r) => s + (r.views || 0), 0), [prevPub]);
  const viewsTrend  = pct(curViews, prevViews);

  const totalLikes  = useMemo(() => published.reduce((s, r) => s + (r.likes || 0), 0), [published]);
  const curLikes    = useMemo(() => curPub.reduce((s, r) => s + (r.likes || 0), 0), [curPub]);
  const prevLikes   = useMemo(() => prevPub.reduce((s, r) => s + (r.likes || 0), 0), [prevPub]);
  const likesTrend  = pct(curLikes, prevLikes);

  const activeSubs  = useMemo(() => subscriptions.filter(s => s.status === "active"), [subscriptions]);
  const mrr         = useMemo(() => activeSubs.reduce((s, sub) => s + (sub.price || 29), 0), [activeSubs]);
  const curSubs     = useMemo(() => subscriptions.filter(s => inRange(s.created_date)), [subscriptions, inRange]);
  const prevSubs    = useMemo(() => subscriptions.filter(s => inPrev(s.created_date)), [subscriptions, inPrev]);
  const subsTrend   = pct(curSubs.length, prevSubs.length);

  const scoring     = useMemo(() => computeScore(published), [published]);
  const avgYield    = useMemo(() => computeAvgYield(published), [published]);

  // Monthly views chart (views per report by publish month)
  const monthlyViews = useMemo(() => {
    const map = {};
    published.forEach(r => {
      const key = (r.created_date || "").slice(0, 7);
      if (!key) return;
      if (!map[key]) map[key] = { month: key.slice(5), views: 0, likes: 0 };
      map[key].views += r.views || 0;
      map[key].likes += r.likes || 0;
    });
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month)).slice(-12);
  }, [published]);

  // Monthly subscriptions
  const monthlySubs = useMemo(() => buildMonthly(subscriptions, "created_date", null), [subscriptions]);

  // Top reports by views
  const topReports = useMemo(() =>
    [...published].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 6),
  [published]);

  // Donut: outcome breakdown
  const outcomePie = useMemo(() => {
    const predictions = published.filter(r => r.prediction_action);
    const counts = { hit: 0, near: 0, miss: 0, pending: 0 };
    predictions.forEach(r => {
      const o = r.prediction_outcome || "pending";
      if (counts[o] !== undefined) counts[o]++;
    });
    return [
      { name: "Hit",     value: counts.hit,     color: "#22c55e" },
      { name: "Near",    value: counts.near,     color: "#3b82f6" },
      { name: "Miss",    value: counts.miss,     color: "#ef4444" },
      { name: "Pending", value: counts.pending,  color: "#94a3b8" },
    ].filter(d => d.value > 0);
  }, [published]);

  // Combined transaction feed: subscriptions + txns
  const transactionFeed = useMemo(() => {
    const subEvents = subscriptions.slice(0, 20).map(s => ({
      id: `sub-${s.id}`,
      icon: "👤",
      title: s.subscriber_email?.split("@")[0] || "Subscriber",
      sub: `${s.plan || "Monthly"} subscription`,
      date: s.created_date,
      amount: `+$${s.price || 29}`,
      status: s.status === "active" ? "active" : "expired",
      statusColor: s.status === "active" ? "text-green-600" : "text-muted-foreground",
    }));
    const txnEvents = transactions.slice(0, 20).map(t => ({
      id: `txn-${t.id}`,
      icon: "🔓",
      title: "Report Unlocked",
      sub: t.related_id ? `Report ID: ${t.related_id.slice(-6)}` : "Premium report",
      date: t.created_date,
      amount: t.amount ? `+$${t.amount}` : "+$—",
      status: "completed",
      statusColor: "text-green-600",
    }));
    return [...subEvents, ...txnEvents]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 12);
  }, [subscriptions, transactions]);

  // Revenue projector
  const projMRR    = targetSubs * subPrice;
  const projAnnual = projMRR * 12;
  const projNet    = Math.round(projMRR * 0.85);

  // Export CSV
  const exportCSV = () => {
    const rows = [
      ["Title", "Views", "Likes", "Premium", "Prediction", "Outcome", "Date"],
      ...topReports.map(r => [
        `"${r.title}"`, r.views || 0, r.likes || 0,
        r.is_premium ? "Yes" : "No",
        r.prediction_action || "—",
        r.prediction_outcome || "pending",
        format(new Date(r.created_date), "yyyy-MM-dd"),
      ]),
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv," + encodeURIComponent(csv);
    a.download = "analytics.csv";
    a.click();
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  const topReport = topReports[0];
  const maxViews  = topReport?.views || 1;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 pb-16">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-4 mb-7">
        <div>
          <span className="eyebrow">Creator Analytics</span>
          <h1 className="text-3xl font-medium tracking-tight mt-2">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Your complete performance overview — live data.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Date range selector */}
          <div className="flex items-center gap-1 p-1 bg-secondary rounded-xl border border-border">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground ml-1.5" />
            {DATE_RANGES.map(r => (
              <button
                key={r.label}
                onClick={() => setRange(r.label)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${range === r.label ? "bg-card shadow text-foreground border border-border" : "text-muted-foreground hover:text-foreground"}`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button onClick={() => setRefreshKey(k => k + 1)} className="p-2 rounded-xl border border-border bg-card hover:bg-secondary transition-colors" title="Refresh">
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </button>
          <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-card hover:bg-secondary text-xs font-semibold transition-colors">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        </div>
      </div>

      {/* ── Row 1: Highlight + KPI cards ────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">

        {/* Highlight card — dark navy (Figma) */}
        <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #0A1A3F 0%, #1E3A8A 100%)" }}>
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(201,150,19,0.18) 0%, transparent 70%)", transform: "translate(30%, -30%)" }} />
          <div className="relative z-10">
            <div className="flex items-center gap-1.5 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">Live Update</span>
            </div>
            <p className="text-white/60 text-xs mb-1.5">{format(new Date(), "MMM d, yyyy")}</p>
            {scoring.total > 0 ? (
              <>
                <p className="text-white text-base font-bold leading-snug mb-1">
                  Prediction accuracy
                </p>
                <p className="text-3xl font-medium tabular-nums" style={{ color: "hsl(var(--accent))" }}>
                  {scoring.score.toFixed(0)}
                  <span className="text-lg">pts</span>
                </p>
                <p className="text-white/40 text-[11px] mt-1">{scoring.hits}W · {scoring.misses}L · {scoring.total} resolved</p>
              </>
            ) : (
              <>
                <p className="text-white text-base font-bold leading-snug mb-1">
                  {published.length > 0 ? "Keep publishing!" : "Start publishing reports"}
                </p>
                <p className="text-3xl font-medium" style={{ color: "hsl(var(--accent))" }}>
                  {published.length}
                  <span className="text-lg"> reports</span>
                </p>
                <p className="text-white/40 text-[11px] mt-1">Total published to date</p>
              </>
            )}
            <Link to="/analyst" className="flex items-center gap-1 text-[11px] font-semibold mt-3 hover:opacity-80 transition-opacity" style={{ color: "hsl(var(--accent))" }}>
              See statistics <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* MRR */}
        <KPICard label="Monthly Revenue" value={`$${mrr.toLocaleString()}`} trend={subsTrend} icon={DollarSign} iconBg="#22c55e">
          <p className="text-3xl font-medium tracking-tight leading-none tabular-nums">${mrr.toLocaleString()}</p>
          <p className="text-[11px] text-muted-foreground">from {activeSubs.length} active subscribers</p>
          <Trend value={subsTrend} />
        </KPICard>

        {/* Total Views */}
        <KPICard label="Total Views" icon={Eye} iconBg="#3b82f6">
          <p className="text-3xl font-medium tracking-tight leading-none tabular-nums">{totalViews.toLocaleString()}</p>
          <p className="text-[11px] text-muted-foreground">{curViews.toLocaleString()} in selected period</p>
          <Trend value={viewsTrend} />
        </KPICard>

        {/* Likes */}
        <KPICard label="Total Likes" icon={Heart} iconBg="#ec4899">
          <p className="text-3xl font-medium tracking-tight leading-none tabular-nums">{totalLikes.toLocaleString()}</p>
          <p className="text-[11px] text-muted-foreground">{curLikes.toLocaleString()} in selected period</p>
          <Trend value={likesTrend} />
        </KPICard>
      </div>

      {/* ── Row 2: Transactions + Revenue Chart + Donut ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-5">

        {/* Transaction list */}
        <div className="lg:col-span-4">
          <SectionCard
            title="Transactions"
            subtitle="Recent subscriber & unlock activity"
            action={
              <button className="text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            }
          >
            {transactionFeed.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-border rounded-xl">
                <DollarSign className="w-7 h-7 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No transactions yet</p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">Revenue appears here as you get subscribers.</p>
              </div>
            ) : (
              <div className="space-y-0.5 max-h-[320px] overflow-y-auto pr-1">
                {transactionFeed.map(tx => (
                  <div key={tx.id} className="flex items-center gap-3 py-2.5 px-2 rounded-xl hover:bg-secondary/50 transition-colors">
                    <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-base shrink-0">
                      {tx.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{tx.title}</p>
                      <p className="text-[10px] text-muted-foreground">{tx.sub}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-xs font-bold ${tx.statusColor}`}>{tx.amount}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{tx.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        {/* Revenue / Views bar chart */}
        <div className="lg:col-span-5">
          <SectionCard
            title="Views & Engagement"
            subtitle={`Monthly trend · ${range}`}
            action={
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary inline-block" />Views</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-pink-400 inline-block" />Likes</span>
              </div>
            }
          >
            {monthlyViews.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyViews} barGap={3} barCategoryGap="35%">
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="views" name="Views" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="likes" name="Likes" fill="#ec4899" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </SectionCard>
        </div>

        {/* Hit-rate donut */}
        <div className="lg:col-span-3">
          <SectionCard title="Accuracy Breakdown" subtitle="Prediction outcomes">
            {outcomePie.length === 0 ? (
              <div className="text-center py-8">
                <Target className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No predictions yet</p>
              </div>
            ) : (
              <>
                <div className="flex justify-center mb-3">
                  <div className="relative">
                    <ResponsiveContainer width={140} height={140}>
                      <PieChart>
                        <Pie data={outcomePie} cx="50%" cy="50%" innerRadius={42} outerRadius={62} dataKey="value" paddingAngle={3} startAngle={90} endAngle={-270}>
                          {outcomePie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <p className="text-xl font-medium leading-none tabular-nums">
                        {scoring.total > 0 ? `${scoring.score.toFixed(0)}` : "—"}
                      </p>
                      <p className="text-[9px] text-muted-foreground">Score</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {outcomePie.map(o => (
                    <div key={o.name} className="flex items-center gap-2 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: o.color }} />
                      <span className="text-muted-foreground flex-1">{o.name}</span>
                      <span className="font-bold">{o.value}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground text-center mt-3">
                  See stats on your <Link to="/analyst" className="text-primary hover:underline">public profile</Link>
                </p>
              </>
            )}
          </SectionCard>
        </div>
      </div>

      {/* ── Row 3: Top reports + Subscribers + Promo ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-5">

        {/* Top reports horizontal bars */}
        <div className="lg:col-span-5">
          <SectionCard
            title="Report Performance"
            subtitle="Top reports by views"
            action={
              <Link to="/analyst" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                All reports <ChevronRight className="w-3 h-3" />
              </Link>
            }
          >
            {published.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-border rounded-xl">
                <FileText className="w-7 h-7 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-2">No published reports yet</p>
                <Link to="/editor"><button className="text-xs font-semibold text-primary hover:underline">Write your first report</button></Link>
              </div>
            ) : (
              <div className="space-y-3">
                {topReports.map((r, i) => {
                  const w = Math.round((r.views || 0) / maxViews * 100);
                  const isHit = r.prediction_outcome === "hit" || r.prediction_outcome === "near";
                  const isMiss = r.prediction_outcome === "miss";
                  return (
                    <button
                      key={r.id}
                      onClick={() => navigate(`/report?id=${r.id}`)}
                      className="w-full text-left group"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold truncate max-w-[60%] group-hover:text-primary transition-colors">
                          {r.title}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          {r.prediction_outcome && r.prediction_outcome !== "pending" && (
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-tag ${isHit ? "bg-green-100 text-green-700" : isMiss ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                              {isHit ? "HIT" : isMiss ? "MISS" : (r.prediction_outcome || "").toUpperCase()}
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground tabular-nums">
                            👁 {(r.views || 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${w}%`,
                            background: isHit ? "#22c55e" : isMiss ? "#ef4444" : "hsl(var(--primary))",
                          }}
                        />
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-muted-foreground">♥ {r.likes || 0}</span>
                        {r.is_premium && <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-tag">Premium</span>}
                        <span className="text-[10px] text-muted-foreground ml-auto">{format(new Date(r.created_date), "MMM d")}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </div>

        {/* Subscribers table */}
        <div className="lg:col-span-4">
          <SectionCard
            title="Active Subscribers"
            subtitle={`${activeSubs.length} paying subscribers`}
            action={
              <span className="text-[10px] font-bold text-gain bg-gain/10 border border-gain/20 px-2 py-0.5 rounded-tag">
                ${mrr}/mo
              </span>
            }
          >
            {activeSubs.length === 0 ? (
              <div className="text-center py-8">
                <Crown className="w-7 h-7 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-1">No subscribers yet</p>
                <p className="text-xs text-muted-foreground/60">Enable premium reports to start earning.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                {activeSubs.map(sub => (
                  <div key={sub.id} className="flex items-center gap-3 py-2 px-2 rounded-xl hover:bg-secondary/50 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0 overflow-hidden">
                      {sub.analyst_avatar
                        ? <img src={sub.analyst_avatar} alt="" className="w-full h-full object-cover" />
                        : (sub.subscriber_email?.[0] || "?").toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{sub.subscriber_email?.split("@")[0]}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{sub.plan || "monthly"}</p>
                    </div>
                    <span className="text-xs font-bold text-green-600 shrink-0">${sub.price || 29}</span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        {/* Revenue Projector + Promo card */}
        <div className="lg:col-span-3 flex flex-col gap-5">
          {/* Revenue Projector */}
          <div className="bg-card border border-border rounded-2xl p-5 flex-1">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" /> Revenue Projector
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide block mb-1">Price ($/mo)</label>
                <input
                  type="number"
                  value={subPrice}
                  onChange={e => setSubPrice(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/30 bg-card"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide block mb-1">
                  Target subs: <span className="text-foreground">{targetSubs}</span>
                </label>
                <input type="range" min={1} max={200} value={targetSubs} onChange={e => setTargetSubs(+e.target.value)} className="w-full accent-primary" />
              </div>
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                {[
                  { label: "MRR", value: `$${projMRR.toLocaleString()}`, color: "text-green-600", bg: "bg-green-50" },
                  { label: "Annual", value: `$${(projAnnual/1000).toFixed(0)}k`, color: "text-blue-600", bg: "bg-blue-50" },
                  { label: "Net", value: `$${projNet.toLocaleString()}`, color: "text-purple-600", bg: "bg-purple-50" },
                ].map(s => (
                  <div key={s.label} className={`${s.bg} rounded-xl p-2 text-center border border-border/40`}>
                    <p className={`text-sm font-medium ${s.color}`}>{s.value}</p>
                    <p className="text-[9px] text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Level Up Promo — Figma navy/gold */}
          <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #1a1050 0%, #2d1b8e 60%, #3730a3 100%)" }}>
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(201,150,19,0.25) 0%, transparent 70%)", transform: "translate(20%, -20%)" }} />
            <div className="text-2xl mb-2 relative z-10">👑</div>
            <div className="relative z-10">
              <h3 className="text-white font-medium text-sm leading-snug mb-1.5">
                Level up your analytics to the next level.
              </h3>
              <p className="text-white/55 text-[11px] leading-relaxed mb-3">
                Unlock advanced insights, audience demographics, and revenue tools.
              </p>
              <Link to="/editor">
                <button className="w-full py-2 rounded-xl font-bold text-xs transition-all hover:opacity-90" style={{ background: "linear-gradient(135deg, hsl(var(--accent)), hsl(var(--accent)/0.8))", color: "#1a1050" }}>
                  Write a Premium Report
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 4: Monthly subscribers area chart + Prediction table ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">

        {/* Monthly subscriber growth */}
        <SectionCard
          title="Subscriber Growth"
          subtitle="New subscribers per month"
        >
          {monthlySubs.length < 2 ? (
            <div className="h-[180px] flex items-center justify-center text-sm text-muted-foreground">Not enough data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={monthlySubs}>
                <defs>
                  <linearGradient id="subGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={24} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="value" name="New Subscribers" stroke="hsl(var(--primary))" fill="url(#subGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        {/* Prediction stats summary */}
        <SectionCard
          title="Prediction Scorecard"
          subtitle="All-time track record"
          action={
            <Link to="/predictions" className="text-xs text-primary hover:underline flex items-center gap-0.5">
              Full table <ChevronRight className="w-3 h-3" />
            </Link>
          }
        >
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Total Calls",  value: scoring.total || 0,                            color: "text-foreground" },
              { label: "Hit Rate",     value: scoring.total > 0 ? `${scoring.score.toFixed(0)}` : "—", color: "text-primary" },
              { label: "Avg Yield",    value: formatYield(avgYield),                          color: avgYield == null ? "text-muted-foreground" : avgYield >= 0 ? "text-green-600" : "text-red-500" },
              { label: "Hits",         value: scoring.hits || 0,                              color: "text-green-600" },
              { label: "Misses",       value: scoring.misses || 0,                            color: "text-red-500" },
              { label: "Pending",      value: (scoring.total || 0) - (scoring.hits || 0) - (scoring.misses || 0) > 0 ? (scoring.total || 0) - (scoring.hits || 0) - (scoring.misses || 0) : 0, color: "text-amber-500" },
            ].map(s => (
              <div key={s.label} className="bg-secondary rounded-xl p-3 text-center">
                <p className={`text-xl font-medium ${s.color} tabular-nums`}>{s.value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
          {scoring.total === 0 && (
            <p className="text-xs text-muted-foreground text-center mt-4">
              Add prediction blocks to your reports to build your track record.
            </p>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
