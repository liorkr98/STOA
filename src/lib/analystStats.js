/**
 * Single source of truth for analyst performance stats.
 * Computed from Report entity data — never from stored User fields.
 */
export function computeAnalystStats(allReports, analystEmail) {
  const analystReports = (allReports || []).filter(r => r.created_by === analystEmail);
  const resolved = analystReports.filter(r =>
    r.prediction_outcome &&
    r.prediction_outcome !== 'pending' &&
    r.prediction_resolved_price &&
    r.prediction_lock_price
  );

  // Yield — exclude Hold predictions (they're accuracy calls, not return calls)
  const tradingResolved = resolved.filter(r => r.prediction_action === 'Long' || r.prediction_action === 'Short');
  const yields = tradingResolved.map(r => {
    const lock = parseFloat(r.prediction_lock_price);
    const exit = parseFloat(r.prediction_resolved_price);
    if (!lock || !exit) return null;
    if (r.prediction_action === 'Long')  return ((exit - lock) / lock) * 100;
    if (r.prediction_action === 'Short') return ((lock - exit) / lock) * 100;
    return null;
  }).filter(y => y !== null);

  const avgYield = yields.length > 0 ? yields.reduce((a, b) => a + b, 0) / yields.length : null;

  // Hit rate (includes all resolved including Hold)
  const hits = resolved.filter(r => r.prediction_outcome === 'hit' || r.prediction_outcome === 'near').length;
  const hitRate = resolved.length > 0 ? (hits / resolved.length) * 100 : null;

  // Total resolved calls
  const totalCalls = resolved.length;

  // Win streak (consecutive hits from most recent)
  const sortedResolved = [...resolved].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  let streak = 0;
  for (const r of sortedResolved) {
    if (r.prediction_outcome === 'hit' || r.prediction_outcome === 'near') streak++;
    else break;
  }

  return { avgYield, hitRate, totalCalls, streak };
}

export function fmtYield(v) {
  if (v == null) return '—';
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
}

export function fmtHitRate(v) {
  if (v == null) return '—';
  return `${v.toFixed(1)}%`;
}