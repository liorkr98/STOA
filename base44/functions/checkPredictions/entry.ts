/**
 * checkPredictions — runs on a schedule (e.g. every hour).
 * For every published report with a pending prediction, fetches the live price
 * and resolves the prediction if the target is hit OR the timeframe expired.
 * Then recalculates accuracy_score for each affected analyst.
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

function calcAccuracy(reports) {
  const resolved = reports.filter(r => r.prediction_outcome && r.prediction_outcome !== "pending");
  if (resolved.length === 0) return 0;

  const creditMap = { hit: 1.0, near: 0.75, partial: 0.25, miss: 0 };
  const total = resolved.reduce((sum, r) => sum + (creditMap[r.prediction_outcome] ?? 0), 0);
  return Math.min(100, (total / resolved.length) * 100);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow scheduled (no user) or admin user
    let isAuthorized = false;
    try {
      const user = await base44.auth.me();
      if (user?.role === "admin") isAuthorized = true;
    } catch {
      // Called by scheduler — no user token, use service role
      isAuthorized = true;
    }
    if (!isAuthorized) return Response.json({ error: "Forbidden" }, { status: 403 });

    // Get all published reports with predictions that are not yet resolved (or pending)
    const allReports = await base44.asServiceRole.entities.Report.filter({ status: "published" }, "-created_date", 500);
    const pending = allReports.filter(r =>
      r.prediction_action &&
      r.prediction_ticker &&
      r.prediction_lock_price &&
      r.prediction_target_price &&
      (!r.prediction_outcome || r.prediction_outcome === "pending")
    );

    if (pending.length === 0) return Response.json({ message: "No pending predictions.", resolved: 0 });

    // Group by ticker to minimize API calls
    const tickerMap = {};
    for (const r of pending) {
      const t = r.prediction_ticker.toUpperCase();
      if (!tickerMap[t]) tickerMap[t] = [];
      tickerMap[t].push(r);
    }

    const now = new Date();
    const updatedByUser = {}; // email -> updated reports count
    let resolvedCount = 0;

    for (const [ticker, reports] of Object.entries(tickerMap)) {
      const livePrice = await getLivePrice(ticker);
      if (!livePrice) continue;

      for (const report of reports) {
        const lockTime = report.prediction_lock_time ? new Date(report.prediction_lock_time) : new Date(report.created_date);
        const months = parseTimeframeMonths(report.prediction_timeframe);
        const expiryMs = lockTime.getTime() + months * 30 * 24 * 60 * 60 * 1000;
        const isExpired = now.getTime() >= expiryMs;

        // Check if target is hit
        const outcome = resolveOutcome(report.prediction_action, report.prediction_lock_price, report.prediction_target_price, livePrice);

        const shouldResolve = outcome === "hit" || isExpired;
        if (!shouldResolve) {
          // Still pending — mark as such if not already
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

        if (!updatedByUser[report.created_by]) updatedByUser[report.created_by] = [];
        updatedByUser[report.created_by].push({ ...report, prediction_outcome: finalOutcome });
        resolvedCount++;
      }
    }

    // Recalculate accuracy for each affected analyst
    for (const [email, _] of Object.entries(updatedByUser)) {
      const userReports = await base44.asServiceRole.entities.Report.filter({ created_by: email, status: "published" }, "-created_date", 200);
      const predReports = userReports.filter(r => r.prediction_action);
      const newAccuracy = calcAccuracy(predReports);

      // Find user by email
      const users = await base44.asServiceRole.entities.User.filter({ email }, "-created_date", 1);
      if (users.length > 0) {
        await base44.asServiceRole.entities.User.update(users[0].id, { accuracy_score: parseFloat(newAccuracy.toFixed(1)) });
      }
    }

    return Response.json({ message: `Resolved ${resolvedCount} predictions.`, resolved: resolvedCount });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});