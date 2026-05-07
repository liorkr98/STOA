import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Returns price + % change for a given ticker and timeframe (1D, 1W, 1M, 1Y)
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { ticker, timeframe } = await req.json();

    if (!ticker) return Response.json({ error: "ticker is required" }, { status: 400 });

    const symbol = ticker.toUpperCase().trim();
    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept": "application/json",
    };

    const tfMap = {
      "1D": { range: "1d",  interval: "5m"  },
      "1W": { range: "5d",  interval: "1d"  },
      "1M": { range: "1mo", interval: "1d"  },
      "1Y": { range: "1y",  interval: "1wk" },
    };

    const { range, interval } = tfMap[timeframe] || tfMap["1D"];

    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`,
      { headers }
    );

    if (!res.ok) return Response.json({ error: "Failed to fetch data" }, { status: 500 });

    const json = await res.json();
    const result = json?.chart?.result?.[0];
    const meta = result?.meta;
    if (!meta) return Response.json({ error: "No data" }, { status: 404 });

    const closes = (result?.indicators?.quote?.[0]?.close || []).filter(v => v != null);
    const currentPrice = meta.regularMarketPrice ?? closes[closes.length - 1];

    // For 1D use previous session close; for others use first candle in range
    let basePrice;
    if (timeframe === "1D" || !timeframe) {
      basePrice = meta.chartPreviousClose ?? meta.previousClose ?? closes[0];
    } else {
      basePrice = closes[0];
    }

    const changePercent = (basePrice && currentPrice)
      ? ((currentPrice - basePrice) / basePrice) * 100
      : null;

    return Response.json({
      ticker: symbol,
      price: currentPrice,
      changePercent,
      companyName: meta.longName || meta.shortName || symbol,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});