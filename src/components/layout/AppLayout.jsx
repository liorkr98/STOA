import React from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { BarChart3, Home, PenLine, LogIn } from "lucide-react";
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
];

export default function AppLayout() {
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top nav */}
      <header className="sticky top-0 z-40 bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link to="/" className="flex-shrink-0">
            <StoaLogo size={22} textSize="text-lg" />
          </Link>

          <nav className="hidden md:flex items-center gap-1 ml-4">
            {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                  location.pathname === path
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex-1 max-w-sm mx-auto hidden md:block">
            <SearchBar />
          </div>

          <div className="ml-auto flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <NotificationCenter />
                <Link to="/dashboard">
                  <img
                    src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face"
                    alt="Profile"
                    className="w-8 h-8 rounded-full border-2 border-border hover:border-primary/40 transition-colors"
                  />
                </Link>
              </>
            ) : (
              <Link to="/signin">
                <Button size="sm" className="gap-1.5">
                  <LogIn className="w-4 h-4" />
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Mobile nav */}
        <div className="md:hidden border-t border-border">
          <div className="flex items-center justify-around px-2 py-1">
            {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  location.pathname === path
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                <Icon className="w-5 h-5" />
                {label}
              </Link>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <AppFooter />
    </div>
  );
}