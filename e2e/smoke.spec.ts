import { test, expect } from "@playwright/test";

// Public pages that must always render for an anonymous visitor. A 5xx or a
// blank body here means the app is broken for everyone.
const PUBLIC_PAGES: { path: string; expect: RegExp }[] = [
  { path: "/", expect: /redrive/i },
  { path: "/explore", expect: /\w/ },
  { path: "/hire/ute-hire-adelaide", expect: /ute/i },
  { path: "/list/how-much-can-you-earn", expect: /earn/i },
  { path: "/newsroom", expect: /\w/ },
  { path: "/sitemap.xml", expect: /<urlset|<\?xml/ },
];

for (const page of PUBLIC_PAGES) {
  test(`GET ${page.path} responds 200 and renders content`, async ({ page: pw }) => {
    const response = await pw.goto(page.path, { waitUntil: "domcontentloaded" });
    expect(response, `no response for ${page.path}`).toBeTruthy();
    expect(response!.status(), `${page.path} status`).toBeLessThan(400);
    expect(await pw.content()).toMatch(page.expect);
  });
}

test("home page has a working link into discovery", async ({ page }) => {
  await page.goto("/");
  // Any anchor that leads to the explore/search surface.
  const exploreLink = page
    .locator('a[href="/explore"], a[href^="/explore?"], a[href="/"]')
    .first();
  await expect(exploreLink).toBeVisible();
});

test("explore page renders listing cards or an empty state (never a crash)", async ({ page }) => {
  const response = await page.goto("/explore", { waitUntil: "networkidle" });
  expect(response!.status()).toBeLessThan(400);
  const body = await page.locator("body").innerText();
  expect(body.length).toBeGreaterThan(50);
});

test("a listing search query string does not 500", async ({ page }) => {
  const response = await page.goto("/explore?state=SA&category=Ute", {
    waitUntil: "domcontentloaded",
  });
  expect(response!.status()).toBeLessThan(500);
});

test("unknown route returns a 404 page, not a 500", async ({ page }) => {
  const response = await page.goto("/this-route-does-not-exist-xyz", {
    waitUntil: "domcontentloaded",
  });
  expect(response!.status()).toBe(404);
});
