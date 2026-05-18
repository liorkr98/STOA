import React, { useState, useEffect } from "react";
import { X, Search, Check, Sliders, TrendingUp, Tag } from "lucide-react";
import { Input } from "@/components/ui/input";

const SECTORS = [
  "AI & Semiconductors", "Big Tech", "EV & Clean Energy", "Financials",
  "Crypto & Web3", "Consumer Tech", "E-Commerce", "Healthcare",
  "Energy", "Real Estate", "Industrials", "Utilities"
];

const MARKET_CAPS = ["Mega", "Large", "Mid", "Small", "Micro"];

const POPULAR_TICKERS = [
  "AAPL", "NVDA", "MSFT", "GOOGL", "META", "AMZN", "TSLA", "AMD",
  "NFLX", "CRM", "PLTR", "SHOP", "COIN", "ARKK", "SPY", "QQQ"
];

const PREFS_KEY = "stoa_feed_prefs";

export function loadFeedPrefs() {
  try { return JSON.parse(localStorage.getItem(PREFS_KEY) || "{}"); } catch { return {}; }
}

export function saveFeedPrefs(prefs) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

export default function FeedCustomizer({ onClose, onApply }) {
  const [prefs, setPrefs] = useState(() => loadFeedPrefs());
  const [tickerInput, setTickerInput] = useState("");
  const [activeSection, setActiveSection] = useState("sectors");

  const toggleSector = (s) => {
    const cur = prefs.sectors || [];
    const updated = cur.includes(s) ? cur.filter(x => x !== s) : [...cur, s];
    setPrefs(p => ({ ...p, sectors: updated }));
  };

  const toggleCap = (c) => {
    const cur = prefs.marketCaps || [];
    const updated = cur.includes(c) ? cur.filter(x => x !== c) : [...cur, c];
    setPrefs(p => ({ ...p, marketCaps: updated }));
  };

  const addTicker = (ticker) => {
    const t = ticker.toUpperCase().trim();
    if (!t) return;
    const cur = prefs.tickers || [];
    if (!cur.includes(t)) setPrefs(p => ({ ...p, tickers: [...cur, t] }));
    setTickerInput("");
  };

  const removeTicker = (t) => {
    setPrefs(p => ({ ...p, tickers: (p.tickers || []).filter(x => x !== t) }));
  };

  const clearAll = () => setPrefs({ sectors: [], marketCaps: [], tickers: [] });

  const apply = () => {
    saveFeedPrefs(prefs);
    onApply(prefs);
    onClose();
  };

  const totalActive = (prefs.sectors?.length || 0) + (prefs.marketCaps?.length || 0) + (prefs.tickers?.length || 0);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="surface w-full max-w-md max-h-[85vh] flex flex-col" style={{ background: "hsl(var(--card))" }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border/60 flex-shrink-0">
          <div>
            <h3 className="font-serif text-[16px] text-foreground">Customize Your Feed</h3>
            <p className="text-xs text-muted-foreground">Filter by sectors, market cap, or specific stocks</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1"><X className="w-4 h-4" /></button>
        </div>

        {/* Section tabs */}
        <div className="flex border-b border-border flex-shrink-0">
          {[
            { key: "sectors", label: "Sectors", icon: Tag },
            { key: "marketcap", label: "Market Cap", icon: TrendingUp },
            { key: "tickers", label: "Stocks", icon: Sliders },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveSection(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium border-b transition-colors ${activeSection === key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {activeSection === "sectors" && (
            <div>
              <p className="text-xs text-muted-foreground mb-3">Select sectors to highlight in your feed (leave empty for all)</p>
              <div className="flex flex-wrap gap-2">
                {SECTORS.map(s => {
                  const active = (prefs.sectors || []).includes(s);
                  return (
                    <button key={s} onClick={() => toggleSector(s)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-tag text-xs font-medium border transition-colors ${active ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                      {active && <Check className="w-3 h-3" />}
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {activeSection === "marketcap" && (
            <div>
              <p className="text-xs text-muted-foreground mb-3">Choose market cap sizes you're interested in</p>
              <div className="space-y-2">
                {MARKET_CAPS.map(cap => {
                  const active = (prefs.marketCaps || []).includes(cap);
                  const desc = { Mega: ">$200B", Large: "$10B–$200B", Mid: "$2B–$10B", Small: "$300M–$2B", Micro: "<$300M" }[cap];
                  return (
                    <button key={cap} onClick={() => toggleCap(cap)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-tag border transition-colors text-left ${active ? "bg-primary/10 border-primary/40 text-primary" : "border-border hover:border-primary/40"}`}>
                      <div>
                        <span className="text-sm font-semibold">{cap} Cap</span>
                        <span className="text-xs text-muted-foreground ml-2">{desc}</span>
                      </div>
                      {active && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {activeSection === "tickers" && (
            <div>
              <p className="text-xs text-muted-foreground mb-3">Add specific stocks to always show in your feed</p>
              <div className="flex gap-2 mb-3">
                <Input
                  placeholder="e.g. NVDA"
                  value={tickerInput}
                  onChange={e => setTickerInput(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === "Enter" && addTicker(tickerInput)}
                  className="text-sm uppercase"
                />
                <button onClick={() => addTicker(tickerInput)}
                  className="px-3 py-1.5 bg-primary text-primary-foreground rounded-sm text-xs font-medium hover:bg-primary/90 whitespace-nowrap">
                  Add
                </button>
              </div>
              {/* Selected tickers */}
              {(prefs.tickers || []).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {(prefs.tickers || []).map(t => (
                    <span key={t} className="flex items-center gap-1 px-2.5 py-1 bg-primary text-primary-foreground rounded-tag text-xs font-medium font-display">
                      ${t}
                      <button onClick={() => removeTicker(t)}><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              )}
              {/* Popular suggestions */}
              <p className="text-xs font-semibold text-muted-foreground mb-2">Popular</p>
              <div className="flex flex-wrap gap-1.5">
                {POPULAR_TICKERS.filter(t => !(prefs.tickers || []).includes(t)).map(t => (
                  <button key={t} onClick={() => addTicker(t)}
                    className="px-2.5 py-1 rounded-tag text-xs font-medium border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors font-display">
                    ${t}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-5 py-4 border-t border-border/60 flex-shrink-0">
          <button onClick={clearAll} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Clear all {totalActive > 0 ? `(${totalActive})` : ""}
          </button>
          <button onClick={apply}
            className="flex-1 bg-primary text-primary-foreground rounded-sm py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors">
            Apply Filters{totalActive > 0 ? ` · ${totalActive} active` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}