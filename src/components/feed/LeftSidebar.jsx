import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Link } from "react-router-dom";
import { Users, Star, FileText, ChevronDown, ChevronUp, Lock, BadgeCheck } from "lucide-react";
import { getAnalystSlug, analystHref } from "@/lib/analystSlug";
import { formatDistanceToNow, differenceInHours } from "date-fns";

function Section({ icon: SectionIcon, title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-3 py-2 rounded-lg hover:bg-secondary transition-colors"
      >
        <div className="flex items-center gap-2">
          <SectionIcon className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</span>
        </div>
        {open ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
      </button>
      {open && <div className="mt-1 space-y-0.5">{children}</div>}
    </div>
  );
}

function AnalystRow({ name, avatar, accuracy, href, lastPostDate, postCountThisWeek, hasNewPost }) {
  return (
    <Link
      to={href}
      className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-secondary transition-colors group"
    >
      <div className="relative w-7 h-7 rounded-full bg-primary/10 border border-border flex items-center justify-center text-xs font-medium text-primary flex-shrink-0 overflow-hidden">
        {avatar
          ? <img src={avatar} alt={name} className="w-full h-full object-cover" />
          : name?.[0]?.toUpperCase()}
        {/* Red dot for new post */}
        {hasNewPost && (
          <span className="absolute top-0 right-0 w-2 h-2 bg-primary rounded-full border border-card" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{name}</p>
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          {accuracy != null && accuracy > 0 && (
            <span className="flex items-center gap-0.5"><BadgeCheck className="w-2.5 h-2.5" />{accuracy}%</span>
          )}
          {lastPostDate && (
            <span>· Last: {formatDistanceToNow(new Date(lastPostDate), { addSuffix: true })}</span>
          )}
          {postCountThisWeek > 0 && !lastPostDate && (
            <span>{postCountThisWeek} posts this week</span>
          )}
        </p>
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
      <FileText className="w-3.5 h-3.5 text-accent flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium leading-snug truncate group-hover:text-primary transition-colors">{report.title}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{report.author_name || "Researcher"}</p>
      </div>
      <Lock className="w-3 h-3 text-accent flex-shrink-0 mt-0.5" />
    </Link>
  );
}

function SuggestedAnalysts() {
  const [topAnalysts, setTopAnalysts] = useState([]);

  useEffect(() => {
    base44.entities.User.list("-accuracy_score", 5)
      .then(data => setTopAnalysts((data || []).filter(u => u.accuracy_score > 0).slice(0, 3)))
      .catch(() => {});
  }, []);

  if (topAnalysts.length === 0) return (
    <div className="px-3 py-2">
      <Link to="/leaderboard" className="text-xs text-primary hover:underline font-medium">Discover researchers →</Link>
    </div>
  );

  return (
    <div className="px-3 py-2 space-y-2">
      <p className="text-[10px] text-muted-foreground font-medium">Suggested for you</p>
      {topAnalysts.map(a => {
        const name = a.full_name || a.email?.split("@")[0] || "Researcher";
        return (
          <Link key={a.id} to={analystHref(a)} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-medium text-primary overflow-hidden flex-shrink-0">
              {a.picture ? <img src={a.picture} alt={name} className="w-full h-full object-cover" /> : name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{name}</p>
              <p className="text-[9px] text-muted-foreground">{a.accuracy_score?.toFixed(1)}% acc.</p>
            </div>
          </Link>
        );
      })}
      <Link to="/leaderboard" className="block text-[10px] text-primary hover:underline font-medium pt-1">View all →</Link>
    </div>
  );
}

export default function LeftSidebar() {
  const { user, isAuthenticated } = useAuth();
  const [following, setFollowing] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [purchasedReports, setPurchasedReports] = useState([]);
  const [analystReports, setAnalystReports] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || !user) { setLoading(false); return; }

    const fetchData = async () => {
      try {
        const follows = await base44.entities.Follow.filter({ follower_email: user.email }, "-created_date", 50).catch(() => []);
        setFollowing(follows || []);

        const subs = await base44.entities.Subscription.filter({ subscriber_email: user.email, status: "active" }, "-created_date", 50).catch(() => []);
        setSubscriptions(subs || []);

        const storedPurchases = JSON.parse(localStorage.getItem("stoa_purchases") || "[]");
        if (storedPurchases.length > 0) {
          const results = await Promise.all(
            storedPurchases.map(id => base44.entities.Report.filter({ id }).then(r => r[0]).catch(() => null))
          );
          setPurchasedReports(results.filter(Boolean));
        }

        // Fetch recent reports for followed analysts to show "last post" info
        if ((follows || []).length > 0) {
          const emails = follows.slice(0, 8).map(f => f.analyst_email);
          const recentReports = await base44.entities.Report.filter({ status: "published" }, "-created_date", 50).catch(() => []);
          const byAuthor = {};
          recentReports.forEach(r => {
            if (!byAuthor[r.created_by]) byAuthor[r.created_by] = [];
            byAuthor[r.created_by].push(r);
          });
          setAnalystReports(byAuthor);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated, user]);

  if (!isAuthenticated) {
    return (
      <div className="surface p-4">
        <p className="text-xs text-muted-foreground text-center mb-3">Sign in to see your followed researchers</p>
        <Link to="/signin" className="block text-center text-xs font-medium text-primary hover:underline">Sign In</Link>
      </div>
    );
  }

  const oneWeekAgo = Date.now() - 7 * 24 * 3600 * 1000;

  return (
    <div className="surface overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/60">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary overflow-hidden">
            {user?.full_name?.[0]?.toUpperCase() || "U"}
          </div>
          <div>
            <p className="text-sm font-medium truncate max-w-[130px]">{user?.full_name || "You"}</p>
            <p className="text-[10px] text-muted-foreground">My Feed</p>
          </div>
        </div>
      </div>

      <div className="py-2">
        {/* Following */}
        <Section icon={Users} title={`Following (${following.length})`} defaultOpen={true}>
          {loading ? (
            <div className="px-3 py-2 space-y-2">
              {[1, 2].map(i => <div key={i} className="h-8 bg-muted rounded animate-pulse" />)}
            </div>
          ) : following.length === 0 ? (
            <SuggestedAnalysts />
          ) : (
            following.slice(0, 8).map(f => {
              const authorReports = analystReports[f.analyst_email] || [];
              const lastPost = authorReports[0]?.created_date || null;
              const weeklyCount = authorReports.filter(r => new Date(r.created_date).getTime() > oneWeekAgo).length;
              const hasNewPost = lastPost ? differenceInHours(new Date(), new Date(lastPost)) < 2 : false;
              const href = analystHref({ full_name: f.analyst_name, email: f.analyst_email });
              return (
                <AnalystRow
                  key={f.id}
                  name={f.analyst_name}
                  avatar={f.analyst_avatar}
                  href={href}
                  lastPostDate={lastPost}
                  postCountThisWeek={weeklyCount}
                  hasNewPost={hasNewPost}
                />
              );
            })
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
                href={analystHref({ full_name: s.analyst_name, email: s.analyst_email })}
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