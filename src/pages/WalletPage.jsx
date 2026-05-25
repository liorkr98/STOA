import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Wallet, ArrowDownLeft, ArrowUpRight, Plus, Loader2,
  TrendingUp, Clock, Zap, ShoppingCart, RefreshCw, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import {
  loadMyWallet, loadMyTransactions, convertCashToCredits, withdrawFromWallet,
  AI_CREDITS_PER_DOLLAR, MIN_DEPOSIT_USD, MIN_WITHDRAWAL_USD,
} from "@/lib/walletService";
import WalletPolicy from "@/components/wallet/WalletPolicy";
import { toast } from "sonner";

const TX_DISPLAY = {
  deposit:               { icon: ArrowDownLeft, color: "text-gain",       bg: "bg-gain/10",       label: "Deposit",         sign: "+" },
  withdrawal:            { icon: ArrowUpRight,  color: "text-loss",       bg: "bg-loss/10",       label: "Withdrawal",      sign: "-" },
  earning:               { icon: TrendingUp,    color: "text-gain",       bg: "bg-gain/10",       label: "Earning",         sign: "+" },
  credits:               { icon: Zap,           color: "text-accent",     bg: "bg-accent/10",     label: "AI Credits",      sign: "+" },
  conversion:            { icon: RefreshCw,     color: "text-accent",     bg: "bg-accent/10",     label: "Cash → Credits",  sign: "-" },
  report_unlock:         { icon: ArrowUpRight,  color: "text-loss",       bg: "bg-loss/10",       label: "Report unlock",   sign: "-" },
  report_earning:        { icon: TrendingUp,    color: "text-gain",       bg: "bg-gain/10",       label: "Report earning",  sign: "+" },
  subscription_purchase: { icon: ArrowUpRight,  color: "text-loss",       bg: "bg-loss/10",       label: "Subscription",    sign: "-" },
  subscription_earning:  { icon: TrendingUp,    color: "text-gain",       bg: "bg-gain/10",       label: "Subscriber",      sign: "+" },
  boost:                 { icon: Zap,           color: "text-accent",     bg: "bg-accent/10",     label: "Boost",           sign: "-" },
  refund:                { icon: RefreshCw,     color: "text-primary",    bg: "bg-primary/10",    label: "Refund",          sign: "+" },
};

export default function WalletPage() {
  const navigate = useNavigate();
  const [wallet,        setWallet]       = useState(null);
  const [transactions,  setTransactions] = useState([]);
  const [loading,       setLoading]      = useState(true);
  const [tab,           setTab]          = useState("cash");
  // Convert dollars → credits state
  const [convertAmount, setConvertAmount] = useState("");
  const [converting,    setConverting]    = useState(false);
  // Withdraw state
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [{ wallet }, txs] = await Promise.all([loadMyWallet(), loadMyTransactions(100)]);
      setWallet(wallet);
      setTransactions(txs);
    } finally {
      setLoading(false);
    }
  };

  const handleConvert = async () => {
    const amt = parseFloat(convertAmount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    if (amt > (wallet?.balance || 0)) return toast.error("Amount exceeds wallet balance");
    setConverting(true);
    try {
      const { creditsAdded } = await convertCashToCredits(amt);
      toast.success(`+${creditsAdded} AI credits added to your wallet`);
      setConvertAmount("");
      await load();
    } catch (err) {
      toast.error(err.message || "Conversion failed");
    } finally {
      setConverting(false);
    }
  };

  const handleWithdraw = async () => {
    const amt = parseFloat(withdrawAmount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    setWithdrawing(true);
    try {
      const { netReceived, paypalFee } = await withdrawFromWallet(amt);
      toast.success(`Withdrawal queued · $${netReceived.toFixed(2)} after $${paypalFee.toFixed(2)} fee`);
      setShowWithdraw(false);
      setWithdrawAmount("");
      await load();
    } catch (err) {
      toast.error(err.message || "Withdrawal failed");
    } finally {
      setWithdrawing(false);
    }
  };

  // Skeleton-style loading — matches the rest of the redesign rather
  // than a centered spinner string.
  if (loading) return (
    <div className="max-w-2xl mx-auto px-5 py-10">
      <div className="shimmer h-7 w-40 mb-3" />
      <div className="shimmer h-10 w-64 mb-8" />
      <div className="shimmer h-44 w-full mb-5" />
      <div className="grid grid-cols-2 gap-3">
        <div className="shimmer h-24 w-full" />
        <div className="shimmer h-24 w-full" />
      </div>
    </div>
  );

  const aiCredits = wallet?.ai_credits || 0;
  const cashTxs   = transactions.filter(t => t.type !== "conversion" && t.type !== "credits");
  const creditTxs = transactions.filter(t => t.type === "conversion" || t.type === "credits");

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-16">

      {/* ── Header ── */}
      <div className="surface-premium p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-tag bg-primary flex items-center justify-center">
            <Wallet className="w-6 h-6 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="eyebrow">Finance</span>
            <h1 className="font-serif text-[28px] text-foreground tracking-tight mt-0.5">My Wallet</h1>
            <p className="text-sm text-muted-foreground">Deposit · Spend · Earn · Withdraw</p>
          </div>
        </div>
      </div>

      {/* ── Tab switcher ── */}
      <div role="tablist" aria-label="Wallet balance type" className="flex gap-1 mb-5 p-1 rounded-tag border border-border bg-secondary w-fit">
        {[["cash", "💵", "Cash Balance"], ["credits", "⚡", "AI Credits"]].map(([key, emoji, label]) => {
          const isActive = tab === key;
          return (
            <button key={key} onClick={() => setTab(key)}
              role="tab"
              aria-selected={isActive}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-tag text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span aria-hidden="true">{emoji}</span> {label}
            </button>
          );
        })}
      </div>

      {/* ── CASH TAB ── */}
      {tab === "cash" && (
        <>
          {/* Balance card — glass surface with gold amount */}
          <div className="surface-premium p-7 mb-5 ambient-section">
            <div className="relative z-10">
              <p className="eyebrow mb-2">Wallet Balance</p>
              <p className="text-6xl font-medium mb-1 tabular-nums font-display text-accent">
                ${(wallet?.balance || 0).toFixed(2)}
              </p>
              <p className="text-muted-foreground text-xs mb-5">Available for spending or withdrawal</p>
              <div className="flex gap-3">
                <button
                  onClick={() => navigate("/pay?mode=deposit")}
                  className="flex items-center justify-center gap-1.5 flex-1 py-2.5 font-medium text-sm border border-border text-foreground hover:bg-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
                  style={{ borderRadius: 6 }}
                >
                  <Plus className="w-4 h-4" /> Deposit
                </button>
                <button
                  onClick={() => setShowWithdraw(true)}
                  disabled={!wallet?.balance}
                  className="cta-gold flex items-center justify-center gap-1.5 flex-1 py-2.5 text-sm font-medium transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
                  style={{ borderRadius: 6 }}
                >
                  <ArrowUpRight className="w-4 h-4" /> Withdraw
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-3 text-center">
                Min deposit <span className="font-display">${MIN_DEPOSIT_USD}</span> · Min withdrawal <span className="font-display">${MIN_WITHDRAWAL_USD}</span>
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="stat-card">
              <div className="flex items-center justify-between mb-2">
                <span className="stat-card-label flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-gain" />Total Earned</span>
              </div>
              <p className="stat-card-value text-gain">${(wallet?.total_earned || 0).toFixed(2)}</p>
              <p className="stat-card-sub">You keep <span className="font-display">90%</span> of every subscription · After fees</p>
            </div>
            <div className="stat-card">
              <div className="flex items-center justify-between mb-2">
                <span className="stat-card-label flex items-center gap-1.5"><ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground" />Total Withdrawn</span>
              </div>
              <p className="stat-card-value">${(wallet?.total_withdrawn || 0).toFixed(2)}</p>
              <p className="stat-card-sub">Paid out via PayPal</p>
            </div>
          </div>

          <TransactionList transactions={cashTxs} />
        </>
      )}

      {/* ── AI CREDITS TAB ── */}
      {tab === "credits" && (
        <>
          {/* Credits balance card */}
          <div className="surface-premium p-7 mb-5 ambient-section">
            <div className="absolute top-5 right-6 text-4xl select-none z-10">⚡</div>
            <div className="relative z-10">
              <p className="eyebrow mb-2">AI Credits Balance</p>
              <div className="flex items-end gap-2 mb-1">
                <p className="text-6xl font-medium tabular-nums font-display text-accent">{aiCredits.toLocaleString()}</p>
                <span className="text-xl text-muted-foreground font-medium mb-2">cr.</span>
              </div>
              <p className="text-muted-foreground text-xs">For AI chat, fact-check on publish, and analyst tools</p>
            </div>
          </div>

          {/* Convert cash → credits */}
          <div className="surface p-5 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-tag flex items-center justify-center bg-accent/15">
                <RefreshCw className="w-3.5 h-3.5 text-accent" />
              </div>
              <h3 className="font-serif text-[14px] text-foreground">Convert cash → AI credits</h3>
              <span className="ml-auto pill-accent">
                Instant
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              $1 = {AI_CREDITS_PER_DOLLAR} credits · Wallet balance: <strong>${(wallet?.balance || 0).toFixed(2)}</strong>
            </p>
            <div className="flex gap-2 items-center">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
                <input
                  type="number" min="1" step="0.01" max={wallet?.balance || 0}
                  value={convertAmount}
                  onChange={e => setConvertAmount(e.target.value)}
                  placeholder="5.00"
                  className="w-full border border-input rounded-tag pl-7 pr-3 py-2.5 text-sm font-medium font-display outline-none focus:border-primary bg-background"
                />
              </div>
              <Button
                onClick={handleConvert}
                disabled={
                  converting ||
                  !parseFloat(convertAmount) ||
                  parseFloat(convertAmount) > (wallet?.balance || 0)
                }
              >
                {converting ? <Loader2 className="w-4 h-4 animate-spin" /> : `Get ${parseFloat(convertAmount || 0) * AI_CREDITS_PER_DOLLAR} cr.`}
              </Button>
            </div>
            {parseFloat(convertAmount) > (wallet?.balance || 0) && (
              <p className="text-[10px] text-loss mt-2">
                Exceeds balance. <button onClick={() => navigate("/pay?mode=deposit")} className="underline">Top up</button>?
              </p>
            )}
          </div>

          {/* Quick convert */}
          <div className="surface p-5 mb-4">
            <h3 className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-3">Quick convert</h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { dollars: 5,  credits: 50  },
                { dollars: 10, credits: 100 },
                { dollars: 25, credits: 250 },
              ].map(p => (
                <button
                  key={p.dollars}
                  onClick={() => setConvertAmount(String(p.dollars))}
                  disabled={(wallet?.balance || 0) < p.dollars}
                  className="rounded-tag border border-accent/30 bg-accent/5 p-4 text-center transition-all hover:bg-accent/10 hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Zap className="w-5 h-5 mx-auto mb-1.5 text-accent" />
                  <p className="font-display font-medium text-lg">${p.dollars}</p>
                  <p className="text-[10px] text-muted-foreground"><span className="font-display">{p.credits}</span> credits</p>
                </button>
              ))}
            </div>
          </div>

          {/* What credits unlock */}
          <div className="surface-premium p-5 mb-4">
            <h3 className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-3">What credits unlock</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { emoji: "🤖", cr: "1 cr.", label: "AI chat message" },
                { emoji: "✅", cr: "10 cr.", label: "Fact-check on publish" },
                { emoji: "📊", cr: "2 cr.", label: "Score deep-dive" },
                { emoji: "💡", cr: "15 cr.", label: "AI prediction assist" },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2.5 px-3 py-2.5 rounded-tag bg-background/40 border border-border/60">
                  <span className="text-lg">{item.emoji}</span>
                  <div>
                    <p className="text-[11px] font-medium font-display text-accent">{item.cr}</p>
                    <p className="text-[10px] text-muted-foreground">{item.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <TransactionList transactions={creditTxs} emptyMsg="No credit transactions yet." />
        </>
      )}

      {/* Withdraw modal */}
      {showWithdraw && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowWithdraw(false)}>
          <div className="surface p-6 w-full max-w-sm" style={{ background: "hsl(var(--card))" }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-tag flex items-center justify-center bg-primary">
                <ArrowUpRight className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-serif text-[16px] text-foreground">Withdraw to PayPal</h3>
                <p className="text-xs text-muted-foreground">Available: <span className="font-display font-medium">${wallet?.balance?.toFixed(2)}</span></p>
              </div>
            </div>
            <div className="relative mb-3">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
              <input
                type="number" min={MIN_WITHDRAWAL_USD} step="0.01" max={wallet?.balance || 0}
                value={withdrawAmount}
                onChange={e => setWithdrawAmount(e.target.value)}
                placeholder={`${MIN_WITHDRAWAL_USD}.00`}
                className="w-full border border-input rounded-tag pl-7 pr-4 py-3 text-lg font-medium font-display outline-none focus:border-primary bg-background"
              />
            </div>
            <p className="text-[10px] text-muted-foreground mb-4">
              Min ${MIN_WITHDRAWAL_USD} · PayPal payout fee (2%, capped $1) deducted.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowWithdraw(false)} disabled={withdrawing}>Cancel</Button>
              <Button
                className="flex-1"
                disabled={withdrawing || !parseFloat(withdrawAmount) || parseFloat(withdrawAmount) < MIN_WITHDRAWAL_USD || parseFloat(withdrawAmount) > (wallet?.balance || 0)}
                onClick={handleWithdraw}
              >
                {withdrawing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Withdraw"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Policy section at the bottom */}
      <WalletPolicy />
    </div>
  );
}

function TransactionList({ transactions, emptyMsg = "No transactions yet." }) {
  if (!transactions || transactions.length === 0) {
    return (
      <div className="text-center py-14 border border-dashed border-border rounded-tag">
        <Clock className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">{emptyMsg}</p>
      </div>
    );
  }
  return (
    <div className="surface overflow-hidden">
      <div className="px-5 py-4 border-b border-border/60 flex items-center gap-2 bg-secondary/40">
        <Clock className="w-4 h-4 text-muted-foreground" />
        <h2 className="font-serif text-[14px] text-foreground">Transaction History</h2>
        <span className="ml-auto text-[10px] font-medium text-muted-foreground"><span className="font-display">{transactions.length}</span> records</span>
      </div>
      <div className="divide-y divide-border/60">
        {transactions.map((tx, i) => {
          const cfg = TX_DISPLAY[tx.type] || TX_DISPLAY.earning;
          const Icon = cfg.icon;
          const showFees = (tx.platform_fee || tx.processing_fee) && tx.type === "report_earning";
          return (
            <div key={tx.id || i} className="flex items-center gap-3 px-5 py-3.5 hover:bg-secondary/40 transition-colors">
              <div className={`w-9 h-9 rounded-tag flex items-center justify-center shrink-0 ${cfg.bg}`}>
                <Icon className={`w-4 h-4 ${cfg.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{cfg.label}</p>
                {tx.note && <p className="text-xs text-muted-foreground truncate">{tx.note}</p>}
                <p className="text-[10px] text-muted-foreground">
                  {tx.created_date ? format(new Date(tx.created_date), "MMM d, yyyy · h:mm a") : "Just now"}
                  {tx.status === "refunded" && <span className="ml-2 text-accent font-medium">· Refunded</span>}
                </p>
              </div>
              <div className="text-right shrink-0">
                {tx.type === "conversion" ? (
                  <>
                    <p className="font-medium font-display text-sm text-loss">-${Math.abs(tx.amount).toFixed(2)}</p>
                    {tx.credits && <p className="text-[10px] font-medium font-display text-accent">+{tx.credits} cr.</p>}
                  </>
                ) : tx.type === "credits" ? (
                  <p className="font-medium font-display text-sm text-accent">+{tx.credits || 0} cr.</p>
                ) : (
                  <p className={`font-medium font-display text-sm ${tx.amount < 0 ? "text-loss" : "text-gain"}`}>
                    {tx.amount >= 0 ? "+" : ""}${Math.abs(tx.amount).toFixed(2)}
                  </p>
                )}
                {showFees && (
                  <p className="text-[9px] text-muted-foreground">-<span className="font-display">${(tx.platform_fee + tx.processing_fee).toFixed(2)}</span> fees</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
