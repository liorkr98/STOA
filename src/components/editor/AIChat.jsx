import React, { useState, useRef, useEffect } from "react";
import { Sparkles, Send, X, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function AIChat({ reportContent, onInsertBlock }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi! I'm your AI research assistant. Ask me anything — market data, sector trends, financial concepts, or ask me to draft a paragraph for your report." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const res = await base44.integrations.Core.InvokeLLM({
        model: "claude_sonnet_4_6",
        prompt: `You are an expert financial research analyst AI assistant helping write professional research reports.
Current report context: "${reportContent?.slice(0, 500) || "New report"}"
User question: "${userMsg}"
Be concise, insightful, and data-driven (3-5 sentences). Use financial terminology appropriately.
If the user asks you to "write", "draft", or "add" something, end your response with exactly: [INSERT: <the paragraph text>]`,
      });

      const raw = typeof res === "string" ? res
        : (res?.content?.[0]?.text || res?.text || res?.response || JSON.stringify(res));
      const insertMatch = raw.match(/\[INSERT:\s*([\s\S]+?)\]$/);
      const cleanText = raw.replace(/\[INSERT:[\s\S]+?\]$/, "").trim();

      setMessages(prev => [...prev, {
        role: "assistant",
        content: cleanText || "I couldn't generate a response. Please try again.",
        insertText: insertMatch ? insertMatch[1].trim() : null
      }]);
    } catch {
      toast.error("AI assistant failed. Please try again.");
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
      }]);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-40 flex items-center gap-2 bg-primary text-white px-3 py-2.5 rounded-full shadow-lg hover:bg-primary/90 transition-all text-sm font-medium"
    >
      <Sparkles className="w-4 h-4" />
      AI Assistant
    </button>
  );

  return (
    <div className="fixed bottom-6 right-4 md:right-6 z-40 w-80 bg-card border border-border rounded-2xl shadow-2xl flex flex-col" style={{ height: 420 }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <div>
            <p className="text-sm font-semibold">AI Research Assistant</p>
            <p className="text-[10px] text-muted-foreground">Powered by Claude Sonnet</p>
          </div>
        </div>
        <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs ${msg.role === "user" ? "bg-primary text-white" : "bg-secondary text-foreground"}`}>
              {msg.content}
              {msg.insertText && onInsertBlock && (
                <button
                  onClick={() => { onInsertBlock(msg.insertText); }}
                  className="mt-2 flex items-center gap-1 text-xs bg-white/20 hover:bg-white/30 rounded-lg px-2 py-1 transition-colors"
                >
                  <Plus className="w-3 h-3" /> Insert into report
                </button>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-secondary rounded-xl px-3 py-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="p-3 border-t border-border flex gap-2">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          placeholder="Ask anything about the market..."
          className="flex-1 text-sm h-9"
        />
        <Button size="sm" onClick={send} disabled={loading || !input.trim()} className="h-9 px-2.5">
          <Send className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}