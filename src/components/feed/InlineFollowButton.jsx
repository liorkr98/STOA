import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

export default function InlineFollowButton({ analystEmail, analystName, analystAvatar, isFollowing: initFollowing, onToggle }) {
  const { user, isAuthenticated } = useAuth();
  const [following, setFollowing] = useState(initFollowing || false);
  const [loading, setLoading] = useState(false);

  // Keep local state in sync when the parent's `isFollowing` prop changes
  // (e.g. after the parent's followedEmails list re-fetches). Without this
  // useEffect, useState's initial value sticks forever and the button
  // appeared to "reset to Follow" after navigation/re-render — even though
  // the user was already following.
  useEffect(() => {
    if (typeof initFollowing === "boolean") setFollowing(initFollowing);
  }, [initFollowing, analystEmail]);

  // Defensive: if the parent didn't pass a definitive `initFollowing`, ask
  // the server directly on mount. This is what makes the button correct on
  // a hard refresh of a page that lists many analysts.
  useEffect(() => {
    if (!isAuthenticated || !user?.email || !analystEmail) return;
    if (typeof initFollowing === "boolean") return; // parent told us
    let cancelled = false;
    base44.entities.Follow
      .filter({ follower_email: user.email, analyst_email: analystEmail })
      .then(rows => { if (!cancelled) setFollowing((rows || []).length > 0); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isAuthenticated, user?.email, analystEmail, initFollowing]);

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

  // Follow → primary-blue solid CTA (per design system).
  // Following → primary-blue subtle confirmation (not market green; that
  // would code Following as a "gain" which it isn't).
  return (
    <button
      onClick={handleClick}
      disabled={loading}
      aria-pressed={following}
      aria-label={following ? `Unfollow ${analystName || "analyst"}` : `Follow ${analystName || "analyst"}`}
      className={`shrink-0 inline-flex items-center text-[11px] font-medium uppercase tracking-wider px-2.5 py-1 border transition-colors ${
        following
          ? "bg-primary/10 text-primary border-primary/30"
          : "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
      } ${loading ? "opacity-60" : ""}`}
      style={{ borderRadius: 6 }}
    >
      <span key={following ? "on" : "off"} className="scale-pulse inline-block">
        {following ? "Following ✓" : "Follow"}
      </span>
    </button>
  );
}