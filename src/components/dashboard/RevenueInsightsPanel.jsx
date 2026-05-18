import React, { useState, useEffect } from "react";
import { BarChart3, Eye, DollarSign, TrendingUp, Users, ArrowUpRight, ShoppingCart, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";

export default function RevenueInsightsPanel() {
  const [loading, setLoading] = useState(true);
  const [totalViews, setTotalViews] = useState(0);
  const [subscribers, setSubscribers] = useState(null);
  const [premiumReports, setPremiumReports] = useState(null);

  useEffect(() => {
    base44.auth.me().then(user => {
      Promise.all([
        base44.entities.Subscription.filter({ analyst_email: user.email, status: "active" })
          .then(subs => setSubscribers((subs || []).length)).catch(() => setSubscribers(0)),
        base44.entities.Report.filter({ created_by: user.email, status: "published" })
          .then(reports => {
            setPremiumReports((reports || []).filter(r => r.is_premium).length);
            setTotalViews((reports || []).reduce((s, r) => s + (r.views || 0), 0));
          }).catch(() => {}),
      ]);
    }).finally(() => setLoading(false));
  }, []);

  const stats = [
    {
      label: "Total Views",
      value: loading ? null : totalViews.toLocaleString(),
      sub: "All-time report views",
      icon: Eye,
      color: "text-blue-600",
      bg: "bg-blue-50 border-blue-200",
    },
    {
      label: "Premium Reports",
      value: loading ? null : premiumReports != null ? premiumReports : "—",
      sub: "Your published premium reports",
      icon: ShoppingCart,
      color: "text-amber-600",
      bg: "bg-amber-50 border-amber-200",
    },
    {
      label: "Active Subscribers",
      value: loading ? null : subscribers != null ? subscribers : "—",
      sub: "Paying subscribers",
      icon: Users,
      color: "text-accent",
      bg: "bg-accent/10 border-accent/30",
    },
    {
      label: "Recurring Revenue",
      value: loading ? null : subscribers != null ? `$${(subscribers * 29).toLocaleString()}/mo` : "—",
      sub: "Est. at $29/subscriber",
      icon: ArrowUpRight,
      color: "text-primary",
      bg: "bg-primary/10 border-primary/20",
    },
  ];

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="w-4 h-4 text-primary" />
        <h3 className="font-medium text-sm">Analytics & Revenue</h3>
      </div>
      <Link to="/creator-analytics" className="block mb-3 p-2.5 bg-primary/5 border border-primary/20 rounded-lg hover:bg-primary/10 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-primary">📊 View Full Analytics →</span>
          <ArrowUpRight className="w-3.5 h-3.5 text-primary" />
        </div>
      </Link>
      <div className="grid grid-cols-2 gap-2">
        {stats.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={`rounded-lg border p-2 ${s.bg}`}>
              <div className="flex items-center gap-1 mb-0.5">
                <Icon className={`w-3 h-3 ${s.color}`} />
                <span className="text-[9px] text-muted-foreground">{s.label}</span>
              </div>
              {loading ? (
                <Loader2 className={`w-4 h-4 animate-spin ${s.color} mt-1`} />
              ) : (
                <p className={`text-sm font-medium ${s.color}`}>{s.value}</p>
              )}
              <p className="text-[9px] text-muted-foreground">{s.sub}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}