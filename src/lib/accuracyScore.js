// ─── ELO-BASED ACCURACY ENGINE v3 ────────────────────────────
// Based on: TipRanks/Cornell (2021), Elo rating literature (2024)
// Core fix: 1 correct call can NEVER yield 100/100
// One call moves from 1000 → ~1016 max (K=16×2.5×1.3×1.0 at best)

// ─── CONSTANTS ────────────────────────────────────────────────

const ELO_START   = 1000;
const ELO_FLOOR   = 600;
const ELO_CEILING = 1400;
const K_BASE      = 16;

// HOLD success windows per timeframe
const HOLD_WINDOWS = {
  INTRADAY: 0.010,  // ±1%
  SHORT:    0.030,  // ±3%
  MEDIUM:   0.060,  // ±6%
  LONG:     0.100,  // ±10%
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

export function getBucket(daysHeld) {
  if (!daysHeld || daysHeld < 1) return "INTRADAY";
  if (daysHeld < 15)  return "SHORT";
  if (daysHeld < 91)  return "MEDIUM";
  return "LONG";
}

function annualizeReturn(rawReturn, daysHeld) {
  const days = Math.max(daysHeld || 1, 0.5);
  return (Math.pow(1 + rawReturn, 365 / days) - 1) * 100;
}

// Convert Elo rating to display score 0–100
function eloToScore(rating) {
  return Math.round(Math.max(0, Math.min(100, (rating - ELO_FLOOR) / 8)));
}

// ─── IS CALL SUCCESSFUL ───────────────────────────────────────
//
// BUY/Long:  exitPrice > entryPrice → win
// SELL/Short: exitPrice < entryPrice → win
// HOLD:      stock stayed flat within timeframe window
//            target price on HOLD = fair-value estimate only (NOT used for win/loss)

export function isCallSuccessful(call) {
  const { action, entryPrice, exitPrice, daysHeld } = call;
  if (!entryPrice || !exitPrice) return false;

  const move = (exitPrice - entryPrice) / entryPrice;

  // Support both "Long"/"Short"/"Hold" (report format) and "BUY"/"SELL"/"HOLD"
  const a = (action || "").toUpperCase();
  if (a === "BUY"  || a === "LONG")  return move > 0;
  if (a === "SELL" || a === "SHORT") return move < 0;
  if (a === "HOLD") {
    const window = HOLD_WINDOWS[getBucket(daysHeld)];
    return Math.abs(move) <= window;
  }
  return false;
}

// ─── MODIFIED K-FACTOR ────────────────────────────────────────
// K = K_base × alpha_mult × boldness_mult × timeframe_mult
// Academic basis: 538's Elo uses margin-of-victory as adaptive K
// We use alpha (excess return vs benchmark) as the equivalent

function getAlphaMultiplier(annualizedAlpha) {
  if (annualizedAlpha >  30) return 2.5;
  if (annualizedAlpha >  15) return 2.0;
  if (annualizedAlpha >   5) return 1.5;
  if (annualizedAlpha >   0) return 1.0;
  if (annualizedAlpha > -15) return 0.7;
  return 0.4;
}

function getBoldnessMultiplier(call) {
  const a = (call.action || "").toUpperCase();
  if (a === "HOLD") return 0.8; // HOLD reveals less directional information
  const moveSize = Math.abs((call.exitPrice - call.entryPrice) / call.entryPrice);
  const noiseMap = { INTRADAY: 0.005, SHORT: 0.02, MEDIUM: 0.05, LONG: 0.10 };
  const noise = noiseMap[getBucket(call.daysHeld)];
  return moveSize >= noise * 2 ? 1.3 : 0.5;
}

function getTimeframeMultiplier(daysHeld) {
  return { LONG: 1.2, MEDIUM: 1.0, SHORT: 0.9, INTRADAY: 0.8 }[getBucket(daysHeld)];
}

// ─── APPLY ONE CALL TO ELO RATING ─────────────────────────────

export function applyCallToRating(currentRating, call) {
  const a = (call.action || "").toUpperCase();
  const rawReturn = (call.exitPrice - call.entryPrice) / call.entryPrice;
  const directed  = (a === "SELL" || a === "SHORT") ? -rawReturn : rawReturn;
  const annReturn = annualizeReturn(directed, call.daysHeld);
  const annBench  = annualizeReturn(call.benchmarkReturn || 0, call.daysHeld);
  const alpha     = Math.min(500, Math.max(-500, annReturn - annBench));

  const K = K_BASE
    * getAlphaMultiplier(alpha)
    * getBoldnessMultiplier(call)
    * getTimeframeMultiplier(call.daysHeld);

  const E = 0.5; // analyst vs neutral market
  const won = isCallSuccessful(call);
  const A = won ? 1 : 0;

  const delta = K * (A - E);
  const newRating = Math.max(ELO_FLOOR, Math.min(ELO_CEILING, currentRating + delta));

  return { newRating, delta, alpha, K, won };
}

// ─── FULL SCORE CALCULATION ───────────────────────────────────
//
// Replays ALL closed calls chronologically.
// Returns Elo rating, display score 0–100, tier, breakdown.
//
// @param calls — array of closed predictions, each with:
//   { action, entryPrice, exitPrice, targetPrice?, daysHeld,
//     benchmarkReturn, sector, created_date }

export function calculateAccuracyScore(calls) {
  if (!calls || calls.length === 0) {
    return {
      score: 0, rating: ELO_START, tier: "Building",
      totalCalls: 0, hitRate: 0, hitRateRaw: 0,
      buckets: {}, specialization: null,
    };
  }

  // Sort chronologically
  const sorted = [...calls].sort(
    (a, b) => new Date(a.created_date || 0) - new Date(b.created_date || 0)
  );

  let rating = ELO_START;
  const bucketStats = { INTRADAY: [], SHORT: [], MEDIUM: [], LONG: [] };

  sorted.forEach(call => {
    const result = applyCallToRating(rating, call);
    rating = result.newRating;
    const bucket = getBucket(call.daysHeld);
    bucketStats[bucket].push({ won: result.won, alpha: result.alpha, delta: result.delta });
  });

  // Sector difficulty bonus on final rating
  const sectorCounts = {};
  calls.forEach(c => {
    const s = c.sector || "default";
    sectorCounts[s] = (sectorCounts[s] || 0) + 1;
  });
  const dominantSector = Object.entries(sectorCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "default";
  const sectorMult = SECTOR_MULTIPLIER[dominantSector] || 1.0;
  const adjustedRating = Math.min(ELO_CEILING, rating * (1 + (sectorMult - 1) * 0.5));

  const finalScore = eloToScore(adjustedRating);

  const tier =
    finalScore >= 90 ? "Elite"   :
    finalScore >= 75 ? "Expert"  :
    finalScore >= 60 ? "Strong"  :
    finalScore >= 45 ? "Average" : "Building";

  const wins = calls.filter(c => isCallSuccessful(c)).length;
  const hitRate = Math.round((wins / calls.length) * 100);

  // Per-bucket summary
  const buckets = {};
  Object.entries(bucketStats).forEach(([bucket, stats]) => {
    if (stats.length === 0) return;
    const bWins    = stats.filter(s => s.won).length;
    const avgAlpha = stats.reduce((s, x) => s + x.alpha, 0) / stats.length;
    const netDelta = stats.reduce((s, x) => s + x.delta, 0);
    buckets[bucket] = {
      score:         Math.round(Math.max(0, Math.min(100, eloToScore(ELO_START + netDelta)))),
      calls:         stats.length,
      wins:          bWins,
      hitRate:       Math.round(bWins / stats.length * 100),
      avgAlpha:      Math.round(avgAlpha),
      netDelta:      Math.round(netDelta),
      isSignificant: stats.length >= 5,
      label: { INTRADAY: "Intraday", SHORT: "Short-Term", MEDIUM: "Medium-Term", LONG: "Long-Term" }[bucket],
    };
  });

  // Specialization
  const total = calls.length;
  const dominant = Object.entries(bucketStats).sort((a, b) => b[1].length - a[1].length)[0];
  const pct = dominant[1].length / total;
  const bucketLabels = { INTRADAY: "Intraday", SHORT: "Short-Term", MEDIUM: "Medium-Term", LONG: "Long-Term" };
  const specialization =
    pct >= 0.80 ? bucketLabels[dominant[0]] + " Specialist" :
    pct >= 0.60 ? bucketLabels[dominant[0]] + " Focused"    : "Generalist";

  return {
    score:       finalScore,
    rating:      Math.round(adjustedRating),
    tier,
    totalCalls:  calls.length,
    hitRate,
    hitRateRaw:  wins / calls.length,
    buckets,
    specialization,
  };
}

export function getAccuracyDisplay(score, tier) {
  const icons  = { Elite: "🌟", Expert: "⭐", Strong: "📈", Average: "📊", Building: "🔨" };
  const colors = { Elite: "#f59e0b", Expert: "#10b981", Strong: "#3b82f6", Average: "#6b7280", Building: "#9ca3af" };
  return { icon: icons[tier] || "📊", color: colors[tier] || "#6b7280", label: tier };
}