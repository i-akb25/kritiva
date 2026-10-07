import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = { title: "Terms", description: "Terms for using the KRITIVA browser-based asset utility." };

export default function TermsPage() {
  return <><SiteHeader /><main className="legal-page"><header><span className="eyebrow">TERMS OF USE</span><h1>A practical tool, with practical limits.</h1><p>Effective 7 October 2026</p></header><div className="legal-layout"><aside><strong>Essential rule</strong><p>Use only files you are authorized to process. Keep your originals and inspect generated assets before deploying them.</p></aside><article>
    <section><h2>1. Using KRITIVA</h2><p>You may use KRITIVA to inspect and prepare lawful assets that you own or are authorized to use. You must not use the service to infringe intellectual-property rights, distribute malware, evade security controls or process unlawful material.</p></section>
    <section><h2>2. Your files and rights</h2><p>You retain all rights in your source files and generated outputs. KRITIVA receives no ownership interest in them. You are responsible for confirming licences for fonts, logos, photographs and other third-party material.</p></section>
    <section><h2>3. Output accuracy</h2><p>Presets express recommended production targets, not universal platform requirements. Browser encoders and source assets vary. Validate dimensions, visual quality, accessibility, file weight and compatibility in the destination project.</p></section>
    <section><h2>4. AI and 3D limitations</h2><p>Optional AI tasks use a separately configured provider and can consume limited quotas or incur provider costs. You must consent before transfer. Generated images may contain errors or material resembling existing works. Reconstructed 3D geometry from one photograph contains estimated surfaces and may be inaccurate. Inspect every output and its intellectual-property implications before use.</p></section>
    <section><h2>5. Availability</h2><p>The service is provided as available and may change or be interrupted. There is no guarantee that every browser or configured provider supports every codec, file type or request. Keep independent backups because KRITIVA is not a storage service.</p></section>
    <section><h2>6. Liability</h2><p>To the maximum extent allowed by applicable law, KRITIVA and its maintainers are not liable for lost files, inaccurate generated geometry, provider failures, publication errors, incompatible outputs, licensing disputes or indirect losses resulting from use of the tool.</p></section>
    <section><h2>7. Changes and contact</h2><p>These terms may change as the product develops. Questions can be sent to <a href="mailto:akbsupportinfo@gmail.com">akbsupportinfo@gmail.com</a>.</p></section>
  </article></div></main><SiteFooter /></>;
}
