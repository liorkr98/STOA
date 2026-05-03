import React, { useState } from "react";
import { MessageCircle, Send, Heart, Reply } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MOCK_ANALYSTS } from "@/lib/mockData";
import { format } from "date-fns";

const REACTIONS = [
  { emoji: "🔥", label: "Fire" },
  { emoji: "💡", label: "Insightful" },
  { emoji: "🤔", label: "Skeptical" },
  { emoji: "✅", label: "Agree" },
  { emoji: "❌", label: "Disagree" },
];

const MOCK_COMMENTS = [
  { id: 1, author: MOCK_ANALYSTS[1], content: "Great analysis! The CUDA moat point is well made. I'd also add the NIMS software stack as a differentiator.", time: "2026-04-10T16:00:00Z", likes: 14, reactions: { "🔥": 8, "💡": 6 }, replies: [] },
  { id: 2, author: MOCK_ANALYSTS[2], content: "Solid DCF model. What's your assumption for gross margin compression in 2027?", time: "2026-04-10T17:30:00Z", likes: 7, reactions: { "🤔": 4 }, replies: [{ id: 21, author: MOCK_ANALYSTS[0], content: "Modelling 2.5% compression from H200 → B100 mix shift, but could be more if AMD gains traction.", time: "2026-04-10T18:00:00Z", likes: 5, reactions: {}, replies: [] }] },
  { id: 3, author: MOCK_ANALYSTS[3], content: "Worth noting the China export restrictions risk isn't fully priced in here.", time: "2026-04-11T09:00:00Z", likes: 22, reactions: { "✅": 12, "💡": 10 }, replies: [] },
];

function CommentItem({ comment }) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(comment.likes);
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replies, setReplies] = useState(comment.replies || []);
  const [reactions, setReactions] = useState(comment.reactions || {});
  const [showReactions, setShowReactions] = useState(false);

  const handleReaction = (emoji) => {
    setReactions(prev => ({ ...prev, [emoji]: (prev[emoji] || 0) + 1 }));
    setShowReactions(false);
  };

  const submitReply = () => {
    if (!replyText.trim()) return;
    setReplies(prev => [...prev, { id: Date.now(), author: MOCK_ANALYSTS[0], content: replyText.trim(), time: new Date().toISOString(), likes: 0, reactions: {}, replies: [] }]);
    setReplyText("");
    setShowReply(false);
  };

  return (
    <div className="flex gap-3">
      <img src={comment.author.avatar} alt={comment.author.name} className="w-8 h-8 rounded-full flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-xs text-foreground">{comment.author.name}</span>
          <span className="text-[10px] text-gain font-medium">{comment.author.accuracy}%</span>
          <span className="text-[10px] text-muted-foreground ml-auto">{format(new Date(comment.time), "MMM d, HH:mm")}</span>
        </div>
        <p className="text-sm text-foreground/90 mb-2">{comment.content}</p>

        {Object.keys(reactions).length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {Object.entries(reactions).map(([emoji, count]) => (
              <button key={emoji} onClick={() => handleReaction(emoji)} className="flex items-center gap-0.5 text-xs bg-card border border-border rounded-full px-2 py-0.5 hover:border-primary/40 transition-colors">
                {emoji} {count}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 relative">
          <button onClick={() => { setLiked(!liked); setLikeCount(p => liked ? p - 1 : p + 1); }}
            className={`flex items-center gap-1 text-xs transition-colors ${liked ? "text-loss" : "text-muted-foreground hover:text-foreground"}`}>
            <Heart className={`w-3.5 h-3.5 ${liked ? "fill-loss" : ""}`} /> {likeCount}
          </button>
          <button onClick={() => setShowReactions(!showReactions)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">React</button>
          {showReactions && (
            <div className="absolute bottom-full left-0 mb-1 flex gap-1 bg-card border border-border rounded-xl p-2 shadow-lg z-10">
              {REACTIONS.map(r => (
                <button key={r.emoji} onClick={() => handleReaction(r.emoji)} className="text-lg hover:scale-125 transition-transform">{r.emoji}</button>
              ))}
            </div>
          )}
          <button onClick={() => setShowReply(!showReply)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <Reply className="w-3.5 h-3.5" /> Reply
          </button>
        </div>

        {showReply && (
          <div className="flex gap-2 mt-2">
            <Textarea value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Write a reply..." className="text-sm resize-none h-16" />
            <Button onClick={submitReply} size="sm" className="self-end">Reply</Button>
          </div>
        )}

        {replies.length > 0 && (
          <div className="mt-3 space-y-3 border-l-2 border-border pl-3">
            {replies.map(r => <CommentItem key={r.id} comment={r} />)}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CommentsSection() {
  const [comments, setComments] = useState(MOCK_COMMENTS);
  const [newComment, setNewComment] = useState("");

  const addComment = () => {
    if (!newComment.trim()) return;
    setComments(prev => [...prev, { id: Date.now(), author: MOCK_ANALYSTS[0], content: newComment.trim(), time: new Date().toISOString(), likes: 0, reactions: {}, replies: [] }]);
    setNewComment("");
  };

  return (
    <div id="comments" className="mt-8">
      <div className="flex items-center gap-2 mb-4">
        <MessageCircle className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-base">Discussion ({comments.length})</h3>
      </div>

      <div className="flex gap-3 mb-6">
        <img src={MOCK_ANALYSTS[0].avatar} alt="You" className="w-8 h-8 rounded-full flex-shrink-0" />
        <div className="flex-1">
          <Textarea value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Add to the discussion..." className="text-sm resize-none h-20 mb-2" />
          <Button onClick={addComment} size="sm" disabled={!newComment.trim()}>
            <Send className="w-3.5 h-3.5 mr-1.5" /> Post Comment
          </Button>
        </div>
      </div>

      <div className="space-y-5">
        {comments.map(c => <CommentItem key={c.id} comment={c} />)}
      </div>
    </div>
  );
}