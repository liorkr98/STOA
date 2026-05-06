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
  const beats    = history.filter(q => (q.surprisePercent?.raw || 0) > 0).length;
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
                  const surp = q.surprisePercent?.raw || 0;
                  const color = surp > 0 ? "text-gain" : "text-loss";
                  return (
                    <tr key={i} className="border-b border-border/40 hover:bg-secondary/20 transition-colors">
                      <td className="px-5 py-2.5 font-medium text-xs">{q.period}</td>
                      <td className="px-5 py-2.5 text-xs">${q.epsEstimate?.raw?.toFixed(2) || "—"}</td>
                      <td className="px-5 py-2.5 font-semibold text-xs">${q.epsActual?.raw?.toFixed(2) || "—"}</td>
                      <td className={`px-5 py-2.5 text-xs ${color}`}>
                        {surp > 0 ? "+" : ""}{q.epsDifference?.raw?.toFixed(2) || "—"}
                      </td>
                      <td className="px-5 py-2.5 text-xs">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${surp > 0 ? "bg-gain/10 text-gain" : "bg-loss/10 text-loss"}`}>
                          {surp > 0 ? "+" : ""}{surp.toFixed(1)}%
                        </span>
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