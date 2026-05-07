import React from "react";

const BUCKET_KEYS = ["INTRADAY", "SHORT", "MEDIUM", "LONG"];
const BUCKET_LABELS = {
  INTRADAY: "Intraday",
  SHORT:    "Short-Term",
  MEDIUM:   "Medium-Term",
  LONG:     "Long-Term",
};

export default function AccuracyBreakdown({ analystUser }) {
  const breakdown = analystUser?.accuracy_breakdown
    ? JSON.parse(analystUser.accuracy_breakdown)
    : {};

  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Track Record Breakdown</h3>
        {analystUser?.specialization && (
          <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 12,
            background: "#eff6ff", color: "#2563eb", fontWeight: 600 }}>
            {analystUser.specialization}
          </span>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        {BUCKET_KEYS.map(key => {
          const b = breakdown[key];
          return (
            <div key={key} style={{
              background: b ? "#f9fafb" : "#f3f4f6",
              border: "1px solid #e5e7eb",
              borderRadius: 8, padding: 12, textAlign: "center"
            }}>
              <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 6 }}>
                {BUCKET_LABELS[key]}
              </div>
              {b ? (
                <>
                  <div style={{
                    fontSize: 26, fontWeight: 700, lineHeight: 1,
                    color: b.score >= 75 ? "#16a34a" : b.score >= 50 ? "#2563eb" : "#6b7280"
                  }}>
                    {b.score}
                  </div>
                  <div style={{ fontSize: 11, color: "#6b7280", marginTop: 6 }}>
                    {b.hitRate}% hit · {b.calls} calls
                  </div>
                  {b.avgAlpha > 0 && (
                    <div style={{ fontSize: 11, color: "#16a34a", marginTop: 2 }}>
                      +{b.avgAlpha}% α/yr
                    </div>
                  )}
                  {b.avgAlpha < 0 && (
                    <div style={{ fontSize: 11, color: "#dc2626", marginTop: 2 }}>
                      {b.avgAlpha}% α/yr
                    </div>
                  )}
                  {!b.isSignificant && (
                    <div style={{ fontSize: 10, color: "#f59e0b", marginTop: 4 }}>
                      ⚠ Low sample
                    </div>
                  )}
                </>
              ) : (
                <div style={{ fontSize: 12, color: "#d1d5db", marginTop: 6 }}>—</div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        {[
          { label: "Overall Score", value: analystUser?.accuracy_score || 0, suffix: "/100", highlight: true },
          { label: "Hit Rate",      value: (analystUser?.hit_rate || 0) + "%", suffix: "" },
          { label: "Total Calls",   value: analystUser?.total_calls || 0, suffix: "" },
        ].map(stat => (
          <div key={stat.label} style={{ textAlign: "center", padding: "10px 0",
            background: "#f9fafb", borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: "#9ca3af" }}>{stat.label}</div>
            <div style={{
              fontSize: stat.highlight ? 22 : 18,
              fontWeight: 700,
              color: stat.highlight ? "#1e3a6e" : "#111827",
              marginTop: 2
            }}>
              {stat.value}{stat.suffix}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}