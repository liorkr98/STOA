import React, { useState, useEffect, useRef } from "react";
import { Bell, CheckCircle2, XCircle, TrendingUp, FileText, UserPlus, Heart, MessageCircle, X, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { formatDistanceToNow } from "date-fns";

const TYPE_CONFIG = {
  hit:     { icon: CheckCircle2,  color: "text-gain",        bg: "bg-gain/10" },
  near:    { icon: CheckCircle2,  color: "text-gain",        bg: "bg-gain/10" },
  partial: { icon: TrendingUp,    color: "text-accent",      bg: "bg-accent/10" },
  miss:    { icon: XCircle,       color: "text-loss",        bg: "bg-loss/10" },
  report:  { icon: FileText,      color: "text-primary",     bg: "bg-primary/10" },
  follow:  { icon: UserPlus,      color: "text-primary",     bg: "bg-primary/10" },
  like:    { icon: Heart,         color: "text-primary",     bg: "bg-primary/10" },
  comment: { icon: MessageCircle, color: "text-primary",     bg: "bg-primary/10" },
};

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();
  const fetchedRef = useRef(false);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const fetch = () =>
      base44.entities.Notification.filter({ user_email: currentUser.email }, "-created_date", 30)
        .then(setNotifications).catch(() => {});
    if (!fetchedRef.current) { fetchedRef.current = true; setLoading(true); fetch().finally(() => setLoading(false)); }
    const interval = setInterval(fetch, 30000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // Refresh when opened
  const handleOpen = () => {
    setOpen(o => !o);
    if (!open && currentUser) {
      base44.entities.Notification.filter({ user_email: currentUser.email }, "-created_date", 30)
        .then(setNotifications);
    }
  };

  const unread = notifications.filter(n => !n.read).length;

  const markAllRead = async () => {
    const unreadOnes = notifications.filter(n => !n.read);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    await Promise.all(unreadOnes.map(n => base44.entities.Notification.update(n.id, { read: true })));
  };

  const handleClick = async (n) => {
    if (!n.read) {
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
      await base44.entities.Notification.update(n.id, { read: true });
    }
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  // Per-item dismiss + Clear All. Previously notifications just accumulated
  // with no way to manage them.
  const dismissOne = async (e, id) => {
    e.stopPropagation();
    setNotifications(prev => prev.filter(n => n.id !== id));
    try { await base44.entities.Notification.delete(id); } catch {}
  };
  const clearAll = async () => {
    const all = notifications;
    setNotifications([]);
    try {
      await Promise.allSettled(all.map(n => base44.entities.Notification.delete(n.id)));
    } catch {}
  };

  if (!currentUser) return null;

  return (
    <div className="relative">
      <button
        onClick={handleOpen}
        className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-primary text-primary-foreground text-[9px] font-medium font-display rounded-full flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 surface z-50 overflow-hidden">
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border/60">
              <span className="font-serif text-[14px] text-foreground">Notifications</span>
              <div className="flex items-center gap-2 ml-auto">
                {unread > 0 && (
                  <button onClick={markAllRead} className="text-xs text-primary hover:underline">Mark all read</button>
                )}
                {notifications.length > 0 && (
                  <button onClick={clearAll} className="text-xs text-muted-foreground hover:text-loss transition-colors">Clear all</button>
                )}
                <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">No notifications yet</div>
              ) : (
                notifications.map(n => {
                  const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.report;
                  const Icon = cfg.icon;
                  const timeAgo = n.created_date
                    ? formatDistanceToNow(new Date(n.created_date), { addSuffix: true })
                    : "";
                  return (
                    <div
                      key={n.id}
                      className={`group relative flex items-start gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors border-b border-border/50 last:border-0 ${!n.read ? "bg-primary/5" : ""}`}
                    >
                      <button
                        onClick={() => handleClick(n)}
                        className="flex-1 flex items-start gap-3 text-left min-w-0"
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                          <Icon className={`w-4 h-4 ${cfg.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground flex items-center gap-1">
                            {n.title}
                            {!n.read && <span className="w-1.5 h-1.5 bg-primary rounded-full inline-block" />}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{n.body}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{timeAgo}</p>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => dismissOne(e, n.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-loss p-1 -mr-1 shrink-0"
                        title="Dismiss notification"
                        aria-label="Dismiss notification"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}