import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { ticker, range = "3mo", interval = "1d" } = await req.json();

    if (!ticker) {
      return Response.json({ error: "ticker is required" }, { status: 400 });
    }

    const symbol = ticker.toUpperCase().trim();

    const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`;
    const chartRes = await fetch(chartUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
      },
    });

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

    return Response.json({
      symbol: meta.symbol,
      currency: meta.currency,
      exchangeName: meta.fullExchangeName,
      regularMarketPrice: meta.regularMarketPrice,
      previousClose: meta.chartPreviousClose,
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow,
      volume: meta.regularMarketVolume,
      candles,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});