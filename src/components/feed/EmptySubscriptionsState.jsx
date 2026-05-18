import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import { analystHref } from "@/lib/analystSlug";
import AccuracyTierBadge from "./AccuracyTierBadge";
import { toast } from "sonner";

// Monthly subscription price used across the app. Mirrors the constant in
// AnalystProfilePage so the Subscribe CTA shows a real number.
const SUBSCRIPTION_PRICE_USD = 9;

export default function EmptySubscriptionsState({ currentUser, onSubscribed }) {
  const [topAnalysts, setTopAnalysts] = useState([]);
  const [reportCounts, setReportCounts] = useState({});
  const [subscribing, setSubscribing] = useState({});

  useEffect(() => {
    base44.entities.User.list("-accuracy_score", 10)
      .then(data => {
        const filtered = (data || [])
          .filter(u => u.accuracy_score > 0 && u.email !== currentUser?.email)
          .slice(0, 3);
        setTopAnalysts(filtered);

        filtered.forEach(a => {
          base44.entities.Report.filter({ created_by: a.email, status: "published" }, "-created_date", 200)
            .then(reports => setReportCounts(prev => ({ ...prev, [a.email]: (reports || []).length })))
            .catch(() => {});
        });
      })
      .catch(() => {});
  }, [currentUser?.email]);

  const handleSubscribe = async (analyst) => {
    if (!currentUser) return;
    const name = analyst.full_name || analyst.email?.split("@")[0] || "Researcher";
    setSubscribing(prev => ({ ...prev, [analyst.email]: true }));
    try {
      await base44.entities.Subscription.create({
        subscriber_email: currentUser.email,
        analyst_email: analyst.email,
        analyst_name: name,
        analyst_avatar: analyst.picture || analyst.profile_picture || "",
        status: "active",
        plan: "monthly",
      });
      toast.success(`Subscribed to ${name}!`);
      onSubscribed?.();
    } catch {
      toast.error("Failed to subscribe. Try again.");
    } finally {
      setSubscribing(prev => ({ ...prev, [analyst.email]: false }));
    }
  };

  return (
    <div className="py-6">
      <div className="surface p-5">
        <div className="flex items-center gap-2 mb-1">
          <Lock size={14} className="text-accent" />
          <p className="font-serif text-[15px] text-foreground">Unlock premium research</p>
        </div>
        <p className="text-[12px] text-muted-foreground mb-4">
          Subscribe to get full access to reports, predictions &amp; alerts
        </p>

        <div className="flex flex-col gap-2.5">
          {topAnalysts.map(a => {
            const name = a.full_name || a.email?.split("@")[0] || "Researcher";
            const callCount = reportCounts[a.email] ?? "—";
            const isBusy = subscribing[a.email];
            const price = a.subscription_price || SUBSCRIPTION_PRICE_USD;
            return (
              <div
                key={a.id}
                className="flex items-center gap-2.5 bg-background/40 rounded-tag border border-border/50 px-3 py-2.5"
              >
                <div className="w-9 h-9 rounded-full bg-accent/15 flex items-center justify-center text-[13px] font-medium text-accent overflow-hidden shrink-0">
                  {a.picture ? (
                    <img src={a.picture} alt={name} className="w-full h-full object-cover" />
                  ) : (
                    name[0]
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <Link
                    to={analystHref(a)}
                    className="font-serif text-[13px] text-foreground no-underline"
                  >
                    {name}
                  </Link>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <AccuracyTierBadge user={a} />
                    <span className="text-[10px] text-muted-foreground">
                      <span className="font-display">{callCount}</span> calls
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleSubscribe(a)}
                  disabled={isBusy}
                  className="cta-gold shrink-0 text-[11px] font-medium px-3 py-1 rounded-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ borderRadius: 6 }}
                >
                  {isBusy ? "..." : `Subscribe . $${price}/mo`}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
