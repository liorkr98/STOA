// ─── CONSTANTS ────────────────────────────────────────────────

const TIMEFRAME_BUCKETS = {
  INTRADAY: { label: "Intraday",    maxDays: 1,   annualFactor: 365 },
  SHORT:    { label: "Short-Term",  maxDays: 14,  annualFactor: 26  },
  MEDIUM:   { label: "Medium-Term", maxDays: 90,  annualFactor: 4   },
  LONG:     { label: "Long-Term",   maxDays: 730, annualFactor: 1   },
};

// No difficulty multiplier — annualized alpha naturally equalizes timeframes
const TIMEFRAME_DIFFICULTY = {
  INTRADAY: 1.00,
  SHORT:    1.00,
  MEDIUM:   1.00,
  LONG:     1.00,
};

// Short-term needs more calls to prove edge above the ~55% momentum base rate
const SIGNIFICANCE_THRESHOLDS = {
  INTRADAY: { min: 30,  full: 150 },
  SHORT:    { min: 15,  full: 75  },
  MEDIUM:   { min: 5,   full: 25  },
  LONG:     { min: 3,   full: 10  },
};

// Minimum meaningful move: calls below this threshold get 50% weight on hit rate
const NOISE_THRESHOLD = {
  INTRADAY: 0.005,
  SHORT:    0.02,
  MEDIUM:   0.05,
  LONG:     0.10,
};

// Short-term has natural momentum — require higher alpha to score well
function getAlphaHurdle(bucketKey) {
  return { INTRADAY: 0.15, SHORT: 0.10, MEDIUM: 0.05, LONG: 0.02 }[bucketKey] || 0.05;
}

const SECTOR_MULTIPLIER = {
  "Biotechnology": 1.20,
  "Healthcare":    1.10,
  "Energy":        1.15,
  "Crypto":        1.25,
  "Technology":    1.05,
  "default":       1.00,
};

// ─── HELPERS ──────────────────────────────────────────────────

function getBucket(daysHeld) {
  if (!daysHeld || daysHeld < 1) return "INTRADAY";
  if (daysHeld < 15)  return "SHORT";
  if (daysHeld < 91)  return "MEDIUM";
  return "LONG";
}

// HOLD success window: stock must stay within this range to be a successful HOLD
const HOLD_SUCCESS_WINDOW = {
  INTRADAY: 0.010,  // ±1.0%
  SHORT:    0.030,  // ±3.0%
  MEDIUM:   0.060,  // ±6.0%
  LONG:     0.100,  // ±10%
};

function isCallSuccessful(call) {
  const { action, entryPrice, exitPrice, daysHeld } = call;
  if (!entryPrice || !exitPrice) return false;

  const rawReturn = (exitPrice - entryPrice) / entryPrice;

  if (action === "BUY")  return exitPrice > entryPrice;
  if (action === "SELL") return exitPrice < entryPrice;

  if (action === "HOLD") {
    const bucket = getBucket(daysHeld);
    const window = HOLD_SUCCESS_WINDOW[bucket];
    return Math.abs(rawReturn) <= window;
  }

  return false;
}

// For HOLD: alpha = how flat the stock was vs benchmark (positive = calmer than market)
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

// HOLD calls always get full boldness weight — noise threshold doesn't apply
function getBoldnessWeight(call, noiseThreshold) {
  if (call.action === "HOLD") return 1.0;
  const moveSize = Math.abs((call.exitPrice - call.entryPrice) / call.entryPrice);
  return moveSize >= noiseThreshold ? 1.0 : 0.5;
}

function annualizeReturn(rawReturn, daysHeld) {
  const days = Math.max(daysHeld || 1, 0.5);
  return Math.pow(1 + rawReturn, 365 / days) - 1;
}

function getSignificanceMultiplier(n, bucket) {
  const { min, full } = SIGNIFICANCE_THRESHOLDS[bucket];
  if (n < 1)     return 0;
  if (n < min)   return 0.3;
  if (n >= full) return 1.0;
  return 0.3 + 0.7 * ((n - min) / (full - min));
}

// ─── SCORE ONE BUCKET ──────────────────────────────────────────

function scoreBucket(calls, bucketKey) {
  if (!calls || calls.length === 0) return null;
  const n = calls.length;
  const noiseThreshold = NOISE_THRESHOLD[bucketKey];

  // 1. Hit Rate (35%) — bold calls count fully, sub-noise calls count 50%; HOLD always full weight
  const hitScores = calls.map(c => {
    const success = isCallSuccessful(c) ? 1 : 0;
    const weight = getBoldnessWeight(c, noiseThreshold);
    return success * weight;
  });
  const hitRate = calls.filter(c => isCallSuccessful(c)).length / n;
  const hitScore = (hitScores.reduce((s, v) => s + v, 0) / n) * 100;

  // 2. Annualized Alpha (30%) — HOLD uses flatness vs benchmark, BUY/SELL use directed return
  const alphas = calls.map(c => {
    const directed = getDirectedReturn(c);
    const days = c.daysHeld || 30;
    const annRet   = annualizeReturn(directed, days);
    const annBench = c.action === "HOLD" ? 0 : annualizeReturn(c.benchmarkReturn || 0, days);
    return Math.min(5.0, Math.max(-5.0, annRet - annBench));
  });
  const avgAlpha = alphas.reduce((s, a) => s + a, 0) / n;
  const hurdle = getAlphaHurdle(bucketKey);
  const alphaScore = Math.min(100, Math.max(0, 50 + ((avgAlpha - hurdle) * 20)));

  // 3. Price Target Accuracy (20%)
  const withTarget = calls.filter(c => c.targetPrice && c.targetPrice > 0);
  let ptScore = 50;
  if (withTarget.length > 0) {
    const scores = withTarget.map(c => {
      const diff = Math.abs(c.exitPrice - c.targetPrice) / c.targetPrice;
      if (diff <= 0.05) return 100;
      if (diff <= 0.10) return 70;
      if (diff <= 0.20) return 40;
      return 0;
    });
    ptScore = scores.reduce((s, v) => s + v, 0) / scores.length;
  }

  // 4. Consistency (15%)
  const returns = calls.map(c => getDirectedReturn(c));
  const mean = returns.reduce((s, r) => s + r, 0) / n;
  const std = Math.sqrt(returns.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / n);
  const consistencyScore = Math.min(100, Math.max(0, 100 - (std * 300)));

  // Weighted combination — no difficulty multiplier, alpha hurdle does the work
  const rawScore =
    hitScore         * 0.35 +
    alphaScore       * 0.30 +
    ptScore          * 0.20 +
    consistencyScore * 0.15;

  const sigMult = getSignificanceMultiplier(n, bucketKey);
  const finalBucketScore = Math.min(100, rawScore * sigMult);

  return {
    score:         Math.round(finalBucketScore),
    calls:         n,
    hitRate:       Math.round(hitRate * 100),
    avgAlpha:      Math.round(avgAlpha * 100),
    sigMult:       Math.round(sigMult * 100),
    label:         TIMEFRAME_BUCKETS[bucketKey].label,
    isSignificant: n >= SIGNIFICANCE_THRESHOLDS[bucketKey].min,
  };
}

// ─── MAIN EXPORT ───────────────────────────────────────────────

export function calculateAccuracyScore(calls) {
  if (!calls || calls.length === 0) {
    return { score: 0, tier: "Building", buckets: {}, totalCalls: 0, specialization: null };
  }

  // Sort into buckets
  const bucketedCalls = { INTRADAY: [], SHORT: [], MEDIUM: [], LONG: [] };
  calls.forEach(c => {
    const bucket = getBucket(c.daysHeld || 30);
    bucketedCalls[bucket].push(c);
  });

  // Score each bucket
  const bucketScores = {};
  Object.entries(bucketedCalls).forEach(([key, arr]) => {
    if (arr.length > 0) bucketScores[key] = scoreBucket(arr, key);
  });

  const scoredBuckets = Object.values(bucketScores).filter(Boolean);
  if (scoredBuckets.length === 0) {
    return { score: 0, tier: "Building", buckets: {}, totalCalls: 0, specialization: null };
  }

  // Combine buckets weighted by (calls × significance)
  const totalWeight = scoredBuckets.reduce((s, b) => s + (b.calls * b.sigMult / 100), 0);
  const weightedScore = scoredBuckets.reduce((s, b) => {
    const w = (b.calls * b.sigMult / 100) / totalWeight;
    return s + (b.score * w);
  }, 0);

  // Sector adjustment
  const sectorCounts = {};
  calls.forEach(c => {
    const sec = c.sector || "default";
    sectorCounts[sec] = (sectorCounts[sec] || 0) + 1;
  });
  const dominantSector = Object.entries(sectorCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || "default";
  const sectorMult = SECTOR_MULTIPLIER[dominantSector] || 1.0;

  const finalScore = Math.round(Math.min(100, Math.max(0, weightedScore * sectorMult)));

  const tier =
    finalScore >= 90 ? "Elite" :
    finalScore >= 75 ? "Expert" :
    finalScore >= 60 ? "Strong" :
    finalScore >= 45 ? "Average" : "Building";

  // Specialization label
  const total = calls.length;
  const dominant = Object.entries(bucketedCalls)
    .sort((a, b) => b[1].length - a[1].length)[0];
  const pct = dominant ? dominant[1].length / total : 0;
  const specialization =
    pct >= 0.80 ? TIMEFRAME_BUCKETS[dominant[0]].label + " Specialist" :
    pct >= 0.60 ? TIMEFRAME_BUCKETS[dominant[0]].label + " Focused" :
    "Generalist";

  return {
    score:       finalScore,
    tier,
    totalCalls:  calls.length,
    buckets:     bucketScores,
    specialization,
  };
}

export function getAccuracyDisplay(score, tier) {
  const icons  = { Elite: "🌟", Expert: "⭐", Strong: "📈", Average: "📊", Building: "🔨" };
  const colors = { Elite: "#f59e0b", Expert: "#10b981", Strong: "#3b82f6", Average: "#6b7280", Building: "#9ca3af" };
  return { icon: icons[tier] || "📊", color: colors[tier] || "#6b7280", label: tier };
}

export function isCallSuccessfulExport(call) {
  return isCallSuccessful(call);
}