"use client";

import { useEffect, useState } from "react";

const tools = [
  ["background-removal", "Background removal"], ["upscale", "Image upscaling"],
  ["object-removal", "Object removal"], ["background-generation", "Background generation"],
  ["illustration-variants", "Illustration variants"], ["icon-concepts", "Icon concepts"],
  ["image-to-3d", "2D image to 3D model"],
] as const;

type Status = { configured: boolean; provider: string; retention: string; training: string; transferNotice: string };
type Result = { status?: string; jobId?: string; outputUrl?: string; message?: string; error?: string };

export function AiWorkshop() {
  const [tool, setTool] = useState<(typeof tools)[number][0]>("image-to-3d");
  const [status, setStatus] = useState<Status | null>(null);
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [prompt, setPrompt] = useState("");
  const [consent, setConsent] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [working, setWorking] = useState(false);

  useEffect(() => { fetch("/api/ai/status").then((response) => response.json()).then(setStatus).catch(() => setStatus(null)); }, []);
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

  const slots = tool === "image-to-3d" ? [["front", "Front view · required"], ["left", "Left view · optional"], ["right", "Right view · optional"], ["rear", "Rear view · optional"], ["top", "Top view · optional"]] : [["source", "Source image · required"]];

  async function submit() {
    if (!files[tool === "image-to-3d" ? "front" : "source"] || !consent || !status?.configured) return;
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
          <label className="field"><span>AI task</span><select value={tool} onChange={(event) => { setTool(event.target.value as typeof tool); setFiles({}); setResult(null); }}>{tools.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <div className="ai-files">{slots.map(([key, label]) => <label className="file-button" key={key}><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setFiles((old) => ({ ...old, [key]: event.target.files?.[0] || null }))} /><span>{files[key]?.name || label}</span></label>)}</div>
          <label className="field"><span>Instructions / reconstruction notes</span><textarea value={prompt} maxLength={1500} onChange={(event) => setPrompt(event.target.value)} placeholder="Describe the result, material, missing sides or edits…" /></label>
          <label className="consent-row"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>I consent to sending only the selected files to <strong>{status?.provider || "the configured provider"}</strong> for this request.</span></label>
          <button className="primary-button full" disabled={!status?.configured || !consent || !files[tool === "image-to-3d" ? "front" : "source"] || working} onClick={submit}>{working ? "Starting…" : tool === "image-to-3d" ? "Reconstruct 3D model" : "Start AI task"}</button>
        </div>
        <div className="ai-disclosure">
          <span className={status?.configured ? "provider-state ready" : "provider-state"}>{status?.configured ? "Provider ready" : "Provider not configured"}</span>
          <h3>{tool === "image-to-3d" ? "Photographs → textured GLB" : tools.find(([value]) => value === tool)?.[1]}</h3>
          <p>{tool === "image-to-3d" ? "A single photograph requires the AI to estimate unseen geometry. Add side, rear and top views for a more accurate model." : "The source is processed by the configured provider and the result is returned to this session."}</p>
          <dl><div><dt>Provider</dt><dd>{status?.provider || "Checking…"}</dd></div><div><dt>Retention</dt><dd>{status?.retention || "Checking…"}</dd></div><div><dt>Training policy</dt><dd>{status?.training || "Checking…"}</dd></div></dl>
          {!status?.configured && <div className="notice">AI remains disabled until the deployment owner names and configures a compatible provider. No upload is attempted.</div>}
          {result && <div className="ai-result"><strong>{result.error ? "Request failed" : `Status: ${result.status}`}</strong><p>{result.error || result.message || (result.status === "succeeded" ? "Your result is ready." : "The provider is processing your request.")}</p>{result.outputUrl && <a className="secondary-button" href={result.outputUrl} rel="noreferrer">Download result</a>}</div>}
        </div>
      </div>
    </div>
  </section>;
}
