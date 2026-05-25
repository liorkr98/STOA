import React, { useState, useEffect } from "react";
import { Lock } from "lucide-react";
import { base44 } from "@/api/base44Client";

// Compact prediction strip rendered below a feed card's excerpt. Teases the
// locked prediction (ticker, direction, entry → target, live P&L, timeframe
// progress) without making the reader open the report. For premium-locked
// predictions the prices are masked and a Subscribe CTA replaces the live
// delta.
//
// Props
//   report      — the Report entity from the feed
//   subscribed  — true if the current viewer is subscribed to this report's
//                 analyst (controls the premium blur)
//   monthlyPrice — analyst's monthly_price (for the inline Subscribe CTA)
//   onSubscribe — handler for the Subscribe CTA click (event-bubbling safe)

export default function FeedPredictionPreview({ report, subscribed = true, monthlyPrice = 9, onSubscribe }) {
  const dir = report?.prediction_action;
  const ticker = report?.prediction_ticker;
  const entry = report?.prediction_entry_price ? Number(report.prediction_entry_price) : null;
  const target = report?.prediction_target_price ? Number(report.prediction_target_price) : null;
  const [livePrice, setLivePrice] = useState(null);

  const locked = report?.is_premium && !subscribed;

  useEffect(() => {
    if (!ticker || locked || entry == null) return;
    let cancelled = false;
    base44.functions.invoke("proxyFetch", {
      url: `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`,
      headers: { "User-Agent": "Mozilla/5.0" },
    }).then((r) => {
      if (cancelled) return;
      const p = r?.data?.chart?.result?.[0]?.meta?.regularMarketPrice;
      if (p) setLivePrice(p);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [ticker, locked, entry]);

  if (!dir || !ticker) return null;

  const isLong = dir === "Long";
  const isShort = dir === "Short";

  // Sign-flip the % change for shorts so green still encodes "good for the
  // call". A short that's down 5% is +5% for the caller.
  const liveDelta = livePrice != null && entry
    ? ((livePrice - entry) / entry) * 100 * (isShort ? -1 : 1)
    : null;
  const deltaPos = liveDelta != null && liveDelta >= 0;

  const tfRaw = report.prediction_timeframe || "";
  const tfDays =
    typeof tfRaw === "number" ? tfRaw :
    /^\d+$/.test(tfRaw) ? Number(tfRaw) :
    /(\d+)\s*d/i.test(tfRaw) ? Number(RegExp.$1) :
    /(\d+)\s*w/i.test(tfRaw) ? Number(RegExp.$1) * 7 :
    /(\d+)\s*m/i.test(tfRaw) ? Number(RegExp.$1) * 30 :
    null;
  const publishedAt = report.published_date || report.created_date;
  const elapsedDays = publishedAt
    ? Math.max(0, Math.floor((Date.now() - new Date(publishedAt).getTime()) / 86400000))
    : null;

  const outcome = (report.prediction_outcome || "").toLowerCase();
  const outcomeTag =
    outcome === "hit"     ? { cls: "tag-hit",     label: "Hit"     } :
    outcome === "near"    ? { cls: "tag-near",    label: "Near"    } :
    outcome === "partial" ? { cls: "tag-partial", label: "Partial" } :
    outcome === "miss"    ? { cls: "tag-miss",    label: "Miss"    } :
    null;
  const finalReturn = outcome && report.prediction_final_return != null
    ? Number(report.prediction_final_return)
    : null;

  const dirTagCls = isLong ? "tag-long" : isShort ? "tag-short" : "tag-hold";
  const priceMask = locked ? "$•••" : null;
  const fmt = (n) => n != null ? `$${Number(n).toFixed(2)}` : "—";

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        display: "flex", flexDirection: "column", gap: 10,
        padding: "12px 14px",
        background: "var(--bg-soft)",
        border: "0.5px solid var(--border-rgba)",
        borderRadius: 8,
        marginBottom: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        {locked && <Lock size={11} strokeWidth={1.7} style={{ color: "var(--gold-hex)" }}/>}
        <span className={`tag ${dirTagCls}`}>
          {dir.toUpperCase()} {ticker}
        </span>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span className="t-num" style={{
            fontSize: 12,
            color: locked ? "var(--text-faint)" : "var(--text)",
          }}>
            {priceMask ?? fmt(entry)}
          </span>
          <span className="t-meta" style={{ fontSize: 10 }}>→</span>
          <span className="t-num" style={{
            fontSize: 12,
            color: locked ? "var(--text-faint)" : "var(--text)",
          }}>
            {locked ? "$•••" : fmt(target)}
          </span>
        </div>

        <div style={{ flex: 1 }}/>

        {outcomeTag ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className={`tag ${outcomeTag.cls}`}>{outcomeTag.label}</span>
            {finalReturn != null && (
              <span className="t-num" style={{
                fontSize: 12,
                color: finalReturn >= 0 ? "var(--rolex-green)" : "var(--velvet-red)",
              }}>
                {finalReturn >= 0 ? "+" : ""}{finalReturn.toFixed(2)}%
              </span>
            )}
          </div>
        ) : locked ? (
          <button
            onClick={(e) => { e.stopPropagation(); onSubscribe?.(); }}
            style={{
              background: "transparent",
              border: "0.5px solid var(--gold-hex)",
              color: "var(--gold-hex)",
              fontFamily: "var(--f-sans)", fontSize: 11, fontWeight: 500,
              padding: "0 10px", height: 22, borderRadius: 4,
              cursor: "pointer", letterSpacing: "0.02em",
            }}
          >
            Subscribe · ${monthlyPrice}/mo
          </button>
        ) : liveDelta != null ? (
          <span className="t-num" style={{
            fontSize: 12,
            color: deltaPos ? "var(--rolex-green)" : "var(--velvet-red)",
          }}>
            {deltaPos ? "+" : ""}{liveDelta.toFixed(2)}%
          </span>
        ) : null}
      </div>

      {!outcomeTag && tfDays != null && elapsedDays != null && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="t-meta" style={{ fontSize: 10.5 }}>
            Day <span className="t-num">{Math.min(elapsedDays, tfDays)}</span> of <span className="t-num">{tfDays}</span>
          </span>
          <div style={{
            flex: 1, height: 2,
            background: "var(--border-rgba)", borderRadius: 1, overflow: "hidden",
          }}>
            <div style={{
              width: `${Math.min(100, Math.max(0, (elapsedDays / tfDays) * 100))}%`,
              height: "100%",
              background: elapsedDays >= tfDays ? "var(--text-meta)" : "var(--gold-hex)",
            }}/>
          </div>
        </div>
      )}
    </div>
  );
}
