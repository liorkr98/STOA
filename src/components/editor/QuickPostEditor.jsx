import React from "react";
import { Button } from "@/components/ui/button";
import { ImageIcon, Send, Zap, BarChart3, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { fetchLockPrice } from "@/lib/priceLockProvider";
import { avatarUrl } from "@/lib/avatarUrl";

export default function QuickPostEditor({
  quickImage, setQuickImage,
  quickShowPrediction, setQuickShowPrediction,
  quickAction, setQuickAction,
  quickTicker, setQuickTicker,
  quickTimeframe, setQuickTimeframe,
  quickTarget, setQuickTarget,
  title, setTitle,
}) {
  const navigate = useNavigate();
  const [quickChart, setQuickChart] = React.useState(null);

  const handlePublish = async () => {
    if (!title.trim()) { toast.error("Write something first!"); return; }
    try {
      const currentUser = await base44.auth.me();
      const blocks = [];
      if (quickImage) blocks.push({ type: "image", content: quickImage });
      if (quickChart) blocks.push({ type: "chart", ticker: quickChart });

      // Lock price if prediction is set — same guarantee as the full editor
      let lockPrice = null, lockTime = null, lockSource = null;
      if (quickShowPrediction && quickTicker) {
        toast.info(`Locking live price for $${quickTicker}…`, { duration: 1800 });
        try {
          const locked = await fetchLockPrice(quickTicker);
          lockPrice = locked.price;
          lockTime  = locked.timestamp;
          lockSource = locked.source;
        } catch {
          toast.error(`Could not fetch live price for $${quickTicker}. Try again.`);
          return;
        }
      }

      await base44.entities.Report.create({
        title: title.trim(),
        content_blocks: JSON.stringify(blocks),
        status: "published",
        author_name: currentUser?.full_name || currentUser?.email?.split("@")[0] || "Researcher",
        author_avatar: avatarUrl(currentUser) || null,
        ...(quickShowPrediction && quickTicker ? {
          prediction_action:       quickAction,
          prediction_ticker:       quickTicker,
          prediction_timeframe:    quickTimeframe,
          prediction_target_price: quickTarget ? parseFloat(quickTarget) : null,
          prediction_lock_price:   lockPrice,
          prediction_lock_time:    lockTime,
          prediction_lock_source:  lockSource,
        } : {}),
      });
      toast.success(lockPrice
        ? `Published · Locked $${quickTicker} @ $${lockPrice.toFixed(2)}`
        : "Quick post published!"
      );
      navigate("/feed");
    } catch (err) {
      toast.error("Failed: " + err.message);
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-6">
      <div className="surface p-5 space-y-3">
        <h2 className="font-serif text-[16px] text-foreground flex items-center gap-2">
          <Zap className="w-4 h-4 text-accent" /> Quick Post
        </h2>

        <textarea
          placeholder="What's your market take? Use $TICKER to tag stocks..."
          className="w-full border border-border rounded-tag p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
          rows={4}
          value={title}
          onChange={e => setTitle(e.target.value)}
        />

        {/* Image & Chart attachments */}
        <div className="flex gap-2">
          {!quickImage ? (
            <label className="flex items-center gap-2 cursor-pointer px-3 py-2 border border-dashed border-border rounded-tag text-[13px] text-muted-foreground w-fit hover:text-foreground hover:border-primary/40 transition-colors">
              <ImageIcon className="w-[15px] h-[15px]" />
              Add image
              <input type="file" accept="image/*" className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const { file_url } = await base44.integrations.Core.UploadFile({ file });
                  setQuickImage(file_url);
                }} />
            </label>
          ) : (
            <div className="relative">
              <img src={quickImage} className="w-full max-h-60 object-cover rounded-tag" alt="attachment" />
              <button onClick={() => setQuickImage(null)}
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/50 text-white border-0 text-sm leading-6 text-center cursor-pointer">
                ×
              </button>
            </div>
          )}
          
          {!quickChart ? (
            <button onClick={() => setQuickChart("AAPL")} className="text-xs text-primary border border-primary/40 rounded-tag px-3 py-1.5 hover:bg-primary/10 transition-colors flex items-center gap-1">
              <BarChart3 className="w-3.5 h-3.5" /> Add chart
            </button>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/30 rounded-tag">
              <span className="text-xs font-medium font-display text-primary">${quickChart}</span>
              <button onClick={() => setQuickChart(null)} className="text-primary hover:text-primary/70">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {quickChart && (
          <input placeholder="Ticker (e.g. AAPL)" value={quickChart} onChange={e => setQuickChart(e.target.value.toUpperCase())}
            className="text-xs border border-border rounded-lg px-2 py-1.5 w-24 focus:outline-none focus:ring-1 focus:ring-primary/30" />
        )}

        {/* Short prediction toggle */}
        <button
          onClick={() => setQuickShowPrediction(p => !p)}
          className="text-xs text-primary border border-primary/40 rounded-tag px-3 py-1.5 hover:bg-primary/10 transition-colors"
        >
          {quickShowPrediction ? "▾ Hide Prediction" : "+ Short-term Prediction"}
        </button>

        {quickShowPrediction && (
          <div className="bg-secondary/50 border border-border rounded-tag p-3">
            <div className="flex gap-2 flex-wrap items-center">
              {["BUY","SELL","HOLD"].map(action => {
                const isActive = quickAction === action;
                const tone = action === "BUY"
                  ? "bg-gain/10 text-gain border-gain/30"
                  : action === "SELL"
                  ? "bg-loss/10 text-loss border-loss/30"
                  : "bg-secondary text-muted-foreground border-border";
                return (
                  <button key={action} onClick={() => setQuickAction(action)}
                    className={`px-3 py-1 rounded-sm text-xs font-medium border transition-colors ${
                      isActive
                        ? action === "BUY" ? "bg-gain text-white border-gain"
                          : action === "SELL" ? "bg-loss text-white border-loss"
                          : "bg-foreground text-background border-foreground"
                        : tone
                    }`}>
                    {action}
                  </button>
                );
              })}
              <input placeholder="$TICKER" value={quickTicker} onChange={e => setQuickTicker(e.target.value.toUpperCase())}
                className="w-20 px-2 py-1 border border-border rounded-sm text-[13px] font-display bg-background" />
              <select value={quickTimeframe} onChange={e => setQuickTimeframe(e.target.value)}
                className="px-2 py-1 border border-border rounded-sm text-[13px] bg-background">
                <option value="2h">2 hours</option>
                <option value="4h">4 hours</option>
                <option value="1d">1 day</option>
                <option value="2d">2 days</option>
                <option value="3d">3 days</option>
                <option value="1w">1 week</option>
              </select>
              <input placeholder="Target $" value={quickTarget} onChange={e => setQuickTarget(e.target.value)}
                className="w-[90px] px-2 py-1 border border-border rounded-sm text-[13px] font-display bg-background" />
            </div>
          </div>
        )}

        <Button onClick={handlePublish} className="w-full gap-2">
          <Send className="w-4 h-4" /> Publish Quick Post
        </Button>
      </div>
    </div>
  );
}