import React from "react";
import { Link } from "react-router-dom";
import StoaLogo from "@/components/StoaLogo";
import { TrendingUp, PenLine, BarChart3, Shield } from "lucide-react";

const FOOTER_COLS = [
  {
    label: "For Creators",
    links: [
      { label: "Become an Analyst", path: "/become-analyst" },
      { label: "Start Writing", path: "/editor" },
      { label: "My Public Profile", path: "/analyst" },
      { label: "Creator Dashboard", path: "/dashboard" },
      { label: "Wallet & AI Credits", path: "/wallet" },
    ],
  },
  {
    label: "Platform",
    links: [
      { label: "Research Feed", path: "/" },
      { label: "Markets", path: "/stocks" },
      { label: "Leaderboard", path: "/leaderboard" },
      { label: "Pricing", path: "/pricing" },
      { label: "How It Works", path: "/how-it-works" },
    ],
  },
  {
    label: "Company",
    links: [
      { label: "About STOA", path: "/about" },
      { label: "Track Record Scoring", path: "/scoring" },
      { label: "Newsroom", path: "/newsroom" },
    ],
  },
  {
    label: "Legal",
    links: [
      { label: "Terms & Conditions", path: "/terms" },
      { label: "Privacy Policy", path: "/privacy" },
      { label: "Cookie Policy", path: "/cookies" },
    ],
  },
];

const CREATOR_STATS = [
  { icon: TrendingUp, label: "Verified Track Records" },
  { icon: PenLine, label: "Professional Editor" },
  { icon: BarChart3, label: "AI Research Assistant" },
  { icon: Shield, label: "Keep 85% Revenue" },
];

export default function AppFooter() {
  return (
    <footer className="mt-12 border-t border-border bg-slate-950 text-slate-300">
      {/* Creator value strip */}
      <div className="border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {CREATOR_STATS.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <span className="text-xs font-medium text-slate-300">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-10">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <StoaLogo size={28} textSize="text-base" className="mb-3" />
            <p className="text-xs leading-relaxed mb-3 text-slate-400">
              The platform for independent financial analysts. Publish research, lock predictions, build a verified track record.
            </p>
            <Link
              to="/editor"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              <PenLine className="w-3.5 h-3.5" />
              Start publishing free
            </Link>
          </div>

          {FOOTER_COLS.map((col) => (
            <div key={col.label}>
              <p className="text-xs font-semibold mb-3 uppercase tracking-wider text-slate-200">{col.label}</p>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.path}>
                    <Link
                      to={link.path}
                      className="text-xs text-slate-400 hover:text-slate-100 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-slate-800">
          <p className="text-xs text-slate-500">© 2026 STOA. All rights reserved.</p>
          <p className="text-xs text-slate-500 italic">Not financial advice. Always do your own research.</p>
        </div>
      </div>
    </footer>
  );
}
