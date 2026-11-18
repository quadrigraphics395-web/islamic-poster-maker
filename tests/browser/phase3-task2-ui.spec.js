import { expect, test } from "@playwright/test";

const browserDiagnostics = new WeakMap();

test.beforeEach(async ({ page }) => {
  const diagnostics = { errors: [], fontFailures: [] };
  browserDiagnostics.set(page, diagnostics);
  page.on("pageerror", (error) => diagnostics.errors.push(error.message));
  page.on("requestfailed", (request) => {
    if (/\.(?:woff2?|ttf|otf)(?:\?|$)/i.test(request.url())) diagnostics.fontFailures.push(`${request.url()}: ${request.failure()?.errorText}`);
  });
  page.on("response", (response) => {
    if (/\.(?:woff2?|ttf|otf)(?:\?|$)/i.test(response.url()) && response.status() >= 400) diagnostics.fontFailures.push(`${response.url()}: HTTP ${response.status()}`);
  });
});

test.afterEach(async ({ page }) => {
  const diagnostics = browserDiagnostics.get(page);
  expect(diagnostics.errors, "uncaught browser errors").toEqual([]);
  expect(diagnostics.fontFailures, "failed local font assets").toEqual([]);
});

async function startEditor(page) {
  await page.goto("/");
  await expect(page.locator(".editor-page")).toBeVisible();
  const setup = page.getByRole("dialog", { name: "Page Setup" });
  if (await setup.isVisible()) await setup.getByRole("button", { name: "Close Page Setup" }).click();
  await expect(page.locator(".poster-canvas")).toBeVisible();
}

async function addShape(page, isMobile, shapeLabel) {
  if (isMobile) {
    const addMenu = page.locator("#editor-menu-add");
    if (!(await addMenu.evaluate((element) => element.open))) await addMenu.locator("summary").click();
    await addMenu.getByRole("button", { name: "Add Shape", exact: true }).click();
  } else {
    await page.getByRole("button", { name: "Add shape" }).click();
  }
  await page.getByRole("dialog", { name: "Choose an Islamic shape" }).locator(".shape-picker-option").filter({ hasText: shapeLabel }).click();
}

async function openVectorMenu(page) {
  const menu = page.locator("#editor-menu-vector");
  if (!(await menu.evaluate((element) => element.open))) await menu.locator("summary").click();
  return menu;
}

test("Combine, Break Apart, and undo/redo keep vector parts editable", async ({ page }, testInfo) => {
  await startEditor(page);
  const isMobile = testInfo.project.name === "mobile-edge-emulated";
  await addShape(page, isMobile, "8 Point Islamic Star");
  await addShape(page, isMobile, "6 Point Star");
  const shapes = page.locator(".canvas-control-object");
  await expect(shapes).toHaveCount(2);
  await page.screenshot({ path: testInfo.outputPath("vector-selection-before.png"), fullPage: true });
  const shapeIds = await shapes.evaluateAll((items) => items.map((item) => item.getAttribute("data-object-id")));
  const arrange = page.locator("#editor-menu-arrange");
  if (!(await arrange.evaluate((element) => element.open))) await arrange.locator("summary").click();
  await page.locator("#toolbar-canvas-layers").selectOption(shapeIds);
  await expect.poll(() => page.locator("#toolbar-canvas-layers").evaluate((element) => element.selectedOptions.length)).toBe(2);

  const menu = await openVectorMenu(page);
  await expect(menu.getByRole("button", { name: "Combine", exact: true })).toBeEnabled();
  await menu.getByRole("button", { name: "Combine", exact: true }).click();
  const compound = page.locator(".canvas-control-object[data-object-id^='boolean-']");
  await expect(compound).toHaveCount(1);
  await expect(compound.locator("svg path")).toHaveCount(1);
  await expect(compound.locator("svg path")).toHaveAttribute("d", /M[^M]+M/);
  await openVectorMenu(page);
  await expect(menu.getByRole("button", { name: "Break Apart", exact: true })).toBeEnabled();
  await page.screenshot({ path: testInfo.outputPath("vector-combined.png"), fullPage: true });
  const svgDownloadPromise = page.waitForEvent("download");
  await menu.getByRole("button", { name: "Export selected vector as editable SVG" }).click();
  const svgDownload = await svgDownloadPromise;
  const svgStream = await svgDownload.createReadStream();
  const svgChunks = [];
  for await (const chunk of svgStream) svgChunks.push(chunk);
  const exportedSvg = Buffer.concat(svgChunks).toString("utf8");
  expect(exportedSvg).toContain('fill-rule="nonzero"');
  expect(exportedSvg).toMatch(/d="[^"]*M[^M]+M/);

  await openVectorMenu(page);
  await menu.getByRole("button", { name: "Break Apart", exact: true }).click();
  await expect(page.locator(".canvas-control-object[data-object-id^='part-']")).toHaveCount(2);
  const edit = page.locator("#editor-menu-edit");
  const editAction = async (name) => {
    if (!(await edit.evaluate((element) => element.open))) await edit.locator("summary").click();
    await edit.getByRole("button", { name, exact: true }).click();
  };
  await editAction("Undo");
  await expect(compound).toHaveCount(1);
  await editAction("Undo");
  await expect(shapes).toHaveCount(2);
  await editAction("Redo");
  await expect(compound).toHaveCount(1);
  await editAction("Redo");
  await expect(page.locator(".canvas-control-object[data-object-id^='part-']")).toHaveCount(2);
});

test("Urdu preview uses the locally loaded Nastaliq font on desktop and mobile", async ({ page }, testInfo) => {
  await startEditor(page);
  const add = page.locator("#editor-menu-add");
  if (!(await add.evaluate((element) => element.open))) await add.locator("summary").click();
  await add.getByRole("button", { name: "Add Text", exact: true }).click();
  const textEdit = page.locator("#poster-text");
  const textPanel = page.locator(".properties-panel details.text-section").filter({ has: page.locator("summary", { hasText: /^Text$/ }) });
  if (!(await textPanel.evaluate((element) => element.open))) await textPanel.locator("summary").click();
  await expect(textEdit).toBeVisible();
  await textEdit.fill("خوش آمدید");
  const fontPanel = page.locator(".properties-panel details.text-section").filter({ has: page.locator("summary", { hasText: /^Font$/ }) });
  if (!(await fontPanel.evaluate((element) => element.open))) await fontPanel.locator("summary").click();
  await page.locator("#font-family").selectOption({ label: "Noto Nastaliq Urdu" });
  const rendered = page.locator(".canvas-art-object .canvas-text-fill").last();
  await expect(rendered).toHaveText("خوش آمدید");
  await expect.poll(() => rendered.evaluate((element) => getComputedStyle(element).fontFamily)).toContain("Noto Nastaliq Urdu Variable");
  await expect.poll(() => page.evaluate(() => document.fonts.check("28px 'Noto Nastaliq Urdu Variable'"))).toBeTruthy();
  await page.screenshot({ path: testInfo.outputPath(`${testInfo.project.name}-urdu-font.png`), fullPage: true });

  if (!(await textPanel.evaluate((element) => element.open))) await textPanel.locator("summary").click();
  await textEdit.fill("بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ");
  if (!(await fontPanel.evaluate((element) => element.open))) await fontPanel.locator("summary").click();
  await page.locator("#font-family").selectOption({ label: "Noto Naskh Arabic" });
  await expect(rendered).toHaveText("بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ");
  await expect.poll(() => rendered.evaluate((element) => getComputedStyle(element).direction)).toBe("rtl");
  await expect.poll(() => rendered.evaluate((element) => getComputedStyle(element).fontFamily)).toContain("Noto Naskh Arabic");
  await expect.poll(() => page.evaluate(() => document.fonts.check("28px 'Noto Naskh Arabic'"))).toBeTruthy();
});

test("mobile View menu opens its More sheet with usable editor actions", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-edge-emulated", "This check covers the compact mobile More sheet.");
  await startEditor(page);
  const viewMenu = page.locator("#editor-menu-more");
  await viewMenu.locator("summary").click();
  await expect(viewMenu.getByRole("button", { name: "Page Setup", exact: true })).toBeVisible();
  await expect(viewMenu.getByRole("button", { name: /Grid snapping:/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "mobile layout should not overflow horizontally").toBeTruthy();
  await page.screenshot({ path: testInfo.outputPath("mobile-more-sheet.png"), fullPage: true });
});
