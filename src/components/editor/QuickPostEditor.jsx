import React from "react";
import { Button } from "@/components/ui/button";
import { ImageIcon, Send, Zap, BarChart3, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { fetchLockPrice } from "@/lib/priceLockProvider";

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
        author_avatar: currentUser?.picture || null,
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
      <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" /> Quick Post
        </h2>

        <textarea
          placeholder="What's your market take? Use $TICKER to tag stocks..."
          className="w-full border border-border rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
          rows={4}
          value={title}
          onChange={e => setTitle(e.target.value)}
        />

        {/* Image & Chart attachments */}
        <div className="flex gap-2">
          {!quickImage ? (
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
              padding: "8px 12px", border: "1px dashed #e2e8f0", borderRadius: 8,
              fontSize: 13, color: "#6b7280", width: "fit-content" }}>
              <ImageIcon style={{ width: 15, height: 15 }} />
              Add image
              <input type="file" accept="image/*" style={{ display: "none" }}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const { file_url } = await base44.integrations.Core.UploadFile({ file });
                  setQuickImage(file_url);
                }} />
            </label>
          ) : (
            <div style={{ position: "relative" }}>
              <img src={quickImage} style={{ width: "100%", maxHeight: 240, objectFit: "cover", borderRadius: 8 }} alt="attachment" />
              <button onClick={() => setQuickImage(null)}
                style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,0.5)",
                  color: "white", border: "none", borderRadius: "50%", width: 24, height: 24,
                  cursor: "pointer", fontSize: 14, lineHeight: "24px", textAlign: "center" }}>
                ×
              </button>
            </div>
          )}
          
          {!quickChart ? (
            <button onClick={() => setQuickChart("AAPL")} className="text-xs text-primary border border-primary/30 rounded-lg px-3 py-1.5 hover:bg-primary/5 transition-colors flex items-center gap-1">
              <BarChart3 className="w-3.5 h-3.5" /> Add chart
            </button>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/30 rounded-lg">
              <span className="text-xs font-semibold text-primary">${quickChart}</span>
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
          className="text-xs text-primary border border-primary/30 rounded-lg px-3 py-1.5 hover:bg-primary/5 transition-colors"
        >
          {quickShowPrediction ? "▾ Hide Prediction" : "+ Short-term Prediction"}
        </button>

        {quickShowPrediction && (
          <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, padding: 12 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              {["BUY","SELL","HOLD"].map(action => (
                <button key={action} onClick={() => setQuickAction(action)}
                  style={{ padding: "4px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
                    background: quickAction === action ? (action==="BUY"?"#16a34a":action==="SELL"?"#dc2626":"#f59e0b") : "#fff",
                    color: quickAction === action ? "#fff" : "#374151",
                    border: "1px solid " + (action==="BUY"?"#16a34a":action==="SELL"?"#dc2626":"#f59e0b") }}>
                  {action}
                </button>
              ))}
              <input placeholder="$TICKER" value={quickTicker} onChange={e => setQuickTicker(e.target.value.toUpperCase())}
                style={{ width: 80, padding: "4px 8px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 13 }} />
              <select value={quickTimeframe} onChange={e => setQuickTimeframe(e.target.value)}
                style={{ padding: "4px 8px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 13 }}>
                <option value="2h">2 hours</option>
                <option value="4h">4 hours</option>
                <option value="1d">1 day</option>
                <option value="2d">2 days</option>
                <option value="3d">3 days</option>
                <option value="1w">1 week</option>
              </select>
              <input placeholder="Target $" value={quickTarget} onChange={e => setQuickTarget(e.target.value)}
                style={{ width: 90, padding: "4px 8px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 13 }} />
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