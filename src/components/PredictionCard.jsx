import React from "react";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * LockedPredictionCard — the signature visual of Stoa. A timestamped,
 * locked-in research call with entry / target / exit / return cells.
 *
 * Variants:
 *   - open      → status === "open" (no exit price, "Open" placeholder,
 *                 grade is OPEN)
 *   - resolved  → status !== "open" (exit price present, grade is one of
 *                 HIT / NEAR / PARTIAL / MISS, return % colored)
 *
 * Ported from prototype/src/components.jsx (LockedPredictionCard).
 *
 * @param {object} call  - { id, date, year, dir, ticker, days, thesis,
 *                           entry, target, exit?, change, grade, status }
 * @param {object} analyst - optional, currently unused but in spec for future
 * @param {boolean} compact - tighter padding + omit thesis text
 */
export default function LockedPredictionCard({
  call,
  analyst, // eslint-disable-line no-unused-vars
  compact = false,
  className,
}) {
  if (!call) return null;

  const dirClass =
    call.dir === "LONG"
      ? "tag-long"
      : call.dir === "SHORT"
      ? "tag-short"
      : "tag-hold";
  const gradeClass = {
    HIT: "tag-hit",
    NEAR: "tag-near",
    PARTIAL: "tag-partial",
    MISS: "tag-miss",
    OPEN: "tag-open",
  }[call.grade];

  const isOpen = call.status === "open";
  const isPos = (call.change ?? 0) >= 0;

  return (
    <div
      className={cn("surface", className)}
      style={{ padding: compact ? 18 : 22 }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <span className="receipt">
          <Lock size={12} strokeWidth={1.5} />
          LOCKED · {call.date} {call.year} · #{String(call.id).toUpperCase()}
        </span>
        {gradeClass && <span className={`tag ${gradeClass}`}>{call.grade}</span>}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <span
          className={`tag ${dirClass}`}
          style={{ height: 26, padding: "0 10px", fontSize: 11 }}
        >
          {call.dir} {call.ticker}
        </span>
        <span className="t-meta">{call.days}-day window</span>
      </div>

      {!compact && call.thesis && (
        <p
          className="t-body"
          style={{
            fontFamily: "var(--f-serif)",
            fontStyle: "italic",
            fontSize: 14,
            lineHeight: 1.55,
            color: "var(--text-body)",
            margin: "0 0 18px",
          }}
        >
          “{call.thesis}”
        </p>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 1fr",
          gap: 1,
          background: "var(--border-rgba)",
          border: "0.5px solid var(--border-rgba)",
          borderRadius: 6,
          overflow: "hidden",
        }}
      >
        {[
          { l: "Entry", v: `$${Number(call.entry).toFixed(2)}` },
          { l: "Target", v: `$${Number(call.target).toFixed(2)}` },
          {
            l: isOpen ? "Status" : "Exit",
            v: isOpen ? "Open" : `$${Number(call.exit).toFixed(2)}`,
          },
          {
            l: "Return",
            v: isOpen
              ? "—"
              : `${call.change > 0 ? "+" : ""}${call.change}%`,
            tone: isOpen ? "" : isPos ? "pos" : "neg",
          },
        ].map((c, i) => (
          <div
            key={i}
            style={{ background: "var(--bg-elev)", padding: "11px 12px" }}
          >
            <div
              className="t-meta"
              style={{
                fontSize: 10,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
              }}
            >
              {c.l}
            </div>
            <div
              className="t-num"
              style={{
                fontSize: 14,
                marginTop: 4,
                color:
                  c.tone === "pos"
                    ? "var(--rolex-green)"
                    : c.tone === "neg"
                    ? "var(--velvet-red)"
                    : "var(--text)",
              }}
            >
              {c.v}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
