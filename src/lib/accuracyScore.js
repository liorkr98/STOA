// ─── CONSTANTS ────────────────────────────────────────────────

const HOLD_SUCCESS_WINDOWS = {
  INTRADAY: 0.010,  // ±1.0%
  SHORT:    0.030,  // ±3.0%
  MEDIUM:   0.060,  // ±6.0%
  LONG:     0.100,  // ±10.0%
};

const SECTOR_MULTIPLIER = {
  "Biotechnology": 1.20,
  "Healthcare":    1.10,
  "Energy":        1.15,
  "Crypto":        1.25,
  "Technology":    1.05,
  "default":       1.00,
};

const NOISE_THRESHOLD = {
  INTRADAY: 0.005,
  SHORT:    0.020,
  MEDIUM:   0.050,
  LONG:     0.100,
};

// ─── HELPERS ──────────────────────────────────────────────────

export function getBucket(daysHeld) {
  if (!daysHeld || daysHeld < 1) return "INTRADAY";
  if (daysHeld < 15)  return "SHORT";
  if (daysHeld < 91)  return "MEDIUM";
  return "LONG";
}

// Normal CDF approximation (logistic sigmoid)
// Accurate to ±0.02 in the range z ∈ [-4, 4]
function normalCDF(z) {
  return 1 / (1 + Math.exp(-1.7 * z));
}

// ─── IS CALL SUCCESSFUL ───────────────────────────────────────
//
// BUY:  stock moved up   → success
// SELL: stock moved down → success
// HOLD: stock stayed FLAT within a timeframe-specific window
//       A HOLD call that moved +5% in 3 days = FAILURE
//       (analyst should have said BUY)
//       targetPrice on HOLD = fair value estimate only,
//       NOT used to determine success/failure

export function isCallSuccessful(call) {
  const { action, entryPrice, exitPrice, daysHeld } = call;
  if (!entryPrice || !exitPrice) return false;

  const rawReturn = (exitPrice - entryPrice) / entryPrice;

  if (action === "BUY")  return exitPrice > entryPrice;
  if (action === "SELL") return exitPrice < entryPrice;

  if (action === "HOLD") {
    const bucket = getBucket(daysHeld);
    const window = HOLD_SUCCESS_WINDOWS[bucket];
    return Math.abs(rawReturn) <= window;
  }

  return false;
}

// ─── Z-TEST SIGNIFICANCE MULTIPLIER ──────────────────────────
//
// Replaces the piecewise-linear σ(n) with a proper binomial Z-test.
// Tests H₀: hit_rate = 0.50 (random / no skill)
// Returns a multiplier in [0.2, 1.0]

function zTestMultiplier(wins, n) {
  if (n < 1) return 0;
  if (wins > n) wins = n;

  const hitRate = wins / n;
  const se  = Math.sqrt(0.25 / n);
  const z   = (hitRate - 0.5) / se;
  const phi = normalCDF(z);  // P(skill | data)

  // Map [0.50, 0.95] → [0.20, 1.00]
  return Math.max(0.20, Math.min(1.00, (phi - 0.50) / 0.45));
}

// ─── ALPHA SCORE ──────────────────────────────────────────────
//
// v2: uses percentile rank vs platform distribution
// instead of annualized absolute value.
//
// Platform distribution assumed: mean=5%/yr, sd=15%/yr

const PLATFORM_ALPHA_MEAN = 5;   // % annualized
const PLATFORM_ALPHA_SD   = 15;  // % annualized

function alphaScore(annualizedAlphaPct) {
  const z = (annualizedAlphaPct - PLATFORM_ALPHA_MEAN) / PLATFORM_ALPHA_SD;
  return Math.min(100, Math.max(0, normalCDF(z) * 100));
}

function annualizeReturn(rawReturn, daysHeld) {
  const days = Math.max(daysHeld || 1, 0.5);
  return (Math.pow(1 + rawReturn, 365 / days) - 1) * 100; // in %
}

function getDirectedReturn(call) {
  const rawReturn = (call.exitPrice - call.entryPrice) / call.entryPrice;

  if (call.action === "BUY")  return rawReturn;
  if (call.action === "SELL") return -rawReturn;

  if (call.action === "HOLD") {
    const absMove  = Math.abs(rawReturn);
    const absBench = Math.abs(call.benchmarkReturn || 0);
    return absBench - absMove;
  }

  return rawReturn;
}

// ─── BOLDNESS WEIGHT ──────────────────────────────────────────
//
// Calls below the noise threshold for their timeframe
// get a ×0.5 penalty (anti-gaming).
// HOLD calls are always bold = 1.0 (no penalty).

function getBoldnessWeight(call) {
  if (call.action === "HOLD") return 1.0;
  const moveSize = Math.abs((call.exitPrice - call.entryPrice) / call.entryPrice);
  const threshold = NOISE_THRESHOLD[getBucket(call.daysHeld)];
  return moveSize >= threshold ? 1.0 : 0.5;
}

// ─── PRICE TARGET SCORE ───────────────────────────────────────

function priceTargetScore(call) {
  if (!call.targetPrice || call.targetPrice <= 0) return 50; // neutral

  const delta = Math.abs(call.exitPrice - call.targetPrice) / call.targetPrice;

  if (delta <= 0.05) return 100;
  if (delta <= 0.10) return 70;
  if (delta <= 0.20) return 40;
  return 0;
}

// ─── CONSISTENCY SCORE ────────────────────────────────────────
//
// v2: uses Sharpe ratio instead of raw std dev × 300.

function consistencyScore(calls) {
  if (!calls || calls.length < 2) return 75; // neutral

  const returns = calls.map(c => {
    const r = (c.exitPrice - c.entryPrice) / c.entryPrice;
    return c.action === "SELL" ? -r : r;
  });

  const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
  const variance = returns.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / returns.length;
  const std = Math.sqrt(variance);

  if (std < 0.0001) return 100; // zero variance = perfectly consistent

  const sharpe = mean / std;
  return Math.min(100, Math.max(0, 50 + sharpe * 16.67));
}

// ─── SCORE ONE BUCKET ─────────────────────────────────────────

function scoreBucket(calls, bucketKey) {
  if (!calls || calls.length === 0) return null;
  const n = calls.length;

  // Component 1 — Hit Rate (weight 25%)
  const wins = calls.filter(c => isCallSuccessful(c)).length;
  const hitRate = wins / n;
  const hitScore = hitRate * 100;

  // Component 2 — Annualized Alpha, percentile-ranked (weight 40%)
  const alphas = calls.map(c => {
    const directed = getDirectedReturn(c);
    const ann = annualizeReturn(directed, c.daysHeld || 30);
    return Math.min(500, Math.max(-500, ann));
  });
  const avgAlpha = alphas.reduce((s, a) => s + a, 0) / n;
  const aScore = alphaScore(avgAlpha);

  // Component 3 — Price Target Accuracy (weight 20%)
  const withTarget = calls.filter(c => c.targetPrice && c.targetPrice > 0);
  let ptScore = 50;
  if (withTarget.length > 0) {
    ptScore = withTarget.map(c => priceTargetScore(c)).reduce((s, v) => s + v, 0) / withTarget.length;
  }

  // Component 4 — Consistency / Sharpe (weight 15%)
  const cScore = consistencyScore(calls);

  // Boldness weight
  const avgBoldness = calls.map(c => getBoldnessWeight(c)).reduce((s, b) => s + b, 0) / n;

  // Weights: Alpha 40%, Hit Rate 25%, Price Target 20%, Consistency 15%
  const rawScore = (
    aScore   * 0.40 +
    hitScore * 0.25 +
    ptScore  * 0.20 +
    cScore   * 0.15
  ) * avgBoldness;

  // Z-test significance multiplier
  const sigMult = zTestMultiplier(wins, n);

  const bucketScore = Math.min(100, rawScore * sigMult);

  return {
    score:         Math.round(bucketScore),
    calls:         n,
    wins,
    hitRate:       Math.round(hitRate * 100),
    avgAlpha:      Math.round(avgAlpha),
    sigMult:       Math.round(sigMult * 100),
    label:         { INTRADAY:"Intraday", SHORT:"Short-Term", MEDIUM:"Medium-Term", LONG:"Long-Term" }[bucketKey],
    isSignificant: sigMult >= 0.7,
  };
}

// ─── MAIN EXPORT ──────────────────────────────────────────────
//
// @param {Array} calls — closed predictions, each with:
//   {
//     action:          "BUY" | "SELL" | "HOLD",
//     ticker:          "AAPL",
//     entryPrice:      150.00,
//     exitPrice:       175.00,
//     targetPrice:     180.00,    // optional
//     daysHeld:        90,
//     benchmarkReturn: 0.08,      // S&P/sector ETF return same period
//     sector:          "Technology",
//   }
//
// @returns {Object} { score, tier, totalCalls, buckets, specialization }

export function calculateAccuracyScore(calls) {
  if (!calls || calls.length === 0) {
    return { score: 0, tier: "Building", buckets: {}, totalCalls: 0, specialization: null };
  }

  // Sort calls into buckets
  const bucketedCalls = { INTRADAY: [], SHORT: [], MEDIUM: [], LONG: [] };
  calls.forEach(c => bucketedCalls[getBucket(c.daysHeld || 30)].push(c));

  // Score each bucket
  const bucketScores = {};
  Object.entries(bucketedCalls).forEach(([key, arr]) => {
    if (arr.length > 0) bucketScores[key] = scoreBucket(arr, key);
  });

  const scoredBuckets = Object.values(bucketScores).filter(Boolean);
  if (scoredBuckets.length === 0) {
    return { score: 0, tier: "Building", buckets: {}, totalCalls: 0, specialization: null };
  }

  // Combine buckets: weighted by (calls × sigMult)
  const totalWeight = scoredBuckets.reduce((s, b) => s + b.calls * b.sigMult / 100, 0);
  const weightedScore = scoredBuckets.reduce((s, b) => {
    const w = (b.calls * b.sigMult / 100) / totalWeight;
    return s + b.score * w;
  }, 0);

  // Sector difficulty bonus
  const sectorCounts = {};
  calls.forEach(c => { const sec = c.sector || "default"; sectorCounts[sec] = (sectorCounts[sec] || 0) + 1; });
  const dominantSector = Object.entries(sectorCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "default";
  const sectorMult = SECTOR_MULTIPLIER[dominantSector] || 1.0;

  const finalScore = Math.round(Math.min(100, Math.max(0, weightedScore * sectorMult)));

  const tier =
    finalScore >= 90 ? "Elite"    :
    finalScore >= 75 ? "Expert"   :
    finalScore >= 60 ? "Strong"   :
    finalScore >= 45 ? "Average"  : "Building";

  // Specialization label
  const total = calls.length;
  const dominant = Object.entries(bucketedCalls).sort((a, b) => b[1].length - a[1].length)[0];
  const pct = dominant ? dominant[1].length / total : 0;
  const bucketLabels = { INTRADAY:"Intraday", SHORT:"Short-Term", MEDIUM:"Medium-Term", LONG:"Long-Term" };
  const specialization =
    pct >= 0.80 ? bucketLabels[dominant[0]] + " Specialist" :
    pct >= 0.60 ? bucketLabels[dominant[0]] + " Focused"    : "Generalist";

  return {
    score: finalScore,
    tier,
    totalCalls: calls.length,
    buckets: bucketScores,
    specialization,
  };
}

export function getAccuracyDisplay(score, tier) {
  const icons  = { Elite:"🌟", Expert:"⭐", Strong:"📈", Average:"📊", Building:"🔨" };
  const colors = { Elite:"#f59e0b", Expert:"#10b981", Strong:"#3b82f6", Average:"#6b7280", Building:"#9ca3af" };
  return { icon: icons[tier] || "📊", color: colors[tier] || "#6b7280", label: tier };
}