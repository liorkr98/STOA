import { Link } from "react-router-dom";
import { Compass, ArrowRight, Home, BarChart3, FileText, Trophy } from "lucide-react";
import StoaLogo from "@/components/StoaLogo";

// Proper 404 page — theme-aware (works in light + dark), branded, and
// gives the user real paths back into the app instead of one button.
// Wrapped in the AppLayout via Routes config, so the global nav/footer
// render automatically.
export default function PageNotFound() {
  const links = [
    { to: "/",          label: "Home",        icon: Home },
    { to: "/feed",      label: "Research Feed", icon: FileText },
    { to: "/stocks",    label: "Markets",     icon: BarChart3 },
    { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
  ];

  return (
    <div className="min-h-screen flex items-start justify-center px-6 py-20 bg-background">
      <div className="max-w-md w-full text-center">
        <div className="flex justify-center mb-8">
          <StoaLogo size={48} textSize="text-2xl" />
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-tag bg-secondary text-muted-foreground text-xs font-semibold mb-6">
          <Compass className="w-3.5 h-3.5" /> 404 · Page not found
        </div>

        <h1 className="text-3xl font-bold text-foreground mb-3" style={{ fontFamily: "Lora, Georgia, serif" }}>
          We couldn't find that page.
        </h1>
        <p className="text-sm text-muted-foreground mb-10 leading-relaxed">
          The link may be broken, the page may have moved, or it might never
          have existed. Here are some good places to start:
        </p>

        <div className="grid grid-cols-2 gap-2 mb-8">
          {links.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center justify-between px-4 py-3 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-sm transition-all text-left group"
            >
              <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                {label}
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          Still lost?{" "}
          <a href="mailto:support@stoamarket.ai" className="text-primary hover:underline">
            support@stoamarket.ai
          </a>
        </p>
      </div>
    </div>
  );
}
