import { expect, test } from "@playwright/test";

const pages = [
  ["/", /Create once/],
  ["/tools/pipeline", /From source file to complete asset package/],
  ["/tools/ai", /Generate, resize and continue locally/],
  ["/tools/pdf", /Edit pages without DOCX conversion/],
] as const;

for (const [path, heading] of pages) {
  test(`${path} renders without horizontal overflow`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.ok()).toBeTruthy();
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
}

test("AI status describes a disabled deployment safely", async ({ request }) => {
  const response = await request.get("/api/ai/status");
  expect(response.ok()).toBeTruthy();
  const status = await response.json();
  expect(status).not.toHaveProperty("apiKey");
  expect(status).not.toHaveProperty("baseUrl");
  expect(typeof status.configured).toBe("boolean");
});
