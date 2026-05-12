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
  credits:               { icon: Zap,           color: "text-amber-600",  bg: "bg-amber-50",      label: "AI Credits",      sign: "+" },
  conversion:            { icon: RefreshCw,     color: "text-amber-600",  bg: "bg-amber-50",      label: "Cash → Credits",  sign: "-" },
  report_unlock:         { icon: ArrowUpRight,  color: "text-loss",       bg: "bg-loss/10",       label: "Report unlock",   sign: "-" },
  report_earning:        { icon: TrendingUp,    color: "text-gain",       bg: "bg-gain/10",       label: "Report earning",  sign: "+" },
  subscription_purchase: { icon: ArrowUpRight,  color: "text-loss",       bg: "bg-loss/10",       label: "Subscription",    sign: "-" },
  subscription_earning:  { icon: TrendingUp,    color: "text-gain",       bg: "bg-gain/10",       label: "Subscriber",      sign: "+" },
  boost:                 { icon: Zap,           color: "text-loss",       bg: "bg-loss/10",       label: "Boost",           sign: "-" },
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

  if (loading) return (
    <div className="flex items-center justify-center py-24 text-muted-foreground gap-2">
      <Loader2 className="w-5 h-5 animate-spin" /> Loading wallet…
    </div>
  );

  const aiCredits = wallet?.ai_credits || 0;
  const cashTxs   = transactions.filter(t => t.type !== "conversion" && t.type !== "credits");
  const creditTxs = transactions.filter(t => t.type === "conversion" || t.type === "credits");

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
          <Wallet className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">My Wallet</h1>
          <p className="text-sm text-muted-foreground">One balance for everything · Deposit · Spend · Earn · Withdraw</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-secondary rounded-xl p-1 w-fit">
        {[["cash", "💵 Cash"], ["credits", "⚡ AI Credits"]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${tab === key ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── CASH TAB ── */}
      {tab === "cash" && (
        <>
          {/* Balance card */}
          <div className="bg-gradient-to-br from-primary to-primary/80 text-white rounded-2xl p-6 mb-4">
            <p className="text-sm opacity-80 mb-1">Wallet Balance</p>
            <p className="text-5xl font-black mb-4">${(wallet?.balance || 0).toFixed(2)}</p>
            <div className="flex gap-3">
              <Button onClick={() => navigate("/pay?mode=deposit")} variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-0 flex-1">
                <Plus className="w-4 h-4 mr-1" /> Deposit
              </Button>
              <Button onClick={() => setShowWithdraw(true)} variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-0 flex-1" disabled={!wallet?.balance}>
                <ArrowUpRight className="w-4 h-4 mr-1" /> Withdraw
              </Button>
            </div>
            <p className="text-[11px] opacity-70 mt-3">
              Min deposit ${MIN_DEPOSIT_USD} · Min withdrawal ${MIN_WITHDRAWAL_USD}
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-gain" />
                <span className="text-xs text-muted-foreground">Total Earned</span>
              </div>
              <p className="text-xl font-bold text-gain">${(wallet?.total_earned || 0).toFixed(2)}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">After platform &amp; processing fees</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Total Withdrawn</span>
              </div>
              <p className="text-xl font-bold">${(wallet?.total_withdrawn || 0).toFixed(2)}</p>
            </div>
          </div>

          <TransactionList transactions={cashTxs} />
        </>
      )}

      {/* ── AI CREDITS TAB ── */}
      {tab === "credits" && (
        <>
          {/* Credit balance card */}
          <div className="bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-2xl p-6 mb-4">
            <p className="text-sm opacity-80 mb-1">AI Credits Balance</p>
            <div className="flex items-end gap-2 mb-1">
              <p className="text-5xl font-black">{aiCredits}</p>
              <span className="text-lg opacity-70 mb-1">credits</span>
            </div>
            <p className="text-xs opacity-70">For AI chat, fact-check on publish, and other analyst tools</p>
          </div>

          {/* Convert cash → credits (instant, no PayPal) */}
          <div className="bg-card border border-border rounded-2xl p-5 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <RefreshCw className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm">Convert cash → AI credits</h3>
              <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                Instant
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              $1 = {AI_CREDITS_PER_DOLLAR} credits · Wallet balance: ${(wallet?.balance || 0).toFixed(2)}
            </p>
            <div className="flex gap-2 items-center">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">$</span>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  max={wallet?.balance || 0}
                  value={convertAmount}
                  onChange={e => setConvertAmount(e.target.value)}
                  placeholder="5.00"
                  className="w-full border border-input rounded-xl pl-7 pr-3 py-2 text-sm font-bold outline-none focus:border-primary"
                />
              </div>
              <Button onClick={handleConvert} disabled={converting || !parseFloat(convertAmount)}>
                {converting ? <Loader2 className="w-4 h-4 animate-spin" /> : `Get ${parseFloat(convertAmount || 0) * AI_CREDITS_PER_DOLLAR} credits`}
              </Button>
            </div>
            {parseFloat(convertAmount) > (wallet?.balance || 0) && (
              <p className="text-[10px] text-loss mt-2">
                Amount exceeds wallet balance. <button onClick={() => navigate("/pay?mode=deposit")} className="underline">Top up</button>?
              </p>
            )}
          </div>

          {/* Suggested conversion amounts */}
          <div className="bg-card border border-border rounded-2xl p-5 mb-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Quick convert</h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { dollars: 5,  credits: 50  },
                { dollars: 10, credits: 100 },
                { dollars: 25, credits: 250 },
              ].map(p => (
                <button
                  key={p.dollars}
                  onClick={() => setConvertAmount(String(p.dollars))}
                  className="rounded-xl border border-border bg-secondary/30 hover:bg-amber-50 hover:border-amber-300 p-3 text-center transition-all"
                  disabled={(wallet?.balance || 0) < p.dollars}
                >
                  <Zap className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                  <p className="font-mono font-bold text-base">${p.dollars}</p>
                  <p className="text-[10px] text-muted-foreground">= {p.credits} credits</p>
                </button>
              ))}
            </div>
          </div>

          {/* Credit usage chart (where credits get spent) */}
          <div className="bg-card border border-border rounded-2xl p-5 mb-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">What credits unlock</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2"><span>🤖</span><span><strong>1 cr.</strong> AI chat message</span></div>
              <div className="flex items-center gap-2"><span>✅</span><span><strong>10 cr.</strong> Fact-check on publish</span></div>
              <div className="flex items-center gap-2"><span>📊</span><span><strong>2 cr.</strong> Score breakdown deep-dive</span></div>
              <div className="flex items-center gap-2"><span>💡</span><span><strong>15 cr.</strong> AI prediction assist</span></div>
            </div>
          </div>

          <TransactionList transactions={creditTxs} emptyMsg="No credit transactions yet." />
        </>
      )}

      {/* Withdraw modal */}
      {showWithdraw && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowWithdraw(false)}>
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
              <ArrowUpRight className="w-5 h-5 text-loss" /> Withdraw to PayPal
            </h3>
            <p className="text-sm text-muted-foreground mb-3">Available: <strong>${wallet?.balance?.toFixed(2)}</strong></p>
            <div className="relative mb-3">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">$</span>
              <input
                type="number" min={MIN_WITHDRAWAL_USD} step="0.01" max={wallet?.balance || 0}
                value={withdrawAmount}
                onChange={e => setWithdrawAmount(e.target.value)}
                placeholder={`${MIN_WITHDRAWAL_USD}.00`}
                className="w-full border border-input rounded-xl pl-7 pr-4 py-3 text-lg font-bold outline-none focus:border-primary"
              />
            </div>
            <p className="text-[10px] text-muted-foreground mb-4">
              Minimum withdrawal ${MIN_WITHDRAWAL_USD}. PayPal payout fee (2%, capped $1) deducted from amount.
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
    return <div className="text-center py-12 text-muted-foreground text-sm">{emptyMsg}</div>;
  }
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Clock className="w-4 h-4 text-muted-foreground" />
        <h2 className="font-semibold text-sm">Transaction History</h2>
      </div>
      <div className="divide-y divide-border">
        {transactions.map((tx, i) => {
          const cfg = TX_DISPLAY[tx.type] || TX_DISPLAY.earning;
          const Icon = cfg.icon;
          const showFees = (tx.platform_fee || tx.processing_fee) && tx.type === "report_earning";
          return (
            <div key={tx.id || i} className="flex items-center gap-3 px-4 py-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${cfg.bg}`}>
                <Icon className={`w-4 h-4 ${cfg.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{cfg.label}</p>
                {tx.note && <p className="text-xs text-muted-foreground truncate">{tx.note}</p>}
                <p className="text-[10px] text-muted-foreground">
                  {tx.created_date ? format(new Date(tx.created_date), "MMM d, yyyy · h:mm a") : "Just now"}
                  {tx.status === "refunded" && <span className="ml-2 text-amber-600 font-semibold">· Refunded</span>}
                </p>
              </div>
              <div className="text-right">
                {tx.type === "conversion" ? (
                  <>
                    <p className="font-bold text-sm text-loss">-${Math.abs(tx.amount).toFixed(2)}</p>
                    {tx.credits && <p className="text-[10px] font-bold text-amber-600">+{tx.credits} cr.</p>}
                  </>
                ) : tx.type === "credits" ? (
                  <p className="font-bold text-sm text-amber-600">+{tx.credits || 0} cr.</p>
                ) : (
                  <p className={`font-bold text-sm ${tx.amount < 0 ? "text-loss" : "text-gain"}`}>
                    {tx.amount >= 0 ? "+" : ""}${Math.abs(tx.amount).toFixed(2)}
                  </p>
                )}
                {showFees && (
                  <p className="text-[9px] text-muted-foreground">
                    -${(tx.platform_fee + tx.processing_fee).toFixed(2)} fees
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
