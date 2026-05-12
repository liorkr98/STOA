import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Send, Loader2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { getAnalystSlug } from "@/lib/analystSlug";

function makeConvId(a, b) {
  return [a, b].sort().join("|");
}

export default function DMPage() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const withEmail  = urlParams.get("with");
  const analystId  = urlParams.get("analyst"); // legacy param

  const [other,    setOther]    = useState(null);
  const [me,       setMe]       = useState(null);
  const [messages, setMessages] = useState([]);
  const [input,    setInput]    = useState("");
  const [loading,  setLoading]  = useState(true);
  const [sending,  setSending]  = useState(false);

  const bottomRef  = useRef(null);
  const pollRef    = useRef(null);
  const convIdRef  = useRef(null);
  const meRef      = useRef(null);

  // ── Initial load ────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const currentUser = await base44.auth.me().catch(() => null);
        setMe(currentUser);
        meRef.current = currentUser;
        if (!currentUser) return;

        let otherUser = null;
        if (withEmail) {
          const res = await base44.entities.User.filter({ email: withEmail }).catch(() => []);
          otherUser = res?.[0] || null;
        } else if (analystId) {
          const res = await base44.entities.User.filter({ id: analystId }).catch(() => []);
          otherUser = res?.[0] || null;
        }

        setOther(otherUser);
        if (otherUser) {
          convIdRef.current = makeConvId(currentUser.email, otherUser.email);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [withEmail, analystId]);

  // ── Load & poll messages ─────────────────────────────────────────────────
  const loadMessages = useCallback(async () => {
    if (!convIdRef.current) return;
    const msgs = await base44.entities.Message
      .filter({ conversation_id: convIdRef.current }, "created_date", 200)
      .catch(() => []);
    setMessages(msgs || []);

    // Mark received messages as read
    const unread = (msgs || []).filter(
      m => !m.read && m.recipient_email === meRef.current?.email
    );
    for (const m of unread) {
      base44.entities.Message.update(m.id, { read: true }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!me || !other) return;
    loadMessages();
    pollRef.current = setInterval(loadMessages, 8000);
    return () => clearInterval(pollRef.current);
  }, [me, other, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Send ─────────────────────────────────────────────────────────────────
  const send = async () => {
    if (!input.trim() || sending || !me || !other || !convIdRef.current) return;
    setSending(true);
    const text = input.trim();
    setInput("");

    const payload = {
      sender_email:    me.email,
      recipient_email: other.email,
      content:         text,
      conversation_id: convIdRef.current,
      read:            false,
    };
    const optimisticId = `opt_${Date.now()}`;
    setMessages(prev => [...prev, { ...payload, id: optimisticId, created_date: new Date().toISOString() }]);

    try {
      const saved = await base44.entities.Message.create(payload);
      setMessages(prev => prev.map(m => m.id === optimisticId ? saved : m));
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimisticId));
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  if (!other) return (
    <div className="max-w-xl mx-auto px-4 py-12 text-center">
      <MessageSquare className="w-10 h-10 mx-auto mb-4 text-muted-foreground/30" />
      <p className="text-muted-foreground mb-4">User not found.</p>
      <Button onClick={() => navigate("/inbox")} variant="outline" size="sm">Go to Inbox</Button>
    </div>
  );

  const displayName = other.full_name || other.email?.split("@")[0] || "Analyst";

  return (
    <div className="max-w-xl mx-auto px-4 py-6 flex flex-col" style={{ height: "calc(100vh - 80px)" }}>
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <Link to="/inbox" className="text-xs text-primary hover:underline">All messages</Link>
      </div>

      {/* Conversation header */}
      <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl mb-4">
        {other.picture
          ? <img src={other.picture} alt={displayName} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
          : <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary flex-shrink-0">
              {displayName[0]}
            </div>
        }
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">{displayName}</p>
          {other.tagline && <p className="text-xs text-muted-foreground truncate">{other.tagline}</p>}
        </div>
        <Link
          to={`/analyst/${getAnalystSlug(other)}`}
          className="text-xs text-primary hover:underline flex-shrink-0"
        >
          View profile
        </Link>
      </div>

      {/* Message thread */}
      <div className="flex-1 overflow-y-auto space-y-2 mb-4 bg-card border border-border rounded-xl p-4">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
            <MessageSquare className="w-8 h-8 mb-2 opacity-20" />
            <p className="text-sm">No messages yet. Start the conversation.</p>
          </div>
        )}

        {messages.map(msg => {
          const isMe = msg.sender_email === me?.email;
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"} items-end gap-2`}>
              {!isMe && (
                other.picture
                  ? <img src={other.picture} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0 mb-1" />
                  : <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0 mb-1">
                      {displayName[0]}
                    </div>
              )}
              <div className={`max-w-[72%] rounded-2xl px-3 py-2 text-sm ${
                isMe
                  ? "bg-primary text-white rounded-br-sm"
                  : "bg-secondary text-foreground rounded-bl-sm"
              }`}>
                <p className="leading-relaxed">{msg.content}</p>
                <p className={`text-[10px] mt-0.5 text-right ${isMe ? "text-white/60" : "text-muted-foreground"}`}>
                  {msg.created_date ? format(new Date(msg.created_date), "h:mm a") : "Sending…"}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
          placeholder={`Message ${displayName}…`}
          className="flex-1"
          disabled={sending}
          autoFocus
        />
        <Button onClick={send} disabled={!input.trim() || sending} size="icon">
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}
