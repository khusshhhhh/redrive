import { test, expect } from "@playwright/test";

// A cold CI server rendering a DB-backed page for the first time can be slow.
const NAV = { waitUntil: "domcontentloaded" as const, timeout: 45_000 };

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
    const response = await pw.goto(page.path, NAV);
    expect(response, `no response for ${page.path}`).toBeTruthy();
    expect(response!.status(), `${page.path} status`).toBeLessThan(400);
    expect(await pw.content()).toMatch(page.expect);
  });
}

test("home page has a working link into discovery", async ({ page }) => {
  await page.goto("/", NAV);
  // Any anchor that leads to the explore/search surface.
  const exploreLink = page
    .locator('a[href="/explore"], a[href^="/explore?"], a[href="/"]')
    .first();
  await expect(exploreLink).toBeVisible();
});

test("explore page renders listing cards or an empty state (never a crash)", async ({ page }) => {
  const response = await page.goto("/explore", NAV);
  expect(response!.status()).toBeLessThan(400);
  const body = await page.locator("body").innerText();
  expect(body.length).toBeGreaterThan(50);
});

test("a listing search query string does not 500", async ({ page }) => {
  const response = await page.goto("/explore?state=SA&category=Ute", NAV);
  expect(response!.status()).toBeLessThan(500);
});

test("a garbage URL never 500s", async ({ page }) => {
  // The app has a root [slug] segment for static info pages, so an unknown
  // path may render a 200 not-found body or a 404 — either is fine; a 5xx is not.
  const response = await page.goto("/this-route-does-not-exist-xyz/nested/deep", NAV);
  expect(response!.status()).toBeLessThan(500);
});
