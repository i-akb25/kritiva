"use client";

import Link from "next/link";
import { useState } from "react";
import { CloseIcon, MenuIcon } from "./icons";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link href="/" className="brand" aria-label="KRITIVA home">
          <span className="brand-mark" aria-hidden="true">K</span>
          <span>KRITIVA</span>
        </Link>
        <button className="menu-button" type="button" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          {open ? <CloseIcon /> : <MenuIcon />}
        </button>
        <nav className={open ? "main-nav is-open" : "main-nav"} aria-label="Main navigation">
          <Link href="/#workspace" onClick={() => setOpen(false)}>Workspace</Link>
          <Link href="/#tools" onClick={() => setOpen(false)}>Tools</Link>
          <Link href="/tools/3d" onClick={() => setOpen(false)}>3D Lab</Link>
          <Link href="/privacy" onClick={() => setOpen(false)}>Privacy</Link>
          <a className="nav-cta" href="#workspace" onClick={() => setOpen(false)}>Prepare an asset</a>
        </nav>
      </div>
    </header>
  );
}
