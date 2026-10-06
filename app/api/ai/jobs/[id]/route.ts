import { getAiConfiguration, safeProviderResult } from "@/lib/ai-provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const config = getAiConfiguration();
  const { id } = await params;
  if (!config.configured || !config.baseUrl || !config.apiKey) return Response.json({ error: "AI is not configured." }, { status: 503 });
  if (!/^[\w-]{1,128}$/.test(id)) return Response.json({ error: "Invalid job identifier." }, { status: 400 });
  try {
    const response = await fetch(`${config.baseUrl}/jobs/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${config.apiKey}` },
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error(`Provider status failed (${response.status}).`);
    return Response.json(safeProviderResult(await response.json()), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Status request failed." }, { status: 502 });
  }
}
