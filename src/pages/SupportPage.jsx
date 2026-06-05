import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  LifeBuoy, Send, Loader2, CheckCircle2, Clock, MessageSquare,
  Bug, CreditCard, UserCog, Flag, Sparkles, ChevronRight,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

// Where support tickets land for the admin queue. Matches the address the
// FactChecker already writes AI-review flags to, so everything actionable for
// the team funnels to one inbox.
export const SUPPORT_INBOX = "support@stoamarket.ai";

export const SUPPORT_CATEGORIES = [
  { id: "bug",        label: "Bug / something broke",      icon: Bug },
  { id: "billing",    label: "Billing & payments",          icon: CreditCard },
  { id: "account",    label: "Account & profile",           icon: UserCog },
  { id: "analyst",    label: "Researcher application",      icon: Sparkles },
  { id: "report",     label: "Report a problem",            icon: Flag },
  { id: "other",      label: "Something else",              icon: MessageSquare },
];

/**
 * submitSupportTicket — shared helper used by the page and the quick modal.
 * Writes the admin-queue ticket plus a confirmation copy addressed to the user
 * so they can track it in their own notifications and on this page.
 */
export async function submitSupportTicket({ user, category, subject, message }) {
  const cat = SUPPORT_CATEGORIES.find(c => c.id === category) || SUPPORT_CATEGORIES[5];
  const fromName = user?.full_name || user?.email?.split("@")[0] || "User";
  const meta = {
    kind: "support",
    status: "open",
    category: cat.id,
    categoryLabel: cat.label,
    fromEmail: user?.email || null,
    fromName,
    fromRole: user?.role || "user",
    subject: subject.trim(),
    message: message.trim(),
    submittedAt: new Date().toISOString(),
  };
  const metaStr = JSON.stringify(meta);

  // 1 — admin queue ticket
  await base44.entities.Notification.create({
    user_email: SUPPORT_INBOX,
    type:       "support",
    title:      `[${cat.label}] ${subject.trim()}`,
    body:       message.trim().slice(0, 200),
    link:       "/admin/users",
    meta:       metaStr,
  });

  // 2 — confirmation copy for the submitter (best-effort)
  if (user?.email) {
    await base44.entities.Notification.create({
      user_email: user.email,
      type:       "support",
      title:      "We received your message",
      body:       `Our team will get back to you about "${subject.trim()}".`,
      link:       "/support",
      meta:       JSON.stringify({ ...meta, isOwnCopy: true }),
    }).catch(() => {});
  }

  return meta;
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

export default function SupportPage() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [category, setCategory] = useState("bug");
  const [subject, setSubject]   = useState("");
  const [message, setMessage]   = useState("");
  const [sending, setSending]   = useState(false);
  const [myTickets, setMyTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  const loadMyTickets = useCallback(() => {
    if (!user?.email) return;
    setLoadingTickets(true);
    base44.entities.Notification
      .filter({ user_email: user.email, type: "support" }, "-created_date", 50)
      .then((rows) => setMyTickets(rows || []))
      .catch(() => setMyTickets([]))
      .finally(() => setLoadingTickets(false));
  }, [user]);

  useEffect(() => { loadMyTickets(); }, [loadMyTickets]);

  const submit = async () => {
    if (!isAuthenticated) { navigate("/signin"); return; }
    if (!subject.trim() || !message.trim()) {
      toast.error("Add a subject and a message first.");
      return;
    }
    setSending(true);
    try {
      await submitSupportTicket({ user, category, subject, message });
      toast.success("Message sent — we'll be in touch.");
      setSubject("");
      setMessage("");
      loadMyTickets();
    } catch {
      toast.error("Couldn't send your message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <LifeBuoy className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="font-display text-2xl text-foreground">Support</h1>
          <p className="text-sm text-muted-foreground">
            Questions, bugs, billing, or your researcher application — we're here.
          </p>
        </div>
      </div>

      {/* Contact form */}
      <div className="bg-card border border-border rounded-2xl p-6 mt-6">
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          What's this about?
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-5">
          {SUPPORT_CATEGORIES.map((c) => {
            const Icon = c.icon;
            const active = category === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                className={cn(
                  "lift flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left text-xs font-medium",
                  active
                    ? "border-primary/50 bg-primary/5 text-primary"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="leading-tight">{c.label}</span>
              </button>
            );
          })}
        </div>

        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Subject
        </label>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          maxLength={120}
          placeholder="A short summary"
          className="w-full mb-4 px-3 py-2.5 text-sm bg-background border border-border rounded-xl outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15 transition-colors"
        />

        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Message
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={6}
          maxLength={3000}
          placeholder="Tell us what's going on. Include report links, tickers, or screenshots descriptions where relevant."
          className="w-full mb-4 px-3 py-2.5 text-sm bg-background border border-border rounded-xl outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15 transition-colors resize-y"
        />

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-[11px] text-muted-foreground">
            {isAuthenticated
              ? `Sending as ${user?.email}`
              : "You'll need to sign in to send a message."}
          </p>
          <button
            onClick={submit}
            disabled={sending}
            className="btn btn-gold btn-sm disabled:opacity-50"
          >
            {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            {sending ? "Sending…" : "Send message"}
          </button>
        </div>
      </div>

      {/* My requests */}
      {isAuthenticated && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-muted-foreground" /> Your requests
          </h2>

          {loadingTickets ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : myTickets.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <p className="text-sm text-muted-foreground">No support requests yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {myTickets.map((t) => {
                let meta = {};
                try { meta = JSON.parse(t.meta || "{}"); } catch { /* ignore */ }
                const isReply = t.title?.toLowerCase().startsWith("re:") || meta.isReply;
                return (
                  <div key={t.id} className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-foreground">{t.title}</p>
                          {isReply
                            ? <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">Reply</span>
                            : <StatusPill status={meta.status || "open"} />}
                        </div>
                        {t.body && <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{t.body}</p>}
                        <p className="text-[10px] text-muted-foreground/70 mt-1.5">
                          {t.created_date ? formatDistanceToNow(new Date(t.created_date), { addSuffix: true }) : ""}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Quick links */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "How it works", path: "/how-it-works" },
          { label: "Scoring methodology", path: "/scoring" },
          { label: "Become a researcher", path: "/become-analyst" },
        ].map((l) => (
          <button
            key={l.path}
            onClick={() => navigate(l.path)}
            className="lift flex items-center justify-between px-4 py-3 rounded-xl border border-border bg-card text-sm text-foreground"
          >
            {l.label}
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        ))}
      </div>
    </div>
  );
}
