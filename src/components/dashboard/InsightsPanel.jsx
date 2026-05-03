import React from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const ACCURACY_DATA = [
  { month: "Nov", value: 72 }, { month: "Dec", value: 78 }, { month: "Jan", value: 80 },
  { month: "Feb", value: 83 }, { month: "Mar", value: 85 }, { month: "Apr", value: 87.5 },
];

export default function InsightsPanel() {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h3 className="font-semibold text-sm mb-3">Accuracy Trend</h3>
      <ResponsiveContainer width="100%" height={120}>
        <AreaChart data={ACCURACY_DATA}>
          <defs>
            <linearGradient id="accGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis domain={[60, 100]} tickFormatter={v => `${v}%`} width={32} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip formatter={v => [`${v}%`, "Accuracy"]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
          <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fill="url(#accGrad)" strokeWidth={2} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}