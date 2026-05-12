import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { ArrowLeft, Shield, Loader2, CheckCircle2, Wallet, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { depositToWallet, MIN_DEPOSIT_USD } from "@/lib/walletService";

const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID || "sb";

// Quick top-up amounts
const QUICK_AMOUNTS = [10, 25, 50, 100];

// ── PayPal SDK loader + button renderer ───────────────────────────────────────
function PayPalDepositButton({ amount, onSuccess }) {
  const containerRef = useRef(null);
  const [ready, setReady] = useState(false);
  const rendered = useRef(false);

  useEffect(() => {
    if (window.paypal) { setReady(true); return; }
    const script = document.createElement("script");
    script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=USD`;
    script.onload = () => setReady(true);
    script.onerror = () => toast.error("Failed to load PayPal. Please refresh.");
    document.head.appendChild(script);
  }, []);

  // Re-render the button whenever the amount changes
  useEffect(() => {
    if (!ready || !containerRef.current) return;
    containerRef.current.innerHTML = "";
    rendered.current = false;
    if (!amount || amount < MIN_DEPOSIT_USD) return;
    rendered.current = true;
    window.paypal.Buttons({
      createOrder: (_, actions) => actions.order.create({
        purchase_units: [{ amount: { value: amount.toFixed(2) }, description: `STOA wallet deposit · $${amount.toFixed(2)}` }]
      }),
      onApprove: async (_, actions) => {
        const capture = await actions.order.capture();
        await onSuccess(amount, capture?.id);
      },
      onError: () => toast.error("Payment failed. Please try again."),
      style: { layout: "vertical", color: "blue", shape: "rect", label: "pay" },
    }).render(containerRef.current);
  }, [ready, amount, onSuccess]);

  if (!ready) return (
    <div className="flex items-center justify-center py-6">
      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      <span className="ml-2 text-sm text-muted-foreground">Loading PayPal…</span>
    </div>
  );
  return <div ref={containerRef} className="mt-2" />;
}

function SuccessScreen({ amount }) {
  const navigate = useNavigate();
  return (
    <div className="max-w-sm mx-auto px-4 py-16 text-center">
      <CheckCircle2 className="w-12 h-12 text-gain mx-auto mb-4" />
      <h2 className="text-xl font-bold mb-2">Deposit successful</h2>
      {amount && <p className="text-3xl font-extrabold text-primary mb-1">${amount.toFixed(2)}</p>}
      <p className="text-sm text-muted-foreground mb-6">Funds are available in your wallet immediately.</p>
      <div className="flex gap-2 justify-center">
        <Button onClick={() => navigate("/wallet")}>Go to Wallet</Button>
        <Button variant="outline" onClick={() => navigate("/")}>Home</Button>
      </div>
    </div>
  );
}

export default function PaymentPage() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const mode = urlParams.get("mode");

  // Legacy modes redirect to /wallet — every internal purchase now happens
  // through the wallet-confirm dialog on the page where the action originated
  // (report unlock, subscribe, AI credits convert, boost).
  if (mode && !["deposit", "withdraw"].includes(mode)) {
    return <Navigate to="/wallet" replace />;
  }

  const presetAmount = parseFloat(urlParams.get("amount") || "0");
  const [amount, setAmount] = useState(presetAmount && presetAmount >= MIN_DEPOSIT_USD ? presetAmount : 25);
  const [success, setSuccess] = useState(null);

  const handleSuccess = async (paidAmount, orderId) => {
    try {
      await depositToWallet(paidAmount, orderId);
      toast.success(`+$${paidAmount.toFixed(2)} added to your wallet`);
      setSuccess(paidAmount);
    } catch (err) {
      toast.error(err.message || "Deposit failed to record. Contact support with your PayPal receipt.");
    }
  };

  if (success != null) return <SuccessScreen amount={success} />;

  const isValid = amount >= MIN_DEPOSIT_USD;

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-1">
          <Wallet className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold">Deposit to Wallet</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          One balance for everything on STOA. Spend it on reports, subscriptions, AI credits, or anything else.
        </p>

        {/* Amount picker */}
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Choose amount</p>
          <div className="grid grid-cols-4 gap-2 mb-3">
            {QUICK_AMOUNTS.map(a => (
              <button
                key={a}
                onClick={() => setAmount(a)}
                className={`rounded-xl border-2 py-2 text-sm font-bold transition-all ${
                  amount === a ? "border-primary bg-primary/5 text-primary" : "border-border text-foreground/70 hover:border-primary/30"
                }`}
              >
                ${a}
              </button>
            ))}
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">$</span>
            <input
              type="number"
              min={MIN_DEPOSIT_USD}
              step="0.01"
              value={amount}
              onChange={e => setAmount(parseFloat(e.target.value) || 0)}
              placeholder={`${MIN_DEPOSIT_USD}.00`}
              className="w-full border border-input rounded-xl pl-7 pr-4 py-3 text-lg font-bold outline-none focus:border-primary"
            />
          </div>
          {!isValid && (
            <p className="text-[10px] text-amber-700 mt-1.5">Minimum deposit is ${MIN_DEPOSIT_USD}.</p>
          )}
        </div>

        {/* What you can do with the balance */}
        <div className="bg-secondary/40 border border-border rounded-xl p-3 mb-4">
          <div className="flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-muted-foreground leading-snug">
              Your wallet balance pays for everything internally — no PayPal popup per purchase. Convert any time to AI credits ($1 = 10 credits). Analysts withdraw earnings to PayPal anytime above $25.
            </p>
          </div>
        </div>

        {/* PayPal button */}
        {isValid && (
          <PayPalDepositButton amount={amount} onSuccess={handleSuccess} />
        )}

        <p className="text-xs text-center text-muted-foreground mt-3 flex items-center justify-center gap-1">
          <Shield className="w-3 h-3" /> Secured by PayPal
        </p>
      </div>
    </div>
  );
}
