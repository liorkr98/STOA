import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Wallet, ArrowDownLeft, ArrowUpRight, Plus, Loader2, TrendingUp, DollarSign, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

const TX_CONFIG = {
  deposit: { icon: ArrowDownLeft, color: "text-gain", bg: "bg-gain/10", label: "Deposit", sign: "+" },
  withdrawal: { icon: ArrowUpRight, color: "text-loss", bg: "bg-loss/10", label: "Withdrawal", sign: "-" },
  earning: { icon: TrendingUp, color: "text-primary", bg: "bg-primary/10", label: "Earning", sign: "+" },
};

export default function WalletPage() {
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // "deposit" | "withdraw"
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadWallet();
  }, []);

  const loadWallet = async () => {
    setLoading(true);
    const user = await base44.auth.me();
    const [wallets, txs] = await Promise.all([
      base44.entities.Wallet.filter({ created_by: user.email }),
      base44.entities.WalletTransaction.filter({ created_by: user.email }, "-created_date", 50),
    ]);
    if (wallets.length > 0) {
      setWallet(wallets[0]);
    } else {
      // Auto-create wallet
      const newWallet = await base44.entities.Wallet.create({ balance: 0, total_earned: 0, total_withdrawn: 0 });
      setWallet(newWallet);
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
          <p className="text-sm text-muted-foreground">Manage your Stoa earnings</p>
        </div>
      </div>

      {/* Balance card */}
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

      {/* Stats */}
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

      {/* Transactions */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm">Transaction History</h2>
        </div>
        {transactions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">No transactions yet.</div>
        ) : (
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
                    <p className={`font-bold text-sm ${tx.type === "withdrawal" ? "text-loss" : "text-gain"}`}>
                      {cfg.sign}${tx.amount?.toFixed(2)}
                    </p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tx.status === "completed" ? "bg-gain/10 text-gain" : "bg-amber-100 text-amber-700"}`}>
                      {tx.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              {modal === "deposit" ? <><ArrowDownLeft className="w-5 h-5 text-gain" /> Deposit Funds</> : <><ArrowUpRight className="w-5 h-5 text-loss" /> Withdraw Funds</>}
            </h3>
            {modal === "withdraw" && (
              <p className="text-sm text-muted-foreground mb-3">Available: <strong>${wallet?.balance?.toFixed(2)}</strong></p>
            )}
            <div className="relative mb-3">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full border border-input rounded-xl pl-7 pr-4 py-3 text-lg font-bold outline-none focus:border-primary"
              />
            </div>
            <input
              value={note}
              onChange={e => setNote(e.target.value)}
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