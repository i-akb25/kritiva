"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { downloadBlob, safeFilename } from "@/lib/asset-utils";
import { downloadTransformedImage, type RasterFormat } from "@/lib/generated-image";
import { clearGeneratedImages, deleteGeneratedImage, listGeneratedImages, saveGeneratedImage, type GeneratedHistoryItem } from "@/lib/generated-history";
import { TurnstileWidget } from "./TurnstileWidget";

const tools = [
  ["image-generation", "Generate an image"], ["background-removal", "Background removal"], ["upscale", "Image upscaling"],
  ["object-removal", "Object removal"], ["background-generation", "Background generation"], ["illustration-variants", "Illustration variants"],
  ["icon-concepts", "Icon concepts"], ["image-to-3d", "2D image to 3D model"], ["text-to-3d", "Text to 3D prototype"],
] as const;
const promptOnlyTools = new Set(["image-generation", "background-generation", "illustration-variants", "icon-concepts", "text-to-3d"]);
const generationSizes = [
  ["square", "Square · 1024 × 1024", 1024, 1024], ["four-three", "Landscape 4:3 · 1024 × 768", 1024, 768],
  ["wide", "Landscape 16:9 · 1344 × 768", 1344, 768], ["portrait", "Portrait · 768 × 1024", 768, 1024],
  ["og", "Open Graph source · 1200 × 624", 1200, 624], ["custom", "Custom dimensions", 1024, 1024],
] as const;

type Status = { configured: boolean; provider: string; retention: string; training: string; transferNotice: string; mode: string; capabilities: string[]; developmentOnly: boolean; local: boolean; aiEnabled: boolean; turnstileSiteKey: string; turnstileRequired: boolean; turnstileConfigured: boolean; dailyLimit: number };
type ImageResult = { imageBase64: string; mimeType?: string; message?: string };
type Result = { status?: string; jobId?: string; outputUrl?: string; artifactBase64?: string; imageBase64?: string; images?: ImageResult[]; mimeType?: string; message?: string; error?: string; width?: number; height?: number; seed?: number };

function downloadArtifact(base64: string) {
  const binary = window.atob(base64); const chunks: ArrayBuffer[] = [];
  for (let offset = 0; offset < binary.length; offset += 64 * 1024) {
    const part = binary.slice(offset, offset + 64 * 1024); const bytes = new Uint8Array(part.length);
    for (let index = 0; index < part.length; index += 1) bytes[index] = part.charCodeAt(index);
    chunks.push(bytes.buffer);
  }
  const url = URL.createObjectURL(new Blob(chunks, { type: "model/gltf-binary" })); const anchor = document.createElement("a");
  anchor.href = url; anchor.download = "kritiva-model.glb"; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function AiWorkshop({ nonce }: { nonce?: string }) {
  const router = useRouter(); const importRef = useRef<HTMLInputElement>(null);
  const [tool, setTool] = useState<(typeof tools)[number][0]>("image-generation"); const [status, setStatus] = useState<Status | null>(null);
  const [files, setFiles] = useState<Record<string, File | null>>({}); const [prompt, setPrompt] = useState(""); const [negativePrompt, setNegativePrompt] = useState("");
  const [consent, setConsent] = useState(false); const [result, setResult] = useState<Result | null>(null); const [working, setWorking] = useState(false);
  const [sizePreset, setSizePreset] = useState("square"); const [width, setWidth] = useState(1024); const [height, setHeight] = useState(1024);
  const [variations, setVariations] = useState(1); const [seed, setSeed] = useState(""); const [selectedImage, setSelectedImage] = useState(0);
  const [outputWidth, setOutputWidth] = useState(1024); const [outputHeight, setOutputHeight] = useState(1024); const [outputFormat, setOutputFormat] = useState<RasterFormat>("image/webp");
  const [quality, setQuality] = useState(88); const [filename, setFilename] = useState("kritiva-generated"); const [history, setHistory] = useState<GeneratedHistoryItem[]>([]);
  const [turnstileToken, setTurnstileToken] = useState(""); const [turnstileReset, setTurnstileReset] = useState(0);
  const handleTurnstile = useCallback((token: string) => setTurnstileToken(token), []);
  const refreshHistory = useCallback(() => listGeneratedImages().then(setHistory).catch(() => setHistory([])), []);

  useEffect(() => { refreshHistory(); }, [refreshHistory]);
  useEffect(() => { fetch("/api/ai/status").then((response) => response.json()).then((nextStatus: Status) => { setStatus(nextStatus); setTool((current) => nextStatus.capabilities?.includes(current) ? current : nextStatus.capabilities[0] as (typeof tools)[number][0]); }).catch(() => setStatus(null)); }, []);
  useEffect(() => {
    if (!result?.jobId || !["queued", "processing"].includes(result.status || "")) return;
    const timer = window.setInterval(async () => { const response = await fetch(`/api/ai/jobs/${encodeURIComponent(result.jobId!)}`); const update = await response.json(); setResult(update); if (!["queued", "processing"].includes(update.status)) window.clearInterval(timer); }, 5000);
    return () => window.clearInterval(timer);
  }, [result?.jobId, result?.status]);

  const availableTools = status?.capabilities?.length ? tools.filter(([value]) => status.capabilities.includes(value)) : tools;
  const promptOnly = promptOnlyTools.has(tool); const hostedImageMode = status?.mode === "cloudflare-images" && promptOnly && tool !== "text-to-3d";
  const slots = promptOnly ? [] : tool === "image-to-3d" ? status?.local ? [["front", "Front view · required"]] : [["front", "Front view · required"], ["left", "Left view · optional"], ["right", "Right view · optional"], ["rear", "Rear view · optional"], ["top", "Top view · optional"]] : [["source", "Source image · required"]];
  const sourceReady = promptOnly ? Boolean(prompt.trim()) : Boolean(files[tool === "image-to-3d" ? "front" : "source"]);
  const resultImages = useMemo(() => result?.images?.length ? result.images : result?.imageBase64 ? [{ imageBase64: result.imageBase64, mimeType: result.mimeType }] : [], [result]);
  const activeImage = resultImages[selectedImage] ?? resultImages[0];

  function chooseSize(value: string) {
    setSizePreset(value); const found = generationSizes.find(([id]) => id === value);
    if (found && value !== "custom") { setWidth(found[2]); setHeight(found[3]); setOutputWidth(found[2]); setOutputHeight(found[3]); }
  }

  async function persistResults(data: Result) {
    const images = data.images?.length ? data.images : data.imageBase64 ? [{ imageBase64: data.imageBase64, mimeType: data.mimeType }] : [];
    const saved: GeneratedHistoryItem[] = [];
    for (let index = 0; index < images.length; index += 1) {
      const item: GeneratedHistoryItem = { id: crypto.randomUUID(), prompt, seed: data.seed === undefined ? undefined : data.seed + index, width: data.width ?? width, height: data.height ?? height, mimeType: images[index].mimeType || "image/jpeg", imageBase64: images[index].imageBase64, createdAt: new Date().toISOString() };
      await saveGeneratedImage(item); saved.push(item);
    }
    await refreshHistory(); return saved;
  }

  async function submit() {
    if (!sourceReady || !consent || !status?.configured || (status.turnstileRequired && !turnstileToken)) return;
    setWorking(true); setResult(null); setSelectedImage(0); const body = new FormData();
    body.set("task", tool); body.set("consent", "explicit"); body.set("prompt", `${prompt}${negativePrompt.trim() ? `\nAvoid: ${negativePrompt.trim()}` : ""}`);
    body.set("width", String(width)); body.set("height", String(height)); body.set("variations", String(variations)); if (seed.trim()) body.set("seed", seed.trim());
    if (turnstileToken) body.set("turnstileToken", turnstileToken); Object.entries(files).forEach(([key, file]) => { if (file) body.set(key, file); });
    try { const response = await fetch("/api/ai/generate", { method: "POST", body }); const data = await response.json() as Result; setResult(data); if (response.ok && (data.imageBase64 || data.images?.length)) await persistResults(data); }
    catch { setResult({ error: "The AI request could not be completed." }); }
    finally { setWorking(false); setTurnstileReset((value) => value + 1); }
  }

  async function downloadActive() {
    if (!activeImage) return;
    try { await downloadTransformedImage({ imageBase64: activeImage.imageBase64, sourceMimeType: activeImage.mimeType || "image/jpeg", width: outputWidth, height: outputHeight, format: outputFormat, quality: quality / 100, filename }); }
    catch (error) { setResult({ error: error instanceof Error ? error.message : "Image export failed." }); }
  }

  function sendToPipeline(item?: GeneratedHistoryItem) { const target = item ?? history[0]; if (target) router.push(`/tools/pipeline?generated=${encodeURIComponent(target.id)}`); }
  function exportHistory() { downloadBlob(new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), images: history }, null, 2)], { type: "application/json" }), "kritiva-local-history.json"); }
  async function importHistory(file: File) {
    try { const input = JSON.parse(await file.text()) as { images?: GeneratedHistoryItem[] }; for (const item of input.images ?? []) if (item?.id && item.imageBase64 && item.mimeType && item.createdAt) await saveGeneratedImage(item); await refreshHistory(); }
    catch { setResult({ error: "The selected KRITIVA history file is invalid." }); }
  }

  return <section className="studio-section ai-section" id="ai-workshop">
    <div className="section-heading"><div><span className="eyebrow">PHASE 7 · CONTROLLED AI</span><h2>Generate, resize and continue locally.</h2></div><p>Hosted generation is protected and consent-gated. Output editing and history stay in this browser.</p></div>
    <div className="studio-shell ai-shell">
      <div className="ai-boundary"><span className="local-badge">LOCAL EDITING · NO UPLOAD</span><span className="ai-badge">AI GENERATION · EXPLICIT TRANSFER</span></div>
      <div className="ai-layout"><div className="ai-controls">
        <label className="field"><span>AI task</span><select value={tool} onChange={(event) => { setTool(event.target.value as typeof tool); setFiles({}); setResult(null); }}>{availableTools.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <div className="ai-files">{slots.map(([key, label]) => <label className="file-button" key={key}><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setFiles((old) => ({ ...old, [key]: event.target.files?.[0] || null }))} /><span>{files[key]?.name || label}</span></label>)}</div>
        <label className="field"><span>{tool === "text-to-3d" ? "3D model prompt · 77 characters maximum" : promptOnly ? "Image brief · 1,500 characters maximum" : "Instructions / reconstruction notes"}</span><textarea value={prompt} maxLength={tool === "text-to-3d" ? 77 : 1500} onChange={(event) => setPrompt(event.target.value)} placeholder={promptOnly ? "Describe the subject, composition, lighting, colours and intended use…" : "Describe the result, material, missing sides or edits…"} /></label>
        {hostedImageMode && <><label className="field"><span>Negative instructions · optional</span><input value={negativePrompt} maxLength={400} onChange={(event) => setNegativePrompt(event.target.value)} placeholder="Text, watermark, distorted hands…" /></label>
          <label className="field"><span>Generation dimensions</span><select value={sizePreset} onChange={(event) => chooseSize(event.target.value)}>{generationSizes.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
          <div className="field-row"><label className="field"><span>Width · pixels</span><input type="number" min="256" max="1920" step="16" value={width} onChange={(event) => { setSizePreset("custom"); setWidth(Number(event.target.value)); }} /></label><label className="field"><span>Height · pixels</span><input type="number" min="256" max="1920" step="16" value={height} onChange={(event) => { setSizePreset("custom"); setHeight(Number(event.target.value)); }} /></label></div>
          <div className="field-row"><label className="field"><span>Variations</span><select value={variations} onChange={(event) => setVariations(Number(event.target.value))}>{[1, 2, 3, 4].map((value) => <option key={value}>{value}</option>)}</select></label><label className="field"><span>Seed · optional</span><input type="number" min="0" max="2147483647" value={seed} onChange={(event) => setSeed(event.target.value)} placeholder="Random" /></label></div></>}
        <label className="consent-row"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>{status?.local ? "I understand this request is sent only to the connector on this computer." : <>I consent to sending only this request to <strong>{status?.provider || "the configured provider"}</strong>.</>}</span></label>
        {status?.turnstileSiteKey && <TurnstileWidget siteKey={status.turnstileSiteKey} resetKey={turnstileReset} onToken={handleTurnstile} nonce={nonce} />}
        <button className="primary-button full" disabled={!status?.configured || !consent || !sourceReady || working || Boolean(status?.turnstileRequired && !turnstileToken)} onClick={submit}>{working ? "Generating…" : tool === "image-generation" ? `Generate ${variations > 1 ? `${variations} images` : "image"}` : tool === "image-to-3d" ? "Reconstruct 3D model" : tool === "text-to-3d" ? "Generate prototype GLB" : "Create with AI"}</button>
      </div><div className="ai-disclosure">
        <span className={status?.configured ? "provider-state ready" : "provider-state"}>{status?.configured ? "Provider ready" : "Provider not configured"}</span><h3>{tool === "image-generation" ? "Prompt → editable production asset" : tool === "image-to-3d" ? "Photograph → textured GLB" : tools.find(([value]) => value === tool)?.[1]}</h3><p>{status?.transferNotice || "Checking the configured processing boundary…"}</p>
        <dl><div><dt>Provider</dt><dd>{status?.provider || "Checking…"}</dd></div><div><dt>Daily ceiling</dt><dd>{status?.dailyLimit ? `${status.dailyLimit} images · best effort` : "Checking…"}</dd></div><div><dt>Training policy</dt><dd>{status?.training || "Checking…"}</dd></div></dl>
        {status?.turnstileRequired && !status.turnstileConfigured && <div className="notice">AI is intentionally locked until both Turnstile keys are configured.</div>}{!status?.configured && <div className="notice">AI remains disabled until the deployment owner completes provider and protection configuration.</div>}
        {result && <div className="ai-result"><strong>{result.error ? "Request failed" : `Status: ${result.status || "succeeded"}`}</strong><p>{result.error || result.message || "Your result is ready."}</p>
          {resultImages.length > 0 && <><div className="ai-image-grid">{resultImages.map((image, index) => <button type="button" className={selectedImage === index ? "selected" : ""} key={index} onClick={() => setSelectedImage(index)}><Image src={`data:${image.mimeType || "image/jpeg"};base64,${image.imageBase64}`} alt={`Generated variation ${index + 1}`} width={420} height={420} unoptimized /></button>)}</div>
            <div className="ai-export-controls"><div className="field-row"><label className="field"><span>Export width · px</span><input type="number" min="1" max="8192" value={outputWidth} onChange={(event) => setOutputWidth(Number(event.target.value))} /></label><label className="field"><span>Export height · px</span><input type="number" min="1" max="8192" value={outputHeight} onChange={(event) => setOutputHeight(Number(event.target.value))} /></label></div><div className="field-row"><label className="field"><span>Format</span><select value={outputFormat} onChange={(event) => setOutputFormat(event.target.value as RasterFormat)}><option value="image/webp">WebP</option><option value="image/png">PNG</option><option value="image/jpeg">JPEG</option></select></label><label className="field"><span>Quality · {quality}%</span><input type="range" min="40" max="100" value={quality} onChange={(event) => setQuality(Number(event.target.value))} /></label></div><label className="field"><span>Filename</span><input value={filename} onChange={(event) => setFilename(safeFilename(event.target.value || "kritiva-generated"))} /></label><div className="button-row"><button className="secondary-button" onClick={downloadActive}>Resize & download</button><button className="primary-button" onClick={() => sendToPipeline()}>Send latest to pipeline</button></div></div></>}
          {result.outputUrl && <a className="secondary-button" href={result.outputUrl} rel="noreferrer">Download result</a>}{result.artifactBase64 && <button className="secondary-button" onClick={() => downloadArtifact(result.artifactBase64!)}>Download GLB</button>}</div>}
      </div></div>
      <section className="local-history" aria-labelledby="history-title"><div className="history-heading"><div><span className="eyebrow">THIS DEVICE ONLY</span><h3 id="history-title">Local generation history</h3></div><div className="button-row"><input ref={importRef} hidden type="file" accept="application/json" onChange={(event) => { const file = event.target.files?.[0]; if (file) importHistory(file); event.currentTarget.value = ""; }} /><button className="secondary-button" onClick={() => importRef.current?.click()}>Import JSON</button><button className="secondary-button" disabled={!history.length} onClick={exportHistory}>Export JSON</button><button className="secondary-button danger" disabled={!history.length} onClick={async () => { await clearGeneratedImages(); await refreshHistory(); }}>Clear all</button></div></div>
        {history.length ? <div className="history-grid">{history.map((item) => <article key={item.id}><Image src={`data:${item.mimeType};base64,${item.imageBase64}`} alt="Locally saved generated asset" width={360} height={260} unoptimized /><div><strong>{item.width} × {item.height}</strong><p>{item.prompt.slice(0, 110)}</p><span>{new Date(item.createdAt).toLocaleString()}</span><div className="button-row"><button onClick={() => sendToPipeline(item)}>Pipeline</button><button onClick={async () => { await deleteGeneratedImage(item.id); await refreshHistory(); }}>Delete</button></div></div></article>)}</div> : <p className="empty-history">Nothing is stored yet. Generated images will appear here and remain only in this browser until you delete them.</p>}
      </section>
    </div>
  </section>;
}
