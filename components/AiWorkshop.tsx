"use client";

import { useEffect, useState } from "react";

const tools = [
  ["background-removal", "Background removal"], ["upscale", "Image upscaling"],
  ["object-removal", "Object removal"], ["background-generation", "Background generation"],
  ["illustration-variants", "Illustration variants"], ["icon-concepts", "Icon concepts"],
  ["image-to-3d", "2D image to 3D model"],
  ["text-to-3d", "Text to 3D prototype"],
] as const;

type Status = { configured: boolean; provider: string; retention: string; training: string; transferNotice: string; mode: string; capabilities: string[]; developmentOnly: boolean; local: boolean };
type Result = { status?: string; jobId?: string; outputUrl?: string; artifactBase64?: string; mimeType?: string; message?: string; error?: string };

function downloadArtifact(base64: string) {
  const binary = window.atob(base64);
  const chunks: ArrayBuffer[] = [];
  for (let offset = 0; offset < binary.length; offset += 64 * 1024) {
    const part = binary.slice(offset, offset + 64 * 1024);
    const bytes = new Uint8Array(part.length);
    for (let index = 0; index < part.length; index += 1) bytes[index] = part.charCodeAt(index);
    chunks.push(bytes.buffer);
  }
  const url = URL.createObjectURL(new Blob(chunks, { type: "model/gltf-binary" }));
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = "kritiva-model.glb"; anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function AiWorkshop() {
  const [tool, setTool] = useState<(typeof tools)[number][0]>("image-to-3d");
  const [status, setStatus] = useState<Status | null>(null);
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [prompt, setPrompt] = useState("");
  const [consent, setConsent] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    fetch("/api/ai/status").then((response) => response.json()).then((nextStatus: Status) => {
      setStatus(nextStatus);
      setTool((current) => nextStatus.capabilities?.includes(current) ? current : nextStatus.capabilities[0] as (typeof tools)[number][0]);
    }).catch(() => setStatus(null));
  }, []);
  useEffect(() => {
    if (!result?.jobId || !["queued", "processing"].includes(result.status || "")) return;
    const timer = window.setInterval(async () => {
      const response = await fetch(`/api/ai/jobs/${encodeURIComponent(result.jobId!)}`);
      const update = await response.json();
      setResult(update);
      if (!["queued", "processing"].includes(update.status)) window.clearInterval(timer);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [result?.jobId, result?.status]);

  const availableTools = status?.capabilities?.length ? tools.filter(([value]) => status.capabilities.includes(value)) : tools;
  const slots = tool === "text-to-3d" ? [] : tool === "image-to-3d" ? status?.local ? [["front", "Front view · required"]] : [["front", "Front view · required"], ["left", "Left view · optional"], ["right", "Right view · optional"], ["rear", "Rear view · optional"], ["top", "Top view · optional"]] : [["source", "Source image · required"]];
  const sourceReady = tool === "text-to-3d" ? Boolean(prompt.trim()) : Boolean(files[tool === "image-to-3d" ? "front" : "source"]);

  async function submit() {
    if (!sourceReady || !consent || !status?.configured) return;
    setWorking(true); setResult(null);
    const body = new FormData(); body.set("task", tool); body.set("consent", "explicit"); body.set("prompt", prompt);
    Object.entries(files).forEach(([key, file]) => { if (file) body.set(key, file); });
    try {
      const response = await fetch("/api/ai/generate", { method: "POST", body });
      setResult(await response.json());
    } catch { setResult({ error: "The AI request could not be completed." }); }
    finally { setWorking(false); }
  }

  return <section className="studio-section ai-section" id="ai-workshop">
    <div className="section-heading"><div><span className="eyebrow">PHASE 6 · OPTIONAL AI</span><h2>AI only when you choose it.</h2></div><p>These tasks transfer selected files to a named GPU provider. They are kept separate from KRITIVA’s private local tools.</p></div>
    <div className="studio-shell ai-shell">
      <div className="ai-boundary"><span className="local-badge">LOCAL TOOLS · NO UPLOAD</span><span className="ai-badge">AI TOOLS · EXPLICIT TRANSFER</span></div>
      <div className="ai-layout">
        <div className="ai-controls">
          <label className="field"><span>AI task</span><select value={tool} onChange={(event) => { setTool(event.target.value as typeof tool); setFiles({}); setResult(null); }}>{availableTools.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <div className="ai-files">{slots.map(([key, label]) => <label className="file-button" key={key}><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setFiles((old) => ({ ...old, [key]: event.target.files?.[0] || null }))} /><span>{files[key]?.name || label}</span></label>)}</div>
          <label className="field"><span>{tool === "text-to-3d" ? "3D model prompt · 77 characters maximum" : "Instructions / reconstruction notes"}</span><textarea value={prompt} maxLength={tool === "text-to-3d" ? 77 : 1500} onChange={(event) => setPrompt(event.target.value)} placeholder={tool === "text-to-3d" ? "A compact orange industrial robot with four legs" : "Describe the result, material, missing sides or edits…"} /></label>
          <label className="consent-row"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>{status?.local ? "I understand this request is sent only to the connector on this computer." : <>I consent to sending only this request to <strong>{status?.provider || "the configured provider"}</strong>.</>}</span></label>
          <button className="primary-button full" disabled={!status?.configured || !consent || !sourceReady || working} onClick={submit}>{working ? "Starting…" : tool === "image-to-3d" ? "Reconstruct 3D model" : tool === "text-to-3d" ? "Generate prototype GLB" : "Start AI task"}</button>
        </div>
        <div className="ai-disclosure">
          <span className={status?.configured ? "provider-state ready" : "provider-state"}>{status?.configured ? "Provider ready" : "Provider not configured"}</span>
          <h3>{tool === "image-to-3d" ? "Photographs → textured GLB" : tool === "text-to-3d" ? "Prompt → experimental GLB" : tools.find(([value]) => value === tool)?.[1]}</h3>
          <p>{tool === "image-to-3d" ? status?.local ? "The local connector currently uses one front image. SF3D estimates every unseen surface, so inspect the resulting geometry before use." : "A single photograph requires the AI to estimate unseen geometry. Add side, rear and top views for a more accurate model." : tool === "text-to-3d" ? "NVIDIA’s hosted TRELLIS trial is for temporary personal prototyping. Availability, limits and terms can change without notice." : "The source is processed by the configured provider and the result is returned to this session."}</p>
          <dl><div><dt>Provider</dt><dd>{status?.provider || "Checking…"}</dd></div><div><dt>Retention</dt><dd>{status?.retention || "Checking…"}</dd></div><div><dt>Training policy</dt><dd>{status?.training || "Checking…"}</dd></div></dl>
          {!status?.configured && <div className="notice">AI remains disabled until the deployment owner names and configures a compatible provider. No upload is attempted.</div>}
          {status?.developmentOnly && <div className="notice">Development only · never depend on this trial endpoint for production.</div>}
          {status?.mode === "nvidia-prototype" && <div className="notice">The hosted trial currently rejects personal image uploads. Use text-to-3D here; image-to-3D requires Local Compute mode.</div>}
          <div className="notice"><strong>Local compute choices</strong><p>NVIDIA: TRELLIS NIM or SF3D CUDA · Apple Silicon: experimental SF3D MPS · Intel and AMD: SF3D CPU fallback. The local connector must be installed on that computer.</p></div>
          {result && <div className="ai-result"><strong>{result.error ? "Request failed" : `Status: ${result.status}`}</strong><p>{result.error || result.message || (result.status === "succeeded" ? "Your result is ready." : "The provider is processing your request.")}</p>{result.outputUrl && <a className="secondary-button" href={result.outputUrl} rel="noreferrer">Download result</a>}{result.artifactBase64 && <button className="secondary-button" onClick={() => downloadArtifact(result.artifactBase64!)}>Download GLB</button>}</div>}
        </div>
      </div>
    </div>
  </section>;
}
