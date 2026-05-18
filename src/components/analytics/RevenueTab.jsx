import React, { useState, useMemo } from "react";
import { differenceInDays, format } from "date-fns";
import AnalyticsKPICard from "./AnalyticsKPICard";
import { Users } from "lucide-react";

export default function RevenueTab({ subscriptions, subscriberUsers }) {
  const activeSubs = useMemo(() => subscriptions.filter(s => s.status === "active"), [subscriptions]);

  const mrr = useMemo(() => activeSubs.reduce((sum, s) => sum + (s.price || 29), 0), [activeSubs]);
  const arr = mrr * 12;

  const totalEarned = useMemo(() => activeSubs.reduce((sum, s) => {
    const months = Math.max(1, differenceInDays(new Date(), new Date(s.created_date)) / 30);
    return sum + (s.price || 29) * months;
  }, 0), [activeSubs]);

  const avgPerSub = activeSubs.length > 0 ? (mrr / activeSubs.length).toFixed(2) : 0;

  // Revenue projection slider
  const defaultSlider = Math.min(500, activeSubs.length + 10);
  const [projSlider, setProjSlider] = useState(defaultSlider);
  const projPrice = activeSubs.length > 0 ? (mrr / activeSubs.length) : 29;
  const projMRR = projSlider * projPrice;
  const projNet = projMRR * 0.90;
  const projARR = projNet * 12;

  // Average subscription age
  const avgAge = useMemo(() => {
    if (activeSubs.length === 0) return null;
    const total = activeSubs.reduce((sum, s) => sum + differenceInDays(new Date(), new Date(s.created_date)), 0);
    return Math.round(total / activeSubs.length);
  }, [activeSubs]);

  return (
    <div className="space-y-6">
      {/* Revenue KPIs — palette uses primary/accent only (revenue is not a market position) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <AnalyticsKPICard icon="💰" label="MRR" value={`$${mrr.toLocaleString()}`} sub="Monthly recurring" color="text-primary" />
        <AnalyticsKPICard icon="📈" label="ARR" value={`$${arr.toLocaleString()}`} sub="Annualized" color="text-primary" />
        <AnalyticsKPICard icon="🏦" label="Total Earned" value={`$${Math.round(totalEarned).toLocaleString()}`} sub="All time estimate" color="text-accent" />
        <AnalyticsKPICard icon="👤" label="Avg per Sub" value={`$${avgPerSub}`} sub="Per subscriber/mo" color="text-foreground" />
      </div>

      {/* Subscribers Table */}
      <div className="surface p-5">
        <h3 className="font-medium text-sm mb-4">Active Subscribers</h3>
        {subscriptions.length === 0 ? (
          <div className="text-center py-10">
            <Users className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No subscribers yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Set your subscription price and publish premium reports to start earning</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-2 text-[11px] font-medium text-muted-foreground">Subscriber</th>
                  <th className="pb-2 text-[11px] font-medium text-muted-foreground">Plan</th>
                  <th className="pb-2 text-[11px] font-medium text-muted-foreground">Value/mo</th>
                  <th className="pb-2 text-[11px] font-medium text-muted-foreground">Since</th>
                  <th className="pb-2 text-[11px] font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {subscriptions.map(sub => {
                  const u = subscriberUsers[sub.subscriber_email];
                  const name = u?.full_name || sub.subscriber_email?.split("@")[0] || "—";
                  const avatar = u?.picture;
                  return (
                    <tr key={sub.id} className="hover:bg-secondary/40 transition-colors">
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary overflow-hidden flex-shrink-0">
                            {avatar ? <img src={avatar} alt={name} className="w-full h-full object-cover" /> : name[0]?.toUpperCase()}
                          </div>
                          <span className="font-medium truncate max-w-[140px]">{name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 capitalize text-muted-foreground text-xs">{sub.plan || "monthly"}</td>
                      <td className="py-2.5 font-medium font-display text-primary">${sub.price || 29}</td>
                      <td className="py-2.5 text-muted-foreground text-xs">{format(new Date(sub.created_date), "MMM d, yyyy")}</td>
                      <td className="py-2.5">
                        {/* Active = neutral pill-primary; cancelled = neutral pill (no market red) */}
                        <span className={sub.status === "active" ? "pill-primary" : "pill"}>
                          {sub.status === "active" ? "Active" : "Cancelled"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Revenue Projection */}
      <div className="surface p-5">
        <h3 className="font-medium text-sm mb-1">Revenue Projection Calculator</h3>
        <p className="text-xs text-muted-foreground mb-4">Estimate your earnings at different subscriber counts</p>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">
                <span className="font-display">{projSlider}</span> subscribers × <span className="font-display">${projPrice.toFixed(0)}</span>/mo
              </label>
            </div>
            <input
              type="range" min={1} max={500} value={projSlider}
              onChange={e => setProjSlider(Number(e.target.value))}
              className="w-full h-2 rounded-tag appearance-none cursor-pointer bg-secondary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1 font-display">
              <span>1</span><span>500</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-secondary rounded-tag border border-border p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Gross MRR</p>
              <p className="text-lg font-medium font-display text-foreground">${projMRR.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            </div>
            <div className="bg-accent/10 border border-accent/30 rounded-tag p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Net MRR (90%)</p>
              <p className="text-lg font-medium font-display text-accent">${projNet.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            </div>
            <div className="bg-primary/10 border border-primary/20 rounded-tag p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Net ARR</p>
              <p className="text-lg font-medium font-display text-primary">${projARR.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">STOA takes a 10% platform fee. Net figures reflect your take-home.</p>
        </div>
      </div>

      {/* Churn / Retention */}
      {avgAge !== null && (
        <div className="surface p-5">
          <h3 className="font-medium text-sm mb-3">Subscriber Retention</h3>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-3xl font-medium font-display text-primary">{avgAge}</p>
              <p className="text-xs text-muted-foreground">Avg days subscribed</p>
            </div>
            <div className="flex-1 text-sm text-muted-foreground">
              Your subscribers have been with you for an average of <strong className="text-foreground"><span className="font-display">{avgAge}</span> days</strong>.
              {avgAge >= 60 ? " 🎉 Excellent retention! Keep publishing great content." : avgAge >= 30 ? " Good start — consistent quality builds long-term loyalty." : " Early days — focus on delivering value to keep subscribers engaged."}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
