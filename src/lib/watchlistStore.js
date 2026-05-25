// ── Watchlist storage — single source of truth ──────────────────────
//
// The watchlist is stored in localStorage under "stoa_watchlist" and is
// read by: StocksPage (Markets), FeedWatchlist (Discover sidebar),
// WatchlistPanel (Studio analytics), StockPage (ticker detail).
//
// Historical shapes that may still be in the wild:
//   - Plain string "NVDA"
//   - { ticker, timeframe }     (legacy WatchlistPanel)
//   - { symbol, name }          (Markets / Stock detail)
// We normalise everything to { symbol, name } on read so every consumer
// sees the same shape.
//
// Cross-tab sync happens automatically via the browser's `storage` event.
// Same-tab updates dispatch a custom `stoa-watchlist-changed` event so a
// widget on the same page can refresh after the user adds/removes from
// elsewhere in the SPA.

export const WATCHLIST_KEY = "stoa_watchlist";
const CHANGE_EVENT = "stoa-watchlist-changed";

export function loadWatchlist() {
  try {
    const raw = localStorage.getItem(WATCHLIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const seen = new Set();
    return parsed
      .map((e) => {
        if (typeof e === "string") return { symbol: e.toUpperCase(), name: e.toUpperCase() };
        const symbol = (e?.symbol || e?.ticker || "").toString().toUpperCase();
        if (!symbol) return null;
        return { symbol, name: e?.name || symbol };
      })
      .filter((e) => {
        if (!e || seen.has(e.symbol)) return false;
        seen.add(e.symbol);
        return true;
      });
  } catch {
    // Corrupted entry — wipe it so the user gets a fresh slate instead of
    // staring at a broken widget forever.
    try { localStorage.removeItem(WATCHLIST_KEY); } catch {}
    return [];
  }
}

export function saveWatchlist(entries) {
  const normalized = (entries || [])
    .map((e) => ({
      symbol: (e?.symbol || e?.ticker || "").toString().toUpperCase(),
      name: e?.name || (e?.symbol || e?.ticker || "").toString().toUpperCase(),
    }))
    .filter((e) => e.symbol);
  try {
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(normalized));
  } catch {}
  try {
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: normalized }));
  } catch {}
  return normalized;
}

export function addToWatchlist(symbol, name) {
  const list = loadWatchlist();
  const s = (symbol || "").toUpperCase();
  if (!s || list.some((e) => e.symbol === s)) return list;
  return saveWatchlist([...list, { symbol: s, name: name || s }]);
}

export function removeFromWatchlist(symbol) {
  const list = loadWatchlist();
  const s = (symbol || "").toUpperCase();
  return saveWatchlist(list.filter((e) => e.symbol !== s));
}

export function isWatched(symbol) {
  const s = (symbol || "").toUpperCase();
  return loadWatchlist().some((e) => e.symbol === s);
}

// Subscribe to watchlist changes (same-tab custom event + cross-tab storage event).
// Returns an unsubscribe fn.
export function subscribeToWatchlist(handler) {
  const onChange = () => handler(loadWatchlist());
  const onStorage = (e) => { if (e.key === WATCHLIST_KEY) handler(loadWatchlist()); };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}
