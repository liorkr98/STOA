// Correct yield calculation for resolved predictions
// Long:  ((resolved - lock) / lock) * 100
// Short: ((lock - resolved) / lock) * 100
// Returns null if no resolved predictions

export function computeAvgYield(reports) {
  const resolved = (reports || []).filter(
    r => r.prediction_action && r.prediction_lock_price && r.prediction_resolved_price && r.prediction_outcome && r.prediction_outcome !== "pending"
  );
  if (resolved.length === 0) return null;

  const yields = resolved.map(r => {
    const lock = r.prediction_lock_price;
    const exit = r.prediction_resolved_price;
    const action = (r.prediction_action || "").toLowerCase();
    if (action === "short") return ((lock - exit) / lock) * 100;
    return ((exit - lock) / lock) * 100; // Long or Hold
  });

  const avg = yields.reduce((s, v) => s + v, 0) / yields.length;
  return parseFloat(avg.toFixed(1));
}

export function formatYield(value) {
  if (value == null) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}