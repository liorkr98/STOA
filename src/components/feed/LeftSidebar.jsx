import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Link } from "react-router-dom";
import { Users, Star, FileText, ChevronDown, ChevronUp, Lock, BadgeCheck } from "lucide-react";

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

function AnalystRow({ name, avatar, accuracy, userId }) {
  return (
    <Link
      to={`/analyst?id=${userId}`}
      className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-secondary transition-colors group"
    >
      <div className="w-7 h-7 rounded-full bg-primary/10 border border-border flex items-center justify-center text-xs font-bold text-primary flex-shrink-0 overflow-hidden">
        {avatar
          ? <img src={avatar} alt={name} className="w-full h-full object-cover" />
          : name?.[0]?.toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{name}</p>
        {accuracy != null && (
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

    // Load data from localStorage (follows/subs are stored client-side)
    const storedFollowing = JSON.parse(localStorage.getItem("stoa_following") || "[]");
    const storedSubs = JSON.parse(localStorage.getItem("stoa_subscriptions") || "[]");
    const storedPurchases = JSON.parse(localStorage.getItem("stoa_purchases") || "[]");

    setFollowing(storedFollowing);
    setSubscriptions(storedSubs);

    // Load purchased reports from entity
    if (storedPurchases.length > 0) {
      Promise.all(storedPurchases.map(id =>
        base44.entities.Report.filter({ id }).then(r => r[0]).catch(() => null)
      )).then(results => {
        setPurchasedReports(results.filter(Boolean));
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
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
          {following.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">No analysts followed yet</p>
          ) : (
            following.slice(0, 8).map(a => (
              <AnalystRow key={a.id} name={a.name} avatar={a.avatar} accuracy={a.accuracy} userId={a.id} />
            ))
          )}
        </Section>

        <div className="mx-3 my-1 border-t border-border/60" />

        {/* Subscriptions */}
        <Section icon={Star} title={`Subscriptions (${subscriptions.length})`} defaultOpen={true}>
          {subscriptions.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">No active subscriptions</p>
          ) : (
            subscriptions.slice(0, 8).map(a => (
              <AnalystRow key={a.id} name={a.name} avatar={a.avatar} accuracy={a.accuracy} userId={a.id} />
            ))
          )}
        </Section>

        <div className="mx-3 my-1 border-t border-border/60" />

        {/* Purchased Reports */}
        <Section icon={FileText} title={`Purchased (${purchasedReports.length})`} defaultOpen={false}>
          {loading ? (
            <div className="px-3 py-2 space-y-2">
              {[1,2].map(i => <div key={i} className="h-8 bg-muted rounded animate-pulse" />)}
            </div>
          ) : purchasedReports.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">No purchased reports</p>
          ) : (
            purchasedReports.map(r => <ReportRow key={r.id} report={r} />)
          )}
        </Section>
      </div>
    </div>
  );
}