import React, { useState } from "react";
import { Bell, CheckCircle2, XCircle, TrendingUp, FileText, UserPlus, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

const MOCK_NOTIFICATIONS = [
  { id: 1, type: "hit", title: "Prediction Hit!", body: "Sarah Chen's NVDA Long → $1050 hit target!", time: "2h ago", read: false, link: "/report?id=h1" },
  { id: 2, type: "miss", title: "Prediction Missed", body: "Marcus Webb's GS Long missed target ($440)", time: "3h ago", read: false, link: "/report?id=h8" },
  { id: 3, type: "report", title: "New Report Published", body: "Leo Fischer published: Palantir's AIP — Enterprise Wave", time: "5h ago", read: false, link: "/report?id=r8" },
  { id: 4, type: "follow", title: "New Follower", body: "3 new followers this week", time: "1d ago", read: true, link: "/dashboard" },
  { id: 5, type: "report", title: "Premium Report Available", body: "AMD vs NVIDIA: The Underdog Catches Up — $4.99", time: "1d ago", read: true, link: "/report?id=r6" },
  { id: 6, type: "hit", title: "Prediction Hit!", body: "Aisha Patel's COIN Long → $260 smashed +69%!", time: "2d ago", read: true, link: "/report?id=h9" },
];

const TYPE_CONFIG = {
  hit: { icon: CheckCircle2, color: "text-gain", bg: "bg-gain/10" },
  miss: { icon: XCircle, color: "text-loss", bg: "bg-loss/10" },
  report: { icon: FileText, color: "text-primary", bg: "bg-primary/10" },
  follow: { icon: UserPlus, color: "text-blue-500", bg: "bg-blue-50" },
};

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const navigate = useNavigate();

  const unread = notifications.filter(n => !n.read).length;
  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));

  const handleClick = (n) => {
    setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
    setOpen(false);
    navigate(n.link);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
      >
        <Bell className="w-4.5 h-4.5" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-loss text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unread}
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
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">No notifications yet</div>
              ) : (
                notifications.map(n => {
                  const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.report;
                  const Icon = cfg.icon;
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
                        <p className="text-[10px] text-muted-foreground mt-0.5">{n.time}</p>
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