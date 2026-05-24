import React, { useState, useEffect } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { Home, PenLine, LogIn, Wallet, LogOut, LayoutDashboard, ChevronDown, TrendingUp, Shield, Bookmark, MessageSquare, Sparkles, User as UserIcon, Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "@/lib/ThemeContext";
import { avatarUrl } from "@/lib/avatarUrl";
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
import InvestorOnboarding, { shouldShowInvestorOnboarding, markInvestorOnboardingDone } from "@/components/onboarding/InvestorOnboarding";
import AnalystOnboarding, { shouldShowAnalystOnboarding, markAnalystOnboardingDone } from "@/components/onboarding/AnalystOnboarding";
import OnboardingModal from "@/components/onboarding/OnboardingModal";
import MobileBottomNav from "@/components/layout/MobileBottomNav";

// Map every top-level route to a human-readable tab title.
// Pages that call setMeta() themselves (ReportView, AnalystProfilePage, etc.)
// override this on mount — that's intentional, since they have richer data.
// Anything not in this map falls back to the default "STOA — Verified..." title.
const ROUTE_TITLES = {
  "/":                 "STOA — Verified Financial Research",
  "/feed":             "Research Feed | STOA",
  "/stocks":           "Markets | STOA",
  "/leaderboard":      "Leaderboard | STOA",
  "/editor":           "New Report | STOA",
  "/wallet":           "Wallet | STOA",
  "/dashboard":        "Creator Studio | STOA",
  "/analytics":        "Analytics | STOA",
  "/predictions":      "My Predictions | STOA",
  "/pricing":          "Pricing | STOA",
  "/about":            "About | STOA",
  "/newsroom":         "Newsroom | STOA",
  "/how-it-works":     "How It Works | STOA",
  "/cookies":          "Cookie Policy | STOA",
  "/accessibility":    "Accessibility | STOA",
  "/features":         "Features | STOA",
  "/calculations":     "Calculations | STOA",
  "/scoring":          "Scoring & Calculations | STOA",
  "/terms":            "Terms & Conditions | STOA",
  "/privacy":          "Privacy Policy | STOA",
  "/subscribers":      "Subscribers | STOA",
  "/saved":            "Saved Reports | STOA",
  "/inbox":            "Inbox | STOA",
  "/dm":               "Messages | STOA",
  "/branding":         "Branding | STOA",
  "/become-analyst":   "Become a Researcher | STOA",
  "/edit-profile":     "Edit Profile | STOA",
  "/admin/users":      "Admin · Users | STOA",
  "/creator-analytics":"Creator Analytics | STOA",
  "/analytics/creator":"Creator Analytics | STOA",
  "/pay":              "Payment | STOA",
};

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
  const { isAuthenticated, user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [unreadCount, setUnreadCount] = useState(0);
  const [walletBalance, setWalletBalance] = useState(null);
  const [showInvestorOnboarding, setShowInvestorOnboarding] = useState(false);
  const [showAnalystOnboarding, setShowAnalystOnboarding] = useState(false);
  const [showFirstVisit, setShowFirstVisit] = useState(false);
  const isAnalyst = user?.role === "analyst" || user?.role === "admin";
  const NAV_ITEMS = isAuthenticated && isAnalyst ? NAV_ANALYST : NAV_INVESTOR;

  // Keep document.title in sync with the current route on every SPA navigation.
  // Page components that call setMeta() in their own useEffect override this —
  // since they mount after the layout effect runs, the more-specific title wins.
  useEffect(() => {
    const title = ROUTE_TITLES[location.pathname];
    if (title) document.title = title;
  }, [location.pathname]);

  // Global "back" keyboard shortcuts. Gives users a guaranteed-working path
  // back even if a specific page's back button gets covered by an overlay
  // or has stale styling. Alt+ArrowLeft and Cmd/Ctrl+[ both trigger.
  // Ignored when focus is in an input/textarea so typing doesn't navigate.
  useEffect(() => {
    const handler = (e) => {
      const tag = (e.target?.tagName || "").toLowerCase();
      const isTyping = tag === "input" || tag === "textarea" || e.target?.isContentEditable;
      if (isTyping) return;
      const altLeft = e.altKey && e.key === "ArrowLeft";
      const cmdBracket = (e.metaKey || e.ctrlKey) && e.key === "[";
      if (altLeft || cmdBracket) {
        e.preventDefault();
        if (window.history.length > 1) navigate(-1);
        else navigate("/");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate]);

  // Show onboarding for new users — check once user is loaded
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    if (isAnalyst) {
      if (shouldShowAnalystOnboarding(user)) setShowAnalystOnboarding(true);
    } else {
      if (shouldShowInvestorOnboarding(user)) setShowInvestorOnboarding(true);
    }
  }, [isAuthenticated, user, isAnalyst]);

  // First-visit OnboardingModal — restored from backup. Triggers for anonymous
  // visitors and authed investors who haven't seen the welcome + interest-picker
  // flow yet. Authed users still get the role-aware InvestorOnboarding /
  // AnalystOnboarding tour above; this is the lightweight intro overlay.
  useEffect(() => {
    if (isAnalyst) return;
    if (localStorage.getItem("stoa_onboarded") === "true") return;
    setShowFirstVisit(true);
  }, [isAnalyst]);

  // Poll wallet balance for header chip
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const refresh = async () => {
      try {
        const wallets = await base44.entities.Wallet.filter({ created_by: user.email }).catch(() => []);
        setWalletBalance(wallets?.[0]?.balance ?? 0);
      } catch {}
    };
    refresh();
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, user]);

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
      {/* Skip to main content — screen reader / keyboard nav */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[200] focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-sm focus:text-sm focus:font-medium"
      >
        Skip to main content
      </a>

      {/* Navbar — editorial, minimal chrome. Text links, not pill buttons.
          Active state is a 1px underline below the label, matching the
          design system's "no background highlights on nav items" rule. */}
      <header role="banner" className="sticky top-0 z-30 bg-background/85 backdrop-blur-xl border-b border-border/60">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center gap-8">
          <Link to="/" className="flex-shrink-0" aria-label="STOA — go to homepage">
            <StoaLogo size={28} textSize="text-lg" />
          </Link>

          <nav role="navigation" aria-label="Main navigation" className="hidden md:flex items-center gap-7">
            {NAV_ITEMS.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  aria-label={item.label}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "relative text-[13px] font-medium tracking-[0.01em] transition-colors py-1",
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  style={{ letterSpacing: "0.3px" }}
                >
                  {item.label}
                  {isActive && (
                    <span className="absolute -bottom-[2px] left-0 right-0 h-px bg-foreground" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="flex-1 max-w-xs hidden lg:block ml-auto">
            <SearchBar />
          </div>

          <nav role="navigation" aria-label="Account" className="flex items-center gap-2 ml-auto lg:ml-0">
            {/* Write CTA — visible to analysts at all times so publishing is
                always one click away (Beehiiv-style). Editorial pill, not a
                heavy button. */}
            {isAuthenticated && isAnalyst && (
              <Link
                to="/editor"
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md border border-border text-[12px] font-medium text-foreground hover:border-accent/50 hover:text-accent transition-colors"
              >
                <PenLine className="w-3.5 h-3.5" />
                Write
              </Link>
            )}
            {isAuthenticated ? (
              <div className="flex items-center gap-1">
                {/* Wallet balance chip — quick spend + top-up */}
                <Link
                  to="/wallet"
                  aria-label={`Wallet — balance $${walletBalance == null ? "loading" : walletBalance.toFixed(2)}`}
                  className="hidden sm:flex items-center gap-1.5 text-xs font-medium font-display px-2.5 py-1.5 rounded-sm border border-border hover:border-primary/40 hover:bg-secondary transition-colors"
                >
                  <Wallet className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                  ${walletBalance == null ? "—" : walletBalance.toFixed(2)}
                </Link>
                <NotificationCenter />
                <Link to="/inbox" aria-label={`Messages${unreadCount > 0 ? ` — ${unreadCount} unread` : ""}`} className="relative p-2 rounded-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                  <MessageSquare className="w-4 h-4" aria-hidden="true" />
                  {unreadCount > 0 && (
                    <span
                      className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary rounded-full flex items-center justify-center text-[9px] text-primary-foreground font-medium font-display"
                      aria-live="polite"
                      aria-label={`${unreadCount} unread message${unreadCount === 1 ? "" : "s"}`}
                    >
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button aria-label="Account menu" className="flex items-center gap-1.5 px-2 py-1.5 rounded-sm text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                      {avatarUrl(user)
                        ? <img src={avatarUrl(user)} alt={user.full_name || "User"} className="w-7 h-7 rounded-full object-cover border border-border" />
                        : <div className="w-7 h-7 rounded-full bg-primary/10 border border-border flex items-center justify-center text-xs font-medium text-primary">
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
                      {avatarUrl(user)
                        ? <img src={avatarUrl(user)} alt={user.full_name || "User"} className="w-9 h-9 rounded-full object-cover border border-border flex-shrink-0" />
                        : <div className="w-9 h-9 rounded-full bg-primary/10 border border-border flex items-center justify-center text-sm font-medium text-primary flex-shrink-0">
                            {user?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
                          </div>
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{user?.full_name || "My Account"}</p>
                        <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                        <span className={`mt-1 inline-block ${isAnalyst ? "pill-accent" : "pill"}`}>
                          {isAnalyst ? "Researcher" : "Investor"}
                        </span>
                      </div>
                    </button>

                    {/* INVESTOR — prominent upgrade prompt */}
                    {!isAnalyst && (
                      <DropdownMenuItem onClick={() => navigate("/become-analyst")} className="bg-accent/10 focus:bg-accent/15">
                        <Sparkles className="w-4 h-4 mr-2 text-accent" />
                        <span className="font-medium text-accent">Become a Researcher</span>
                      </DropdownMenuItem>
                    )}

                    {/* ANALYST — public profile + private dashboard */}
                    {isAnalyst && (
                      <>
                        <DropdownMenuItem onClick={() => navigate("/analyst")}>
                          <UserIcon className="w-4 h-4 mr-2" /> My Public Profile
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
                        <span className="ml-auto text-[10px] bg-primary text-primary-foreground rounded-tag px-1.5 py-0.5 font-medium font-display">{unreadCount}</span>
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
                    {/* Theme picker — Light / Dark / Auto. Closing the dropdown
                        after selection would feel disruptive, so each option is
                        a non-closing click-stop. */}
                    <div className="px-2 pt-2 pb-1">
                      <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground px-1 mb-1.5">Appearance</p>
                      <div className="flex gap-1">
                        {[
                          { key: "light", label: "Light", Icon: Sun },
                          { key: "dark",  label: "Dark",  Icon: Moon },
                          { key: "auto",  label: "Auto",  Icon: Monitor },
                        ].map(({ key, label, Icon }) => {
                          const active = theme === key;
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={(e) => { e.preventDefault(); setTheme(key); }}
                              className={cn(
                                "flex-1 flex flex-col items-center gap-1 py-1.5 px-1 rounded-sm text-[10px] font-medium transition-colors border",
                                active
                                  ? "border-accent/40 bg-accent/10 text-accent"
                                  : "border-transparent text-muted-foreground hover:bg-secondary hover:text-foreground"
                              )}
                              aria-pressed={active}
                            >
                              <Icon className="w-3.5 h-3.5" /> {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => logout(true)} className="text-muted-foreground focus:text-foreground">
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
      <main id="main-content" role="main" className="flex-1" tabIndex={-1} style={{ paddingBottom: "calc(60px + env(safe-area-inset-bottom, 0px))" }}>
        <Outlet />
      </main>

      {location.pathname !== "/" && <AppFooter />}

      {/* Global AI analyst — available on every page except the editor (which has its own) */}
      {!["/editor"].includes(location.pathname) && <AIChat />}

      {/* Mobile bottom nav — investor surfaces. Hidden on the editor (which
          replaces the whole shell) and on the public landing page. */}
      {!["/editor"].includes(location.pathname) && <MobileBottomNav />}

      {/* Onboarding flows — shown once for new users */}
      {showInvestorOnboarding && (
        <InvestorOnboarding onClose={() => { setShowInvestorOnboarding(false); markInvestorOnboardingDone(); }} />
      )}
      {showAnalystOnboarding && (
        <AnalystOnboarding onClose={() => { setShowAnalystOnboarding(false); markAnalystOnboardingDone(); }} />
      )}
      {showFirstVisit && !showInvestorOnboarding && !showAnalystOnboarding && (
        <OnboardingModal onComplete={() => setShowFirstVisit(false)} />
      )}
    </div>
  );
}