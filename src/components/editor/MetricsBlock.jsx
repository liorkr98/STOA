import React, { useState } from "react";
import { Loader2, Search } from "lucide-react";
import { fetchQuote, fetchFundamentals, fmtCap } from "@/lib/stockData";

function parseMetrics(content) {
  if (!content) return [];
  return content
    .split("\n")
    .filter(Boolean)
    .map(line => {
      const parts = line.split("|");
      return {
        label:  parts[0]?.trim() || "",
        value:  parts[1]?.trim() || "",
        change: parts[2]?.trim() || "",
      };
    })
    .filter(r => r.label && r.value);
}

function buildContent(quote, fund) {
  const rows = [];
  if (fund.pe != null)           rows.push(`P/E Ratio | ${fund.pe.toFixed(1)}x | `);
  if (fund.eps != null)          rows.push(`EPS | $${fund.eps.toFixed(2)} | `);
  if (fund.revenue != null)      rows.push(`Revenue | ${fmtCap(fund.revenue)} | ${fund.revenueGrowth != null ? (fund.revenueGrowth >= 0 ? "+" : "") + (fund.revenueGrowth * 100).toFixed(1) + "%" : ""}`);
  if (quote.marketCap != null)   rows.push(`Market Cap | ${fmtCap(quote.marketCap)} | `);
  if (fund.grossMargin != null)  rows.push(`Gross Margin | ${(fund.grossMargin * 100).toFixed(1)}% | `);
  if (fund.beta != null)         rows.push(`Beta | ${fund.beta.toFixed(2)} | `);
  if (fund.roe != null)          rows.push(`ROE | ${(fund.roe * 100).toFixed(1)}% | `);
  if (fund.dividendYield != null && fund.dividendYield > 0)
    rows.push(`Div Yield | ${(fund.dividendYield * 100).toFixed(2)}% | `);
  // trim trailing " | " from lines with no change
  return rows.map(r => r.replace(/\s\|\s$/, "")).join("\n");
}

const DEFAULT_PLACEHOLDER = "P/E Ratio | 24.5x | +2.1%\nRevenue | $85.2B | +12.3%\nEPS | $3.40 | +8.7%\nGross Margin | 42.1% | -0.3%";

export default function MetricsBlock({ block, onChange, onDelete }) {
  const [editing, setEditing]   = useState(!block.content);
  const [ticker, setTicker]     = useState("");
  const [fetching, setFetching] = useState(false);
  const [fetchErr, setFetchErr] = useState(null);
  const rows = parseMetrics(block.content);
  const cols = Math.min(rows.length, 4);

  const handleFetch = async () => {
    const sym = ticker.trim().toUpperCase();
    if (!sym) return;
    setFetching(true);
    setFetchErr(null);
    try {
      const [quote, fund] = await Promise.all([fetchQuote(sym), fetchFundamentals(sym)]);
      const content = buildContent(quote, fund);
      if (!content) { setFetchErr("No financial data found for this ticker."); return; }
      onChange({ ...block, content });
    } catch {
      setFetchErr("Could not fetch data. Check the ticker symbol.");
    } finally {
      setFetching(false);
    }
  };

  return (
    <div className="group relative rounded-xl border border-border overflow-hidden my-2">
      {/* Header */}
      <div className="flex items-center justify-between bg-secondary px-4 py-2 border-b border-border">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Key Financial Metrics
        </span>
        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setEditing(e => !e)}
            className="text-[10px] text-muted-foreground hover:text-foreground px-2 py-0.5 rounded border border-border bg-card transition-colors"
          >
            {editing ? "Done" : "Edit"}
          </button>
          <button
            onClick={onDelete}
            className="text-[10px] text-muted-foreground hover:text-loss px-2 py-0.5 rounded border border-border bg-card transition-colors"
          >
            Remove
          </button>
        </div>
      </div>

      {/* Metrics grid */}
      {rows.length > 0 ? (
        <div
          className="grid divide-border"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        >
          {rows.map((row, i) => {
            const isPos = row.change.startsWith("+");
            const isNeg = row.change.startsWith("-");
            return (
              <div
                key={i}
                className="px-4 py-3 border-r border-b border-border last:border-r-0"
              >
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
                  {row.label}
                </p>
                <p className="text-base font-bold text-foreground leading-tight">
                  {row.value}
                </p>
                {row.change && (
                  <p className={`text-xs font-semibold mt-0.5 ${isPos ? "text-gain" : isNeg ? "text-loss" : "text-muted-foreground"}`}>
                    {row.change}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="px-4 py-6 text-center text-sm text-muted-foreground">
          Click <strong>Edit</strong> and enter a ticker to auto-fill metrics, or type manually.
        </div>
      )}

      {/* Edit panel */}
      {editing && (
        <div className="border-t border-border bg-secondary/50 p-3 space-y-3">
          {/* Live fetch */}
          <div>
            <p className="text-[10px] text-muted-foreground mb-1.5 font-semibold">Auto-fill from ticker</p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                <input
                  type="text"
                  value={ticker}
                  onChange={e => setTicker(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleFetch()}
                  placeholder="AAPL, MSFT, TSLA..."
                  className="w-full border border-border rounded-lg pl-6 pr-3 py-1.5 text-xs bg-card focus:outline-none focus:ring-1 focus:ring-primary uppercase"
                />
              </div>
              <button
                onClick={handleFetch}
                disabled={fetching || !ticker.trim()}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary text-white disabled:opacity-50 flex items-center gap-1.5"
              >
                {fetching ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                {fetching ? "Fetching…" : "Fetch"}
              </button>
            </div>
            {fetchErr && <p className="text-[10px] text-loss mt-1">{fetchErr}</p>}
          </div>

          {/* Manual edit */}
          <div>
            <p className="text-[10px] text-muted-foreground mb-1.5">
              Or edit manually:{" "}
              <code className="bg-card px-1 rounded font-mono">Label | Value | Change</code>
              {" "}— one metric per line
            </p>
            <textarea
              className="w-full text-xs border border-border rounded-lg px-3 py-2 bg-card focus:outline-none focus:ring-1 focus:ring-primary resize-none font-mono"
              rows={Math.max(4, rows.length + 1)}
              value={block.content || ""}
              onChange={e => onChange({ ...block, content: e.target.value })}
              placeholder={DEFAULT_PLACEHOLDER}
            />
          </div>
        </div>
      )}
    </div>
  );
}
