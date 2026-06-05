import React, { useState, useRef, useEffect } from "react";
import { Languages, Loader2, X, ChevronDown } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const LANGUAGES = [
  { code: "es", label: "Spanish",    native: "Español" },
  { code: "fr", label: "French",     native: "Français" },
  { code: "de", label: "German",     native: "Deutsch" },
  { code: "pt", label: "Portuguese", native: "Português" },
  { code: "he", label: "Hebrew",     native: "עברית" },
  { code: "ar", label: "Arabic",     native: "العربية" },
  { code: "zh", label: "Chinese",    native: "中文" },
  { code: "ja", label: "Japanese",   native: "日本語" },
  { code: "ko", label: "Korean",     native: "한국어" },
  { code: "ru", label: "Russian",    native: "Русский" },
  { code: "it", label: "Italian",    native: "Italiano" },
  { code: "tr", label: "Turkish",    native: "Türkçe" },
];

/**
 * TranslateButton — adds AI-powered translation to any report.
 * Props:
 *   title       {string}   Report title
 *   excerpt     {string}   Report excerpt/dek
 *   blocks      {Array}    Content blocks array
 *   onTranslated(data)     Called with { title, excerpt, blocks } when done
 *   onReset()              Called when user reverts to original
 *   isTranslated {boolean} Whether currently showing translation
 *   translatedLang {string} e.g. "Spanish"
 */
export default function TranslateButton({
  title, excerpt, blocks,
  onTranslated, onReset,
  isTranslated, translatedLang,
}) {
  const [open, setOpen]     = useState(false);
  const [loading, setLoading] = useState(false);
  const menuRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const translate = async (lang) => {
    setOpen(false);
    setLoading(true);
    try {
      // Build a summary of text content to translate
      const textBlocks = (blocks || [])
        .filter(b => ["p", "title", "dek", "h", "pullquote", "callout", "bullet", "numbered"].includes(b.type))
        .map(b => ({ id: b.id, type: b.type, text: b.text || b.content || "" }))
        .filter(b => b.text.length > 0);

      const prompt = `You are a professional financial translator. Translate the following financial research report content into ${lang.label}. Preserve all numbers, tickers, percentages, and financial terms exactly as they are. Return a JSON object with keys: "title", "excerpt", "blocks" (array of {id, text} objects matching the input IDs). Only translate text — keep all special characters, formatting markers, and financial data untouched.

Report to translate:
Title: ${title || ""}
Excerpt: ${excerpt || ""}
Blocks: ${JSON.stringify(textBlocks.map(b => ({ id: b.id, text: b.text })))}

Return only valid JSON, no markdown fences.`;

      // Use base44's built-in AI (Claude) via the Core integration
      const result = await base44.integrations.Core.InvokeLLM({
        model: "claude_sonnet_4_6",
        prompt,
      }).catch(() => null);

      // Try parsing the AI response — handle string and wrapped formats
      let translated = null;
      const raw = typeof result === "string"
        ? result
        : (result?.content?.[0]?.text || result?.text || result?.response || "");
      try {
        // Strip markdown fences and isolate the JSON object if the model added prose
        let clean = raw.replace(/^```json?\n?/i, "").replace(/\n?```$/i, "").trim();
        const jsonMatch = clean.match(/\{[\s\S]*\}/);
        if (jsonMatch) clean = jsonMatch[0];
        translated = JSON.parse(clean);
      } catch {
        toast.error("Translation failed — please try again");
        return;
      }

      if (!translated) { toast.error("Translation unavailable"); return; }

      // Merge translated text back into original blocks
      const blockMap = {};
      (translated.blocks || []).forEach(b => { if (b.id) blockMap[b.id] = b.text; });

      const translatedBlocks = (blocks || []).map(b =>
        blockMap[b.id] ? { ...b, text: blockMap[b.id], content: blockMap[b.id] } : b
      );

      onTranslated({
        title:   translated.title || title,
        excerpt: translated.excerpt || excerpt,
        blocks:  translatedBlocks,
        lang:    lang.label,
      });
      toast.success(`Translated to ${lang.label}`);
    } catch (e) {
      toast.error("Translation failed — please try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      {isTranslated ? (
        <button
          onClick={onReset}
          className="btn btn-ghost btn-sm gap-1.5 text-primary border border-primary/30 bg-primary/5"
          title="View original"
        >
          <Languages size={13} strokeWidth={1.6} />
          {translatedLang}
          <X size={11} />
        </button>
      ) : (
        <button
          onClick={() => !loading && setOpen(o => !o)}
          disabled={loading}
          className="btn btn-ghost btn-sm gap-1.5"
          title="Translate this report"
        >
          {loading
            ? <Loader2 size={13} className="animate-spin" />
            : <Languages size={13} strokeWidth={1.6} />
          }
          {loading ? "Translating…" : "Translate"}
          {!loading && <ChevronDown size={11} className={cn("transition-transform", open && "rotate-180")} />}
        </button>
      )}

      {/* Language picker dropdown */}
      {open && !isTranslated && (
        <div className="absolute right-0 top-full mt-1.5 w-48 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-border/60">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Translate to</p>
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {LANGUAGES.map(lang => (
              <button
                key={lang.code}
                onClick={() => translate(lang)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-secondary/60 transition-colors text-left"
              >
                <span className="font-medium text-foreground">{lang.label}</span>
                <span className="text-xs text-muted-foreground">{lang.native}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
