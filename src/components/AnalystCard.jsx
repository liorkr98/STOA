import React from "react";
import { cn } from "@/lib/utils";
import Sparkline from "@/components/charts/Sparkline";

/**
 * Avatar — square 8px navy block with initials. NOT circular.
 * Sizes match base.css: sm 28 / md 38 / lg 52 / xl 84.
 */
function Avatar({ a, size = "md", ring = false, className }) {
  const sizeClass = `av av-${size}`;
  return (
    <div
      className={cn(sizeClass, className)}
      style={{
        background: a.avatarColor || "var(--primary-blue)",
        boxShadow: ring
          ? "0 0 0 3px var(--bg), 0 0 0 4px var(--gold-hex)"
          : undefined,
      }}
    >
      {a.initials}
    </div>
  );
}

/**
 * AnalystCard — stat-led variant (canonical per canvas-variants.jsx).
 * Header row: avatar + name + founding badge + rank tag.
 * Stat strip: Elo (primary-blue), Accuracy (rolex-green sentiment-allowed),
 *             Subs.
 * Sparkline rail (hairline-bordered top/bottom).
 * Footer: sector tags + gold Subscribe CTA.
 *
 * Ported from prototype/src/components.jsx (AnalystCard) per handoff v2.
 *
 * @param {object} a - { id, name, title, location, rank, founding,
 *                       avatarColor, initials, elo, tier, accuracy,
 *                       resolved, subscribers, price, track[], sparkType,
 *                       sectors[] }
 * @param {function} onOpen - (id) => void; click handler for whole card +
 *                            Subscribe button.
 */
export default function AnalystCard({ a, onOpen, className }) {
  if (!a) return null;

  return (
    <div
      className={cn("surface surface-interactive", className)}
      style={{ padding: 22, cursor: "pointer" }}
      onClick={() => onOpen?.(a.id)}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          marginBottom: 18,
        }}
      >
        <Avatar a={a} size="lg" ring={a.tier === "Stoic"} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h3 className="t-title" style={{ fontSize: 17, margin: 0 }}>
              {a.name}
            </h3>
            {a.founding && <span className="badge-founding">Founding</span>}
          </div>
          <div className="t-meta" style={{ marginTop: 2 }}>
            {a.title}
            {a.location ? ` · ${a.location}` : ""}
          </div>
        </div>
        {a.rank != null && (
          <span className="tag" style={{ flexShrink: 0 }}>
            #{a.rank}
          </span>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 1fr 1fr",
          gap: 10,
          marginBottom: 16,
        }}
      >
        <div className="stat">
          <span className="stat-label">Elo</span>
          <span
            className="stat-value"
            style={{ color: "var(--primary-blue)" }}
          >
            {a.elo}
          </span>
          <span className="stat-sub">{a.tier} tier</span>
        </div>
        <div className="stat">
          <span className="stat-label">Accuracy</span>
          <span
            className="stat-value"
            style={{ color: "var(--rolex-green)" }}
          >
            {a.accuracy}%
          </span>
          <span className="stat-sub">{a.resolved} resolved</span>
        </div>
        <div className="stat">
          <span className="stat-label">Subs</span>
          <span className="stat-value">
            {a.subscribers >= 1000
              ? (a.subscribers / 1000).toFixed(1) + "k"
              : a.subscribers}
          </span>
          <span className="stat-sub">${a.price}/mo</span>
        </div>
      </div>

      {a.track && a.track.length > 0 && (
        <div
          style={{
            height: 38,
            marginBottom: 14,
            borderTop: "0.5px solid var(--border-rgba)",
            borderBottom: "0.5px solid var(--border-rgba)",
            padding: "2px 0",
          }}
        >
          <Sparkline
            data={a.track}
            height={34}
            kind={a.sparkType === "down" ? "neg" : "pos"}
          />
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", gap: 6 }}>
          {(a.sectors || []).slice(0, 2).map((s) => (
            <span key={s} className="tag">
              {s}
            </span>
          ))}
        </div>
        <button
          className="btn btn-gold btn-sm"
          onClick={(e) => {
            e.stopPropagation();
            onOpen?.(a.id);
          }}
        >
          Subscribe · ${a.price}/mo
        </button>
      </div>
    </div>
  );
}

export { Avatar };
