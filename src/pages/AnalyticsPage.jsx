import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, TrendingUp, TrendingDown, Minus, Target, CheckCircle2,
  XCircle, Clock, BarChart3, Flame, Zap, Filter, RefreshCw,
  ChevronUp, ChevronDown, Loader2, AlertCircle, Award, Activity,
  DollarSign, Percent, Calendar, Hash
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend
} from "recharts";
import { base44 } from "@/api/base44Client";
import { format, differenceInDays, parseISO } from "date-fns";

const ACTION_COLORS = { Long: "#22c55e", Short: "#ef4444", Hold: "#f59e0b" };
const OUTCOME_COLORS = { hit: "#22c55e", near: "#3b82f6", partial: "#f59e0b", miss: "#ef4444", pending: "#94a3b8" };
const OUTCOME_LABELS = { hit: "Hit", near: "Near Hit", partial: "Partial", miss: "Miss", pending: "Pending" };

function StatCard({ icon: Icon, label, value, sub, color = "text-primary", trend }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-1">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
      {trend != null && (
        <div className={`flex items-center gap-0.5 text-xs font-semibold mt-0.5 ${trend >= 0 ? "text-gain" : "text-loss"}`}>
          {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {trend >= 0 ? "+" : ""}{trend.toFixed(1)}% yield
        </div>
      )}
    </div>
  );
}

function OutcomeBadge({ outcome }) {
  const cfg = {
    hit:     { cls: "bg-gain/10 text-gain border-gain/20",          icon: CheckCircle2, label: "Hit" },
    near:    { cls: "bg-primary/10 text-primary border-primary/20", icon: TrendingUp,   label: "Near" },
    partial: { cls: "bg-amber-50 text-amber-600 border-amber-200",  icon: Minus,        label: "Partial" },
    miss:    { cls: "bg-loss/10 text-loss border-loss/20",          icon: XCircle,      label: "Miss" },
    pending: { cls: "bg-secondary text-muted-foreground border-border", icon: Clock,    label: "Pending" },
  }[outcome] || { cls: "bg-secondary text-muted-foreground border-border", icon: Clock, label: outcome };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.cls}`}>
      <Icon className="w-3 h-3" />{cfg.label}
    </span>
  );
}

function ActionBadge({ action }) {
  const cfg = {
    Long:  { cls: "bg-gain/10 text-gain border-gain/20",          icon: TrendingUp },
    Short: { cls: "bg-loss/10 text-loss border-loss/20",          icon: TrendingDown },
    Hold:  { cls: "bg-amber-50 text-amber-600 border-amber-200",  icon: Minus },
  }[action] || { cls: "bg-secondary text-muted-foreground border-border", icon: Minus };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.cls}`}>
      <Icon className="w-3 h-3" />{action}
    </span>
  );
}

function pct(v) { return v != null ? `${v > 0 ? "+" : ""}${Number(v).toFixed(2)}%` : "—"; }
function price(v) { return v != null ? `$${Number(v).toFixed(2)}` : "—"; }

const SORT_OPTIONS = [
  { key: "created_date", label: "Newest" },
  { key: "outcome", label: "Outcome" },
  { key: "prediction_action", label: "Direction" },
  { key: "prediction_ticker", label: "Ticker" },
];

export default function AnalyticsPage() {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [analysts, setAnalysts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("All");
  const [outcomeFilter, setOutcomeFilter] = useState("All");
  const [sortKey, setSortKey] = useState("created_date");
  const [sortAsc, setSortAsc] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    Promise.all([
      base44.entities.Report.filter({ status: "published" }, "-created_date", 500),
      base44.entities.User.list("-accuracy_score", 50),
    ]).then(([rpts, usrs]) => {
      setReports((rpts || []).filter(r => r.prediction_action));
      setAnalysts((usrs || []).filter(u => u.accuracy_score > 0));
    }).finally(() => setLoading(false));
  }, []);

  // ---- Derived stats ----
  const stats = useMemo(() => {
    const resolved = reports.filter(r => r.prediction_outcome && r.prediction_outcome !== "pending");
    const pending  = reports.filter(r => !r.prediction_outcome || r.prediction_outcome === "pending");
    const hits     = resolved.filter(r => r.prediction_outcome === "hit");
    const near     = resolved.filter(r => r.prediction_outcome === "near");
    const partial  = resolved.filter(r => r.prediction_outcome === "partial");
    const misses   = resolved.filter(r => r.prediction_outcome === "miss");
    const hitRate  = resolved.length > 0 ? ((hits.length + near.length * 0.5 + partial.length * 0.25) / resolved.length * 100) : 0;

    // Yield calc: (resolved_price - lock_price) / lock_price * direction
    const yieldData = resolved
      .filter(r => r.prediction_resolved_price && r.prediction_lock_price)
      .map(r => {
        const raw = (r.prediction_resolved_price - r.prediction_lock_price) / r.prediction_lock_price * 100;
        return r.prediction_action === "Short" ? -raw : raw;
      });
    const avgYield = yieldData.length > 0 ? yieldData.reduce((a, b) => a + b, 0) / yieldData.length : 0;

    // By action
    const byAction = ["Long", "Short", "Hold"].map(a => ({
      name: a,
      count: reports.filter(r => r.prediction_action === a).length,
      hits: reports.filter(r => r.prediction_action === a && r.prediction_outcome === "hit").length,
    }));

    // By outcome for pie
    const outcomeCounts = ["hit","near","partial","miss","pending"].map(o => ({
      name: OUTCOME_LABELS[o],
      value: reports.filter(r => (r.prediction_outcome || "pending") === o).length,
      color: OUTCOME_COLORS[o],
    })).filter(o => o.value > 0);

    // Ticker frequency
    const tickerMap = {};
    reports.forEach(r => {
      if (r.prediction_ticker) tickerMap[r.prediction_ticker] = (tickerMap[r.prediction_ticker] || 0) + 1;
    });
    const topTickers = Object.entries(tickerMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([ticker, count]) => ({ ticker, count }));

    // Monthly call volume
    const monthMap = {};
    reports.forEach(r => {
      const d = r.prediction_lock_time || r.created_date;
      if (d) {
        const key = d.slice(0, 7);
        monthMap[key] = (monthMap[key] || 0) + 1;
      }
    });
    const monthlyVolume = Object.entries(monthMap)
      .sort()
      .slice(-12)
      .map(([month, calls]) => ({ month: month.slice(5), calls }));

    // Avg days held
    const daysArr = resolved
      .filter(r => r.prediction_lock_time && r.prediction_resolved_time)
      .map(r => differenceInDays(parseISO(r.prediction_resolved_time), parseISO(r.prediction_lock_time)));
    const avgDays = daysArr.length > 0 ? daysArr.reduce((a, b) => a + b, 0) / daysArr.length : 0;

    return {
      total: reports.length, resolved: resolved.length, pending: pending.length,
      hits: hits.length, near: near.length, partial: partial.length, misses: misses.length,
      hitRate, avgYield, byAction, outcomeCounts, topTickers, monthlyVolume, avgDays,
    };
  }, [reports]);

  // ---- Filter + sort ----
  const filtered = useMemo(() => {
    let list = [...reports];
    if (actionFilter !== "All") list = list.filter(r => r.prediction_action === actionFilter);
    if (outcomeFilter !== "All") list = list.filter(r => (r.prediction_outcome || "pending") === outcomeFilter);
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      list = list.filter(r => (r.prediction_ticker || "").toLowerCase().includes(s) || (r.title || "").toLowerCase().includes(s) || (r.author_name || "").toLowerCase().includes(s));
    }
    list.sort((a, b) => {
      let av = a[sortKey] ?? "", bv = b[sortKey] ?? "";
      if (typeof av === "string") av = av.toLowerCase();
      if (typeof bv === "string") bv = bv.toLowerCase();
      return sortAsc ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
    return list;
  }, [reports, actionFilter, outcomeFilter, search, sortKey, sortAsc]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortAsc(s => !s);
    else { setSortKey(key); setSortAsc(false); }
  };

  const TABS = [
    { id: "overview", label: "Overview" },
    { id: "predictions", label: `All Predictions (${reports.length})` },
    { id: "analysts", label: "Analyst Ranking" },
  ];

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground mb-2 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
          <h1 className="text-2xl font-bold">Prediction Analytics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Live performance data across all published analyst calls</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 bg-gain/10 border border-gain/20 text-gain rounded-full">
            <Activity className="w-3 h-3" /> Live
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === "overview" && (
        <>
          {/* KPI Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <StatCard icon={Hash}       label="Total Calls"    value={stats.total}                   color="text-foreground" />
            <StatCard icon={CheckCircle2} label="Hit Rate"     value={`${stats.hitRate.toFixed(1)}%`} color="text-gain"    sub={`${stats.hits} hits · ${stats.near} near · ${stats.partial} partial`} />
            <StatCard icon={Clock}       label="Pending"       value={stats.pending}                  color="text-amber-500" sub="Active predictions" />
            <StatCard icon={TrendingUp}  label="Avg Yield"     value={pct(stats.avgYield)}            color={stats.avgYield >= 0 ? "text-gain" : "text-loss"} sub="Across resolved calls" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            <StatCard icon={Flame}    label="Resolved"    value={stats.resolved}                                     color="text-primary"         sub={`${((stats.resolved/Math.max(stats.total,1))*100).toFixed(0)}% of all calls`} />
            <StatCard icon={XCircle}  label="Misses"      value={stats.misses}                                        color="text-loss"            sub={`${((stats.misses/Math.max(stats.resolved,1))*100).toFixed(0)}% miss rate`} />
            <StatCard icon={Calendar} label="Avg Hold"    value={`${stats.avgDays.toFixed(0)}d`}                     color="text-muted-foreground" sub="Average days to resolve" />
            <StatCard icon={Award}    label="Analysts"    value={analysts.length}                                     color="text-purple-500"      sub="With active track record" />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Outcome distribution pie */}
            {stats.outcomeCounts.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-4">
                <h3 className="font-semibold text-sm mb-4">Outcome Distribution</h3>
                <div className="flex items-center gap-6">
                  <ResponsiveContainer width={140} height={140}>
                    <PieChart>
                      <Pie data={stats.outcomeCounts} cx="50%" cy="50%" innerRadius={38} outerRadius={62} dataKey="value" paddingAngle={3}>
                        {stats.outcomeCounts.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-col gap-1.5">
                    {stats.outcomeCounts.map(o => (
                      <div key={o.name} className="flex items-center gap-2 text-xs">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: o.color }} />
                        <span className="text-muted-foreground">{o.name}</span>
                        <span className="font-bold ml-auto">{o.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* By action */}
            {stats.byAction.some(a => a.count > 0) && (
              <div className="bg-card border border-border rounded-xl p-4">
                <h3 className="font-semibold text-sm mb-4">Calls by Direction</h3>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={stats.byAction} barSize={28}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={25} />
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                    <Bar dataKey="count" name="Total Calls" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
                    <Bar dataKey="hits"  name="Hits"        fill="#22c55e"              radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Monthly volume + top tickers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {stats.monthlyVolume.length > 1 && (
              <div className="bg-card border border-border rounded-xl p-4">
                <h3 className="font-semibold text-sm mb-4">Monthly Call Volume</h3>
                <ResponsiveContainer width="100%" height={140}>
                  <AreaChart data={stats.monthlyVolume}>
                    <defs>
                      <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={20} />
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                    <Area type="monotone" dataKey="calls" stroke="hsl(var(--primary))" fill="url(#volGrad)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {stats.topTickers.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-4">
                <h3 className="font-semibold text-sm mb-4">Most Covered Tickers</h3>
                <div className="space-y-2">
                  {stats.topTickers.map((t, i) => (
                    <div key={t.ticker} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                      <span className="text-xs font-bold text-foreground font-mono w-14">{t.ticker}</span>
                      <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${(t.count / stats.topTickers[0].count) * 100}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-muted-foreground w-6 text-right">{t.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── PREDICTIONS TAB ── */}
      {activeTab === "predictions" && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-secondary rounded-xl">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search ticker, title, analyst…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="border border-border rounded-lg px-3 py-1.5 text-xs bg-card focus:outline-none focus:ring-1 focus:ring-primary w-48"
            />
            <div className="flex gap-1">
              {["All","Long","Short","Hold"].map(a => (
                <button key={a} onClick={() => setActionFilter(a)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all ${actionFilter === a ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary/40 bg-card"}`}>
                  {a}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              {["All","hit","near","partial","miss","pending"].map(o => (
                <button key={o} onClick={() => setOutcomeFilter(o)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all capitalize ${outcomeFilter === o ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary/40 bg-card"}`}>
                  {OUTCOME_LABELS[o] || o}
                </button>
              ))}
            </div>
            <span className="ml-auto text-xs text-muted-foreground">{filtered.length} results</span>
          </div>

          {/* Table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-secondary text-[10px] font-semibold text-muted-foreground uppercase tracking-wide border-b border-border">
              {[
                { label: "Ticker",    key: "prediction_ticker",   span: 2 },
                { label: "Direction", key: "prediction_action",   span: 2 },
                { label: "Analyst",   key: "author_name",         span: 2 },
                { label: "Lock",      key: "prediction_lock_price", span: 1 },
                { label: "Target",    key: "prediction_target_price", span: 1 },
                { label: "Resolved",  key: "prediction_resolved_price", span: 1 },
                { label: "Outcome",   key: "prediction_outcome",  span: 2 },
                { label: "Date",      key: "created_date",        span: 1 },
              ].map(col => (
                <button key={col.key}
                  onClick={() => toggleSort(col.key)}
                  className={`col-span-${col.span} text-left flex items-center gap-0.5 hover:text-foreground transition-colors ${sortKey === col.key ? "text-primary" : ""}`}>
                  {col.label}
                  {sortKey === col.key && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                </button>
              ))}
            </div>

            {/* Rows */}
            <div className="divide-y divide-border/50 max-h-[600px] overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="py-16 text-center text-sm text-muted-foreground">No predictions match your filters.</div>
              ) : filtered.map(r => {
                const locked  = r.prediction_lock_price;
                const target  = r.prediction_target_price;
                const resolved = r.prediction_resolved_price;
                const rawMove = (locked && resolved) ? ((resolved - locked) / locked * 100) : null;
                const directedMove = rawMove != null ? (r.prediction_action === "Short" ? -rawMove : rawMove) : null;
                return (
                  <button key={r.id}
                    onClick={() => navigate(`/report?id=${r.id}`)}
                    className="grid grid-cols-12 gap-2 px-4 py-3 w-full text-left hover:bg-secondary/60 transition-colors">
                    <div className="col-span-2 flex items-center">
                      <span className="text-sm font-bold font-mono text-foreground">{r.prediction_ticker || "—"}</span>
                    </div>
                    <div className="col-span-2 flex items-center">
                      <ActionBadge action={r.prediction_action} />
                    </div>
                    <div className="col-span-2 flex items-center">
                      <span className="text-xs text-muted-foreground truncate">{r.author_name || r.created_by?.split("@")[0] || "—"}</span>
                    </div>
                    <div className="col-span-1 flex items-center">
                      <span className="text-xs font-mono">{price(locked)}</span>
                    </div>
                    <div className="col-span-1 flex items-center">
                      <span className="text-xs font-mono text-muted-foreground">{price(target)}</span>
                    </div>
                    <div className="col-span-1 flex items-center gap-1">
                      <span className="text-xs font-mono">{price(resolved)}</span>
                      {directedMove != null && (
                        <span className={`text-[9px] font-bold ${directedMove >= 0 ? "text-gain" : "text-loss"}`}>
                          {directedMove >= 0 ? "+" : ""}{directedMove.toFixed(1)}%
                        </span>
                      )}
                    </div>
                    <div className="col-span-2 flex items-center">
                      <OutcomeBadge outcome={r.prediction_outcome || "pending"} />
                    </div>
                    <div className="col-span-1 flex items-center">
                      <span className="text-[10px] text-muted-foreground">{r.created_date ? format(new Date(r.created_date), "MMM d") : "—"}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ── ANALYST RANKING TAB ── */}
      {activeTab === "analysts" && (
        <div className="space-y-3">
          {/* Header row */}
          <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-secondary rounded-xl text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            <div className="col-span-1">#</div>
            <div className="col-span-3">Analyst</div>
            <div className="col-span-2">Accuracy</div>
            <div className="col-span-2">Yield</div>
            <div className="col-span-2">Hit Rate</div>
            <div className="col-span-2">Calls</div>
          </div>
          {analysts.map((a, i) => {
            const accPct = a.accuracy_score || 0;
            const yield_ = a.yearly_yield;
            const medals = ["🥇","🥈","🥉"];
            return (
              <button key={a.id}
                onClick={() => navigate(`/analyst?id=${a.id}`)}
                className="grid grid-cols-12 gap-2 px-4 py-3 w-full text-left bg-card border border-border rounded-xl hover:border-primary/30 hover:shadow-sm transition-all">
                <div className="col-span-1 flex items-center">
                  <span className="text-base">{i < 3 ? medals[i] : <span className="text-xs font-bold text-muted-foreground">#{i+1}</span>}</span>
                </div>
                <div className="col-span-3 flex items-center gap-2.5">
                  {a.picture
                    ? <img src={a.picture} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                    : <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                        {(a.full_name || "?")[0]}
                      </div>
                  }
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{a.full_name || a.email?.split("@")[0]}</p>
                    {a.tagline && <p className="text-[10px] text-muted-foreground truncate">{a.tagline}</p>}
                  </div>
                </div>
                <div className="col-span-2 flex items-center">
                  <span className={`text-sm font-bold ${accPct >= 80 ? "text-gain" : accPct >= 60 ? "text-amber-500" : "text-muted-foreground"}`}>
                    {accPct.toFixed(1)}%
                  </span>
                </div>
                <div className="col-span-2 flex items-center">
                  {yield_ != null && yield_ !== 0
                    ? <span className={`text-sm font-bold flex items-center gap-0.5 ${yield_ >= 0 ? "text-gain" : "text-loss"}`}>
                        {yield_ >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                        {yield_ >= 0 ? "+" : ""}{yield_.toFixed(1)}%
                      </span>
                    : <span className="text-sm text-muted-foreground">—</span>
                  }
                </div>
                <div className="col-span-2 flex items-center">
                  <span className="text-sm font-semibold text-foreground">
                    {a.hit_rate != null ? `${Number(a.hit_rate).toFixed(1)}%` : "—"}
                  </span>
                </div>
                <div className="col-span-2 flex items-center">
                  <span className="text-sm text-muted-foreground">{a.total_calls ?? "—"}</span>
                </div>
              </button>
            );
          })}
          {analysts.length === 0 && (
            <div className="text-center py-16 text-sm text-muted-foreground">No analysts with a track record yet.</div>
          )}
        </div>
      )}
    </div>
  );
}