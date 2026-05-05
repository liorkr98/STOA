import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { ticker, range = "3mo", interval = "1d" } = await req.json();

    if (!ticker) {
      return Response.json({ error: "ticker is required" }, { status: 400 });
    }

    const symbol = ticker.toUpperCase().trim();

    // Fetch chart data + quote summary in parallel
    const [chartRes, summaryRes] = await Promise.all([
      fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`, {
        headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" },
      }),
      fetch(`https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=summaryDetail,financialData,defaultKeyStatistics,assetProfile,price`, {
        headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" },
      }),
    ]);

    if (!chartRes.ok) {
      return Response.json({ error: `Yahoo Finance returned ${chartRes.status}` }, { status: 502 });
    }

    const chartJson = await chartRes.json();
    const result = chartJson?.chart?.result?.[0];

    if (!result) {
      return Response.json({ error: "No data found for ticker" }, { status: 404 });
    }

    const meta = result.meta;
    const timestamps = result.timestamp || [];
    const quote = result.indicators?.quote?.[0] || {};

    const candles = timestamps.map((t, i) => ({
      time: t,
      open: quote.open?.[i] ?? null,
      high: quote.high?.[i] ?? null,
      low: quote.low?.[i] ?? null,
      close: quote.close?.[i] ?? null,
      volume: quote.volume?.[i] ?? null,
    })).filter(c => c.open !== null && c.close !== null);

    // Parse quote summary
    let summaryData = {};
    let fundamentals = {};
    let news = [];

    if (summaryRes.ok) {
      const summaryJson = await summaryRes.json();
      const qr = summaryJson?.quoteSummary?.result?.[0] || {};
      const sd = qr.summaryDetail || {};
      const fd = qr.financialData || {};
      const ks = qr.defaultKeyStatistics || {};
      const ap = qr.assetProfile || {};
      const pr = qr.price || {};

      summaryData = {
        companyName: pr.longName || pr.shortName || symbol,
        sector: ap.sector || null,
        industry: ap.industry || null,
        description: ap.longBusinessSummary || null,
        marketCap: pr.marketCap?.raw ?? sd.marketCap?.raw ?? null,
        peRatio: sd.trailingPE?.raw ?? null,
        forwardPE: sd.forwardPE?.raw ?? null,
        eps: ks.trailingEps?.raw ?? null,
        weekHigh52: sd.fiftyTwoWeekHigh?.raw ?? meta.fiftyTwoWeekHigh ?? null,
        weekLow52: sd.fiftyTwoWeekLow?.raw ?? meta.fiftyTwoWeekLow ?? null,
        volume: sd.volume?.raw ?? meta.regularMarketVolume ?? null,
        avgVolume: sd.averageVolume?.raw ?? null,
        beta: ks.beta?.raw ?? null,
        dividendYield: sd.dividendYield?.raw ?? null,
      };

      fundamentals = {
        revenue: fd.totalRevenue?.raw ?? null,
        netIncome: fd.netIncomeToCommon?.raw ?? null,
        grossMargin: fd.grossMargins?.raw != null ? `${(fd.grossMargins.raw * 100).toFixed(1)}%` : null,
        operatingMargin: fd.operatingMargins?.raw != null ? `${(fd.operatingMargins.raw * 100).toFixed(1)}%` : null,
        profitMargin: fd.profitMargins?.raw != null ? `${(fd.profitMargins.raw * 100).toFixed(1)}%` : null,
        revenueGrowth: fd.revenueGrowth?.raw != null ? `${(fd.revenueGrowth.raw * 100).toFixed(1)}%` : null,
        freeCashFlow: fd.freeCashflow?.raw ?? null,
        totalDebt: fd.totalDebt?.raw ?? null,
        totalCash: fd.totalCash?.raw ?? null,
        returnOnEquity: fd.returnOnEquity?.raw != null ? `${(fd.returnOnEquity.raw * 100).toFixed(1)}%` : null,
        returnOnAssets: fd.returnOnAssets?.raw != null ? `${(fd.returnOnAssets.raw * 100).toFixed(1)}%` : null,
        debtToEquity: fd.debtToEquity?.raw ?? null,
        priceToSales: ks.priceToSalesTrailing12Months?.raw ?? null,
        pe: sd.trailingPE?.raw?.toFixed(2) ?? "N/A",
        forwardPEFmt: sd.forwardPE?.raw?.toFixed(2) ?? "N/A",
        marketCap: summaryData.marketCap,
        week52High: summaryData.weekHigh52?.toFixed(2) ?? "N/A",
        week52Low: summaryData.weekLow52?.toFixed(2) ?? "N/A",
        divYield: sd.dividendYield?.raw != null ? `${(sd.dividendYield.raw * 100).toFixed(2)}%` : "N/A",
      };
    }

    // Fetch news separately
    try {
      const newsRes = await fetch(
        `https://query1.finance.yahoo.com/v1/finance/search?q=${symbol}&newsCount=6&quotesCount=0`,
        { headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" } }
      );
      if (newsRes.ok) {
        const newsJson = await newsRes.json();
        news = (newsJson?.news || []).slice(0, 6).map(n => ({
          title: n.title,
          source: n.publisher,
          url: n.link,
          time: n.providerPublishTime
            ? new Date(n.providerPublishTime * 1000).toLocaleDateString()
            : null,
        }));
      }
    } catch { /* news is optional */ }

    return Response.json({
      symbol: meta.symbol,
      currency: meta.currency,
      exchangeName: meta.fullExchangeName,
      regularMarketPrice: meta.regularMarketPrice,
      previousClose: meta.chartPreviousClose,
      fiftyTwoWeekHigh: summaryData.weekHigh52 ?? meta.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: summaryData.weekLow52 ?? meta.fiftyTwoWeekLow,
      volume: summaryData.volume ?? meta.regularMarketVolume,
      candles,
      ...summaryData,
      fundamentals,
      news,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});