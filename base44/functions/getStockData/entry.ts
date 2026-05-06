import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { ticker } = await req.json();

    if (!ticker) {
      return Response.json({ error: "ticker is required" }, { status: 400 });
    }

    const symbol = ticker.toUpperCase().trim();
    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept": "application/json",
      "Accept-Language": "en-US,en;q=0.9",
    };

    // Use v7/finance/quote for reliable quote data + v8 chart for price history
    const [quoteRes, chartRes, newsSearchRes] = await Promise.all([
      fetch(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}&fields=regularMarketPrice,regularMarketChange,regularMarketChangePercent,regularMarketPreviousClose,regularMarketOpen,regularMarketDayHigh,regularMarketDayLow,regularMarketVolume,averageDailyVolume3Month,marketCap,trailingPE,epsTrailingTwelveMonths,fiftyTwoWeekHigh,fiftyTwoWeekLow,longName,shortName,fullExchangeName,exchangeShortName,sector,industry,bookValue,priceToBook,trailingAnnualDividendYield,beta,sharesOutstanding`, { headers }),
      fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1mo`, { headers }),
      fetch(`https://query1.finance.yahoo.com/v1/finance/search?q=${symbol}&newsCount=10&quotesCount=0`, { headers }),
    ]);

    // Parse quote
    let q = {};
    if (quoteRes.ok) {
      const qJson = await quoteRes.json();
      q = qJson?.quoteResponse?.result?.[0] || {};
    }

    // Parse chart for meta fallback
    let chartMeta = {};
    if (chartRes.ok) {
      const chartJson = await chartRes.json();
      chartMeta = chartJson?.chart?.result?.[0]?.meta || {};
    }

    const price = q.regularMarketPrice ?? chartMeta.regularMarketPrice;
    const prevClose = q.regularMarketPreviousClose ?? chartMeta.chartPreviousClose;
    const change = q.regularMarketChange ?? (price != null && prevClose != null ? price - prevClose : null);
    const changePct = q.regularMarketChangePercent ?? (change != null && prevClose ? (change / prevClose) * 100 : null);

    // Fetch news
    let news = [];
    if (newsSearchRes.ok) {
      const newsJson = await newsSearchRes.json();
      news = (newsJson?.news || []).slice(0, 10).map(n => ({
        title:     n.title,
        source:    n.publisher,
        url:       n.link,
        published: n.providerPublishTime ? new Date(n.providerPublishTime * 1000).toISOString() : null,
      }));
    }

    // Try to get quarterly financials via a separate simpler endpoint
    let incomeHistory = [];
    try {
      const finRes = await fetch(
        `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=incomeStatementHistoryQuarterly,assetProfile,defaultKeyStatistics,financialData`,
        { headers }
      );
      if (finRes.ok) {
        const finJson = await finRes.json();
        const qr = finJson?.quoteSummary?.result?.[0] || {};
        const iq = qr.incomeStatementHistoryQuarterly?.incomeStatementHistory || [];
        const ap = qr.assetProfile || {};
        const ks = qr.defaultKeyStatistics || {};
        const fd = qr.financialData || {};

        // Merge extra fields into q
        if (ap.longBusinessSummary) q._description = ap.longBusinessSummary;
        if (ap.fullTimeEmployees)   q._employees = ap.fullTimeEmployees;
        if (ap.website)             q._website = ap.website;
        if (ap.country)             q._country = ap.country;
        if (ks.enterpriseToEbitda?.raw) q._evEbitda = ks.enterpriseToEbitda.raw;
        if (ks.priceToBook?.raw)        q._pbRatio = ks.priceToBook.raw;
        if (fd.returnOnEquity?.raw)     q._roe = fd.returnOnEquity.raw;
        if (fd.returnOnAssets?.raw)     q._roa = fd.returnOnAssets.raw;
        if (fd.debtToEquity?.raw)       q._debtToEquity = fd.debtToEquity.raw;
        if (fd.currentRatio?.raw)       q._currentRatio = fd.currentRatio.raw;
        if (fd.revenuePerShare?.raw)    q._revenuePerShare = fd.revenuePerShare.raw;
        if (fd.freeCashflow?.raw)       q._freeCashflow = fd.freeCashflow.raw;

        incomeHistory = iq.slice(0, 8).map(s => ({
          period:          s.endDate?.fmt ?? null,
          revenue:         s.totalRevenue?.raw ?? null,
          netIncome:       s.netIncome?.raw ?? null,
          grossProfit:     s.grossProfit?.raw ?? null,
          operatingIncome: s.ebit?.raw ?? null,
        }));
      }
    } catch { /* financials optional */ }

    return Response.json({
      ticker: symbol,
      // Price
      price,
      regularMarketPrice: price,
      previousClose:      prevClose,
      change,
      changePercent:      changePct,
      open:               q.regularMarketOpen,
      high:               q.regularMarketDayHigh,
      low:                q.regularMarketDayLow,
      volume:             q.regularMarketVolume,
      avgVolume:          q.averageDailyVolume3Month,
      marketCap:          q.marketCap,
      week52High:         q.fiftyTwoWeekHigh,
      week52Low:          q.fiftyTwoWeekLow,
      fiftyTwoWeekHigh:   q.fiftyTwoWeekHigh,
      fiftyTwoWeekLow:    q.fiftyTwoWeekLow,
      pe:                 q.trailingPE,
      peRatio:            q.trailingPE,
      eps:                q.epsTrailingTwelveMonths,
      beta:               q.beta,
      dividendYield:      q.trailingAnnualDividendYield,
      psRatio:            q.priceToBook, // fallback
      pbRatio:            q._pbRatio ?? q.priceToBook,
      sharesOutstanding:  q.sharesOutstanding,
      // Company
      companyName:  q.longName || q.shortName || symbol,
      exchange:     q.exchangeShortName || q.fullExchangeName || chartMeta.fullExchangeName,
      exchangeName: q.fullExchangeName || chartMeta.fullExchangeName,
      sector:       q.sector,
      industry:     q.industry,
      description:  q._description,
      employees:    q._employees,
      website:      q._website,
      country:      q._country,
      // Fundamentals
      evEbitda:        q._evEbitda,
      roe:             q._roe,
      roa:             q._roa,
      debtToEquity:    q._debtToEquity,
      currentRatio:    q._currentRatio,
      revenuePerShare: q._revenuePerShare,
      freeCashFlowYield: q._freeCashflow && q.marketCap ? q._freeCashflow / q.marketCap : null,
      // History & news
      incomeHistory,
      news,
      analystRatings: [],
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});