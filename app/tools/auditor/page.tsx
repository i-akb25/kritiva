import type { Metadata } from "next";
import { AssetAuditor } from "@/components/AssetAuditor";
import { ToolPage } from "@/components/ToolPage";

export const metadata: Metadata = { title: "Asset Auditor", description: "Audit a project package for missing, invalid, duplicate and privacy-sensitive assets." };
export default function AuditorPage() { return <ToolPage><AssetAuditor /></ToolPage>; }
