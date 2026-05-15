import React, { useState, useEffect, useMemo, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Target, TrendingUp, FileText, Star, Flame, Trophy, Users, Zap, ArrowUp, ArrowDown, Minus, BookOpen, Rocket, Shield, CheckCircle, BarChart3, ChevronRight, PenLine, Loader2, MessageCircle, Send, Lock, Eye, Heart, Clock, Crown } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import RevenueInsightsPanel from "@/components/dashboard/RevenueInsightsPanel";
import TwitsPanel from "@/components/dashboard/TwitsPanel";
import WatchlistPanel from "@/components/dashboard/WatchlistPanel";
import { useNavigate, Link } from "react-router-dom";
import { computeAvgYield, formatYield } from "@/lib/yieldCalc";
import { computeScore } from "@/lib/scoringEngine";
import { loadMyWallet } from "@/lib/walletService";
import { fetchLockPrice } from "@/lib/priceLockProvider";
import { computeAnalystTier } from "@/lib/analystTier";
import AccuracyTierBadge from "@/components/feed/AccuracyTierBadge";
import TierProgressBar from "@/components/analyst/TierProgressBar";

const ACTION_ICONS = { Long: ArrowUp, Short: ArrowDown, Hold: Minus };

// ── Inline DM component for dashboard ────────────────────────────────────────
function DashboardDMs({ subscriptions, currentUser }) {
  const [selectedAnalyst, setSelectedAnalyst] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const openDM = (sub) => {
    setSelectedAnalyst(sub);
    setMessages([]);
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    const text = input.trim();
    setInput("");
    const newMsg = { id: Date.now(), from: "me", text, time: "just now" };
    setMessages(prev => [...prev, newMsg]);
    // Send notification to the analyst
    try {
      await base44.entities.Notification.create({
        user_email: selectedAnalyst.analyst_email,
        type: "report",
        title: `New message from ${currentUser.full_name || currentUser.email?.split("@")[0]}`,
        body: text,
        link: "/dm",
      });
    } catch {}
    setSending(false);
  };

  if (subscriptions.length === 0) {
    return (
      <div className="text-center py-10">
        <Lock className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm font-medium text-muted-foreground">No subscriptions yet</p>
        <p className="text-xs text-muted-foreground/60">Subscribe to a researcher to message them.</p>
      </div>
    );
  }

  return (
    <div className="flex gap-3" style={{ minHeight: 360 }}>
      {/* Analyst list */}
      <div className="w-44 flex-shrink-0 space-y-1 border-r border-border pr-3">
        {subscriptions.map(sub => (
          <button
            key={sub.id}
            onClick={() => openDM(sub)}
            className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-all ${selectedAnalyst?.id === sub.id ? "bg-primary/10 text-primary" : "hover:bg-secondary"}`}
          >
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0 overflow-hidden">
              {sub.analyst_avatar
                ? <img src={sub.analyst_avatar} alt={sub.analyst_name} className="w-full h-full object-cover" />
                : (sub.analyst_name || "A")[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate">{sub.analyst_name || sub.analyst_email}</p>
              <p className="text-[10px] text-muted-foreground">Subscribed</p>
            </div>
          </button>
        ))}
      </div>

      {/* Chat area */}
      {selectedAnalyst ? (
        <div className="flex-1 flex flex-col gap-2">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <MessageCircle className="w-3.5 h-3.5 text-primary" />
            <span className="text-sm font-semibold">{selectedAnalyst.analyst_name}</span>
            <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1"><Lock className="w-3 h-3" /> Subscribers only</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 max-h-60 pr-1">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.from === "me" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-xs rounded-xl px-3 py-2 text-sm ${msg.from === "me" ? "bg-primary text-white" : "bg-secondary text-foreground"}`}>
                  {msg.text}
                  <p className={`text-[10px] mt-0.5 ${msg.from === "me" ? "text-white/60" : "text-muted-foreground"}`}>{msg.time}</p>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
          <div className="flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send()}
              placeholder="Send a message..."
              className="flex-1 text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              disabled={sending}
            />
            <Button size="sm" onClick={send} disabled={!input.trim() || sending} className="h-9 w-9 p-0">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Select a researcher to message</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AnalystDashboard() {
  const [tab, setTab] = useState("published");
  const [boosts, setBoosts] = useState({ r6: true });
  const [profileBoosted, setProfileBoosted] = useState(false);
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(null);
  const [myReports, setMyReports] = useState([]);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingReports, setLoadingReports] = useState(true);
  const [mySubscriptions, setMySubscriptions] = useState([]);
  const [purchasedReports, setPurchasedReports] = useState([]);
  const [subscriptionReports, setSubscriptionReports] = useState([]);
  const [wallet, setWallet] = useState(null);

  useEffect(() => {
    base44.auth.me().then(async user => {
      setCurrentUser(user);
      base44.analytics.track({ eventName: "dashboard_viewed" });
      // Load wallet for AI credits
      loadMyWallet().then(({ wallet: w }) => setWallet(w)).catch(() => {});
      // Load subscriptions + their reports + purchased reports
      Promise.all([
        base44.entities.Subscription.filter({ subscriber_email: user.email, status: "active" }, "-created_date", 20).catch(() => []),
        base44.entities.WalletTransaction.filter({ created_by: user.email, type: "report_unlock" }, "-created_date", 50).catch(() => []),
        base44.entities.Report.filter({ status: "published" }, "-likes", 150).catch(() => []),
      ]).then(([subs, txns, allPub]) => {
        setMySubscriptions(subs || []);
        // Purchased reports
        const unlockedIds = new Set((txns || []).map(t => t.related_id).filter(Boolean));
        setPurchasedReports((allPub || []).filter(r => unlockedIds.has(r.id)).slice(0, 8));
        // Subscription reports
        const subEmails = new Set((subs || []).map(s => s.analyst_email).filter(Boolean));
        setSubscriptionReports((allPub || [])
          .filter(r => subEmails.has(r.created_by))
          .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
          .slice(0, 8));
      }).catch(() => {});
      // Pioneer check: if not set, check if user is among first 100
      if (!user.is_pioneer) {
        try {
          const allUsers = await base44.entities.User.list("created_date", 200);
          const sorted = (allUsers || []).sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
          const first100Emails = sorted.slice(0, 100).map(u => u.email);
          if (first100Emails.includes(user.email)) {
            await base44.auth.updateMe({ is_pioneer: true });
            setCurrentUser(prev => ({ ...prev, is_pioneer: true }));
          }
        } catch {}
      }
    }).finally(() => setLoadingUser(false));
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    base44.entities.Report.filter({ created_by: currentUser.email }, "-created_date", 200)
      .then(async data => {
        const reports = data || [];
        // Auto-publish any scheduled reports whose time has passed
        const now = new Date();
        const toPublish = reports.filter(r =>
          r.status === "scheduled" && r.scheduled_at && new Date(r.scheduled_at) <= now
        );
        await Promise.all(toPublish.map(async r => {
          const ticker = r.prediction_ticker || r.stock_ticker;
          let lockData = {};
          if (ticker && !r.prediction_lock_price) {
            try {
              const locked = await fetchLockPrice(ticker);
              if (locked?.price) {
                lockData = {
                  prediction_lock_price: locked.price,
                  prediction_lock_time: locked.timestamp,
                  prediction_lock_source: locked.source,
                };
              }
            } catch { /* proceed without lock if fetch fails */ }
          }
          return base44.entities.Report.update(r.id, { status: "published", scheduled_at: null, ...lockData }).catch(() => {});
        }));
        if (toPublish.length > 0) {
          const updated = await base44.entities.Report.filter({ created_by: currentUser.email }, "-created_date", 200).catch(() => reports);
          setMyReports(updated || reports);
        } else {
          setMyReports(reports);
        }
      })
      .finally(() => setLoadingReports(false));
  }, [currentUser]);

  const publishedReports  = useMemo(() => myReports.filter(r => r.status === "published"), [myReports]);
  const scheduledReports  = useMemo(() => myReports.filter(r => r.status === "scheduled"), [myReports]);
  const draftReports      = useMemo(() => myReports.filter(r => r.status !== "published" && r.status !== "scheduled"), [myReports]);
  const predictions = useMemo(() => publishedReports.filter(r => r.prediction_action), [publishedReports]);

  // Compute yield from resolved reports
  const computedYield = useMemo(() => computeAvgYield(publishedReports), [publishedReports]);
  const yieldDisplay = useMemo(() => formatYield(computedYield), [computedYield]);

  // Compute score using the same engine as the profile page
  const scoring = useMemo(() => computeScore(publishedReports), [publishedReports]);
  const accuracyScore = scoring.total > 0 ? scoring.score : 0;

  const achievements = useMemo(() => {
    if (!currentUser) return [];
    const hasFirstReport = publishedReports.length >= 1;
    const has10Preds = predictions.length >= 10;
    const has80Acc = accuracyScore >= 80;
    const has100Followers = (currentUser.followers_count || 0) >= 100;
    const has500Followers = (currentUser.followers_count || 0) >= 500;
    const hasFirstPremium = publishedReports.some(r => r.is_premium);
    const hasStreak3 = false; // requires resolved prediction data
    const isTop10 = currentUser.leaderboard_rank > 0 && currentUser.leaderboard_rank <= 10;
    return [
      { label: "First Report", icon: FileText, earned: hasFirstReport },
      { label: "10 Predictions", icon: Target, earned: has10Preds },
      { label: "80%+ Accuracy", icon: BarChart3, earned: has80Acc },
      { label: "100 Followers", icon: Users, earned: has100Followers },
      { label: "500 Followers", icon: Users, earned: has500Followers },
      { label: "First Premium Report", icon: Star, earned: hasFirstPremium },
      { label: "Streak x3", icon: Flame, earned: hasStreak3 },
      { label: "Top 10 Researcher", icon: Trophy, earned: isTop10 },
      { label: "1,000 Likes", icon: CheckCircle, earned: false },
      { label: "50 Reports", icon: BookOpen, earned: publishedReports.length >= 50 },
      { label: "90%+ Accuracy", icon: Shield, earned: accuracyScore >= 90 },
      { label: "Streak x10", icon: Rocket, earned: false },
    ];
  }, [currentUser, myReports, predictions, accuracyScore]);

  if (loadingUser) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );
  if (!currentUser) return null;

  const analyst = {
    name: currentUser.full_name || currentUser.email?.split("@")[0] || "Researcher",
    avatar: currentUser.picture || null,
    tagline: currentUser.tagline || "Researcher",
    reports: publishedReports.length,
    followers: currentUser.followers_count || 0,
  };

  const resolvedCount = predictions.filter(r => r.prediction_outcome && r.prediction_outcome !== "pending").length;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* ── Profile Header — editorial hero ── */}
      <div className="surface-premium p-7 mb-7">
        <div className="flex items-start gap-5 flex-wrap">
          <div className="relative">
            {analyst.avatar
              ? <img src={analyst.avatar} alt={analyst.name} className="w-20 h-20 rounded-full border-[3px] border-card object-cover shadow-card-md ring-1 ring-border" />
              : <div className="w-20 h-20 rounded-full border-[3px] border-card shadow-card-md ring-1 ring-border bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-3xl font-bold text-white">{analyst.name?.[0] || "A"}</div>
            }
            <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gain border-2 border-card" title="Active" />
          </div>

          <div className="flex-1 min-w-[240px]">
            <span className="eyebrow">Creator Studio</span>
            <div className="flex items-center gap-2 flex-wrap mt-1.5 mb-1.5">
              <h1 className="text-2xl font-bold text-foreground">{analyst.name}</h1>
              <AccuracyTierBadge tierData={computeAnalystTier(currentUser, publishedReports)} size="lg" />
            </div>
            <p className="text-sm text-muted-foreground mb-3">{analyst.tagline}</p>
            <div className="flex flex-wrap gap-2">
              <span className="pill"><FileText className="w-3 h-3" />{analyst.reports} Reports</span>
              <span className="pill"><Users className="w-3 h-3" />{analyst.followers.toLocaleString()} Followers</span>
              {resolvedCount > 0 && <span className="pill pill-accent"><Target className="w-3 h-3" />{resolvedCount} Resolved</span>}
              {currentUser.last_login && (
                <span className="pill"><Clock className="w-3 h-3" />Active {formatDistanceToNow(new Date(currentUser.last_login), { addSuffix: true })}</span>
              )}
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Link to="/editor"><Button size="sm" className="gap-1.5 shadow-card"><PenLine className="w-3.5 h-3.5" /> Write Report</Button></Link>
            <Link to="/analyst"><Button variant="outline" size="sm" className="gap-1.5"><Eye className="w-3.5 h-3.5" /> Public Profile</Button></Link>
            <Link to="/creator-analytics"><Button variant="outline" size="sm" className="gap-1.5"><BarChart3 className="w-3.5 h-3.5" /> Analytics</Button></Link>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setTab("messages")} style={{ scrollMarginTop: 100 }}>
              <MessageCircle className="w-3.5 h-3.5" /> Messages
            </Button>
          </div>
        </div>
      </div>

      {/* ── Stats Grid — hero score + supporting KPIs ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-7">
        {/* Hero stat: Score */}
        <button onClick={() => navigate("/predictions")} className="stat-card stat-card-hero md:row-span-1">
          <div className="flex items-center justify-between mb-2">
            <span className="stat-card-label flex items-center gap-1.5"><Target className="w-3.5 h-3.5 text-primary/70" />Score</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
          </div>
          <p className="stat-card-value">{scoring.total > 0 ? accuracyScore : "—"}</p>
          <p className="stat-card-sub">{scoring.total > 0 ? `${scoring.hits}W · ${scoring.misses}L · ${scoring.total} resolved` : `${predictions.length} prediction${predictions.length === 1 ? "" : "s"} · none resolved yet`}</p>
        </button>

        {/* AI Credits */}
        <button onClick={() => navigate("/wallet")} className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <span className="stat-card-label flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" style={{ color: "hsl(var(--accent))" }} />AI Credits</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
          </div>
          <p className="stat-card-value">{(wallet?.ai_credits ?? 0).toLocaleString()}</p>
          <p className="stat-card-sub">Available balance</p>
        </button>

        {/* Yield */}
        <button onClick={() => navigate("/analytics?category=yield")} className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <span className="stat-card-label flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5" />Avg Yield</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
          </div>
          <p className={`stat-card-value ${computedYield == null ? "text-muted-foreground" : computedYield >= 0 ? "text-gain" : "text-loss"}`}>{yieldDisplay}</p>
          <p className="stat-card-sub">{computedYield != null ? `${resolvedCount} resolved prediction${resolvedCount === 1 ? "" : "s"}` : "No resolved predictions yet"}</p>
        </button>

        {/* Followers */}
        <button onClick={() => navigate("/analytics?category=followers")} className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <span className="stat-card-label flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />Followers</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
          </div>
          <p className="stat-card-value">{analyst.followers.toLocaleString()}</p>
          <p className="stat-card-sub">Total followers</p>
        </button>
      </div>

      {/* ── Performance Spotlight — dark navy hero card (Figma-inspired) ── */}
      {publishedReports.length > 0 && (() => {
        const totalLikes = publishedReports.reduce((s, r) => s + (r.likes || 0), 0);
        const totalViews = publishedReports.reduce((s, r) => s + (r.views || 0), 0);
        const topReport  = [...publishedReports].sort((a, b) => (b.likes || 0) - (a.likes || 0))[0];
        return (
          <div className="rounded-2xl p-6 mb-7 text-white relative overflow-hidden" style={{ background: "linear-gradient(135deg, #0d1f3c 0%, #1e3a6e 100%)" }}>
            {/* Gold glow */}
            <div className="absolute top-0 right-0 w-72 h-72 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(201,150,19,0.12) 0%, transparent 70%)", transform: "translate(30%,-30%)" }} />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-5">
                <span className="w-2 h-2 rounded-full bg-gain animate-pulse" />
                <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/50">Performance Snapshot</span>
              </div>
              <div className="grid grid-cols-3 gap-6 mb-5">
                {[
                  { label: "Total Likes", value: totalLikes.toLocaleString() },
                  { label: "Total Views", value: totalViews.toLocaleString() },
                  { label: "Published", value: publishedReports.length },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-white/45 text-[10px] uppercase tracking-wider mb-1">{label}</p>
                    <p className="text-3xl font-extrabold tracking-tight" style={{ fontVariantNumeric: "tabular-nums" }}>{value}</p>
                  </div>
                ))}
              </div>
              {topReport && (
                <div className="pt-4 border-t border-white/10">
                  <p className="text-white/35 text-[10px] uppercase tracking-wider mb-1.5">Top Report by Likes</p>
                  <Link to={`/report?id=${topReport.id}`} className="text-sm font-semibold hover:underline truncate block" style={{ color: "hsl(var(--accent))" }}>
                    {topReport.title}
                  </Link>
                  <p className="text-white/35 text-[11px] mt-0.5">{topReport.likes || 0} likes · {topReport.views || 0} views</p>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Achievements */}
      <div className="surface p-6 mb-7">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "hsl(var(--accent) / 0.12)" }}>
              <Trophy className="w-4 h-4" style={{ color: "hsl(var(--accent))" }} />
            </div>
            <div>
              <h2 className="font-semibold text-sm leading-tight">Achievements</h2>
              <span className="text-[11px] text-muted-foreground">{achievements.filter(a => a.earned).length} of {achievements.length} unlocked</span>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5">
            <div className="w-32 h-1.5 rounded-full bg-secondary overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(achievements.filter(a => a.earned).length / achievements.length) * 100}%`, background: "linear-gradient(90deg, hsl(var(--accent)), hsl(var(--accent) / 0.7))" }} />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
          {achievements.map(a => {
            const Icon = a.icon;
            return (
              <div key={a.label} className={`group relative flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border text-center transition-all ${a.earned ? "bg-card border-accent/30 hover:border-accent/60 hover:-translate-y-0.5 hover:shadow-card-md" : "bg-secondary/40 border-border/60 opacity-50 grayscale"}`}>
                <Icon className={`w-5 h-5 ${a.earned ? "" : "text-muted-foreground"}`} style={a.earned ? { color: "hsl(var(--accent))" } : undefined} />
                <span className="text-[10px] font-semibold leading-tight">{a.label}</span>
                {a.earned && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full" style={{ background: "hsl(var(--accent))" }} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* My Subscriptions */}
      <div className="bg-card border border-border rounded-2xl p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/8">
              <Crown className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-sm leading-tight">My Subscriptions</h2>
              <span className="text-[11px] text-muted-foreground">{mySubscriptions.length} active</span>
            </div>
          </div>
          <Link to="/feed" className="text-xs text-primary hover:underline flex items-center gap-0.5">
            Full feed <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        {mySubscriptions.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-border rounded-xl">
            <Crown className="w-7 h-7 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-1">No active subscriptions</p>
            <p className="text-xs text-muted-foreground/60">Subscribe to researchers to get premium access and see their reports here.</p>
          </div>
        ) : (
          <>
            {/* Analyst chips */}
            <div className="flex flex-wrap gap-2 mb-5">
              {mySubscriptions.map(sub => {
                const name = sub.analyst_name || sub.analyst_email?.split("@")[0] || "Researcher";
                return (
                  <Link
                    key={sub.id}
                    to={`/analyst/${sub.analyst_email?.split("@")[0]}`}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 transition-all group"
                  >
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0 overflow-hidden">
                      {sub.analyst_avatar
                        ? <img src={sub.analyst_avatar} alt={name} className="w-full h-full object-cover" />
                        : name[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-semibold truncate max-w-[90px] group-hover:text-primary transition-colors">{name}</p>
                      <p className="text-[9px] text-muted-foreground capitalize">{sub.plan || "monthly"}</p>
                    </div>
                    <span className="text-[9px] font-bold text-gain bg-gain/10 border border-gain/20 px-1.5 py-0.5 rounded-full ml-1">Active</span>
                  </Link>
                );
              })}
            </div>
            {/* Recent reports from subscribed analysts */}
            {subscriptionReports.length > 0 && (
              <>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Recent from your subscriptions</p>
                <div className="divide-y divide-border">
                  {subscriptionReports.map((report) => {
                    const outcome = report.prediction_outcome;
                    const isHit = outcome === "hit" || outcome === "near";
                    const isMiss = outcome === "miss";
                    const isPending = !outcome || outcome === "pending";
                    const dir = report.prediction_direction || report.prediction_action;
                    return (
                      <div
                        key={report.id}
                        onClick={() => navigate(`/report?id=${report.id}`)}
                        className="flex items-center gap-3 py-3 px-1 cursor-pointer hover:bg-secondary/40 rounded-xl transition-colors group"
                      >
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-primary/7">
                          <FileText className="w-4 h-4 text-primary/60" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm leading-snug truncate group-hover:text-primary transition-colors">{report.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-muted-foreground">{report.author_name || report.created_by?.split("@")[0]}</span>
                            {report.stock_ticker && (
                              <span className="text-[10px] font-mono font-bold text-primary/70 bg-primary/8 px-1.5 py-0.5 rounded">{report.stock_ticker}</span>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          {!isPending && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isHit ? "bg-gain/10 text-gain" : "bg-loss/10 text-loss"}`}>
                              {isHit ? "Hit ✓" : "Miss ✗"}
                            </span>
                          )}
                          {dir && isPending && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/8 text-primary">{dir}</span>
                          )}
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 shrink-0 group-hover:text-primary/50 transition-colors" />
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Reports You've Unlocked */}
      {purchasedReports.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-50">
                <Lock className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <h2 className="font-semibold text-sm leading-tight">Reports You've Unlocked</h2>
                <span className="text-[11px] text-muted-foreground">{purchasedReports.length} reports</span>
              </div>
            </div>
            <Link to="/feed" className="text-xs text-primary hover:underline flex items-center gap-0.5">
              Discover more <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {purchasedReports.map((report) => {
              const outcome = report.prediction_outcome;
              const isHit = outcome === "hit" || outcome === "near";
              const isMiss = outcome === "miss";
              const isPending = !outcome || outcome === "pending";
              const dir = report.prediction_direction || report.prediction_action;
              return (
                <div
                  key={report.id}
                  onClick={() => navigate(`/report?id=${report.id}`)}
                  className="flex items-center gap-3 py-3 px-1 cursor-pointer hover:bg-amber-50/50 rounded-xl transition-colors group"
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-amber-50">
                    <Lock className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm leading-snug truncate group-hover:text-primary transition-colors">{report.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-muted-foreground">{report.author_name || report.created_by?.split("@")[0]}</span>
                      {report.stock_ticker && (
                        <span className="text-[10px] font-mono font-bold text-primary/70 bg-primary/8 px-1.5 py-0.5 rounded">{report.stock_ticker}</span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    {!isPending && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isHit ? "bg-gain/10 text-gain" : "bg-loss/10 text-loss"}`}>
                        {isHit ? "Hit ✓" : "Miss ✗"}
                      </span>
                    )}
                    {dir && isPending && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/8 text-primary">{dir}</span>
                    )}
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 shrink-0 group-hover:text-primary/50 transition-colors" />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tier Progress */}
      <TierProgressBar user={currentUser} allReports={publishedReports} />

      {/* Reports Tabs */}
      <div className="surface p-6 mb-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center">
              <FileText className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-sm leading-tight">My Reports</h2>
              <span className="text-[11px] text-muted-foreground">{publishedReports.length} published</span>
            </div>
          </div>
          <Link to="/editor"><Button size="sm" className="gap-1.5 text-xs"><PenLine className="w-3 h-3" /> New Report</Button></Link>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-5 pb-4 border-b border-border">
          {[
            { id: "published", label: `Published`, count: publishedReports.length },
            { id: "scheduled", label: `Scheduled`, count: scheduledReports.length, hidden: scheduledReports.length === 0 },
            { id: "drafts", label: `Drafts`, count: draftReports.length },
            { id: "boost", label: "Boost", count: null },
            { id: "profile-boost", label: "Profile Boost", count: null },
            { id: "subscriptions", label: "Subscribed", count: null },
          ].filter(t => !t.hidden).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${tab === t.id ? "bg-primary text-white shadow-glow-navy" : "text-muted-foreground bg-secondary hover:text-foreground"}`}>
              {t.label}
              {t.count != null && <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${tab === t.id ? "bg-white/20" : "bg-border"}`}>{t.count}</span>}
            </button>
          ))}
        </div>

        {tab === "published" && (
          <div>
            {loadingReports ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : publishedReports.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center mx-auto mb-3">
                  <FileText className="w-6 h-6 text-primary/30" />
                </div>
                <p className="text-sm font-semibold text-muted-foreground mb-1">No published reports yet</p>
                <p className="text-xs text-muted-foreground/60 mb-4">Publish your first research report to build your track record.</p>
                <Link to="/editor"><Button size="sm" className="gap-1.5"><PenLine className="w-3.5 h-3.5" /> Write Your First Report</Button></Link>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {publishedReports.map((report, i) => {
                  const outcome = report.prediction_outcome;
                  const isHit  = outcome === "hit" || outcome === "near";
                  const isMiss = outcome === "miss";
                  const isPending = !outcome || outcome === "pending";
                  const ActionIcon = ACTION_ICONS[report.prediction_action] || Minus;
                  return (
                    <div key={report.id}
                      onClick={() => navigate(`/report?id=${report.id}`)}
                      className="flex items-center gap-4 py-3.5 px-2 cursor-pointer hover:bg-secondary/40 rounded-xl transition-colors group">
                      {/* Icon */}
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all group-hover:scale-105"
                        style={{ background: isHit ? "hsl(var(--gain)/0.10)" : isMiss ? "hsl(var(--loss)/0.10)" : "hsl(var(--primary)/0.07)" }}>
                        <FileText className="w-4.5 h-4.5"
                          style={{ color: isHit ? "hsl(var(--gain))" : isMiss ? "hsl(var(--loss))" : "hsl(var(--primary))" }} />
                      </div>
                      {/* Title + meta */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm leading-snug truncate group-hover:text-primary transition-colors">{report.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-muted-foreground">{format(new Date(report.created_date), "MMM d, yyyy")}</span>
                          <span className="text-muted-foreground/30">·</span>
                          <span className="text-[11px] text-muted-foreground flex items-center gap-0.5"><Eye className="w-2.5 h-2.5" />{report.views || 0}</span>
                          <span className="text-muted-foreground/30">·</span>
                          <span className="text-[11px] text-muted-foreground flex items-center gap-0.5"><Heart className="w-2.5 h-2.5" />{report.likes || 0}</span>
                          {report.stock_ticker && <span className="text-[10px] font-mono font-bold text-primary/70 bg-primary/8 px-1.5 py-0.5 rounded">{report.stock_ticker}</span>}
                        </div>
                      </div>
                      {/* Status badge */}
                      <div className="shrink-0 text-right">
                        {outcome && outcome !== "pending" ? (
                          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${isHit ? "bg-gain/10 text-gain" : "bg-loss/10 text-loss"}`}>
                            {isHit ? "Hit ✓" : "Miss ✗"}
                          </span>
                        ) : report.prediction_action ? (
                          <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-primary/8 text-primary">
                            <ActionIcon className="w-3 h-3" />{report.prediction_action}
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-secondary text-muted-foreground">Published</span>
                        )}
                        <p className="text-[10px] text-muted-foreground/50 mt-0.5 tabular-nums">#{String(i + 1).padStart(3, "0")}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/30 shrink-0 group-hover:text-primary/50 transition-colors" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === "scheduled" && (
          <div className="space-y-2">
            {scheduledReports.length === 0 ? (
              <div className="text-center py-10">
                <Clock className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No scheduled reports</p>
                <p className="text-xs text-muted-foreground/60">Use "Schedule for later" in the editor.</p>
              </div>
            ) : (
              scheduledReports
                .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
                .map(r => {
                  const goLive = new Date(r.scheduled_at);
                  const diffMs = goLive - Date.now();
                  const diffH = Math.floor(diffMs / 3600000);
                  const diffM = Math.floor((diffMs % 3600000) / 60000);
                  const countdown = diffH > 24
                    ? `in ${Math.floor(diffH / 24)}d ${diffH % 24}h`
                    : diffH > 0 ? `in ${diffH}h ${diffM}m` : `in ${diffM}m`;
                  return (
                    <div key={r.id} className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                      <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{r.title || "Untitled"}</p>
                        <p className="text-xs text-amber-700">
                          Goes live {goLive.toLocaleDateString([], { month: "short", day: "numeric" })} at {goLive.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · <span className="font-semibold">{countdown}</span>
                        </p>
                      </div>
                      <button
                        className="text-xs text-red-500 hover:text-red-700 font-medium"
                        onClick={async () => {
                          await base44.entities.Report.update(r.id, { status: "draft", scheduled_at: null }).catch(() => {});
                          setMyReports(prev => prev.map(x => x.id === r.id ? { ...x, status: "draft", scheduled_at: null } : x));
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  );
                })
            )}
          </div>
        )}

        {tab === "drafts" && (
          <div className="space-y-2">
            {loadingReports ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : draftReports.length === 0 ? (
              <div className="text-center py-10">
                <PenLine className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No drafts yet</p>
                <p className="text-xs text-muted-foreground/60 mb-4">Start writing to auto-save drafts here.</p>
                <Link to="/editor"><Button size="sm" variant="outline" className="text-xs">Start Writing</Button></Link>
              </div>
            ) : (
              draftReports.map(draft => (
                <div key={draft.id} className="flex items-center gap-3 p-3 bg-secondary rounded-xl cursor-pointer hover:bg-secondary/70 transition-all" onClick={() => navigate(`/editor?draft=${draft.id}`)}>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{draft.title || "Untitled Draft"}</p>
                    <p className="text-xs text-muted-foreground">Last edited {format(new Date(draft.updated_date || draft.created_date), "MMM d, yyyy")}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs">Draft</Badge>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              ))
            )}
          </div>
        )}

        {tab === "boost" && (
          <div>
            <p className="text-sm text-muted-foreground mb-4">Boost a report to increase its reach across the platform.</p>
            <div className="space-y-2">
              {publishedReports.map(report => (
                <div key={report.id} className="flex items-center gap-3 p-3 bg-secondary rounded-xl">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{report.title}</p>
                    <p className="text-xs text-muted-foreground">{report.likes || 0} likes</p>
                  </div>
                  {boosts[report.id] ? (
                    <span className="text-xs font-semibold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">Promoted</span>
                  ) : (
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => setBoosts(prev => ({ ...prev, [report.id]: true }))}>Boost</Button>
                  )}
                </div>
              ))}
              {publishedReports.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Publish a report first to boost it.</p>}
            </div>
          </div>
        )}

        {tab === "profile-boost" && (
          <div>
            <p className="text-sm text-muted-foreground mb-4">Boost your researcher profile to appear higher in the Leaderboard and gain more followers.</p>
            {profileBoosted ? (
              <div className="text-center py-6">
                <p className="font-bold text-base mb-1">Profile Promoted</p>
                <p className="text-sm text-muted-foreground">Your profile is being promoted to new followers for 7 days.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {[
                  { label: "7 Day Boost", price: "$9.99", reach: "~2,000 impressions", Icon: Rocket },
                  { label: "30 Day Boost", price: "$29.99", reach: "~10,000 impressions", Icon: Flame },
                  { label: "Featured Researcher", price: "$79.99", reach: "Homepage feature for 7 days", Icon: Star },
                ].map(plan => (
                  <button key={plan.label} onClick={() => setProfileBoosted(true)} className="w-full flex items-center gap-4 p-4 border border-border rounded-xl hover:border-primary/30 hover:bg-primary/5 text-left transition-all">
                    <plan.Icon className="w-5 h-5 text-primary flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{plan.label}</p>
                      <p className="text-xs text-muted-foreground">{plan.reach}</p>
                    </div>
                    <span className="font-bold text-sm text-primary">{plan.price}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "subscriptions" && (
          <div className="text-center py-8">
            <Users className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Subscriptions coming soon.</p>
          </div>
        )}

        {tab === "messages" && (
          <DashboardDMs subscriptions={mySubscriptions} currentUser={currentUser} />
        )}
      </div>

      {/* Watchlist */}
      <WatchlistPanel reports={myReports} />

      {/* Revenue & Twits */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-7">
        <RevenueInsightsPanel />
        <TwitsPanel currentUser={currentUser} />
      </div>

      {/* ── Level-Up Promo Card — Figma-inspired navy/gold CTA ── */}
      <div className="rounded-2xl p-7 relative overflow-hidden mb-4" style={{ background: "linear-gradient(135deg, #0d1f3c 0%, #1a3060 60%, #1e3a6e 100%)" }}>
        {/* Gold accent glow */}
        <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(201,150,19,0.18) 0%, transparent 65%)", transform: "translate(25%, 35%)" }} />
        <div className="absolute top-4 right-6 text-4xl select-none">📈</div>
        <div className="relative z-10 max-w-sm">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/40 mb-3">Grow your influence</p>
          <h3 className="text-2xl font-extrabold text-white leading-tight mb-2 tracking-tight">
            Level up your<br />researcher profile.
          </h3>
          <p className="text-sm text-white/50 mb-6 leading-relaxed">
            Boost your reach, attract subscribers and build a verified track record that investors trust.
          </p>
          <div className="flex gap-3">
            <Link to="/analyst?edit=1">
              <button className="px-5 py-2.5 rounded-xl font-bold text-sm transition-all hover:-translate-y-0.5"
                style={{ background: "hsl(var(--accent))", color: "#fff", boxShadow: "0 4px 20px rgba(201,150,19,0.4)" }}>
                Edit My Profile
              </button>
            </Link>
            <Link to="/creator-analytics">
              <button className="px-5 py-2.5 rounded-xl font-semibold text-sm text-white/70 border border-white/15 hover:border-white/30 hover:text-white transition-all">
                View Analytics
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}