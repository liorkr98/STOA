import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search, Bell } from "lucide-react";
import StoaLogo from "@/components/StoaLogo";

/**
 * TopNavV2 — investor-side top navigation per design-system MASTER.md.
 *
 * Layout:
 *   [Logo + BETA tag]   [Discover · Researcher · Reading · Studio]   [Search ⌘K] [Bell] [Avatar]
 *
 * Style cues per spec:
 *   - Text links, not pill buttons.
 *   - Active state = navy underline (1px), no background highlight.
 *   - Manrope 400, 12px, letter-spacing 0.04em.
 *   - Sticky 60px bar with backdrop blur + hairline bottom border.
 *
 * This is an OPT-IN shell. The existing AppLayout.jsx is untouched —
 * v2 screens (next session) wrap themselves in TopNavV2 directly.
 */
export default function TopNavV2({
  links,
  user,
  showSearch = true,
  onSearchClick,
}) {
  const location = useLocation();
  const navigate = useNavigate();

  const defaultLinks = [
    { path: "/feed", label: "Discover" },
    { path: "/leaderboard", label: "Leaderboard" },
    { path: "/stocks", label: "Markets" },
    { path: "/dashboard", label: "Studio" },
  ];
  const navLinks = links || defaultLinks;

  const isActive = (path) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  return (
    <header className="topbar">
      <div className="shell topbar-inner">
        <button
          type="button"
          onClick={() => navigate("/")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "transparent",
            border: 0,
            cursor: "pointer",
            padding: 0,
          }}
          aria-label="Go to Stoa home"
        >
          <StoaLogo size={22} textSize="text-sm" />
          <span className="badge-founding" style={{ marginLeft: 2 }}>
            BETA
          </span>
        </button>

        <nav style={{ display: "flex", gap: 28, marginLeft: 24 }}>
          {navLinks.map((l) => (
            <Link
              key={l.path}
              to={l.path}
              className={`nav-link ${isActive(l.path) ? "active" : ""}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div style={{ flex: 1 }} />

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {showSearch && (
            <div className="search" style={{ width: 240 }} onClick={onSearchClick}>
              <Search size={14} aria-hidden="true" />
              <input
                placeholder="Search analysts, tickers, reports…"
                readOnly={!!onSearchClick}
              />
              <span
                className="t-meta"
                style={{
                  fontSize: 10,
                  padding: "1px 6px",
                  border: "0.5px solid var(--border-strong)",
                  borderRadius: 3,
                  marginLeft: 6,
                }}
              >
                ⌘K
              </span>
            </div>
          )}
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{ width: 36, padding: 0 }}
            aria-label="Notifications"
          >
            <Bell size={15} strokeWidth={1.5} />
          </button>
          {user && (
            <div className="av av-md" style={{ background: "var(--deepest-navy)" }}>
              {user.initials ||
                (user.full_name || user.name || "?")
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
