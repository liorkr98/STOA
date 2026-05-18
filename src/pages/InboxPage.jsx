import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, Loader2, Pencil } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { format, isToday, isYesterday } from "date-fns";

function fmtTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isToday(d))     return format(d, "h:mm a");
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMM d");
}

export default function InboxPage() {
  const navigate = useNavigate();
  const [me,            setMe]            = useState(null);
  const [conversations, setConversations] = useState([]);
  const [loading,       setLoading]       = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const currentUser = await base44.auth.me().catch(() => null);
        setMe(currentUser);
        if (!currentUser) return;

        // RLS ensures we only get messages we are party to
        const allMsgs = await base44.entities.Message
          .list("-created_date", 500)
          .catch(() => []);

        if (!allMsgs.length) return;

        // Group by conversation_id
        const convMap = {};
        for (const m of allMsgs) {
          const cid = m.conversation_id;
          if (!cid) continue;
          if (!convMap[cid]) convMap[cid] = { lastMsg: null, unread: 0 };
          const existing = convMap[cid].lastMsg;
          if (!existing || new Date(m.created_date) > new Date(existing.created_date)) {
            convMap[cid].lastMsg = m;
          }
          if (!m.read && m.recipient_email === currentUser.email) {
            convMap[cid].unread++;
          }
        }

        // Collect the other party's email from each conversation
        const emailsNeeded = new Set();
        for (const cid of Object.keys(convMap)) {
          const [a, b] = cid.split("|");
          const other = a === currentUser.email ? b : a;
          if (other) emailsNeeded.add(other);
        }

        // Bulk-fetch user profiles
        const allUsers = await base44.entities.User.list("-created_date", 500).catch(() => []);
        const userByEmail = {};
        for (const u of allUsers) { if (u.email) userByEmail[u.email] = u; }

        // Build sorted conversation list
        const list = Object.entries(convMap)
          .map(([cid, data]) => {
            const [a, b] = cid.split("|");
            const otherEmail = a === currentUser.email ? b : a;
            return {
              cid,
              otherEmail,
              other: userByEmail[otherEmail] || { email: otherEmail },
              lastMsg: data.lastMsg,
              unread:  data.unread,
            };
          })
          .sort((a, b) => {
            if (!a.lastMsg?.created_date) return 1;
            if (!b.lastMsg?.created_date) return -1;
            return new Date(b.lastMsg.created_date) - new Date(a.lastMsg.created_date);
          });

        setConversations(list);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const totalUnread = conversations.reduce((s, c) => s + c.unread, 0);

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-medium flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Messages
            {totalUnread > 0 && (
              <span className="text-xs bg-primary text-white rounded-tag px-2 py-0.5 font-medium">
                {totalUnread}
              </span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {conversations.length} conversation{conversations.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Empty state */}
      {conversations.length === 0 && (
        <div className="text-center py-20 border border-dashed border-border rounded-2xl bg-secondary/30">
          <MessageSquare className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm font-medium text-foreground/60 mb-1">No messages yet</p>
          <p className="text-xs text-muted-foreground">Subscribe to analysts to unlock direct messaging.</p>
        </div>
      )}

      {/* Conversation list */}
      {conversations.length > 0 && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
          {conversations.map(conv => {
            const other = conv.other;
            const name  = other.full_name || other.email?.split("@")[0] || "User";
            const last  = conv.lastMsg;
            const isMine = last?.sender_email === me?.email;

            return (
              <button
                key={conv.cid}
                onClick={() => navigate(`/dm?with=${encodeURIComponent(conv.otherEmail)}`)}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/50 transition-colors text-left"
              >
                {/* Avatar */}
                {other.picture
                  ? <img src={other.picture} alt={name} className="w-11 h-11 rounded-full object-cover flex-shrink-0" />
                  : <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center font-medium text-primary flex-shrink-0 text-base">
                      {name[0]}
                    </div>
                }

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={`text-sm font-medium truncate ${conv.unread > 0 ? "text-foreground" : "text-foreground/80"}`}>
                      {name}
                    </span>
                    <span className="text-[11px] text-muted-foreground flex-shrink-0 ml-2">
                      {fmtTime(last?.created_date)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-xs truncate ${conv.unread > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                      {isMine ? <span className="text-muted-foreground">You: </span> : null}
                      {last?.content || ""}
                    </p>
                    {conv.unread > 0 && (
                      <span className="flex-shrink-0 w-5 h-5 bg-primary rounded-full flex items-center justify-center text-[10px] text-white font-medium">
                        {conv.unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
