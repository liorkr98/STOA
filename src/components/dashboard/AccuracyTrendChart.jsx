import React, { useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from "recharts";

const ACCURACY_DATA = [
  { month: "Nov", accuracy: 72, yield: 8.2, sp500: 12 },
  { month: "Dec", accuracy: 78, yield: 14.9, sp500: 12 },
  { month: "Jan", accuracy: 80, yield: 23.1, sp500: 12 },
  { month: "Feb", accuracy: 83, yield: 26.7, sp500: 12 },
  { month: "Mar", accuracy: 85, yield: 31.4, sp500: 12 },
  { month: "Apr", accuracy: 87.5, yield: 34.2, sp500: 12 },
];

export default function AccuracyTrendChart() {
  const [mode, setMode] = useState("accuracy");
  const isAccuracy = mode === "accuracy";
  const lastPoint = ACCURACY_DATA[ACCURACY_DATA.length - 1];
  const currentVal = isAccuracy ? lastPoint.accuracy : lastPoint.yield;

  return (
 <div className="bg-card border border-border rounded-2xl p-5 mb-6">
 <div className="flex items-center justify-between mb-3">
        <div>
 <h2 className="font-medium text-sm">Performance Trend</h2>
 <p className="text-xs text-muted-foreground">
 Current: <span className={isAccuracy ? "text-primary font-medium" : "text-amber-600 font-medium"}>
              {isAccuracy ? `${currentVal}%` : `+${currentVal}%`}
            </span>
 <span className="ml-2 text-muted-foreground/60">vs S&P 500: +12%</span>
          </p>
        </div>
 <div className="flex gap-1 bg-secondary rounded-lg p-0.5">
          {["accuracy", "yield"].map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
 className={`px-3 py-1 rounded-md text-xs font-medium transition-all capitalize ${mode === m ? "bg-card text-foreground" : "text-muted-foreground"}`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={ACCURACY_DATA} margin={{ top: 4, right: 12, left: -20, bottom: 0 }}>
          <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis
            domain={isAccuracy ? [60, 100] : [0, 50]}
            tickFormatter={v => isAccuracy ? `${v}%` : `+${v}%`}
            tick={{ fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(v, name) => [
              name === "sp500" ? `${v}%` : isAccuracy ? `${v}%` : `+${v}%`,
              name === "sp500" ? "S&P 500" : isAccuracy ? "Accuracy" : "Yield",
            ]}
            contentStyle={{ fontSize: 11, borderRadius: 8 }}
          />
          <Line
            type="monotone"
            dataKey={mode}
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ r: 3, fill: "hsl(var(--primary))" }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="sp500"
            stroke="#94a3b8"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            dot={false}
          />
          {/* Annotation on last point */}
          <ReferenceLine
            x="Apr"
            stroke="hsl(var(--primary))"
            strokeDasharray="3 3"
            strokeOpacity={0.4}
            label={{ value: isAccuracy ? `${currentVal}%` : `+${currentVal}%`, position: "insideTopRight", fontSize: 10, fill: "hsl(var(--primary))" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}