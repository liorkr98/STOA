import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import ReportCard from "@/components/feed/ReportCard";

export default function EarningsSentimentTab({ earnings, ratings, ticker }) {
  const [reports, setReports] = useState([]);

  useEffect(() => {
    if (!ticker) return;
    base44.entities.Report.filter({ status: "published" }).then(all => {
      setReports((all || []).filter(r => {
        const tArr = (r.tickers || "").split(",").map(t => t.trim()).filter(Boolean);
        return tArr.includes(ticker);
      }));
    });
  }, [ticker]);

  const history  = earnings?.history || [];
  // Compute surprise % ourselves rather than trusting Yahoo's
  // surprisePercent.raw — that field is a decimal (0.08 = 8%) in this feed
  // version and was rendering as "0.1%" because we displayed it as-is.
  // Per audit spec: surprise % = (Actual - Estimate) / |Estimate| × 100.
  const computeSurprise = (q) => {
    const actual = q?.epsActual?.raw;
    const est    = q?.epsEstimate?.raw;
    if (typeof actual !== "number" || typeof est !== "number" || est === 0) return null;
    return ((actual - est) / Math.abs(est)) * 100;
  };
  // Friendly quarter label. Yahoo's `period` is "-4q" / "-3q" — useless.
  // Use the quarter timestamp to produce "Q3 2024" instead.
  const quarterLabel = (q) => {
    const ts = q?.quarter?.raw;
    if (!ts) return q?.period || "—";
    const d = new Date(ts * 1000);
    const qNum = Math.floor(d.getUTCMonth() / 3) + 1;
    return `Q${qNum} ${d.getUTCFullYear()}`;
  };
  const beats    = history.filter(q => (computeSurprise(q) ?? 0) > 0).length;
  const total    = history.length || 1;
  const beatRate = Math.round((beats / total) * 100);

  const sentimentColor  = beatRate >= 70 ? "#16a34a" : beatRate >= 50 ? "#f59e0b" : "#dc2626";
  const sentimentLabel  = beatRate >= 70 ? "Bullish" : beatRate >= 50 ? "Neutral" : "Bearish";
  const sentimentBg     = beatRate >= 70 ? "bg-gain/5 border-gain/20" : beatRate >= 50 ? "bg-amber-50 border-amber-200" : "bg-loss/5 border-loss/20";

  return (
    <div className="space-y-5">

      {/* Sentiment Banner */}
      {history.length > 0 && (
        <div className={`flex items-center gap-5 rounded-xl border p-5 ${sentimentBg}`}>
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
            style={{ background: sentimentColor }}
          >
            {beatRate}%
          </div>
          <div>
            <div className="text-lg font-bold" style={{ color: sentimentColor }}>{sentimentLabel} Earnings Sentiment</div>
            <div className="text-sm text-muted-foreground mt-0.5">
              Beat EPS estimates in {beats} of last {total} quarters
            </div>
          </div>
        </div>
      )}

      {/* Quarterly EPS Table */}
      {history.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-secondary/30">
            <h3 className="font-semibold text-sm">Quarterly EPS History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Quarter","Est. EPS","Actual EPS","Surprise","Surprise %"].map(h => (
                    <th key={h} className="px-5 py-2.5 text-left text-xs text-muted-foreground font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 8).map((q, i) => {
                  const surp  = computeSurprise(q);
                  const diff  = q.epsDifference?.raw;
                  const isPos = surp != null && surp > 0;
                  const color = isPos ? "text-gain" : (surp != null ? "text-loss" : "text-muted-foreground");
                  // Sign-before-currency: -$0.52, not $-0.52
                  const fmtSigned = (n) => n == null ? "—" : `${n < 0 ? "-" : ""}$${Math.abs(n).toFixed(2)}`;
                  return (
                    <tr key={i} className="border-b border-border/40 hover:bg-secondary/20 transition-colors">
                      <td className="px-5 py-2.5 font-medium text-xs">{quarterLabel(q)}</td>
                      <td className="px-5 py-2.5 text-xs">{fmtSigned(q.epsEstimate?.raw)}</td>
                      <td className="px-5 py-2.5 font-semibold text-xs">{fmtSigned(q.epsActual?.raw)}</td>
                      <td className={`px-5 py-2.5 text-xs ${color}`}>
                        {diff == null ? "—" : `${diff >= 0 ? "+" : ""}${fmtSigned(diff)}`}
                      </td>
                      <td className="px-5 py-2.5 text-xs">
                        {surp == null ? (
                          <span className="px-2 py-0.5 rounded text-xs text-muted-foreground">—</span>
                        ) : (
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${isPos ? "bg-gain/10 text-gain" : "bg-loss/10 text-loss"}`}>
                            {isPos ? "+" : ""}{surp.toFixed(2)}%
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* EPS Estimates Trend */}
      {earnings?.trend?.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold text-sm mb-4">EPS Estimates Trend</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {earnings.trend.slice(0, 4).map((t, i) => {
              const label = t.period === "0q" ? "Current Q" : t.period === "+1q" ? "Next Q" : t.period === "0y" ? "This Year" : "Next Year";
              return (
                <div key={i} className="bg-secondary/50 rounded-lg p-3">
                  <div className="text-[10px] text-muted-foreground mb-1">{label}</div>
                  <div className="text-xl font-bold">${t.earningsEstimate?.avg?.raw?.toFixed(2) || "—"}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">{t.numberOfAnalysts?.raw} analysts</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STOA Reports */}
      <div>
        <h3 className="font-semibold text-sm mb-3">STOA Analyst Reports</h3>
        {reports.length > 0
          ? reports.map(r => <ReportCard key={r.id} report={r} />)
          : (
            <div className="bg-secondary/30 border border-dashed border-border rounded-xl p-8 text-center">
              <p className="text-sm text-muted-foreground">No STOA analyst reports for {ticker} yet.</p>
            </div>
          )
        }
      </div>
    </div>
  );
}