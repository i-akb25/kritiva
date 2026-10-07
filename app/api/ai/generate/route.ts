import { getAiConfiguration, isAiTask, normalizeNvidiaResult, safeProviderResult } from "@/lib/ai-provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    if (task === "text-to-3d" && !prompt) return Response.json({ error: "A text prompt is required." }, { status: 400 });
    if (task !== "text-to-3d" && !files.length) return Response.json({ error: "At least one source image is required." }, { status: 400 });

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
