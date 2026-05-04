import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Search, PenLine, LayoutDashboard } from "lucide-react";

const NAV = [
  { path: "/", label: "Home", icon: Home },
  { path: "/?filters=1", label: "Search", icon: Search, exactMatch: false },
  { path: "/editor", label: "Write", icon: PenLine },
  { path: "/dashboard", label: "Profile", icon: LayoutDashboard },
];

export default function MobileBottomNav({ onSearchClick }) {
  const location = useLocation();
  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border flex items-center justify-around"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)", height: "calc(56px + env(safe-area-inset-bottom, 0px))" }}
    >
      {NAV.map(item => {
        const Icon = item.icon;
        const isSearch = item.label === "Search";
        const isActive = !isSearch && location.pathname === item.path;
        return (
          <button
            key={item.label}
            onClick={isSearch ? onSearchClick : undefined}
            className={`flex flex-col items-center gap-0.5 px-4 py-2 flex-1 transition-colors ${isActive ? "text-primary" : "text-muted-foreground"}`}
          >
            {isSearch ? (
              <Icon className="w-5 h-5" />
            ) : (
              <Link to={item.path} className="flex flex-col items-center gap-0.5">
                <Icon className={`w-5 h-5 ${isActive ? "fill-primary text-primary" : ""}`} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            )}
            {isSearch && <span className="text-[10px] font-medium">{item.label}</span>}
          </button>
        );
      })}
    </nav>
  );
}