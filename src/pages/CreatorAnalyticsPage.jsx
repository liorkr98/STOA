import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Loader2, Target } from "lucide-react";
import { computeAvgYield, formatYield } from "@/lib/yieldCalc";

function KPICard({ icon, label, value, sub, color = "text-primary" }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{icon}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
    </div>
  );
}

function calcYield(action, lock, resolved) {
  if (!lock || !resolved) return null;
  if (action === "Long") return ((resolved - lock) / lock * 100);
  if (action === "Short") return ((lock - resolved) / lock * 100);
  return null;
}

export default function CreatorAnalyticsPage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [reports, setReports] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [votes, setVotes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Revenue projector state
  const [subPrice, setSubPrice] = useState(29);
  const [targetSubs, setTargetSubs] = useState(10);

  useEffect(() => {
    base44.auth.me().then(async user => {
      setCurrentUser(user);
      const [reps, subs] = await Promise.all([
        base44.entities.Report.filter({ created_by: user.email }, "-created_date", 200).catch(() => []),
        base44.entities.Subscription.filter({ analyst_email: user.email, status: "active" }, "-created_date", 200).catch(() => []),
      ]);
      setReports(reps || []);
      setSubscriptions(subs || []);

      // Fetch all votes for published reports
      const published = (reps || []).filter(r => r.status === "published");
      if (published.length > 0) {
        const allVotes = await Promise.all(
          published.slice(0, 20).map(r => base44.entities.Vote.filter({ report_id: r.id }).catch(() => []))
        );
        setVotes(allVotes.flat());
      }
    }).finally(() => setLoading(false));
  }, []);

  const published = useMemo(() => reports.filter(r => r.status === "published"), [reports]);
  const totalViews = useMemo(() => published.reduce((s, r) => s + (r.views || 0), 0), [published]);
  const totalLikes = useMemo(() => published.reduce((s, r) => s + (r.likes || 0), 0), [published]);
  const activeSubs = subscriptions.filter(s => s.status === "active");
  const mrr = activeSubs.reduce((s, sub) => s + (sub.price || 29), 0);

  // Sorted by views desc
  const sortedReports = useMemo(() => [...published].sort((a, b) => (b.views || 0) - (a.views || 0)), [published]);

  // Predictions
  const predictions = useMemo(() => published.filter(r => r.prediction_action), [published]);
  const resolved = useMemo(() => predictions.filter(r => r.prediction_outcome && r.prediction_outcome !== "pending"), [predictions]);
  const hits = useMemo(() => resolved.filter(r => r.prediction_outcome === "hit" || r.prediction_outcome === "near").length, [resolved]);
  const accuracy = resolved.length > 0 ? ((hits / resolved.length) * 100).toFixed(1) : null;
  const avgYield = computeAvgYield(resolved);

  // Revenue projector calcs
  const projMRR = targetSubs * subPrice;
  const projAnnual = projMRR * 12;
  const projNet = projMRR * 0.85;

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Analytics & Revenue</h1>
          <p className="text-sm text-muted-foreground">Your complete performance overview</p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 border border-border rounded-xl text-sm font-medium hover:bg-secondary transition-colors"
          onClick={() => {
            const rows = [["Title","Views","Likes","Date"],...sortedReports.map(r=>[r.title,r.views||0,r.likes||0,format(new Date(r.created_date),"yyyy-MM-dd")])];
            const csv = rows.map(r=>r.join(",")).join("\n");
            const a=document.createElement("a"); a.href="data:text/csv,"+encodeURIComponent(csv); a.download="analytics.csv"; a.click();
          }}
        >
          📊 Export CSV
        </button>
      </div>

      {/* Section 1: KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard icon="💰" label="MRR" value={`$${mrr}/mo`} sub="Monthly recurring" color="text-green-600" />
        <KPICard icon="👥" label="Subscribers" value={activeSubs.length} sub="Active paying" color="text-purple-600" />
        <KPICard icon="👁" label="Total Views" value={totalViews.toLocaleString()} sub="All time views" color="text-blue-600" />
        <KPICard icon="❤️" label="Total Likes" value={totalLikes.toLocaleString()} sub="All time likes" color="text-pink-600" />
      </div>

      {/* Section 2: Per-Report Table */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="font-semibold text-sm mb-4">Report Performance</h2>
        {published.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No published reports yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-2 text-[11px] font-semibold text-muted-foreground">Title</th>
                  <th className="pb-2 text-[11px] font-semibold text-muted-foreground">Date</th>
                  <th className="pb-2 text-[11px] font-semibold text-muted-foreground">👁 Views</th>
                  <th className="pb-2 text-[11px] font-semibold text-muted-foreground">❤️ Likes</th>
                  <th className="pb-2 text-[11px] font-semibold text-muted-foreground">📊 Votes</th>
                  <th className="pb-2 text-[11px] font-semibold text-muted-foreground">Type</th>
                  <th className="pb-2 text-[11px] font-semibold text-muted-foreground">Prediction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sortedReports.map(r => {
                  const voteCount = votes.filter(v => v.report_id === r.id).length;
                  return (
                    <tr key={r.id} className="hover:bg-secondary/40 cursor-pointer transition-colors" onClick={() => navigate(`/report?id=${r.id}`)}>
                      <td className="py-2.5 font-medium max-w-[160px]"><span className="truncate block">{r.title}</span></td>
                      <td className="py-2.5 text-xs text-muted-foreground whitespace-nowrap">{format(new Date(r.created_date), "MMM d, yyyy")}</td>
                      <td className="py-2.5 text-blue-600 font-semibold">{r.views || 0}</td>
                      <td className="py-2.5 text-pink-600 font-semibold">{r.likes || 0}</td>
                      <td className="py-2.5 text-purple-600 font-semibold">{voteCount}</td>
                      <td className="py-2.5">
                        {r.is_premium
                          ? <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">🔒 Premium</span>
                          : <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border">🆓 Free</span>
                        }
                      </td>
                      <td className="py-2.5">
                        {r.prediction_action && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${r.prediction_action === "Long" ? "bg-green-100 text-green-700" : r.prediction_action === "Short" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}>
                            {r.prediction_action === "Long" ? "📈" : r.prediction_action === "Short" ? "📉" : "—"} {r.prediction_action} {r.prediction_ticker ? `$${r.prediction_ticker}` : ""}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border font-bold">
                  <td className="pt-2 text-xs text-muted-foreground" colSpan={2}>Totals</td>
                  <td className="pt-2 text-blue-600">{totalViews}</td>
                  <td className="pt-2 text-pink-600">{totalLikes}</td>
                  <td className="pt-2 text-purple-600">{votes.length}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Section 3: Active Subscribers */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="font-semibold text-sm mb-4">Active Subscribers</h2>
        {activeSubs.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-3xl mb-3">🚀</p>
            <p className="font-semibold text-sm mb-1">No subscribers yet</p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">Publish consistent, high-quality research with locked predictions to convert followers into paying subscribers.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-2 text-[11px] font-semibold text-muted-foreground">Subscriber</th>
                  <th className="pb-2 text-[11px] font-semibold text-muted-foreground">Plan</th>
                  <th className="pb-2 text-[11px] font-semibold text-muted-foreground">Since</th>
                  <th className="pb-2 text-[11px] font-semibold text-muted-foreground">Monthly Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {activeSubs.map(sub => (
                  <tr key={sub.id} className="hover:bg-secondary/40 transition-colors">
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary overflow-hidden flex-shrink-0">
                          {sub.analyst_avatar ? <img src={sub.analyst_avatar} alt="" className="w-full h-full object-cover" /> : (sub.subscriber_email?.[0] || "?").toUpperCase()}
                        </div>
                        <span className="text-xs font-medium">{sub.subscriber_email?.split("@")[0]}</span>
                      </div>
                    </td>
                    <td className="py-2.5 text-xs capitalize">{sub.plan || "monthly"}</td>
                    <td className="py-2.5 text-xs text-muted-foreground">{format(new Date(sub.created_date), "MMM d, yyyy")}</td>
                    <td className="py-2.5 text-xs font-bold text-green-600">${sub.price || 29}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section 4: Revenue Projector */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="font-semibold text-sm mb-4">💡 Revenue Projector</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Subscription price ($/mo)</label>
              <input
                type="number"
                value={subPrice}
                onChange={e => setSubPrice(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-24 border border-border rounded-lg px-3 py-1.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs text-muted-foreground block mb-1">Target subscribers: <span className="font-bold text-foreground">{targetSubs}</span></label>
              <input
                type="range"
                min={1} max={200} value={targetSubs}
                onChange={e => setTargetSubs(parseInt(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5"><span>1</span><span>100</span><span>200</span></div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-2">
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground mb-0.5">Projected MRR</p>
              <p className="text-xl font-bold text-green-700">${projMRR.toLocaleString()}</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground mb-0.5">Annual Revenue</p>
              <p className="text-xl font-bold text-blue-700">${projAnnual.toLocaleString()}</p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground mb-0.5">Net (after 15% fee)</p>
              <p className="text-xl font-bold text-purple-700">${Math.round(projNet).toLocaleString()}/mo</p>
            </div>
          </div>
        </div>
      </div>

      {/* Section 5: Predictions Summary */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="font-semibold text-sm mb-4">Prediction Performance</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
          {[
            { label: "Total Calls", value: predictions.length, color: "text-primary" },
            { label: "Resolved", value: resolved.length, color: "text-blue-600" },
            { label: "Accuracy", value: accuracy ? `${accuracy}%` : "—", color: accuracy && parseFloat(accuracy) >= 60 ? "text-green-600" : "text-amber-600" },
            { label: "Avg Yield", value: formatYield(avgYield), color: avgYield == null ? "text-muted-foreground" : avgYield >= 0 ? "text-green-600" : "text-red-500" },
            { label: "Active", value: predictions.length - resolved.length, color: "text-amber-600" },
          ].map(s => (
            <div key={s.label} className="bg-secondary rounded-xl p-3 text-center">
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {predictions.length === 0 ? (
          <div className="text-center py-6">
            <Target className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No predictions yet — add a prediction block when writing your next report.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-2 text-[11px] font-semibold text-muted-foreground">Ticker</th>
                  <th className="pb-2 text-[11px] font-semibold text-muted-foreground">Dir</th>
                  <th className="pb-2 text-[11px] font-semibold text-muted-foreground">Entry</th>
                  <th className="pb-2 text-[11px] font-semibold text-muted-foreground">Target</th>
                  <th className="pb-2 text-[11px] font-semibold text-muted-foreground">Exit</th>
                  <th className="pb-2 text-[11px] font-semibold text-muted-foreground">Yield</th>
                  <th className="pb-2 text-[11px] font-semibold text-muted-foreground">Outcome</th>
                  <th className="pb-2 text-[11px] font-semibold text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {predictions.map(r => {
                  const yld = calcYield(r.prediction_action, r.prediction_lock_price, r.prediction_resolved_price);
                  const isPending = !r.prediction_outcome || r.prediction_outcome === "pending";
                  const isHit = r.prediction_outcome === "hit" || r.prediction_outcome === "near";
                  return (
                    <tr key={r.id} className="hover:bg-secondary/40 cursor-pointer transition-colors" onClick={() => navigate(`/report?id=${r.id}`)}>
                      <td className="py-2 font-bold">{r.prediction_ticker || "—"}</td>
                      <td className="py-2">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${r.prediction_action === "Long" ? "bg-green-100 text-green-700" : r.prediction_action === "Short" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"}`}>
                          {r.prediction_action}
                        </span>
                      </td>
                      <td className="py-2 text-xs">{r.prediction_lock_price ? `$${r.prediction_lock_price}` : "—"}</td>
                      <td className="py-2 text-xs">{r.prediction_target_price ? `$${r.prediction_target_price}` : "—"}</td>
                      <td className="py-2 text-xs">{r.prediction_resolved_price ? `$${r.prediction_resolved_price}` : "—"}</td>
                      <td className={`py-2 text-xs font-bold ${yld === null ? "text-muted-foreground" : yld >= 0 ? "text-green-600" : "text-red-500"}`}>
                        {yld !== null ? `${yld >= 0 ? "+" : ""}${yld.toFixed(1)}%` : "—"}
                      </td>
                      <td className="py-2">
                        {isPending
                          ? <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">Pending</span>
                          : isHit
                          ? <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">Hit ✅</span>
                          : <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 capitalize">{r.prediction_outcome} ❌</span>
                        }
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