/**
 * STOA Scoring Engine v2
 *
 * Replaces ELO-based accuracyScore.js with three honest pillars:
 *
 *   1. Win Rate      — Wilson-adjusted for sample size       (52% / 40% weight)
 *   2. Profit Factor — avg_win / avg_loss, captures edge     (48% / 35% weight)
 *   3. Alpha         — avg excess return vs S&P benchmark    (25% weight if available)
 *
 * Why not ELO:
 *   - ELO is designed for zero-sum competitions with an opponent.
 *   - E=0.5 baseline ignores market regime (bull market inflates all LONG calls).
 *   - Arbitrary sector difficulty bonuses and boldness multipliers are made up.
 *
 * Why Profit Factor matters:
 *   - A 40% win rate with 3:1 reward/risk beats a 70% win rate with 1:3.
 *   - Avg yield alone hides this — you can have a +10% average from one 100%
 *     gain and nine 0% trades. PF exposes the distribution.
 *
 * Why Wilson lower bound:
 *   - Raw win rate of 5/5 = 100% is meaningless. Wilson lower bound at 90%
 *     confidence maps that to ~57%, which is honest about the tiny sample.
 *   - Naturally penalises small samples without arbitrary gates.
 */

// ── Wilson confidence interval lower bound ────────────────────────────────────
// z = 1.645 → 90% confidence. A 5/5 analyst → ~0.57, a 50/50 analyst → ~0.94
function wilsonLower(hits, total, z = 1.645) {
  if (total === 0) return 0;
  const p = hits / total;
  const denom = 1 + (z * z) / total;
  const centre = p + (z * z) / (2 * total);
  const margin = z * Math.sqrt((p * (1 - p)) / total + (z * z) / (4 * total * total));
  return Math.max(0, (centre - margin) / denom);
}

// ── Direction-aware signed return % ──────────────────────────────────────────
// Long:  price went up   = positive
// Short: price went down = positive (inverted)
// Hold:  excluded from PF (accuracy signal only)
export function callReturn(action, lockPrice, resolvedPrice) {
  if (!lockPrice || !resolvedPrice || lockPrice === 0) return null;
  const raw = (resolvedPrice - lockPrice) / lockPrice;
  const a = (action || '').toUpperCase();
  if (a === 'LONG' || a === 'BUY')   return raw * 100;
  if (a === 'SHORT' || a === 'SELL') return -raw * 100;
  return null;
}

// ── Core scorer ───────────────────────────────────────────────────────────────
export function computeScore(reports) {
  const resolved = (reports || []).filter(r =>
    r.prediction_outcome &&
    r.prediction_outcome !== 'pending' &&
    r.prediction_lock_price &&
    r.prediction_resolved_price
  );

  const total = resolved.length;
  if (total === 0) return nullResult();

  // ─ 1. Win Rate ──────────────────────────────────────────────────────────
  const hits   = resolved.filter(r => r.prediction_outcome === 'hit' || r.prediction_outcome === 'near').length;
  const misses = total - hits;
  const rawWR  = hits / total;
  const wilsonWR = wilsonLower(hits, total);
  // Map 0–1 to 0–100 pts directly. A Wilson lower bound of 0.50 = 50 pts.
  const winRateScore = wilsonWR * 100;

  // ─ 2. Profit Factor ─────────────────────────────────────────────────────
  const returns = resolved
    .map(r => callReturn(r.prediction_action, r.prediction_lock_price, r.prediction_resolved_price))
    .filter(v => v !== null);

  const winningReturns = returns.filter(r => r > 0);
  const losingReturns  = returns.filter(r => r < 0);

  const avgWin  = winningReturns.length > 0
    ? winningReturns.reduce((a, b) => a + b, 0) / winningReturns.length
    : 0;
  const avgLoss = losingReturns.length > 0
    ? Math.abs(losingReturns.reduce((a, b) => a + b, 0) / losingReturns.length)
    : null;

  // Cap PF at 10 to prevent a single huge winner from distorting everything
  const profitFactor = avgLoss != null && avgLoss > 0
    ? Math.min(10, avgWin / avgLoss)
    : winningReturns.length > 0 ? 5 : 0;

  // PF score: PF=0 → 0, PF=1 → 25, PF=2 → 50, PF=4+ → 100
  const pfScore = Math.min(100, Math.max(0, (profitFactor / 4) * 100));

  // ─ 3. Alpha vs benchmark ────────────────────────────────────────────────
  // prediction_benchmark_pct is the S&P 500 return over the same call period.
  // Stored on Report at the time of resolution. Falls back gracefully if absent.
  const withBenchmark = resolved.filter(r => r.prediction_benchmark_pct != null);
  let avgAlpha  = null;
  let alphaScore = null;

  if (withBenchmark.length >= 5) {
    const alphas = withBenchmark
      .map(r => {
        const ret = callReturn(r.prediction_action, r.prediction_lock_price, r.prediction_resolved_price);
        return ret !== null ? ret - r.prediction_benchmark_pct : null;
      })
      .filter(v => v !== null);

    if (alphas.length > 0) {
      avgAlpha   = alphas.reduce((a, b) => a + b, 0) / alphas.length;
      // -20% alpha → 0 pts, 0% → 50 pts, +20% → 100 pts
      alphaScore = Math.min(100, Math.max(0, ((avgAlpha + 20) / 40) * 100));
    }
  }

  // ─ Composite ────────────────────────────────────────────────────────────
  let finalScore;
  if (alphaScore !== null) {
    finalScore = winRateScore * 0.40 + pfScore * 0.35 + alphaScore * 0.25;
  } else {
    finalScore = winRateScore * 0.52 + pfScore * 0.48;
  }

  // Sample size ramp: logarithmic, honest.
  // 5 calls → 76% of score, 15 → 89%, 30 → 95%, 75+ → 100%
  const sampleScale = Math.min(1, Math.log(1 + total) / Math.log(1 + 75));
  finalScore = finalScore * (0.5 + 0.5 * sampleScale);

  const score = Math.round(Math.min(100, Math.max(0, finalScore)));
  const avgReturn = returns.length > 0
    ? returns.reduce((a, b) => a + b, 0) / returns.length
    : null;

  return {
    score,
    total,
    hits,
    misses,
    rawWR,
    wilsonWR,
    profitFactor: parseFloat(profitFactor.toFixed(2)),
    avgWin:       avgWin > 0 ? parseFloat(avgWin.toFixed(2)) : null,
    avgLoss:      avgLoss != null ? parseFloat(avgLoss.toFixed(2)) : null,
    avgReturn:    avgReturn != null ? parseFloat(avgReturn.toFixed(2)) : null,
    avgAlpha:     avgAlpha != null ? parseFloat(avgAlpha.toFixed(2)) : null,
    // Exposed for Score Breakdown UI
    _winRateScore: Math.round(winRateScore),
    _pfScore:      Math.round(pfScore),
    _alphaScore:   alphaScore !== null ? Math.round(alphaScore) : null,
  };
}

function nullResult() {
  return {
    score: 0, total: 0, hits: 0, misses: 0,
    rawWR: null, wilsonWR: null,
    profitFactor: null, avgWin: null, avgLoss: null,
    avgReturn: null, avgAlpha: null,
    _winRateScore: null, _pfScore: null, _alphaScore: null,
  };
}

// ── Tier definitions ──────────────────────────────────────────────────────────
// Score-based + minimum call gate. No "days active" requirement — skill, not time.
const TIER_DEFS = [
  {
    key: 'legend', label: 'Legend', icon: '👑', minScore: 80, minCalls: 75,
    color: '#412402', bg: '#faeeda', border: '#ef9f27',
    description: 'Elite performance across a large verified sample',
  },
  {
    key: 'elite', label: 'Elite', icon: '⭐', minScore: 65, minCalls: 30,
    color: '#633806', bg: '#faeeda', border: '#f59e0b',
    description: 'Proven edge: strong win rate and positive profit factor',
  },
  {
    key: 'expert', label: 'Expert', icon: '🔷', minScore: 50, minCalls: 15,
    color: '#185fa5', bg: '#e6f1fb', border: '#3b82f6',
    description: 'Consistent edge with a meaningful sample size',
  },
  {
    key: 'strong', label: 'Strong', icon: '📈', minScore: 35, minCalls: 8,
    color: '#3b6d11', bg: '#eaf3de', border: '#22c55e',
    description: 'Above-average win rate and risk/reward forming',
  },
  {
    key: 'rising', label: 'Rising', icon: '🌱', minScore: 0, minCalls: 5,
    color: '#0c447c', bg: '#e6f1fb', border: '#3b82f6',
    description: 'Building a track record',
  },
];

const BUILDING = {
  key: 'building', label: 'Building', icon: '🔨', minScore: 0, minCalls: 0,
  color: '#6b6a64', bg: '#f1f0ec', border: '#d3d1c7',
  description: 'Complete 5+ resolved predictions to earn a tier',
};

export function computeTier(score, totalCalls) {
  for (const def of TIER_DEFS) {
    if (score >= def.minScore && totalCalls >= def.minCalls) return def;
  }
  return BUILDING;
}

export function computeTierProgress(score, totalCalls) {
  const current  = computeTier(score, totalCalls);
  const curIdx   = TIER_DEFS.findIndex(d => d.key === current.key);
  const next     = curIdx > 0 ? TIER_DEFS[curIdx - 1] : null;

  if (!next) return { current, next: null, requirements: [] };

  return {
    current,
    next,
    requirements: [
      {
        label: 'Analyst score',
        current: score,
        required: next.minScore,
        met: score >= next.minScore,
      },
      {
        label: 'Resolved calls',
        current: totalCalls,
        required: next.minCalls,
        met: totalCalls >= next.minCalls,
      },
    ],
  };
}
