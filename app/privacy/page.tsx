import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = { title: "Privacy", description: "How KRITIVA protects your files and personal data." };

export default function PrivacyPage() {
  return <><SiteHeader /><main className="legal-page"><header><span className="eyebrow">PLAIN-LANGUAGE POLICY</span><h1>Privacy without fine-print theatre.</h1><p>Effective 6 October 2026</p></header><div className="legal-layout"><aside><strong>Quick answer</strong><p>KRITIVA does not require an account. Local tools keep files on your device. Optional AI tools transfer only selected files after explicit consent.</p></aside><article>
    <section><h2>1. Local tools</h2><p>When you select a file in a local studio, the application reads it in your browser to inspect, resize, re-encode, validate, optimize or package it. These tools do not send the selected file to KRITIVA’s server. Closing or refreshing the tab clears in-memory files and previews; saved custom presets remain in browser storage until you remove them.</p></section>
    <section><h2>2. Information we do not request</h2><p>We do not require your name, phone number, address, social profile, payment information or account credentials. Do not send confidential source files by email when requesting support.</p></section>
    <section><h2>3. Optional AI transfer</h2><p>AI tools are disabled unless the deployment configures a named provider. Before any transfer, KRITIVA displays the provider, declared retention and training policy and requires per-request consent. Selected source files and instructions are then proxied to that provider. The provider’s own policy governs its processing. Do not use AI tools for confidential material unless you have reviewed and accepted those terms.</p></section>
    <section><h2>4. Local browser and hosting data</h2><p>The current release does not use advertising cookies or analytics. Your browser, hosting provider and—only for an AI request—the configured AI provider may process ordinary technical request data such as IP address, user agent, requested URL and timestamps for security and delivery.</p></section>
    <section><h2>5. Metadata removal</h2><p>Raster images exported by local image tools are re-encoded using the browser canvas. This normally removes EXIF metadata. KRITIVA does not claim forensic sanitisation and cannot guarantee how every browser handles colour profiles or uncommon embedded data. Verify highly sensitive files independently.</p></section>
    <section><h2>6. External links</h2><p>Links to GitHub, email applications, generated provider downloads or other websites are governed by those services. Opening an external link leaves KRITIVA’s environment.</p></section>
    <section><h2>7. Children</h2><p>KRITIVA is a general technical utility and does not knowingly collect children’s personal data. Because no account is needed, users should avoid placing personal or identifying information into filenames intended for public projects.</p></section>
    <section><h2>8. Security and limitations</h2><p>We use restrictive browser permissions, file limits, server-side provider credentials and security headers. No web application can promise absolute security. Keep original assets backed up and review every generated file before publication.</p></section>
    <section><h2>9. Contact</h2><p>For privacy or security questions, email <a href="mailto:akbsupportinfo@gmail.com">akbsupportinfo@gmail.com</a>. Include only the information needed to understand the request and do not attach source assets.</p></section>
    <section><h2>10. Policy changes</h2><p>If KRITIVA later introduces analytics, accounts, cloud storage or a different provider, this policy must be updated before those features are enabled. Material changes will be identified by a new effective date.</p></section>
  </article></div></main><SiteFooter /></>;
}
