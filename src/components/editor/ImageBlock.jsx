import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Image, Loader2, Trash2 } from "lucide-react";

export default function ImageBlock({ block, onDelete }) {
  const [uploading, setUploading] = useState(false);
  const [url, setUrl] = useState(block.content || "");

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setUrl(file_url);
    setUploading(false);
  };

  return (
    <div className="group relative rounded-xl border-2 border-dashed border-border overflow-hidden">
      {url ? (
        <div className="relative">
          <img src={url} alt="Report image" className="w-full object-cover max-h-80" />
          <button
            onClick={onDelete}
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-white rounded-lg p-1.5"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center gap-2 p-8 cursor-pointer hover:bg-secondary transition-colors">
          {uploading ? <Loader2 className="w-6 h-6 animate-spin text-primary" /> : <Image className="w-6 h-6 text-muted-foreground" />}
          <span className="text-sm text-muted-foreground">{uploading ? "Uploading..." : "Click to upload image"}</span>
          <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
        </label>
      )}
    </div>
  );
}