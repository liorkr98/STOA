import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Target, TrendingUp, CheckCircle2, XCircle, Clock, Loader2, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { addMonths, differenceInDays, format } from "date-fns";
import { avatarUrl } from "@/lib/avatarUrl";

const STATUS_CONFIG = {
  hit:     { label: "Exact Hit",    color: "text-gain",             bg: "bg-gain/10 border-gain/30",       icon: CheckCircle2 },
  near:    { label: "Near Hit",     color: "text-primary",          bg: "bg-primary/10 border-primary/30", icon: CheckCircle2 },
  partial: { label: "Directional", color: "text-amber-600",        bg: "bg-amber-50 border-amber-200",    icon: TrendingUp   },
  miss:    { label: "Miss",         color: "text-loss",             bg: "bg-loss/10 border-loss/30",       icon: XCircle      },
  pending: { label: "In Progress",  color: "text-muted-foreground", bg: "bg-secondary border-border",      icon: Clock        },
};

const CREDIT_MAP = { hit: 1.0, near: 0.75, partial: 0.25, miss: 0 };
const PIE_COLORS = ["hsl(152,55%,36%)", "hsl(217,91%,55%)", "hsl(35,90%,50%)", "hsl(0,72%,52%)", "hsl(215,20%,65%)"];

function getPendingStatus(report) {
  const months = parseInt(report.prediction_timeframe) || 6;
  const lockTime = report.prediction_lock_time ? new Date(report.prediction_lock_time) : new Date(report.created_date);
  const expiryDate = addMonths(lockTime, months);
  const daysLeft = differenceInDays(expiryDate, new Date());
  return { status: "pending", label: "In Progress", daysLeft: Math.max(0, daysLeft) };
}

export default function PredictionSummaryPage() {
  const navigate = useNavigate();
  const [filterStatus, setFilterStatus] = useState("all");
  const [reports, setReports] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);
      const data = await base44.entities.Report.filter({ created_by: user.email }, "-created_date", 200);
      setReports((data || []).filter(r => r.prediction_action));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Trigger a check run, then reload
    try { await base44.functions.invoke("checkPredictions", {}); } catch {}
    await load();
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  // Augment each report with a resolved outcome object
  const predictions = reports.map(r => {
    let outcome;
    if (r.prediction_outcome && r.prediction_outcome !== "pending") {
      const cfg = STATUS_CONFIG[r.prediction_outcome] || STATUS_CONFIG.miss;
      outcome = { status: r.prediction_outcome, label: cfg.label, credit: CREDIT_MAP[r.prediction_outcome] ?? 0 };
    } else {
      outcome = getPendingStatus(r);
    }
    return { ...r, outcome };
  });

  const completed = predictions.filter(p => p.outcome?.status !== "pending");
  const hits    = predictions.filter(p => p.outcome?.status === "hit").length;
  const near    = predictions.filter(p => p.outcome?.status === "near").length;
  const partial = predictions.filter(p => p.outcome?.status === "partial").length;
  const misses  = predictions.filter(p => p.outcome?.status === "miss").length;
  const pending = predictions.filter(p => p.outcome?.status === "pending").length;
  const totalCredit = completed.reduce((s, p) => s + (p.outcome?.credit || 0), 0);
  const accuracy = completed.length > 0 ? ((totalCredit / completed.length) * 100).toFixed(1) : null;

  const pieData = [
    { name: "Exact Hit",    value: hits    },
    { name: "Near Hit",     value: near    },
    { name: "Directional",  value: partial },
    { name: "Miss",         value: misses  },
    { name: "Pending",      value: pending },
  ].filter(d => d.value > 0);

  const filtered = predictions.filter(p => filterStatus === "all" || p.outcome?.status === filterStatus);
  const displayName = currentUser?.full_name || currentUser?.email?.split("@")[0] || "Researcher";

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {avatarUrl(currentUser)
            ? <img src={avatarUrl(currentUser)} alt={displayName} className="w-10 h-10 rounded-full object-cover" />
            : <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-base font-medium text-primary">{displayName?.[0]}</div>
          }
          <div>
            <h1 className="text-xl font-medium">Prediction Summary</h1>
            <p className="text-sm text-muted-foreground">{displayName} · All locked predictions</p>
          </div>
        </div>
        <button onClick={handleRefresh} disabled={refreshing}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-border rounded-lg text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all disabled:opacity-50">
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Checking..." : "Check Prices"}
        </button>
      </div>

      {predictions.length === 0 ? (
        <div className="text-center py-16">
          <Target className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="text-base font-medium text-muted-foreground mb-2">No predictions yet</h2>
          <p className="text-sm text-muted-foreground">Publish a report with a locked prediction to track it here.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Accuracy",    value: accuracy ? `${accuracy}%` : "—", sub: `${completed.length} resolved`,  colorClass: "text-primary",          bgClass: "bg-primary/5 border-primary/20"   },
              { label: "Exact Hits",  value: hits,                             sub: "100% credit",                   colorClass: "text-gain",             bgClass: "bg-gain/10 border-gain/20"       },
              { label: "Misses",      value: misses,                           sub: "0% credit",                     colorClass: "text-loss",             bgClass: "bg-loss/10 border-loss/20"       },
              { label: "In Progress", value: pending,                          sub: "awaiting resolution",           colorClass: "text-muted-foreground", bgClass: "bg-secondary border-border"       },
            ].map(s => (
              <div key={s.label} className={`rounded-xl border p-3 text-center ${s.bgClass}`}>
                <p className={`text-2xl font-medium ${s.colorClass}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-[10px] text-muted-foreground">{s.sub}</p>
              </div>
            ))}
          </div>

          {pieData.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-4 mb-6">
              <h3 className="font-medium text-sm mb-3">Outcome Distribution</h3>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}
                    label={({ name, value }) => `${name}: ${value}`} labelLine={false} fontSize={11}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="flex flex-wrap gap-2 mb-4">
            {["all", "hit", "near", "partial", "miss", "pending"].map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`text-xs px-3 py-1.5 rounded-tag border transition-all capitalize ${filterStatus === s ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                {s === "all" ? "All" : STATUS_CONFIG[s]?.label || s}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {filtered.map(report => {
              const outcome = report.outcome;
              const cfg = STATUS_CONFIG[outcome?.status] || STATUS_CONFIG.pending;
              const Icon = cfg.icon;
              return (
                <div key={report.id} onClick={() => navigate(`/report?id=${report.id}`)}
                  className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer hover:shadow-sm transition-all ${cfg.bg}`}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${cfg.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{report.title}</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      {report.prediction_ticker && <span className="font-display font-medium">${report.prediction_ticker}</span>}
                      {report.prediction_action && <span className="capitalize">{report.prediction_action}</span>}
                      {report.prediction_lock_price && <span>Lock: <strong>${report.prediction_lock_price}</strong></span>}
                      {report.prediction_target_price && <span>Target: <strong>${report.prediction_target_price}</strong></span>}
                      {report.prediction_resolved_price && <span>Resolved @ <strong>${report.prediction_resolved_price}</strong></span>}
                      {report.prediction_resolved_time && <span>{format(new Date(report.prediction_resolved_time), "MMM d, yyyy")}</span>}
                      {report.prediction_timeframe && !report.prediction_resolved_time && <span>{report.prediction_timeframe}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className={`text-xs font-medium ${cfg.color}`}>{outcome.label}</span>
                    {outcome.status === "pending" && <span className="text-[10px] text-muted-foreground">{outcome.daysLeft}d left</span>}
                    {outcome.credit != null && outcome.status !== "pending" && (
                      <span className="text-[10px] text-muted-foreground">{(outcome.credit * 100).toFixed(0)}% credit</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}