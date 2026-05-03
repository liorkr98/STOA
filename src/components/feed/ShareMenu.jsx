import React from "react";
import { Share2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

const PLATFORMS = [
  { label: "X (Twitter)", emoji: "𝕏", getUrl: (title, url) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}` },
  { label: "StockTwits", emoji: "📈", getUrl: (title, url) => `https://stocktwits.com/transmit/share?body=${encodeURIComponent(title + " " + url)}` },
  { label: "LinkedIn", emoji: "💼", getUrl: (title, url) => `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}` },
  { label: "Reddit", emoji: "🤖", getUrl: (title, url) => `https://reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}` },
  { label: "WhatsApp", emoji: "💬", getUrl: (title, url) => `https://wa.me/?text=${encodeURIComponent(title + " " + url)}` },
  { label: "Telegram", emoji: "✈️", getUrl: (title, url) => `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}` },
  { label: "Email", emoji: "📧", getUrl: (title, url) => `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent("Check out this research report: " + url)}` },
];

export default function ShareMenu({ title, reportId }) {
  const reportUrl = `${window.location.origin}/report?id=${reportId}`;

  const copyLink = () => {
    navigator.clipboard.writeText(reportUrl);
    toast.success("Link copied!");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <Share2 className="w-4 h-4" />
          <span className="hidden sm:inline">Share</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {PLATFORMS.map((p, i) => (
          <React.Fragment key={p.label}>
            {i === 4 && <DropdownMenuSeparator />}
            <DropdownMenuItem
              onClick={() => window.open(p.getUrl(title, reportUrl), "_blank", "noopener,width=600,height=500")}
              className="cursor-pointer gap-2"
            >
              <span>{p.emoji}</span>
              <span>{p.label}</span>
            </DropdownMenuItem>
          </React.Fragment>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={copyLink} className="cursor-pointer gap-2">
          <span>🔗</span>
          <span>Copy Link</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}