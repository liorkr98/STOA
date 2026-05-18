import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Users, Star, MessageCircle, ArrowLeft, Search, BadgeCheck, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";
import useGoBack from "@/hooks/useGoBack";

const TABS = [
  { key: "subscribers", label: "Subscribers", icon: Star },
  { key: "following", label: "Following", icon: Users },
];

function AnalystCard({ entry, type, onUnfollow, onUnsubscribe }) {
  const navigate = useNavigate();
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 hover:border-primary/30 transition-all">
      <Link to={`/analyst?id=${entry.id}`} className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-10 h-10 rounded-full bg-primary/10 border border-border flex items-center justify-center text-sm font-medium text-primary flex-shrink-0 overflow-hidden">
          {entry.avatar
            ? <img src={entry.avatar} alt={entry.name} className="w-full h-full object-cover" />
            : (entry.name?.[0] || "A").toUpperCase()
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{entry.name || "Researcher"}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {entry.accuracy != null && (
              <span className="flex items-center gap-0.5 text-[11px] text-gain font-medium">
                <BadgeCheck className="w-3 h-3" />{entry.accuracy.toFixed(1)}%
              </span>
            )}
            {type === "subscribers" && entry.plan && (
              <span className="text-[11px] px-1.5 py-0 rounded-tag bg-primary/10 text-primary border border-primary/20 font-medium">
                {entry.plan.label}
              </span>
            )}
          </div>
        </div>
      </Link>
      <div className="flex items-center gap-2 flex-shrink-0">
        {type === "subscribers" && entry.plan?.dm && (
          <Button size="sm" variant="outline" className="text-xs h-8 gap-1" onClick={() => navigate(`/dm?analyst=${entry.id}`)}>
            <MessageCircle className="w-3 h-3" /> DM
          </Button>
        )}
        {type === "following" && (
          <Button size="sm" variant="outline" className="text-xs h-8 text-muted-foreground" onClick={() => onUnfollow(entry.id)}>
            Unfollow
          </Button>
        )}
        {type === "subscribers" && (
          <Button size="sm" variant="outline" className="text-xs h-8 text-muted-foreground" onClick={() => onUnsubscribe(entry.id)}>
            Unsubscribe
          </Button>
        )}
      </div>
    </div>
  );
}

export default function SubscribersPage() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const goBack   = useGoBack("/");
  const [tab, setTab] = useState("subscribers");
  const [search, setSearch] = useState("");
  const [subscribers, setSubscribers] = useState([]);
  const [following, setFollowing] = useState([]);

  // Source of truth: server entities. The previous localStorage-only read
  // disagreed with the feed sidebar (which queries the Follow entity), so
  // /subscribers showed Following=0 while the sidebar said Following=2.
  // Subscriptions: same fix using the Subscription entity.
  useEffect(() => {
    if (!isAuthenticated || !user?.email) return;
    (async () => {
      try {
        const [follows, subs] = await Promise.all([
          base44.entities.Follow.filter({ follower_email: user.email }, "-created_date", 100).catch(() => []),
          base44.entities.Subscription.filter({ subscriber_email: user.email, status: "active" }, "-created_date", 100).catch(() => []),
        ]);
        setFollowing((follows || []).map(f => ({
          id: f.id,
          email: f.analyst_email,
          name: f.analyst_name || (f.analyst_email || "").split("@")[0] || "Researcher",
          avatar: f.analyst_avatar,
        })));
        setSubscribers((subs || []).map(s => ({
          id: s.id,
          email: s.analyst_email,
          name: s.analyst_name || (s.analyst_email || "").split("@")[0] || "Researcher",
          avatar: s.analyst_avatar,
        })));
      } catch {}
    })();
  }, [isAuthenticated, user?.email]);

  const handleUnfollow = async (id) => {
    setFollowing(prev => prev.filter(a => a.id !== id));
    try { await base44.entities.Follow.delete(id); } catch {}
  };

  const handleUnsubscribe = async (id) => {
    setSubscribers(prev => prev.filter(a => a.id !== id));
    try { await base44.entities.Subscription.update(id, { status: "cancelled" }); } catch {}
  };

  const activeList = tab === "subscribers" ? subscribers : following;
  const filtered = activeList.filter(a =>
    !search || (a.name || "").toLowerCase().includes(search.toLowerCase())
  );

  if (!isAuthenticated) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
        <p className="text-muted-foreground mb-4">Sign in to manage your subscriptions</p>
        <Button onClick={() => navigate("/signin")}>Sign In</Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <button onClick={goBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="flex items-center gap-3 mb-6">
        <Star className="w-5 h-5 text-primary" />
        <div>
          <h1 className="text-xl font-medium">My Connections</h1>
          <p className="text-sm text-muted-foreground">Manage subscriptions and followed researchers</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary p-1 rounded-xl mb-5">
        {TABS.map(t => {
          const Icon = t.icon;
          const count = t.key === "subscribers" ? subscribers.length : following.length;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
              <span className={`text-xs px-1.5 py-0 rounded-tag font-medium ${tab === t.key ? "bg-primary text-white" : "bg-border text-muted-foreground"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      {activeList.length > 0 && (
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search researchers..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {/* Summary card */}
      {tab === "subscribers" && subscribers.length > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-4 flex gap-6">
          <div className="text-center">
            <p className="text-xl font-medium text-primary">{subscribers.length}</p>
            <p className="text-xs text-muted-foreground">Subscriptions</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-medium text-primary">{subscribers.filter(s => s.plan?.dm).length}</p>
            <p className="text-xs text-muted-foreground">With DM Access</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-medium text-amber-600">
              ${subscribers.reduce((sum, s) => sum + (s.plan?.price || 0), 0).toFixed(0)}
            </p>
            <p className="text-xs text-muted-foreground">Total/mo</p>
          </div>
        </div>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          {tab === "subscribers"
            ? <Star className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            : <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />}
          <p className="text-sm text-muted-foreground mb-4">
            {search ? "No researchers match your search" :
              tab === "subscribers"
                ? "No subscribers yet. Share your research to grow your audience."
                : "You haven't subscribed to any researchers yet. Browse the feed to find analysts."}
          </p>
          <Button variant="outline" size="sm" onClick={() => navigate("/leaderboard")}>Browse Researchers</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(entry => (
            <AnalystCard
              key={entry.id}
              entry={entry}
              type={tab}
              onUnfollow={handleUnfollow}
              onUnsubscribe={handleUnsubscribe}
            />
          ))}
        </div>
      )}
    </div>
  );
}