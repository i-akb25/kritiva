import { afterEach, describe, expect, it, vi } from "vitest";
import { getAiConfiguration, isAiTask, normalizeCloudflareImageResult, normalizeNvidiaResult, safeArtifact, safeImageArtifact, safeProviderResult } from "./ai-provider";

afterEach(() => vi.unstubAllEnvs());

describe("AI provider boundary", () => {
  it("accepts only declared tasks", () => {
    expect(isAiTask("image-to-3d")).toBe(true);
    expect(isAiTask("image-generation")).toBe(true);
    expect(isAiTask("arbitrary-command")).toBe(false);
  });

  it("returns an allowlisted provider result", () => {
    expect(safeProviderResult({ status: "succeeded", jobId: "job_123", outputUrl: "https://example.com/model.glb" })).toEqual({
      status: "succeeded", jobId: "job_123", outputUrl: "https://example.com/model.glb", artifactBase64: undefined, imageBase64: undefined, message: undefined, mimeType: undefined,
    });
  });

  it("rejects insecure output links and malformed job IDs", () => {
    expect(() => safeProviderResult({ status: "succeeded", outputUrl: "http://example.com/file" })).toThrow(/HTTPS/);
    expect(safeProviderResult({ status: "queued", jobId: "../secret" }).jobId).toBeUndefined();
  });

  it("normalizes synchronous and queued NVIDIA results", () => {
    const glb = "Z2xURgIAAAAAAAAAAAAAAA==";
    expect(normalizeNvidiaResult({ output: { glb } }).artifactBase64).toBe(glb);
    expect(normalizeNvidiaResult({}, "request-123", true)).toMatchObject({ status: "queued", jobId: "request-123" });
    expect(() => normalizeNvidiaResult({}, "../bad", true)).toThrow(/identifier/);
  });

  it("accepts base64 GLB data and rejects arbitrary strings", () => {
    expect(safeArtifact("Z2xURgIAAAAAAAAAAAAAAA==")).toBe("Z2xURgIAAAAAAAAAAAAAAA==");
    expect(safeArtifact("<script>alert(1)</script>")).toBeUndefined();
  });

  it("normalizes Cloudflare image responses without accepting markup", () => {
    const image = "iVBORw0KGgoAAAANSUhEUgAAAAE=";
    expect(normalizeCloudflareImageResult({ success: true, result: { image } })).toMatchObject({
      status: "succeeded", imageBase64: image, mimeType: "image/jpeg",
    });
    expect(safeImageArtifact("<svg onload=alert(1)>")).toBeUndefined();
    expect(() => normalizeCloudflareImageResult({ success: false, errors: [] })).toThrow(/rejected/);
  });

  it("enables only prompt-based image tasks for a valid Cloudflare configuration", () => {
    vi.stubEnv("KRITIVA_AI_MODE", "cloudflare-images");
    vi.stubEnv("CLOUDFLARE_ACCOUNT_ID", "0123456789abcdef0123456789abcdef");
    vi.stubEnv("CLOUDFLARE_API_TOKEN", "server-secret");
    const config = getAiConfiguration();
    expect(config.configured).toBe(true);
    expect(config.capabilities).toEqual(["image-generation", "background-generation", "illustration-variants", "icon-concepts"]);
    expect(config.baseUrl).toContain("0123456789abcdef0123456789abcdef/ai/run");
  });
});
