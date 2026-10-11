import Link from "next/link";
import Image from "next/image";

export default function OfflinePage() {
  return <main className="offline-page"><div><Image src="/kritiva-mark.svg" alt="" width={82} height={82} /><span className="eyebrow">OFFLINE</span><h1>KRITIVA is still available.</h1><p>Previously opened local tools can continue without a network connection. Hosted AI generation requires internet access.</p><Link className="primary-button" href="/tools/pipeline">Open production pipeline</Link></div></main>;
}
