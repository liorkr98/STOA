export default function AnalystConsensus({ ratings }) {
  if (!ratings) return null;
  const trend = ratings.trend?.[0];
  if (!trend) return null;

  const strongBuy  = trend.strongBuy  || 0;
  const buy        = trend.buy        || 0;
  const hold       = trend.hold       || 0;
  const sell       = trend.sell       || 0;
  const strongSell = trend.strongSell || 0;
  const total      = strongBuy + buy + hold + sell + strongSell || 1;

  const bullPct = Math.round(((strongBuy + buy) / total) * 100);
  const bearPct = Math.round(((sell + strongSell) / total) * 100);
  const holdPct = 100 - bullPct - bearPct;

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="font-semibold text-sm mb-4">Analyst Consensus</h3>

      {/* Sentiment bar */}
      <div className="flex h-3 rounded-full overflow-hidden mb-3">
        <div style={{ width: `${bullPct}%` }} className="bg-gain" />
        <div style={{ width: `${holdPct}%` }} className="bg-amber-400" />
        <div style={{ width: `${bearPct}%` }} className="bg-loss" />
      </div>
      <div className="flex justify-between text-xs mb-4">
        <span className="text-gain font-semibold">Buy {bullPct}%</span>
        <span className="text-amber-500 font-semibold">Hold {holdPct}%</span>
        <span className="text-loss font-semibold">Sell {bearPct}%</span>
      </div>
      <div className="text-xs text-muted-foreground mb-4">
        <span className="font-semibold text-foreground">{strongBuy}</span> Strong Buy ·{" "}
        <span className="font-semibold text-foreground">{buy}</span> Buy ·{" "}
        <span className="font-semibold text-foreground">{hold}</span> Hold ·{" "}
        <span className="font-semibold text-foreground">{sell}</span> Sell ·{" "}
        <span className="font-semibold text-foreground">{strongSell}</span> Strong Sell
      </div>

      {/* Recent upgrades */}
      {ratings.upgrades?.length > 0 && (
        <div>
          <div className="text-xs font-semibold mb-2">Recent Rating Changes</div>
          {ratings.upgrades.slice(0, 5).map((u, i) => {
            const toGrade = u.toGrade || "";
            const color = toGrade.toLowerCase().includes("buy")
              ? "text-gain"
              : toGrade.toLowerCase().includes("sell")
              ? "text-loss"
              : "text-amber-500";
            return (
              <div key={i} className="flex justify-between py-2 border-t border-border/50 text-xs">
                <span className="text-foreground">{u.firm}</span>
                <span className={`font-medium ${color}`}>
                  {u.fromGrade ? `${u.fromGrade} → ` : ""}{u.toGrade}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}