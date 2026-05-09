import React from "react";

export default function FeedSkeletonCard() {
  return (
    <div className="bg-card border border-border rounded-xl p-5 animate-pulse">
      {/* Author row */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-muted flex-shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3.5 bg-muted rounded w-32" />
          <div className="h-2.5 bg-muted rounded w-20" />
        </div>
        <div className="h-5 bg-muted rounded-full w-14" />
      </div>
      {/* Prediction pill */}
      <div className="h-7 bg-muted rounded-full w-40 mb-3" />
      {/* Title */}
      <div className="h-5 bg-muted rounded w-3/4 mb-2" />
      {/* Excerpt */}
      <div className="space-y-1.5 mb-3">
        <div className="h-3 bg-muted rounded w-full" />
        <div className="h-3 bg-muted rounded w-5/6" />
        <div className="h-3 bg-muted rounded w-4/5" />
      </div>
      {/* Footer */}
      <div className="flex items-center gap-4 pt-2 border-t border-border/40">
        <div className="h-4 bg-muted rounded w-12" />
        <div className="h-4 bg-muted rounded w-16" />
        <div className="h-4 bg-muted rounded w-10 ml-auto" />
      </div>
    </div>
  );
}