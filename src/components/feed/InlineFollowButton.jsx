import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

export default function InlineFollowButton({ analystEmail, analystName, analystAvatar, isFollowing: initFollowing, onToggle }) {
  const { user, isAuthenticated } = useAuth();
  const [following, setFollowing] = useState(initFollowing || false);
  const [loading, setLoading] = useState(false);

  if (!isAuthenticated || !user || user.email === analystEmail) return null;

  const handleClick = async (e) => {
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    setFollowing(f => !f);
    try {
      if (!following) {
        await base44.entities.Follow.create({
          follower_email: user.email,
          analyst_email: analystEmail,
          analyst_name: analystName || analystEmail?.split("@")[0] || "Researcher",
          analyst_avatar: analystAvatar || "",
        });
        // Notify the analyst of their new follower
        base44.entities.Notification.create({
          user_email: analystEmail,
          type: "follow",
          title: `${user.full_name || user.email?.split("@")[0]} started following you`,
          body: "Check your profile to see your new follower.",
          link: `/analyst/${user.email?.split("@")[0]}`,
        }).catch(() => {});
      } else {
        const existing = await base44.entities.Follow.filter({ follower_email: user.email, analyst_email: analystEmail });
        if (existing?.[0]) await base44.entities.Follow.delete(existing[0].id);
      }
      if (onToggle) onToggle(!following);
    } catch {
      setFollowing(f => !f); // revert
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      style={{
        padding: '3px 10px',
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        cursor: 'pointer',
        transition: 'all 150ms ease',
        border: following ? '0.5px solid hsl(var(--sentiment-positive))' : '0.5px solid hsl(var(--blue-primary))',
        background: following ? 'hsl(var(--sentiment-positive) / 0.10)' : 'transparent',
        color: following ? 'hsl(var(--sentiment-positive))' : 'hsl(var(--blue-primary))',
        opacity: loading ? 0.6 : 1,
        flexShrink: 0,
      }}
    >
      {following ? "Following ✓" : "Follow"}
    </button>
  );
}