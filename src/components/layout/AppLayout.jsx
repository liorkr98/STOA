import React from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { BarChart3, Home, PenLine, LogIn, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import AppFooter from "./AppFooter";
import SearchBar from "./SearchBar";
import NotificationCenter from "./NotificationCenter";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import StoaLogo from "@/components/StoaLogo";

const NAV_ITEMS = [
  { path: "/", label: "Feed", icon: Home },
  { path: "/editor", label: "Write", icon: PenLine },
  { path: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { path: "/wallet", label: "Wallet", icon: Wallet, authOnly: true },
];

export default function AppLayout() {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link to="/" className="flex-shrink-0">
            <StoaLogo size={24} textSize="text-lg" />
          </Link>

          <div className="flex-1 max-w-sm hidden sm:block">
            <SearchBar />
          </div>

          <nav className="flex items-center gap-1 ml-auto">
            {NAV_ITEMS.filter(item => !item.authOnly || isAuthenticated).map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden md:inline">{item.label}</span>
                </Link>
              );
            })}
            {isAuthenticated ? (
              <NotificationCenter />
            ) : (
              <Link to="/signin">
                <Button size="sm" className="ml-1 gap-1.5">
                  <LogIn className="w-3.5 h-3.5" />
                  Sign In
                </Button>
              </Link>
            )}
          </nav>
        </div>
        {/* Mobile search */}
        <div className="sm:hidden px-4 pb-2">
          <SearchBar />
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1">
        <Outlet />
      </main>

      <AppFooter />
    </div>
  );
}