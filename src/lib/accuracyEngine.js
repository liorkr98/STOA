/**
 * STOA Accuracy Engine — Weighted Prediction Scoring
 *
 * predictionScore = baseCredit × timeBonus × magnitudeFactor
 * accuracyScore = (Σ predictionScore / total_predictions) × 100, clamped to 100
 */

function parseTimeframeMonths(timeframe) {
  if (!timeframe) return 6;
  const str = timeframe.toLowerCase();
  if (str.includes("day")) return (parseInt(str) || 7) / 30;
  if (str.includes("week")) return (parseInt(str) || 1) / 4;
  if (str.includes("month")) return parseInt(str) || 6;
  if (str.includes("year")) return (parseInt(str) || 1) * 12;
  return 6;
}

export function scorePrediction(prediction) {
  const { action, lockPrice, targetPrice, lockTime, resolvedPrice, resolvedTime, outcome, stopLoss } = prediction;

  // Stop loss hit check — if resolvedPrice crossed the stop, it's a forced miss
  // regardless of outcome field, since the trade would have been exited at a loss.
  if (stopLoss && resolvedPrice && lockPrice) {
    const isLong  = action === "Long";
    const isShort = action === "Short";
    if (isLong  && resolvedPrice <= stopLoss) return { baseCredit: 0, timeBonus: 1, magnitudeFactor: 1, score: 0, stopLossHit: true };
    if (isShort && resolvedPrice >= stopLoss) return { baseCredit: 0, timeBonus: 1, magnitudeFactor: 1, score: 0, stopLossHit: true };
  }

  if (!lockPrice || !targetPrice || lockPrice === 0) return null;

  const targetMove = Math.abs((targetPrice - lockPrice) / lockPrice);

  // Magnitude factor
  let magnitudeFactor;
  if (targetMove > 0.30) magnitudeFactor = 1.3;
  else if (targetMove >= 0.10) magnitudeFactor = 1.0;
  else magnitudeFactor = 0.8;

  // Time bonus — only applies if we know when it resolved
  let timeBonus = 1.0;
  if (lockTime && resolvedTime) {
    const timeframMonths = parseTimeframeMonths(prediction.timeframe);
    const totalMs = timeframMonths * 30 * 24 * 60 * 60 * 1000;
    const elapsedMs = new Date(resolvedTime) - new Date(lockTime);
    const pct = elapsedMs / totalMs;
    if (pct <= 0.25) timeBonus = 1.5;
    else if (pct <= 0.50) timeBonus = 1.25;
    else if (pct <= 0.75) timeBonus = 1.0;
    else timeBonus = 0.9;
  }

  // Base credit from outcome
  let baseCredit = 0;

  // If explicit outcome is available
  if (outcome === "hit") {
    baseCredit = 1.0;
  } else if (outcome === "miss") {
    baseCredit = 0;
  } else if (resolvedPrice != null) {
    // Calculate from resolved price
    const isLong = action === "Long";
    const isShort = action === "Short";
    const priceDiff = isLong
      ? (resolvedPrice - lockPrice) / lockPrice
      : isShort
      ? (lockPrice - resolvedPrice) / lockPrice
      : Math.abs(resolvedPrice - targetPrice) / Math.abs(targetPrice - lockPrice || 1);

    const targetDiff = isLong
      ? (targetPrice - lockPrice) / lockPrice
      : isShort
      ? (lockPrice - targetPrice) / lockPrice
      : 0;

    const ratio = targetDiff !== 0 ? priceDiff / targetDiff : 0;

    if (ratio >= 0.95) baseCredit = 1.0;       // Exact hit (within 5%)
    else if (ratio >= 0.50) baseCredit = 0.5;  // Near hit
    else if (ratio >= 0.15) baseCredit = 0.25; // Directional
    else baseCredit = 0;                        // Miss
  } else {
    return null; // Unresolved prediction — skip
  }

  return {
    baseCredit,
    timeBonus,
    magnitudeFactor,
    score: baseCredit * timeBonus * magnitudeFactor,
  };
}

/**
 * Calculate overall accuracy score from an array of predictions.
 * Each prediction should have: action, lockPrice, targetPrice, outcome (or resolvedPrice).
 * Returns a number 0–100.
 */
export function calculateAccuracyScore(predictions) {
  if (!predictions || predictions.length === 0) return 0;

  let totalScore = 0;
  let count = 0;

  for (const pred of predictions) {
    const result = scorePrediction(pred);
    if (result !== null) {
      totalScore += result.score;
      count++;
    }
  }

  if (count === 0) return 0;
  return Math.min(100, (totalScore / count) * 100);
}