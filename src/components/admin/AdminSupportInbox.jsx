import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Loader2, CheckCircle2, Clock, Flag, MessageSquare, Send, ExternalLink,
  RotateCcw, Inbox, Bug, CreditCard, UserCog, Sparkles,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

const SUPPORT_INBOX = "support@stoamarket.ai";

const CATEGORY_ICON = {
  bug: Bug, billing: CreditCard, account: UserCog,
  analyst: Sparkles, report: Flag, other: MessageSquare,
};

function parseMeta(raw) {
  try { return JSON.parse(raw || "{}"); } catch { return {}; }
}

// AI-review flags (from the FactChecker) carry a different meta shape than
// support tickets. Normalise both into one ticket view-model.
function toTicket(n) {
  const meta = parseMeta(n.meta);
  const isAI = n.type === "ai_review";
  return {
    id: n.id,
    raw: n,
    isAI,
    status: meta.status || (n.read ? "resolved" : "open"),
    title: n.title,
    body: n.body,
    createdDate: n.created_date,
    category: meta.category || (isAI ? "ai" : "other"),
    categoryLabel: meta.categoryLabel || (isAI ? "AI fact-check flag" : "Support"),
    fromName: meta.fromName || (isAI ? "Reader flag" : "User"),
    fromEmail: meta.fromEmail || null,
    fromRole: meta.fromRole || null,
    subject: meta.subject || n.title,
    message: meta.message || n.body || "",
    reportLink: meta.reportLink || (isAI ? n.link : null),
    claimText: meta.claim?.text || null,
    meta,
  };
}

function StatusPill({ status }) {
  if (status === "resolved") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gain/10 text-gain border border-gain/20">
        <CheckCircle2 className="w-2.5 h-2.5" /> Resolved
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
      <Clock className="w-2.5 h-2.5" /> Open
    </span>
  );
}

function TicketCard({ ticket, onResolve, onReopen, onReply, busy }) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [reply, setReply] = useState("");
  const Icon = ticket.isAI ? Flag : (CATEGORY_ICON[ticket.category] || MessageSquare);

  const sendReply = async () => {
    if (!reply.trim()) return;
    await onReply(ticket, reply.trim());
    setReply("");
    setReplyOpen(false);
  };

  return (
    <div className={cn(
      "bg-card border rounded-xl p-4",
      ticket.status === "resolved" ? "border-border opacity-75" : "border-amber-200"
    )}>
      <div className="flex items-start gap-3">
        <div className={cn(
          "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
          ticket.isAI ? "bg-accent/10 text-accent" : "bg-primary/10 text-primary"
        )}>
          <Icon className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground">{ticket.subject}</span>
            <StatusPill status={ticket.status} />
            <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full border border-border">
              {ticket.categoryLabel}
            </span>
          </div>

          <p className="text-xs text-muted-foreground mt-1">
            {ticket.fromName}
            {ticket.fromEmail && <span> · {ticket.fromEmail}</span>}
            {ticket.fromRole && ticket.fromRole !== "user" && (
              <span className="ml-1 capitalize text-primary">({ticket.fromRole})</span>
            )}
            {ticket.createdDate && (
              <span> · {formatDistanceToNow(new Date(ticket.createdDate), { addSuffix: true })}</span>
            )}
          </p>

          {ticket.message && (
            <p className="text-sm text-foreground/85 mt-2 leading-relaxed whitespace-pre-wrap">{ticket.message}</p>
          )}

          {ticket.claimText && (
            <p className="text-xs text-muted-foreground mt-2 italic border-l-2 border-accent/40 pl-2">
              Flagged claim: "{ticket.claimText}"
            </p>
          )}

          {ticket.reportLink && (
            <a
              href={ticket.reportLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
            >
              <ExternalLink className="w-3 h-3" /> Open report
            </a>
          )}

          {/* Reply box */}
          {replyOpen && (
            <div className="mt-3">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={3}
                placeholder={`Reply to ${ticket.fromName}…`}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15 resize-y"
                autoFocus
              />
              <div className="flex items-center gap-2 mt-2">
                <button onClick={sendReply} disabled={busy || !reply.trim()} className="btn btn-gold btn-sm disabled:opacity-50">
                  {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Send reply
                </button>
                <button onClick={() => setReplyOpen(false)} className="btn btn-ghost btn-sm">Cancel</button>
              </div>
            </div>
          )}

          {/* Actions */}
          {!replyOpen && (
            <div className="flex items-center gap-2 mt-3">
              {ticket.fromEmail && (
                <button onClick={() => setReplyOpen(true)} disabled={busy} className="btn btn-ghost btn-sm">
                  <Send className="w-3.5 h-3.5" /> Reply
                </button>
              )}
              {ticket.status === "resolved" ? (
                <button onClick={() => onReopen(ticket)} disabled={busy} className="btn btn-ghost btn-sm">
                  <RotateCcw className="w-3.5 h-3.5" /> Reopen
                </button>
              ) : (
                <button onClick={() => onResolve(ticket)} disabled={busy} className="btn btn-ghost btn-sm text-gain">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Mark resolved
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminSupportInbox() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("open");
  const [busyId, setBusyId]   = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    base44.entities.Notification
      .filter({ user_email: SUPPORT_INBOX }, "-created_date", 200)
      .then((rows) => {
        const actionable = (rows || []).filter(n => n.type === "support" || n.type === "ai_review");
        setTickets(actionable.map(toTicket));
      })
      .catch(() => setTickets([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateMeta = async (ticket, patch) => {
    const nextMeta = { ...ticket.meta, ...patch };
    await base44.entities.Notification.update(ticket.id, {
      read: patch.status === "resolved" ? true : ticket.raw.read,
      meta: JSON.stringify(nextMeta),
    });
  };

  const handleResolve = async (ticket) => {
    setBusyId(ticket.id);
    try {
      await updateMeta(ticket, { status: "resolved" });
      setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, status: "resolved" } : t));
      toast.success("Marked resolved");
    } catch { toast.error("Couldn't update — try again"); }
    finally { setBusyId(null); }
  };

  const handleReopen = async (ticket) => {
    setBusyId(ticket.id);
    try {
      await updateMeta(ticket, { status: "open" });
      setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, status: "open" } : t));
      toast.success("Reopened");
    } catch { toast.error("Couldn't update — try again"); }
    finally { setBusyId(null); }
  };

  const handleReply = async (ticket, replyText) => {
    if (!ticket.fromEmail) return;
    setBusyId(ticket.id);
    try {
      // Deliver the reply to the submitter's notifications
      await base44.entities.Notification.create({
        user_email: ticket.fromEmail,
        type:       "support",
        title:      `Re: ${ticket.subject}`,
        body:       replyText.slice(0, 200),
        link:       "/support",
        meta:       JSON.stringify({ kind: "support", isReply: true, status: "resolved", inReplyTo: ticket.id, fullReply: replyText }),
      });
      // Best-effort email
      await base44.integrations.Core.SendEmail({
        to: ticket.fromEmail,
        subject: `Re: ${ticket.subject} — STOA Support`,
        body: replyText,
      }).catch(() => {});
      await updateMeta(ticket, { status: "resolved" });
      setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, status: "resolved" } : t));
      toast.success(`Reply sent to ${ticket.fromName}`);
    } catch { toast.error("Couldn't send reply — try again"); }
    finally { setBusyId(null); }
  };

  const counts = useMemo(() => ({
    open:     tickets.filter(t => t.status !== "resolved").length,
    resolved: tickets.filter(t => t.status === "resolved").length,
    ai:       tickets.filter(t => t.isAI).length,
    all:      tickets.length,
  }), [tickets]);

  const visible = useMemo(() => {
    if (filter === "open")     return tickets.filter(t => t.status !== "resolved");
    if (filter === "resolved") return tickets.filter(t => t.status === "resolved");
    if (filter === "ai")       return tickets.filter(t => t.isAI);
    return tickets;
  }, [tickets, filter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Sub-filters */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {[
          { id: "open",     label: "Open",      count: counts.open },
          { id: "ai",       label: "AI flags",  count: counts.ai },
          { id: "resolved", label: "Resolved",  count: counts.resolved },
          { id: "all",      label: "All",       count: counts.all },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5",
              filter === f.id
                ? "bg-primary text-white border-primary"
                : "bg-card border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {f.label}
            {f.count > 0 && (
              <span className={cn(
                "text-[10px] font-bold px-1.5 rounded-full",
                filter === f.id ? "bg-white/20" : "bg-secondary"
              )}>{f.count}</span>
            )}
          </button>
        ))}
        <button onClick={load} className="ml-auto btn btn-ghost btn-sm" title="Refresh">
          <RotateCcw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <div className="w-14 h-14 rounded-full bg-gain/10 flex items-center justify-center">
            <Inbox className="w-7 h-7 text-gain" />
          </div>
          <p className="text-base font-semibold">Inbox zero</p>
          <p className="text-sm text-muted-foreground">No {filter === "all" ? "" : filter} tickets right now.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map(t => (
            <TicketCard
              key={t.id}
              ticket={t}
              busy={busyId === t.id}
              onResolve={handleResolve}
              onReopen={handleReopen}
              onReply={handleReply}
            />
          ))}
        </div>
      )}
    </div>
  );
}
