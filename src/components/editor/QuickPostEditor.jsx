import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Send, BarChart3, Lock } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const MAX_CHARS = 1500;
const MIN_CHARS = 10;

export default function QuickPostEditor() {
  const [content, setContent] = useState("");
  const [publishing, setPublishing] = useState(false);
  const navigate = useNavigate();

  const charCount = content.length;
  const remaining = MAX_CHARS - charCount;
  const isValid = charCount >= MIN_CHARS && charCount <= MAX_CHARS;

  // Auto-detect $TICKERS
  const tickers = [...content.matchAll(/\$([A-Z]{2,5})/g)].map(m => m[1]).filter((v, i, a) => a.indexOf(v) === i);

  const handlePublish = async () => {
    if (!isValid) return;
    setPublishing(true);
    try {
      const user = await base44.auth.me();
      const created = await base44.entities.Report.create({
        title: content.slice(0, 80) + (content.length > 80 ? "..." : ""),
        content_blocks: JSON.stringify([{ id: 1, type: "text", content }]),
        tickers: tickers.join(","),
        excerpt: content.slice(0, 200),
        status: "published",
        author_name: user?.full_name || user?.email?.split("@")[0] || "Analyst",
        author_avatar: user?.picture || null,
        author_accuracy: user?.accuracy_score || 0,
        likes: 0,
        report_type: "quick_post",
      });
      toast.success("Quick post published!");
      navigate(`/report?id=${created.id}`);
    } catch (err) {
      toast.error("Failed to publish: " + err?.message);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-semibold text-foreground">⚡ Quick Post</span>
          <span className="text-xs text-muted-foreground">Share a fast market take · 10–1500 chars</span>
        </div>

        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="What's your market take? Use $TICKER to tag stocks..."
          className="w-full h-40 bg-transparent border border-border rounded-xl p-3 text-sm text-foreground placeholder:text-muted-foreground/40 resize-none outline-none focus:border-primary/50 transition-colors"
          maxLength={MAX_CHARS}
        />

        {/* Ticker chips */}
        {tickers.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2 mb-3">
            {tickers.map(t => (
              <span key={t} className="text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-mono">
                ${t}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            {/* Char counter */}
            <span className={`text-xs font-mono ${
              remaining < 0 ? "text-loss" : remaining < 100 ? "text-amber-500" : "text-muted-foreground"
            }`}>
              {charCount}/{MAX_CHARS}
            </span>
            {charCount >= MIN_CHARS && charCount <= MAX_CHARS && (
              <div className="h-1.5 w-20 bg-secondary rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${charCount > MAX_CHARS ? "bg-loss" : "bg-primary"}`}
                  style={{ width: `${Math.min(100, (charCount / MAX_CHARS) * 100)}%` }}
                />
              </div>
            )}
          </div>
          <Button onClick={handlePublish} disabled={!isValid || publishing} size="sm" className="gap-1.5">
            <Send className="w-3.5 h-3.5" />
            {publishing ? "Posting..." : "Post"}
          </Button>
        </div>
      </div>
    </div>
  );
}