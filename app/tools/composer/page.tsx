import type { Metadata } from "next";
import { CompositionStudio } from "@/components/CompositionStudio";
import { ToolPage } from "@/components/ToolPage";

export const metadata: Metadata = { title: "Composition Studio", description: "Build exact-size project covers, Open Graph images and social assets locally." };
export default function ComposerPage() { return <ToolPage><CompositionStudio /></ToolPage>; }
