import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Link } from "react-router-dom";
import { Users, Star, FileText, ChevronDown, ChevronUp, Lock, BadgeCheck, PlusCircle } from "lucide-react";
import { getAnalystSlug } from "@/lib/analystSlug";

function Section({ icon: SectionIcon, title, children, defaultOpen = true }) {
  const Icon = SectionIcon;
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-3 py-2 rounded-lg hover:bg-secondary transition-colors group"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</span>
        </div>
        {open
          ? <ChevronUp className="w-3 h-3 text-muted-foreground" />
          : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
      </button>
      {open && <div className="mt-1 space-y-0.5">{children}</div>}
    </div>
  );
}

function AnalystRow({ name, avatar, accuracy, slug }) {
  return (
    <Link
      to={`/analyst/${slug}`}
      className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-secondary transition-colors group"
    >
      <div className="w-7 h-7 rounded-full bg-primary/10 border border-border flex items-center justify-center text-xs font-bold text-primary flex-shrink-0 overflow-hidden">
        {avatar
          ? <img src={avatar} alt={name} className="w-full h-full object-cover" />
          : name?.[0]?.toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{name}</p>
        {accuracy != null && accuracy > 0 && (
          <p className="text-[10px] text-muted-foreground flex items-center gap-0.5">
            <BadgeCheck className="w-2.5 h-2.5" />{accuracy}% Acc.
          </p>
        )}
      </div>
    </Link>
  );
}

function ReportRow({ report }) {
  return (
    <Link
      to={`/report?id=${report.id}`}
      className="flex items-start gap-2 px-3 py-2 rounded-lg hover:bg-secondary transition-colors group"
    >
      <FileText className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium leading-snug truncate group-hover:text-primary transition-colors">{report.title}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{report.author_name || "Analyst"}</p>
      </div>
      <Lock className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />
    </Link>
  );
}

export default function LeftSidebar() {
  const { user, isAuthenticated } = useAuth();
  const [following, setFollowing] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [purchasedReports, setPurchasedReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || !user) { setLoading(false); return; }

    const fetchData = async () => {
      try {
        // Load follows from entity
        const follows = await base44.entities.Follow.filter({ follower_email: user.email }, "-created_date", 50).catch(() => []);
        setFollowing(follows || []);

        // Load subscriptions from entity
        const subs = await base44.entities.Subscription.filter({ subscriber_email: user.email, status: "active" }, "-created_date", 50).catch(() => []);
        setSubscriptions(subs || []);

        // Load purchased reports from localStorage
        const storedPurchases = JSON.parse(localStorage.getItem("stoa_purchases") || "[]");
        if (storedPurchases.length > 0) {
          const results = await Promise.all(
            storedPurchases.map(id => base44.entities.Report.filter({ id }).then(r => r[0]).catch(() => null))
          );
          setPurchasedReports(results.filter(Boolean));
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated, user]);

  if (!isAuthenticated) {
    return (
      <div className="bg-card border border-border rounded-2xl p-4">
        <p className="text-xs text-muted-foreground text-center mb-3">Sign in to see your followed analysts and subscriptions</p>
        <Link to="/signin" className="block text-center text-xs font-semibold text-primary hover:underline">Sign In</Link>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary overflow-hidden">
            {user?.full_name?.[0]?.toUpperCase() || "U"}
          </div>
          <div>
            <p className="text-sm font-semibold truncate max-w-[130px]">{user?.full_name || "You"}</p>
            <p className="text-[10px] text-muted-foreground">My Feed</p>
          </div>
        </div>
      </div>

      <div className="py-2">
        {/* Following */}
        <Section icon={Users} title={`Following (${following.length})`} defaultOpen={true}>
          {loading ? (
            <div className="px-3 py-2 space-y-2">
              {[1,2].map(i => <div key={i} className="h-8 bg-muted rounded animate-pulse" />)}
            </div>
          ) : following.length === 0 ? (
            <div className="px-3 py-2">
              <p className="text-xs text-muted-foreground mb-2">No analysts followed yet</p>
              <Link to="/leaderboard" className="flex items-center gap-1 text-xs text-primary hover:underline font-medium">
                <PlusCircle className="w-3 h-3" /> Discover analysts →
              </Link>
            </div>
          ) : (
            following.slice(0, 8).map(f => (
              <AnalystRow
                key={f.id}
                name={f.analyst_name}
                avatar={f.analyst_avatar}
                slug={f.analyst_name?.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || f.analyst_email?.split("@")[0]}
              />
            ))
          )}
        </Section>

        <div className="mx-3 my-1 border-t border-border/60" />

        {/* Subscriptions */}
        <Section icon={Star} title={`Subscriptions (${subscriptions.length})`} defaultOpen={true}>
          {loading ? (
            <div className="px-3 py-2 space-y-2">
              {[1].map(i => <div key={i} className="h-8 bg-muted rounded animate-pulse" />)}
            </div>
          ) : subscriptions.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">No active subscriptions</p>
          ) : (
            subscriptions.slice(0, 8).map(s => (
              <AnalystRow
                key={s.id}
                name={s.analyst_name}
                avatar={s.analyst_avatar}
                slug={s.analyst_name?.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || s.analyst_email?.split("@")[0]}
              />
            ))
          )}
        </Section>

        {purchasedReports.length > 0 && (
          <>
            <div className="mx-3 my-1 border-t border-border/60" />
            <Section icon={FileText} title={`Purchased (${purchasedReports.length})`} defaultOpen={false}>
              {purchasedReports.map(r => <ReportRow key={r.id} report={r} />)}
            </Section>
          </>
        )}
      </div>
    </div>
  );
}