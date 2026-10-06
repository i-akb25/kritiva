/* eslint-disable @next/next/no-img-element */
"use client";

import JSZip from "jszip";
import { useEffect, useMemo, useState } from "react";
import { assetSpecs, categories, getSpec, type AssetCategory, type AssetSpec } from "@/lib/specs";
import { bytesToSize, downloadBlob, loadImage, processImage, replaceExtension, safeFilename, specAsText, validateFile, type ValidationResult } from "@/lib/asset-utils";
import { CheckIcon, CopyIcon, DownloadIcon, FileIcon, LayersIcon, SearchIcon, ShieldIcon, SparkIcon, TrashIcon } from "./icons";
import { DropZone } from "./DropZone";

type Tab = "prepare" | "inspect" | "icons";
type Preview = { url: string; blob: Blob; width: number; height: number };

const imageSpecs = assetSpecs.filter((spec) => spec.format.includes("WebP") && spec.width);

function createIco(entries: Array<{ size: number; bytes: Uint8Array }>): Uint8Array {
  const headerSize = 6 + entries.length * 16;
  const totalSize = headerSize + entries.reduce((sum, entry) => sum + entry.bytes.length, 0);
  const output = new Uint8Array(totalSize);
  const view = new DataView(output.buffer);
  view.setUint16(0, 0, true);
  view.setUint16(2, 1, true);
  view.setUint16(4, entries.length, true);
  let offset = headerSize;
  entries.forEach((entry, index) => {
    const position = 6 + index * 16;
    output[position] = entry.size === 256 ? 0 : entry.size;
    output[position + 1] = entry.size === 256 ? 0 : entry.size;
    output[position + 2] = 0;
    output[position + 3] = 0;
    view.setUint16(position + 4, 1, true);
    view.setUint16(position + 6, 32, true);
    view.setUint32(position + 8, entry.bytes.length, true);
    view.setUint32(position + 12, offset, true);
    output.set(entry.bytes, offset);
    offset += entry.bytes.length;
  });
  return output;
}

export function Workbench() {
  const [tab, setTab] = useState<Tab>("prepare");
  const [selectedId, setSelectedId] = useState("project-cover");
  const selected = getSpec(selectedId);
  const [source, setSource] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [sourceDimensions, setSourceDimensions] = useState<{ width: number; height: number } | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [quality, setQuality] = useState(84);
  const [filename, setFilename] = useState("cover.webp");
  const [fit, setFit] = useState<"cover" | "contain">("cover");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [validation, setValidation] = useState<ValidationResult[]>([]);
  const [inspectSpecId, setInspectSpecId] = useState("project-cover");
  const [iconSource, setIconSource] = useState<File | null>(null);
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const [iconBackground, setIconBackground] = useState("#17241e");

  useEffect(() => () => {
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    if (preview) URL.revokeObjectURL(preview.url);
    if (iconUrl) URL.revokeObjectURL(iconUrl);
  }, [sourceUrl, preview, iconUrl]);

  const receiveSource = async (file: File) => {
    setMessage(null);
    if (!file.type.startsWith("image/")) { setMessage("Choose a PNG, JPEG or WebP image."); return; }
    if (file.size > 25_000_000) { setMessage("The local processor accepts images up to 25 MB."); return; }
    try {
      const image = await loadImage(file);
      if (sourceUrl) URL.revokeObjectURL(sourceUrl);
      if (preview) URL.revokeObjectURL(preview.url);
      setSource(file);
      setSourceUrl(URL.createObjectURL(file));
      setSourceDimensions({ width: image.naturalWidth, height: image.naturalHeight });
      setPreview(null);
      setFilename(selected.filename);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not read the image."); }
  };

  const changePreset = (id: string) => {
    const spec = getSpec(id);
    setSelectedId(id);
    setQuality(Math.round((spec.quality ?? 0.84) * 100));
    setFilename(spec.filename);
    setPreview((current) => { if (current) URL.revokeObjectURL(current.url); return null; });
  };

  const runProcess = async () => {
    if (!source) return;
    setBusy(true); setMessage(null);
    try {
      const result = await processImage(source, { width: selected.width, height: selected.height, quality: quality / 100, mime: "image/webp", fit });
      if (preview) URL.revokeObjectURL(preview.url);
      setPreview({ ...result, url: URL.createObjectURL(result.blob) });
    } catch (error) { setMessage(error instanceof Error ? error.message : "Processing failed."); }
    finally { setBusy(false); }
  };

  const inspect = async (file: File) => {
    setMessage(null);
    try {
      let dimensions: { width: number; height: number } | undefined;
      if (file.type.startsWith("image/")) {
        const image = await loadImage(file);
        dimensions = { width: image.naturalWidth, height: image.naturalHeight };
      }
      setValidation(validateFile(file, getSpec(inspectSpecId), dimensions));
    } catch { setValidation(validateFile(file, getSpec(inspectSpecId))); }
  };

  const receiveIcon = async (file: File) => {
    if (!file.type.startsWith("image/")) { setMessage("Choose a square PNG, JPEG, WebP or SVG source."); return; }
    if (iconUrl) URL.revokeObjectURL(iconUrl);
    setIconSource(file); setIconUrl(URL.createObjectURL(file)); setMessage(null);
  };

  const buildIconPack = async () => {
    if (!iconSource) return;
    setBusy(true); setMessage(null);
    try {
      const zip = new JSZip();
      const entries: Array<{ size: number; bytes: Uint8Array }> = [];
      for (const size of [16, 32, 48]) {
        const item = await processImage(iconSource, { width: size, height: size, quality: 1, mime: "image/png", fit: "contain", background: iconBackground });
        const bytes = new Uint8Array(await item.blob.arrayBuffer());
        entries.push({ size, bytes });
        zip.file(`favicon-${size}x${size}.png`, item.blob);
      }
      const outputs = [
        { name: "apple-touch-icon.png", size: 180 },
        { name: "icon-192.png", size: 192 },
        { name: "icon-512.png", size: 512 },
        { name: "icon-maskable-512.png", size: 512 },
      ];
      for (const output of outputs) {
        const item = await processImage(iconSource, { width: output.size, height: output.size, quality: 1, mime: "image/png", fit: "contain", background: iconBackground });
        zip.file(output.name, item.blob);
      }
      zip.file("favicon.ico", createIco(entries));
      zip.file("manifest-icons.json", JSON.stringify({ icons: [
        { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ] }, null, 2));
      zip.file("README.txt", "KRITIVA ICON PACK\n\nGenerated locally in your browser.\nReview each icon at its intended size before publishing.\nMaskable artwork should remain within the central 80% safe area.\n");
      downloadBlob(await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 7 } }), "kritiva-icon-pack.zip");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not create the icon pack."); }
    finally { setBusy(false); }
  };

  return (
    <section className="workbench" id="workspace" aria-labelledby="workbench-title">
      <div className="section-heading workbench-heading">
        <div><span className="eyebrow">LOCAL WORKSPACE</span><h2 id="workbench-title">Prepare the asset, not the paperwork.</h2></div>
        <p>Your files stay in this browser tab. KRITIVA does not upload them to a server.</p>
      </div>
      <div className="workbench-shell">
        <div className="workbench-tabs" role="tablist" aria-label="Asset tools">
          <button className={tab === "prepare" ? "active" : ""} onClick={() => setTab("prepare")} role="tab" aria-selected={tab === "prepare"}><SparkIcon /> Prepare image</button>
          <button className={tab === "inspect" ? "active" : ""} onClick={() => setTab("inspect")} role="tab" aria-selected={tab === "inspect"}><FileIcon /> Validate file</button>
          <button className={tab === "icons" ? "active" : ""} onClick={() => setTab("icons")} role="tab" aria-selected={tab === "icons"}><LayersIcon /> Build icon pack</button>
        </div>

        {message && <div className="notice" role="alert">{message}</div>}

        {tab === "prepare" && (
          <div className="tool-layout">
            <div className="tool-controls">
              <label className="field"><span>Output preset</span><select value={selectedId} onChange={(event) => changePreset(event.target.value)}>{imageSpecs.map((spec) => <option key={spec.id} value={spec.id}>{spec.name} · {spec.dimensions}</option>)}</select></label>
              {!source ? <DropZone onFile={receiveSource} /> : (
                <div className="source-card">
                  <img src={sourceUrl ?? ""} alt="Source preview" />
                  <div><strong>{source.name}</strong><span>{sourceDimensions?.width} × {sourceDimensions?.height} · {bytesToSize(source.size)}</span></div>
                  <button type="button" aria-label="Remove source image" onClick={() => { setSource(null); setSourceUrl(null); setPreview(null); }}><TrashIcon /></button>
                </div>
              )}
              <div className="field-row">
                <label className="field"><span>Crop behavior</span><select value={fit} onChange={(event) => setFit(event.target.value as "cover" | "contain")}><option value="cover">Fill and crop</option><option value="contain">Fit inside canvas</option></select></label>
                <label className="field"><span>WebP quality · {quality}</span><input type="range" min="45" max="95" value={quality} onChange={(event) => setQuality(Number(event.target.value))} /></label>
              </div>
              <label className="field"><span>Output filename</span><input value={filename} onChange={(event) => setFilename(replaceExtension(safeFilename(event.target.value), "webp"))} spellCheck={false} /></label>
              <button className="primary-button full" type="button" disabled={!source || busy} onClick={runProcess}>{busy ? "Preparing…" : "Prepare WebP"}</button>
              <p className="microcopy"><ShieldIcon /> Re-encoding through the browser canvas removes embedded EXIF metadata. ICC colour conversion depends on browser support.</p>
            </div>
            <div className="output-panel">
              {preview ? <>
                <div className="preview-stage"><img src={preview.url} alt="Processed asset preview" /></div>
                <div className="output-summary"><div><span>OUTPUT</span><strong>{preview.width} × {preview.height}</strong></div><div><span>SIZE</span><strong>{bytesToSize(preview.blob.size)}</strong></div><div><span>FORMAT</span><strong>WebP</strong></div></div>
                <button className="secondary-button full" onClick={() => downloadBlob(preview.blob, filename)}><DownloadIcon /> Download {safeFilename(filename)}</button>
              </> : <div className="empty-output"><span className="ghost-frame"><SparkIcon /></span><strong>Your prepared asset appears here</strong><p>Choose a preset, add an image and review the result before downloading.</p></div>}
            </div>
          </div>
        )}

        {tab === "inspect" && (
          <div className="tool-layout compact-tool">
            <div className="tool-controls">
              <label className="field"><span>Validate against</span><select value={inspectSpecId} onChange={(event) => { setInspectSpecId(event.target.value); setValidation([]); }}>{assetSpecs.map((spec) => <option key={spec.id} value={spec.id}>{spec.name}</option>)}</select></label>
              <DropZone accept="*/*" onFile={inspect} title="Drop any asset here" description="Inspected locally · maximum browser capacity varies" />
              <p className="microcopy"><ShieldIcon /> File contents never leave this page. Validation checks technical properties, not visual quality or malicious content.</p>
            </div>
            <div className="output-panel validation-panel">
              {validation.length ? <><div className="validation-title"><span>VALIDATION REPORT</span><strong>{getSpec(inspectSpecId).name}</strong></div><div className="validation-list">{validation.map((item) => <div key={item.label}><span className={`status-dot ${item.state}`} /><span>{item.label}</span><strong title={item.value}>{item.value}</strong></div>)}</div><p className="validation-note">Warnings require review. They do not automatically make an asset unusable.</p></> : <div className="empty-output"><span className="ghost-frame"><FileIcon /></span><strong>No file inspected yet</strong><p>Select the intended asset type, then add the file you want to verify.</p></div>}
            </div>
          </div>
        )}

        {tab === "icons" && (
          <div className="tool-layout compact-tool">
            <div className="tool-controls">
              {!iconSource ? <DropZone accept="image/png,image/jpeg,image/webp,image/svg+xml" onFile={receiveIcon} title="Add a square brand mark" description="PNG, JPEG, WebP or SVG · at least 512 × 512 recommended" /> : <div className="source-card icon-source"><img src={iconUrl ?? ""} alt="Icon source preview" /><div><strong>{iconSource.name}</strong><span>{bytesToSize(iconSource.size)}</span></div><button type="button" aria-label="Remove icon source" onClick={() => { setIconSource(null); setIconUrl(null); }}><TrashIcon /></button></div>}
              <label className="field color-field"><span>Solid canvas colour</span><div><input type="color" value={iconBackground} onChange={(event) => setIconBackground(event.target.value)} /><input value={iconBackground} onChange={(event) => /^#[0-9a-f]{0,6}$/i.test(event.target.value) && setIconBackground(event.target.value)} spellCheck={false} /></div></label>
              <button className="primary-button full" disabled={!iconSource || busy} onClick={buildIconPack}>{busy ? "Building package…" : "Build and download ZIP"}</button>
            </div>
            <div className="output-panel pack-panel">
              <span className="pack-mark" style={{ backgroundColor: iconBackground }}>{iconUrl && <img src={iconUrl} alt="" />}</span>
              <div><span className="eyebrow">7 GENERATED FILES + MANIFEST</span><h3>One source. Every essential icon.</h3><ul><li>16, 32 and 48 px favicon PNGs</li><li>Multi-size favicon.ico</li><li>Apple Touch, PWA and maskable icons</li><li>Web app manifest snippet and usage notes</li></ul></div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export function SpecificationLibrary() {
  const [category, setCategory] = useState<AssetCategory | "All">("All");
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<AssetSpec | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const filtered = useMemo(() => assetSpecs.filter((spec) => (category === "All" || spec.category === category) && `${spec.name} ${spec.format} ${spec.filename}`.toLowerCase().includes(query.toLowerCase())), [category, query]);

  const copy = async (spec: AssetSpec) => {
    await navigator.clipboard.writeText(specAsText(spec)); setCopiedId(spec.id); window.setTimeout(() => setCopiedId(null), 1600);
  };

  return (
    <section className="spec-section" id="specifications" aria-labelledby="spec-title">
      <div className="section-heading"><div><span className="eyebrow">SPECIFICATION LIBRARY</span><h2 id="spec-title">A clear standard for every file.</h2></div><p>Search, inspect and copy production specifications without digging through documentation.</p></div>
      <div className="spec-controls">
        <label className="search-field"><SearchIcon /><span className="sr-only">Search specifications</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search cover, SVG, résumé…" /></label>
        <div className="category-scroll">{categories.map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div>
      </div>
      <div className="spec-grid">
        {filtered.map((spec) => <article className="spec-card" key={spec.id}>
          <div className="spec-card-top"><span>{spec.category}</span><b>{spec.format}</b></div>
          <h3>{spec.name}</h3>
          <dl><div><dt>Dimensions</dt><dd>{spec.dimensions}</dd></div><div><dt>Target</dt><dd>{spec.targetSize}</dd></div><div><dt>Filename</dt><dd>{spec.filename}</dd></div></dl>
          <div className="spec-actions"><button onClick={() => setActive(spec)}>View details</button><button aria-label={`Copy ${spec.name} specification`} onClick={() => copy(spec)}>{copiedId === spec.id ? <CheckIcon /> : <CopyIcon />}</button></div>
        </article>)}
      </div>
      {!filtered.length && <div className="no-results"><SearchIcon /><strong>No matching specification</strong><p>Try a format, filename or broader category.</p></div>}

      {active && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setActive(null); }}>
        <div className="spec-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <button className="modal-close" onClick={() => setActive(null)} aria-label="Close details">×</button>
          <span className="eyebrow">{active.category} · {active.format}</span><h3 id="modal-title">{active.name}</h3>
          <dl className="modal-specs"><div><dt>Format</dt><dd>{active.format}</dd></div><div><dt>Dimensions</dt><dd>{active.dimensions}</dd></div><div><dt>Aspect ratio</dt><dd>{active.aspectRatio}</dd></div><div><dt>Target size</dt><dd>{active.targetSize}</dd></div><div><dt>Maximum</dt><dd>{active.maxSize}</dd></div><div><dt>Filename</dt><dd><code>{active.filename}</code></dd></div></dl>
          <div className="requirements"><strong>Requirements</strong>{active.notes.map((note) => <p key={note}><CheckIcon />{note}</p>)}</div>
          <button className="secondary-button full" onClick={() => copy(active)}>{copiedId === active.id ? <CheckIcon /> : <CopyIcon />}{copiedId === active.id ? "Copied" : "Copy specification"}</button>
        </div>
      </div>}
    </section>
  );
}
