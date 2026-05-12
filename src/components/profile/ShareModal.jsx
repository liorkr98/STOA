import React, { useState } from "react";
import { Twitter, Linkedin, Mail, Link2, Check, MessageCircle, X } from "lucide-react";
import { toast } from "sonner";

/**
 * Universal share modal. Opens from the profile/report share button.
 * Falls back to manual copy if the Clipboard API isn't available
 * (insecure context, old browser) so the share button never silently fails.
 */
export default function ShareModal({ open, onClose, url, title = "Check this out", description = "" }) {
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const shareUrl  = url || (typeof window !== "undefined" ? window.location.href : "");
  const shareText = `${title}${description ? ` — ${description}` : ""}`;
  const enc       = encodeURIComponent;

  const copyLink = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        // Fallback for insecure context: hidden textarea + execCommand
        const ta = document.createElement("textarea");
        ta.value = shareUrl;
        ta.style.position = "fixed";
        ta.style.opacity  = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy. Select and copy the link manually.");
    }
  };

  const shareTargets = [
    {
      key:    "x",
      label:  "X / Twitter",
      icon:   <Twitter className="w-4 h-4" />,
      color:  "#0f1419",
      href:   `https://twitter.com/intent/tweet?text=${enc(shareText)}&url=${enc(shareUrl)}`,
    },
    {
      key:    "linkedin",
      label:  "LinkedIn",
      icon:   <Linkedin className="w-4 h-4" />,
      color:  "#0a66c2",
      href:   `https://www.linkedin.com/sharing/share-offsite/?url=${enc(shareUrl)}`,
    },
    {
      key:    "whatsapp",
      label:  "WhatsApp",
      icon:   <MessageCircle className="w-4 h-4" />,
      color:  "#25d366",
      href:   `https://wa.me/?text=${enc(`${shareText} ${shareUrl}`)}`,
    },
    {
      key:    "email",
      label:  "Email",
      icon:   <Mail className="w-4 h-4" />,
      color:  "#475569",
      href:   `mailto:?subject=${enc(title)}&body=${enc(`${shareText}\n\n${shareUrl}`)}`,
    },
  ];

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-2xl p-5 w-full max-w-sm shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-base">Share this page</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* URL display + copy */}
        <div className="flex gap-2 mb-4">
          <input
            value={shareUrl}
            readOnly
            onFocus={e => e.target.select()}
            className="flex-1 text-xs bg-secondary border border-border rounded-lg px-3 py-2 font-mono outline-none focus:border-primary"
          />
          <button
            onClick={copyLink}
            className={`text-xs font-semibold px-3 py-2 rounded-lg border transition-all flex items-center gap-1.5 ${
              copied
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-primary text-white border-primary hover:bg-primary/90"
            }`}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        {/* Social targets */}
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">
          Share on
        </p>
        <div className="grid grid-cols-2 gap-2">
          {shareTargets.map(t => (
            <a
              key={t.key}
              href={t.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-secondary transition-all text-sm font-medium"
            >
              <span style={{ color: t.color }}>{t.icon}</span>
              {t.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
