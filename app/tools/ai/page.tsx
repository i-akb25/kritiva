import type { Metadata } from "next";
import { headers } from "next/headers";
import { AiWorkshop } from "@/components/AiWorkshop";
import { ToolPage } from "@/components/ToolPage";

export const metadata: Metadata = { title: "Optional AI Workshop", description: "Consent-gated hosted image generation, local 2D image to 3D reconstruction and developer prototype tools." };
export default async function AiPage() {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return <ToolPage><AiWorkshop nonce={nonce} /></ToolPage>;
}
