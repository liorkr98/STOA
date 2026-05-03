import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { ticker } = await req.json();
    if (!ticker) return Response.json({ error: "ticker required" }, { status: 400 });

    const symbol = ticker.toUpperCase().trim();
    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept": "application/json",
    };

    // Fetch summary detail + financial data in parallel
    const [summaryRes, newsRes] = await Promise.all([
      fetch(`https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=summaryDetail,defaultKeyStatistics,financialData,incomeStatementHistory,earningsTrend`, { headers }),
      fetch(`https://query1.finance.yahoo.com/v1/finance/search?q=${symbol}&newsCount=8&quotesCount=0`, { headers }),
    ]);

    const [summaryJson, newsJson] = await Promise.all([summaryRes.json(), newsRes.json()]);

    const result = summaryJson?.quoteSummary?.result?.[0];
    const summary = result?.summaryDetail || {};
    const keyStats = result?.defaultKeyStatistics || {};
    const financialData = result?.financialData || {};
    const incomeHistory = result?.incomeStatementHistory?.incomeStatementHistory || [];
    const earningsTrend = result?.earningsTrend?.trend || [];

    // Extract financials
    const get = (obj, key) => obj?.[key]?.raw ?? obj?.[key] ?? null;
    const fmt = (n) => {
      if (n == null) return "N/A";
      if (Math.abs(n) >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
      if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
      if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
      return `$${n.toLocaleString()}`;
    };
    const fmtPct = (n) => n != null ? `${(n * 100).toFixed(2)}%` : "N/A";

    const financials = {
      marketCap: fmt(get(summary, "marketCap")),
      pe: get(summary, "trailingPE")?.toFixed(2) ?? "N/A",
      forwardPE: get(summary, "forwardPE")?.toFixed(2) ?? "N/A",
      eps: get(keyStats, "trailingEps") != null ? `$${get(keyStats, "trailingEps")?.toFixed(2)}` : "N/A",
      divYield: get(summary, "dividendYield") != null ? fmtPct(get(summary, "dividendYield")) : "N/A",
      beta: get(summary, "beta")?.toFixed(2) ?? "N/A",
      week52High: get(summary, "fiftyTwoWeekHigh") != null ? `$${get(summary, "fiftyTwoWeekHigh")?.toFixed(2)}` : "N/A",
      week52Low: get(summary, "fiftyTwoWeekLow") != null ? `$${get(summary, "fiftyTwoWeekLow")?.toFixed(2)}` : "N/A",
      revenue: fmt(get(financialData, "totalRevenue")),
      revenueGrowth: fmtPct(get(financialData, "revenueGrowth")),
      grossMargin: fmtPct(get(financialData, "grossMargins")),
      operatingMargin: fmtPct(get(financialData, "operatingMargins")),
      profitMargin: fmtPct(get(financialData, "profitMargins")),
      netIncome: fmt(get(financialData, "netIncomeToCommon")),
      freeCashFlow: fmt(get(financialData, "freeCashflow")),
      totalDebt: fmt(get(financialData, "totalDebt")),
      totalCash: fmt(get(financialData, "totalCash")),
      returnOnEquity: fmtPct(get(financialData, "returnOnEquity")),
      returnOnAssets: fmtPct(get(financialData, "returnOnAssets")),
    };

    // Quarterly revenue from income history
    const quarterly = incomeHistory.slice(0, 4).reverse().map(q => ({
      period: q.endDate?.fmt ?? "",
      revenue: get(q, "totalRevenue"),
      netIncome: get(q, "netIncome"),
    }));

    // EPS estimates from earnings trend
    const epsEstimates = earningsTrend.slice(0, 4).map(t => ({
      period: t.period ?? "",
      epsEstimate: get(t, "epsEstimate"),
      revenueEstimate: get(t?.revenueEstimate, "avg"),
    }));

    // News
    const newsItems = (newsJson?.news || []).slice(0, 8).map(n => ({
      title: n.title,
      source: n.publisher,
      time: n.providerPublishTime ? new Date(n.providerPublishTime * 1000).toLocaleDateString() : "",
      url: n.link,
    }));

    return Response.json({ financials, quarterly, epsEstimates, news: newsItems });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});