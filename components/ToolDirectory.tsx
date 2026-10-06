import Link from "next/link";

const tools = [
  { href: "/tools/pipeline", phase: "PHASE 2", title: "Production pipeline", description: "Batch processing, target-size optimization, crop controls, recipes, presets and project packages.", mode: "Local" },
  { href: "/tools/svg", phase: "PHASE 3", title: "SVG & brand lab", description: "Sanitize SVG files, tighten viewBox values, recolor variants and generate safe React components.", mode: "Local" },
  { href: "/tools/composer", phase: "PHASE 4", title: "Composition studio", description: "Create Open Graph images, covers, social banners and screenshot frames at exact dimensions.", mode: "Local" },
  { href: "/tools/auditor", phase: "PHASE 5", title: "Asset auditor", description: "Inspect a project ZIP or permitted folder for missing, invalid, duplicate and privacy-sensitive assets.", mode: "Local" },
  { href: "/tools/3d", phase: "3D LAB", title: "GLB model lab", description: "Preview, validate, simplify and package glTF 2.0 binary models without uploading them.", mode: "Local" },
  { href: "/tools/ai", phase: "PHASE 6", title: "Optional AI workshop", description: "Consent-gated image tasks and multi-view 2D image to textured GLB reconstruction.", mode: "Provider" },
] as const;

export function ToolDirectory() {
  return <section className="studio-section tool-directory" id="tools" aria-labelledby="tools-title">
    <div className="section-heading"><div><span className="eyebrow">PRODUCTION SUITE</span><h2 id="tools-title">Choose the tool you need.</h2></div><p>Each studio runs on its own page so mobile devices do not download the 3D engine and every editor at once.</p></div>
    <div className="tool-card-grid">{tools.map((tool) => <Link key={tool.href} href={tool.href} className="tool-card"><div><span>{tool.phase}</span><b className={tool.mode === "Local" ? "local" : "provider"}>{tool.mode}</b></div><h3>{tool.title}</h3><p>{tool.description}</p><strong>Open studio <span aria-hidden="true">→</span></strong></Link>)}</div>
  </section>;
}
