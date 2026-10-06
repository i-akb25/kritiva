import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SpecificationLibrary, Workbench } from "@/components/Workbench";
import { ArrowIcon, CheckIcon, ShieldIcon, SparkIcon } from "@/components/icons";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="hero-kicker"><span /><p>PROJECT-AWARE ASSET PRODUCTION</p></div>
            <h1>Create once.<br /><em>Export everything.</em></h1>
            <p className="hero-lead">Turn source images into correctly sized, compressed and named website assets without sending your files anywhere.</p>
            <div className="hero-actions"><a href="#workspace" className="primary-button">Open the workspace <ArrowIcon /></a><a href="#specifications" className="text-link">Browse specifications</a></div>
            <div className="hero-proof"><span><ShieldIcon /> On-device processing</span><span><CheckIcon /> No account required</span><span><CheckIcon /> No tracking</span></div>
          </div>
          <div className="hero-visual" aria-label="Asset transformation preview">
            <div className="visual-orbit orbit-one" /><div className="visual-orbit orbit-two" />
            <div className="source-sheet"><span>SOURCE</span><div className="source-art"><i /><i /><i /></div><b>master-artwork.png</b><small>4096 × 4096 · 8.4 MB</small></div>
            <div className="process-node"><SparkIcon /><span>LOCAL</span></div>
            <div className="output-stack"><div className="output-sheet sheet-one"><span>WEBP</span><b>cover.webp</b><small>1600 × 1200 · 284 KB</small></div><div className="output-sheet sheet-two"><span>PNG</span><b>icon-512.png</b><small>512 × 512 · 148 KB</small></div><div className="output-sheet sheet-three"><span>SVG</span><b>brand-mark.svg</b><small>scalable · 12 KB</small></div></div>
          </div>
        </section>

        <section className="principles" aria-label="Product principles">
          <div><span>01</span><strong>Private by architecture</strong><p>Images are processed in your browser, not uploaded to our infrastructure.</p></div>
          <div><span>02</span><strong>Standards, not guesswork</strong><p>Every preset defines format, dimensions, naming and weight targets.</p></div>
          <div><span>03</span><strong>Ready for real projects</strong><p>Export individual files or complete icon packages with clear manifests.</p></div>
        </section>

        <Workbench />

        <section className="promise">
          <div className="promise-mark"><ShieldIcon /></div>
          <div><span className="eyebrow">THE PRIVACY PROMISE</span><h2>Your work is yours. It stays that way.</h2></div>
          <div className="promise-copy"><p>KRITIVA has no user accounts, cloud library or hidden upload endpoint. Processing runs locally whenever browser technology makes it possible.</p><a href="/privacy">Read the plain-language privacy policy <ArrowIcon /></a></div>
        </section>

        <SpecificationLibrary />

        <section className="closing-cta">
          <span className="eyebrow">LESS REPETITION. BETTER OUTPUT.</span>
          <h2>Give every project the assets it actually needs.</h2>
          <a href="#workspace" className="primary-button">Prepare your first asset <ArrowIcon /></a>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
