import React, { useState, useEffect, useRef } from "react";
import { Bell, CheckCircle2, XCircle, TrendingUp, FileText, UserPlus, X, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { formatDistanceToNow } from "date-fns";

const TYPE_CONFIG = {
  hit:     { icon: CheckCircle2, color: "text-gain",      bg: "bg-gain/10" },
  near:    { icon: CheckCircle2, color: "text-gain",      bg: "bg-gain/10" },
  partial: { icon: TrendingUp,   color: "text-amber-500", bg: "bg-amber-50" },
  miss:    { icon: XCircle,      color: "text-loss",      bg: "bg-loss/10" },
  report:  { icon: FileText,     color: "text-primary",   bg: "bg-primary/10" },
  follow:  { icon: UserPlus,     color: "text-blue-500",  bg: "bg-blue-50" },
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
    if (!currentUser || fetchedRef.current) return;
    fetchedRef.current = true;
    setLoading(true);
    base44.entities.Notification.filter({ user_email: currentUser.email }, "-created_date", 30)
      .then(setNotifications)
      .finally(() => setLoading(false));
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

  if (!currentUser) return null;

  return (
    <div className="relative">
      <button
        onClick={handleOpen}
        className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-loss text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="font-semibold text-sm">Notifications</span>
              {unread > 0 && (
                <button onClick={markAllRead} className="text-xs text-primary hover:underline">Mark all read</button>
              )}
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground ml-2">
                <X className="w-4 h-4" />
              </button>
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
                    <button
                      key={n.id}
                      onClick={() => handleClick(n)}
                      className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors text-left border-b border-border/50 last:border-0 ${!n.read ? "bg-primary/5" : ""}`}
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