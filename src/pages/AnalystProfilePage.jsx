import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { setMeta } from "@/lib/seo";
import { ArrowLeft, UserPlus, MessageCircle, BarChart3, FileText, Star, Target, Users, Flame, Trophy, TrendingUp, Eye, DollarSign, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import ReportCard from "@/components/feed/ReportCard";
import AccuracyBreakdown from "@/components/analyst/AccuracyBreakdown";
import PerformanceVsMarket from "@/components/analyst/PerformanceVsMarket";
import { getAnalystSlug } from "@/lib/analystSlug";
import { computeAvgYield, formatYield } from "@/lib/yieldCalc";
import { computeAnalystTier, computeAchievements } from "@/lib/analystTier";
import AccuracyTierBadge from "@/components/feed/AccuracyTierBadge";
import TierProgressBar from "@/components/analyst/TierProgressBar";



// Map timeframe string → bucket
function getTimeframeBucket(tf) {
  if (!tf) return null;
  const t = tf.toLowerCase();
  if (t.includes("intraday") || t === "day" || t === "1 day") return "INTRADAY";
  if (t.includes("week") || t.includes("1 month") || t.includes("short")) return "SHORT";
  if (t.includes("3 month") || t.includes("6 month") || t.includes("medium")) return "MEDIUM";
  if (t.includes("year") || t.includes("long")) return "LONG";
  return null;
}

export default function AnalystProfilePage() {
  const navigate = useNavigate();
  const { username } = useParams();

  const [analyst, setAnalyst] = useState(null);
  const [myReports, setMyReports] = useState([]);
  const [twits, setTwits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);
  const [showAccModal, setShowAccModal] = useState(false);
  const [showYieldModal, setShowYieldModal] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const me = await base44.auth.me().catch(() => null);
        setCurrentUser(me || null);

        // Find analyst by slug (all users)
        let userData = null;
        const allUsers = await base44.entities.User.list("-created_date", 200).catch(() => []);

        if (username) {
          userData = allUsers.find(u => getAnalystSlug(u) === username) || null;
          // fallback: exact email or id match
          if (!userData) userData = allUsers.find(u => u.id === username || u.email === username) || null;
        } else if (me) {
          userData = me;
        }

        if (userData) {
          setAnalyst(userData);
          setMeta({
            title: `${userData.full_name || userData.email?.split("@")[0] || "Analyst"} — Analyst Profile`,
            description: `Prediction accuracy track record. Follow ${userData.full_name || "this analyst"} on STOA.`,
            image: userData.picture,
          });

          // Check follow/subscription via entities
          if (me && me.email !== userData.email) {
            const follows = await base44.entities.Follow.filter({ follower_email: me.email, analyst_email: userData.email }).catch(() => []);
            setFollowing(follows.length > 0);

            const subs = await base44.entities.Subscription.filter({ subscriber_email: me.email, analyst_email: userData.email, status: "active" }).catch(() => []);
            setIsSubscribed(subs.length > 0);
          }

          const reports = await base44.entities.Report.filter({ created_by: userData.email }, "-created_date", 20).catch(() => []);
          setMyReports(reports || []);

          const twitData = await base44.entities.Twit.filter({ author_id: userData.id }, "-created_date", 5).catch(() => []);
          setTwits(twitData || []);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [username]);

  const handleFollow = async () => {
    if (!currentUser || !analyst) return;
    setFollowLoading(true);
    try {
      if (following) {
        // Unfollow: delete Follow record
        const follows = await base44.entities.Follow.filter({ follower_email: currentUser.email, analyst_email: analyst.email });
        for (const f of follows) await base44.entities.Follow.delete(f.id);
        // Decrement followers_count
        await base44.entities.User.update(analyst.id, { followers_count: Math.max(0, (analyst.followers_count || 1) - 1) });
        setAnalyst(prev => ({ ...prev, followers_count: Math.max(0, (prev.followers_count || 1) - 1) }));
        setFollowing(false);
      } else {
        // Follow
        await base44.entities.Follow.create({
          follower_email: currentUser.email,
          analyst_email: analyst.email,
          analyst_name: analyst.full_name || analyst.email?.split("@")[0] || "Analyst",
          analyst_avatar: analyst.picture || "",
        });
        await base44.entities.User.update(analyst.id, { followers_count: (analyst.followers_count || 0) + 1 });
        setAnalyst(prev => ({ ...prev, followers_count: (prev.followers_count || 0) + 1 }));
        setFollowing(true);
      }
    } finally {
      setFollowLoading(false);
    }
  };

  const handleSubscribe = async () => {
    if (!currentUser || !analyst) return;
    await base44.entities.Subscription.create({
      subscriber_email: currentUser.email,
      analyst_email: analyst.email,
      analyst_name: analyst.full_name || analyst.email?.split("@")[0] || "Analyst",
      analyst_avatar: analyst.picture || analyst.profile_picture || "",
      status: "active",
      plan: "monthly",
    });
    setIsSubscribed(true);
    setShowSubModal(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  if (!analyst) return (
    <div className="max-w-3xl mx-auto px-4 py-12 text-center">
      <p className="text-muted-foreground">Analyst not found.</p>
      <Button onClick={() => navigate(-1)} variant="outline" className="mt-4 text-sm">Go Back</Button>
    </div>
  );

  const isOwnProfile = currentUser && analyst.id === currentUser.id;
  const displayName = analyst.full_name || analyst.email?.split("@")[0] || "Analyst";

  // Compute yield from actual reports
  const resolvedReports = myReports.filter(r => r.prediction_outcome && r.prediction_outcome !== "pending");
  const computedYield = computeAvgYield(resolvedReports);
  const displayYield = formatYield(computedYield);
  const yieldColor = computedYield == null ? "text-muted-foreground" : computedYield >= 0 ? "text-gain" : "text-loss";

  // Track record breakdown from timeframe strings
  const BUCKET_LABELS = { INTRADAY: "Intraday", SHORT: "Short-Term", MEDIUM: "Medium-Term", LONG: "Long-Term" };
  const bucketStats = { INTRADAY: { total: 0, hits: 0 }, SHORT: { total: 0, hits: 0 }, MEDIUM: { total: 0, hits: 0 }, LONG: { total: 0, hits: 0 } };
  resolvedReports.forEach(r => {
    const bucket = getTimeframeBucket(r.prediction_timeframe);
    if (!bucket) return;
    bucketStats[bucket].total++;
    if (r.prediction_outcome === "hit" || r.prediction_outcome === "near") bucketStats[bucket].hits++;
  });

  const tier = computeAnalystTier(analyst, myReports);
  const achievements = computeAchievements(analyst, myReports);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Profile card */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <div className="flex items-start gap-4 mb-4">
          {analyst.picture
            ? <img src={analyst.picture} alt={displayName} loading="lazy" className="w-16 h-16 rounded-full border-2 border-border object-cover" />
            : <div className="w-16 h-16 rounded-full border-2 border-border bg-secondary flex items-center justify-center text-2xl font-bold text-primary">{displayName?.[0] || "A"}</div>
          }
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-xl font-bold">{displayName}</h1>
              <AccuracyTierBadge tierData={tier} size="lg" />
            </div>
            {analyst.tagline && <p className="text-sm text-muted-foreground mb-2">{analyst.tagline}</p>}
            {analyst.bio && <p className="text-sm text-muted-foreground mb-3">{analyst.bio}</p>}
            <div className="flex flex-wrap gap-1.5">
              {(analyst.specialties || []).map(s => (
                <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">{s}</span>
              ))}
            </div>
          </div>
          {!isOwnProfile && currentUser && (
            <div className="flex flex-col gap-2">
              {isSubscribed ? (
                <span className="text-xs font-semibold text-gain bg-gain/10 border border-gain/20 rounded-full px-2.5 py-0.5">Subscribed ✓</span>
              ) : (
                <Button size="sm" onClick={() => setShowSubModal(true)} className="text-xs">Subscribe</Button>
              )}
              <Button
                size="sm"
                variant={following ? "secondary" : "outline"}
                className={`text-xs gap-1 ${following ? "text-gain border-gain/30" : ""}`}
                onClick={handleFollow}
                disabled={followLoading}
              >
                {followLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : following ? <CheckCircle2 className="w-3 h-3" /> : <UserPlus className="w-3 h-3" />}
                {following ? "Following ✓" : "Follow"}
              </Button>
            </div>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            { label: "Accuracy", value: analyst.accuracy_score > 0 ? `${analyst.accuracy_score.toFixed(1)}%` : "—", color: "text-primary", onClick: analyst.accuracy_score > 0 ? () => setShowAccModal(true) : null },
            { label: "Avg Yield", value: displayYield, color: yieldColor, onClick: computedYield != null ? () => setShowYieldModal(true) : null },
            { label: "Followers", value: (analyst.followers_count || 0).toLocaleString(), color: "text-blue-500", onClick: null },
            { label: "Reports", value: myReports.length, color: "text-muted-foreground", onClick: null },
          ].map(stat => (
            <button key={stat.label} onClick={stat.onClick || undefined} className={`text-center p-3 bg-secondary rounded-xl ${stat.onClick ? "hover:bg-secondary/70 cursor-pointer" : "cursor-default"} transition-all`}>
              <p className={`text-base font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-[10px] text-muted-foreground">{stat.label}{stat.onClick ? " ↗" : ""}</p>
            </button>
          ))}
        </div>

        {/* Track record by timeframe */}
        <div className="bg-secondary rounded-xl p-3 mb-3">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Track Record by Timeframe</p>
          <div className="grid grid-cols-4 gap-2">
            {Object.entries(bucketStats).map(([key, stats]) => (
              <div key={key} className="text-center">
                <p className="text-[10px] text-muted-foreground">{BUCKET_LABELS[key]}</p>
                {stats.total > 0 ? (
                  <p className="text-sm font-bold text-foreground">{Math.round((stats.hits / stats.total) * 100)}%</p>
                ) : (
                  <p className="text-sm font-bold text-muted-foreground/40">—</p>
                )}
                {stats.total > 0 && <p className="text-[9px] text-muted-foreground">{stats.hits}/{stats.total}</p>}
              </div>
            ))}
          </div>
        </div>

        {/* Owner extras */}
        {isOwnProfile && (
          <Link to="/subscribers" className="block rounded-xl border p-3 text-center bg-purple-50 border-purple-200 hover:border-purple-400 transition-colors">
            <Users className="w-4 h-4 mx-auto mb-1 text-purple-600" />
            <p className="text-sm font-bold text-purple-600">Manage</p>
            <p className="text-[10px] text-muted-foreground">Subscribers & Following</p>
          </Link>
        )}
      </div>

      <AccuracyBreakdown analystUser={analyst} />
      <PerformanceVsMarket analyst={analyst} />

      {/* Tier Progress */}
      {isOwnProfile && <TierProgressBar user={analyst} allReports={myReports} />}

      {/* Achievements */}
      <div className="bg-card border border-border rounded-2xl p-5 mb-6">
        <h2 className="font-semibold text-sm mb-3">
          Achievements <span className="text-muted-foreground">{achievements.filter(a => a.earned).length}/{achievements.length}</span>
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {[...achievements.filter(a => a.earned), ...achievements.filter(a => !a.earned)].map(a => (
            <div
              key={a.name}
              className="flex flex-col items-center gap-1 p-2.5 rounded-xl border text-center transition-all"
              style={{
                background: a.earned ? '#fefce8' : '#f8fafc',
                borderColor: a.earned ? '#fde68a' : '#e2e8f0',
                opacity: a.earned ? 1 : 0.4,
                filter: a.earned ? 'none' : 'grayscale(1)',
              }}
              title={a.earned ? a.desc : `Locked: ${a.desc}`}
            >
              <span className="text-xl leading-none">{a.icon}</span>
              <span className="text-[10px] font-bold leading-tight text-foreground">{a.name}</span>
              <span className="text-[9px] text-muted-foreground leading-tight">{a.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Twits */}
      {twits.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5 mb-6">
          <h2 className="font-semibold text-sm mb-3">Quick Twits</h2>
          <div className="space-y-3">
            {twits.map(t => (
              <div key={t.id} className="flex gap-3">
                {analyst.picture
                  ? <img src={analyst.picture} alt="" className="w-8 h-8 rounded-full flex-shrink-0 object-cover" />
                  : <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">{displayName?.[0]}</div>
                }
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-semibold">{displayName}</span>
                    <span className="text-[10px] text-muted-foreground">{new Date(t.created_date).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-foreground/90">{t.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reports */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <h2 className="font-semibold text-sm mb-4">Published Reports</h2>
        {myReports.filter(r => r.status === "published").length === 0 ? (
          <p className="text-sm text-muted-foreground">No reports published yet.</p>
        ) : (
          <div className="space-y-3">
            {myReports.filter(r => r.status === "published").map(r => <ReportCard key={r.id} report={r} compact />)}
          </div>
        )}
      </div>

      {/* Accuracy Modal */}
      {showAccModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAccModal(false)}>
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-base mb-1">Prediction Accuracy</h3>
            <p className="text-3xl font-bold text-primary mb-4">{analyst.accuracy_score?.toFixed(1)}%</p>
            <p className="text-sm text-muted-foreground mb-4">Based on resolved locked predictions using STOA's Elo-based scoring system.</p>
            <button onClick={() => setShowAccModal(false)} className="w-full text-sm text-muted-foreground hover:text-foreground mt-2">Close</button>
          </div>
        </div>
      )}

      {/* Yield Modal */}
      {showYieldModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowYieldModal(false)}>
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-base mb-1">Average Yield</h3>
            <p className={`text-3xl font-bold mb-4 ${yieldColor}`}>{displayYield}</p>
            <p className="text-sm text-muted-foreground">Average return across {resolvedReports.length} resolved prediction{resolvedReports.length !== 1 ? "s" : ""}.</p>
            <button onClick={() => setShowYieldModal(false)} className="w-full text-sm text-muted-foreground hover:text-foreground mt-4">Close</button>
          </div>
        </div>
      )}

      {/* Subscribe Modal */}
      {showSubModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowSubModal(false)}>
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-base mb-1">Subscribe to {displayName}</h3>
            <p className="text-sm text-muted-foreground mb-4">Get full access to reports and predictions.</p>
            <button
              onClick={handleSubscribe}
              className="w-full text-left border border-border rounded-xl p-4 hover:border-primary/40 transition-all mb-3"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-sm">Monthly</span>
                <span className="font-bold text-primary">Free (Beta)</span>
              </div>
              <p className="text-xs text-muted-foreground">✓ Full report access · ✓ Premium predictions</p>
            </button>
            <button onClick={() => setShowSubModal(false)} className="w-full text-sm text-muted-foreground hover:text-foreground">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}