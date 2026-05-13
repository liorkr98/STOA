import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { base44 } from "@/api/base44Client";

function formatDate(dateStr) {
  try { return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }); }
  catch { return ""; }
}

function wrapText(pdf, text, x, y, maxWidth, lineHeight) {
  const lines = pdf.splitTextToSize(text, maxWidth);
  pdf.text(lines, x, y);
  return y + lines.length * lineHeight;
}

export default function ExportPDFButton({ report, blocks }) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    base44.analytics.track({ eventName: "report_pdf_export", properties: { report_id: report.id } });

    try {
      const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 56;
      const contentW = pageW - margin * 2;
      let y = margin;

      const addPage = () => {
        pdf.addPage();
        y = margin;
        // Page header line
        pdf.setDrawColor(226, 232, 240);
        pdf.setLineWidth(0.5);
        pdf.line(margin, 40, pageW - margin, 40);
        pdf.setFontSize(8);
        pdf.setTextColor(148, 163, 184);
        pdf.text("STOA · Financial Research Platform", margin, 32);
        pdf.text(`${report.author_name || "Researcher"} · ${formatDate(report.created_date)}`, pageW - margin, 32, { align: "right" });
        y = margin;
      };

      const checkPage = (needed = 40) => {
        if (y + needed > pageH - margin) addPage();
      };

      // ── Header bar ────────────────────────────────────────
      pdf.setFillColor(30, 58, 110);
      pdf.rect(0, 0, pageW, 8, "F");

      // ── Logo/Brand ────────────────────────────────────────
      pdf.setFontSize(10);
      pdf.setTextColor(148, 163, 184);
      pdf.setFont("helvetica", "bold");
      pdf.text("STOA", margin, y);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.text("Financial Research Platform", margin + 32, y);
      y += 6;
      pdf.setFontSize(8);
      pdf.text(`Published ${formatDate(report.created_date)}`, margin, y);
      if (report.tickers) {
        pdf.text(`Tickers: ${report.tickers}`, pageW - margin, y, { align: "right" });
      }
      y += 16;

      // Divider
      pdf.setDrawColor(226, 232, 240);
      pdf.setLineWidth(0.5);
      pdf.line(margin, y, pageW - margin, y);
      y += 16;

      // ── Title ─────────────────────────────────────────────
      pdf.setFontSize(22);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(15, 23, 42);
      const titleLines = pdf.splitTextToSize(report.title || "Untitled Report", contentW);
      pdf.text(titleLines, margin, y);
      y += titleLines.length * 28;

      // ── Excerpt ───────────────────────────────────────────
      if (report.excerpt) {
        pdf.setFontSize(11);
        pdf.setFont("helvetica", "italic");
        pdf.setTextColor(71, 85, 105);
        y = wrapText(pdf, report.excerpt, margin, y, contentW, 15);
        y += 8;
      }

      // ── Author + meta bar ─────────────────────────────────
      pdf.setFillColor(248, 250, 252);
      pdf.setDrawColor(226, 232, 240);
      pdf.roundedRect(margin, y, contentW, 30, 4, 4, "FD");
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(15, 23, 42);
      pdf.text(report.author_name || "Researcher", margin + 10, y + 13);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(100, 116, 139);
      if (report.author_accuracy > 0) {
        pdf.text(`${report.author_accuracy}% Prediction Accuracy`, margin + 10, y + 23);
      }
      if (report.is_premium) {
        pdf.setFillColor(251, 191, 36);
        pdf.roundedRect(pageW - margin - 62, y + 8, 56, 14, 3, 3, "F");
        pdf.setTextColor(120, 53, 15);
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "bold");
        pdf.text("PREMIUM", pageW - margin - 34, y + 18, { align: "center" });
      }
      y += 44;

      // ── Prediction badge ──────────────────────────────────
      if (report.prediction_action && report.prediction_ticker) {
        const badgeColor = report.prediction_action === "Long" ? [22, 163, 74] :
                           report.prediction_action === "Short" ? [220, 38, 38] : [245, 158, 11];
        pdf.setFillColor(...badgeColor);
        pdf.roundedRect(margin, y, contentW, 32, 4, 4, "F");
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(11);
        pdf.setFont("helvetica", "bold");
        const predText = `${report.prediction_action.toUpperCase()} $${report.prediction_ticker}` +
          (report.prediction_target_price ? `  ·  Target: $${report.prediction_target_price}` : "") +
          (report.prediction_timeframe ? `  ·  ${report.prediction_timeframe}` : "");
        pdf.text(predText, margin + 10, y + 20);
        y += 44;
      }

      // ── Content blocks ────────────────────────────────────
      for (const block of blocks) {
        checkPage(30);

        if (block.type === "heading") {
          y += 8;
          checkPage(36);
          pdf.setFontSize(14);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(15, 23, 42);
          const hLines = pdf.splitTextToSize(block.content || "", contentW);
          pdf.text(hLines, margin, y);
          y += hLines.length * 18 + 4;
          // Underline
          pdf.setDrawColor(59, 130, 246);
          pdf.setLineWidth(1);
          pdf.line(margin, y, margin + 40, y);
          y += 8;

        } else if (block.type === "text") {
          pdf.setFontSize(10);
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(30, 41, 59);
          const lines = pdf.splitTextToSize(block.content || "", contentW);
          for (const line of lines) {
            checkPage(14);
            pdf.text(line, margin, y);
            y += 14;
          }
          y += 4;

        } else if (block.type === "bullets") {
          pdf.setFontSize(10);
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(30, 41, 59);
          const items = (block.content || "").split("\n").filter(Boolean);
          for (const item of items) {
            checkPage(16);
            const clean = item.replace(/^[•\-]\s*/, "");
            const bulletLines = pdf.splitTextToSize(`• ${clean}`, contentW - 10);
            pdf.text(bulletLines, margin + 8, y);
            y += bulletLines.length * 14 + 2;
          }
          y += 4;

        } else if (block.type === "quote") {
          checkPage(40);
          pdf.setFillColor(239, 246, 255);
          pdf.setDrawColor(59, 130, 246);
          const qLines = pdf.splitTextToSize(block.content || "", contentW - 20);
          const qH = qLines.length * 14 + 16;
          pdf.roundedRect(margin, y, contentW, qH, 3, 3, "F");
          pdf.setLineWidth(3);
          pdf.line(margin, y, margin, y + qH);
          pdf.setFontSize(10);
          pdf.setFont("helvetica", "italic");
          pdf.setTextColor(30, 64, 175);
          pdf.text(qLines, margin + 12, y + 12);
          y += qH + 8;

        } else if (block.type === "callout") {
          checkPage(50);
          pdf.setFillColor(239, 246, 255);
          pdf.setDrawColor(147, 197, 253);
          const cLines = pdf.splitTextToSize(block.content || "", contentW - 20);
          const cH = cLines.length * 14 + 16;
          pdf.roundedRect(margin, y, contentW, cH, 4, 4, "FD");
          pdf.setFontSize(9);
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(30, 58, 138);
          pdf.text(cLines, margin + 10, y + 12);
          y += cH + 8;

        } else if (block.type === "divider") {
          y += 6;
          pdf.setDrawColor(226, 232, 240);
          pdf.setLineWidth(0.5);
          pdf.line(margin, y, pageW - margin, y);
          y += 12;

        } else if (block.type === "stockchart" && block.snapshot_url) {
          checkPage(160);
          try {
            // Render saved snapshot image
            const imgData = await fetchImageAsBase64(block.snapshot_url);
            if (imgData) {
              const imgH = 120;
              pdf.setFillColor(248, 250, 252);
              pdf.setDrawColor(226, 232, 240);
              pdf.roundedRect(margin, y, contentW, imgH + 24, 4, 4, "FD");
              pdf.setFontSize(9);
              pdf.setFont("helvetica", "bold");
              pdf.setTextColor(59, 130, 246);
              pdf.text(`${block.ticker || "CHART"} · Chart Snapshot`, margin + 8, y + 13);
              pdf.addImage(imgData, "PNG", margin + 4, y + 18, contentW - 8, imgH);
              y += imgH + 32;
            } else throw new Error("no img");
          } catch {
            // Fallback text
            checkPage(30);
            pdf.setFontSize(9);
            pdf.setFont("helvetica", "italic");
            pdf.setTextColor(100, 116, 139);
            pdf.text(`[Chart: ${block.ticker || "Stock"} — see live chart on STOA]`, margin, y);
            y += 20;
          }

        } else if (block.type === "image" && block.content) {
          checkPage(120);
          try {
            const imgData = await fetchImageAsBase64(block.content);
            if (imgData) {
              const imgH = 100;
              pdf.addImage(imgData, "JPEG", margin, y, contentW, imgH);
              y += imgH + 12;
            }
          } catch { /* skip image */ }
        }
      }

      // ── Footer ────────────────────────────────────────────
      checkPage(60);
      y += 16;
      pdf.setDrawColor(226, 232, 240);
      pdf.setLineWidth(0.5);
      pdf.line(margin, y, pageW - margin, y);
      y += 12;
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(148, 163, 184);
      const disclaimer = "⚠️ Disclaimer: This report is for informational purposes only and does not constitute financial advice. Always do your own research (DYOR) before making any investment decisions.";
      const dLines = pdf.splitTextToSize(disclaimer, contentW);
      pdf.text(dLines, margin, y);
      y += dLines.length * 11 + 8;
      pdf.text(`Generated by STOA · stoa.finance · ${new Date().toLocaleString()}`, margin, y);
      pdf.text(`Page 1 of ${pdf.internal.getNumberOfPages()}`, pageW - margin, y, { align: "right" });

      // Add page numbers to all pages
      const totalPages = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(148, 163, 184);
        pdf.text(`${i} / ${totalPages}`, pageW - margin, pageH - 20, { align: "right" });
      }

      const safeName = (report.title || "report").replace(/[^a-zA-Z0-9]/g, "_").slice(0, 40);
      pdf.save(`${safeName}_STOA.pdf`);
      toast.success("PDF exported!");
    } catch (err) {
      console.error(err);
      toast.error("PDF export failed: " + err.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting} className="gap-1.5 text-xs h-8">
      {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
      {exporting ? "Exporting..." : "Export PDF"}
    </Button>
  );
}

async function fetchImageAsBase64(url) {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) throw new Error("fetch failed");
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}