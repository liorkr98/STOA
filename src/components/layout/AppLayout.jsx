import React from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { BarChart3, Home, PenLine, LogIn, Wallet, LogOut, LayoutDashboard, ChevronDown, TrendingUp, Palette, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import AppFooter from "./AppFooter";
import SearchBar from "./SearchBar";
import NotificationCenter from "./NotificationCenter";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import StoaLogo from "@/components/StoaLogo";
import { base44 } from "@/api/base44Client";

const NAV_ITEMS = [
  { path: "/", label: "Feed", icon: Home },
  { path: "/stocks", label: "Markets", icon: TrendingUp },
  { path: "/editor", label: "Write", icon: PenLine },
  { path: "/dashboard", label: "Dashboard", icon: BarChart3 },
];

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
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
            {NAV_ITEMS.map((item) => {
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
              <div className="flex items-center gap-1">
                <NotificationCenter />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
                      {user?.picture
                        ? <img src={user.picture} alt={user.full_name || "User"} className="w-7 h-7 rounded-full object-cover border border-border" />
                        : <div className="w-7 h-7 rounded-full bg-primary/10 border border-border flex items-center justify-center text-xs font-bold text-primary">
                            {user?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
                          </div>
                      }
                      <span className="hidden md:block max-w-[100px] truncate">{user?.full_name || user?.email?.split("@")[0]}</span>
                      <ChevronDown className="w-3.5 h-3.5 hidden md:block" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <div className="px-3 py-2 border-b border-border">
                      <p className="text-sm font-semibold truncate">{user?.full_name || "My Account"}</p>
                      <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                    </div>
                    <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                      <LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/wallet")}>
                      <Wallet className="w-4 h-4 mr-2" /> Wallet
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/branding")}>
                      <Palette className="w-4 h-4 mr-2" /> Branding
                    </DropdownMenuItem>
                    {user?.role === "admin" && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => navigate("/admin/users")}>
                          <Shield className="w-4 h-4 mr-2" /> Admin: Users
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => { base44.auth.logout("/"); }} className="text-loss focus:text-loss">
                      <LogOut className="w-4 h-4 mr-2" /> Log Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
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

      {location.pathname !== "/" && <AppFooter />}
    </div>
  );
}