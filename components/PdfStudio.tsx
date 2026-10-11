"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { PDFDocument, PDFString, StandardFonts, rgb } from "pdf-lib";
import { downloadBlob, safeFilename } from "@/lib/asset-utils";

type PdfOperation =
  | { id: string; type: "text"; page: number; x: number; y: number; text: string; size: number; color: string }
  | { id: string; type: "redact"; page: number; x: number; y: number; width: number; height: number; replacement: string; size: number; color: string }
  | { id: string; type: "image"; page: number; x: number; y: number; width: number; height: number; dataUrl: string; mimeType: "image/png" | "image/jpeg" }
  | { id: string; type: "link"; page: number; x: number; y: number; width: number; height: number; url: string; label: string; size: number };

type Tool = PdfOperation["type"];

function hexToRgb(value: string) {
  const clean = value.replace("#", "");
  const number = Number.parseInt(clean.length === 3 ? clean.split("").map((item) => item + item).join("") : clean, 16);
  return rgb(((number >> 16) & 255) / 255, ((number >> 8) & 255) / 255, (number & 255) / 255);
}

async function buildPdf(source: Uint8Array, operations: PdfOperation[]) {
  const document = await PDFDocument.load(source, { updateMetadata: false });
  const font = await document.embedFont(StandardFonts.Helvetica);
  for (const operation of operations) {
    const page = document.getPage(operation.page);
    if (!page) continue;
    if (operation.type === "text") {
      page.drawText(operation.text, { x: operation.x, y: operation.y, size: operation.size, font, color: hexToRgb(operation.color), maxWidth: Math.max(40, page.getWidth() - operation.x - 12) });
    } else if (operation.type === "redact") {
      page.drawRectangle({ x: operation.x, y: operation.y, width: operation.width, height: operation.height, color: rgb(1, 1, 1) });
      if (operation.replacement) page.drawText(operation.replacement, { x: operation.x + 3, y: operation.y + Math.max(2, (operation.height - operation.size) / 2), size: operation.size, font, color: hexToRgb(operation.color), maxWidth: Math.max(20, operation.width - 6) });
    } else if (operation.type === "image") {
      const bytes = await fetch(operation.dataUrl).then((response) => response.arrayBuffer());
      const embedded = operation.mimeType === "image/png" ? await document.embedPng(bytes) : await document.embedJpg(bytes);
      page.drawImage(embedded, { x: operation.x, y: operation.y, width: operation.width, height: operation.height });
    } else {
      const label = operation.label || operation.url;
      page.drawText(label, { x: operation.x, y: operation.y, size: operation.size, font, color: rgb(0.05, 0.28, 0.62), maxWidth: operation.width });
      page.drawLine({ start: { x: operation.x, y: operation.y - 2 }, end: { x: operation.x + operation.width, y: operation.y - 2 }, thickness: 0.6, color: rgb(0.05, 0.28, 0.62) });
      const annotation = document.context.register(document.context.obj({ Type: "Annot", Subtype: "Link", Rect: [operation.x, operation.y - 3, operation.x + operation.width, operation.y + operation.height], Border: [0, 0, 0], A: { Type: "Action", S: "URI", URI: PDFString.of(operation.url) } }));
      page.node.addAnnot(annotation);
    }
  }
  return document.save({ useObjectStreams: true });
}

export function PdfStudio() {
  const canvasRef = useRef<HTMLCanvasElement>(null); const imageRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<Uint8Array | null>(null); const [sourceName, setSourceName] = useState("edited-document.pdf");
  const [pageCount, setPageCount] = useState(0); const [pageIndex, setPageIndex] = useState(0); const [pageSize, setPageSize] = useState({ width: 612, height: 792 });
  const [operations, setOperations] = useState<PdfOperation[]>([]); const [tool, setTool] = useState<Tool>("text");
  const [x, setX] = useState(72); const [y, setY] = useState(650); const [boxWidth, setBoxWidth] = useState(180); const [boxHeight, setBoxHeight] = useState(34);
  const [text, setText] = useState("New text"); const [fontSize, setFontSize] = useState(16); const [color, setColor] = useState("#17241e");
  const [url, setUrl] = useState("https://"); const [imageData, setImageData] = useState<{ dataUrl: string; mimeType: "image/png" | "image/jpeg" } | null>(null);
  const [notice, setNotice] = useState<string | null>(null); const [rendering, setRendering] = useState(false);

  useEffect(() => {
    if (!source) return;
    let cancelled = false;
    (async () => {
      setRendering(true);
      try {
        const bytes = await buildPdf(source, operations);
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
        const task = pdfjs.getDocument({ data: bytes.slice() });
        const document = await task.promise; const page = await document.getPage(pageIndex + 1); const base = page.getViewport({ scale: 1 });
        const scale = Math.min(1.65, 1100 / base.width); const viewport = page.getViewport({ scale }); const canvas = canvasRef.current;
        if (!canvas || cancelled) return;
        canvas.width = Math.round(viewport.width); canvas.height = Math.round(viewport.height); setPageSize({ width: base.width, height: base.height });
        const context = canvas.getContext("2d", { alpha: false }); if (!context) throw new Error("Canvas preview is unavailable.");
        await page.render({ canvas, canvasContext: context, viewport }).promise; await task.destroy();
      } catch (error) { if (!cancelled) setNotice(error instanceof Error ? error.message : "PDF preview failed."); }
      finally { if (!cancelled) setRendering(false); }
    })();
    return () => { cancelled = true; };
  }, [source, operations, pageIndex]);

  async function loadPdf(file: File) {
    setNotice(null);
    if (file.type !== "application/pdf" || file.size > 30 * 1024 * 1024) { setNotice("Choose a PDF no larger than 30 MB."); return; }
    try {
      const bytes = new Uint8Array(await file.arrayBuffer()); const document = await PDFDocument.load(bytes, { updateMetadata: false });
      setSource(bytes); setSourceName(safeFilename(file.name)); setPageCount(document.getPageCount()); setPageIndex(0); setOperations([]);
      const first = document.getPage(0); setPageSize({ width: first.getWidth(), height: first.getHeight() });
    } catch { setNotice("This PDF is encrypted, damaged or unsupported. KRITIVA did not modify it."); }
  }

  function positionFromClick(event: MouseEvent<HTMLCanvasElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    setX(Math.round(((event.clientX - bounds.left) / bounds.width) * pageSize.width));
    setY(Math.round((1 - (event.clientY - bounds.top) / bounds.height) * pageSize.height));
  }

  function addOperation() {
    if (!source) return;
    const common = { id: crypto.randomUUID(), page: pageIndex, x: Math.max(0, x), y: Math.max(0, y) };
    if (tool === "text") {
      if (!text.trim()) { setNotice("Enter text before adding it."); return; }
      setOperations((old) => [...old, { ...common, type: "text", text: text.trim(), size: fontSize, color }]);
    } else if (tool === "redact") {
      setOperations((old) => [...old, { ...common, type: "redact", width: boxWidth, height: boxHeight, replacement: text.trim(), size: fontSize, color }]);
    } else if (tool === "image") {
      if (!imageData) { setNotice("Choose a PNG or JPEG image first."); return; }
      setOperations((old) => [...old, { ...common, type: "image", width: boxWidth, height: boxHeight, ...imageData }]);
    } else {
      try { const parsed = new URL(url); if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error(); }
      catch { setNotice("Enter a complete HTTP or HTTPS URL."); return; }
      setOperations((old) => [...old, { ...common, type: "link", width: boxWidth, height: boxHeight, url, label: text.trim(), size: fontSize }]);
    }
    setNotice("Edit added locally. The preview and exported PDF include it.");
  }

  async function exportPdf() {
    if (!source) return;
    try { const bytes = await buildPdf(source, operations); downloadBlob(new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" }), sourceName.replace(/\.pdf$/i, "-edited.pdf")); }
    catch { setNotice("The edited PDF could not be exported."); }
  }

  return <section className="studio-section pdf-section">
    <div className="section-heading"><div><span className="eyebrow">LOCAL PDF STUDIO</span><h2>Edit pages without DOCX conversion.</h2></div><p>Add text, cover or visually replace content, place images and create clickable links. Files remain in this browser.</p></div>
    <div className="studio-shell pdf-shell"><div className="pdf-toolbar"><label className="file-button"><input type="file" accept="application/pdf" onChange={(event) => { const file = event.target.files?.[0]; if (file) loadPdf(file); }} /><span>{source ? sourceName : "Choose PDF · maximum 30 MB"}</span></label>{source && <><button className="secondary-button" disabled={pageIndex === 0} onClick={() => setPageIndex((value) => value - 1)}>Previous</button><span>Page {pageIndex + 1} of {pageCount}</span><button className="secondary-button" disabled={pageIndex + 1 >= pageCount} onClick={() => setPageIndex((value) => value + 1)}>Next</button><button className="primary-button" onClick={exportPdf}>Download edited PDF</button></>}</div>
      {notice && <div className="notice" role="status">{notice}</div>}
      <div className="pdf-layout"><aside className="pdf-controls"><label className="field"><span>Edit type</span><select value={tool} onChange={(event) => setTool(event.target.value as Tool)}><option value="text">Add text</option><option value="redact">Cover / replace area</option><option value="image">Add local image</option><option value="link">Add clickable URL</option></select></label>
        <p className="microcopy">Click the page preview to set the insertion point. PDF coordinates can then be adjusted precisely below.</p>
        <div className="field-row"><label className="field"><span>X position</span><input type="number" value={x} onChange={(event) => setX(Number(event.target.value))} /></label><label className="field"><span>Y position</span><input type="number" value={y} onChange={(event) => setY(Number(event.target.value))} /></label></div>
        {(tool === "redact" || tool === "image" || tool === "link") && <div className="field-row"><label className="field"><span>Width</span><input type="number" min="1" value={boxWidth} onChange={(event) => setBoxWidth(Number(event.target.value))} /></label><label className="field"><span>Height</span><input type="number" min="1" value={boxHeight} onChange={(event) => setBoxHeight(Number(event.target.value))} /></label></div>}
        {tool !== "image" && <label className="field"><span>{tool === "redact" ? "Replacement text · leave blank to remove visually" : tool === "link" ? "Visible link label" : "Text"}</span><textarea value={text} maxLength={1000} onChange={(event) => setText(event.target.value)} /></label>}
        {(tool === "text" || tool === "redact" || tool === "link") && <div className="field-row"><label className="field"><span>Font size</span><input type="number" min="6" max="120" value={fontSize} onChange={(event) => setFontSize(Number(event.target.value))} /></label>{tool !== "link" && <label className="field color-field"><span>Colour</span><input type="color" value={color} onChange={(event) => setColor(event.target.value)} /></label>}</div>}
        {tool === "link" && <label className="field"><span>Destination URL</span><input type="url" value={url} onChange={(event) => setUrl(event.target.value)} /></label>}
        {tool === "image" && <><input ref={imageRef} hidden type="file" accept="image/png,image/jpeg" onChange={(event) => { const file = event.target.files?.[0]; if (!file || !["image/png", "image/jpeg"].includes(file.type)) return; const reader = new FileReader(); reader.onload = () => setImageData({ dataUrl: String(reader.result), mimeType: file.type as "image/png" | "image/jpeg" }); reader.readAsDataURL(file); }} /><button className="secondary-button full" onClick={() => imageRef.current?.click()}>{imageData ? "Image ready · choose another" : "Choose PNG or JPEG"}</button></>}
        <button className="primary-button full" disabled={!source} onClick={addOperation}>Apply edit to page {pageIndex + 1}</button>
        <div className="pdf-operation-list"><div><strong>{operations.length} local edits</strong><button disabled={!operations.length} onClick={() => setOperations((old) => old.slice(0, -1))}>Undo last</button></div>{operations.slice().reverse().map((operation) => <button key={operation.id} onClick={() => setOperations((old) => old.filter((item) => item.id !== operation.id))}><span>Page {operation.page + 1} · {operation.type}</span><b>Remove</b></button>)}</div>
      </aside><div className="pdf-preview"><div className="pdf-page"><canvas ref={canvasRef} onClick={positionFromClick} aria-label="PDF page preview. Click to choose an edit position." />{!source && <div className="pdf-empty"><strong>Select a PDF to begin.</strong><p>No file is uploaded to KRITIVA.</p></div>}{rendering && source && <span className="pdf-rendering">Updating preview…</span>}</div><p>“Cover / replace” draws over the original content. It does not rewrite the PDF’s internal text flow or perform OCR.</p></div></div>
    </div>
  </section>;
}
