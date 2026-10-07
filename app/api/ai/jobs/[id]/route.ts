import { getAiConfiguration, normalizeNvidiaResult, safeProviderResult } from "@/lib/ai-provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const config = getAiConfiguration();
  const { id } = await params;
  if (!config.configured || !config.baseUrl || !config.apiKey) return Response.json({ error: "AI is not configured." }, { status: 503 });
  if (!/^[\w-]{1,128}$/.test(id)) return Response.json({ error: "Invalid job identifier." }, { status: 400 });
  try {
    const statusBase = config.mode === "nvidia-prototype" ? config.statusUrl : `${config.baseUrl}/jobs`;
    if (!statusBase) throw new Error("This provider has no status endpoint.");
    const response = await fetch(`${statusBase}/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${config.apiKey}`, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    if (config.mode === "nvidia-prototype" && response.status === 202) return Response.json(normalizeNvidiaResult({}, id, true));
    if (!response.ok) throw new Error(`Provider status failed (${response.status}).`);
    const body = await response.json();
    return Response.json(config.mode === "nvidia-prototype" ? normalizeNvidiaResult(body) : safeProviderResult(body), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Status request failed." }, { status: 502 });
  }
}
