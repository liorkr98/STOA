import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, LayoutDashboard, TrendingUp, PenLine, User } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { cn } from "@/lib/utils";

export default function MobileBottomNav() {
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const isAnalyst = user?.role === "analyst" || user?.role === "admin";

  const items = isAuthenticated && isAnalyst
    ? [
        { path: "/",       icon: Home,          label: "Home" },
        { path: "/feed",   icon: LayoutDashboard, label: "Feed" },
        { path: "/editor", icon: PenLine,        label: "Write" },
        { path: "/stocks", icon: TrendingUp,     label: "Markets" },
        { path: "/analyst",icon: User,           label: "Profile" },
      ]
    : [
        { path: "/",       icon: Home,          label: "Home" },
        { path: "/feed",   icon: LayoutDashboard, label: "Feed" },
        { path: "/stocks", icon: TrendingUp,     label: "Markets" },
        { path: isAuthenticated ? "/analyst" : "/signin", icon: User, label: isAuthenticated ? "Profile" : "Sign In" },
      ];

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-card/95 backdrop-blur-xl border-t border-border/60 pb-safe"
    >
      <div className="flex items-center justify-around h-14 max-w-lg mx-auto px-2">
        {items.map(item => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path ||
            (item.path !== "/" && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "relative flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors min-w-[56px]",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {/* Active top indicator */}
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-primary rounded-full" />
              )}
              <Icon className={cn("w-5 h-5 transition-transform", isActive && "scale-110")} />
              <span className={cn("text-[10px] font-medium", isActive ? "text-primary" : "text-muted-foreground")}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
