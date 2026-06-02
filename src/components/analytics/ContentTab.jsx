import React, { useMemo } from "react";
import { format, differenceInDays } from "date-fns";
import { useNavigate } from "react-router-dom";
import AnalyticsKPICard from "./AnalyticsKPICard";
import { FileText } from "lucide-react";

export default function ContentTab({ currentUser, reports, votes, filteredReports }) {
  const navigate = useNavigate();
  const publishedReports = useMemo(() => reports.filter(r => r.status === "published"), [reports]);
  const premiumReports = useMemo(() => publishedReports.filter(r => r.is_premium), [publishedReports]);
  const totalLikes = useMemo(() => publishedReports.reduce((sum, r) => sum + (r.likes || 0), 0), [publishedReports]);
  const avgLikes = publishedReports.length > 0 ? (totalLikes / publishedReports.length).toFixed(1) : 0;

  const topReport = useMemo(() => {
    if (publishedReports.length === 0) return null;
    return [...publishedReports].sort((a, b) => (b.likes || 0) - (a.likes || 0))[0];
  }, [publishedReports]);

  const lastReportDate = publishedReports.length > 0 ? new Date(publishedReports[0].created_date) : null;
  const daysSinceLastReport = lastReportDate ? differenceInDays(new Date(), lastReportDate) : null;

  // Recommendations
  const recommendations = useMemo(() => {
    const recs = [];
    if (premiumReports.length === 0)
      recs.push("ðŸ’¡ Add a premium tier â€” lock predictions in your next report to start earning");
    if (parseFloat(avgLikes) < 1)
      recs.push("ðŸ’¡ Engagement is low â€” try adding a poll to your next report to drive interaction");
    if (daysSinceLastReport !== null && daysSinceLastReport > 14)
      recs.push(`ðŸ’¡ You haven't published in ${daysSinceLastReport} days â€” consistent publishing drives follower growth`);
    return recs;
  }, [premiumReports, avgLikes, daysSinceLastReport]);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <AnalyticsKPICard icon="ðŸ“" label="Published" value={publishedReports.length} sub="Reports" color="text-primary" />
        <AnalyticsKPICard icon="â¤ï¸" label="Total Likes" value={totalLikes} sub="Across all reports" color="text-pink-600" />
        <AnalyticsKPICard icon="ðŸ“Š" label="Avg Likes/Report" value={avgLikes} sub="Per report" color="text-purple-600" />
        <AnalyticsKPICard icon="â­" label="Premium Reports" value={premiumReports.length} sub="Locked reports" color="text-amber-600" />
      </div>

      {/* Top Report */}
      {topReport && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold text-sm mb-3">ðŸ† Top Performing Report</h3>
          <div
            className="flex items-start gap-4 p-4 bg-amber-50 border border-amber-200 rounded-xl cursor-pointer hover:border-amber-400 transition-all"
            onClick={() => navigate(`/report?id=${topReport.id}`)}
          >
            <div className="flex-1">
              <p className="font-bold text-base mb-2">{topReport.title}</p>
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1 text-pink-600 font-semibold">â¤ï¸ {topReport.likes || 0} likes</span>
                <span className="text-muted-foreground">{format(new Date(topReport.created_date), "MMM d, yyyy")}</span>
                {topReport.prediction_action && (
                  <span className={`font-bold px-2 py-0.5 rounded-full text-xs ${topReport.prediction_action === "Long" ? "bg-gain/10 text-gain" : topReport.prediction_action === "Short" ? "bg-loss/10 text-loss" : "bg-gray-100 text-gray-700"}`}>
                    {topReport.prediction_action}
                  </span>
                )}
                {topReport.is_premium && <span className="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">Premium</span>}
              </div>
            </div>
            <span className="text-primary text-sm font-semibold">View â†’</span>
          </div>
        </div>
      )}

      {/* Reports Table */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-semibold text-sm mb-4">All Published Reports</h3>
        {publishedReports.length === 0 ? (
          <div className="text-center py-10">
            <FileText className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No published reports yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-2 text-[11px] font-semibold text-muted-foreground">Title</th>
                  <th className="pb-2 text-[11px] font-semibold text-muted-foreground">Date</th>
                  <th className="pb-2 text-[11px] font-semibold text-muted-foreground">Type</th>
                  <th className="pb-2 text-[11px] font-semibold text-muted-foreground">Likes</th>
                  <th className="pb-2 text-[11px] font-semibold text-muted-foreground">Votes</th>
                  <th className="pb-2 text-[11px] font-semibold text-muted-foreground">Prediction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {publishedReports.map(r => {
                  const voteCount = votes.filter(v => v.report_id === r.id).length;
                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-secondary/40 cursor-pointer transition-colors"
                      onClick={() => navigate(`/report?id=${r.id}`)}
                    >
                      <td className="py-2.5 font-medium max-w-[180px]">
                        <span className="truncate block">{r.title}</span>
                      </td>
                      <td className="py-2.5 text-muted-foreground text-xs whitespace-nowrap">{format(new Date(r.created_date), "MMM d, yyyy")}</td>
                      <td className="py-2.5">
                        {r.is_premium
                          ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">Premium</span>
                          : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border">Free</span>
                        }
                      </td>
                      <td className="py-2.5 text-pink-600 font-semibold">{r.likes || 0}</td>
                      <td className="py-2.5 text-purple-600 font-semibold">{voteCount}</td>
                      <td className="py-2.5">
                        {r.prediction_action && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.prediction_action === "Long" ? "bg-gain/10 text-gain" : r.prediction_action === "Short" ? "bg-loss/10 text-loss" : "bg-gray-100 text-gray-700"}`}>
                            {r.prediction_action}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold text-sm mb-3">Content Insights</h3>
          <div className="space-y-2">
            {recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                <p className="text-sm text-foreground/80">{rec}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
