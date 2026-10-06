import { describe, expect, it } from "vitest";
import { hasDangerousSvgMarkup } from "./svg-tools";

describe("SVG safety preflight", () => {
  it("detects scripts, event handlers and external references", () => {
    expect(hasDangerousSvgMarkup('<svg><script>alert(1)</script></svg>')).toBe(true);
    expect(hasDangerousSvgMarkup('<svg><path onclick="x()" /></svg>')).toBe(true);
    expect(hasDangerousSvgMarkup('<svg><use href="https://example.com/x.svg#x" /></svg>')).toBe(true);
  });

  it("accepts ordinary local vector markup", () => {
    expect(hasDangerousSvgMarkup('<svg viewBox="0 0 24 24"><path d="M0 0h5" /></svg>')).toBe(false);
  });
});
