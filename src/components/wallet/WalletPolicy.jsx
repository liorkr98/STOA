import React from "react";
import { Info, DollarSign, Zap, Shield, Clock, RefreshCw, Scale } from "lucide-react";
import {
  PLATFORM_FEE_PCT, PROCESSING_FEE_PCT, AI_CREDITS_PER_DOLLAR,
  MIN_DEPOSIT_USD, MIN_WITHDRAWAL_USD, REFUND_WINDOW_HOURS,
} from "@/lib/walletService";

/**
 * Policy + economics section shown at the bottom of the Wallet page.
 * Plain-language explanation of every fee and rule so users can audit
 * the platform's take rate and behavior.
 */
export default function WalletPolicy() {
  const sections = [
    {
      icon: DollarSign,
      title: "Deposits & withdrawals",
      bullets: [
        `Minimum deposit: $${MIN_DEPOSIT_USD}. PayPal processes the deposit; no fee is charged to investors at deposit time.`,
        `Minimum withdrawal: $${MIN_WITHDRAWAL_USD}. PayPal charges a payout fee (2%, min $0.25, max $1) which is deducted from the withdrawal amount.`,
        `Withdrawals are sent to the PayPal account linked to your STOA email. Payouts typically settle in 1–3 business days.`,
      ],
    },
    {
      icon: Scale,
      title: "Platform take rate (10%)",
      bullets: [
        `STOA takes ${(PLATFORM_FEE_PCT * 100).toFixed(0)}% on every P2P transaction (report unlocks, subscriptions).`,
        `An additional ${(PROCESSING_FEE_PCT * 100).toFixed(0)}% covers payment processor costs (PayPal in + out) and is deducted from the analyst's share — so investors always see clean, all-in prices.`,
        `Net to analyst: ${((1 - PLATFORM_FEE_PCT - PROCESSING_FEE_PCT) * 100).toFixed(0)}% of the sale price.`,
        `Example: a $4.99 report unlock → $${(4.99 * (1 - PLATFORM_FEE_PCT - PROCESSING_FEE_PCT)).toFixed(2)} to the analyst · $${(4.99 * PLATFORM_FEE_PCT).toFixed(2)} platform fee · $${(4.99 * PROCESSING_FEE_PCT).toFixed(2)} processing.`,
      ],
    },
    {
      icon: Zap,
      title: "AI credits",
      bullets: [
        `Conversion rate: $1 = ${AI_CREDITS_PER_DOLLAR} AI credits.`,
        `Credits power AI chat, fact-checking on publish, and other analyst tools. They never expire.`,
        `Convert any time from your cash balance — no PayPal step, no processing fee. Goes instantly.`,
        `AI usage costs (per credit estimate): chat message ≈ 1 credit · report fact-check on publish = 10 credits.`,
      ],
    },
    {
      icon: Clock,
      title: "Refund window (24 hours)",
      bullets: [
        `Report unlocks are refundable within ${REFUND_WINDOW_HOURS} hours of purchase, for any reason.`,
        `Refund reverses both sides: the buyer's wallet is credited, the analyst's earnings are reduced.`,
        `Subscriptions and AI credit conversions are non-refundable once consumed.`,
        `Past the ${REFUND_WINDOW_HOURS}-hour window, refunds are at STOA's discretion (fraud, misrepresented content).`,
      ],
    },
    {
      icon: Shield,
      title: "Wallet holds your funds — what that means",
      bullets: [
        `Your wallet balance is held by STOA on your behalf. It is not interest-bearing.`,
        `Funds are not FDIC-insured. Treat your wallet like a pre-paid balance, not a bank account.`,
        `STOA does not lend, invest, or otherwise use your balance.`,
        `In the event STOA winds down, all wallet balances are returned to the originating payment method or via PayPal payout.`,
      ],
    },
    {
      icon: RefreshCw,
      title: "Disputes, freezes & abuse",
      bullets: [
        `Suspected fraud, chargebacks, or coordinated abuse may result in wallet freeze pending investigation.`,
        `Analysts who violate the Creator Code of Conduct (pump-and-dump, fabricated track records) forfeit accrued earnings.`,
        `Disputes: email support@stoa.app (replace with real support address before launch) with your transaction ID.`,
      ],
    },
  ];

  return (
    <div className="mt-10">
      <div className="flex items-center gap-2 mb-4">
        <Info className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
          Wallet policy &amp; fees
        </h2>
      </div>

      <div className="space-y-4">
        {sections.map(({ icon: Icon, title, bullets }) => (
          <div key={title} className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Icon className="w-4 h-4 text-primary" />
              <h3 className="font-medium text-sm">{title}</h3>
            </div>
            <ul className="space-y-1.5 text-xs text-foreground/80">
              {bullets.map(b => (
                <li key={b} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-muted-foreground mt-0.5 flex-shrink-0">•</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-muted-foreground mt-5 text-center">
        These rates and rules are current as of today. Last updated when STOA's wallet system went live.
        STOA reserves the right to update fees with 30 days notice.
      </p>
    </div>
  );
}
