import { describe, expect, it } from "vitest";
import { isAiTask, normalizeNvidiaResult, safeArtifact, safeProviderResult } from "./ai-provider";

describe("AI provider boundary", () => {
  it("accepts only declared tasks", () => {
    expect(isAiTask("image-to-3d")).toBe(true);
    expect(isAiTask("arbitrary-command")).toBe(false);
  });

  it("returns an allowlisted provider result", () => {
    expect(safeProviderResult({ status: "succeeded", jobId: "job_123", outputUrl: "https://example.com/model.glb" })).toEqual({
      status: "succeeded", jobId: "job_123", outputUrl: "https://example.com/model.glb", artifactBase64: undefined, message: undefined, mimeType: undefined,
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
});
