import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ImageIcon, Palette, Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function EditorSettingsPanel({ coverImage, onCoverImageChange, onDeleteAll }) {
  const [uploading, setUploading] = useState(false);

  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onCoverImageChange(file_url);
      toast.success("Cover image uploaded!");
    } catch { toast.error("Upload failed"); }
    finally { setUploading(false); }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-lg font-bold mb-1">Report Settings</h2>
        <p className="text-sm text-muted-foreground">Configure cover image and other report options.</p>
      </div>

      {/* Cover image */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <Palette className="w-4 h-4 text-primary" /> Cover Image
        </h3>
        {coverImage ? (
          <div className="relative rounded-xl overflow-hidden aspect-[3/1] bg-secondary mb-3">
            <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="rounded-xl border-2 border-dashed border-border aspect-[3/1] flex items-center justify-center mb-3 text-muted-foreground text-sm bg-secondary/30">
            No cover image
          </div>
        )}
        <label>
          <Button variant="outline" size="sm" className="cursor-pointer" disabled={uploading} asChild>
            <span><ImageIcon className="w-3.5 h-3.5 mr-1.5" />{uploading ? "Uploading..." : "Upload Cover"}</span>
          </Button>
          <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
        </label>
        {coverImage && (
          <Button variant="ghost" size="sm" onClick={() => onCoverImageChange("")} className="ml-2 text-muted-foreground text-xs">
            Remove
          </Button>
        )}
      </div>

      {/* Danger zone */}
      {onDeleteAll && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-loss" /> Clear All
          </h3>
          <p className="text-xs text-muted-foreground mb-3">Clear all content, settings, and start fresh.</p>
          <Button variant="destructive" size="sm" onClick={onDeleteAll} className="text-xs gap-1.5">
            <Trash2 className="w-3.5 h-3.5" /> Delete Everything
          </Button>
        </div>
      )}
    </div>
  );
}