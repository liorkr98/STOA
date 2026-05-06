import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const FMP = "https://financialmodelingprep.com/api";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { ticker } = await req.json();

    if (!ticker) {
      return Response.json({ error: "ticker is required" }, { status: 400 });
    }

    const KEY = Deno.env.get("FMP_API_KEY");
    if (!KEY) {
      return Response.json({ error: "FMP_API_KEY not set" }, { status: 500 });
    }

    const sym = ticker.toUpperCase().trim();

    // Fetch all data in parallel
    const [quoteRes, profileRes, metricsRes, incomeRes, newsRes, analystsRes] = await Promise.all([
      fetch(`${FMP}/v3/quote/${sym}?apikey=${KEY}`).then(r => r.json()),
      fetch(`${FMP}/v3/profile/${sym}?apikey=${KEY}`).then(r => r.json()),
      fetch(`${FMP}/v3/key-metrics-ttm/${sym}?apikey=${KEY}`).then(r => r.json()),
      fetch(`${FMP}/v3/income-statement/${sym}?period=quarter&limit=8&apikey=${KEY}`).then(r => r.json()),
      fetch(`${FMP}/v3/stock_news?tickers=${sym}&limit=10&apikey=${KEY}`).then(r => r.json()),
      fetch(`${FMP}/v3/analyst-stock-recommendations/${sym}?limit=5&apikey=${KEY}`).then(r => r.json()).catch(() => []),
    ]);

    const quote = Array.isArray(quoteRes) ? quoteRes[0] : null;
    const profile = Array.isArray(profileRes) ? profileRes[0] : null;
    const metrics = Array.isArray(metricsRes) ? metricsRes[0] : null;
    const income = Array.isArray(incomeRes) ? incomeRes : [];
    const news = Array.isArray(newsRes) ? newsRes : [];
    const analysts = Array.isArray(analystsRes) ? analystsRes : [];

    return Response.json({
      ticker: sym,
      // Price data
      price:             quote?.price,
      change:            quote?.change,
      changePercent:     quote?.changesPercentage,
      open:              quote?.open,
      high:              quote?.dayHigh,
      low:               quote?.dayLow,
      volume:            quote?.volume,
      avgVolume:         quote?.avgVolume,
      marketCap:         quote?.marketCap,
      pe:                quote?.pe,
      eps:               quote?.eps,
      week52High:        quote?.yearHigh,
      week52Low:         quote?.yearLow,
      sharesOutstanding: quote?.sharesOutstanding,
      // Compat fields for StockPage
      regularMarketPrice: quote?.price,
      previousClose:      quote?.previousClose,
      fiftyTwoWeekHigh:   quote?.yearHigh,
      fiftyTwoWeekLow:    quote?.yearLow,
      exchangeName:       profile?.exchangeShortName,
      // Company info
      companyName:  profile?.companyName,
      exchange:     profile?.exchangeShortName,
      sector:       profile?.sector,
      industry:     profile?.industry,
      description:  profile?.description,
      employees:    profile?.fullTimeEmployees,
      logo:         profile?.image,
      website:      profile?.website,
      country:      profile?.country,
      currency:     profile?.currency,
      ipoDate:      profile?.ipoDate,
      // Fundamentals TTM
      revenuePerShare:   metrics?.revenuePerShareTTM,
      netIncomePerShare: metrics?.netIncomePerShareTTM,
      peRatio:           metrics?.peRatioTTM,
      pbRatio:           metrics?.pbRatioTTM,
      psRatio:           metrics?.priceToSalesRatioTTM,
      evEbitda:          metrics?.enterpriseValueOverEBITDATTM,
      debtToEquity:      metrics?.debtToEquityTTM,
      roe:               metrics?.roeTTM,
      roa:               metrics?.roaTTM,
      currentRatio:      metrics?.currentRatioTTM,
      freeCashFlowYield: metrics?.freeCashFlowYieldTTM,
      dividendYield:     metrics?.dividendYieldTTM,
      // Income history (for charts)
      incomeHistory: income.slice(0, 8).map(q => ({
        period:          q.date,
        revenue:         q.revenue,
        netIncome:       q.netIncome,
        grossProfit:     q.grossProfit,
        operatingIncome: q.operatingIncome,
      })),
      // News
      news: news.map(n => ({
        title:     n.title,
        source:    n.site,
        url:       n.url,
        image:     n.image,
        summary:   n.text?.slice(0, 200),
        published: n.publishedDate,
      })),
      // Analyst recommendations
      analystRatings: analysts.slice(0, 5).map(a => ({
        firm:   a.gradingCompany,
        action: a.action,
        from:   a.previousGrade,
        to:     a.newGrade,
        date:   a.date,
      })),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});