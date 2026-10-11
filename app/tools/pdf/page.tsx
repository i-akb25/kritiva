import type { Metadata } from "next";
import { PdfStudio } from "@/components/PdfStudio";
import { ToolPage } from "@/components/ToolPage";

export const metadata: Metadata = { title: "Local PDF Studio", description: "Add text, visual replacements, images and clickable links to PDF pages locally without DOCX conversion." };
export default function PdfPage() { return <ToolPage><PdfStudio /></ToolPage>; }
