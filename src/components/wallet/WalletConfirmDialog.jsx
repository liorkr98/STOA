import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Wallet, ArrowRight, Loader2, AlertTriangle, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loadMyWallet, quoteP2PSplit } from "@/lib/walletService";

/**
 * Universal "confirm spend from wallet" modal. Used by report unlocks,
 * subscriptions, boosts, and credit conversions. Shows current balance,
 * the cost, the new balance after, and (for P2P) the platform fee split
 * so the buyer can see where the money goes.
 *
 * Props:
 *   open        — boolean
 *   onClose     — () => void
 *   onConfirm   — async () => void   (you do the actual purchase)
 *   title       — "Unlock report", "Subscribe to NAME", etc.
 *   amountUSD   — cost in dollars
 *   itemLabel   — what they're buying ("Tesla deep dive · by Maya Chen")
 *   showSplit   — boolean, if true shows the analyst payout breakdown (P2P only)
 *   confirmLabel — defaults to "Confirm purchase"
 */
export default function WalletConfirmDialog({
  open, onClose, onConfirm,
  title, amountUSD = 0, itemLabel,
  showSplit = false, confirmLabel = "Confirm purchase",
}) {
  const navigate = useNavigate();
  const [wallet,     setWallet]     = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    loadMyWallet()
      .then(({ wallet }) => setWallet(wallet))
      .catch(() => setWallet(null))
      .finally(() => setLoading(false));
  }, [open]);

  if (!open) return null;

  const balance = wallet?.balance || 0;
  const newBalance = balance - amountUSD;
  const insufficient = balance < amountUSD;
  const split = showSplit ? quoteP2PSplit(amountUSD) : null;

  const handleConfirm = async () => {
    if (insufficient || submitting) return;
    setSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="surface w-full max-w-sm overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border/60">
          <h3 className="font-serif text-[16px] text-foreground flex items-center gap-2">
            <Wallet className="w-4 h-4 text-primary" />
            {title}
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5">
          {/* Item */}
          {itemLabel && (
            <div className="bg-secondary/50 border border-border rounded-tag p-3 mb-4 text-xs text-foreground">
              {itemLabel}
            </div>
          )}

          {/* Cost */}
          <div className="flex items-baseline justify-between mb-4">
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Amount</span>
            <span className="text-2xl font-medium font-display">${amountUSD.toFixed(2)}</span>
          </div>

          {/* Wallet balance transition */}
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="bg-secondary/30 border border-border rounded-tag p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Wallet balance</span>
                <span className="font-display font-medium">${balance.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">This purchase</span>
                <span className="font-display font-medium text-muted-foreground">-${amountUSD.toFixed(2)}</span>
              </div>
              <div className="border-t border-border/60 pt-2 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Balance after</span>
                <span className={`font-display font-medium ${insufficient ? "text-loss" : "text-foreground"}`}>
                  ${newBalance.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Insufficient → top up CTA */}
          {!loading && insufficient && (
            <div className="mt-4 p-3 bg-accent/10 border border-accent/30 rounded-tag">
              <div className="flex items-start gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Not enough in wallet</p>
                  <p className="text-xs text-muted-foreground">
                    You need <span className="font-display">${(amountUSD - balance).toFixed(2)}</span> more. Deposit funds first.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => navigate("/pay?mode=deposit")}
                className="cta-gold w-full gap-1.5"
                style={{ borderRadius: 6 }}
              >
                Top up wallet <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}

          {/* P2P split breakdown — shows where the money goes */}
          {showSplit && split && !insufficient && (
            <div className="mt-3 text-[10px] text-muted-foreground space-y-0.5">
              <p>
                <strong className="text-foreground">${split.analystPayout.toFixed(2)}</strong> to the analyst ·{" "}
                <strong className="text-foreground">${split.platformFee.toFixed(2)}</strong> platform fee (10%) ·{" "}
                <strong className="text-foreground">${split.processingFee.toFixed(2)}</strong> processing
              </p>
            </div>
          )}

          {/* Buttons */}
          <div className="mt-5 flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              disabled={loading || insufficient || submitting}
              onClick={handleConfirm}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1.5" />}
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
