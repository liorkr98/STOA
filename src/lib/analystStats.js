/**
 * Single source of truth for analyst performance stats.
 * Computed from Report entity data — never from stored User fields.
 * Uses scoringEngine for the composite score and profit factor.
 */
import { computeScore } from './scoringEngine';

export function computeAnalystStats(allReports, analystEmail) {
  const analystReports = (allReports || []).filter(r => r.created_by === analystEmail);
  const resolved = analystReports.filter(r =>
    r.prediction_outcome &&
    r.prediction_outcome !== 'pending' &&
    r.prediction_resolved_price &&
    r.prediction_lock_price
  );

  // Full score from engine
  const scoring = computeScore(resolved);

  // Win streak (consecutive hits from most recent)
  const sortedResolved = [...resolved].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  let streak = 0;
  for (const r of sortedResolved) {
    if (r.prediction_outcome === 'hit' || r.prediction_outcome === 'near') streak++;
    else break;
  }

  // Legacy: avgYield for components that still use it
  const tradingResolved = resolved.filter(
    r => r.prediction_action === 'Long' || r.prediction_action === 'Short'
  );
  const yields = tradingResolved.map(r => {
    const lock = parseFloat(r.prediction_lock_price);
    const exit = parseFloat(r.prediction_resolved_price);
    if (!lock || !exit) return null;
    return r.prediction_action === 'Long'
      ? ((exit - lock) / lock) * 100
      : ((lock - exit) / lock) * 100;
  }).filter(y => y !== null);
  const avgYield = yields.length > 0 ? yields.reduce((a, b) => a + b, 0) / yields.length : null;

  const hitRate = resolved.length > 0
    ? (scoring.hits / resolved.length) * 100
    : null;

  return {
    // New metrics
    score:        scoring.score,         // 0–100 composite
    winRate:      scoring.rawWR,         // 0–1 raw
    wilsonWR:     scoring.wilsonWR,      // 0–1 sample-adjusted
    profitFactor: scoring.profitFactor,  // avg_win / avg_loss
    avgWin:       scoring.avgWin,        // avg winning return %
    avgLoss:      scoring.avgLoss,       // avg losing return %
    avgReturn:    scoring.avgReturn,     // avg return all calls %
    avgAlpha:     scoring.avgAlpha,      // avg excess return vs benchmark %
    totalCalls:   scoring.total,
    hits:         scoring.hits,
    misses:       scoring.misses,
    streak,

    // Legacy fields (keep for backward compat)
    avgYield,
    hitRate,
  };
}

export function fmtYield(v) {
  if (v == null) return '—';
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
}

export function fmtHitRate(v) {
  if (v == null) return '—';
  return `${v.toFixed(1)}%`;
}

export function fmtPF(v) {
  if (v == null) return '—';
  return `${v.toFixed(2)}x`;
}

export function fmtWR(v) {
  if (v == null) return '—';
  return `${(v * 100).toFixed(1)}%`;
}
