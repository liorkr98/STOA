import { base44 } from "@/api/base44Client";

async function yf(url) {
  const r = await base44.functions.invoke("proxyFetch", {
    url,
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  return r.data;
}

// ── QUOTE ────────────────────────────────────────────────────
export async function fetchQuote(ticker) {
  const data = await yf(
    `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`
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
    `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=summaryDetail,defaultKeyStatistics,financialData,assetProfile`
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
export async function fetchNews(ticker) {
  const data = await yf(
    `https://query1.finance.yahoo.com/v1/finance/search?q=${ticker}&quotesCount=0&newsCount=10`
  );
  return data?.news || [];
}

// ── EARNINGS ─────────────────────────────────────────────────
export async function fetchEarnings(ticker) {
  const data = await yf(
    `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=earnings,earningsHistory,earningsTrend`
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
    `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=upgradeDowngradeHistory,recommendationTrend`
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
    `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=incomeStatementHistory,balanceSheetHistory,cashflowStatementHistory`
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

export function fmtFin(v) {
  if (v == null) return "—";
  const n = v?.raw ?? v;
  if (n == null) return "—";
  if (Math.abs(n) >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (Math.abs(n) >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6)  return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toLocaleString()}`;
}