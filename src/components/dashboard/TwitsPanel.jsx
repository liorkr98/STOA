import React, { useState, useEffect } from "react";
import { Send, MessageCircle, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function TwitsPanel({ currentUser }) {
  const [tweet, setTweet] = useState("");
  const [twits, setTwits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!currentUser?.id) return;
    base44.entities.Twit.filter({ author_id: currentUser.id }, "-created_date", 20)
      .then(data => setTwits(data || []))
      .finally(() => setLoading(false));
  }, [currentUser]);

  const post = async () => {
    if (!tweet.trim() || !currentUser) return;
    setPosting(true);
    try {
      const newTwit = await base44.entities.Twit.create({
        content: tweet.trim(),
        author_id: currentUser.id,
        author_name: currentUser.full_name || currentUser.email?.split("@")[0] || "Analyst",
        author_avatar: currentUser.picture || null,
      });
      setTwits(prev => [newTwit, ...prev]);
      setTweet("");
      toast.success("Posted!");
    } catch {
      toast.error("Failed to post. Please try again.");
    } finally {
      setPosting(false);
    }
  };

  const displayName = currentUser?.full_name || currentUser?.email?.split("@")[0] || "Analyst";

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <MessageCircle className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-sm">Quick Twits</h3>
      </div>
      <div className="flex gap-2 mb-3">
        {currentUser?.picture
          ? <img src={currentUser.picture} alt={displayName} className="w-8 h-8 rounded-full flex-shrink-0 object-cover" />
          : <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">{displayName?.[0] || "A"}</div>
        }
        <div className="flex-1">
          <Textarea
            value={tweet}
            onChange={e => setTweet(e.target.value)}
            placeholder="Share a quick market take..."
            className="resize-none text-sm h-16 mb-2"
            maxLength={280}
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">{tweet.length}/280</span>
            <Button size="sm" onClick={post} disabled={!tweet.trim() || posting} className="text-xs h-7 gap-1">
              {posting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />} Post
            </Button>
          </div>
        </div>
      </div>
      <div className="space-y-3 max-h-48 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
        ) : twits.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3">No posts yet. Share a quick market take!</p>
        ) : (
          twits.map(t => (
            <div key={t.id} className="flex gap-2">
              {currentUser?.picture
                ? <img src={currentUser.picture} alt="" className="w-6 h-6 rounded-full flex-shrink-0 object-cover" />
                : <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0">{displayName?.[0]}</div>
              }
              <div>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-xs font-semibold">{displayName}</span>
                  <span className="text-[10px] text-muted-foreground">{new Date(t.created_date).toLocaleDateString()}</span>
                </div>
                <p className="text-xs text-foreground/90">{t.content}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}