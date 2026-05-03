import React, { useState } from "react";
import { Sparkles, CheckCircle2, AlertTriangle, Info, MessageSquareQuote, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

const TYPE_CONFIG = {
  Fact: { icon: CheckCircle2, color: "text-gain", bg: "bg-gain/10 border-gain/20" },
  Opinion: { icon: MessageSquareQuote, color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
  Misleading: { icon: AlertTriangle, color: "text-loss", bg: "bg-loss/10 border-loss/20" },
  Unverified: { icon: Info, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
};

export default function FactChecker({ reportContent }) {
  const [loading, setLoading] = useState(false);
  const [claims, setClaims] = useState(null);

  const runCheck = async () => {
    setLoading(true);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyze this financial research report and identify 3-5 key claims. For each claim, classify it as: Fact, Opinion, Misleading, or Unverified. Report text: "${reportContent?.slice(0, 1000) || "NVIDIA dominates AI infrastructure. Their CUDA ecosystem has 4M developers. Data center revenue grew 427% YoY."}"`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          claims: {
            type: "array",
            items: {
              type: "object",
              properties: {
                text: { type: "string" },
                type: { type: "string" },
                note: { type: "string" }
              }
            }
          }
        }
      }
    });
    setClaims(res.claims || []);
    setLoading(false);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h4 className="font-semibold text-sm">AI Fact Checker</h4>
        </div>
        {!claims && (
          <Button onClick={runCheck} disabled={loading} size="sm" variant="outline">
            {loading ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Checking...</> : "Run Check"}
          </Button>
        )}
      </div>
      {claims && (
        <div className="space-y-2">
          {claims.map((claim, i) => {
            const cfg = TYPE_CONFIG[claim.type] || TYPE_CONFIG.Unverified;
            const Icon = cfg.icon;
            return (
              <div key={i} className={`flex gap-2 p-2.5 rounded-lg border text-xs ${cfg.bg}`}>
                <Icon className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${cfg.color}`} />
                <div>
                  <span className={`font-semibold ${cfg.color}`}>{claim.type}</span>
                  <p className="text-foreground/80 mt-0.5">{claim.text}</p>
                  {claim.note && <p className="text-muted-foreground mt-0.5 italic">{claim.note}</p>}
                </div>
              </div>
            );
          })}
          <button onClick={() => setClaims(null)} className="text-xs text-muted-foreground hover:text-foreground">Reset</button>
        </div>
      )}
    </div>
  );
}