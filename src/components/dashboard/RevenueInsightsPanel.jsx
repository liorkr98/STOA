import React, { useState } from "react";
import { BarChart3, Eye, DollarSign, TrendingUp, Users, ArrowUpRight, ShoppingCart } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const VIEWS_DATA = [
  { month: "Nov", views: 8200, purchases: 42, revenue: 198 },
  { month: "Dec", views: 11400, purchases: 68, revenue: 312 },
  { month: "Jan", views: 14800, purchases: 95, revenue: 445 },
  { month: "Feb", views: 18200, purchases: 128, revenue: 601 },
  { month: "Mar", views: 22500, purchases: 167, revenue: 784 },
  { month: "Apr", views: 28100, purchases: 213, revenue: 1020 },
];

const STAT_CARDS = [
  { label: "Total Views", value: "28,100", sub: "+25% MoM", icon: Eye, color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
  { label: "Report Purchases", value: "213", sub: "+46 vs last month", icon: ShoppingCart, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
  { label: "Revenue (Apr)", value: "$1,020", sub: "+30% MoM", icon: DollarSign, color: "text-primary", bg: "bg-primary/5 border-primary/20" },
  { label: "Conversion Rate", value: "0.76%", sub: "Views → Purchase", icon: TrendingUp, color: "text-green-600", bg: "bg-green-50 border-green-200" },
  { label: "Subscribers", value: "142", sub: "$9/mo each", icon: Users, color: "text-purple-600", bg: "bg-purple-50 border-purple-200" },
  { label: "Sub Revenue", value: "$1,278", sub: "/month recurring", icon: ArrowUpRight, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
];

const TABS = ["Views", "Revenue", "Conversion"];

export default function RevenueInsightsPanel() {
  const [tab, setTab] = useState("Views");

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
      <div className="flex gap-1 mb-3">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${tab === t ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary"}`}>{t}
          </button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={100}>
        {tab === "Revenue" ? (
          <BarChart data={VIEWS_DATA}>
            <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => `$${v}`} width={40} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(v) => [`$${v}`, "Revenue"]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
            <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
          </BarChart>
        ) : tab === "Conversion" ? (
          <AreaChart data={VIEWS_DATA.map(d => ({ ...d, rate: ((d.purchases / d.views) * 100).toFixed(2) }))}>
            <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => `${v}%`} width={40} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(v) => [`${v}%`, "Conversion"]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
            <Area type="monotone" dataKey="rate" stroke="hsl(var(--chart-4))" fill="hsl(var(--chart-4) / 0.2)" strokeWidth={2} dot={false} />
          </AreaChart>
        ) : (
          <AreaChart data={VIEWS_DATA}>
            <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} width={35} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(v) => [v.toLocaleString(), "Views"]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
            <Area type="monotone" dataKey="views" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.1)" strokeWidth={2} dot={false} />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}