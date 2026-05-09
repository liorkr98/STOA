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
    <footer className="border-t border-border bg-card mt-12">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-2 md:col-span-1">
            <StoaLogo size={22} textSize="text-base" className="mb-3" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Transparent financial research with verified, locked predictions.
            </p>
          </div>
          {FOOTER_COLS.map((col) => (
            <div key={col.label}>
              <p className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wider">{col.label}</p>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.path}>
                    <Link to={link.path} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">© 2026 STOA. All rights reserved.</p>
          <p className="text-xs text-muted-foreground">Not financial advice. Always DYOR.</p>
        </div>
      </div>
    </footer>
  );
}