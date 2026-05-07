// ─── CONSTANTS ────────────────────────────────────────────────

const TIMEFRAME_BUCKETS = {
  INTRADAY: { label: "Intraday",    maxDays: 1,   annualFactor: 365 },
  SHORT:    { label: "Short-Term",  maxDays: 14,  annualFactor: 26  },
  MEDIUM:   { label: "Medium-Term", maxDays: 90,  annualFactor: 4   },
  LONG:     { label: "Long-Term",   maxDays: 730, annualFactor: 1   },
};

const TIMEFRAME_DIFFICULTY = {
  INTRADAY: 1.40,
  SHORT:    1.25,
  MEDIUM:   1.00,
  LONG:     0.90,
};

const SIGNIFICANCE_THRESHOLDS = {
  INTRADAY: { min: 20, full: 100 },
  SHORT:    { min: 10, full: 50  },
  MEDIUM:   { min: 5,  full: 25  },
  LONG:     { min: 3,  full: 10  },
};

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

function isCallSuccessful(call) {
  const { action, entryPrice, exitPrice } = call;
  if (!entryPrice || !exitPrice) return false;
  if (action === "BUY")  return exitPrice > entryPrice;
  if (action === "SELL") return exitPrice < entryPrice;
  if (action === "HOLD") return Math.abs((exitPrice - entryPrice) / entryPrice) < 0.05;
  return false;
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
  const difficulty = TIMEFRAME_DIFFICULTY[bucketKey];

  // 1. Hit Rate (35%)
  const wins = calls.filter(c => isCallSuccessful(c)).length;
  const hitRate = wins / n;
  const hitScore = hitRate * 100;

  // 2. Annualized Alpha (30%)
  const alphas = calls.map(c => {
    const raw = (c.exitPrice - c.entryPrice) / c.entryPrice;
    const directed = c.action === "SELL" ? -raw : raw;
    const days = c.daysHeld || 30;
    const annRet   = annualizeReturn(directed, days);
    const annBench = annualizeReturn(c.benchmarkReturn || 0, days);
    return Math.min(5.0, Math.max(-5.0, annRet - annBench));
  });
  const avgAlpha = alphas.reduce((s, a) => s + a, 0) / n;
  const alphaScore = Math.min(100, Math.max(0, 50 + (avgAlpha * 25)));

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
  const returns = calls.map(c => {
    const r = (c.exitPrice - c.entryPrice) / c.entryPrice;
    return c.action === "SELL" ? -r : r;
  });
  const mean = returns.reduce((s, r) => s + r, 0) / n;
  const std = Math.sqrt(returns.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / n);
  const consistencyScore = Math.min(100, Math.max(0, 100 - (std * 300)));

  // Weighted combination
  const rawScore =
    hitScore         * 0.35 +
    alphaScore       * 0.30 +
    ptScore          * 0.20 +
    consistencyScore * 0.15;

  const sigMult = getSignificanceMultiplier(n, bucketKey);
  const finalBucketScore = Math.min(100, rawScore * difficulty * sigMult);

  return {
    score:         Math.round(finalBucketScore),
    calls:         n,
    hitRate:       Math.round(hitRate * 100),
    avgAlpha:      Math.round(avgAlpha * 100),
    difficulty,
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