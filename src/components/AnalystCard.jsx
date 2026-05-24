import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import Sparkline from "@/components/charts/Sparkline";
import { avatarUrl } from "@/lib/avatarUrl";

/**
 * useAvatarVersion — bumps whenever a profile picture is updated anywhere
 * in the app. Every Avatar consumer keys off this so a single upload
 * refreshes the picture across all visible surfaces without a reload.
 */
export function useAvatarVersion() {
  const [v, setV] = useState(0);
  useEffect(() => {
    const bump = () => setV((n) => n + 1);
    window.addEventListener("stoa-avatar-updated", bump);
    return () => window.removeEventListener("stoa-avatar-updated", bump);
  }, []);
  return v;
}

export function bustAvatarCache(url) {
  if (!url) return null;
  return url.includes("?") ? `${url}&v=${Date.now()}` : `${url}?v=${Date.now()}`;
}

/**
 * Avatar — square 8px navy block.
 * Renders an <img> when the user has a profile picture, otherwise initials.
 * NOT circular by default — the 8px geometry is part of the editorial identity.
 *
 * Pass either:
 *   <Avatar a={{ initials, avatarColor, profile_picture_url, picture }} … />
 *   <Avatar user={userEntity} … />
 *   <Avatar src="…" initials="BA" … />
 */
function Avatar({ a, user, src, initials, size = "md", ring = false, className }) {
  const version = useAvatarVersion();
  const source = a || user || {};
  const imgUrl = src ?? avatarUrl(source);
  const text =
    initials ??
    source.initials ??
    ((source.full_name || source.name || source.email || "?")
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase());
  const bg = source.avatarColor || "var(--primary-blue)";
  const sizeClass = `av av-${size}`;
  const ringShadow = ring
    ? "0 0 0 3px var(--bg), 0 0 0 4px var(--gold-hex)"
    : undefined;

  if (imgUrl) {
    return (
      <img
        key={`${imgUrl}-${version}`}
        src={imgUrl}
        alt={source.full_name || source.name || "Avatar"}
        className={cn(sizeClass, className)}
        style={{
          objectFit: "cover",
          background: bg,
          boxShadow: ringShadow,
        }}
      />
    );
  }
  return (
    <div
      className={cn(sizeClass, className)}
      style={{ background: bg, boxShadow: ringShadow }}
    >
      {text}
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
