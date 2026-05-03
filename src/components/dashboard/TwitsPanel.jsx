import React, { useState } from "react";
import { Send } from "lucide-react";
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
      <h3 className="font-semibold text-sm mb-3">Quick Twits</h3>
      <div className="flex gap-2 mb-4">
        <Textarea
          value={tweet}
          onChange={e => setTweet(e.target.value)}
          placeholder="Share a quick market thought..."
          className="text-sm resize-none h-16 flex-1"
          maxLength={280}
        />
        <div className="flex flex-col gap-1 justify-end">
          <span className="text-[10px] text-muted-foreground text-right">{tweet.length}/280</span>
          <Button onClick={post} disabled={!tweet.trim()} size="sm" className="px-3">
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
      <div className="space-y-3">
        {twits.slice(0, 5).map(t => (
          <div key={t.id} className="flex gap-2">
            <img src={analyst.avatar} alt={analyst.name} className="w-7 h-7 rounded-full flex-shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-foreground">{analyst.name}</span>
                <span className="text-[10px] text-muted-foreground">{t.time}</span>
              </div>
              <p className="text-xs text-foreground/80 mt-0.5">{t.content}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}