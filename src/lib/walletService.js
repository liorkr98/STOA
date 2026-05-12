/**
 * Wallet service — single source of truth for every balance change in STOA.
 *
 * Rules:
 *  - Investors and analysts both have a Wallet record (auto-created on first
 *    access via getMyWallet).
 *  - All in-platform purchases (reports, subscriptions, boosts, AI credits)
 *    debit from Wallet.balance — never via external payment processors.
 *  - PayPal is only touched at deposit (in) and withdrawal (out).
 *  - Take rate: 10% of every P2P transaction (visible to user).
 *  - Processing fee: 5% deducted from analyst earnings to cover PayPal in+out
 *    costs (so investors see clean prices; analyst sees the COGS deduction).
 *  - $1 deposited = 10 AI credits (~70% margin on Base44 LLM costs).
 *  - Refund window: 24h from purchase for report unlocks.
 *  - Min deposit: $5. Min withdrawal: $25.
 */

import { base44 } from "@/api/base44Client";

// ── Economic constants — change here to retune the platform ───────────────────
export const PLATFORM_FEE_PCT     = 0.10;  // STOA take rate on P2P transactions
export const PROCESSING_FEE_PCT   = 0.05;  // PayPal in+out absorbed by analyst
export const AI_CREDITS_PER_DOLLAR = 10;   // Wallet $1 → 10 credits
export const MIN_DEPOSIT_USD      = 5;
export const MIN_WITHDRAWAL_USD   = 25;
export const REFUND_WINDOW_HOURS  = 24;

// ── Internal helpers ──────────────────────────────────────────────────────────

// Get the current user's wallet, creating it lazily if needed.
async function getMyWallet() {
  const me = await base44.auth.me();
  if (!me) throw new Error("Not authenticated");
  const list = await base44.entities.Wallet.filter({ created_by: me.email }).catch(() => []);
  if (list?.[0]) return { wallet: list[0], user: me };
  const created = await base44.entities.Wallet.create({
    balance: 0, total_earned: 0, total_withdrawn: 0, ai_credits: 0,
  });
  return { wallet: created, user: me };
}

// Look up another user's wallet (no auto-create — analyst must have logged in
// at least once for the wallet to exist; we use their email as the key).
async function getWalletByEmail(email) {
  if (!email) return null;
  const list = await base44.entities.Wallet.filter({ created_by: email }).catch(() => []);
  return list?.[0] || null;
}

// Atomically write a transaction record. We don't have DB transactions in
// Base44 so this is best-effort — write-then-update, in this order, so a
// crash leaves a transaction record without a balance change rather than
// the reverse (easier to reconcile manually).
async function writeTxn(payload) {
  return base44.entities.WalletTransaction.create(payload).catch(() => null);
}

// ── PUBLIC: read ──────────────────────────────────────────────────────────────

export async function loadMyWallet() {
  return getMyWallet();
}

export async function loadMyTransactions(limit = 100) {
  const me = await base44.auth.me();
  if (!me) return [];
  return base44.entities.WalletTransaction
    .filter({ created_by: me.email }, "-created_date", limit)
    .catch(() => []);
}

// ── PUBLIC: deposit ───────────────────────────────────────────────────────────
// Called by PaymentPage after a successful PayPal capture.
export async function depositToWallet(amountUSD, paypalOrderId) {
  if (amountUSD < MIN_DEPOSIT_USD) throw new Error(`Minimum deposit is $${MIN_DEPOSIT_USD}`);
  const { wallet, user } = await getMyWallet();

  await base44.entities.Wallet.update(wallet.id, {
    balance: (wallet.balance || 0) + amountUSD,
  });
  await writeTxn({
    type:        "deposit",
    amount:      amountUSD,
    status:      "completed",
    note:        `Deposit via PayPal${paypalOrderId ? ` · order ${paypalOrderId}` : ""}`,
    related_id:  paypalOrderId || null,
  });
  return { newBalance: (wallet.balance || 0) + amountUSD };
}

// ── PUBLIC: withdraw ──────────────────────────────────────────────────────────
// Analyst takes money out of their wallet to PayPal. The PayPal payout fee
// (~2%, capped) is deducted from the withdrawal — borne by the analyst.
export async function withdrawFromWallet(amountUSD) {
  if (amountUSD < MIN_WITHDRAWAL_USD) {
    throw new Error(`Minimum withdrawal is $${MIN_WITHDRAWAL_USD}`);
  }
  const { wallet } = await getMyWallet();
  if ((wallet.balance || 0) < amountUSD) throw new Error("Insufficient balance");

  // PayPal Payouts fee: 2% of amount, min $0.25, max $1
  const paypalFee = Math.min(1, Math.max(0.25, amountUSD * 0.02));
  const netReceived = amountUSD - paypalFee;

  await base44.entities.Wallet.update(wallet.id, {
    balance:         (wallet.balance || 0) - amountUSD,
    total_withdrawn: (wallet.total_withdrawn || 0) + amountUSD,
  });
  await writeTxn({
    type:           "withdrawal",
    amount:         -amountUSD,
    processing_fee: paypalFee,
    status:         "completed",
    note:           `Withdrawal to PayPal · net $${netReceived.toFixed(2)} after $${paypalFee.toFixed(2)} processing fee`,
  });
  return { netReceived, paypalFee };
}

// ── PUBLIC: cash → AI credits conversion ──────────────────────────────────────
// Instant, no external payment. $1 → 10 credits.
export async function convertCashToCredits(amountUSD) {
  if (!amountUSD || amountUSD <= 0) throw new Error("Invalid amount");
  const { wallet } = await getMyWallet();
  if ((wallet.balance || 0) < amountUSD) throw new Error("Insufficient balance");

  const credits = Math.floor(amountUSD * AI_CREDITS_PER_DOLLAR);
  await base44.entities.Wallet.update(wallet.id, {
    balance:    (wallet.balance || 0)    - amountUSD,
    ai_credits: (wallet.ai_credits || 0) + credits,
  });
  await writeTxn({
    type:    "conversion",
    amount:  -amountUSD,
    credits: credits,
    status:  "completed",
    note:    `Converted $${amountUSD.toFixed(2)} → ${credits} AI credits`,
  });
  return { newCredits: (wallet.ai_credits || 0) + credits, creditsAdded: credits };
}

// ── PUBLIC: buy report (P2P) ──────────────────────────────────────────────────
// Buyer wallet → Author wallet (minus platform fee + processing fee).
// Also writes a Like record so the buyer can read the unlocked report.
export async function buyReport({ authorEmail, reportId, reportTitle, priceUSD }) {
  if (!authorEmail || !reportId || !priceUSD || priceUSD <= 0) {
    throw new Error("Invalid report purchase");
  }
  const { wallet: buyerWallet, user: buyer } = await getMyWallet();
  if ((buyerWallet.balance || 0) < priceUSD) {
    return { ok: false, reason: "insufficient", needed: priceUSD - (buyerWallet.balance || 0) };
  }
  if (buyer.email === authorEmail) throw new Error("Cannot buy your own report");

  const platformFee   = priceUSD * PLATFORM_FEE_PCT;
  const processingFee = priceUSD * PROCESSING_FEE_PCT;
  const authorPayout  = priceUSD - platformFee - processingFee;

  const refundableUntil = new Date(Date.now() + REFUND_WINDOW_HOURS * 3600 * 1000).toISOString();

  // 1. Debit buyer
  await base44.entities.Wallet.update(buyerWallet.id, {
    balance: (buyerWallet.balance || 0) - priceUSD,
  });
  await writeTxn({
    type:               "report_unlock",
    amount:             -priceUSD,
    counterparty_email: authorEmail,
    related_id:         reportId,
    refundable_until:   refundableUntil,
    note:               `Unlocked report: ${reportTitle || reportId}`,
  });

  // 2. Credit author (if their wallet exists)
  const authorWallet = await getWalletByEmail(authorEmail);
  if (authorWallet) {
    await base44.entities.Wallet.update(authorWallet.id, {
      balance:      (authorWallet.balance || 0) + authorPayout,
      total_earned: (authorWallet.total_earned || 0) + authorPayout,
    });
  }
  // Author transaction record regardless (so they see it whenever they sign in)
  await base44.entities.WalletTransaction.create({
    type:               "report_earning",
    amount:             authorPayout,
    platform_fee:       platformFee,
    processing_fee:     processingFee,
    counterparty_email: buyer.email,
    related_id:         reportId,
    note:               `Report unlocked by ${buyer.email} · $${priceUSD.toFixed(2)} gross · platform fee $${platformFee.toFixed(2)} · processing $${processingFee.toFixed(2)}`,
  }).catch(() => null);

  // 3. Grant unlock (the existing Like-based unlock pattern)
  await base44.entities.Like.create({ report_id: reportId, user_email: buyer.email }).catch(() => null);

  return { ok: true, authorPayout, platformFee, processingFee };
}

// ── PUBLIC: subscribe to analyst (monthly, single charge) ─────────────────────
// We treat this as a one-time charge that creates the Subscription record;
// re-charging on renewal day is a separate cron job (not built yet).
export async function subscribeAnalyst({ analystEmail, analystName, monthlyPriceUSD }) {
  if (!analystEmail || !monthlyPriceUSD || monthlyPriceUSD <= 0) {
    throw new Error("Invalid subscription");
  }
  const { wallet: buyerWallet, user: buyer } = await getMyWallet();
  if ((buyerWallet.balance || 0) < monthlyPriceUSD) {
    return { ok: false, reason: "insufficient", needed: monthlyPriceUSD - (buyerWallet.balance || 0) };
  }
  if (buyer.email === analystEmail) throw new Error("Cannot subscribe to yourself");

  const platformFee   = monthlyPriceUSD * PLATFORM_FEE_PCT;
  const processingFee = monthlyPriceUSD * PROCESSING_FEE_PCT;
  const analystPayout = monthlyPriceUSD - platformFee - processingFee;

  // 1. Subscription record (existing pattern)
  const sub = await base44.entities.Subscription.create({
    subscriber_email: buyer.email,
    analyst_email:    analystEmail,
    analyst_name:     analystName || analystEmail.split("@")[0],
    status:           "active",
    plan:             "monthly",
    price:            monthlyPriceUSD,
    valid_until:      new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
  });

  // 2. Debit buyer
  await base44.entities.Wallet.update(buyerWallet.id, {
    balance: (buyerWallet.balance || 0) - monthlyPriceUSD,
  });
  await writeTxn({
    type:               "subscription_purchase",
    amount:             -monthlyPriceUSD,
    counterparty_email: analystEmail,
    related_id:         sub.id,
    note:               `Subscribed to ${analystName || analystEmail.split("@")[0]} · monthly`,
  });

  // 3. Credit analyst
  const analystWallet = await getWalletByEmail(analystEmail);
  if (analystWallet) {
    await base44.entities.Wallet.update(analystWallet.id, {
      balance:      (analystWallet.balance || 0) + analystPayout,
      total_earned: (analystWallet.total_earned || 0) + analystPayout,
    });
  }
  await base44.entities.WalletTransaction.create({
    type:               "subscription_earning",
    amount:             analystPayout,
    platform_fee:       platformFee,
    processing_fee:     processingFee,
    counterparty_email: buyer.email,
    related_id:         sub.id,
    note:               `New subscriber: ${buyer.email}`,
  }).catch(() => null);

  return { ok: true, subscription: sub, analystPayout, platformFee, processingFee };
}

// ── PUBLIC: buy a boost (single-sided, goes to platform) ──────────────────────
export async function buyBoost({ reportId, reportTitle, amountUSD }) {
  const { wallet: buyerWallet } = await getMyWallet();
  if ((buyerWallet.balance || 0) < amountUSD) {
    return { ok: false, reason: "insufficient", needed: amountUSD - (buyerWallet.balance || 0) };
  }
  await base44.entities.Wallet.update(buyerWallet.id, {
    balance: (buyerWallet.balance || 0) - amountUSD,
  });
  await writeTxn({
    type:       "boost",
    amount:     -amountUSD,
    related_id: reportId,
    note:       `Boost: ${reportTitle || reportId}`,
  });
  return { ok: true };
}

// ── PUBLIC: refund a report unlock (within window) ────────────────────────────
export async function refundReportUnlock(txnId) {
  const me = await base44.auth.me();
  if (!me) throw new Error("Not authenticated");
  const txns = await base44.entities.WalletTransaction.filter({ id: txnId }).catch(() => []);
  const txn = txns?.[0];
  if (!txn || txn.type !== "report_unlock") throw new Error("Transaction not found");
  if (txn.status === "refunded") throw new Error("Already refunded");
  if (!txn.refundable_until || new Date(txn.refundable_until) < new Date()) {
    throw new Error(`Refund window expired (${REFUND_WINDOW_HOURS}h limit)`);
  }
  const refundAmount = Math.abs(txn.amount);

  // Reverse the unlock + author payout
  const { wallet: buyerWallet } = await getMyWallet();
  await base44.entities.Wallet.update(buyerWallet.id, {
    balance: (buyerWallet.balance || 0) + refundAmount,
  });
  if (txn.counterparty_email) {
    const authorWallet = await getWalletByEmail(txn.counterparty_email);
    if (authorWallet) {
      const authorPayout = refundAmount * (1 - PLATFORM_FEE_PCT - PROCESSING_FEE_PCT);
      await base44.entities.Wallet.update(authorWallet.id, {
        balance:      Math.max(0, (authorWallet.balance || 0)      - authorPayout),
        total_earned: Math.max(0, (authorWallet.total_earned || 0) - authorPayout),
      });
    }
  }

  // Mark original txn refunded, write refund record
  await base44.entities.WalletTransaction.update(txnId, { status: "refunded" }).catch(() => null);
  await writeTxn({
    type:       "refund",
    amount:     refundAmount,
    related_id: txn.related_id,
    note:       `Refund of report unlock (within ${REFUND_WINDOW_HOURS}h window)`,
  });

  // Remove the Like (re-locks the report)
  if (txn.related_id) {
    const likes = await base44.entities.Like.filter({ report_id: txn.related_id, user_email: me.email }).catch(() => []);
    for (const l of likes || []) await base44.entities.Like.delete(l.id).catch(() => null);
  }

  return { refundedAmount: refundAmount };
}

// ── PUBLIC: spend AI credits (for AIChat, fact-check, etc) ────────────────────
// Returns the new credit balance or throws if insufficient.
export async function spendAICredits(amount, reason) {
  const { wallet, user } = await getMyWallet();
  if ((wallet.ai_credits || 0) < amount) {
    return { ok: false, reason: "insufficient_credits", have: wallet.ai_credits || 0 };
  }
  await base44.entities.Wallet.update(wallet.id, {
    ai_credits: (wallet.ai_credits || 0) - amount,
  });
  await base44.entities.AICreditsTransaction.create({
    user_id: user.id,
    amount:  -amount,
    reason:  reason || "AI usage",
  }).catch(() => null);
  return { ok: true, remaining: (wallet.ai_credits || 0) - amount };
}

// ── Quote helpers (used by the confirmation modal) ────────────────────────────
export function quoteP2PSplit(priceUSD) {
  const platformFee   = priceUSD * PLATFORM_FEE_PCT;
  const processingFee = priceUSD * PROCESSING_FEE_PCT;
  const analystPayout = priceUSD - platformFee - processingFee;
  return { priceUSD, platformFee, processingFee, analystPayout };
}
