export const AI_TASKS = [
  "background-removal",
  "upscale",
  "object-removal",
  "background-generation",
  "illustration-variants",
  "icon-concepts",
  "image-to-3d",
] as const;

export type AiTask = (typeof AI_TASKS)[number];

export function getAiConfiguration() {
  const baseUrl = process.env.KRITIVA_AI_PROVIDER_URL?.replace(/\/$/, "");
  const apiKey = process.env.KRITIVA_AI_API_KEY;
  return {
    configured: Boolean(baseUrl && apiKey),
    baseUrl,
    apiKey,
    provider: process.env.KRITIVA_AI_PROVIDER_NAME || "Not configured",
    retention: process.env.KRITIVA_AI_RETENTION || "Not declared",
    training: process.env.KRITIVA_AI_TRAINING_POLICY || "Not declared",
  };
}

export function isAiTask(value: unknown): value is AiTask {
  return typeof value === "string" && AI_TASKS.includes(value as AiTask);
}

export function safeProviderResult(value: unknown) {
  if (!value || typeof value !== "object") throw new Error("Provider returned an invalid response.");
  const input = value as Record<string, unknown>;
  const status = input.status;
  if (status !== "queued" && status !== "processing" && status !== "succeeded" && status !== "failed") {
    throw new Error("Provider returned an unsupported status.");
  }
  const jobId = typeof input.jobId === "string" && /^[\w-]{1,128}$/.test(input.jobId) ? input.jobId : undefined;
  let outputUrl: string | undefined;
  if (typeof input.outputUrl === "string") {
    const parsed = new URL(input.outputUrl);
    if (parsed.protocol !== "https:") throw new Error("Provider output URL must use HTTPS.");
    outputUrl = parsed.toString();
  }
  return {
    status,
    jobId,
    outputUrl,
    message: typeof input.message === "string" ? input.message.slice(0, 500) : undefined,
    mimeType: typeof input.mimeType === "string" ? input.mimeType.slice(0, 100) : undefined,
  };
}
