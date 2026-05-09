import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { getAnalystSlug } from "@/lib/analystSlug";
import { Lock } from "lucide-react";

export default function EmptySubscriptionsState() {
  const [topAnalysts, setTopAnalysts] = useState([]);

  useEffect(() => {
    base44.entities.User.list("-accuracy_score", 5)
      .then(data => setTopAnalysts((data || []).filter(u => u.accuracy_score > 0).slice(0, 3)))
      .catch(() => {});
  }, []);

  return (
    <div className="text-center py-8">
      <p className="text-xl mb-1">🔒</p>
      <p className="font-bold text-foreground mb-1">Unlock premium research from verified analysts</p>
      <p className="text-sm text-muted-foreground mb-6">Subscribe to get full access to reports, predictions & alerts</p>
      <div className="space-y-3 text-left">
        {topAnalysts.map(a => {
          const name = a.full_name || a.email?.split("@")[0] || "Analyst";
          return (
            <div key={a.id} className="flex items-center gap-3 bg-card border border-border rounded-xl p-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex-shrink-0 flex items-center justify-center text-sm font-bold text-primary overflow-hidden">
                {a.picture ? <img src={a.picture} alt={name} className="w-full h-full object-cover" /> : name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <Link to={`/analyst/${getAnalystSlug(a)}`} className="text-sm font-semibold hover:text-primary transition-colors">{name}</Link>
                <p className="text-xs text-muted-foreground">{a.accuracy_score?.toFixed(1)}% accuracy · {a.total_calls || 0} calls</p>
              </div>
              <Link
                to={`/analyst/${getAnalystSlug(a)}`}
                className="flex items-center gap-1 text-xs font-semibold bg-amber-500 text-white rounded-full px-3 py-1.5 hover:bg-amber-600 transition-colors"
              >
                <Lock className="w-3 h-3" /> Subscribe
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}