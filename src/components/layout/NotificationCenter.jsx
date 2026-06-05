import React, { useState, useEffect, useRef } from "react";
import { Bell, CheckCircle2, XCircle, TrendingUp, FileText, UserPlus, Heart, MessageCircle, X, Loader2, CheckCheck, Trash2, LifeBuoy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

const TYPE_CONFIG = {
  hit:     { icon: CheckCircle2,  color: "text-gain",    bg: "bg-gain/10",    label: "Prediction Hit" },
  near:    { icon: CheckCircle2,  color: "text-gain",    bg: "bg-gain/10",    label: "Near Target" },
  partial: { icon: TrendingUp,    color: "text-accent",  bg: "bg-accent/10",  label: "Partial Hit" },
  miss:    { icon: XCircle,       color: "text-loss",    bg: "bg-loss/10",    label: "Prediction Miss" },
  report:  { icon: FileText,      color: "text-primary", bg: "bg-primary/10", label: "New Report" },
  follow:  { icon: UserPlus,      color: "text-primary", bg: "bg-primary/10", label: "New Follower" },
  like:    { icon: Heart,         color: "text-primary", bg: "bg-primary/10", label: "Liked" },
  comment: { icon: MessageCircle, color: "text-primary", bg: "bg-primary/10", label: "Comment" },
  support: { icon: LifeBuoy,      color: "text-primary", bg: "bg-primary/10", label: "Support" },
};

export default function NotificationCenter() {
  const [open, setOpen]               = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]         = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [markingAll, setMarkingAll]   = useState(false);
  const navigate = useNavigate();
  const fetchedRef = useRef(false);
  const panelRef   = useRef(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const fetchNotifs = () =>
    base44.entities.Notification
      .filter({ user_email: currentUser.email }, "-created_date", 50)
      .then(setNotifications).catch(() => {});

  useEffect(() => {
    if (!currentUser) return;
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      setLoading(true);
      fetchNotifs().finally(() => setLoading(false));
    }
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleOpen = () => {
    setOpen(o => !o);
    if (!open && currentUser) fetchNotifs();
  };

  const unread = notifications.filter(n => !n.read).length;

  const markAllRead = async () => {
    if (markingAll) return;
    setMarkingAll(true);
    const unreadOnes = notifications.filter(n => !n.read);
    // Optimistic
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try {
      await Promise.all(unreadOnes.map(n =>
        base44.entities.Notification.update(n.id, { read: true })
      ));
    } catch {
      // revert on error
      setNotifications(prev => prev.map(n =>
        unreadOnes.find(u => u.id === n.id) ? { ...n, read: false } : n
      ));
    } finally {
      setMarkingAll(false);
    }
  };

  const handleClick = async (n) => {
    if (!n.read) {
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
      base44.entities.Notification.update(n.id, { read: true }).catch(() => {});
    }
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  const dismissOne = async (e, id) => {
    e.stopPropagation();
    setNotifications(prev => prev.filter(n => n.id !== id));
    base44.entities.Notification.delete(id).catch(() => {});
  };

  const clearAll = async () => {
    const all = [...notifications];
    setNotifications([]);
    Promise.allSettled(all.map(n => base44.entities.Notification.delete(n.id)));
  };

  if (!currentUser) return null;

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={handleOpen}
        aria-label={unread > 0 ? `${unread} unread notifications` : "Notifications"}
        className={cn(
          "relative w-9 h-9 flex items-center justify-center rounded-lg transition-colors",
          open
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
        )}
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border/60">
            <Bell className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground flex-1">
              Notifications
              {unread > 0 && (
                <span className="ml-2 text-[11px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                  {unread} new
                </span>
              )}
            </span>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  disabled={markingAll}
                  title="Mark all as read"
                  className="flex items-center gap-1.5 text-xs font-medium text-primary hover:bg-primary/10 px-2 py-1 rounded-md transition-colors disabled:opacity-50"
                >
                  {markingAll
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <CheckCheck className="w-3.5 h-3.5" />
                  }
                  <span className="hidden sm:inline">Mark all read</span>
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  title="Clear all notifications"
                  className="p-1.5 rounded-md text-muted-foreground hover:text-loss hover:bg-loss/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Loading…</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center gap-3">
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                  <Bell className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">All caught up</p>
                  <p className="text-xs text-muted-foreground mt-0.5">No notifications yet</p>
                </div>
              </div>
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
                    className={cn(
                      "group relative flex items-start gap-3 px-4 py-3 border-b border-border/40 last:border-0 transition-colors",
                      !n.read ? "bg-primary/[0.04]" : "hover:bg-secondary/40"
                    )}
                  >
                    <button
                      onClick={() => handleClick(n)}
                      className="flex-1 flex items-start gap-3 text-left min-w-0"
                    >
                      {/* Type icon */}
                      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5", cfg.bg)}>
                        <Icon className={cn("w-3.5 h-3.5", cfg.color)} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-1.5">
                          <p className={cn("text-xs leading-snug flex-1", !n.read ? "font-semibold text-foreground" : "font-medium text-foreground/80")}>
                            {n.title}
                          </p>
                          {!n.read && (
                            <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1" />
                          )}
                        </div>
                        {n.body && (
                          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground/70 mt-1">{timeAgo}</p>
                      </div>
                    </button>

                    {/* Dismiss */}
                    <button
                      type="button"
                      onClick={(e) => dismissOne(e, n.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 -mr-1 rounded text-muted-foreground hover:text-loss flex-shrink-0 mt-0.5"
                      title="Dismiss"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-border/60 text-center">
              <span className="text-[10px] text-muted-foreground">
                {notifications.length} notification{notifications.length !== 1 ? "s" : ""}
                {unread > 0 ? ` · ${unread} unread` : " · all read"}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
