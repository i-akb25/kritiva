import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = { title: "Privacy", description: "How KRITIVA protects your files and personal data." };

export default function PrivacyPage() {
  return <><SiteHeader /><main className="legal-page"><header><span className="eyebrow">PLAIN-LANGUAGE POLICY</span><h1>Privacy without fine-print theatre.</h1><p>Effective 6 October 2026</p></header><div className="legal-layout"><aside><strong>Quick answer</strong><p>KRITIVA does not require an account. Files used in the current browser tools are processed on your device and are not intentionally transmitted to us.</p></aside><article>
    <section><h2>1. What KRITIVA processes</h2><p>When you select a file, the application reads it in your browser to inspect, resize, re-encode, validate or package it. The current product has no file-upload API and no cloud asset library. Closing or refreshing the tab clears in-memory files and previews.</p></section>
    <section><h2>2. Information we do not request</h2><p>We do not require your name, phone number, address, social profile, payment information or account credentials. Do not send confidential source files by email when requesting support.</p></section>
    <section><h2>3. Local browser data</h2><p>The current release does not use advertising cookies or analytics. Your browser and hosting provider may still process ordinary technical request data such as IP address, user agent, requested URL and timestamps for security and delivery. That infrastructure data is controlled by the relevant hosting provider and should be retained only as operationally necessary.</p></section>
    <section><h2>4. Metadata removal</h2><p>Raster images exported by the image preparation tool are re-encoded using the browser canvas. This normally removes EXIF metadata. KRITIVA does not claim forensic sanitisation and cannot guarantee how every browser handles colour profiles or uncommon embedded data. Verify highly sensitive files independently.</p></section>
    <section><h2>5. External links</h2><p>Links to GitHub, email applications or other websites are governed by those services. Opening an external link leaves KRITIVA’s environment.</p></section>
    <section><h2>6. Children</h2><p>KRITIVA is a general technical utility and does not knowingly collect children’s personal data. Because no account is needed, users should avoid placing personal or identifying information into filenames intended for public projects.</p></section>
    <section><h2>7. Security and limitations</h2><p>We use restrictive browser permissions and security headers. No web application can promise absolute security. Keep original assets backed up and review every generated file before publication.</p></section>
    <section><h2>8. Contact</h2><p>For privacy or security questions, email <a href="mailto:akbsupportinfo@gmail.com">akbsupportinfo@gmail.com</a>. Include only the information needed to understand the request.</p></section>
    <section><h2>9. Policy changes</h2><p>If KRITIVA later introduces analytics, server-side processing, accounts or cloud storage, this policy must be updated before those features are enabled. Material changes will be identified by a new effective date.</p></section>
  </article></div></main><SiteFooter /></>;
}
