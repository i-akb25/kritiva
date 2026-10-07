import { buildCloudflareImageRequest, getAiConfiguration, isAiTask, isPromptOnlyTask, normalizeCloudflareImageResult, normalizeNvidiaResult, safeProviderResult, type AiTask } from "@/lib/ai-provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const windows = new Map<string, { count: number; started: number }>();

function allowed(ip: string) {
  const now = Date.now();
  const current = windows.get(ip);
  if (!current || now - current.started > 10 * 60_000) {
    windows.set(ip, { count: 1, started: now });
    return true;
  }
  current.count += 1;
  return current.count <= 5;
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
  const config = getAiConfiguration();
  if (!config.configured || !config.baseUrl || !config.apiKey) {
    return Response.json({ error: "AI processing is not configured on this deployment." }, { status: 503 });
  }
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!allowed(ip)) return Response.json({ error: "AI request limit reached. Try again later." }, { status: 429 });

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
      const cloudflareRequest = buildCloudflareImageRequest(
        config.baseUrl,
        config.apiKey,
        config.model,
        config.gatewayId,
        imagePrompt(task, prompt),
      );
      const response = await fetch(cloudflareRequest.url, {
        method: "POST",
        headers: cloudflareRequest.headers,
        body: cloudflareRequest.body,
        signal: AbortSignal.timeout(55_000),
      });
      if (!response.ok) {
        const detail = (await response.text()).replace(/\s+/g, " ").slice(0, 240);
        throw new Error(`Cloudflare image generation failed (${response.status})${detail ? `: ${detail}` : "."}`);
      }
      return Response.json(normalizeCloudflareImageResult(await response.json()), { headers: { "Cache-Control": "no-store" } });
    }

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
