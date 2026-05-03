import React, { useState } from "react";
import { Eye, DollarSign, TrendingUp, Users, ArrowUpRight, ShoppingCart } from "lucide-react";
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
  { label: "Total Views", value: "28,100", sub: "+25% MoM", icon: Eye, colorClass: "text-blue-600", bgClass: "bg-blue-50 border-blue-200" },
  { label: "Report Purchases", value: "213", sub: "+46 vs last month", icon: ShoppingCart, colorClass: "text-amber-600", bgClass: "bg-amber-50 border-amber-200" },
  { label: "Revenue (Apr)", value: "$1,020", sub: "+30% MoM", icon: DollarSign, colorClass: "text-primary", bgClass: "bg-primary/5 border-primary/20" },
  { label: "Conversion Rate", value: "0.76%", sub: "Views → Purchase", icon: TrendingUp, colorClass: "text-green-600", bgClass: "bg-green-50 border-green-200" },
  { label: "Subscribers", value: "142", sub: "$9/mo each", icon: Users, colorClass: "text-purple-600", bgClass: "bg-purple-50 border-purple-200" },
  { label: "Sub Revenue", value: "$1,278", sub: "/month recurring", icon: ArrowUpRight, colorClass: "text-emerald-600", bgClass: "bg-emerald-50 border-emerald-200" },
];

const TABS = ["Views", "Revenue", "Conversion"];

export default function RevenueInsightsPanel() {
  const [tab, setTab] = useState("Views");

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h3 className="font-semibold text-sm mb-3">Analytics & Revenue</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
        {STAT_CARDS.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={`rounded-xl border p-3 ${s.bgClass}`}>
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className={`w-3 h-3 ${s.colorClass}`} />
                <span className="text-[10px] text-muted-foreground truncate">{s.label}</span>
              </div>
              <p className={`text-sm font-bold ${s.colorClass}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.sub}</p>
            </div>
          );
        })}
      </div>

      <div className="flex gap-1 mb-3">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${tab === t ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary"}`}>{t}</button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={120}>
        {tab === "Revenue" ? (
          <BarChart data={VIEWS_DATA} barSize={16}>
            <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => `$${v}`} width={40} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip formatter={v => [`$${v}`, "Revenue"]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
            <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
          </BarChart>
        ) : tab === "Conversion" ? (
          <AreaChart data={VIEWS_DATA.map(d => ({ ...d, rate: ((d.purchases / d.views) * 100).toFixed(2) }))}>
            <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => `${v}%`} width={40} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip formatter={v => [`${v}%`, "Conversion"]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
            <Area type="monotone" dataKey="rate" stroke="hsl(var(--primary))" fill="hsl(var(--primary)/0.1)" strokeWidth={2} dot={false} />
          </AreaChart>
        ) : (
          <AreaChart data={VIEWS_DATA}>
            <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} width={35} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip formatter={v => [v.toLocaleString(), "Views"]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
            <Area type="monotone" dataKey="views" stroke="hsl(var(--primary))" fill="hsl(var(--primary)/0.1)" strokeWidth={2} dot={false} />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}