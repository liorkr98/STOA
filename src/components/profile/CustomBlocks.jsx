import React, { useState, useEffect, useRef } from "react";
import {
  Type, Image as ImageIcon, Link as LinkIcon, BarChart3,
  Plus, Trash2, GripVertical, ExternalLink, X,
  Youtube, Twitter, Linkedin, Mail, Globe, MessageCircle,
  Send, Music, Mic, Heart, BookOpen, Github, Loader2,
} from "lucide-react";
import { base44 } from "@/api/base44Client";

// ── Block type registry ───────────────────────────────────────────────────────
export const BLOCK_TYPES = [
  { type: "text",   label: "Text section",     desc: "Write a paragraph: announcements, methodology, disclosures",   icon: Type },
  { type: "links",  label: "Links",            desc: "Linktree-style: Substack, YouTube, Discord, podcast, etc.",     icon: LinkIcon },
  { type: "image",  label: "Image",            desc: "Embed an image by URL (banner, screenshot, infographic)",       icon: ImageIcon },
  { type: "chart",  label: "Ticker spotlight", desc: "Show a stock's live price and % change — \"stocks I cover\"",   icon: BarChart3 },
];

// ── Link icon auto-detection ──────────────────────────────────────────────────
function iconForUrl(url) {
  if (!url) return { Icon: Globe, color: "#64748b", label: "Website" };
  const u = url.toLowerCase();
  if (u.includes("substack.com"))                                return { Icon: BookOpen,    color: "#ff6719", label: "Substack" };
  if (u.includes("youtube.com") || u.includes("youtu.be"))       return { Icon: Youtube,     color: "#ff0000", label: "YouTube" };
  if (u.includes("twitter.com") || u.includes("x.com"))          return { Icon: Twitter,     color: "#000000", label: "X / Twitter" };
  if (u.includes("linkedin.com"))                                return { Icon: Linkedin,    color: "#0a66c2", label: "LinkedIn" };
  if (u.includes("discord."))                                    return { Icon: MessageCircle,color: "#5865f2", label: "Discord" };
  if (u.includes("t.me") || u.includes("telegram"))              return { Icon: Send,        color: "#26a5e4", label: "Telegram" };
  if (u.includes("patreon.com"))                                 return { Icon: Heart,       color: "#ff424d", label: "Patreon" };
  if (u.includes("spotify.com"))                                 return { Icon: Music,       color: "#1db954", label: "Spotify" };
  if (u.includes("podcast") || u.includes("apple.co/podcast"))   return { Icon: Mic,         color: "#9933cc", label: "Podcast" };
  if (u.includes("github.com"))                                  return { Icon: Github,      color: "#24292f", label: "GitHub" };
  if (u.startsWith("mailto:"))                                   return { Icon: Mail,        color: "#475569", label: "Email" };
  return { Icon: Globe, color: "#475569", label: "Website" };
}

// ── Ticker spotlight live price fetch ─────────────────────────────────────────
async function fetchTickerQuote(symbol) {
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}&formatted=false`;
  const r = await base44.functions.invoke("proxyFetch", { url, headers: { "User-Agent": "Mozilla/5.0" } });
  const q = r?.data?.quoteResponse?.result?.[0];
  if (!q?.regularMarketPrice) return null;
  return {
    price:  q.regularMarketPrice,
    change: q.regularMarketChangePercent,
    name:   q.shortName || q.longName || symbol,
  };
}

// ── Block renderers (public-facing) ───────────────────────────────────────────
function TextBlockView({ block }) {
  return (
    <div className="surface p-5">
      {block.title && <h3 className="font-serif text-[14px] text-foreground mb-2">{block.title}</h3>}
      <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{block.content || ""}</p>
    </div>
  );
}

function ImageBlockView({ block }) {
  if (!block.url) return null;
  return (
    <div className="surface p-3 overflow-hidden">
      {block.title && <h3 className="font-serif text-[14px] text-foreground mb-2 px-2">{block.title}</h3>}
      <img
        src={block.url}
        alt={block.caption || block.title || "Image"}
        className="w-full rounded-tag object-cover max-h-96"
        loading="lazy"
        onError={e => { e.target.style.display = "none"; }}
      />
      {block.caption && <p className="text-xs text-muted-foreground text-center mt-2 italic">{block.caption}</p>}
    </div>
  );
}

function LinksBlockView({ block }) {
  const items = block.links || [];
  if (items.length === 0) return null;
  return (
    <div className="surface p-5">
      {block.title && <h3 className="font-serif text-[14px] text-foreground mb-3">{block.title}</h3>}
      <div className="space-y-2">
        {items.map((item, i) => {
          const { Icon, color, label: defaultLabel } = iconForUrl(item.url);
          return (
            <a
              key={i}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3 rounded-tag border border-border bg-secondary/30 hover:bg-secondary hover:border-primary/30 transition-all group"
            >
              <span className="w-8 h-8 rounded-tag flex items-center justify-center flex-shrink-0" style={{ background: `${color}15`, color }}>
                <Icon className="w-4 h-4" />
              </span>
              <span className="text-sm font-medium flex-1 truncate">{item.label || defaultLabel}</span>
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
            </a>
          );
        })}
      </div>
    </div>
  );
}

function ChartBlockView({ block }) {
  const ticker = (block.ticker || "").toUpperCase();
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ticker) { setLoading(false); return; }
    fetchTickerQuote(ticker).then(q => setQuote(q)).finally(() => setLoading(false));
  }, [ticker]);

  if (!ticker) return null;
  const isUp = (quote?.change ?? 0) >= 0;
  return (
    <a
      href={`/stock?ticker=${ticker}`}
      className="block surface surface-interactive p-5"
    >
      {block.title && <h3 className="font-serif text-[14px] text-foreground mb-3">{block.title}</h3>}
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="font-display font-medium text-lg">${ticker}</p>
          {quote?.name && <p className="text-xs text-muted-foreground truncate">{quote.name}</p>}
        </div>
        <div className="text-right">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          ) : quote ? (
            <>
              <p className="font-display font-medium text-base">${quote.price.toFixed(2)}</p>
              <p className={`text-xs font-medium font-display ${isUp ? "text-gain" : "text-loss"}`}>
                {isUp ? "+" : ""}{quote.change?.toFixed(2)}%
              </p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">—</p>
          )}
        </div>
      </div>
    </a>
  );
}

export function CustomBlockRenderer({ block }) {
  switch (block?.type) {
    case "text":  return <TextBlockView block={block} />;
    case "image": return <ImageBlockView block={block} />;
    case "links": return <LinksBlockView block={block} />;
    case "chart": return <ChartBlockView block={block} />;
    default:      return null;
  }
}

// ── Block editors (owner-only) ────────────────────────────────────────────────
function TextEditor({ block, onChange }) {
  return (
    <div className="space-y-2">
      <input
        type="text"
        value={block.title || ""}
        onChange={e => onChange({ ...block, title: e.target.value })}
        placeholder="Section title (optional, e.g. 'My methodology')"
        className="w-full text-sm font-medium border border-dashed border-accent/50 rounded-tag px-3 py-1.5 bg-accent/5 focus:outline-none focus:border-accent"
      />
      <textarea
        value={block.content || ""}
        onChange={e => onChange({ ...block, content: e.target.value })}
        rows={4}
        maxLength={2000}
        placeholder="Write the content…"
        className="w-full text-sm border border-dashed border-accent/50 rounded-tag px-3 py-2 bg-accent/5 focus:outline-none focus:border-accent resize-none"
      />
    </div>
  );
}

function ImageEditor({ block, onChange }) {
  return (
    <div className="space-y-2">
      <input
        type="text"
        value={block.title || ""}
        onChange={e => onChange({ ...block, title: e.target.value })}
        placeholder="Title (optional)"
        className="w-full text-sm font-medium border border-dashed border-accent/50 rounded-tag px-3 py-1.5 bg-accent/5 focus:outline-none focus:border-accent"
      />
      <input
        type="url"
        value={block.url || ""}
        onChange={e => onChange({ ...block, url: e.target.value })}
        placeholder="Image URL (e.g. https://i.imgur.com/...)"
        className="w-full text-sm border border-dashed border-accent/50 rounded-tag px-3 py-1.5 bg-accent/5 focus:outline-none focus:border-accent font-display"
      />
      <input
        type="text"
        value={block.caption || ""}
        onChange={e => onChange({ ...block, caption: e.target.value })}
        placeholder="Caption (optional)"
        className="w-full text-sm border border-dashed border-accent/50 rounded-tag px-3 py-1.5 bg-accent/5 focus:outline-none focus:border-accent"
      />
      {block.url && (
        <img src={block.url} alt="" className="w-full max-h-40 object-cover rounded-lg border border-border" onError={e => { e.target.style.display = "none"; }} />
      )}
    </div>
  );
}

function LinksEditor({ block, onChange }) {
  const links = block.links || [];

  const updateLink = (idx, patch) => {
    const next = links.map((l, i) => i === idx ? { ...l, ...patch } : l);
    onChange({ ...block, links: next });
  };
  const addLink = () => onChange({ ...block, links: [...links, { label: "", url: "" }] });
  const removeLink = idx => onChange({ ...block, links: links.filter((_, i) => i !== idx) });

  return (
    <div className="space-y-2">
      <input
        type="text"
        value={block.title || ""}
        onChange={e => onChange({ ...block, title: e.target.value })}
        placeholder="Section title (e.g. 'Find me elsewhere')"
        className="w-full text-sm font-medium border border-dashed border-accent/50 rounded-tag px-3 py-1.5 bg-accent/5 focus:outline-none focus:border-accent"
      />
      <div className="space-y-1.5">
        {links.map((link, idx) => {
          const { Icon, color } = iconForUrl(link.url);
          return (
            <div key={idx} className="flex items-center gap-2 group">
              <span className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0" style={{ background: `${color}15`, color }}>
                <Icon className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                value={link.label || ""}
                onChange={e => updateLink(idx, { label: e.target.value })}
                placeholder="Label"
                className="w-1/3 text-xs border border-border rounded px-2 py-1 bg-card focus:outline-none focus:border-primary"
              />
              <input
                type="url"
                value={link.url || ""}
                onChange={e => updateLink(idx, { url: e.target.value })}
                placeholder="https://…"
                className="flex-1 text-xs border border-border rounded px-2 py-1 bg-card focus:outline-none focus:border-primary font-display"
              />
              <button
                onClick={() => removeLink(idx)}
                className="text-muted-foreground hover:text-red-500 transition-colors p-1 opacity-0 group-hover:opacity-100"
                aria-label="Remove link"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
      <button
        onClick={addLink}
        className="w-full text-xs font-medium py-1.5 rounded-lg border border-dashed border-primary/40 text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-1"
      >
        <Plus className="w-3 h-3" /> Add link
      </button>
    </div>
  );
}

function ChartEditor({ block, onChange }) {
  return (
    <div className="space-y-2">
      <input
        type="text"
        value={block.title || ""}
        onChange={e => onChange({ ...block, title: e.target.value })}
        placeholder="Title (e.g. 'My top pick this month')"
        className="w-full text-sm font-medium border border-dashed border-accent/50 rounded-tag px-3 py-1.5 bg-accent/5 focus:outline-none focus:border-accent"
      />
      <input
        type="text"
        value={block.ticker || ""}
        onChange={e => onChange({ ...block, ticker: e.target.value.toUpperCase() })}
        placeholder="Ticker (e.g. NVDA, AAPL, BTC-USD)"
        className="w-full text-sm border border-dashed border-accent/50 rounded-tag px-3 py-1.5 bg-accent/5 focus:outline-none focus:border-accent font-display"
      />
      <p className="text-[10px] text-muted-foreground">Shows live price + % change. Links to the full stock page.</p>
    </div>
  );
}

function BlockEditorWrapper({ block, onChange, onDelete, onDragStart, onDragOver, onDrop }) {
  const def = BLOCK_TYPES.find(t => t.type === block.type);
  const Icon = def?.icon;
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className="bg-secondary/30 border border-dashed border-accent/50 rounded-tag p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
          {Icon && <Icon className="w-4 h-4 text-accent" />}
          <span className="text-xs font-medium uppercase tracking-wider text-accent">{def?.label || block.type}</span>
        </div>
        <button
          onClick={onDelete}
          className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded"
          aria-label="Delete block"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      {block.type === "text"  && <TextEditor  block={block} onChange={onChange} />}
      {block.type === "image" && <ImageEditor block={block} onChange={onChange} />}
      {block.type === "links" && <LinksEditor block={block} onChange={onChange} />}
      {block.type === "chart" && <ChartEditor block={block} onChange={onChange} />}
    </div>
  );
}

function AddBlockPicker({ onAdd }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full py-3 rounded-tag border border-dashed border-border hover:border-primary/40 hover:bg-primary/5 transition-all flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary"
      >
        <Plus className="w-4 h-4" /> Add a section
      </button>
    );
  }
  return (
    <div className="surface p-3">
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Choose a section type</span>
        <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {BLOCK_TYPES.map(({ type, label, desc, icon: Icon }) => (
          <button
            key={type}
            onClick={() => { onAdd(type); setOpen(false); }}
            className="text-left p-3 rounded-tag border border-border hover:border-primary/40 hover:bg-secondary transition-all"
          >
            <div className="flex items-center gap-2 mb-1">
              <Icon className="w-4 h-4 text-primary" />
              <span className="font-serif text-[14px] text-foreground">{label}</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">{desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Public: the section that wraps it all ─────────────────────────────────────
export function CustomBlocksSection({ blocks = [], isEditMode, onChange }) {
  const dragIdx = useRef(null);

  const updateBlock = (idx, newBlock) => onChange(blocks.map((b, i) => i === idx ? newBlock : b));
  const deleteBlock = idx => onChange(blocks.filter((_, i) => i !== idx));
  const addBlock = type => {
    const newBlock = { id: `blk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, type, title: "" };
    if (type === "links") newBlock.links = [{ label: "", url: "" }];
    onChange([...blocks, newBlock]);
  };

  const handleDragStart = (e, idx) => { dragIdx.current = idx; e.dataTransfer.effectAllowed = "move"; };
  const handleDragOver = e => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; };
  const handleDrop = (e, dropIdx) => {
    e.preventDefault();
    const from = dragIdx.current;
    if (from === null || from === dropIdx) return;
    const next = [...blocks];
    const [moved] = next.splice(from, 1);
    next.splice(dropIdx, 0, moved);
    onChange(next);
    dragIdx.current = null;
  };

  // Public view — render only non-empty blocks
  if (!isEditMode) {
    const visible = blocks.filter(b => {
      if (b.type === "text")  return (b.content || "").trim();
      if (b.type === "image") return (b.url || "").trim();
      if (b.type === "links") return (b.links || []).some(l => l.url?.trim());
      if (b.type === "chart") return (b.ticker || "").trim();
      return false;
    });
    if (visible.length === 0) return null;
    return (
      <div className="space-y-4">
        {visible.map(b => <CustomBlockRenderer key={b.id} block={b} />)}
      </div>
    );
  }

  // Edit view
  return (
    <div className="space-y-3">
      <div className="px-3 py-2 bg-accent/10 border border-accent/30 rounded-tag">
        <p className="text-xs text-foreground">
          ✨ <strong>Custom sections</strong> appear on your About tab. Drag to reorder, click trash to remove.
        </p>
      </div>
      {blocks.map((block, idx) => (
        <BlockEditorWrapper
          key={block.id}
          block={block}
          onChange={b => updateBlock(idx, b)}
          onDelete={() => deleteBlock(idx)}
          onDragStart={e => handleDragStart(e, idx)}
          onDragOver={handleDragOver}
          onDrop={e => handleDrop(e, idx)}
        />
      ))}
      <AddBlockPicker onAdd={addBlock} />
    </div>
  );
}
