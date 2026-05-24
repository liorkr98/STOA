import React, { useMemo, useRef, useState } from "react";

/**
 * TrackChart — interactive Elo trajectory chart for analyst profiles.
 * Hover anywhere on the SVG to inspect Elo + week-over-week % +
 * cumulative track return % + the most recent resolved call.
 *
 * Tooltip flips to the LEFT side of the crosshair once the cursor
 * passes 62% of chart width so it never falls off the right edge.
 * Tooltip is pointer-events: none so it can't interfere with hover.
 *
 * Ported from prototype/src/components.jsx (TrackChart) per handoff v2.
 *
 * @param {number[]} data - Elo series, weekly. 600–1400 expected range.
 * @param {Array}    calls - [{ dir, ticker, change }] distributed across series
 *                            for hover-annotation. Optional.
 */
export default function TrackChart({
  data,
  width = 720,
  height = 240,
  color,
  calls = [],
}) {
  const stroke = color || "var(--primary-blue)";
  const min = 600;
  const max = 1400;
  const padL = 44;
  const padR = 16;
  const padT = 14;
  const padB = 24;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const stepX = data && data.length > 1 ? innerW / (data.length - 1) : 0;
  const yFor = (v) => padT + (1 - (v - min) / (max - min)) * innerH;

  const { d, area } = useMemo(() => {
    if (!data || !data.length) return { d: "", area: "" };
    let path = "";
    data.forEach((v, i) => {
      const x = padL + i * stepX;
      const y = yFor(v);
      path += (i === 0 ? "M" : "L") + x.toFixed(1) + "," + y.toFixed(1) + " ";
    });
    return {
      d: path,
      area: path + `L${padL + innerW},${padT + innerH} L${padL},${padT + innerH} Z`,
    };
  }, [data, stepX, padL, padT, innerW, innerH]);

  const ticks = [600, 800, 1000, 1200, 1400];
  const tierBands = [
    { from: 600, to: 800, label: "Novitiate" },
    { from: 800, to: 1000, label: "Adept" },
    { from: 1000, to: 1200, label: "Disciple" },
    { from: 1200, to: 1400, label: "Stoic" },
  ];

  const seriesReturns = useMemo(() => {
    if (!data || !data.length) return [];
    return data.map((v, i) => {
      const start = data[0];
      const cumPct = ((v - start) / start) * 100;
      const prev = i === 0 ? start : data[i - 1];
      const stepPct = ((v - prev) / prev) * 100;
      return { cumPct, stepPct };
    });
  }, [data]);

  const callsByIdx = useMemo(() => {
    if (!calls || !calls.length || !data || !data.length) return {};
    const map = {};
    calls.forEach((c, ci) => {
      const idx = Math.round(
        (ci / Math.max(1, calls.length - 1)) * (data.length - 1)
      );
      if (!map[idx]) map[idx] = c;
    });
    return map;
  }, [calls, data]);

  const [hover, setHover] = useState(null);
  const svgRef = useRef(null);

  const handleMove = (e) => {
    const svg = svgRef.current;
    if (!svg || !data || !data.length) return;
    const rect = svg.getBoundingClientRect();
    const ratio = width / rect.width;
    const xInSvg = (e.clientX - rect.left) * ratio;
    const idx = Math.max(
      0,
      Math.min(data.length - 1, Math.round((xInSvg - padL) / stepX))
    );
    setHover({ idx, x: padL + idx * stepX, y: yFor(data[idx]) });
  };

  if (!data || !data.length) return null;

  const cur = hover;
  const curIdx = cur?.idx ?? data.length - 1;
  const curV = data[curIdx];
  const curR = seriesReturns[curIdx] || { cumPct: 0, stepPct: 0 };
  const curCall = callsByIdx[curIdx];

  return (
    <div style={{ position: "relative" }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        preserveAspectRatio="none"
        onMouseMove={handleMove}
        onMouseLeave={() => setHover(null)}
        style={{ display: "block", cursor: "crosshair" }}
      >
        {tierBands.map((t, i) => (
          <rect
            key={t.label}
            x={padL}
            y={yFor(t.to)}
            width={innerW}
            height={yFor(t.from) - yFor(t.to)}
            fill={i % 2 ? "rgba(30,58,138,0.025)" : "transparent"}
          />
        ))}

        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={padL}
              x2={padL + innerW}
              y1={yFor(t)}
              y2={yFor(t)}
              stroke="var(--border-rgba)"
              strokeWidth="0.5"
            />
            <text
              x={padL - 8}
              y={yFor(t) + 3}
              textAnchor="end"
              fontSize="10"
              fill="var(--text-meta)"
              fontFamily="Space Grotesk"
            >
              {t}
            </text>
          </g>
        ))}

        <path d={area} fill={stroke} fillOpacity="0.07" />
        <path d={d} fill="none" stroke={stroke} strokeWidth="1.4" strokeLinejoin="round" />

        {!cur && (
          <>
            <circle
              cx={padL + (data.length - 1) * stepX}
              cy={yFor(data[data.length - 1])}
              r="3.5"
              fill={stroke}
            />
            <circle
              cx={padL + (data.length - 1) * stepX}
              cy={yFor(data[data.length - 1])}
              r="6"
              fill={stroke}
              fillOpacity="0.18"
            />
          </>
        )}

        {cur && (
          <g>
            <line
              x1={cur.x}
              x2={cur.x}
              y1={padT}
              y2={padT + innerH}
              stroke="var(--text-meta)"
              strokeWidth="0.5"
              strokeDasharray="2 3"
            />
            <circle cx={cur.x} cy={cur.y} r="4.5" fill={stroke} />
            <circle cx={cur.x} cy={cur.y} r="9" fill={stroke} fillOpacity="0.18" />
          </g>
        )}

        <text x={padL} y={height - 6} fontSize="10" fill="var(--text-meta)" fontFamily="Manrope">
          Jan 2025
        </text>
        <text
          x={padL + innerW}
          y={height - 6}
          fontSize="10"
          fill="var(--text-meta)"
          fontFamily="Manrope"
          textAnchor="end"
        >
          Today
        </text>
      </svg>

      {cur &&
        (() => {
          const ratio = cur.x / width;
          const flip = ratio > 0.62;
          return (
            <div
              style={{
                position: "absolute",
                left: flip ? "auto" : `calc(${ratio * 100}% + 10px)`,
                right: flip ? `calc(${(1 - ratio) * 100}% + 10px)` : "auto",
                top: 14,
                pointerEvents: "none",
                background: "var(--bg-elev)",
                border: "0.5px solid var(--border-strong)",
                borderRadius: 6,
                padding: "10px 12px",
                minWidth: 180,
                zIndex: 2,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 6,
                }}
              >
                <span
                  className="t-meta"
                  style={{
                    fontSize: 10,
                    textTransform: "uppercase",
                    letterSpacing: "0.10em",
                  }}
                >
                  Week {curIdx + 1}
                </span>
                <span className="t-meta" style={{ fontSize: 10 }}>
                  {tierFor(curV)}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--f-mono)",
                    fontWeight: 500,
                    fontSize: 20,
                    color: "var(--primary-blue)",
                  }}
                >
                  {curV}
                </span>
                <span
                  style={{
                    fontFamily: "var(--f-mono)",
                    fontSize: 11,
                    color:
                      curR.stepPct >= 0
                        ? "var(--rolex-green)"
                        : "var(--velvet-red)",
                  }}
                >
                  {curR.stepPct >= 0 ? "+" : ""}
                  {curR.stepPct.toFixed(1)}% wk
                </span>
              </div>
              <div
                style={{
                  height: 1,
                  background: "var(--border-rgba)",
                  margin: "6px 0",
                }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: 6,
                }}
              >
                <span className="t-meta" style={{ fontSize: 11 }}>
                  Track return
                </span>
                <span
                  style={{
                    fontFamily: "var(--f-mono)",
                    fontSize: 12,
                    color:
                      curR.cumPct >= 0
                        ? "var(--rolex-green)"
                        : "var(--velvet-red)",
                  }}
                >
                  {curR.cumPct >= 0 ? "+" : ""}
                  {curR.cumPct.toFixed(1)}%
                </span>
              </div>
              {curCall && (
                <div
                  style={{
                    marginTop: 8,
                    paddingTop: 8,
                    borderTop: "0.5px solid var(--border-rgba)",
                  }}
                >
                  <span
                    className="t-meta"
                    style={{
                      fontSize: 10,
                      textTransform: "uppercase",
                      letterSpacing: "0.10em",
                    }}
                  >
                    Resolved nearby
                  </span>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      marginTop: 4,
                    }}
                  >
                    <span
                      className={`tag ${
                        curCall.dir === "LONG" ? "tag-long" : "tag-short"
                      }`}
                      style={{ height: 18, padding: "0 6px", fontSize: 9.5 }}
                    >
                      {curCall.dir} {curCall.ticker}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--f-mono)",
                        fontSize: 11,
                        color:
                          curCall.change >= 0
                            ? "var(--rolex-green)"
                            : "var(--velvet-red)",
                      }}
                    >
                      {curCall.change > 0 ? "+" : ""}
                      {curCall.change}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
    </div>
  );
}

function tierFor(elo) {
  if (elo >= 1200) return "Stoic";
  if (elo >= 1000) return "Disciple";
  if (elo >= 800) return "Adept";
  return "Novitiate";
}
