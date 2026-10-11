type TurnstileResponse = { success?: boolean; hostname?: string; action?: string; "error-codes"?: string[] };

export async function verifyTurnstileToken(token: string, remoteip?: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) return { configured: false, success: false };
  if (!token || token.length > 2048) return { configured: true, success: false };
  const body = new URLSearchParams({ secret, response: token });
  if (remoteip && remoteip !== "unknown") body.set("remoteip", remoteip);
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) return { configured: true, success: false };
  const result = await response.json() as TurnstileResponse;
  return { configured: true, success: result.success === true };
}
