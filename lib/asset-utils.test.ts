import { describe, expect, it } from "vitest";
import { bytesToSize, replaceExtension, safeFilename, specAsText, validateFile } from "./asset-utils";
import { getSpec } from "./specs";

describe("asset utilities", () => {
  it("normalizes filenames without losing a valid extension", () => {
    expect(safeFilename("My New Cover (Final).WEBP")).toBe("my-new-cover-final.webp");
    expect(safeFilename("Résumé 2026.PDF")).toBe("resume-2026.pdf");
  });

  it("changes only the final extension", () => {
    expect(replaceExtension("project.cover.png", "webp")).toBe("project.cover.webp");
  });

  it("formats decimal web file sizes", () => {
    expect(bytesToSize(980)).toBe("980 B");
    expect(bytesToSize(150_000)).toBe("150.0 KB");
    expect(bytesToSize(2_500_000)).toBe("2.50 MB");
  });

  it("flags invalid format, size, filename and dimensions", () => {
    const file = new File([new Uint8Array(510_000)], "Bad Cover.PNG", { type: "image/png" });
    const results = validateFile(file, getSpec("project-cover"), { width: 800, height: 600 });
    expect(results.every((result) => result.state === "warn")).toBe(true);
  });

  it("renders a portable plain-text specification", () => {
    const text = specAsText(getSpec("og-image"));
    expect(text).toContain("Dimensions: 1200 × 630");
    expect(text).toContain("Filename: og-default.webp");
  });
});
