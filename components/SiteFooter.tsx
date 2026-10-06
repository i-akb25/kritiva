import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-main">
        <div>
          <div className="footer-brand">KRITIVA<span>.</span></div>
          <p>Project-aware asset production.<br />Private by default.</p>
        </div>
        <div className="footer-links">
          <div><strong>Product</strong><Link href="/#workspace">Workspace</Link><Link href="/#specifications">Specifications</Link></div>
          <div><strong>Legal</strong><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></div>
          <div><strong>Support</strong><a href="mailto:akbsupportinfo@gmail.com">akbsupportinfo@gmail.com</a><a href="https://github.com/i-akb25/kritiva" target="_blank" rel="noreferrer">GitHub repository</a></div>
        </div>
      </div>
      <div className="footer-bottom"><span>© {new Date().getFullYear()} KRITIVA by AKB</span><span>No accounts · No uploads · No tracking</span></div>
    </footer>
  );
}
