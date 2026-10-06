import type { Metadata } from "next";
import { ThreeDModelLab } from "@/components/ThreeDModelLab";
import { ToolPage } from "@/components/ToolPage";

export const metadata: Metadata = { title: "3D Model Lab", description: "Preview, validate, optimize and package GLB models locally in your browser." };
export default function ModelPage() { return <ToolPage><ThreeDModelLab /></ToolPage>; }
