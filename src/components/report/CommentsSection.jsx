import React, { useState, useEffect } from "react";
import { MessageCircle, Send, Heart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { avatarUrl } from "@/lib/avatarUrl";

const REACTIONS = [
  { emoji: "🔥", label: "Fire" },
  { emoji: "💡", label: "Insightful" },
  { emoji: "🤔", label: "Skeptical" },
  { emoji: "✅", label: "Agree" },
  { emoji: "❌", label: "Disagree" },
];

function CommentItem({ comment }) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(comment.likes || 0);
  const [showReactions, setShowReactions] = useState(false);
  const [reactions, setReactions] = useState({});

  const handleReaction = (emoji) => {
    setReactions(prev => ({ ...prev, [emoji]: (prev[emoji] || 0) + 1 }));
    setShowReactions(false);
  };

  const authorInitial = (comment.author_name || "A")[0].toUpperCase();

  return (
    <div className="flex gap-3">
      {comment.author_avatar
        ? <img src={comment.author_avatar} alt={comment.author_name} className="w-8 h-8 rounded-full flex-shrink-0 mt-0.5 object-cover" />
        : <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0 mt-0.5">{authorInitial}</div>
      }
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-xs text-foreground">{comment.author_name || "Anonymous"}</span>
          <span className="text-[10px] text-muted-foreground ml-auto">
            {comment.created_date ? format(new Date(comment.created_date), "MMM d, HH:mm") : "just now"}
          </span>
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
          <button onClick={() => { setLiked(v => !v); setLikeCount(p => liked ? p - 1 : p + 1); }}
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
        </div>
      </div>
    </div>
  );
}

export default function CommentsSection({ reportId, reportAuthorEmail, reportTitle }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => setCurrentUser(u)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!reportId) { setLoading(false); return; }
    base44.entities.Comment.filter({ report_id: reportId }, "-created_date", 50)
      .then(data => setComments(data || []))
      .catch(() => setComments([]))
      .finally(() => setLoading(false));
  }, [reportId]);

  const addComment = async () => {
    if (!newComment.trim() || !reportId) return;
    setPosting(true);
    try {
      const comment = await base44.entities.Comment.create({
        report_id: reportId,
        content: newComment.trim(),
        author_name: currentUser?.full_name || currentUser?.email?.split("@")[0] || "Anonymous",
        author_avatar: avatarUrl(currentUser) || null,
        likes: 0,
      });
      setComments(prev => [comment, ...prev]);
      setNewComment("");
      // Notify report author of the new comment (skip self-comments)
      if (reportAuthorEmail && currentUser?.email && reportAuthorEmail !== currentUser.email) {
        base44.entities.Notification.create({
          user_email: reportAuthorEmail,
          type: "comment",
          title: `${currentUser.full_name || currentUser.email?.split("@")[0]} commented on your report`,
          body: newComment.trim().slice(0, 100),
          link: `/report?id=${reportId}`,
        }).catch(() => {});
      }
    } finally {
      setPosting(false);
    }
  };

  const displayName = currentUser?.full_name || currentUser?.email?.split("@")[0] || "You";
  // Prefer uploaded profile picture (profile_picture_url) over auth-provider
  // default (.picture). Previously only .picture was read, so users who'd
  // uploaded a custom PFP saw the initial-letter fallback in comments.
  const displayAvatar = avatarUrl(currentUser);

  return (
    <div id="comments" className="mt-8">
      <div className="flex items-center gap-2 mb-4">
        <MessageCircle className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-base">Discussion ({comments.length})</h3>
      </div>

      {currentUser && (
        <div className="flex gap-3 mb-6">
          {displayAvatar
            ? <img src={displayAvatar} alt={displayName} className="w-8 h-8 rounded-full flex-shrink-0 object-cover" />
            : <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">{displayName[0]?.toUpperCase()}</div>
          }
          <div className="flex-1">
            <Textarea value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Add to the discussion..." className="text-sm resize-none h-20 mb-2" />
            <Button onClick={addComment} size="sm" disabled={!newComment.trim() || posting}>
              {posting ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Send className="w-3.5 h-3.5 mr-1.5" />}
              Post Comment
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-6"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No comments yet. Be the first to share your thoughts.</p>
      ) : (
        <div className="space-y-5">
          {comments.map(c => <CommentItem key={c.id} comment={c} />)}
        </div>
      )}
    </div>
  );
}