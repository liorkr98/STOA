import React, { useEffect, useRef, useState } from "react";
import { Loader2, MessageCircle, Send, Lock } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Avatar } from "@/components/AnalystCard";

/**
 * DashboardDMs — restored from backup, restyled with v2 tokens.
 *
 * The analyst's Studio side of the messaging surface: a left rail of their
 * subscribers + a chat panel on the right. Sending a message posts a
 * Notification entity to the subscriber (the canonical pattern this app
 * uses since there isn't a dedicated Message thread entity yet).
 *
 * Props:
 *  - subscribers   Subscription rows where analyst_email === me. Each row has
 *                  subscriber_email + (optional) subscriber_name/avatar.
 *  - currentUser   The analyst (used for the notification "from" line).
 */
export default function DashboardDMs({ subscribers = [], currentUser }) {
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const openThread = (sub) => {
    setSelected(sub);
    setMessages([]);
  };

  const send = async () => {
    if (!input.trim() || sending || !selected) return;
    setSending(true);
    const text = input.trim();
    setInput("");
    const localMsg = { id: Date.now(), from: "me", text, time: "just now" };
    setMessages((prev) => [...prev, localMsg]);
    try {
      await base44.entities.Notification.create({
        user_email: selected.subscriber_email,
        type: "message",
        title: `${currentUser?.full_name || currentUser?.email?.split("@")[0] || "Researcher"} sent you a message`,
        body: text,
        link: "/inbox",
      });
    } catch {
      // Optimistic — keep the local message even if the notification fails.
    } finally {
      setSending(false);
    }
  };

  if (subscribers.length === 0) {
    return (
      <div
        className="surface"
        style={{
          padding: 36,
          textAlign: "center",
          background: "var(--bg-elev)",
        }}
      >
        <Lock size={22} strokeWidth={1.4} style={{ color: "var(--text-faint)", marginBottom: 10 }}/>
        <div className="t-title" style={{ fontSize: 14, marginBottom: 4 }}>No subscribers yet</div>
        <div className="t-meta">Publish research and grow an audience — your subscribers will appear here.</div>
      </div>
    );
  }

  return (
    <div
      className="surface"
      style={{ padding: 0, overflow: "hidden", display: "grid", gridTemplateColumns: "240px 1fr", minHeight: 400 }}
    >
      {/* Subscribers list */}
      <div style={{ borderRight: "0.5px solid var(--border-rgba)", overflowY: "auto" }}>
        <div style={{ padding: "14px 18px", borderBottom: "0.5px solid var(--border-rgba)" }}>
          <span className="t-eyebrow">Subscribers</span>
        </div>
        {subscribers.map((sub) => {
          const name = sub.subscriber_name || sub.subscriber_email?.split("@")[0] || "Subscriber";
          const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
          const isActive = selected?.id === sub.id;
          return (
            <button
              key={sub.id || sub.subscriber_email}
              onClick={() => openThread(sub)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                padding: "10px 14px",
                background: isActive ? "var(--bg-soft)" : "transparent",
                color: "inherit",
                border: 0,
                cursor: "pointer",
                textAlign: "left",
                borderBottom: "0.5px solid var(--border-rgba)",
                transition: "background var(--t-fast) var(--ease)",
              }}
            >
              <Avatar a={{ initials, avatarColor: "var(--primary-blue)" }} size="sm"/>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="t-title" style={{ fontSize: 12.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {name}
                </div>
                <div className="t-meta" style={{ fontSize: 10.5 }}>
                  Subscribed
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Chat panel */}
      {selected ? (
        <div style={{ display: "flex", flexDirection: "column", padding: 14 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              paddingBottom: 10,
              borderBottom: "0.5px solid var(--border-rgba)",
              marginBottom: 12,
            }}
          >
            <MessageCircle size={14} strokeWidth={1.6} style={{ color: "var(--primary-blue)" }}/>
            <span className="t-title" style={{ fontSize: 13 }}>
              {selected.subscriber_name || selected.subscriber_email}
            </span>
            <span className="t-meta" style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11 }}>
              <Lock size={11} strokeWidth={1.5}/> Subscriber-only thread
            </span>
          </div>

          <div style={{ flex: 1, overflowY: "auto", paddingRight: 4, marginBottom: 10 }}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: "flex",
                  justifyContent: msg.from === "me" ? "flex-end" : "flex-start",
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    maxWidth: "78%",
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: msg.from === "me" ? "var(--primary-blue)" : "var(--bg-elev)",
                    color: msg.from === "me" ? "#fff" : "var(--text)",
                    border: msg.from === "me" ? "0.5px solid var(--primary-blue)" : "0.5px solid var(--border-rgba)",
                    fontSize: 13,
                    lineHeight: 1.45,
                    fontFamily: "var(--f-sans)",
                  }}
                >
                  {msg.text}
                  <div className="t-meta" style={{ fontSize: 10, marginTop: 4, color: msg.from === "me" ? "rgba(255,255,255,0.65)" : "var(--text-meta)" }}>
                    {msg.time}
                  </div>
                </div>
              </div>
            ))}
            <div ref={bottomRef}/>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
              placeholder="Send a message…"
              disabled={sending}
              className="t-body"
              style={{
                flex: 1,
                background: "var(--bg-elev)",
                border: "0.5px solid var(--border-rgba)",
                borderRadius: 6,
                padding: "8px 10px",
                fontSize: 13,
                color: "var(--text)",
                outline: "none",
              }}
            />
            <button
              type="button"
              onClick={send}
              disabled={!input.trim() || sending}
              className="btn btn-primary btn-sm"
              style={{ padding: "0 12px" }}
            >
              {sending ? <Loader2 size={13} className="animate-spin"/> : <Send size={13} strokeWidth={1.7}/>}
              Send
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
          <div style={{ textAlign: "center" }}>
            <MessageCircle size={26} strokeWidth={1.3} style={{ color: "var(--text-faint)", marginBottom: 10 }}/>
            <div className="t-meta">Select a subscriber to start a message.</div>
          </div>
        </div>
      )}
    </div>
  );
}
