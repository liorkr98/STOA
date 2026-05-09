import React from "react";
import { Link } from "react-router-dom";
import StoaLogo from "@/components/StoaLogo";

const FOOTER_COLS = [
  { label: "Platform", links: [{ label: "Feed", path: "/feed" }, { label: "Markets", path: "/stocks" }, { label: "Leaderboard", path: "/leaderboard" }, { label: "Pricing", path: "/pricing" }, { label: "Features", path: "/features" }] },
  { label: "Analysts", links: [{ label: "Start Writing", path: "/editor" }, { label: "Dashboard", path: "/dashboard" }, { label: "Scoring", path: "/scoring" }] },
  { label: "Company", links: [{ label: "About Us", path: "/about" }, { label: "How It Works", path: "/how-it-works" }, { label: "Newsroom", path: "/newsroom" }] },
  { label: "Legal", links: [{ label: "Terms & Conditions", path: "/terms" }, { label: "Privacy Policy", path: "/privacy" }, { label: "Cookie Policy", path: "/cookies" }, { label: "Accessibility", path: "/accessibility" }] },
];

export default function AppFooter() {
  return (
    <footer style={{ background: "#f8fafc", borderTop: "1px solid #e2e8f0" }} className="mt-12">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-10">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <StoaLogo size={32} textSize="text-lg" className="mb-3" />
            <p className="text-xs leading-relaxed mb-2" style={{ color: "#64748b" }}>
              Transparent financial research with verified, locked predictions.
            </p>
            <p className="text-xs italic" style={{ color: "#94a3b8" }}>
              Not financial advice. Always DYOR.
            </p>
          </div>
          {/* Link columns */}
           {FOOTER_COLS.map((col) => (
            <div key={col.label}>
              <p className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: "#0f172a" }}>{col.label}</p>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.path}>
                    <Link
                      to={link.path}
                      className="text-xs transition-colors"
                      style={{ color: "#64748b" }}
                      onMouseEnter={e => e.currentTarget.style.color = "#0f172a"}
                      onMouseLeave={e => e.currentTarget.style.color = "#64748b"}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-2" style={{ borderTop: "1px solid #e2e8f0" }}>
          <p className="text-xs" style={{ color: "#94a3b8" }}>© 2026 STOA. All rights reserved.</p>
          <p className="text-xs" style={{ color: "#94a3b8" }}>Not financial advice. Always DYOR.</p>
        </div>
      </div>
    </footer>
  );
}