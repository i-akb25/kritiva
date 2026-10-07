export const AI_TASKS = [
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
export type AiMode = "gateway" | "local-compute" | "local-rtx" | "nvidia-prototype";

const NVIDIA_TRELLIS_URL = "https://ai.api.nvidia.com/v1/genai/microsoft/trellis";
const NVIDIA_STATUS_URL = "https://integrate.api.nvidia.com/v1/status";

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
  const mode: AiMode = requestedMode === "local-compute" || requestedMode === "local-rtx" || requestedMode === "nvidia-prototype" ? requestedMode : "gateway";

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

export function safeArtifact(value: unknown) {
  if (typeof value !== "string" || value.length < 16 || value.length > 100 * 1024 * 1024) return undefined;
  const cleaned = value.replace(/^data:model\/gltf-binary;base64,/, "");
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
    message: typeof input.message === "string" ? input.message.slice(0, 500) : undefined,
    mimeType: typeof input.mimeType === "string" ? input.mimeType.slice(0, 100) : undefined,
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
