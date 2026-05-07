import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";

export default function DMPage() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const analystId = urlParams.get("analyst");

  const [analyst, setAnalyst] = useState(null);
  const [me, setMe] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        const currentUser = await base44.auth.me().catch(() => null);
        setMe(currentUser);

        if (analystId) {
          const users = await base44.entities.User.filter({ id: analystId });
          const analystUser = users?.[0] || null;
          setAnalyst(analystUser);

          if (analystUser && currentUser) {
            // Seed a welcome message if this is a fresh DM
            setMessages([{
              id: "welcome",
              from: "analyst",
              text: `Hi! Thanks for subscribing. Feel free to ask me anything about my analysis.`,
              time: "Welcome",
            }]);
          }
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [analystId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    const text = input.trim();
    setInput("");
    setMessages(prev => [...prev, { id: Date.now(), from: "me", text, time: "just now" }]);

    // Simulate analyst reply after a short delay
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        from: "analyst",
        text: "Thanks for your message! I'll get back to you soon.",
        time: "just now",
      }]);
      setSending(false);
    }, 1200);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  if (!analyst) return (
    <div className="max-w-xl mx-auto px-4 py-12 text-center">
      <p className="text-muted-foreground">Analyst not found.</p>
      <Button onClick={() => navigate(-1)} variant="outline" className="mt-4 text-sm">Go Back</Button>
    </div>
  );

  const displayName = analyst.full_name || analyst.email?.split("@")[0] || "Analyst";

  return (
    <div className="max-w-xl mx-auto px-4 py-6 flex flex-col" style={{ height: "calc(100vh - 100px)" }}>
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl mb-4">
        {analyst.picture
          ? <img src={analyst.picture} alt={displayName} className="w-10 h-10 rounded-full object-cover" />
          : <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-base font-bold text-primary">{displayName?.[0]}</div>
        }
        <div>
          <p className="font-semibold text-sm">{displayName}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Lock className="w-3 h-3" /> Subscribers only
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 mb-4 bg-card border border-border rounded-xl p-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.from === "me" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-xs rounded-xl px-3 py-2 text-sm ${msg.from === "me" ? "bg-primary text-white" : "bg-secondary text-foreground"}`}>
              {msg.text}
              <p className={`text-[10px] mt-1 ${msg.from === "me" ? "text-white/60" : "text-muted-foreground"}`}>{msg.time}</p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Send a message..."
          className="flex-1"
          disabled={sending}
        />
        <Button onClick={send} disabled={!input.trim() || sending}>
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}