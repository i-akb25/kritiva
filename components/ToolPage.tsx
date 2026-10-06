import type { ReactNode } from "react";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

export function ToolPage({ children }: { children: ReactNode }) {
  return <><SiteHeader /><main className="tool-page">{children}</main><SiteFooter /></>;
}
