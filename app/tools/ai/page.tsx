import type { Metadata } from "next";
import { AiWorkshop } from "@/components/AiWorkshop";
import { ToolPage } from "@/components/ToolPage";

export const metadata: Metadata = { title: "Optional AI Workshop", description: "Consent-gated AI asset tools and multi-view 2D image to 3D model reconstruction." };
export default function AiPage() { return <ToolPage><AiWorkshop /></ToolPage>; }
