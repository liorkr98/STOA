/**
 * checkPredictions — runs on a schedule (e.g. every hour).
 * For every published report with a pending prediction, fetches the live price
 * and resolves the prediction if the target is hit OR the timeframe expired.
 * Then recalculates accuracy_score for each affected analyst using calculateAccuracyScore v2.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

let _crumb = null;
let _cookie = null;

async function getYahooCrumb() {
  if (_crumb && _cookie) return { crumb: _crumb, cookie: _cookie };
  const consentRes = await fetch("https://finance.yahoo.com/", {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    redirect: "follow",
  });
  const cookieHeader = consentRes.headers.get("set-cookie") || "";
  _cookie = cookieHeader.split(",").map(c => c.split(";")[0].trim()).filter(Boolean).join("; ");

  const crumbRes = await fetch("https://query1.finance.yahoo.com/v1/test/getcrumb", {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      "Referer": "https://finance.yahoo.com/",
      "Cookie": _cookie,
    },
  });
  if (crumbRes.ok) _crumb = await crumbRes.text();
  return { crumb: _crumb, cookie: _cookie };
}

async function getLivePrice(ticker) {
  const { crumb, cookie } = await getYahooCrumb();
  const sep = crumb ? `?crumb=${encodeURIComponent(crumb)}` : "";
  const res = await fetch(`https://query2.finance.yahoo.com/v10/finance/quoteSummary/${ticker}${sep}&modules=price`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      "Referer": "https://finance.yahoo.com/",
      ...(cookie ? { "Cookie": cookie } : {}),
    },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.quoteSummary?.result?.[0]?.price?.regularMarketPrice?.raw ?? null;
}

function parseTimeframeMonths(timeframe) {
  if (!timeframe) return 6;
  const str = timeframe.toLowerCase();
  if (str.includes("day")) return (parseInt(str) || 7) / 30;
  if (str.includes("week")) return (parseInt(str) || 1) / 4;
  if (str.includes("month")) return parseInt(str) || 6;
  if (str.includes("year")) return (parseInt(str) || 1) * 12;
  return 6;
}

function resolveOutcome(action, lockPrice, targetPrice, currentPrice) {
  if (!lockPrice || !targetPrice || !currentPrice) return null;

  const targetMove = (targetPrice - lockPrice) / lockPrice;
  const actualMove = (currentPrice - lockPrice) / lockPrice;

  let ratio;
  if (action === "Long") {
    ratio = targetMove !== 0 ? actualMove / targetMove : 0;
  } else if (action === "Short") {
    const tgt = (lockPrice - targetPrice) / lockPrice;
    const act = (lockPrice - currentPrice) / lockPrice;
    ratio = tgt !== 0 ? act / tgt : 0;
  } else {
    // Hold — check how close the price stays to lock
    ratio = 1 - Math.abs(actualMove);
  }

  if (ratio >= 0.95) return "hit";
  if (ratio >= 0.50) return "near";
  if (ratio >= 0.15) return "partial";
  return "miss";
}

// ─── ACCURACY ENGINE v2 (inlined — no local imports in Deno) ──────────────

const HOLD_SUCCESS_WINDOWS = { INTRADAY: 0.010, SHORT: 0.030, MEDIUM: 0.060, LONG: 0.100 };
const NOISE_THRESHOLD      = { INTRADAY: 0.005, SHORT: 0.020, MEDIUM: 0.050, LONG: 0.100 };
const SECTOR_MULTIPLIER    = { "Biotechnology":1.20,"Healthcare":1.10,"Energy":1.15,"Crypto":1.25,"Technology":1.05,"default":1.00 };
const PLATFORM_ALPHA_MEAN  = 5;
const PLATFORM_ALPHA_SD    = 15;

function getBucket(daysHeld) {
  if (!daysHeld || daysHeld < 1) return "INTRADAY";
  if (daysHeld < 15) return "SHORT";
  if (daysHeld < 91) return "MEDIUM";
  return "LONG";
}

function normalCDF(z) {
  return 1 / (1 + Math.exp(-1.7 * z));
}

function zTestMultiplier(wins, n) {
  if (n < 1) return 0;
  if (wins > n) wins = n;
  const hitRate = wins / n;
  const se  = Math.sqrt(0.25 / n);
  const z   = (hitRate - 0.5) / se;
  const phi = normalCDF(z);
  return Math.max(0.20, Math.min(1.00, (phi - 0.50) / 0.45));
}

function isCallSuccessful(call) {
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

function annualizeReturn(rawReturn, daysHeld) {
  const days = Math.max(daysHeld || 1, 0.5);
  return (Math.pow(1 + rawReturn, 365 / days) - 1) * 100;
}

function alphaScore(annualizedAlphaPct) {
  const z = (annualizedAlphaPct - PLATFORM_ALPHA_MEAN) / PLATFORM_ALPHA_SD;
  return Math.min(100, Math.max(0, normalCDF(z) * 100));
}

function getBoldnessWeight(call) {
  if (call.action === "HOLD") return 1.0;
  const moveSize = Math.abs((call.exitPrice - call.entryPrice) / call.entryPrice);
  const threshold = NOISE_THRESHOLD[getBucket(call.daysHeld)];
  return moveSize >= threshold ? 1.0 : 0.5;
}

function priceTargetScore(call) {
  if (!call.targetPrice || call.targetPrice <= 0) return 50;
  const delta = Math.abs(call.exitPrice - call.targetPrice) / call.targetPrice;
  if (delta <= 0.05) return 100;
  if (delta <= 0.10) return 70;
  if (delta <= 0.20) return 40;
  return 0;
}

function consistencyScore(calls) {
  if (!calls || calls.length < 2) return 75;
  const returns = calls.map(c => {
    const r = (c.exitPrice - c.entryPrice) / c.entryPrice;
    return c.action === "SELL" ? -r : r;
  });
  const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
  const variance = returns.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / returns.length;
  const std = Math.sqrt(variance);
  if (std < 0.0001) return 100;
  const sharpe = mean / std;
  return Math.min(100, Math.max(0, 50 + sharpe * 16.67));
}

function scoreBucket(calls) {
  if (!calls || calls.length === 0) return null;
  const n = calls.length;
  const wins = calls.filter(c => isCallSuccessful(c)).length;
  const hitRate = wins / n;
  const hitScore = hitRate * 100;

  const alphas = calls.map(c => {
    const directed = getDirectedReturn(c);
    const ann = annualizeReturn(directed, c.daysHeld || 30);
    return Math.min(500, Math.max(-500, ann));
  });
  const avgAlpha = alphas.reduce((s, a) => s + a, 0) / n;
  const aScore = alphaScore(avgAlpha);

  const withTarget = calls.filter(c => c.targetPrice && c.targetPrice > 0);
  let ptScore = 50;
  if (withTarget.length > 0) {
    ptScore = withTarget.map(c => priceTargetScore(c)).reduce((s, v) => s + v, 0) / withTarget.length;
  }

  const cScore = consistencyScore(calls);
  const avgBoldness = calls.map(c => getBoldnessWeight(c)).reduce((s, b) => s + b, 0) / n;

  const rawScore = (aScore * 0.40 + hitScore * 0.25 + ptScore * 0.20 + cScore * 0.15) * avgBoldness;
  const sigMult = zTestMultiplier(wins, n);
  const bucketScore = Math.min(100, rawScore * sigMult);

  return {
    score:    Math.round(bucketScore),
    calls:    n,
    wins,
    hitRate:  Math.round(hitRate * 100),
    sigMult:  Math.round(sigMult * 100),
  };
}

function calculateAccuracyScore(calls) {
  if (!calls || calls.length === 0) {
    return { score: 0, tier: "Building", buckets: {}, totalCalls: 0, specialization: null, hitRateRaw: 0 };
  }

  const bucketedCalls = { INTRADAY: [], SHORT: [], MEDIUM: [], LONG: [] };
  calls.forEach(c => bucketedCalls[getBucket(c.daysHeld || 30)].push(c));

  const bucketScores = {};
  Object.entries(bucketedCalls).forEach(([key, arr]) => {
    if (arr.length > 0) bucketScores[key] = scoreBucket(arr);
  });

  const scoredBuckets = Object.values(bucketScores).filter(Boolean);
  if (scoredBuckets.length === 0) {
    return { score: 0, tier: "Building", buckets: {}, totalCalls: 0, specialization: null, hitRateRaw: 0 };
  }

  const totalWeight = scoredBuckets.reduce((s, b) => s + b.calls * b.sigMult / 100, 0);
  const weightedScore = scoredBuckets.reduce((s, b) => {
    const w = totalWeight > 0 ? (b.calls * b.sigMult / 100) / totalWeight : 1 / scoredBuckets.length;
    return s + b.score * w;
  }, 0);

  const sectorCounts = {};
  calls.forEach(c => { const sec = c.sector || "default"; sectorCounts[sec] = (sectorCounts[sec] || 0) + 1; });
  const dominantSector = Object.entries(sectorCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "default";
  const sectorMult = SECTOR_MULTIPLIER[dominantSector] || 1.0;

  const finalScore = Math.round(Math.min(100, Math.max(0, weightedScore * sectorMult)));

  const tier =
    finalScore >= 90 ? "Elite"   :
    finalScore >= 75 ? "Expert"  :
    finalScore >= 60 ? "Strong"  :
    finalScore >= 45 ? "Average" : "Building";

  const totalCalls = calls.length;
  const totalWins  = calls.filter(c => isCallSuccessful(c)).length;
  const hitRateRaw = totalCalls > 0 ? totalWins / totalCalls : 0;

  const dominant = Object.entries(bucketedCalls).sort((a, b) => b[1].length - a[1].length)[0];
  const pct = dominant ? dominant[1].length / totalCalls : 0;
  const bucketLabels = { INTRADAY:"Intraday", SHORT:"Short-Term", MEDIUM:"Medium-Term", LONG:"Long-Term" };
  const specialization =
    pct >= 0.80 ? bucketLabels[dominant[0]] + " Specialist" :
    pct >= 0.60 ? bucketLabels[dominant[0]] + " Focused"    : "Generalist";

  return { score: finalScore, tier, totalCalls, buckets: bucketScores, specialization, hitRateRaw };
}

// ─── MAIN HANDLER ────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow scheduled (no user) or admin user
    let isAuthorized = false;
    try {
      const user = await base44.auth.me();
      if (user?.role === "admin") isAuthorized = true;
    } catch {
      isAuthorized = true;
    }
    if (!isAuthorized) return Response.json({ error: "Forbidden" }, { status: 403 });

    const allReports = await base44.asServiceRole.entities.Report.filter({ status: "published" }, "-created_date", 500);
    const pending = allReports.filter(r =>
      r.prediction_action &&
      r.prediction_ticker &&
      r.prediction_lock_price &&
      r.prediction_target_price &&
      (!r.prediction_outcome || r.prediction_outcome === "pending")
    );

    if (pending.length === 0) return Response.json({ message: "No pending predictions.", resolved: 0 });

    const tickerMap = {};
    for (const r of pending) {
      const t = r.prediction_ticker.toUpperCase();
      if (!tickerMap[t]) tickerMap[t] = [];
      tickerMap[t].push(r);
    }

    const now = new Date();
    const affectedEmails = new Set();
    let resolvedCount = 0;

    for (const [ticker, reports] of Object.entries(tickerMap)) {
      const livePrice = await getLivePrice(ticker);
      if (!livePrice) continue;

      for (const report of reports) {
        const lockTime = report.prediction_lock_time ? new Date(report.prediction_lock_time) : new Date(report.created_date);
        const months = parseTimeframeMonths(report.prediction_timeframe);
        const expiryMs = lockTime.getTime() + months * 30 * 24 * 60 * 60 * 1000;
        const isExpired = now.getTime() >= expiryMs;

        const outcome = resolveOutcome(report.prediction_action, report.prediction_lock_price, report.prediction_target_price, livePrice);
        const shouldResolve = outcome === "hit" || isExpired;

        if (!shouldResolve) {
          if (report.prediction_outcome !== "pending") {
            await base44.asServiceRole.entities.Report.update(report.id, { prediction_outcome: "pending" });
          }
          continue;
        }

        const finalOutcome = outcome || "miss";
        await base44.asServiceRole.entities.Report.update(report.id, {
          prediction_outcome: finalOutcome,
          prediction_resolved_price: livePrice,
          prediction_resolved_time: now.toISOString(),
        });

        const outcomeEmoji = { hit: "🎯", near: "✅", partial: "🟡", miss: "❌" }[finalOutcome] || "📊";
        const yieldPct = report.prediction_lock_price
          ? (((livePrice - report.prediction_lock_price) / report.prediction_lock_price) * 100).toFixed(2)
          : null;
        const yieldStr = yieldPct !== null ? ` (${yieldPct > 0 ? "+" : ""}${yieldPct}% yield)` : "";

        await base44.asServiceRole.integrations.Core.SendEmail({
          to: report.created_by,
          subject: `${outcomeEmoji} Your ${ticker} prediction was resolved — ${finalOutcome.toUpperCase()}`,
          body: `Hi,\n\nYour prediction on $${ticker} has been resolved.\n\nReport: "${report.title}"\nAction: ${report.prediction_action}\nLocked at: $${report.prediction_lock_price}\nTarget: $${report.prediction_target_price}\nResolved price: $${livePrice}${yieldStr}\nOutcome: ${finalOutcome.toUpperCase()}\n\nView your predictions: https://stakify-f5b3c3a0.base44.app/predictions\n\n— STOA`,
        });

        affectedEmails.add(report.created_by);
        resolvedCount++;
      }
    }

    // ── Recalculate accuracy for each affected analyst using v2 engine ──
    for (const email of affectedEmails) {
      const userReports = await base44.asServiceRole.entities.Report.filter({ created_by: email, status: "published" }, "-created_date", 200);
      const closedPreds = userReports.filter(r =>
        r.prediction_action &&
        r.prediction_lock_price &&
        r.prediction_resolved_price &&
        r.prediction_outcome &&
        r.prediction_outcome !== "pending"
      );

      if (closedPreds.length === 0) continue;

      // Map to the format expected by calculateAccuracyScore
      const calls = closedPreds.map(r => {
        const lockTime     = r.prediction_lock_time ? new Date(r.prediction_lock_time) : new Date(r.created_date);
        const resolvedTime = r.prediction_resolved_time ? new Date(r.prediction_resolved_time) : now;
        const daysHeld     = Math.max(1, Math.round((resolvedTime - lockTime) / 86400000));

        // Approximate SPY benchmark: ~0.03%/day
        const benchmarkReturn = 0.0003 * daysHeld;

        // Normalize action to BUY/SELL/HOLD
        let action = "BUY";
        if (r.prediction_action === "Short") action = "SELL";
        if (r.prediction_action === "Hold")  action = "HOLD";

        return {
          action,
          entryPrice:      r.prediction_lock_price,
          exitPrice:       r.prediction_resolved_price,
          targetPrice:     r.prediction_target_price || null,
          daysHeld,
          benchmarkReturn,
          sector:          r.industry || "default",
        };
      });

      const result = calculateAccuracyScore(calls);

      const users = await base44.asServiceRole.entities.User.filter({ email }, "-created_date", 1);
      if (users.length > 0) {
        await base44.asServiceRole.entities.User.update(users[0].id, {
          accuracy_score:     parseFloat(result.score.toFixed(1)),
          accuracy_tier:      result.tier,
          hit_rate:           parseFloat((result.hitRateRaw * 100).toFixed(1)),
          total_calls:        result.totalCalls,
          specialization:     result.specialization,
          accuracy_breakdown: JSON.stringify(result.buckets),
        });
      }
    }

    return Response.json({ message: `Resolved ${resolvedCount} predictions.`, resolved: resolvedCount });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});