import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  Wallet, ArrowDownLeft, ArrowUpRight, Plus, Loader2,
  TrendingUp, Clock, Zap, ShoppingCart, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

const TX_CONFIG = {
  deposit:    { icon: ArrowDownLeft, color: "text-gain",    bg: "bg-gain/10",    label: "Deposit",         sign: "+" },
  withdrawal: { icon: ArrowUpRight,  color: "text-loss",    bg: "bg-loss/10",    label: "Withdrawal",      sign: "-" },
  earning:    { icon: TrendingUp,    color: "text-primary", bg: "bg-primary/10", label: "Earning",         sign: "+" },
  credits:    { icon: Zap,           color: "text-amber-600", bg: "bg-amber-50", label: "AI Credits",      sign: "+" },
};

const CREDIT_PACKS = [
  { credits: 50,   price: 5,  label: "Starter",  popular: false },
  { credits: 120,  price: 10, label: "Creator",  popular: true  },
  { credits: 350,  price: 25, label: "Pro",       popular: false },
];

export default function WalletPage() {
  const navigate = useNavigate();
  const [wallet, setWallet]           = useState(null);
  const [user, setUser]               = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [modal, setModal]             = useState(null); // "deposit" | "withdraw"
  const [amount, setAmount]           = useState("");
  const [note, setNote]               = useState("");
  const [submitting, setSubmitting]   = useState(false);
  const [tab, setTab]                 = useState("cash"); // "cash" | "credits"

  useEffect(() => { loadWallet(); }, []);

  const loadWallet = async () => {
    setLoading(true);
    const me = await base44.auth.me();
    setUser(me);
    const [wallets, txs] = await Promise.all([
      base44.entities.Wallet.filter({ created_by: me.email }),
      base44.entities.WalletTransaction.filter({ created_by: me.email }, "-created_date", 100),
    ]);
    if (wallets.length > 0) {
      setWallet(wallets[0]);
    } else {
      const w = await base44.entities.Wallet.create({ balance: 0, total_earned: 0, total_withdrawn: 0, ai_credits: 0 });
      setWallet(w);
    }
    setTransactions(txs || []);
    setLoading(false);
  };

  const handleSubmit = async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) return;
    if (modal === "withdraw" && val > wallet.balance) return;

    setSubmitting(true);
    const type = modal === "deposit" ? "deposit" : "withdrawal";
    await base44.entities.WalletTransaction.create({ type, amount: val, status: "completed", note });

    const newBalance = modal === "deposit" ? wallet.balance + val : wallet.balance - val;
    const updates = { balance: newBalance };
    if (modal === "withdraw") updates.total_withdrawn = (wallet.total_withdrawn || 0) + val;

    const updated = await base44.entities.Wallet.update(wallet.id, updates);
    setWallet(updated);
    setTransactions(prev => [{ type, amount: val, status: "completed", note, created_date: new Date().toISOString() }, ...prev]);
    setAmount("");
    setNote("");
    setModal(null);
    setSubmitting(false);
  };

  const aiCredits = wallet?.ai_credits ?? user?.ai_credits ?? 0;
  const cashTxs   = transactions.filter(t => t.type !== "credits");
  const creditTxs = transactions.filter(t => t.type === "credits");

  if (loading) return (
    <div className="flex items-center justify-center py-24 text-muted-foreground gap-2">
      <Loader2 className="w-5 h-5 animate-spin" /> Loading wallet...
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
          <Wallet className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">My Wallet</h1>
          <p className="text-sm text-muted-foreground">Manage your STOA earnings &amp; AI credits</p>
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
          <div className="bg-gradient-to-br from-primary to-primary/80 text-white rounded-2xl p-6 mb-4">
            <p className="text-sm opacity-80 mb-1">Available Balance</p>
            <p className="text-5xl font-black mb-4">${(wallet?.balance || 0).toFixed(2)}</p>
            <div className="flex gap-3">
              <Button onClick={() => setModal("deposit")} variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-0 flex-1">
                <Plus className="w-4 h-4 mr-1" /> Deposit
              </Button>
              <Button onClick={() => setModal("withdraw")} variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-0 flex-1" disabled={!wallet?.balance}>
                <ArrowUpRight className="w-4 h-4 mr-1" /> Withdraw
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-gain" />
                <span className="text-xs text-muted-foreground">Total Earned</span>
              </div>
              <p className="text-xl font-bold text-gain">${(wallet?.total_earned || 0).toFixed(2)}</p>
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

      {/* ── CREDITS TAB ── */}
      {tab === "credits" && (
        <>
          {/* Credit balance card */}
          <div className="bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-2xl p-6 mb-4">
            <p className="text-sm opacity-80 mb-1">AI Credits Balance</p>
            <div className="flex items-end gap-2 mb-1">
              <p className="text-5xl font-black">{aiCredits}</p>
              <span className="text-lg opacity-70 mb-1">cr.</span>
            </div>
            <p className="text-xs opacity-70">Used for AI report analysis, fact-checking &amp; score insights</p>
          </div>

          {/* What credits do */}
          <div className="bg-card border border-border rounded-xl p-4 mb-4">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">What AI Credits unlock</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                ["🤖", "AI Report Analysis", "10 cr."],
                ["✅", "Fact Checker",        "5 cr."],
                ["📊", "Score Breakdown",    "2 cr."],
                ["💡", "Prediction Assist",  "15 cr."],
              ].map(([icon, label, cost]) => (
                <div key={label} className="flex items-center gap-2 text-xs">
                  <span className="text-base">{icon}</span>
                  <div>
                    <p className="font-medium">{label}</p>
                    <p className="text-muted-foreground">{cost} per use</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Credit packs */}
          <div className="bg-card border border-border rounded-xl overflow-hidden mb-4">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-muted-foreground" />
              <h2 className="font-semibold text-sm">Buy AI Credits</h2>
            </div>
            <div className="p-4 grid grid-cols-3 gap-3">
              {CREDIT_PACKS.map(pack => (
                <button
                  key={pack.credits}
                  onClick={() => navigate(`/pay?mode=credits&credits=${pack.credits}&price=${pack.price}&label=${encodeURIComponent(pack.label)}`)}
                  className={`relative rounded-xl border-2 p-3 text-center transition-all hover:border-amber-400 ${pack.popular ? "border-amber-400 bg-amber-50" : "border-border"}`}
                >
                  {pack.popular && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] bg-amber-500 text-white px-2 py-0.5 rounded-full font-bold whitespace-nowrap">
                      Best Value
                    </span>
                  )}
                  <Zap className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                  <p className="text-xl font-black text-amber-600">{pack.credits}</p>
                  <p className="text-[10px] text-muted-foreground mb-1">credits</p>
                  <p className="text-sm font-bold">${pack.price}</p>
                  <p className="text-[10px] text-muted-foreground">{(pack.price / pack.credits * 100).toFixed(1)}¢ each</p>
                </button>
              ))}
            </div>
          </div>

          {/* Convert cash to credits */}
          <div className="bg-card border border-border rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold flex items-center gap-1.5">
                  <RefreshCw className="w-4 h-4 text-primary" /> Convert Cash → Credits
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">$1 = 12 credits · Available: ${(wallet?.balance || 0).toFixed(2)}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(`/pay?mode=credits&source=wallet`)}
                disabled={!wallet?.balance}
              >
                Convert
              </Button>
            </div>
          </div>

          <TransactionList transactions={creditTxs} emptyMsg="No credit transactions yet." />
        </>
      )}

      {/* Cash modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              {modal === "deposit"
                ? <><ArrowDownLeft className="w-5 h-5 text-gain" /> Deposit Funds</>
                : <><ArrowUpRight className="w-5 h-5 text-loss" /> Withdraw Funds</>}
            </h3>
            {modal === "withdraw" && (
              <p className="text-sm text-muted-foreground mb-3">Available: <strong>${wallet?.balance?.toFixed(2)}</strong></p>
            )}
            <div className="relative mb-3">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">$</span>
              <input
                type="number" min="0" step="0.01"
                value={amount} onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full border border-input rounded-xl pl-7 pr-4 py-3 text-lg font-bold outline-none focus:border-primary"
              />
            </div>
            <input
              value={note} onChange={e => setNote(e.target.value)}
              placeholder="Note (optional)"
              className="w-full border border-input rounded-xl px-3 py-2 text-sm outline-none focus:border-primary mb-4"
            />
            {modal === "withdraw" && parseFloat(amount) > wallet?.balance && (
              <p className="text-xs text-loss mb-3">Amount exceeds available balance.</p>
            )}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setModal(null)}>Cancel</Button>
              <Button
                className="flex-1"
                disabled={submitting || !parseFloat(amount) || parseFloat(amount) <= 0 || (modal === "withdraw" && parseFloat(amount) > wallet?.balance)}
                onClick={handleSubmit}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : modal === "deposit" ? "Deposit" : "Withdraw"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TransactionList({ transactions, emptyMsg = "No transactions yet." }) {
  if (transactions.length === 0) {
    return <div className="text-center py-12 text-muted-foreground text-sm">{emptyMsg}</div>;
  }
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Clock className="w-4 h-4 text-muted-foreground" />
        <h2 className="font-semibold text-sm">Transaction History</h2>
      </div>
      <div className="divide-y divide-border">
        {transactions.map((tx, i) => {
          const cfg = TX_CONFIG[tx.type] || TX_CONFIG.earning;
          const Icon = cfg.icon;
          return (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${cfg.bg}`}>
                <Icon className={`w-4 h-4 ${cfg.color}`} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{cfg.label}</p>
                {tx.note && <p className="text-xs text-muted-foreground">{tx.note}</p>}
                <p className="text-xs text-muted-foreground">
                  {tx.created_date ? format(new Date(tx.created_date), "MMM d, yyyy · h:mm a") : "Just now"}
                </p>
              </div>
              <div className="text-right">
                <p className={`font-bold text-sm ${tx.type === "withdrawal" ? "text-loss" : tx.type === "credits" ? "text-amber-600" : "text-gain"}`}>
                  {tx.type === "credits" ? `+${tx.credits || tx.amount} cr.` : `${cfg.sign}$${tx.amount?.toFixed(2)}`}
                </p>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tx.status === "completed" ? "bg-gain/10 text-gain" : "bg-amber-100 text-amber-700"}`}>
                  {tx.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
