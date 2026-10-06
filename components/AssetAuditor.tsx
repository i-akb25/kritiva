"use client";

import JSZip from "jszip";
import { useMemo, useState } from "react";
import { bytesToSize, downloadBlob, loadImage, safeFilename } from "@/lib/asset-utils";
import { DownloadIcon, SearchIcon, ShieldIcon, UploadIcon } from "./icons";

type AuditSeverity = "error" | "warning" | "info";
type AuditFinding = { severity: AuditSeverity; code: string; path: string; message: string };
type AuditFile = { path: string; size: number; type: string; hash?: string; width?: number; height?: number };
type AuditReport = { createdAt: string; source: string; files: AuditFile[]; findings: AuditFinding[]; summary: { errors: number; warnings: number; info: number; totalBytes: number } };

const requiredByType: Record<string, string[]> = {
  portfolio: ["cover.webp", "thumbnail.webp", "og-default.webp"],
  "web-app": ["favicon.ico", "apple-touch-icon.png", "icon-192.png", "icon-512.png", "og-default.webp"],
  pwa: ["favicon.ico", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "manifest.webmanifest"],
  article: ["cover.webp", "og-default.webp"],
};
const imageExtensions = new Set(["png", "jpg", "jpeg", "webp", "gif", "avif"]);
const codeExtensions = new Set(["js", "jsx", "ts", "tsx", "css", "scss", "html", "md", "mdx", "json"]);
const extensionOf = (path: string) => path.split(".").pop()?.toLowerCase() ?? "";
const sha256 = async (blob: Blob) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", await blob.arrayBuffer()))).map((byte) => byte.toString(16).padStart(2, "0")).join("");

export function AssetAuditor() {
  const [type, setType] = useState("web-app");
  const [report, setReport] = useState<AuditReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<AuditSeverity | "all">("all");
  const [message, setMessage] = useState<string | null>(null);

  const auditEntries = async (entries: Array<{ path: string; blob: Blob }>, source: string) => {
    if (entries.length > 500) throw new Error("Audit stopped: the package contains more than 500 files.");
    const total = entries.reduce((sum, entry) => sum + entry.blob.size, 0);
    if (total > 200_000_000) throw new Error("Audit stopped: expanded content exceeds the 200 MB safety limit.");
    const findings: AuditFinding[] = [];
    const files: AuditFile[] = [];
    const codeText: string[] = [];
    for (const entry of entries) {
      const path = entry.path.replace(/\\/g, "/");
      const base = path.split("/").pop() ?? path;
      const extension = extensionOf(path);
      if (path.includes("../") || path.startsWith("/") || path.includes("\0")) findings.push({ severity: "error", code: "unsafe-path", path, message: "Unsafe or traversal-like archive path." });
      if (base !== safeFilename(base)) findings.push({ severity: "warning", code: "filename", path, message: "Filename is not lowercase kebab-case." });
      const item: AuditFile = { path, size: entry.blob.size, type: extension };
      if (imageExtensions.has(extension)) {
        item.hash = await sha256(entry.blob);
        try {
          const image = await loadImage(new File([entry.blob], base, { type: entry.blob.type || `image/${extension}` }));
          item.width = image.naturalWidth; item.height = image.naturalHeight;
          if (image.naturalWidth > 3840 || image.naturalHeight > 3840) findings.push({ severity: "warning", code: "oversized-dimensions", path, message: `${image.naturalWidth} × ${image.naturalHeight} is larger than normal website display needs.` });
          if (base.startsWith("og-") && (image.naturalWidth !== 1200 || image.naturalHeight !== 630)) findings.push({ severity: "error", code: "og-dimensions", path, message: "Open Graph images should be 1200 × 630." });
          if (base === "icon-192.png" && (image.naturalWidth !== 192 || image.naturalHeight !== 192)) findings.push({ severity: "error", code: "pwa-dimensions", path, message: "icon-192.png must be 192 × 192." });
          if ((base === "icon-512.png" || base === "icon-maskable-512.png") && (image.naturalWidth !== 512 || image.naturalHeight !== 512)) findings.push({ severity: "error", code: "pwa-dimensions", path, message: `${base} must be 512 × 512.` });
        } catch { findings.push({ severity: "error", code: "decode", path, message: "The image could not be decoded by this browser." }); }
        if (entry.blob.size > 750_000) findings.push({ severity: "warning", code: "file-size", path, message: `${bytesToSize(entry.blob.size)} is unusually large for a website raster asset.` });
        if (["jpg", "jpeg", "png"].includes(extension)) {
          const head = new TextDecoder("latin1").decode((await entry.blob.slice(0, 64_000).arrayBuffer()));
          if (/Exif\x00\x00|Photoshop|Adobe XMP|http:\/\/ns\.adobe\.com/i.test(head)) findings.push({ severity: "warning", code: "metadata", path, message: "Potential EXIF/XMP/editor metadata detected." });
        }
      } else if (codeExtensions.has(extension) && entry.blob.size < 2_000_000) {
        try { codeText.push(await entry.blob.text()); } catch { /* ignore unreadable text */ }
      }
      files.push(item);
    }
    const byHash = new Map<string, AuditFile[]>();
    files.filter((item) => item.hash).forEach((item) => byHash.set(item.hash!, [...(byHash.get(item.hash!) ?? []), item]));
    byHash.forEach((duplicates) => { if (duplicates.length > 1) duplicates.forEach((item) => findings.push({ severity: "warning", code: "duplicate", path: item.path, message: `Duplicate content shared with ${duplicates.filter((other) => other.path !== item.path).map((other) => other.path).join(", ")}.` })); });
    const basenames = new Set(files.map((item) => item.path.split("/").pop()?.toLowerCase()));
    requiredByType[type].forEach((required) => { if (!basenames.has(required)) findings.push({ severity: "error", code: "missing-required", path: required, message: `Required ${type} asset is missing.` }); });
    if (!files.some((item) => /(^|\/)(alt-text|asset-manifest)\.json$/i.test(item.path))) findings.push({ severity: "warning", code: "alt-manifest", path: "alt-text.json", message: "No alt-text or asset manifest was found." });
    const combinedCode = codeText.join("\n");
    files.filter((item) => imageExtensions.has(item.type)).forEach((item) => { const base = item.path.split("/").pop() ?? item.path; if (combinedCode && !combinedCode.includes(base)) findings.push({ severity: "info", code: "possibly-unused", path: item.path, message: "Filename was not referenced in the supplied text/code files." }); });
    findings.sort((a, b) => ({ error: 0, warning: 1, info: 2 }[a.severity] - { error: 0, warning: 1, info: 2 }[b.severity]));
    const summary = { errors: findings.filter((item) => item.severity === "error").length, warnings: findings.filter((item) => item.severity === "warning").length, info: findings.filter((item) => item.severity === "info").length, totalBytes: total };
    setReport({ createdAt: new Date().toISOString(), source, files, findings, summary });
  };

  const receiveZip = async (file: File) => {
    if (file.size > 50_000_000) { setMessage("ZIP files are limited to 50 MB before expansion."); return; }
    setBusy(true); setMessage(null); setReport(null);
    try {
      const zip = await JSZip.loadAsync(file, { checkCRC32: true });
      const items = Object.values(zip.files).filter((item) => !item.dir);
      const entries = await Promise.all(items.map(async (item) => ({ path: item.name, blob: await item.async("blob") })));
      await auditEntries(entries, file.name);
    } catch (error) { setMessage(error instanceof Error ? error.message : "The archive could not be audited."); }
    setBusy(false);
  };

  const receiveFolder = async (list: FileList | null) => {
    const selected = Array.from(list ?? []); if (!selected.length) return;
    setBusy(true); setMessage(null); setReport(null);
    try { await auditEntries(selected.map((file) => ({ path: file.webkitRelativePath || file.name, blob: file })), selected[0].webkitRelativePath.split("/")[0] || "local-folder"); }
    catch (error) { setMessage(error instanceof Error ? error.message : "The folder could not be audited."); }
    setBusy(false);
  };

  const visibleFindings = useMemo(() => report?.findings.filter((item) => filter === "all" || item.severity === filter) ?? [], [filter, report]);
  const exportReport = () => { if (report) downloadBlob(new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }), "asset-audit.json"); };

  return <section className="studio-section" id="auditor" aria-labelledby="auditor-title"><div className="section-heading"><div><span className="eyebrow">PHASE 5 · ASSET AUDITOR</span><h2 id="auditor-title">Find broken assets before users do.</h2></div><p>Audit a ZIP or permitted local folder entirely in the browser. Nothing is extracted onto the server.</p></div><div className="studio-shell auditor-shell"><div className="auditor-controls"><label className="field"><span>Project profile</span><select value={type} onChange={(event) => setType(event.target.value)}><option value="portfolio">Portfolio</option><option value="web-app">Web application</option><option value="pwa">Progressive Web App</option><option value="article">Article / journal</option></select></label><label className="file-button"><UploadIcon /><span><strong>Audit a ZIP package</strong><small>Maximum 50 MB compressed · 500 files</small></span><input type="file" accept="application/zip,.zip" onChange={(event) => { const file = event.target.files?.[0]; if (file) receiveZip(file); }} /></label><label className="file-button"><SearchIcon /><span><strong>Audit a local folder</strong><small>Your browser asks for folder permission</small></span><input type="file" multiple {...({ webkitdirectory: "" } as React.InputHTMLAttributes<HTMLInputElement>)} onChange={(event) => receiveFolder(event.target.files)} /></label>{message && <div className="notice">{message}</div>}<p className="microcopy"><ShieldIcon /> Audit results are heuristic. A filename not found in supplied source code is only “possibly unused,” never automatically deleted.</p></div><div className="audit-report">{busy && <div className="studio-empty"><SearchIcon /><p>Inspecting package safely…</p></div>}{!busy && !report && <div className="studio-empty"><SearchIcon /><p>Add a package to produce a local audit report.</p></div>}{report && <><div className="audit-summary"><div><span>ERRORS</span><strong>{report.summary.errors}</strong></div><div><span>WARNINGS</span><strong>{report.summary.warnings}</strong></div><div><span>INFO</span><strong>{report.summary.info}</strong></div><div><span>PACKAGE</span><strong>{bytesToSize(report.summary.totalBytes)}</strong></div></div><div className="audit-toolbar"><div>{(["all", "error", "warning", "info"] as const).map((item) => <button className={filter === item ? "active" : ""} key={item} onClick={() => setFilter(item)}>{item}</button>)}</div><button onClick={exportReport}><DownloadIcon /> JSON report</button></div><div className="finding-list">{visibleFindings.length ? visibleFindings.map((item, index) => <div key={`${item.code}-${item.path}-${index}`} className={`finding ${item.severity}`}><span>{item.severity === "error" ? "×" : item.severity === "warning" ? "!" : "i"}</span><div><strong>{item.message}</strong><code>{item.path}</code></div></div>) : <div className="audit-clean">No findings in this category.</div>}</div></>}</div></div></section>;
}
