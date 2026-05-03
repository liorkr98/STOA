import React from "react";
import { Link } from "react-router-dom";
import StoaLogo from "@/components/StoaLogo";

const FOOTER_COLS = [
  { label: "Platform", links: [
    { label: "About Us", path: "/about" },
    { label: "Features", path: "/features" },
    { label: "Pricing", path: "/pricing" },
    { label: "Newsroom", path: "/newsroom" },
    { label: "How It Works", path: "/how-it-works" },
    { label: "Scoring & Calculations", path: "/calculations" },
  ]},
  { label: "Legal", links: [
    { label: "Terms & Conditions", path: "/terms" },
    { label: "Privacy Policy", path: "/privacy" },
    { label: "Cookie Policy", path: "/cookies" },
    { label: "Accessibility", path: "/accessibility" },
  ]},
];

export default function AppFooter() {
  return (
    <footer className="bg-card border-t border-border mt-12">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
          <div>
            <StoaLogo size={22} textSize="text-lg" className="mb-3" />
            <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
              Transparent finance. Verified predictions. Follow top analysts, track their live predictions, and make smarter investment decisions backed by real data.
            </p>
          </div>
          {FOOTER_COLS.map(col => (
            <div key={col.label}>
              <h4 className="text-sm font-semibold text-foreground mb-3">{col.label}</h4>
              <ul className="space-y-2">
                {col.links.map(link => (
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
        <div className="mt-8 pt-6 border-t border-border text-xs text-muted-foreground text-center">
          © 2026 STOA. For informational purposes only. Not financial advice.
        </div>
      </div>
    </footer>
  );
}