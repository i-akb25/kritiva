"use client";

import JSZip from "jszip";
import { useEffect, useRef, useState } from "react";
import type { AnimationMixer, Object3D, PerspectiveCamera, Scene, Vector3, WebGLRenderer } from "three";
import { WebIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { center, dedup, flatten, prune, quantize, reorder, simplify, weld } from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";
import { bytesToSize, downloadBlob, safeFilename } from "@/lib/asset-utils";
import { DownloadIcon, ShieldIcon, UploadIcon } from "./icons";

type ModelStats = { triangles: number; meshes: number; materials: number; textures: number; animations: number; dimensions: [number, number, number]; extensions: string[]; warnings: string[] };
const emptyStats: ModelStats = { triangles: 0, meshes: 0, materials: 0, textures: 0, animations: 0, dimensions: [0, 0, 0], extensions: [], warnings: [] };

const inspectGlbContainer = (buffer: ArrayBuffer) => {
  const view = new DataView(buffer);
  if (buffer.byteLength < 20 || view.getUint32(0, true) !== 0x46546c67) throw new Error("This file is not a valid binary glTF container.");
  const version = view.getUint32(4, true); if (version !== 2) throw new Error(`Unsupported glTF version ${version}; KRITIVA requires glTF 2.0.`);
  if (view.getUint32(8, true) !== buffer.byteLength) throw new Error("The GLB header length does not match the file size.");
  const jsonLength = view.getUint32(12, true); const jsonType = view.getUint32(16, true);
  if (jsonType !== 0x4e4f534a || 20 + jsonLength > buffer.byteLength) throw new Error("The GLB JSON chunk is invalid.");
  const json = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, jsonLength)).replace(/\0+$/g, ""));
  return { extensions: [...(json.extensionsUsed ?? [])] as string[], required: [...(json.extensionsRequired ?? [])] as string[] };
};

export function ThreeDModelLab() {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<Scene | null>(null);
  const modelRef = useRef<Object3D | null>(null);
  const rendererRef = useRef<WebGLRenderer | null>(null);
  const cameraRef = useRef<PerspectiveCamera | null>(null);
  const mixerRef = useRef<AnimationMixer | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [buffer, setBuffer] = useState<ArrayBuffer | null>(null);
  const [stats, setStats] = useState<ModelStats>(emptyStats);
  const [background, setBackground] = useState("#e8dfd0");
  const [transparent, setTransparent] = useState(false);
  const [wireframe, setWireframe] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [ratio, setRatio] = useState(.65);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [optimized, setOptimized] = useState<{ blob: Blob; before: number; after: number } | null>(null);
  const [poster, setPoster] = useState<Blob | null>(null);

  useEffect(() => {
    const renderer = rendererRef.current;
    if (renderer) renderer.setClearColor(background, transparent ? 0 : 1);
  }, [background, transparent]);
  useEffect(() => {
    modelRef.current?.traverse((object) => {
      const mesh = object as Object3D & { isMesh?: boolean; material?: { wireframe?: boolean } | Array<{ wireframe?: boolean }> };
      if (!mesh.isMesh || !mesh.material) return;
      (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((material) => { material.wireframe = wireframe; });
    });
  }, [wireframe]);
  useEffect(() => { if (mixerRef.current) { if (playing) mixerRef.current.timeScale = 1; else mixerRef.current.timeScale = 0; } }, [playing]);

  useEffect(() => {
    if (!buffer || !mountRef.current) return;
    let disposed = false; let frame = 0; let controls: { enableDamping: boolean; target: { copy: (value: Vector3) => unknown }; update: () => void; dispose: () => void } | null = null;
    const mount = mountRef.current;
    const initialize = async () => {
      const THREE = await import("three");
      const [{ GLTFLoader }, { OrbitControls }] = await Promise.all([import("three/examples/jsm/loaders/GLTFLoader.js"), import("three/examples/jsm/controls/OrbitControls.js")]);
      if (disposed) return;
      mount.innerHTML = "";
      const scene = new THREE.Scene(); const camera = new THREE.PerspectiveCamera(42, Math.max(1, mount.clientWidth) / Math.max(1, mount.clientHeight), .01, 10_000);
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio)); renderer.setSize(Math.max(1, mount.clientWidth), Math.max(1, mount.clientHeight)); renderer.setClearColor(background, transparent ? 0 : 1); renderer.outputColorSpace = THREE.SRGBColorSpace;
      mount.append(renderer.domElement); scene.add(new THREE.HemisphereLight(0xffffff, 0x5b645e, 2.4));
      const key = new THREE.DirectionalLight(0xffffff, 2.7); key.position.set(3, 4, 5); scene.add(key);
      controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true;
      const loader = new GLTFLoader();
      loader.parse(buffer.slice(0), "", (gltf) => {
        if (disposed) return;
        scene.add(gltf.scene); modelRef.current = gltf.scene;
        const box = new THREE.Box3().setFromObject(gltf.scene); const size = box.getSize(new THREE.Vector3()); const centerPoint = box.getCenter(new THREE.Vector3());
        const max = Math.max(size.x, size.y, size.z, .01); camera.position.set(centerPoint.x + max * 1.7, centerPoint.y + max * 1.1, centerPoint.z + max * 1.7); camera.near = max / 1000; camera.far = max * 1000; camera.updateProjectionMatrix(); controls!.target.copy(centerPoint); controls!.update();
        let triangles = 0; let meshes = 0; const materials = new Set<unknown>(); const textures = new Set<unknown>();
        gltf.scene.traverse((object) => {
          const mesh = object as typeof object & { isMesh?: boolean; geometry?: { index?: { count: number }; attributes?: { position?: { count: number } } }; material?: Record<string, unknown> | Array<Record<string, unknown>> };
          if (!mesh.isMesh || !mesh.geometry) return; meshes += 1; triangles += Math.floor((mesh.geometry.index?.count ?? mesh.geometry.attributes?.position?.count ?? 0) / 3);
          (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).filter(Boolean).forEach((material) => { materials.add(material); Object.values(material!).forEach((value) => { if (value && typeof value === "object" && "isTexture" in value) textures.add(value); }); });
        });
        const container = inspectGlbContainer(buffer);
        const warnings: string[] = [];
        if (file && file.size > 5_000_000) warnings.push("Model exceeds the recommended 5 MB maximum.");
        if (triangles > 100_000) warnings.push("Triangle count exceeds the recommended 100,000 website target.");
        if (Math.abs(centerPoint.x) > max || Math.abs(centerPoint.y) > max || Math.abs(centerPoint.z) > max) warnings.push("Model appears far from the scene origin.");
        const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
        if (memory && memory <= 4 && triangles > 75_000) warnings.push("This model may be heavy for low-memory mobile devices.");
        setStats({ triangles, meshes, materials: materials.size, textures: textures.size, animations: gltf.animations.length, dimensions: [size.x, size.y, size.z], extensions: container.extensions, warnings });
        if (gltf.animations.length) { const mixer = new THREE.AnimationMixer(gltf.scene); gltf.animations.forEach((clip) => mixer.clipAction(clip).play()); mixerRef.current = mixer; }
      }, (error) => setMessage(error instanceof Error ? error.message : "The model could not be decoded."));
      const clock = new THREE.Clock();
      const draw = () => { if (disposed) return; frame = requestAnimationFrame(draw); const delta = clock.getDelta(); mixerRef.current?.update(delta); controls?.update(); renderer.render(scene, camera); };
      draw();
      const resize = new ResizeObserver(() => { const width = Math.max(1, mount.clientWidth); const height = Math.max(1, mount.clientHeight); camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height); }); resize.observe(mount);
      sceneRef.current = scene; rendererRef.current = renderer; cameraRef.current = camera;
      return () => resize.disconnect();
    };
    let cleanupResize: (() => void) | undefined; initialize().then((value) => { cleanupResize = value; });
    return () => { disposed = true; cancelAnimationFrame(frame); cleanupResize?.(); controls?.dispose(); mixerRef.current?.stopAllAction(); mixerRef.current = null; rendererRef.current?.dispose(); rendererRef.current?.domElement.remove(); sceneRef.current = null; modelRef.current = null; };
  }, [buffer]); // eslint-disable-line react-hooks/exhaustive-deps

  const receive = async (selected: File) => {
    if (!selected.name.toLowerCase().endsWith(".glb") || selected.size > 100_000_000) { setMessage("Choose a GLB smaller than 100 MB."); return; }
    try { const data = await selected.arrayBuffer(); inspectGlbContainer(data); setFile(selected); setBuffer(data); setOptimized(null); setPoster(null); setMessage(null); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Invalid GLB file."); }
  };

  const optimize = async () => {
    if (!buffer || !file) return; setBusy(true); setMessage(null);
    try {
      await Promise.all([MeshoptEncoder.ready, MeshoptSimplifier.ready]);
      const io = new WebIO().registerExtensions(ALL_EXTENSIONS);
      const document = await io.readBinary(new Uint8Array(buffer));
      await document.transform(center(), dedup(), flatten(), weld(), simplify({ simplifier: MeshoptSimplifier, ratio, error: .001 }), reorder({ encoder: MeshoptEncoder }), prune(), quantize());
      const bytes = await io.writeBinary(document); const blob = new Blob([bytes as BlobPart], { type: "model/gltf-binary" });
      setOptimized({ blob, before: file.size, after: blob.size }); setMessage(blob.size < file.size ? "Optimization completed. Review the model visually before publishing." : "Structural optimization completed, but this model did not become smaller.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "This model uses features the browser optimizer could not preserve safely."); }
    setBusy(false);
  };

  const capturePoster = async () => {
    const canvas = rendererRef.current?.domElement; if (!canvas) return;
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", .9));
    if (blob) { setPoster(blob); downloadBlob(blob, `${safeFilename(file?.name ?? "model").replace(/\.glb$/i, "")}-poster.webp`); }
  };

  const exportPackage = async () => {
    if (!file) return; const base = safeFilename(file.name).replace(/\.glb$/i, ""); const zip = new JSZip();
    zip.file(`${base}/${base}.glb`, optimized?.blob ?? file); if (poster) zip.file(`${base}/poster.webp`, poster);
    zip.file(`${base}/model-metadata.json`, JSON.stringify({ filename: `${base}.glb`, generatedAt: new Date().toISOString(), bytes: optimized?.after ?? file.size, ...stats }, null, 2));
    zip.file(`${base}/optimization-report.json`, JSON.stringify({ originalBytes: file.size, optimizedBytes: optimized?.after ?? null, ratioRequested: ratio, structuralTransforms: ["center", "dedup", "flatten", "weld", "simplify", "reorder", "prune", "quantize"] }, null, 2));
    zip.file(`${base}/usage-snippet.tsx`, `import { useGLTF } from "@react-three/drei";\n\nexport function Model(props: JSX.IntrinsicElements["group"]) {\n  const { scene } = useGLTF("/${base}.glb");\n  return <primitive object={scene} {...props} />;\n}\n\nuseGLTF.preload("/${base}.glb");\n`);
    downloadBlob(await zip.generateAsync({ type: "blob", compression: "DEFLATE" }), `${base}-web-package.zip`);
  };

  return <section className="studio-section" id="3d-lab" aria-labelledby="three-title"><div className="section-heading"><div><span className="eyebrow">3D MODEL LAB · LOCAL</span><h2 id="three-title">Inspect the model, not just the file size.</h2></div><p>Preview, validate, simplify and package existing glTF 2.0 binary models without uploading them.</p></div><div className="studio-shell model-shell"><div className="model-controls"><label className="file-button"><UploadIcon /><span><strong>{file?.name ?? "Upload a GLB model"}</strong><small>glTF 2.0 binary · maximum 100 MB</small></span><input type="file" accept="model/gltf-binary,.glb" onChange={(event) => { const selected = event.target.files?.[0]; if (selected) receive(selected); }} /></label>{message && <div className="notice"><ShieldIcon />{message}</div>}<div className="model-options"><label><span>Background</span><input type="color" value={background} onChange={(event) => setBackground(event.target.value)} /></label><label><input type="checkbox" checked={transparent} onChange={(event) => setTransparent(event.target.checked)} /> Transparent</label><label><input type="checkbox" checked={wireframe} onChange={(event) => setWireframe(event.target.checked)} /> Wireframe</label><label><input type="checkbox" checked={playing} onChange={(event) => setPlaying(event.target.checked)} /> Play animations</label></div><label className="field"><span>Keep approximately {Math.round(ratio * 100)}% of vertices</span><input type="range" min=".2" max="1" step=".05" value={ratio} onChange={(event) => setRatio(Number(event.target.value))} /></label><button className="primary-button full" disabled={!file || busy} onClick={optimize}>{busy ? "Optimizing locally…" : "Optimize GLB"}</button><div className="button-pair"><button className="secondary-button" disabled={!file} onClick={capturePoster}>Generate poster</button><button className="secondary-button" disabled={!file} onClick={exportPackage}><DownloadIcon /> Export package</button></div>{optimized && <div className="size-comparison"><span><small>ORIGINAL</small><strong>{bytesToSize(optimized.before)}</strong></span><b>→</b><span><small>OPTIMIZED</small><strong>{bytesToSize(optimized.after)}</strong></span><em>{((1 - optimized.after / optimized.before) * 100).toFixed(1)}%</em></div>}</div><div className="model-view"><div ref={mountRef} className="model-canvas">{!buffer && <div className="studio-empty"><UploadIcon /><p>Upload a GLB to activate the interactive viewer.</p></div>}</div><div className="model-stats"><div><span>TRIANGLES</span><strong>{stats.triangles.toLocaleString()}</strong></div><div><span>MESHES</span><strong>{stats.meshes}</strong></div><div><span>MATERIALS</span><strong>{stats.materials}</strong></div><div><span>TEXTURES</span><strong>{stats.textures}</strong></div><div><span>ANIMATIONS</span><strong>{stats.animations}</strong></div><div><span>BOUNDS</span><strong>{stats.dimensions.map((value) => value.toFixed(2)).join(" × ")}</strong></div></div>{stats.warnings.length > 0 && <div className="model-warnings">{stats.warnings.map((warning) => <p key={warning}>! {warning}</p>)}</div>}</div></div></section>;
}
