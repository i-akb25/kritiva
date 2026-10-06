import type { Metadata } from "next";
import { SvgBrandLab } from "@/components/SvgBrandLab";
import { ToolPage } from "@/components/ToolPage";

export const metadata: Metadata = { title: "SVG & Brand Lab", description: "Sanitize, optimize and generate safe variants of SVG brand assets locally." };
export default function SvgPage() { return <ToolPage><SvgBrandLab /></ToolPage>; }
