import React, { useState } from "react";
import { Send, MessageCircle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { MOCK_ANALYSTS } from "@/lib/mockData";
import { getTwits, saveTwit } from "@/lib/twitsStore";

export default function TwitsPanel() {
  const analyst = MOCK_ANALYSTS[0];
  const [tweet, setTweet] = useState("");
  const [twits, setTwits] = useState(() => getTwits());

  const post = () => {
    if (!tweet.trim()) return;
    const updated = saveTwit(tweet.trim());
    setTwits(updated);
    setTweet("");
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <MessageCircle className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-sm">Quick Twits</h3>
      </div>
      <div className="flex gap-2 mb-3">
        <img src={analyst.avatar} alt={analyst.name} className="w-8 h-8 rounded-full flex-shrink-0" />
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
            <Button size="sm" onClick={post} disabled={!tweet.trim()} className="text-xs h-7 gap-1">
              <Send className="w-3 h-3" /> Post
            </Button>
          </div>
        </div>
      </div>
      <div className="space-y-3 max-h-48 overflow-y-auto">
        {twits.map(t => (
          <div key={t.id} className="flex gap-2">
            <img src={analyst.avatar} alt="" className="w-6 h-6 rounded-full flex-shrink-0" />
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-xs font-semibold">{analyst.name}</span>
                <span className="text-[10px] text-muted-foreground">{t.time}</span>
              </div>
              <p className="text-xs text-foreground/90">{t.content}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}