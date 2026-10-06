/* eslint-disable @next/next/no-img-element */
"use client";

import JSZip from "jszip";
import { useEffect, useMemo, useState } from "react";
import { downloadBlob, safeFilename } from "@/lib/asset-utils";
import { hasDangerousSvgMarkup, recolorSvg, sanitizeSvg, svgToReactComponent, tightenSvgViewBox, type SvgReport } from "@/lib/svg-tools";
import { DownloadIcon, ShieldIcon, UploadIcon } from "./icons";

export function SvgBrandLab() {
  const [name, setName] = useState("brand-mark.svg");
  const [svg, setSvg] = useState<string | null>(null);
  const [report, setReport] = useState<SvgReport | null>(null);
  const [colour, setColour] = useState("#17241e");
  const [message, setMessage] = useState<string | null>(null);
  const [strokeWidths, setStrokeWidths] = useState<string[]>([]);
  const url = useMemo(() => svg ? URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" })) : null, [svg]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  const receive = async (file: File) => {
    if (file.size > 1_000_000 || !file.name.toLowerCase().endsWith(".svg")) { setMessage("Choose an SVG smaller than 1 MB."); return; }
    try {
      const source = await file.text();
      const dangerous = hasDangerousSvgMarkup(source);
      const result = sanitizeSvg(source);
      const parsed = new DOMParser().parseFromString(result.svg, "image/svg+xml");
      setStrokeWidths(Array.from(new Set(Array.from(parsed.querySelectorAll("[stroke-width]")).map((item) => item.getAttribute("stroke-width") ?? ""))));
      setName(safeFilename(file.name)); setSvg(result.svg); setReport(result.report);
      setMessage(dangerous ? "Unsafe markup was detected and removed. Review the sanitization report." : "SVG sanitized successfully.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "SVG could not be parsed."); }
  };

  const tighten = async () => {
    if (!svg) return;
    try { setSvg(await tightenSvgViewBox(svg)); setMessage("The viewBox now fits the visible artwork with a 2% safety margin."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not tighten the viewBox."); }
  };

  const downloadSet = async () => {
    if (!svg) return;
    const base = name.replace(/\.svg$/i, "");
    const zip = new JSZip();
    zip.file(`${base}.svg`, svg);
    zip.file(`${base}-monochrome.svg`, recolorSvg(svg, colour, "monochrome"));
    zip.file(`${base}-light.svg`, recolorSvg(svg, "#fffdf8", "monochrome"));
    zip.file(`${base}-dark.svg`, recolorSvg(svg, "#17241e", "monochrome"));
    zip.file(`${base}.tsx`, svgToReactComponent(svg, base.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join("").replace(/^[^A-Za-z]/, "Kritiva")));
    zip.file("sanitization-report.json", JSON.stringify(report, null, 2));
    downloadBlob(await zip.generateAsync({ type: "blob" }), `${base}-brand-set.zip`);
  };

  return <section className="studio-section" id="svg-lab" aria-labelledby="svg-title"><div className="section-heading"><div><span className="eyebrow">PHASE 3 · SVG & BRAND LAB</span><h2 id="svg-title">Clean vectors before they enter the project.</h2></div><p>Strict allowlisting removes scripts, event handlers, foreign content and external references before preview or export.</p></div><div className="studio-shell svg-shell"><div className="svg-controls"><label className="file-button"><UploadIcon /><span><strong>{svg ? name : "Upload an SVG"}</strong><small>Maximum 1 MB · sanitized before preview</small></span><input type="file" accept="image/svg+xml,.svg" onChange={(event) => { const file = event.target.files?.[0]; if (file) receive(file); }} /></label>{message && <div className="notice"><ShieldIcon />{message}</div>}<label className="field color-field"><span>Monochrome colour</span><div><input type="color" value={colour} onChange={(event) => setColour(event.target.value)} /><input value={colour} onChange={(event) => setColour(event.target.value)} /></div></label><div className="button-pair"><button className="secondary-button" disabled={!svg} onClick={tighten}>Tighten viewBox</button><button className="primary-button" disabled={!svg} onClick={downloadSet}><DownloadIcon /> Export brand ZIP</button></div>{report && <dl className="mini-report"><div><dt>Removed elements</dt><dd>{report.removedElements}</dd></div><div><dt>Removed attributes</dt><dd>{report.removedAttributes}</dd></div><div><dt>External references</dt><dd>{report.externalReferences}</dd></div><div><dt>Stroke widths</dt><dd>{strokeWidths.length ? strokeWidths.join(", ") : "None declared"}</dd></div></dl>}</div><div className="svg-preview">{url ? <><img src={url} alt="Sanitized SVG preview" /><div className="alignment-grid"><i /><i /></div></> : <div className="studio-empty"><ShieldIcon /><p>No untrusted SVG is rendered before sanitization.</p></div>}</div></div></section>;
}
