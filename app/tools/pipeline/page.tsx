import type { Metadata } from "next";
import { PipelineStudio } from "@/components/PipelineStudio";
import { ToolPage } from "@/components/ToolPage";

export const metadata: Metadata = { title: "Production Pipeline", description: "Batch-process images, build recipes, edit crops and create complete asset packages locally." };
export default function PipelinePage() { return <ToolPage><PipelineStudio /></ToolPage>; }
