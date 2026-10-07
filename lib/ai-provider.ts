export const AI_TASKS = [
  "image-generation",
  "background-removal",
  "upscale",
  "object-removal",
  "background-generation",
  "illustration-variants",
  "icon-concepts",
  "image-to-3d",
  "text-to-3d",
] as const;

export type AiTask = (typeof AI_TASKS)[number];
export type AiMode = "gateway" | "cloudflare-images" | "local-compute" | "local-rtx" | "nvidia-prototype";

export const PROMPT_ONLY_TASKS: AiTask[] = [
  "image-generation",
  "background-generation",
  "illustration-variants",
  "icon-concepts",
  "text-to-3d",
];

const NVIDIA_TRELLIS_URL = "https://ai.api.nvidia.com/v1/genai/microsoft/trellis";
const NVIDIA_STATUS_URL = "https://integrate.api.nvidia.com/v1/status";
const CLOUDFLARE_AI_URL = "https://api.cloudflare.com/client/v4/accounts";
const CLOUDFLARE_DEFAULT_MODEL = "@cf/black-forest-labs/flux-2-klein-4b";
const CLOUDFLARE_IMAGE_MODELS = new Set([
  CLOUDFLARE_DEFAULT_MODEL,
  "@cf/black-forest-labs/flux-1-schnell",
]);

export function buildCloudflareImageRequest(
  baseUrl: string,
  apiKey: string,
  model: string,
  gatewayId: string,
  prompt: string,
) {
  const headers: Record<string, string> = { Authorization: `Bearer ${apiKey}` };

  if (model === CLOUDFLARE_DEFAULT_MODEL) {
    const body = new FormData();
    body.set("prompt", prompt);
    body.set("width", "1024");
    body.set("height", "1024");

    return {
      url: `${baseUrl}/${model}`,
      headers,
      body,
    };
  }

  headers["Content-Type"] = "application/json";
  headers["cf-aig-gateway-id"] = gatewayId;
  return {
    url: baseUrl,
    headers,
    body: JSON.stringify({ model, input: { prompt } }),
  };
}

function validUrl(value: string | undefined, protocols: string[]) {
  if (!value) return undefined;
  try {
    const parsed = new URL(value);
    return protocols.includes(parsed.protocol) ? parsed.toString().replace(/\/$/, "") : undefined;
  } catch {
    return undefined;
  }
}

export function getAiConfiguration() {
  const requestedMode = process.env.KRITIVA_AI_MODE;
  const mode: AiMode = requestedMode === "cloudflare-images" || requestedMode === "local-compute" || requestedMode === "local-rtx" || requestedMode === "nvidia-prototype" ? requestedMode : "gateway";

  if (mode === "cloudflare-images") {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
    const apiKey = process.env.CLOUDFLARE_API_TOKEN?.trim();
    const requestedModel = process.env.KRITIVA_CLOUDFLARE_IMAGE_MODEL?.trim();
    const model = requestedModel && CLOUDFLARE_IMAGE_MODELS.has(requestedModel) ? requestedModel : CLOUDFLARE_DEFAULT_MODEL;
    const gatewayId = process.env.CLOUDFLARE_AI_GATEWAY_ID?.trim() || "default";
    const validAccount = Boolean(accountId && /^[a-f0-9]{32}$/i.test(accountId));
    return {
      mode, configured: Boolean(validAccount && apiKey), baseUrl: validAccount ? `${CLOUDFLARE_AI_URL}/${accountId}/ai/run` : undefined,
      statusUrl: undefined, apiKey, model, gatewayId,
      provider: model === CLOUDFLARE_DEFAULT_MODEL ? "Cloudflare Workers AI · FLUX.2 Klein 4B" : "Cloudflare Workers AI · FLUX.1 Schnell",
      retention: process.env.KRITIVA_AI_RETENTION || "KRITIVA does not store generated images",
      training: process.env.KRITIVA_AI_TRAINING_POLICY || "Review Cloudflare and model-provider terms before use",
      capabilities: ["image-generation", "background-generation", "illustration-variants", "icon-concepts"] as AiTask[],
      developmentOnly: false, local: false,
    };
  }

  if (mode === "nvidia-prototype") {
    const apiKey = process.env.NVIDIA_API_KEY;
    return {
      mode, configured: Boolean(apiKey), baseUrl: NVIDIA_TRELLIS_URL, statusUrl: NVIDIA_STATUS_URL, apiKey,
      provider: "NVIDIA TRELLIS trial", retention: "Governed by NVIDIA API Trial Terms",
      training: "Check NVIDIA trial terms before each use", capabilities: ["text-to-3d"] as AiTask[],
      developmentOnly: true, local: false,
    };
  }

  if (mode === "local-rtx" || mode === "local-compute") {
    const profile = mode === "local-rtx" ? "nvidia-rtx" : (process.env.KRITIVA_LOCAL_PROFILE || "auto");
    const names: Record<string, string> = {
      auto: "Local Compute Connector (automatic)", "nvidia-rtx": "Local NVIDIA RTX",
      "apple-silicon": "Local Apple Silicon", "intel-cpu": "Local Intel CPU", "amd-cpu": "Local AMD CPU",
    };
    const baseUrl = validUrl(process.env.KRITIVA_LOCAL_CONNECTOR_URL || process.env.KRITIVA_RTX_CONNECTOR_URL || "http://127.0.0.1:8787", ["http:", "https:"]);
    const apiKey = process.env.KRITIVA_LOCAL_CONNECTOR_TOKEN || process.env.KRITIVA_RTX_CONNECTOR_TOKEN;
    return {
      mode, configured: Boolean(baseUrl && apiKey), baseUrl, statusUrl: undefined, apiKey,
      provider: names[profile] || names.auto, retention: "Temporary local files are deleted after processing",
      training: "No training; files stay on this computer", capabilities: profile === "nvidia-rtx" ? ["image-to-3d", "text-to-3d"] as AiTask[] : ["image-to-3d"] as AiTask[],
      developmentOnly: false, local: true,
    };
  }

  const baseUrl = validUrl(process.env.KRITIVA_AI_PROVIDER_URL, ["https:"]);
  const apiKey = process.env.KRITIVA_AI_API_KEY;
  return {
    mode,
    configured: Boolean(baseUrl && apiKey),
    baseUrl,
    statusUrl: undefined,
    apiKey,
    provider: process.env.KRITIVA_AI_PROVIDER_NAME || "Not configured",
    retention: process.env.KRITIVA_AI_RETENTION || "Not declared",
    training: process.env.KRITIVA_AI_TRAINING_POLICY || "Not declared",
    capabilities: [...AI_TASKS] as AiTask[],
    developmentOnly: false,
    local: false,
  };
}

export function isAiTask(value: unknown): value is AiTask {
  return typeof value === "string" && AI_TASKS.includes(value as AiTask);
}

export function isPromptOnlyTask(task: AiTask) {
  return PROMPT_ONLY_TASKS.includes(task);
}

export function safeArtifact(value: unknown) {
  if (typeof value !== "string" || value.length < 16 || value.length > 100 * 1024 * 1024) return undefined;
  const cleaned = value.replace(/^data:model\/gltf-binary;base64,/, "");
  return /^[A-Za-z0-9+/=\r\n]+$/.test(cleaned) ? cleaned.replace(/[\r\n]/g, "") : undefined;
}

export function safeImageArtifact(value: unknown) {
  if (typeof value !== "string" || value.length < 16 || value.length > 20 * 1024 * 1024) return undefined;
  const cleaned = value.replace(/^data:image\/(?:png|jpeg|webp);base64,/, "");
  return /^[A-Za-z0-9+/=\r\n]+$/.test(cleaned) ? cleaned.replace(/[\r\n]/g, "") : undefined;
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
    artifactBase64: safeArtifact(input.artifactBase64),
    imageBase64: safeImageArtifact(input.imageBase64),
    message: typeof input.message === "string" ? input.message.slice(0, 500) : undefined,
    mimeType: typeof input.mimeType === "string" ? input.mimeType.slice(0, 100) : undefined,
  };
}

export function normalizeCloudflareImageResult(value: unknown) {
  if (!value || typeof value !== "object") throw new Error("Cloudflare returned an invalid response.");
  const envelope = value as Record<string, unknown>;
  if (envelope.success === false) throw new Error("Cloudflare rejected the image request.");
  const result = envelope.result && typeof envelope.result === "object" ? envelope.result as Record<string, unknown> : envelope;
  const imageBase64 = safeImageArtifact(result.image ?? result.imageBase64);
  if (!imageBase64) throw new Error("Cloudflare completed the request without a readable image.");
  return {
    status: "succeeded" as const,
    imageBase64,
    mimeType: "image/jpeg",
    message: "The generated image is ready.",
  };
}

export function normalizeNvidiaResult(value: unknown, requestId?: string, pending = false) {
  if (pending) {
    if (!requestId || !/^[\w-]{1,128}$/.test(requestId)) throw new Error("NVIDIA did not return a valid request identifier.");
    return { status: "queued" as const, jobId: requestId, message: "NVIDIA is generating the model." };
  }
  if (!value || typeof value !== "object") throw new Error("NVIDIA returned an invalid response.");
  const input = value as Record<string, unknown>;
  const output = input.output && typeof input.output === "object" ? input.output as Record<string, unknown> : input;
  const artifactBase64 = safeArtifact(output.glb ?? input.glb ?? input.artifact);
  if (!artifactBase64) throw new Error("NVIDIA completed the request without a readable GLB artifact.");
  return { status: "succeeded" as const, artifactBase64, mimeType: "model/gltf-binary", message: "The prototype GLB is ready." };
}
