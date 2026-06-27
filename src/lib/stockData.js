import { base44 } from "@/api/base44Client";

async function yf(url) {
  const r = await base44.functions.invoke("proxyFetch", {
    url,
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  return r.data;
}

// Yahoo Finance uses a hyphen for class shares (BRK-B), not the dot that
// users / our data sources commonly write (BRK.B). It also chokes on
// un-encoded symbols. Normalize every symbol before it goes into a URL so
// dotted tickers stop returning a hard 404 (which the UI shows as a broken
// "Failed to load" page).
export function yahooSymbol(ticker) {
  return encodeURIComponent(String(ticker || "").trim().toUpperCase().replace(/\./g, "-"));
}

// ── QUOTE ────────────────────────────────────────────────────
export async function fetchQuote(ticker) {
  const data = await yf(
    `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol(ticker)}?interval=1d&range=1d`
  );
  const meta = data?.chart?.result?.[0]?.meta || {};
  return {
    price:     meta.regularMarketPrice,
    prevClose: meta.chartPreviousClose,
    change:    meta.regularMarketPrice - meta.chartPreviousClose,
    changePct: ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) * 100,
    volume:    meta.regularMarketVolume,
    marketCap: meta.marketCap,
    yearHigh:  meta.fiftyTwoWeekHigh,
    yearLow:   meta.fiftyTwoWeekLow,
    exchange:  meta.fullExchangeName || meta.exchangeName,
    currency:  meta.currency,
    companyName: meta.longName || meta.shortName || ticker,
  };
}

// ── FUNDAMENTALS ─────────────────────────────────────────────
export async function fetchFundamentals(ticker) {
  const data = await yf(
    `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${yahooSymbol(ticker)}?modules=summaryDetail,defaultKeyStatistics,financialData,assetProfile`
  );
  const d  = data?.quoteSummary?.result?.[0] || {};
  const sd = d.summaryDetail || {};
  const ks = d.defaultKeyStatistics || {};
  const fd = d.financialData || {};
  const ap = d.assetProfile || {};
  return {
    // Yahoo's chart endpoint (used by fetchQuote) does NOT return
    // marketCap — only the quoteSummary endpoint does. We pull it through
    // fundamentals so the detail page actually has a value to show.
    marketCap:      sd?.marketCap?.raw ?? ks?.marketCap?.raw,
    pe:             sd?.trailingPE?.raw,
    forwardPE:      sd?.forwardPE?.raw,
    eps:            ks?.trailingEps?.raw,
    pb:             ks?.priceToBook?.raw,
    ps:             sd?.priceToSalesTrailing12Months?.raw,
    evEbitda:       ks?.enterpriseToEbitda?.raw,
    beta:           ks?.beta?.raw,
    dividendYield:  sd?.dividendYield?.raw,
    roe:            fd?.returnOnEquity?.raw,
    roa:            fd?.returnOnAssets?.raw,
    revenue:        fd?.totalRevenue?.raw,
    revenueGrowth:  fd?.revenueGrowth?.raw,
    grossMargin:    fd?.grossMargins?.raw,
    debtToEquity:   fd?.debtToEquity?.raw,
    currentRatio:   fd?.currentRatio?.raw,
    targetPrice:    fd?.targetMeanPrice?.raw,
    recommendation: fd?.recommendationKey,
    description:    ap?.longBusinessSummary,
    sector:         ap?.sector,
    industry:       ap?.industry,
    website:        ap?.website,
    employees:      ap?.fullTimeEmployees,
    country:        ap?.country,
    ceo:            ap?.companyOfficers?.find(o => o.title?.toLowerCase().includes("chief executive"))?.name,
  };
}

// ── NEWS ─────────────────────────────────────────────────────
// Yahoo's /search endpoint returns news that *mentions* the query in a
// loose match, so a query for "NVDA" came back with stories about Palantir,
// Snapchat, etc. that simply referenced NVIDIA in passing.
// Filter the result to entries that actually carry the ticker in their
// `relatedTickers` array (Yahoo's authoritative tag) — falling back to
// looking for the symbol in the title/summary if that field is missing.
export async function fetchNews(ticker) {
  const data = await yf(
    `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(ticker)}&quotesCount=0&newsCount=30`
  );
  const raw = data?.news || [];
  const sym = ticker.toUpperCase();
  const symRe = new RegExp(`\\b${sym}\\b`, "i");
  const filtered = raw.filter(n => {
    const related = (n.relatedTickers || []).map(t => String(t).toUpperCase());
    if (related.includes(sym)) return true;
    // Fallback: textual mention. Strict on title (must contain ticker as a
    // whole word) so we don't get generic market roundups.
    if (n.title && symRe.test(n.title)) return true;
    return false;
  });
  return (filtered.length ? filtered : raw).slice(0, 10);
}

// ── EARNINGS ─────────────────────────────────────────────────
export async function fetchEarnings(ticker) {
  const data = await yf(
    `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${yahooSymbol(ticker)}?modules=earnings,earningsHistory,earningsTrend`
  );
  const d = data?.quoteSummary?.result?.[0] || {};
  return {
    history:   d.earningsHistory?.history || [],
    trend:     d.earningsTrend?.trend || [],
    quarterly: d.earnings?.earningsChart?.quarterly || [],
  };
}

// ── ANALYST RATINGS ───────────────────────────────────────────
export async function fetchAnalystRatings(ticker) {
  const data = await yf(
    `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${yahooSymbol(ticker)}?modules=upgradeDowngradeHistory,recommendationTrend`
  );
  const d = data?.quoteSummary?.result?.[0] || {};
  return {
    upgrades: d.upgradeDowngradeHistory?.history?.slice(0, 10) || [],
    trend:    d.recommendationTrend?.trend || [],
  };
}

// ── FINANCIALS ────────────────────────────────────────────────
export async function fetchFinancials(ticker) {
  const data = await yf(
    `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${yahooSymbol(ticker)}?modules=incomeStatementHistory,balanceSheetHistory,cashflowStatementHistory`
  );
  const d = data?.quoteSummary?.result?.[0] || {};
  return {
    income:   d.incomeStatementHistory?.incomeStatementHistory || [],
    balance:  d.balanceSheetHistory?.balanceSheetStatements || [],
    cashflow: d.cashflowStatementHistory?.cashflowStatements || [],
  };
}

// ── FORMAT HELPERS ────────────────────────────────────────────
export function fmtCap(v) {
  if (v == null) return "—";
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9)  return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6)  return `$${(v / 1e6).toFixed(2)}M`;
  return `$${v.toLocaleString()}`;
}

export function fmtNum(v, dec = 2) {
  return v != null ? Number(v).toFixed(dec) : "—";
}

export function fmtPct(v) {
  return v != null ? `${(v * 100).toFixed(1)}%` : "—";
}

export function fmtVol(v) {
  if (v == null) return "—";
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return v.toLocaleString();
}

// Formats a Yahoo financial field. Yahoo wraps numbers as
// { raw, fmt, longFmt } but some fields land as bare numbers, others as
// empty objects, and others (like EBITDA on companies that don't report
// it) come back as null. Previously the "object but no .raw" case fell
// through and rendered "$[object Object]" — now we guard explicitly and
// emit "—" for any unrecognised shape.
//
// Sign-before-currency rule: "-$12.34B" (not "$-12.34B").
export function fmtFin(v) {
  if (v == null) return "—";
  const raw = typeof v === "object" ? v.raw : v;
  if (typeof raw !== "number" || !isFinite(raw)) return "—";
  const sign = raw < 0 ? "-" : "";
  const abs = Math.abs(raw);
  if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9)  return `${sign}$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6)  return `${sign}$${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3)  return `${sign}$${(abs / 1e3).toFixed(1)}K`;
  return `${sign}$${abs.toLocaleString()}`;
}

// Like fmtFin but for raw per-share numbers (EPS) — no $-scaling to billions.
// Sign before currency: "-$0.52", never "$-0.52".
export function fmtPerShare(v) {
  if (v == null) return "—";
  const raw = typeof v === "object" ? v.raw : v;
  if (typeof raw !== "number" || !isFinite(raw)) return "—";
  const sign = raw < 0 ? "-" : "";
  return `${sign}$${Math.abs(raw).toFixed(2)}`;
}