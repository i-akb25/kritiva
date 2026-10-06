import { describe, expect, it } from "vitest";
import { isAiTask, safeProviderResult } from "./ai-provider";

describe("AI provider boundary", () => {
  it("accepts only declared tasks", () => {
    expect(isAiTask("image-to-3d")).toBe(true);
    expect(isAiTask("arbitrary-command")).toBe(false);
  });

  it("returns an allowlisted provider result", () => {
    expect(safeProviderResult({ status: "succeeded", jobId: "job_123", outputUrl: "https://example.com/model.glb" })).toEqual({
      status: "succeeded", jobId: "job_123", outputUrl: "https://example.com/model.glb", message: undefined, mimeType: undefined,
    });
  });

  it("rejects insecure output links and malformed job IDs", () => {
    expect(() => safeProviderResult({ status: "succeeded", outputUrl: "http://example.com/file" })).toThrow(/HTTPS/);
    expect(safeProviderResult({ status: "queued", jobId: "../secret" }).jobId).toBeUndefined();
  });
});
