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
  // Fetches live price including extended hours (pre-market and after-hours)
  // Yahoo Finance returns preMarketPrice/postMarketPrice when applicable,
  // falling back to regularMarketPrice — this covers extended hours pricing.
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
  const priceData = data?.quoteSummary?.result?.[0]?.price;
  if (!priceData) return null;
  // Prefer extended hours price if available — includes pre-market and after-hours pricing
  const preMarket = priceData?.preMarketPrice?.raw;
  const postMarket = priceData?.postMarketPrice?.raw;
  const regular = priceData?.regularMarketPrice?.raw;
  // Use whichever is most recent/live (extended hours when available)
  return postMarket ?? preMarket ?? regular ?? null;
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

// ─── ELO ACCURACY ENGINE v3 (inlined — no local imports in Deno) ─────────────
// Modified Elo: K-factor weighted by alpha, boldness & timeframe
// Based on TipRanks/Cornell research & Elo literature 2024
// 1 perfect call moves rating by at most ~+20 Elo (never gives 100/100)

const ELO_START   = 1000;
const ELO_FLOOR   = 600;
const ELO_CEILING = 1400;
const K_BASE      = 16;

const HOLD_WINDOWS_ELO = { INTRADAY: 0.010, SHORT: 0.030, MEDIUM: 0.060, LONG: 0.100 };
const SECTOR_MULTIPLIER = { "Biotechnology":1.20,"Healthcare":1.10,"Energy":1.15,"Crypto":1.25,"Technology":1.05,"default":1.00 };

function getBucket(daysHeld) {
  if (!daysHeld || daysHeld < 1) return "INTRADAY";
  if (daysHeld < 15) return "SHORT";
  if (daysHeld < 91) return "MEDIUM";
  return "LONG";
}

function annualizeReturn(rawReturn, daysHeld) {
  const days = Math.max(daysHeld || 1, 0.5);
  return (Math.pow(1 + rawReturn, 365 / days) - 1) * 100;
}

function eloToScore(rating) {
  return Math.round(Math.max(0, Math.min(100, (rating - ELO_FLOOR) / 8)));
}

function isCallSuccessful(call) {
  const { entryPrice, exitPrice, daysHeld } = call;
  if (!entryPrice || !exitPrice) return false;
  const move = (exitPrice - entryPrice) / entryPrice;
  const a = (call.action || "").toUpperCase();
  if (a === "BUY"  || a === "LONG")  return move > 0;
  if (a === "SELL" || a === "SHORT") return move < 0;
  if (a === "HOLD") return Math.abs(move) <= HOLD_WINDOWS_ELO[getBucket(daysHeld)];
  return false;
}

function getAlphaMultiplier(alpha) {
  if (alpha >  30) return 2.5;
  if (alpha >  15) return 2.0;
  if (alpha >   5) return 1.5;
  if (alpha >   0) return 1.0;
  if (alpha > -15) return 0.7;
  return 0.4;
}

function getBoldnessMultiplier(call) {
  const a = (call.action || "").toUpperCase();
  if (a === "HOLD") return 0.8;
  const moveSize = Math.abs((call.exitPrice - call.entryPrice) / call.entryPrice);
  const noise = { INTRADAY:0.005, SHORT:0.02, MEDIUM:0.05, LONG:0.10 }[getBucket(call.daysHeld)];
  return moveSize >= noise * 2 ? 1.3 : 0.5;
}

function getTimeframeMultiplier(daysHeld) {
  return { LONG:1.2, MEDIUM:1.0, SHORT:0.9, INTRADAY:0.8 }[getBucket(daysHeld)];
}

function applyCallToRating(currentRating, call) {
  const a = (call.action || "").toUpperCase();
  const rawReturn = (call.exitPrice - call.entryPrice) / call.entryPrice;
  const directed  = (a === "SELL" || a === "SHORT") ? -rawReturn : rawReturn;
  const annReturn = annualizeReturn(directed, call.daysHeld);
  const annBench  = annualizeReturn(call.benchmarkReturn || 0, call.daysHeld);
  const alpha     = Math.min(500, Math.max(-500, annReturn - annBench));

  const K = K_BASE * getAlphaMultiplier(alpha) * getBoldnessMultiplier(call) * getTimeframeMultiplier(call.daysHeld);
  const won = isCallSuccessful(call);
  const delta = K * ((won ? 1 : 0) - 0.5);
  const newRating = Math.max(ELO_FLOOR, Math.min(ELO_CEILING, currentRating + delta));
  return { newRating, delta, alpha, K, won };
}

function calculateAccuracyScore(calls) {
  if (!calls || calls.length === 0) {
    return { score: 0, rating: ELO_START, tier: "Building", buckets: {}, totalCalls: 0, hitRateRaw: 0, specialization: null };
  }

  const sorted = [...calls].sort((a, b) => new Date(a.created_date || 0) - new Date(b.created_date || 0));
  let rating = ELO_START;
  const bucketStats = { INTRADAY: [], SHORT: [], MEDIUM: [], LONG: [] };

  sorted.forEach(call => {
    const result = applyCallToRating(rating, call);
    rating = result.newRating;
    bucketStats[getBucket(call.daysHeld)].push({ won: result.won, alpha: result.alpha, delta: result.delta });
  });

  const sectorCounts = {};
  calls.forEach(c => { sectorCounts[c.sector || "default"] = (sectorCounts[c.sector || "default"] || 0) + 1; });
  const dominantSector = Object.entries(sectorCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "default";
  const sectorMult = SECTOR_MULTIPLIER[dominantSector] || 1.0;
  const adjustedRating = Math.min(ELO_CEILING, rating * (1 + (sectorMult - 1) * 0.5));
  const finalScore = eloToScore(adjustedRating);

  const tier =
    finalScore >= 90 ? "Elite"   :
    finalScore >= 75 ? "Expert"  :
    finalScore >= 60 ? "Strong"  :
    finalScore >= 45 ? "Average" : "Building";

  const totalWins = calls.filter(c => isCallSuccessful(c)).length;
  const hitRateRaw = calls.length > 0 ? totalWins / calls.length : 0;

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
      label: { INTRADAY:"Intraday", SHORT:"Short-Term", MEDIUM:"Medium-Term", LONG:"Long-Term" }[bucket],
    };
  });

  const total = calls.length;
  const dominant = Object.entries(bucketStats).sort((a, b) => b[1].length - a[1].length)[0];
  const pct = dominant[1].length / total;
  const bucketLabels = { INTRADAY:"Intraday", SHORT:"Short-Term", MEDIUM:"Medium-Term", LONG:"Long-Term" };
  const specialization =
    pct >= 0.80 ? bucketLabels[dominant[0]] + " Specialist" :
    pct >= 0.60 ? bucketLabels[dominant[0]] + " Focused"    : "Generalist";

  return { score: finalScore, rating: Math.round(adjustedRating), tier, totalCalls: calls.length, hitRateRaw, buckets, specialization };
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
      // Accept prediction_lock_price OR prediction_entry_price as the lock reference
      // (older reports published before the lock_price fix only have entry_price)
      (r.prediction_lock_price || r.prediction_entry_price) &&
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
        // Use prediction_lock_price if available (set on publish); fall back to
        // prediction_entry_price for reports published before the lock_price fix.
        const effectiveLockPrice = report.prediction_lock_price || report.prediction_entry_price;

        const lockTime = report.prediction_lock_time
          ? new Date(report.prediction_lock_time)
          : (report.prediction_locked_at ? new Date(report.prediction_locked_at) : new Date(report.created_date));
        // Prefer the persisted expiry stamped at publish. Fall back to
        // computing it from the lock time + timeframe for older reports that
        // were published before prediction_expiry_time existed.
        const expiryMs = report.prediction_expiry_time
          ? new Date(report.prediction_expiry_time).getTime()
          : lockTime.getTime() + parseTimeframeMonths(report.prediction_timeframe) * 30 * 24 * 60 * 60 * 1000;
        const isExpired = now.getTime() >= expiryMs;

        // Check resolution against live price — includes extended hours pricing (pre-market and after-hours)
        const outcome = resolveOutcome(report.prediction_action, effectiveLockPrice, report.prediction_target_price, livePrice);
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
        const yieldPct = effectiveLockPrice
          ? (((livePrice - effectiveLockPrice) / effectiveLockPrice) * 100).toFixed(2)
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
        (r.prediction_lock_price || r.prediction_entry_price) &&
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
          entryPrice:      r.prediction_lock_price || r.prediction_entry_price,
          exitPrice:       r.prediction_resolved_price,
          targetPrice:     r.prediction_target_price || null,
          daysHeld,
          benchmarkReturn,
          sector:          r.industry || "default",
        };
      });

      const result = calculateAccuracyScore(calls);

      // Compute yearly_yield: simple average return across all closed predictions
      // Long:  (resolved - lock) / lock * 100
      // Short: (lock - resolved) / lock * 100
      let yearly_yield = null;
      if (closedPreds.length > 0) {
        const yields = closedPreds.map(r => {
          const lock = r.prediction_lock_price;
          const exit = r.prediction_resolved_price;
          const action = (r.prediction_action || "").toLowerCase();
          if (action === "short") return ((lock - exit) / lock) * 100;
          return ((exit - lock) / lock) * 100;
        });
        const avg = yields.reduce((s, v) => s + v, 0) / yields.length;
        yearly_yield = parseFloat(avg.toFixed(1));
      }

      const users = await base44.asServiceRole.entities.User.filter({ email }, "-created_date", 1);
      if (users.length > 0) {
        await base44.asServiceRole.entities.User.update(users[0].id, {
          accuracy_score:     result.score,
          accuracy_rating:    result.rating,
          accuracy_tier:      result.tier,
          hit_rate:           parseFloat((result.hitRateRaw * 100).toFixed(1)),
          total_calls:        result.totalCalls,
          specialization:     result.specialization,
          accuracy_breakdown: JSON.stringify(result.buckets),
          yearly_yield,
        });
      }
    }

    return Response.json({ message: `Resolved ${resolvedCount} predictions.`, resolved: resolvedCount });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});