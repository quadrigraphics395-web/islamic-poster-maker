import { expect, test } from "@playwright/test";

test("curve flyout draws an editable Bézier path and exposes node editing and vector SVG export", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-edge", "Left toolbox interactions run on desktop.");
  await page.goto("/");
  await expect(page.locator(".editor-page")).toBeVisible();
  await expect(page.locator(".poster-canvas")).toBeVisible();
  const pageSetup = page.getByRole("dialog", { name: "Page Setup" });
  if (await pageSetup.isVisible()) await pageSetup.getByRole("button", { name: "Close Page Setup" }).click();

  const toolbox = page.getByRole("complementary", { name: "Drawing and editing tools" });
  await toolbox.getByRole("button", { name: "Bézier tool" }).click();

  const canvas = page.locator(".poster-canvas");
  const bounds = await canvas.boundingBox();
  await page.mouse.click(bounds.x + bounds.width * 0.25, bounds.y + bounds.height * 0.3);
  await page.mouse.click(bounds.x + bounds.width * 0.5, bounds.y + bounds.height * 0.25);
  await page.mouse.click(bounds.x + bounds.width * 0.75, bounds.y + bounds.height * 0.3);
  await expect(page.locator(".vector-drawing-preview path")).toHaveAttribute("d", /C/);
  await page.mouse.click(bounds.x + bounds.width * 0.25, bounds.y + bounds.height * 0.3);
  await expect(page.locator(".vector-drawing-preview")).toHaveCount(0);

  const vector = page.locator('.canvas-control-object[data-object-id^="vector-"]').last();
  await expect(vector.locator("svg path")).toHaveAttribute("d", /C.*Z/);
  const vectorMenu = page.locator("#editor-menu-vector");
  const downloadPromise = page.waitForEvent("download");
  if (!(await vectorMenu.evaluate((element) => element.open))) await vectorMenu.locator("summary").click();
  await vectorMenu.getByRole("button", { name: "Export selected vector as editable SVG" }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  expect(Buffer.concat(chunks).toString()).toMatch(/<path[^>]+ d="[^"]*C/);

  await toolbox.getByRole("button", { name: "Shape / Node editing tool" }).click();
  await expect(vector.locator(".vector-node-overlay .vector-node")).toHaveCount(3);
  const firstHandle = vector.locator(".vector-node-handle").first();
  const handleBox = await firstHandle.boundingBox();
  const beforeHandleMove = await vector.locator("svg path").getAttribute("d");
  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(handleBox.x + handleBox.width / 2 + 12, handleBox.y + handleBox.height / 2 - 9);
  await page.mouse.up();
  await expect(vector.locator("svg path")).not.toHaveAttribute("d", beforeHandleMove);
  const firstNode = vector.locator(".vector-node").first();
  const nodeBox = await firstNode.boundingBox();
  await page.mouse.move(nodeBox.x + nodeBox.width / 2, nodeBox.y + nodeBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(nodeBox.x + nodeBox.width / 2 + 16, nodeBox.y + nodeBox.height / 2 + 8);
  await page.mouse.up();

  const context = page.locator(".editor-context-toolbar");
  await context.getByRole("button", { name: "Add node" }).click();
  await expect(vector.locator(".vector-node")).toHaveCount(4);
  await context.getByRole("button", { name: "Select all nodes" }).click();
  await context.getByLabel("Node type").selectOption("symmetrical");
  await expect(vector.locator(".vector-node.is-active")).toHaveCount(4);
  await vector.locator(".vector-node").first().click();
  await context.getByRole("button", { name: "Delete node" }).click();
  await expect(vector.locator(".vector-node")).toHaveCount(3);
});

test("Pen creates straight nodes, supports open-path finish and Escape cancels an unfinished draft", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-edge", "Left toolbox interactions run on desktop.");
  await page.goto("/");
  await expect(page.locator(".editor-page")).toBeVisible();
  const pageSetup = page.getByRole("dialog", { name: "Page Setup" });
  if (await pageSetup.isVisible()) await pageSetup.getByRole("button", { name: "Close Page Setup" }).click();

  const toolbox = page.getByRole("complementary", { name: "Drawing and editing tools" });
  await toolbox.getByRole("button", { name: "Pen tool" }).click();
  const canvas = page.locator(".poster-canvas");
  const bounds = await canvas.boundingBox();
  await page.mouse.click(bounds.x + bounds.width * 0.2, bounds.y + bounds.height * 0.4);
  await page.keyboard.press("Escape");
  await expect(page.locator(".vector-drawing-preview")).toHaveCount(0);

  await toolbox.getByRole("button", { name: "Pen tool" }).click();
  await page.mouse.click(bounds.x + bounds.width * 0.2, bounds.y + bounds.height * 0.4);
  await page.mouse.click(bounds.x + bounds.width * 0.8, bounds.y + bounds.height * 0.6);
  await expect(page.locator(".vector-drawing-preview path")).toHaveAttribute("d", / L /);
  await page.keyboard.press("Enter");
  await expect(page.locator('.canvas-control-object[data-object-id^="vector-"] svg path').last()).toHaveAttribute("d", /M .* L /);
});

test("mobile Vector navigation exposes Pen, Bézier, and node editing", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-edge-emulated", "This check covers the mobile tool navigation.");
  await page.goto("/");
  await expect(page.locator(".editor-page")).toBeVisible();
  const pageSetup = page.getByRole("dialog", { name: "Page Setup" });
  if (await pageSetup.isVisible()) await pageSetup.getByRole("button", { name: "Close Page Setup" }).click();
  const vectorMenu = page.locator("#editor-menu-vector");
  if (!(await vectorMenu.evaluate((element) => element.open))) await vectorMenu.locator("summary").click();
  await expect(vectorMenu.getByRole("button", { name: "Bézier", exact: true })).toBeVisible();
  await expect(vectorMenu.getByRole("button", { name: "Pen", exact: true })).toBeVisible();
  await expect(vectorMenu.getByRole("button", { name: "Shape / Node" })).toBeDisabled();
});
