import React, { useState, useEffect } from "react";
import { BarChart3, Eye, DollarSign, TrendingUp, Users, ArrowUpRight, ShoppingCart, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";

export default function RevenueInsightsPanel() {
  const [loading, setLoading] = useState(true);
  const [gaViews, setGaViews] = useState(null);
  const [subscribers, setSubscribers] = useState(null);
  const [premiumReports, setPremiumReports] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(user => {
      setCurrentUser(user);

      // Fetch real subscriber count for this analyst
      base44.entities.Subscription.filter({ analyst_email: user.email, status: "active" })
        .then(subs => setSubscribers((subs || []).length))
        .catch(() => setSubscribers(0));

      // Fetch premium report count
      base44.entities.Report.filter({ created_by: user.email, status: "published", is_premium: true })
        .then(reports => setPremiumReports((reports || []).length))
        .catch(() => setPremiumReports(0));

      // Fetch GA page views via the existing getGAData backend function
      base44.functions.invoke("getGAData", {})
        .then(res => {
          const data = res?.data;
          const views = data?.rows?.[0]?.metricValues?.[0]?.value
            || data?.pageViews
            || data?.totalViews
            || null;
          setGaViews(views ? parseInt(views).toLocaleString() : null);
        })
        .catch(() => setGaViews(null));
    }).finally(() => setLoading(false));
  }, []);

  const stats = [
    {
      label: "Total Page Views",
      value: loading ? null : gaViews ?? "—",
      sub: gaViews ? "From Google Analytics" : "Connect GA to see views",
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
      color: "text-purple-600",
      bg: "bg-purple-50 border-purple-200",
    },
    {
      label: "Recurring Revenue",
      value: loading ? null : subscribers != null ? `$${(subscribers * 29).toLocaleString()}/mo` : "—",
      sub: "Est. at $29/subscriber",
      icon: ArrowUpRight,
      color: "text-emerald-600",
      bg: "bg-emerald-50 border-emerald-200",
    },
  ];

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-sm">Analytics & Revenue</h3>
      </div>
      <Link to="/analytics/creator" className="block mb-3 p-2.5 bg-primary/5 border border-primary/20 rounded-lg hover:bg-primary/10 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-primary">📊 View Full Analytics →</span>
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
                <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
              )}
              <p className="text-[9px] text-muted-foreground">{s.sub}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}