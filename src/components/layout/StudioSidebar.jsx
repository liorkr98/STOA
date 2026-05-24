import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Home,
  PenLine,
  BarChart3,
  FileText,
  Users,
  TrendingUp,
  Wallet as WalletIcon,
  Settings as SettingsIcon,
} from "lucide-react";

/**
 * StudioSidebar — analyst-side vertical navigation per design handoff v2.
 *
 * Layout:
 *   [STUDIO eyebrow]
 *   [Overview · Compose · Predictions · Publications · Audience ·
 *    Analytics · Earnings · Settings]    each with optional count
 *   [Mini analyst card at the bottom — Elo + weekly delta]
 *
 * Style cues per spec:
 *   - 240px column, hairline right border.
 *   - Vertical nav items, no pill backgrounds.
 *   - Manrope 13px, active = navy text + 1px left rule + bg-soft tint.
 *
 * Opt-in shell. Existing analyst routes keep their current layouts; this
 * is the canonical surface for the rebuilt Studio screens next session.
 *
 * @param {object[]} items - optional override [{path, label, icon, count}]
 * @param {object}   analyst - { name, title, initials, avatarColor, elo,
 *                                weekDelta, tier } for the mini card.
 */
export default function StudioSidebar({ items, analyst }) {
  const location = useLocation();

  const defaultItems = [
    { path: "/dashboard", label: "Overview", icon: Home },
    { path: "/editor", label: "Compose", icon: PenLine },
    { path: "/predictions", label: "Predictions", icon: TrendingUp },
    { path: "/dashboard/publications", label: "Publications", icon: FileText },
    { path: "/subscribers", label: "Audience", icon: Users },
    { path: "/analytics", label: "Analytics", icon: BarChart3 },
    { path: "/wallet", label: "Earnings", icon: WalletIcon },
    { path: "/edit-profile", label: "Settings", icon: SettingsIcon },
  ];
  const navItems = items || defaultItems;

  const isActive = (path) =>
    path === "/dashboard"
      ? location.pathname === "/dashboard"
      : location.pathname.startsWith(path);

  return (
    <aside
      style={{
        width: 240,
        flexShrink: 0,
        borderRight: "0.5px solid var(--border-rgba)",
        background: "var(--bg)",
        display: "flex",
        flexDirection: "column",
        padding: "32px 0 24px",
        minHeight: "100vh",
        position: "sticky",
        top: 0,
        alignSelf: "flex-start",
      }}
    >
      <div style={{ padding: "0 24px 24px" }}>
        <div className="t-eyebrow">Studio</div>
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
        {navItems.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 24px",
                fontFamily: "var(--f-sans)",
                fontSize: 13,
                fontWeight: 400,
                color: active ? "var(--text)" : "var(--text-mute)",
                background: active ? "var(--bg-soft)" : "transparent",
                borderLeft: active
                  ? "1px solid var(--text)"
                  : "1px solid transparent",
                textDecoration: "none",
                transition:
                  "background var(--t-fast) var(--ease), color var(--t-fast) var(--ease), border-color var(--t-fast) var(--ease)",
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.color = "var(--text)";
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.color = "var(--text-mute)";
              }}
            >
              {Icon && <Icon size={14} strokeWidth={1.5} aria-hidden="true" />}
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.count != null && (
                <span
                  className="t-num"
                  style={{ fontSize: 11, color: "var(--text-meta)" }}
                >
                  {item.count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {analyst && (
        <div style={{ padding: "0 16px" }}>
          <div className="surface" style={{ padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                className="av av-md"
                style={{ background: analyst.avatarColor || "var(--primary-blue)" }}
              >
                {analyst.initials}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  className="t-title"
                  style={{
                    fontSize: 13,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {analyst.name}
                </div>
                <div className="t-meta" style={{ fontSize: 11 }}>
                  {analyst.title || analyst.tier}
                </div>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                marginTop: 12,
                paddingTop: 10,
                borderTop: "0.5px solid var(--border-rgba)",
              }}
            >
              <div>
                <div className="t-meta" style={{ fontSize: 10 }}>
                  Elo
                </div>
                <div
                  className="t-num"
                  style={{
                    fontSize: 16,
                    color: "var(--primary-blue)",
                    marginTop: 2,
                  }}
                >
                  {analyst.elo}
                </div>
              </div>
              {analyst.weekDelta != null && (
                <span
                  className="t-num"
                  style={{
                    fontSize: 11,
                    color:
                      analyst.weekDelta >= 0
                        ? "var(--rolex-green)"
                        : "var(--velvet-red)",
                  }}
                >
                  {analyst.weekDelta >= 0 ? "+" : ""}
                  {analyst.weekDelta} wk
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
