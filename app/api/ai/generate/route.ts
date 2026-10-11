import { buildCloudflareImageRequest, getAiConfiguration, isAiTask, isPromptOnlyTask, normalizeCloudflareImageResult, normalizeNvidiaResult, safeProviderResult, type AiTask } from "@/lib/ai-provider";
import { verifyTurnstileToken } from "@/lib/turnstile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const windows = new Map<string, { count: number; started: number }>();
const sharedProcess = globalThis as typeof globalThis & { __kritivaAiDaily?: { day: string; count: number } };

function allowed(ip: string, cost = 1) {
  const now = Date.now();
  const current = windows.get(ip);
  if (!current || now - current.started > 10 * 60_000) {
    windows.set(ip, { count: cost, started: now });
    return true;
  }
  current.count += cost;
  return current.count <= 5;
}

function reserveDailyCapacity(cost: number) {
  const day = new Date().toISOString().slice(0, 10);
  const limit = Math.max(1, Number(process.env.KRITIVA_AI_DAILY_LIMIT || 60));
  if (!sharedProcess.__kritivaAiDaily || sharedProcess.__kritivaAiDaily.day !== day) sharedProcess.__kritivaAiDaily = { day, count: 0 };
  if (sharedProcess.__kritivaAiDaily.count + cost > limit) return false;
  sharedProcess.__kritivaAiDaily.count += cost;
  return true;
}

function dimension(value: FormDataEntryValue | null, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(256, Math.min(1920, Math.round(parsed / 16) * 16));
}

function friendlyCloudflareError(status: number) {
  if (status === 400) return "Cloudflare rejected the selected model settings. Try standard dimensions or a shorter prompt.";
  if (status === 401 || status === 403) return "Cloudflare authentication or model permission failed. The deployment owner must check the API token.";
  if (status === 429) return "The Cloudflare AI quota or temporary capacity limit has been reached. Try again later.";
  if (status >= 500) return "Cloudflare AI is temporarily unavailable. Try again later.";
  return "Cloudflare could not complete this image request.";
}

function imagePrompt(task: AiTask, prompt: string) {
  const instructions: Partial<Record<AiTask, string>> = {
    "image-generation": "Create a polished production-ready image from this brief:",
    "background-generation": "Create a clean website background without text, logos, watermarks or interface elements from this brief:",
    "illustration-variants": "Create a refined editorial website illustration without text or watermarks from this brief:",
    "icon-concepts": "Create one centered icon concept on a plain neutral background, without text or watermarks, from this brief:",
  };
  return `${instructions[task] || "Create an image from this brief:"} ${prompt}`.slice(0, 1800);
}

export async function POST(request: Request) {
  if (process.env.KRITIVA_AI_ENABLED === "false") {
    return Response.json({ error: "Hosted AI is temporarily disabled by the deployment owner." }, { status: 503 });
  }
  const config = getAiConfiguration();
  if (!config.configured || !config.baseUrl || !config.apiKey) {
    return Response.json({ error: "AI processing is not configured on this deployment." }, { status: 503 });
  }
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  try {
    const incoming = await request.formData();
    const task = incoming.get("task");
    const consent = incoming.get("consent");
    if (!isAiTask(task) || !config.capabilities.includes(task)) return Response.json({ error: "This mode does not support that AI task." }, { status: 400 });
    if (consent !== "explicit") return Response.json({ error: "Explicit transfer consent is required." }, { status: 400 });

    const files = [...incoming.values()].filter((value): value is File => value instanceof File && value.size > 0);
    if (files.length > 5) return Response.json({ error: "Provide no more than five source files." }, { status: 400 });
    if (files.some((file) => file.size > 12 * 1024 * 1024 || !["image/png", "image/jpeg", "image/webp"].includes(file.type))) {
      return Response.json({ error: "Only PNG, JPEG or WebP files up to 12 MB each are accepted." }, { status: 400 });
    }

    const prompt = String(incoming.get("prompt") || "").trim();
    if (isPromptOnlyTask(task) && !prompt) return Response.json({ error: "A text prompt is required." }, { status: 400 });
    if (!isPromptOnlyTask(task) && !files.length) return Response.json({ error: "At least one source image is required." }, { status: 400 });

    if (config.mode === "cloudflare-images") {
      if (files.length) return Response.json({ error: "This hosted image mode accepts prompts only and does not upload source files." }, { status: 400 });
      const variations = Math.max(1, Math.min(4, Math.round(Number(incoming.get("variations") || 1))));
      const requiredTurnstile = process.env.KRITIVA_AI_REQUIRE_TURNSTILE === "true";
      const turnstile = await verifyTurnstileToken(String(incoming.get("turnstileToken") || ""), ip);
      if (requiredTurnstile && !turnstile.configured) return Response.json({ error: "AI protection is not configured on this deployment." }, { status: 503 });
      if (turnstile.configured && !turnstile.success) return Response.json({ error: "Human verification failed or expired. Complete the check and try again." }, { status: 403 });
      if (!allowed(ip, variations)) return Response.json({ error: "AI request limit reached. Try again in ten minutes." }, { status: 429 });
      if (!reserveDailyCapacity(variations)) return Response.json({ error: "KRITIVA's daily generation ceiling has been reached. Try again after the UTC reset." }, { status: 429 });

      const width = dimension(incoming.get("width"), 1024);
      const height = dimension(incoming.get("height"), 1024);
      const requestedSeed = Number(incoming.get("seed"));
      const seed = Number.isInteger(requestedSeed) && requestedSeed >= 0 && requestedSeed <= 2_147_483_647 ? requestedSeed : undefined;
      const providerPrompt = imagePrompt(task, prompt);
      const images = await Promise.all(Array.from({ length: variations }, async (_, index) => {
        const cloudflareRequest = buildCloudflareImageRequest(
          config.baseUrl!, config.apiKey!, config.model, config.gatewayId, providerPrompt,
          { width, height, seed: seed === undefined ? undefined : seed + index },
        );
        const response = await fetch(cloudflareRequest.url, {
          method: "POST", headers: cloudflareRequest.headers, body: cloudflareRequest.body,
          signal: AbortSignal.timeout(55_000),
        });
        if (!response.ok) throw new Error(friendlyCloudflareError(response.status));
        return normalizeCloudflareImageResult(await response.json());
      }));
      return Response.json({ ...images[0], images, width, height, seed }, { headers: { "Cache-Control": "no-store" } });
    }

    if (!allowed(ip)) return Response.json({ error: "AI request limit reached. Try again later." }, { status: 429 });

    if (config.mode === "nvidia-prototype") {
      const response = await fetch(config.baseUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${config.apiKey}`, Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "text", prompt: prompt.slice(0, 77), output_format: "glb", samples: 1, seed: 0 }),
        signal: AbortSignal.timeout(55_000),
      });
      const requestId = response.headers.get("nvcf-reqid") || response.headers.get("x-request-id") || undefined;
      if (response.status === 202) return Response.json(normalizeNvidiaResult({}, requestId, true));
      if (!response.ok) throw new Error(`NVIDIA prototype request failed (${response.status}).`);
      return Response.json(normalizeNvidiaResult(await response.json()));
    }

    const outgoing = new FormData();
    outgoing.set("task", task);
    outgoing.set("prompt", prompt.slice(0, 1500));
    for (const [name, value] of incoming.entries()) {
      if (value instanceof File && value.size) outgoing.append(name, value, value.name);
    }
    const response = await fetch(`${config.baseUrl}/generate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.apiKey}` },
      body: outgoing,
      signal: AbortSignal.timeout(config.local ? 31 * 60_000 : 55_000),
    });
    if (!response.ok) throw new Error(`${config.provider} request failed (${response.status}).`);
    return Response.json(safeProviderResult(await response.json()), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "AI request failed." }, { status: 502 });
  }
}
