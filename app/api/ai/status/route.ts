import { getAiConfiguration } from "@/lib/ai-provider";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = getAiConfiguration();
  return Response.json({
    configured: config.configured && process.env.KRITIVA_AI_ENABLED !== "false",
    provider: config.provider,
    retention: config.retention,
    training: config.training,
    mode: config.mode,
    capabilities: config.capabilities,
    developmentOnly: config.developmentOnly,
    local: config.local,
    aiEnabled: process.env.KRITIVA_AI_ENABLED !== "false",
    turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "",
    turnstileRequired: config.mode === "cloudflare-images" && process.env.KRITIVA_AI_REQUIRE_TURNSTILE === "true",
    turnstileConfigured: Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY),
    dailyLimit: Math.max(1, Number(process.env.KRITIVA_AI_DAILY_LIMIT || 60)),
    transferNotice: config.configured
      ? config.local
        ? "Requests stay on this computer and are sent only to the loopback Local Compute Connector."
        : config.mode === "cloudflare-images"
          ? "Only the prompt is sent to Cloudflare Workers AI; KRITIVA does not create an account or project library."
        : `Files selected for AI processing are transferred to ${config.provider}.`
      : "No AI provider is configured. Local tools remain available.",
  }, { headers: { "Cache-Control": "no-store" } });
}
