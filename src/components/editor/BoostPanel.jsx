import React, { useState } from "react";
import { Rocket, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const BOOST_PLANS = [
  { id: "basic", label: "Basic Boost", price: 4.99, desc: "Featured in feed for 24h", reach: "~2,000 extra views" },
  { id: "pro", label: "Pro Boost", price: 14.99, desc: "Top of feed for 48h + email digest", reach: "~8,000 extra views" },
  { id: "premium", label: "Premium Boost", price: 29.99, desc: "Homepage feature + newsletter", reach: "~25,000 extra views" },
];

export default function BoostPanel() {
  const [selected, setSelected] = useState(null);
  const navigate = useNavigate();

  const handleBoost = () => {
    if (!selected) return;
    const plan = BOOST_PLANS.find(p => p.id === selected);
    navigate(`/pay?mode=boost&title=${encodeURIComponent(plan.label)}&price=${plan.price}&boostPlanId=${plan.id}`);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Rocket className="w-4 h-4 text-accent" />
        <h3 className="font-medium text-sm">Boost Report</h3>
      </div>
      <div className="space-y-2 mb-3">
        {BOOST_PLANS.map(plan => (
          <button key={plan.id} onClick={() => setSelected(plan.id)}
            className={`w-full text-left border rounded-xl p-3 transition-all ${selected === plan.id ? "border-accent/30 bg-accent/10" : "border-border hover:border-accent/30"}`}>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-xs font-medium">{plan.label}</span>
              <span className="text-xs font-medium text-accent">${plan.price}</span>
            </div>
            <p className="text-[10px] text-muted-foreground">{plan.desc}</p>
            <p className="text-[10px] text-accent">{plan.reach}</p>
          </button>
        ))}
      </div>
      <Button size="sm" onClick={handleBoost} disabled={!selected} className="w-full text-xs bg-accent/10 hover:bg-accent/10 text-white">
        Boost Now
      </Button>
    </div>
  );
}