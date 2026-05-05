import React from "react";
import { BarChart3, Eye, DollarSign, TrendingUp, Users, ArrowUpRight, ShoppingCart } from "lucide-react";

const STAT_CARDS = [
  { label: "Total Views", value: "—", sub: "Analytics coming soon", icon: Eye, color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
  { label: "Report Purchases", value: "—", sub: "No purchases yet", icon: ShoppingCart, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
  { label: "Revenue (This Month)", value: "—", sub: "No revenue yet", icon: DollarSign, color: "text-primary", bg: "bg-primary/5 border-primary/20" },
  { label: "Conversion Rate", value: "—", sub: "Views → Purchase", icon: TrendingUp, color: "text-green-600", bg: "bg-green-50 border-green-200" },
  { label: "Subscribers", value: "0", sub: "Active subscribers", icon: Users, color: "text-purple-600", bg: "bg-purple-50 border-purple-200" },
  { label: "Recurring Revenue", value: "—", sub: "Per month", icon: ArrowUpRight, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
];

export default function RevenueInsightsPanel() {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-sm">Analytics & Revenue</h3>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        {STAT_CARDS.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={`rounded-lg border p-2 ${s.bg}`}>
              <div className="flex items-center gap-1 mb-0.5">
                <Icon className={`w-3 h-3 ${s.color}`} />
                <span className="text-[9px] text-muted-foreground">{s.label}</span>
              </div>
              <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[9px] text-muted-foreground">{s.sub}</p>
            </div>
          );
        })}
      </div>
      <div className="bg-secondary rounded-lg px-3 py-2 text-center">
        <p className="text-xs text-muted-foreground">Analytics will appear once your reports get views and purchases.</p>
      </div>
    </div>
  );
}