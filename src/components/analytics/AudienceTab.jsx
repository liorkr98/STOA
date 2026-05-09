import React, { useMemo } from "react";
import { format } from "date-fns";
import AnalyticsKPICard from "./AnalyticsKPICard";
import { Users } from "lucide-react";

export default function AudienceTab({ currentUser, subscriptions, follows, followerUsers }) {
  const activeSubs = useMemo(() => subscriptions.filter(s => s.status === "active"), [subscriptions]);
  const totalFollowers = follows.length;
  const subEmails = useMemo(() => new Set(activeSubs.map(s => s.subscriber_email)), [activeSubs]);
  const convRate = totalFollowers > 0 ? Math.min(100, ((activeSubs.length / totalFollowers) * 100)).toFixed(1) : "0.0";

  // Growth this month
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const newFollowersThisMonth = follows.filter(f => new Date(f.created_date) >= monthStart).length;

  // Funnel data
  const totalLikesProxy = follows.length * 5; // rough impression proxy
  const funnelData = [
    { label: "Feed Impressions", value: totalLikesProxy || follows.length, pct: 100 },
    { label: "Followers", value: totalFollowers, pct: totalLikesProxy > 0 ? ((totalFollowers / totalLikesProxy) * 100).toFixed(1) : 100 },
    { label: "Subscribers", value: activeSubs.length, pct: totalFollowers > 0 ? ((activeSubs.length / totalFollowers) * 100).toFixed(1) : 0 },
    { label: "Revenue", value: `$${activeSubs.reduce((s, sub) => s + (sub.price || 29), 0)}/mo`, pct: activeSubs.length > 0 ? 100 : 0, isLast: true },
  ];

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <AnalyticsKPICard icon="👥" label="Total Followers" value={totalFollowers} sub="All time" color="text-blue-600" />
        <AnalyticsKPICard icon="💎" label="Active Subscribers" value={activeSubs.length} sub="Paying" color="text-green-600" />
        <AnalyticsKPICard icon="🔄" label="Free → Paid Rate" value={`${convRate}%`} sub="Conversion" color={parseFloat(convRate) >= 5 ? "text-green-600" : "text-amber-600"} />
        <AnalyticsKPICard icon="📈" label="Follower Growth" value={`+${newFollowersThisMonth}`} sub="This month" color="text-purple-600" />
      </div>

      {/* Followers Table */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-semibold text-sm mb-4">Your Audience</h3>
        {follows.length === 0 ? (
          <div className="text-center py-10">
            <Users className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No followers yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Publish great reports to grow your audience</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-2 text-[11px] font-semibold text-muted-foreground">Follower</th>
                  <th className="pb-2 text-[11px] font-semibold text-muted-foreground">Following Since</th>
                  <th className="pb-2 text-[11px] font-semibold text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {/* Subscribers first */}
                {[...follows].sort((a, b) => {
                  const aIsSub = subEmails.has(a.follower_email) ? 0 : 1;
                  const bIsSub = subEmails.has(b.follower_email) ? 0 : 1;
                  return aIsSub - bIsSub || new Date(b.created_date) - new Date(a.created_date);
                }).slice(0, 50).map(f => {
                  const u = followerUsers[f.follower_email];
                  const name = u?.full_name || f.follower_email?.split("@")[0] || "—";
                  const avatar = u?.picture;
                  const isSub = subEmails.has(f.follower_email);
                  return (
                    <tr key={f.id} className="hover:bg-secondary/40 transition-colors">
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary overflow-hidden flex-shrink-0">
                            {avatar ? <img src={avatar} alt={name} className="w-full h-full object-cover" /> : name[0]?.toUpperCase()}
                          </div>
                          <span className="font-medium truncate max-w-[180px]">{name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 text-muted-foreground text-xs">{format(new Date(f.created_date), "MMM d, yyyy")}</td>
                      <td className="py-2.5">
                        {isSub ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">Subscriber</span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border">Follower</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {follows.length > 50 && <p className="text-xs text-muted-foreground text-center mt-3">Showing top 50 of {follows.length} followers</p>}
          </div>
        )}
      </div>

      {/* Growth Funnel */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-semibold text-sm mb-4">Audience Funnel</h3>
        <div className="space-y-2">
          {funnelData.map((level, i) => {
            const width = Math.max(20, 100 - i * 18);
            return (
              <div key={level.label} className="flex items-center gap-3">
                <div className="w-28 text-right text-xs text-muted-foreground">{level.label}</div>
                <div className="flex-1 flex items-center gap-2">
                  <div
                    className="h-8 rounded-lg flex items-center justify-center font-bold text-sm text-white transition-all"
                    style={{
                      width: `${width}%`,
                      background: ["#2563eb", "#3b82f6", "#22c55e", "#16a34a"][i],
                    }}
                  >
                    {level.value}
                  </div>
                </div>
                {!level.isLast && (
                  <div className="w-14 text-[10px] text-muted-foreground">{level.pct}%</div>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-muted-foreground mt-3">Impression proxy = followers × 5. Real view tracking coming soon.</p>
      </div>
    </div>
  );
}