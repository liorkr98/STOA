import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Image, Loader2 } from "lucide-react";

export default function ImageBlock({ block, onDelete, onChange }) {
  const [uploading, setUploading] = useState(false);
  const [url, setUrl] = useState(block.content || "");
  const [imgWidth, setImgWidth] = useState(block.width || "100%");
  const [imgHeight, setImgHeight] = useState(block.height || "240px");
  const resizingRef = useRef(false);
  const startRef = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const containerRef = useRef(null);

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
    update({ content: file_url, width: imgWidth, height: imgHeight });
  };

  const startResize = (e) => {
    e.preventDefault();
    resizingRef.current = true;
    const rect = containerRef.current.getBoundingClientRect();
    startRef.current = { x: e.clientX, y: e.clientY, w: rect.width, h: rect.height };

    const onMove = (mv) => {
      if (!resizingRef.current) return;
      const newW = Math.max(120, startRef.current.w + (mv.clientX - startRef.current.x));
      const newH = Math.max(80,  startRef.current.h + (mv.clientY - startRef.current.y));
      setImgWidth(newW + "px");
      setImgHeight(newH + "px");
    };
    const onUp = () => {
      resizingRef.current = false;
      const w = containerRef.current?.offsetWidth + "px";
      const h = containerRef.current?.offsetHeight + "px";
      update({ content: url, width: w, height: h });
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <div className="group relative rounded-[10px] border border-dashed border-border overflow-hidden mb-2">
      {url ? (
        <div>
          <div className="flex items-center gap-2 px-3 py-2 bg-secondary/50 border-b border-border">
            <span className="text-[10px] text-muted-foreground">Drag corner to resize</span>
          </div>
          <div
            ref={containerRef}
            className="group/img relative inline-block"
            style={{ width: imgWidth, maxWidth: "100%", display: "block" }}
          >
            <img
              src={url}
              alt="Report image"
              className="w-full block object-cover"
              style={{ height: imgHeight }}
            />
            {/* Resize handle */}
            <div
              onMouseDown={startResize}
              className="resize-handle"
              style={{
                position: "absolute", bottom: 4, right: 4,
                width: 20, height: 20, cursor: "se-resize",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "rgba(0,0,0,0.5)", borderRadius: 4,
                color: "white", fontSize: 12, userSelect: "none",
                opacity: 0, transition: "opacity 0.15s",
              }}
            >
              ↘
            </div>
          </div>
          <style>{`.group\\/img:hover .resize-handle { opacity: 1 !important; }`}</style>
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