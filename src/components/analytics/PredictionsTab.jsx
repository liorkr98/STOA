import React, { useMemo } from "react";
import { format } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import AnalyticsKPICard from "./AnalyticsKPICard";
import { computeAvgYield, formatYield } from "@/lib/yieldCalc";
import { Target } from "lucide-react";

function calcYield(action, lock, resolved) {
  if (!lock || !resolved) return null;
  if (action === "Long") return ((resolved - lock) / lock * 100);
  if (action === "Short") return ((lock - resolved) / lock * 100);
  return null;
}

export default function PredictionsTab({ reports }) {
  const allPredictions = useMemo(() => reports.filter(r => r.prediction_action), [reports]);
  const resolved = useMemo(() => allPredictions.filter(r => r.prediction_outcome && r.prediction_outcome !== "pending"), [allPredictions]);
  const pending = useMemo(() => allPredictions.filter(r => !r.prediction_outcome || r.prediction_outcome === "pending"), [allPredictions]);
  const hits = useMemo(() => resolved.filter(r => r.prediction_outcome === "hit" || r.prediction_outcome === "near").length, [resolved]);
  const accuracy = resolved.length > 0 ? ((hits / resolved.length) * 100).toFixed(1) : null;
  const avgYield = computeAvgYield(resolved);

  // Running accuracy chart
  const accuracyTrend = useMemo(() => {
    const sorted = [...resolved].sort((a, b) => new Date(a.prediction_resolved_time || a.created_date) - new Date(b.prediction_resolved_time || b.created_date));
    let cumHits = 0;
    return sorted.map((r, i) => {
      if (r.prediction_outcome === "hit" || r.prediction_outcome === "near") cumHits++;
      return {
        index: i + 1,
        accuracy: parseFloat(((cumHits / (i + 1)) * 100).toFixed(1)),
        outcome: r.prediction_outcome,
      };
    });
  }, [resolved]);

  // Best & worst
  const withYield = useMemo(() => resolved.map(r => ({
    ...r,
    yield: calcYield(r.prediction_action, r.prediction_lock_price, r.prediction_resolved_price),
  })).filter(r => r.yield !== null), [resolved]);

  const bestCall = useMemo(() => withYield.length > 0 ? [...withYield].sort((a, b) => b.yield - a.yield)[0] : null, [withYield]);
  const worstCall = useMemo(() => withYield.length > 0 ? [...withYield].sort((a, b) => a.yield - b.yield)[0] : null, [withYield]);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <AnalyticsKPICard icon="📊" label="Total Calls" value={allPredictions.length} sub="All time" color="text-primary" />
        <AnalyticsKPICard icon="✅" label="Resolved" value={resolved.length} sub="Closed predictions" color="text-primary" />
        <AnalyticsKPICard icon="🎯" label="Accuracy" value={accuracy ? `${accuracy}%` : "—"} sub="Hit rate" color={accuracy >= 60 ? "text-primary" : "text-accent"} />
        <AnalyticsKPICard icon="📈" label="Avg Yield" value={formatYield(avgYield)} sub="Avg return" color={avgYield == null ? "text-muted-foreground" : avgYield >= 0 ? "text-primary" : "text-loss"} />
        <AnalyticsKPICard icon="⏳" label="Active" value={pending.length} sub="Pending" color="text-accent" />
      </div>

      {/* Accuracy Trend */}
      {accuracyTrend.length > 1 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-medium text-sm mb-4">Accuracy Trend</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={accuracyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="index" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} label={{ value: "Call #", position: "insideBottom", offset: -2, fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={v => `${v}%`} />
              <Tooltip formatter={v => [`${v}%`, "Running Accuracy"]} />
              <Line type="monotone" dataKey="accuracy" stroke="#2563eb" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Best & Worst */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-medium text-sm mb-3">🏆 Best Call</h3>
          {bestCall ? (
            <div className="space-y-2">
              <p className="font-medium text-lg">{bestCall.prediction_ticker}</p>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-tag ${bestCall.prediction_action === "Long" ? "bg-gain/10 text-primary" : "bg-loss/10 text-loss"}`}>{bestCall.prediction_action}</span>
                <span className="text-primary font-medium text-lg">+{bestCall.yield.toFixed(2)}%</span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-tag bg-primary/10 text-primary border border-primary/20">Hit ✅</span>
              </div>
              <p className="text-xs text-muted-foreground">{bestCall.title?.slice(0, 50)}</p>
            </div>
          ) : <p className="text-sm text-muted-foreground">No resolved calls yet</p>}
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-medium text-sm mb-3">📉 Worst Call</h3>
          {worstCall && worstCall.id !== bestCall?.id ? (
            <div className="space-y-2">
              <p className="font-medium text-lg">{worstCall.prediction_ticker}</p>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-tag ${worstCall.prediction_action === "Long" ? "bg-gain/10 text-primary" : "bg-loss/10 text-loss"}`}>{worstCall.prediction_action}</span>
                <span className={`font-medium text-lg ${worstCall.yield >= 0 ? "text-primary" : "text-loss"}`}>{worstCall.yield >= 0 ? "+" : ""}{worstCall.yield.toFixed(2)}%</span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-tag bg-muted text-loss border border-loss/20">Miss ❌</span>
              </div>
              <p className="text-xs text-muted-foreground">{worstCall.title?.slice(0, 50)}</p>
            </div>
          ) : <p className="text-sm text-muted-foreground">No missed calls yet</p>}
        </div>
      </div>

      {/* Prediction History Table */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-medium text-sm mb-4">Prediction History</h3>
        {allPredictions.length === 0 ? (
          <div className="text-center py-10">
            <Target className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No predictions yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-2 text-[11px] font-medium text-muted-foreground">Ticker</th>
                  <th className="pb-2 text-[11px] font-medium text-muted-foreground">Dir</th>
                  <th className="pb-2 text-[11px] font-medium text-muted-foreground">Entry</th>
                  <th className="pb-2 text-[11px] font-medium text-muted-foreground">Target</th>
                  <th className="pb-2 text-[11px] font-medium text-muted-foreground">Exit</th>
                  <th className="pb-2 text-[11px] font-medium text-muted-foreground">Yield</th>
                  <th className="pb-2 text-[11px] font-medium text-muted-foreground">Outcome</th>
                  <th className="pb-2 text-[11px] font-medium text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {allPredictions.map(r => {
                  const yld = calcYield(r.prediction_action, r.prediction_lock_price, r.prediction_resolved_price);
                  const isPending = !r.prediction_outcome || r.prediction_outcome === "pending";
                  const isHit = r.prediction_outcome === "hit" || r.prediction_outcome === "near";
                  return (
                    <tr key={r.id} className={`hover:bg-secondary/40 transition-colors ${isHit ? "bg-primary/10/30" : !isPending ? "bg-muted/30" : ""}`}>
                      <td className="py-2 font-medium">{r.prediction_ticker || "—"}</td>
                      <td className="py-2">
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${r.prediction_action === "Long" ? "bg-gain/10 text-primary" : r.prediction_action === "Short" ? "bg-loss/10 text-loss" : "bg-gray-100 text-gray-700"}`}>
                          {r.prediction_action}
                        </span>
                      </td>
                      <td className="py-2 text-xs">{r.prediction_lock_price ? `$${r.prediction_lock_price}` : "—"}</td>
                      <td className="py-2 text-xs">{r.prediction_target_price ? `$${r.prediction_target_price}` : "—"}</td>
                      <td className="py-2 text-xs">{r.prediction_resolved_price ? `$${r.prediction_resolved_price}` : "—"}</td>
                      <td className={`py-2 text-xs font-medium ${yld === null ? "text-muted-foreground" : yld >= 0 ? "text-primary" : "text-loss"}`}>
                        {yld !== null ? `${yld >= 0 ? "+" : ""}${yld.toFixed(1)}%` : "—"}
                      </td>
                      <td className="py-2">
                        {isPending ? (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-tag bg-accent/10 text-accent border border-accent/30">Pending</span>
                        ) : isHit ? (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-tag bg-primary/10 text-primary border border-primary/20">Hit ✅</span>
                        ) : (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-tag bg-muted text-loss border border-loss/20 capitalize">{r.prediction_outcome} ❌</span>
                        )}
                      </td>
                      <td className="py-2 text-xs text-muted-foreground whitespace-nowrap">{format(new Date(r.created_date), "MMM d, yy")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}