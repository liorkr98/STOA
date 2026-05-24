import React from "react";
import { ArrowRight, Check } from "lucide-react";

/**
 * SubscribeCTA — canonical "quiet" variant from canvas-variants.jsx (CtaA).
 * Used in analyst profile sidebar + end-of-report subscribe card.
 *
 * Per design-system MASTER.md: gold solid CTA, navy text, 6px radius,
 * format "Subscribe · $XX/mo". 90% revenue to analyst, cancel anytime.
 *
 * @param {object} analyst - { name, price, founding, ... }
 * @param {boolean} subscribed - controlled state
 * @param {function} onSubscribe - click handler (toggle)
 * @param {boolean} compact - shorter variant
 * @param {string} variant - "default" | "quiet"
 */
export default function SubscribeCTA({
  analyst,
  subscribed = false,
  onSubscribe,
  compact = false,
  showFeatures = true,
}) {
  if (!analyst) return null;
  const first = (analyst.name || "this analyst").split(" ")[0];
  const price = analyst.price || analyst.monthly_price || 9;

  return (
    <div
      className="surface"
      style={{
        padding: compact ? 18 : 22,
        background: subscribed ? "var(--bg-elev)" : "var(--bg-soft)",
      }}
    >
      {analyst.founding && (
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <span className="badge-founding">Founding · 200 spots left</span>
        </div>
      )}

      <h3 className="t-title" style={{ fontSize: 18, margin: "0 0 6px" }}>
        Subscribe to {first}
      </h3>
      <p
        className="t-body"
        style={{
          fontSize: 13,
          color: "var(--text-mute)",
          margin: "0 0 18px",
          lineHeight: 1.55,
        }}
      >
        Every report, every locked prediction, every grade as it resolves.
      </p>

      {showFeatures && !compact && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 18 }}>
          {[
            "Full-length reports (2,500–4,000 words)",
            "All locked predictions in real time",
            "Direct messages with the analyst",
            "Audit trail of every call ever made",
          ].map((t) => (
            <div key={t} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <Check
                size={14}
                strokeWidth={1.7}
                style={{ color: "var(--rolex-green)", marginTop: 2, flexShrink: 0 }}
              />
              <span style={{ fontSize: 13, color: "var(--text-body)", lineHeight: 1.5 }}>
                {t}
              </span>
            </div>
          ))}
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 4,
          marginBottom: 16,
        }}
      >
        <span
          className="t-num"
          style={{
            fontSize: 32,
            color: "var(--text)",
            letterSpacing: "-0.025em",
          }}
        >
          ${price}
        </span>
        <span className="t-meta">/ month</span>
        <div style={{ flex: 1 }} />
        <span className="t-meta" style={{ fontSize: 11 }}>
          or ${Math.round(price * 12 * 0.77)}/yr{" "}
          <span style={{ color: "var(--rolex-green)" }}>(–23%)</span>
        </span>
      </div>

      <button
        onClick={onSubscribe}
        className={subscribed ? "btn btn-ghost btn-lg" : "btn btn-gold btn-lg"}
        style={{ width: "100%" }}
      >
        {subscribed ? (
          <>
            <Check size={14} strokeWidth={1.7} /> Subscribed · manage
          </>
        ) : (
          <>
            <span>Subscribe · ${price}/mo</span>
            <ArrowRight size={15} />
          </>
        )}
      </button>

      <p
        className="t-meta"
        style={{ marginTop: 12, fontSize: 11, textAlign: "center" }}
      >
        Cancel anytime · 90% goes directly to {first}.
      </p>
    </div>
  );
}
