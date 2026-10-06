/* eslint-disable @next/next/no-img-element */
"use client";

import JSZip from "jszip";
import { useEffect, useMemo, useRef, useState } from "react";
import { assetSpecs, type AssetSpec } from "@/lib/specs";
import { bytesToSize, downloadBlob, optimizeImageToTarget, processImage, safeFilename } from "@/lib/asset-utils";
import { CheckIcon, DownloadIcon, LayersIcon, TrashIcon, UploadIcon } from "./icons";

type PipelineTab = "batch" | "recipe" | "crop" | "presets" | "package";
type BatchResult = { name: string; blob?: Blob; error?: string; original: number; quality?: number; metTarget?: boolean };
type CustomPreset = { id: string; name: string; width: number; height: number; maxKb: number; format: "webp" | "png" };

const rasterSpecs = assetSpecs.filter((item) => item.width && item.format.includes("WebP"));
const packageTemplates: Record<string, string[]> = {
  portfolio: ["cover.webp", "thumbnail.webp", "og-default.webp", "favicon.ico", "icon-192.png", "icon-512.png"],
  "web-app": ["og-default.webp", "favicon.ico", "apple-touch-icon.png", "icon-192.png", "icon-512.png", "icon-maskable-512.png"],
  pwa: ["favicon.ico", "apple-touch-icon.png", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "manifest.webmanifest"],
  article: ["cover.webp", "og-default.webp"],
};

const readJson = async (file: File) => JSON.parse(await file.text()) as unknown;

export function PipelineStudio() {
  const [tab, setTab] = useState<PipelineTab>("batch");
  const [files, setFiles] = useState<File[]>([]);
  const [presetId, setPresetId] = useState("project-cover");
  const [targetKb, setTargetKb] = useState(350);
  const [batchResults, setBatchResults] = useState<BatchResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [recipeFile, setRecipeFile] = useState<File | null>(null);
  const [recipeName, setRecipeName] = useState("project-name");
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropUrl, setCropUrl] = useState<string | null>(null);
  const [focalX, setFocalX] = useState(50);
  const [focalY, setFocalY] = useState(50);
  const [zoom, setZoom] = useState(1);
  const [cropOutput, setCropOutput] = useState<{ blob: Blob; url: string; width: number; height: number } | null>(null);
  const [customPresets, setCustomPresets] = useState<CustomPreset[]>([]);
  const [draft, setDraft] = useState<Omit<CustomPreset, "id">>({ name: "Custom cover", width: 1600, height: 1200, maxKb: 500, format: "webp" });
  const [packageType, setPackageType] = useState("portfolio");
  const [packageFiles, setPackageFiles] = useState<File[]>([]);
  const importRef = useRef<HTMLInputElement>(null);
  const selected = rasterSpecs.find((item) => item.id === presetId) ?? rasterSpecs[0];

  useEffect(() => {
    // Hydrate browser-only presets after the client mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    try { setCustomPresets(JSON.parse(localStorage.getItem("kritiva-custom-presets") ?? "[]")); } catch { setCustomPresets([]); }
  }, []);
  useEffect(() => () => { if (cropUrl) URL.revokeObjectURL(cropUrl); if (cropOutput) URL.revokeObjectURL(cropOutput.url); }, [cropUrl, cropOutput]);

  const savePresets = (next: CustomPreset[]) => {
    setCustomPresets(next);
    localStorage.setItem("kritiva-custom-presets", JSON.stringify(next));
  };

  const receiveCrop = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (cropUrl) URL.revokeObjectURL(cropUrl);
    if (cropOutput) URL.revokeObjectURL(cropOutput.url);
    setCropFile(file); setCropUrl(URL.createObjectURL(file)); setCropOutput(null);
  };

  const runBatch = async () => {
    if (!files.length) return;
    setBusy(true); setNotice(null); setBatchResults([]);
    const results: BatchResult[] = [];
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      try {
        const output = await optimizeImageToTarget(file, { width: selected.width, height: selected.height, quality: selected.quality ?? .86, mime: "image/webp", fit: "cover" }, targetKb * 1000);
        results.push({ name: `${safeFilename(file.name).replace(/\.[^.]+$/, "")}-${index + 1}.webp`, blob: output.blob, original: file.size, quality: output.quality, metTarget: output.metTarget });
      } catch (error) {
        results.push({ name: file.name, original: file.size, error: error instanceof Error ? error.message : "Processing failed" });
      }
      setBatchResults([...results]);
    }
    setBusy(false);
  };

  const downloadBatch = async () => {
    const zip = new JSZip();
    const manifest: Array<Record<string, unknown>> = [];
    batchResults.forEach((result) => {
      if (result.blob) zip.file(result.name, result.blob);
      manifest.push({ filename: result.name, originalBytes: result.original, outputBytes: result.blob?.size, quality: result.quality, metTarget: result.metTarget, error: result.error });
    });
    zip.file("manifest.json", JSON.stringify(manifest, null, 2));
    downloadBlob(await zip.generateAsync({ type: "blob", compression: "DEFLATE" }), "kritiva-batch.zip");
  };

  const runRecipe = async () => {
    if (!recipeFile) return;
    setBusy(true); setNotice(null);
    try {
      const root = safeFilename(recipeName || "project").replace(/\.[^.]+$/, "");
      const zip = new JSZip();
      const outputs: Array<{ name: string; spec: AssetSpec }> = [
        { name: "cover.webp", spec: assetSpecs.find((item) => item.id === "project-cover")! },
        { name: "thumbnail.webp", spec: assetSpecs.find((item) => item.id === "project-thumbnail")! },
        { name: "og-project.webp", spec: assetSpecs.find((item) => item.id === "og-image")! },
      ];
      const manifest = [];
      for (const output of outputs) {
        const result = await optimizeImageToTarget(recipeFile, { width: output.spec.width, height: output.spec.height, quality: output.spec.quality ?? .86, mime: "image/webp", fit: "cover" }, output.spec.maxBytes ?? 500_000);
        zip.file(`${root}/${output.name}`, result.blob);
        manifest.push({ filename: output.name, width: result.width, height: result.height, bytes: result.blob.size, quality: result.quality, targetMet: result.metTarget });
      }
      zip.file(`${root}/manifest.json`, JSON.stringify({ generatedAt: new Date().toISOString(), source: safeFilename(recipeFile.name), assets: manifest }, null, 2));
      downloadBlob(await zip.generateAsync({ type: "blob", compression: "DEFLATE" }), `${root}-assets.zip`);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Recipe failed"); }
    setBusy(false);
  };

  const renderCrop = async () => {
    if (!cropFile) return;
    setBusy(true);
    try {
      const result = await processImage(cropFile, { width: selected.width, height: selected.height, quality: selected.quality ?? .86, mime: "image/webp", fit: "cover", focalX: focalX / 100, focalY: focalY / 100, zoom });
      if (cropOutput) URL.revokeObjectURL(cropOutput.url);
      setCropOutput({ ...result, url: URL.createObjectURL(result.blob) });
    } catch (error) { setNotice(error instanceof Error ? error.message : "Crop failed"); }
    setBusy(false);
  };

  const addPreset = () => {
    if (!draft.name.trim() || draft.width < 16 || draft.height < 16 || draft.maxKb < 10) { setNotice("Enter a valid name, dimensions and maximum size."); return; }
    savePresets([...customPresets, { ...draft, id: crypto.randomUUID() }]);
    setNotice("Preset saved only in this browser.");
  };

  const exportPresets = () => downloadBlob(new Blob([JSON.stringify({ version: 1, presets: customPresets }, null, 2)], { type: "application/json" }), "kritiva-presets.json");
  const importPresets = async (file: File) => {
    try {
      const input = await readJson(file) as { presets?: CustomPreset[] };
      const valid = (input.presets ?? []).filter((item) => item && typeof item.name === "string" && Number.isFinite(item.width) && Number.isFinite(item.height) && Number.isFinite(item.maxKb));
      savePresets(valid.map((item) => ({ ...item, id: item.id || crypto.randomUUID(), format: item.format === "png" ? "png" : "webp" })));
      setNotice(`${valid.length} presets imported.`);
    } catch { setNotice("The selected preset JSON is invalid."); }
  };

  const required = packageTemplates[packageType];
  const packageStatus = useMemo(() => required.map((name) => ({ name, file: packageFiles.find((item) => safeFilename(item.name) === name) })), [packageFiles, required]);
  const downloadPackage = async () => {
    const zip = new JSZip();
    packageStatus.forEach((item) => { if (item.file) zip.file(`public/assets/${item.name}`, item.file); });
    zip.file("asset-package.json", JSON.stringify({ type: packageType, createdAt: new Date().toISOString(), required: packageStatus.map((item) => ({ filename: item.name, present: Boolean(item.file), bytes: item.file?.size })) }, null, 2));
    downloadBlob(await zip.generateAsync({ type: "blob" }), `kritiva-${packageType}-package.zip`);
  };

  return <section className="studio-section" id="pipeline" aria-labelledby="pipeline-title">
    <div className="section-heading"><div><span className="eyebrow">PHASE 2 · PRODUCTION PIPELINE</span><h2 id="pipeline-title">From source file to complete asset package.</h2></div><p>Batch processing, exact size targets, project recipes and local presets work without an account or upload server.</p></div>
    <div className="studio-shell">
      <div className="studio-tabs" role="tablist">{([
        ["batch", "Batch + target size"], ["recipe", "Multi-output recipe"], ["crop", "Crop editor"], ["presets", "Custom presets"], ["package", "Project package"],
      ] as Array<[PipelineTab, string]>).map(([id, label]) => <button key={id} className={tab === id ? "active" : ""} onClick={() => { setTab(id); setNotice(null); }}>{label}</button>)}</div>
      {notice && <div className="notice">{notice}</div>}
      <div className="studio-body">
        {tab === "batch" && <div className="studio-columns">
          <div className="studio-control-stack">
            <label className="file-button"><UploadIcon /><span><strong>Add multiple images</strong><small>PNG, JPEG or WebP · processed sequentially</small></span><input type="file" multiple accept="image/png,image/jpeg,image/webp" onChange={(event) => setFiles(Array.from(event.target.files ?? []))} /></label>
            <label className="field"><span>Output preset</span><select value={presetId} onChange={(event) => setPresetId(event.target.value)}>{rasterSpecs.map((spec) => <option key={spec.id} value={spec.id}>{spec.name} · {spec.dimensions}</option>)}</select></label>
            <label className="field"><span>Maximum size · {targetKb} KB</span><input type="range" min="40" max="1000" step="10" value={targetKb} onChange={(event) => setTargetKb(Number(event.target.value))} /></label>
            <button className="primary-button full" disabled={!files.length || busy} onClick={runBatch}>{busy ? "Processing locally…" : `Process ${files.length || ""} images`}</button>
          </div>
          <div className="result-list"><div className="result-list-head"><strong>Batch queue</strong>{batchResults.some((item) => item.blob) && <button onClick={downloadBatch}><DownloadIcon /> Download ZIP</button>}</div>
            {!files.length && <div className="studio-empty"><LayersIcon /><p>Add images to start a fault-tolerant batch.</p></div>}
            {(batchResults.length ? batchResults : files.map<BatchResult>((file) => ({ name: file.name, original: file.size }))).map((result, index) => <div className="result-row" key={`${result.name}-${index}`}><span className={result.error ? "result-state error" : result.blob ? "result-state pass" : "result-state"}>{result.error ? "!" : result.blob ? "✓" : index + 1}</span><div><strong>{result.name}</strong><small>{bytesToSize(result.original)}{result.blob ? ` → ${bytesToSize(result.blob.size)} · q${Math.round((result.quality ?? 0) * 100)}` : ""}</small></div>{result.metTarget === false && <em>Target missed</em>}</div>)}
          </div>
        </div>}

        {tab === "recipe" && <div className="studio-columns"><div className="studio-control-stack"><label className="file-button"><UploadIcon /><span><strong>{recipeFile?.name ?? "Choose one master image"}</strong><small>Generates cover, thumbnail and Open Graph image</small></span><input type="file" accept="image/*" onChange={(event) => setRecipeFile(event.target.files?.[0] ?? null)} /></label><label className="field"><span>Project folder name</span><input value={recipeName} onChange={(event) => setRecipeName(safeFilename(event.target.value))} /></label><button className="primary-button full" disabled={!recipeFile || busy} onClick={runRecipe}>{busy ? "Building recipe…" : "Generate project ZIP"}</button></div><div className="recipe-tree"><strong>{safeFilename(recipeName || "project-name")}/</strong><span>├── cover.webp <b>1600 × 1200</b></span><span>├── thumbnail.webp <b>1200 × 900</b></span><span>├── og-project.webp <b>1200 × 630</b></span><span>└── manifest.json</span></div></div>}

        {tab === "crop" && <div className="crop-layout"><div className="studio-control-stack"><label className="file-button"><UploadIcon /><span><strong>{cropFile?.name ?? "Choose an image"}</strong><small>Use focal controls instead of blind centre-cropping</small></span><input type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) receiveCrop(file); }} /></label><label className="field"><span>Output preset</span><select value={presetId} onChange={(event) => setPresetId(event.target.value)}>{rasterSpecs.map((spec) => <option key={spec.id} value={spec.id}>{spec.name} · {spec.dimensions}</option>)}</select></label><label className="field"><span>Horizontal focal point · {focalX}%</span><input type="range" min="0" max="100" value={focalX} onChange={(event) => setFocalX(Number(event.target.value))} /></label><label className="field"><span>Vertical focal point · {focalY}%</span><input type="range" min="0" max="100" value={focalY} onChange={(event) => setFocalY(Number(event.target.value))} /></label><label className="field"><span>Zoom · {zoom.toFixed(2)}×</span><input type="range" min="1" max="3" step=".05" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /></label><button className="primary-button full" disabled={!cropFile || busy} onClick={renderCrop}>Render crop</button></div><div className="crop-preview">{cropOutput ? <><img src={cropOutput.url} alt="Rendered crop" /><div className="safe-area" /><button className="secondary-button" onClick={() => downloadBlob(cropOutput.blob, selected.filename)}><DownloadIcon /> Download</button></> : cropUrl ? <><img src={cropUrl} alt="Crop source" style={{ objectPosition: `${focalX}% ${focalY}%`, transform: `scale(${zoom})` }} /><span className="focal-marker" style={{ left: `${focalX}%`, top: `${focalY}%` }} /></> : <div className="studio-empty"><UploadIcon /><p>Add an image to preview the crop.</p></div>}</div></div>}

        {tab === "presets" && <div className="studio-columns"><div className="preset-form"><label className="field"><span>Preset name</span><input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label><div className="field-row"><label className="field"><span>Width</span><input type="number" value={draft.width} onChange={(event) => setDraft({ ...draft, width: Number(event.target.value) })} /></label><label className="field"><span>Height</span><input type="number" value={draft.height} onChange={(event) => setDraft({ ...draft, height: Number(event.target.value) })} /></label></div><div className="field-row"><label className="field"><span>Maximum KB</span><input type="number" value={draft.maxKb} onChange={(event) => setDraft({ ...draft, maxKb: Number(event.target.value) })} /></label><label className="field"><span>Format</span><select value={draft.format} onChange={(event) => setDraft({ ...draft, format: event.target.value as "webp" | "png" })}><option value="webp">WebP</option><option value="png">PNG</option></select></label></div><button className="primary-button full" onClick={addPreset}>Save locally</button><div className="button-pair"><button className="secondary-button" onClick={exportPresets} disabled={!customPresets.length}>Export JSON</button><button className="secondary-button" onClick={() => importRef.current?.click()}>Import JSON</button><input hidden ref={importRef} type="file" accept="application/json" onChange={(event) => { const file = event.target.files?.[0]; if (file) importPresets(file); }} /></div></div><div className="preset-list">{customPresets.length ? customPresets.map((item) => <div key={item.id}><span><strong>{item.name}</strong><small>{item.width} × {item.height} · ≤ {item.maxKb} KB · {item.format.toUpperCase()}</small></span><button aria-label={`Delete ${item.name}`} onClick={() => savePresets(customPresets.filter((preset) => preset.id !== item.id))}><TrashIcon /></button></div>) : <div className="studio-empty"><LayersIcon /><p>No custom presets in this browser.</p></div>}</div></div>}

        {tab === "package" && <div className="studio-columns"><div className="studio-control-stack"><label className="field"><span>Project type</span><select value={packageType} onChange={(event) => { setPackageType(event.target.value); setPackageFiles([]); }}><option value="portfolio">Portfolio project</option><option value="web-app">Web application</option><option value="pwa">Progressive Web App</option><option value="article">Article / journal</option></select></label><label className="file-button"><UploadIcon /><span><strong>Add prepared project assets</strong><small>Matching is based on standardized filenames</small></span><input type="file" multiple onChange={(event) => setPackageFiles(Array.from(event.target.files ?? []))} /></label><button className="primary-button full" disabled={!packageFiles.length} onClick={downloadPackage}>Download normalized package</button></div><div className="package-checklist"><strong>Required assets</strong>{packageStatus.map((item) => <div key={item.name}><span className={item.file ? "check-present" : "check-missing"}>{item.file ? <CheckIcon /> : "–"}</span><code>{item.name}</code><small>{item.file ? bytesToSize(item.file.size) : "Missing"}</small></div>)}</div></div>}
      </div>
    </div>
  </section>;
}
