import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Image, Loader2, Trash2 } from "lucide-react";

export default function ImageBlock({ block, onDelete, onChange }) {
  const [uploading, setUploading] = useState(false);
  const [url, setUrl] = useState(block.content || "");
  const [height, setHeight] = useState(block.height || 240);
  const [width, setWidth] = useState(block.width || 100); // percentage 25–100

  const update = (patch) => {
    if (onChange) onChange({ ...block, ...patch });
  };

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setUrl(file_url);
    setUploading(false);
    update({ content: file_url, height, width });
  };

  return (
    <div className="group relative rounded-xl border-2 border-dashed border-border overflow-hidden mb-2">
      {url ? (
        <div>
          {/* Resize controls */}
          <div className="flex items-center gap-4 px-3 py-2 bg-secondary/50 border-b border-border flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">Width: {width}%</span>
              <input
                type="range" min={25} max={100} step={5} value={width}
                onChange={e => {
                  const v = Number(e.target.value);
                  setWidth(v);
                  update({ content: url, height, width: v });
                }}
                className="w-20 h-1 accent-primary"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">Height: {height}px</span>
              <input
                type="range" min={80} max={600} step={20} value={height}
                onChange={e => {
                  const v = Number(e.target.value);
                  setHeight(v);
                  update({ content: url, height: v, width });
                }}
                className="w-20 h-1 accent-primary"
              />
            </div>
            <button
              onClick={onDelete}
              className="ml-auto text-muted-foreground hover:text-loss transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <div style={{ width: `${width}%`, margin: "0 auto" }}>
            <img
              src={url}
              alt="Report image"
              className="w-full object-cover"
              style={{ height: `${height}px` }}
            />
          </div>
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