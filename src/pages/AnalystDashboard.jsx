import React, { useState, useEffect, useMemo, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Target, TrendingUp, FileText, Star, Flame, Trophy, Users, Zap, ArrowUp, ArrowDown, Minus, BookOpen, Rocket, Shield, CheckCircle, BarChart3, ChevronRight, PenLine, Loader2, MessageCircle, Send, Lock, Eye, Heart } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import RevenueInsightsPanel from "@/components/dashboard/RevenueInsightsPanel";
import TwitsPanel from "@/components/dashboard/TwitsPanel";
import WatchlistPanel from "@/components/dashboard/WatchlistPanel";
import { useNavigate, Link } from "react-router-dom";
import { calculateAccuracyScore } from "@/lib/accuracyScore";
import { computeAvgYield, formatYield } from "@/lib/yieldCalc";
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
        <p className="text-xs text-muted-foreground/60">Subscribe to an analyst to message them.</p>
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
            <p className="text-sm">Select an analyst to message</p>
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

  useEffect(() => {
    base44.auth.me().then(async user => {
      setCurrentUser(user);
      base44.analytics.track({ eventName: "dashboard_viewed" });
      // Load subscriptions
      base44.entities.Subscription.filter({ subscriber_email: user.email, status: "active" }, "-created_date", 20)
        .then(data => setMySubscriptions(data || [])).catch(() => {});
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
    // Load ALL reports (both published and draft) so the analyst sees everything
    base44.entities.Report.filter({ created_by: currentUser.email }, "-created_date", 200)
      .then(data => setMyReports(data || []))
      .finally(() => setLoadingReports(false));
  }, [currentUser]);

  const publishedReports = useMemo(() => myReports.filter(r => r.status === "published"), [myReports]);
  const draftReports = useMemo(() => myReports.filter(r => r.status !== "published"), [myReports]);
  const predictions = useMemo(() => publishedReports.filter(r => r.prediction_action), [publishedReports]);

  // Compute yield from resolved reports
  const computedYield = useMemo(() => computeAvgYield(publishedReports), [publishedReports]);
  const yieldDisplay = useMemo(() => formatYield(computedYield), [computedYield]);

  // Use stored accuracy_score from User entity (updated by checkPredictions), fall back to engine
  const accuracyScore = useMemo(() => {
    if (currentUser?.accuracy_score != null && currentUser.accuracy_score > 0) {
      return currentUser.accuracy_score.toFixed(1);
    }
    if (predictions.length === 0) return 0;
    const mapped = predictions
      .filter(r => r.prediction_lock_price && r.prediction_resolved_price)
      .map(r => ({
        action: r.prediction_action === "Long" ? "BUY" : r.prediction_action === "Short" ? "SELL" : "HOLD",
        entryPrice: r.prediction_lock_price,
        exitPrice: r.prediction_resolved_price,
        targetPrice: r.prediction_target_price || null,
        daysHeld: r.prediction_lock_time && r.prediction_resolved_time
          ? Math.max(1, Math.round((new Date(r.prediction_resolved_time) - new Date(r.prediction_lock_time)) / 86400000))
          : 30,
        benchmarkReturn: 0,
        sector: r.industry || "default",
      }));
    if (mapped.length === 0) return 0;
    return calculateAccuracyScore(mapped).score.toFixed(1);
  }, [currentUser, predictions]);

  const achievements = useMemo(() => {
    if (!currentUser) return [];
    const hasFirstReport = publishedReports.length >= 1;
    const has10Preds = predictions.length >= 10;
    const has80Acc = parseFloat(accuracyScore) >= 80;
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
      { label: "Top 10 Analyst", icon: Trophy, earned: isTop10 },
      { label: "1,000 Likes", icon: CheckCircle, earned: false },
      { label: "50 Reports", icon: BookOpen, earned: publishedReports.length >= 50 },
      { label: "90%+ Accuracy", icon: Shield, earned: parseFloat(accuracyScore) >= 90 },
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
    name: currentUser.full_name || currentUser.email?.split("@")[0] || "Analyst",
    avatar: currentUser.picture || null,
    tagline: currentUser.tagline || "Analyst",
    reports: publishedReports.length,
    followers: currentUser.followers_count || 0,
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Profile Header */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <div className="flex items-start gap-4">
          {analyst.avatar
            ? <img src={analyst.avatar} alt={analyst.name} className="w-16 h-16 rounded-full border-2 border-border object-cover" />
            : <div className="w-16 h-16 rounded-full border-2 border-border bg-secondary flex items-center justify-center text-2xl font-bold text-primary">{analyst.name?.[0] || "A"}</div>
          }
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-xl font-bold">{analyst.name}</h1>
              <AccuracyTierBadge tierData={computeAnalystTier(currentUser, publishedReports)} size="lg" />
            </div>
            <p className="text-sm text-muted-foreground mb-2">{analyst.tagline}</p>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span>{analyst.reports} Reports</span>
              <span>{analyst.followers.toLocaleString()} Followers</span>
            </div>
            {(currentUser.last_login || currentUser.login_count > 0) && (
              <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
                <span>Last login: {currentUser.last_login ? formatDistanceToNow(new Date(currentUser.last_login), { addSuffix: true }) : "—"}</span>
                {currentUser.login_count > 0 && <><span>·</span><span>{currentUser.login_count} total logins</span></>}
              </div>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link to="/editor"><Button size="sm" className="text-xs gap-1"><span>+</span> Write Report</Button></Link>
            <Link to="/analyst"><Button variant="outline" size="sm" className="text-xs">View My Profile</Button></Link>
            <Link to="/creator-analytics"><Button variant="outline" size="sm" className="text-xs gap-1"><BarChart3 className="w-3.5 h-3.5" /> Analytics</Button></Link>
            <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => setTab("messages")} style={{ scrollMarginTop: 100 }}>
              <MessageCircle className="w-3.5 h-3.5" /> Messages
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { key: "predictions", label: "Elo Score", value: predictions.length > 0 ? `${accuracyScore}` : "—", icon: Target, color: "text-foreground", bg: "bg-secondary border-border", sub: currentUser.accuracy_rating ? `Elo ${currentUser.accuracy_rating} · ${currentUser.accuracy_tier || "Building"} · ${predictions.filter(r=>r.prediction_outcome && r.prediction_outcome !== "pending").length} resolved` : `${predictions.filter(r=>r.prediction_outcome && r.prediction_outcome !== "pending").length} resolved / ${predictions.length} total` },
          { key: "points", label: "AI Credits", value: (currentUser.ai_credits_balance ?? 100).toLocaleString(), icon: Zap, color: "text-foreground", bg: "bg-secondary border-border", sub: "Available balance" },
          { key: "yield", label: "Avg Prediction Yield", value: yieldDisplay, icon: TrendingUp, color: computedYield == null ? "text-muted-foreground" : computedYield >= 0 ? "text-gain" : "text-loss", bg: "bg-secondary border-border", sub: computedYield != null ? `${predictions.filter(r=>r.prediction_outcome && r.prediction_outcome !== "pending").length} resolved predictions` : "No resolved predictions yet" },
          { key: "followers", label: "Followers", value: analyst.followers.toLocaleString(), icon: Users, color: "text-foreground", bg: "bg-secondary border-border", sub: "Total followers" },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <button key={stat.key} onClick={() => navigate(stat.key === "predictions" ? "/predictions" : `/analytics?category=${stat.key}`)}
              className={`rounded-xl border p-4 text-left hover:shadow-md transition-all ${stat.bg}`}>
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-4 h-4 ${stat.color}`} />
                <span className="text-[10px] text-muted-foreground">{stat.label}</span>
              </div>
              <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-[10px] text-muted-foreground">{stat.sub}</p>
            </button>
          );
        })}
      </div>

      {/* Achievements */}
      <div className="bg-card border border-border rounded-2xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-sm">Achievements <span className="text-muted-foreground">{achievements.filter(a => a.earned).length}/{achievements.length} earned</span></h2>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {achievements.map(a => {
            const Icon = a.icon;
            return (
              <div key={a.label} className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-center transition-all ${a.earned ? "bg-primary/5 border-primary/20" : "bg-secondary border-border opacity-40"}`}>
                <Icon className={`w-4 h-4 ${a.earned ? "text-primary" : "text-muted-foreground"}`} />
                <span className="text-[9px] font-medium leading-tight">{a.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* My Subscriptions */}
      <div className="bg-card border border-border rounded-2xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Star className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-sm">My Subscriptions</h2>
        </div>
        {mySubscriptions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Subscribe to analysts to support their research and get premium access.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {mySubscriptions.map(sub => (
              <div key={sub.id} className="flex items-center gap-3 p-3 bg-secondary rounded-xl">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0 overflow-hidden">
                  {sub.analyst_avatar
                    ? <img src={sub.analyst_avatar} alt={sub.analyst_name} className="w-full h-full object-cover" />
                    : (sub.analyst_name || "A")[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{sub.analyst_name || sub.analyst_email}</p>
                  <p className="text-xs text-muted-foreground capitalize">{sub.plan || "monthly"} · {sub.valid_until ? `until ${new Date(sub.valid_until).toLocaleDateString()}` : "Active"}</p>
                </div>
                <span className="text-[10px] font-semibold text-gain bg-gain/10 border border-gain/20 px-2 py-0.5 rounded-full">Active</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tier Progress */}
      <TierProgressBar user={currentUser} allReports={publishedReports} />

      {/* Reports Tabs */}
      <div className="bg-card border border-border rounded-2xl p-5 mb-6">
        <div className="flex flex-wrap gap-2 mb-4">
          {[
            { id: "published", label: `Published (${publishedReports.length})` },
            { id: "drafts", label: `Drafts (${draftReports.length})` },
            { id: "boost", label: "Boost" },
            { id: "profile-boost", label: "Profile Boost" },
            { id: "subscriptions", label: "Subscribed" },
            { id: "messages", label: "Messages", hidden: true },
          ].filter(t => !t.hidden).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${tab === t.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === "published" && (
          <div className="space-y-2">
            {loadingReports ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : publishedReports.length === 0 ? (
              <div className="text-center py-10">
                <FileText className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No published reports yet</p>
                <p className="text-xs text-muted-foreground/60 mb-4">Publish your first research report to see it here.</p>
                <Link to="/editor"><Button size="sm" variant="outline" className="text-xs">Write Your First Report</Button></Link>
              </div>
            ) : (
              publishedReports.map(report => (
                <div key={report.id} className="flex items-center gap-3 p-3 bg-secondary rounded-xl cursor-pointer hover:bg-secondary/70 transition-all" onClick={() => navigate(`/report?id=${report.id}`)}>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{report.title}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{format(new Date(report.created_date), "MMM d, yyyy")}</span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1"><Eye className="w-3 h-3" />{report.views || 0}</span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1"><Heart className="w-3 h-3" />{report.likes || 0}</span>
                      {report.prediction_outcome && report.prediction_outcome !== "pending" && (
                        <span className={`capitalize font-semibold ${report.prediction_outcome === "hit" ? "text-gain" : report.prediction_outcome === "miss" ? "text-loss" : "text-amber-600"}`}>
                          {report.prediction_outcome}
                        </span>
                      )}
                    </div>
                  </div>
                  {report.prediction_action && (
                    <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {React.createElement(ACTION_ICONS[report.prediction_action] || Minus, { className: "w-3 h-3" })}
                      {report.prediction_action}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              ))
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
            <p className="text-sm text-muted-foreground mb-4">Boost your analyst profile to appear higher in the Leaderboard and gain more followers.</p>
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
                  { label: "Featured Analyst", price: "$79.99", reach: "Homepage feature for 7 days", Icon: Star },
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RevenueInsightsPanel />
        <TwitsPanel currentUser={currentUser} />
      </div>
    </div>
  );
}