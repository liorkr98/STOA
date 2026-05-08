import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

const SECTORS = [
  "AI & Semiconductors", "Big Tech", "EV & Clean Energy", "Financials",
  "Crypto & Web3", "Consumer Tech", "E-Commerce", "Healthcare",
];

export default function OnboardingModal({ onComplete }) {
  const [step, setStep] = useState(1);
  const [interests, setInterests] = useState([]);
  const navigate = useNavigate();

  const toggleInterest = (s) => setInterests(prev =>
    prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
  );

  const finish = () => {
    localStorage.setItem("stoa_onboarded", "true");
    localStorage.setItem("stoa_interests", JSON.stringify(interests));
    onComplete();
  };

  const DOTS = [1, 2];

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-[420px] overflow-hidden shadow-2xl">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 pt-5 pb-4">
          {DOTS.map(d => (
            <div key={d} className={`h-1.5 rounded-full transition-all ${d === step ? "w-6 bg-primary" : d < step ? "w-4 bg-primary/40" : "w-4 bg-border"}`} />
          ))}
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div className="px-6 pb-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold mb-2">Welcome to STOA</h2>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              The only platform where analysts lock their predictions on-chain, and every track record is publicly verifiable.
              Follow the best. Ignore the rest.
            </p>
            <div className="grid grid-cols-2 gap-3 mb-6 text-left">
              {[
                { emoji: "🔒", label: "Locked Predictions", desc: "Immutable. Time-stamped." },
                { emoji: "📊", label: "Verified Track Records", desc: "No cherry-picking." },
                { emoji: "💰", label: "Premium Research", desc: "Institutional quality." },
                { emoji: "🏆", label: "Ranked Leaderboard", desc: "Earn AI credits." },
              ].map(f => (
                <div key={f.label} className="flex items-start gap-2 p-3 bg-secondary rounded-xl">
                  <span className="text-xl">{f.emoji}</span>
                  <div>
                    <p className="text-xs font-semibold">{f.label}</p>
                    <p className="text-[10px] text-muted-foreground">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <Button className="w-full" onClick={() => setStep(2)}>
              Get Started <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
            <button onClick={finish} className="w-full text-xs text-muted-foreground hover:text-foreground mt-2 py-1">Skip</button>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="px-6 pb-6">
            <h2 className="text-lg font-bold mb-1 text-center">Choose your interests</h2>
            <p className="text-sm text-muted-foreground text-center mb-4">We'll personalize your feed.</p>
            <div className="flex flex-wrap gap-2 mb-6">
              {SECTORS.map(s => (
                <button
                  key={s}
                  onClick={() => toggleInterest(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    interests.includes(s)
                      ? "bg-primary text-white border-primary"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {interests.includes(s) && "✓ "}{s}
                </button>
              ))}
            </div>
            <Button className="w-full" onClick={finish} disabled={interests.length === 0}>
              Go to Feed <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
            <button onClick={finish} className="w-full text-xs text-muted-foreground hover:text-foreground mt-2 py-1">Skip</button>
          </div>
        )}


      </div>
    </div>
  );
}