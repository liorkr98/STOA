import React, { useState, useEffect } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { BarChart3, Home, PenLine, LogIn, Wallet, LogOut, LayoutDashboard, ChevronDown, TrendingUp, Palette, Shield, Bookmark, MessageSquare, Sparkles, User as UserIcon, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import AppFooter from "./AppFooter";
import SearchBar from "./SearchBar";
import NotificationCenter from "./NotificationCenter";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import StoaLogo from "@/components/StoaLogo";
import { base44 } from "@/api/base44Client";
import AIChat from "@/components/editor/AIChat";

// Nav for analysts (creators) — full toolset including Write
const NAV_ANALYST = [
  { path: "/",       label: "Home",    icon: Home },
  { path: "/feed",   label: "Feed",    icon: LayoutDashboard },
  { path: "/stocks", label: "Markets", icon: TrendingUp },
  { path: "/editor", label: "Write",   icon: PenLine },
];

// Nav for investors (consumers) — read-only research consumption
const NAV_INVESTOR = [
  { path: "/",       label: "Home",    icon: Home },
  { path: "/feed",   label: "Feed",    icon: LayoutDashboard },
  { path: "/stocks", label: "Markets", icon: TrendingUp },
];

export default function AppLayout() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const isAnalyst = user?.role === "analyst" || user?.role === "admin";
  const NAV_ITEMS = isAuthenticated && isAnalyst ? NAV_ANALYST : NAV_INVESTOR;

  // Poll unread message count
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const check = async () => {
      try {
        const msgs = await base44.entities.Message.list("-created_date", 100).catch(() => []);
        const unread = msgs.filter(m => !m.read && m.recipient_email === user.email).length;
        setUnreadCount(unread);
      } catch {}
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, user]);
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
                <Link to="/inbox" className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all" title="Messages">
                  <MessageSquare className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary rounded-full flex items-center justify-center text-[9px] text-white font-bold">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Link>
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
                  <DropdownMenuContent align="end" className="w-56">

                    {/* Identity header — clickable for analysts (→ public profile) */}
                    <button
                      onClick={() => isAnalyst && navigate("/analyst")}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 border-b border-border text-left ${
                        isAnalyst ? "hover:bg-secondary cursor-pointer" : "cursor-default"
                      } transition-colors`}
                    >
                      {user?.picture
                        ? <img src={user.picture} alt={user.full_name || "User"} className="w-9 h-9 rounded-full object-cover border border-border flex-shrink-0" />
                        : <div className="w-9 h-9 rounded-full bg-primary/10 border border-border flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                            {user?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
                          </div>
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{user?.full_name || "My Account"}</p>
                        <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                        <span className={`mt-1 inline-block text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                          isAnalyst ? "bg-amber-100 text-amber-700" : "bg-secondary text-muted-foreground"
                        }`}>
                          {isAnalyst ? "Analyst" : "Investor"}
                        </span>
                      </div>
                    </button>

                    {/* INVESTOR — prominent upgrade prompt */}
                    {!isAnalyst && (
                      <DropdownMenuItem onClick={() => navigate("/become-analyst")} className="bg-amber-50 focus:bg-amber-100">
                        <Sparkles className="w-4 h-4 mr-2 text-amber-600" />
                        <span className="font-bold text-amber-800">Become an Analyst</span>
                      </DropdownMenuItem>
                    )}

                    {/* ANALYST — public profile + private dashboard */}
                    {isAnalyst && (
                      <>
                        <DropdownMenuItem onClick={() => navigate("/analyst")}>
                          <UserIcon className="w-4 h-4 mr-2" /> My Public Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate("/analyst?edit=1")}>
                          <Pencil className="w-4 h-4 mr-2" /> Edit My Page
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                          <LayoutDashboard className="w-4 h-4 mr-2" /> Creator Dashboard
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}

                    {/* Everyone */}
                    <DropdownMenuItem onClick={() => navigate("/inbox")}>
                      <MessageSquare className="w-4 h-4 mr-2" /> Messages
                      {unreadCount > 0 && (
                        <span className="ml-auto text-[10px] bg-primary text-white rounded-full px-1.5 py-0.5 font-bold">{unreadCount}</span>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/wallet")}>
                      <Wallet className="w-4 h-4 mr-2" /> Wallet &amp; AI Credits
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/saved")}>
                      <Bookmark className="w-4 h-4 mr-2" /> Saved Reports
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

      {/* Global AI analyst — available on every page except the editor (which has its own) */}
      {!["/editor"].includes(location.pathname) && <AIChat />}
    </div>
  );
}