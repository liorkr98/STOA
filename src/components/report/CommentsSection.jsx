import React, { useState, useEffect } from "react";
import { MessageCircle, Send, ThumbsUp, Trash2, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { avatarUrl } from "@/lib/avatarUrl";

function timeAgo(iso) {
  if (!iso) return "just now";
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function CommentItem({ comment, currentUser, onDelete, onLikeChange }) {
  const isOwn = currentUser?.email && comment.created_by === currentUser.email;
  const likeKey = `stoa_comment_liked_${currentUser?.email || "anon"}_${comment.id}`;
  const [liked, setLiked] = useState(() => typeof window !== "undefined" && localStorage.getItem(likeKey) === "1");
  const [likeCount, setLikeCount] = useState(comment.likes || 0);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const authorInitial = (comment.author_name || "A")[0].toUpperCase();

  const toggleLike = async () => {
    if (!currentUser) return;
    const next = !liked;
    setLiked(next);
    const newCount = Math.max(0, likeCount + (next ? 1 : -1));
    setLikeCount(newCount);
    try { localStorage.setItem(likeKey, next ? "1" : ""); } catch {}
    try {
      await base44.entities.Comment.update(comment.id, { likes: newCount });
      onLikeChange?.(comment.id, newCount);
    } catch {
      setLiked(!next);
      setLikeCount(likeCount);
    }
  };

  const handleDelete = async () => {
    if (!confirmingDelete) { setConfirmingDelete(true); return; }
    setDeleting(true);
    try {
      await base44.entities.Comment.delete(comment.id);
      onDelete?.(comment.id);
    } catch {
      setDeleting(false);
      setConfirmingDelete(false);
    }
  };

  return (
    <div style={{ display: "flex", gap: 12 }}>
      {comment.author_avatar ? (
        <img
          src={comment.author_avatar}
          alt={comment.author_name}
          className="av av-sm"
          style={{ objectFit: "cover", flexShrink: 0 }}
        />
      ) : (
        <div className="av av-sm" style={{ flexShrink: 0 }}>{authorInitial}</div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span className="t-title" style={{ fontSize: 13 }}>{comment.author_name || "Anonymous"}</span>
          <span className="t-meta" style={{ fontSize: 11 }}>·</span>
          <span className="t-meta" style={{ fontSize: 11 }}>{timeAgo(comment.created_date)}</span>
        </div>
        <p className="t-body" style={{ fontSize: 14, color: "var(--text-body)", margin: "0 0 8px", lineHeight: 1.55 }}>
          {comment.content}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button
            onClick={toggleLike}
            aria-pressed={liked}
            aria-label={liked ? "Remove like" : "Like comment"}
            style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              background: "transparent", border: 0, padding: 0, cursor: "pointer",
              color: liked ? "var(--primary-blue)" : "var(--text-mute)",
              transition: "color var(--t-fast) var(--ease)",
            }}
          >
            <ThumbsUp size={13} strokeWidth={1.7} style={{ fill: liked ? "var(--primary-blue)" : "transparent" }}/>
            <span className="t-num" style={{ fontSize: 12 }}>{likeCount}</span>
          </button>

          {isOwn && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              aria-label={confirmingDelete ? "Confirm delete" : "Delete comment"}
              className="comment-delete"
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                background: "transparent", border: 0, padding: 0, cursor: "pointer",
                color: confirmingDelete ? "var(--velvet-red)" : "var(--text-faint)",
                fontSize: 11, fontFamily: "var(--f-sans)",
                transition: "color var(--t-fast) var(--ease)",
              }}
            >
              {deleting ? (
                <Loader2 size={12} strokeWidth={1.6} className="animate-spin"/>
              ) : (
                <Trash2 size={12} strokeWidth={1.6}/>
              )}
              {confirmingDelete ? "Delete this comment?" : "Delete"}
            </button>
          )}
        </div>
      </div>
      <style>{`.comment-delete:hover { color: var(--velvet-red) !important; }`}</style>
    </div>
  );
}

export default function CommentsSection({ reportId, reportAuthorEmail, onCountChange }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then((u) => setCurrentUser(u)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!reportId) { setLoading(false); return; }
    base44.entities.Comment.filter({ report_id: reportId }, "-created_date", 50)
      .then((data) => setComments(data || []))
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
      setComments((prev) => [comment, ...prev]);
      onCountChange?.(comments.length + 1);
      setNewComment("");
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

  const handleDelete = (commentId) => {
    setComments((prev) => {
      const next = prev.filter((c) => c.id !== commentId);
      onCountChange?.(next.length);
      return next;
    });
  };

  const handleLikeChange = (commentId, newLikes) => {
    setComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, likes: newLikes } : c)));
  };

  const displayName = currentUser?.full_name || currentUser?.email?.split("@")[0] || "You";
  const displayAvatar = avatarUrl(currentUser);

  if (!loading && comments.length === 0 && !currentUser) return null;

  return (
    <div id="comments" style={{ marginTop: 48 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
        <MessageCircle size={15} strokeWidth={1.6} style={{ color: "var(--primary-blue)" }}/>
        <h3 className="t-title" style={{ fontSize: 17, margin: 0 }}>
          {comments.length === 0 ? "Discussion" : `Discussion · ${comments.length}`}
        </h3>
      </div>

      {currentUser && (
        <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
          {displayAvatar ? (
            <img src={displayAvatar} alt={displayName} className="av av-sm" style={{ objectFit: "cover", flexShrink: 0 }}/>
          ) : (
            <div className="av av-sm" style={{ flexShrink: 0 }}>{(displayName[0] || "?").toUpperCase()}</div>
          )}
          <div style={{ flex: 1 }}>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add to the discussion..."
              rows={3}
              className="t-body"
              style={{
                width: "100%", padding: "10px 12px",
                border: "0.5px solid var(--border-rgba)", borderRadius: 6,
                background: "var(--bg-elev)", color: "var(--text)",
                fontFamily: "var(--f-sans)", fontSize: 14, lineHeight: 1.5,
                outline: "none", resize: "vertical",
                marginBottom: 8,
              }}
            />
            <button
              onClick={addComment}
              disabled={!newComment.trim() || posting}
              className="btn btn-primary btn-sm"
              style={{ height: 30, padding: "0 14px" }}
            >
              {posting ? <Loader2 size={13} strokeWidth={1.7} className="animate-spin"/> : <Send size={13} strokeWidth={1.7}/>}
              Post comment
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ padding: 24, textAlign: "center" }}>
          <Loader2 size={16} strokeWidth={1.6} className="animate-spin" style={{ color: "var(--text-meta)" }}/>
        </div>
      ) : comments.length === 0 ? (
        <p className="t-meta" style={{ textAlign: "center", padding: 24 }}>
          No comments yet. Be the first to share your thoughts.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {comments.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              currentUser={currentUser}
              onDelete={handleDelete}
              onLikeChange={handleLikeChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}
