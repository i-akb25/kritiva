"use client";

import { useEffect, useRef, useState } from "react";
import { downloadBlob, loadImage, safeFilename } from "@/lib/asset-utils";
import { DownloadIcon, UploadIcon } from "./icons";

type CompositionPreset = { id: string; name: string; width: number; height: number };
const presets: CompositionPreset[] = [
  { id: "og", name: "Open Graph", width: 1200, height: 630 },
  { id: "project", name: "Project cover", width: 1600, height: 1200 },
  { id: "article", name: "Article cover", width: 1600, height: 900 },
  { id: "banner", name: "Social banner", width: 1500, height: 500 },
  { id: "announcement", name: "Announcement card", width: 1080, height: 1080 },
];

const roundedRect = (context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) => {
  context.beginPath(); context.roundRect(x, y, width, height, radius); context.closePath();
};

export function CompositionStudio() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [presetId, setPresetId] = useState("og");
  const [title, setTitle] = useState("Build assets that belong together.");
  const [subtitle, setSubtitle] = useState("KRITIVA · Project-aware asset production");
  const [label, setLabel] = useState("NEW RELEASE");
  const [background, setBackground] = useState("#e8dfd0");
  const [foreground, setForeground] = useState("#17241e");
  const [accent, setAccent] = useState("#d8783e");
  const [layout, setLayout] = useState<"editorial" | "split" | "device">("editorial");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [filename, setFilename] = useState("kritiva-social-card.webp");
  const preset = presets.find((item) => item.id === presetId) ?? presets[0];

  useEffect(() => {
    // Loading a browser image is an external async synchronization step.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!imageFile) { setImage(null); return; }
    loadImage(imageFile).then(setImage).catch(() => setImage(null));
  }, [imageFile]);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    canvas.width = preset.width; canvas.height = preset.height;
    const context = canvas.getContext("2d"); if (!context) return;
    const w = preset.width; const h = preset.height; const pad = Math.round(w * .065);
    context.fillStyle = background; context.fillRect(0, 0, w, h);
    context.strokeStyle = `${foreground}22`; context.lineWidth = 2;
    for (let x = pad; x < w; x += Math.max(60, w / 12)) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, h); context.stroke(); }
    for (let y = pad; y < h; y += Math.max(60, h / 8)) { context.beginPath(); context.moveTo(0, y); context.lineTo(w, y); context.stroke(); }
    const imageX = layout === "editorial" ? w * .60 : w * .53;
    const imageY = layout === "device" ? h * .16 : h * .12;
    const imageW = layout === "editorial" ? w * .32 : w * .39;
    const imageH = h * .76;
    if (image) {
      context.save();
      roundedRect(context, imageX, imageY, imageW, imageH, layout === "device" ? 36 : 22); context.clip();
      context.fillStyle = foreground; context.fillRect(imageX, imageY, imageW, imageH);
      const ratio = Math.max(imageW / image.naturalWidth, imageH / image.naturalHeight);
      const drawW = image.naturalWidth * ratio; const drawH = image.naturalHeight * ratio;
      context.drawImage(image, imageX + (imageW - drawW) / 2, imageY + (imageH - drawH) / 2, drawW, drawH);
      context.restore();
      if (layout === "device") {
        context.strokeStyle = foreground; context.lineWidth = Math.max(8, w * .012); roundedRect(context, imageX, imageY, imageW, imageH, 36); context.stroke();
        context.fillStyle = foreground; roundedRect(context, imageX + imageW * .38, imageY - 2, imageW * .24, 20, 12); context.fill();
      }
    } else {
      context.fillStyle = `${foreground}10`; roundedRect(context, imageX, imageY, imageW, imageH, 22); context.fill();
      context.strokeStyle = `${foreground}44`; context.setLineDash([12, 12]); context.stroke(); context.setLineDash([]);
    }
    context.fillStyle = accent; context.font = `600 ${Math.max(18, w * .018)}px ui-monospace, monospace`; context.letterSpacing = `${w * .002}px`; context.fillText(label.toUpperCase().slice(0, 42), pad, h * .18);
    context.fillStyle = foreground; context.font = `800 ${Math.max(42, w * .061)}px Arial, sans-serif`;
    const maxTextWidth = layout === "editorial" ? w * .46 : w * .42;
    const words = title.trim().split(/\s+/); const lines: string[] = []; let current = "";
    words.forEach((word) => { const next = `${current} ${word}`.trim(); if (context.measureText(next).width > maxTextWidth && current) { lines.push(current); current = word; } else current = next; });
    if (current) lines.push(current);
    lines.slice(0, 4).forEach((line, index) => context.fillText(line, pad, h * .31 + index * Math.max(54, w * .067)));
    context.fillStyle = `${foreground}bb`; context.font = `500 ${Math.max(18, w * .019)}px Arial, sans-serif`; context.fillText(subtitle.slice(0, 80), pad, h - pad);
    context.fillStyle = accent; context.beginPath(); context.arc(w - pad * .55, pad * .62, Math.max(8, w * .009), 0, Math.PI * 2); context.fill();
  }, [accent, background, foreground, image, label, layout, preset, subtitle, title]);

  const download = async () => {
    const blob = await new Promise<Blob | null>((resolve) => canvasRef.current?.toBlob(resolve, "image/webp", .88));
    if (blob) downloadBlob(blob, safeFilename(filename).replace(/\.[^.]+$/, ".webp"));
  };

  return <section className="studio-section" id="composer" aria-labelledby="composer-title"><div className="section-heading"><div><span className="eyebrow">PHASE 4 · COMPOSITION STUDIO</span><h2 id="composer-title">Controlled layouts, correct exports.</h2></div><p>Create social previews, covers, announcements and framed screenshots with deterministic browser rendering.</p></div><div className="studio-shell composer-shell"><div className="composer-controls"><label className="field"><span>Canvas preset</span><select value={presetId} onChange={(event) => setPresetId(event.target.value)}>{presets.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.width} × {item.height}</option>)}</select></label><label className="field"><span>Layout</span><select value={layout} onChange={(event) => setLayout(event.target.value as typeof layout)}><option value="editorial">Editorial</option><option value="split">Split composition</option><option value="device">Device mockup</option></select></label><label className="field"><span>Label</span><input value={label} maxLength={42} onChange={(event) => setLabel(event.target.value)} /></label><label className="field"><span>Title</span><textarea value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} /></label><label className="field"><span>Subtitle</span><input value={subtitle} maxLength={80} onChange={(event) => setSubtitle(event.target.value)} /></label><div className="palette-row"><label><span>Canvas</span><input type="color" value={background} onChange={(event) => setBackground(event.target.value)} /></label><label><span>Text</span><input type="color" value={foreground} onChange={(event) => setForeground(event.target.value)} /></label><label><span>Accent</span><input type="color" value={accent} onChange={(event) => setAccent(event.target.value)} /></label></div><label className="file-button compact"><UploadIcon /><span><strong>{imageFile?.name ?? "Add image or screenshot"}</strong><small>Optional · framed locally</small></span><input type="file" accept="image/*" onChange={(event) => setImageFile(event.target.files?.[0] ?? null)} /></label><label className="field"><span>Filename</span><input value={filename} onChange={(event) => setFilename(event.target.value)} /></label><button className="primary-button full" onClick={download}><DownloadIcon /> Export WebP</button></div><div className="canvas-stage"><canvas ref={canvasRef} aria-label="Composition preview" /><small>{preset.width} × {preset.height} · sRGB browser canvas</small></div></div></section>;
}
