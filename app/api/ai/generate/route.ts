import { getAiConfiguration, isAiTask, safeProviderResult } from "@/lib/ai-provider";

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
    if (!isAiTask(task)) return Response.json({ error: "Unsupported AI task." }, { status: 400 });
    if (consent !== "explicit") return Response.json({ error: "Explicit transfer consent is required." }, { status: 400 });

    const files = [...incoming.values()].filter((value): value is File => value instanceof File && value.size > 0);
    if (!files.length || files.length > 5) return Response.json({ error: "Provide between one and five source files." }, { status: 400 });
    if (files.some((file) => file.size > 12 * 1024 * 1024 || !["image/png", "image/jpeg", "image/webp"].includes(file.type))) {
      return Response.json({ error: "Only PNG, JPEG or WebP files up to 12 MB each are accepted." }, { status: 400 });
    }

    const outgoing = new FormData();
    outgoing.set("task", task);
    outgoing.set("prompt", String(incoming.get("prompt") || "").slice(0, 1500));
    for (const [name, value] of incoming.entries()) {
      if (value instanceof File && value.size) outgoing.append(name, value, value.name);
    }
    const response = await fetch(`${config.baseUrl}/generate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.apiKey}` },
      body: outgoing,
      signal: AbortSignal.timeout(55_000),
    });
    if (!response.ok) throw new Error(`Provider request failed (${response.status}).`);
    return Response.json(safeProviderResult(await response.json()), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "AI request failed." }, { status: 502 });
  }
}
