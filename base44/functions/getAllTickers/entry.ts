import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const FMP = "https://financialmodelingprep.com/api";
const US_EXCHANGES = ["NYSE", "NASDAQ", "AMEX", "NYSEARCA", "BATS"];
const CACHE_HOURS = 24;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const KEY = Deno.env.get("FMP_API_KEY");

    if (!KEY) {
      return Response.json({ error: "FMP_API_KEY not set" }, { status: 500 });
    }

    // Check cache: look for a TickerCache entry updated within 24 hours
    const cacheEntries = await base44.asServiceRole.entities.TickerCache.list("-updated_date", 1);
    const cached = cacheEntries?.[0];
    if (cached?.data) {
      const ageHours = (Date.now() - new Date(cached.updated_date).getTime()) / (1000 * 60 * 60);
      if (ageHours < CACHE_HOURS) {
        const tickers = JSON.parse(cached.data);
        return Response.json({ tickers, count: tickers.length, cached: true });
      }
    }

    // Fetch full stock list from FMP
    const list = await fetch(`${FMP}/v3/stock/list?apikey=${KEY}`).then(r => r.json());

    if (!Array.isArray(list)) {
      return Response.json({ error: "Failed to fetch ticker list from FMP" }, { status: 502 });
    }

    const filtered = list
      .filter(s => US_EXCHANGES.includes(s.exchangeShortName))
      .filter(s => s.type === "stock")
      .map(s => ({
        symbol:   s.symbol,
        name:     s.name,
        exchange: s.exchangeShortName,
        price:    s.price,
        type:     s.type,
      }));

    // Save/update cache
    const cacheData = JSON.stringify(filtered);
    if (cached?.id) {
      await base44.asServiceRole.entities.TickerCache.update(cached.id, { data: cacheData });
    } else {
      await base44.asServiceRole.entities.TickerCache.create({ data: cacheData });
    }

    return Response.json({ tickers: filtered, count: filtered.length, cached: false });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});