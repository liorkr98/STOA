import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, TrendingUp, PenLine, LayoutDashboard, Search } from "lucide-react";

const NAV = [
  { path: "/",          label: "Home",    icon: Home },
  { path: "/feed",      label: "Feed",    icon: LayoutDashboard },
  { path: "/stocks",    label: "Markets", icon: TrendingUp },
  { path: "/editor",    label: "Write",   icon: PenLine },
];

// Mobile bottom tab bar — investor surfaces (feed, profile, report, markets).
// Navy bg + gold active indicator per design system. Hidden ≥ lg, anchored to
// safe-area-inset-bottom so it survives notched devices.
export default function MobileBottomNav({ onSearchClick }) {
  const location = useLocation();

  return (
    <nav
      className="lg:hidden"
      role="navigation"
      aria-label="Primary"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        background: "var(--deepest-navy)",
        borderTop: "0.5px solid rgba(255,255,255,0.10)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        height: "calc(60px + env(safe-area-inset-bottom, 0px))",
        display: "flex",
        alignItems: "stretch",
        justifyContent: "space-around",
      }}
    >
      {NAV.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;
        const color = isActive ? "var(--gold-hex)" : "rgba(255,255,255,0.60)";
        return (
          <Link
            key={item.path}
            to={item.path}
            aria-label={item.label}
            aria-current={isActive ? "page" : undefined}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              padding: "8px 4px 6px",
              color,
              textDecoration: "none",
              position: "relative",
            }}
          >
            {isActive && (
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  top: 0,
                  left: "30%",
                  right: "30%",
                  height: 2,
                  background: "var(--gold-hex)",
                  borderRadius: "0 0 2px 2px",
                }}
              />
            )}
            <Icon size={18} strokeWidth={1.7} />
            <span
              style={{
                fontSize: 10,
                fontFamily: "var(--f-sans)",
                fontWeight: 500,
                letterSpacing: "0.04em",
              }}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
      {onSearchClick && (
        <button
          type="button"
          onClick={onSearchClick}
          aria-label="Search"
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
            padding: "8px 4px 6px",
            background: "transparent",
            border: 0,
            color: "rgba(255,255,255,0.60)",
            cursor: "pointer",
          }}
        >
          <Search size={18} strokeWidth={1.7} />
          <span
            style={{
              fontSize: 10,
              fontFamily: "var(--f-sans)",
              fontWeight: 500,
              letterSpacing: "0.04em",
            }}
          >
            Search
          </span>
        </button>
      )}
    </nav>
  );
}
