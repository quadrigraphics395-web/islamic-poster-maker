import { expect, test } from "@playwright/test";

async function openEditor(page) {
  await page.goto("/");
  await page.getByRole("button", { name: /Create New Poster/ }).click();
  const setup = page.getByRole("dialog", { name: "Page Setup" });
  if (await setup.isVisible()) await setup.getByRole("button", { name: "Close Page Setup" }).click();
  await expect(page.locator(".poster-canvas")).toBeVisible();
}

test("draw rectangle, ellipse, and polygon, convert to curves, and edit nodes", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop-edge", "Canvas drawing workflow runs on desktop.");
  await openEditor(page);
  const canvas = page.locator(".poster-canvas");
  const bounds = await canvas.boundingBox();
  const toolbox = page.getByRole("complementary", { name: "Drawing and editing tools" });
  for (const [index, shape] of ["Rectangle", "Ellipse", "Polygon"].entries()) {
    await toolbox.getByRole("button", { name: `${shape} tool` }).click();
    const left = 0.12 + index * 0.28;
    await page.mouse.move(bounds.x + bounds.width * left, bounds.y + bounds.height * 0.18);
    await page.mouse.down();
    await page.mouse.move(bounds.x + bounds.width * (left + 0.16), bounds.y + bounds.height * 0.36);
    await page.mouse.up();
    const object = page.locator('.canvas-control-object[data-object-id^="shape-"]').last();
    await expect(object.locator(".canvas-primitive-vector")).toBeAttached();
    await page.locator(".editor-context-toolbar").getByRole("button", { name: "Convert to Curves" }).click();
    await toolbox.getByRole("button", { name: "Shape / Node editing tool" }).click();
    await expect(object.locator(".vector-node-overlay .vector-node")).toHaveCount(shape === "Polygon" ? 6 : 4);
    const path = object.locator("svg path").first();
    const before = await path.getAttribute("d");
    const node = object.locator(".vector-node").first();
    const nodeBox = await node.boundingBox();
    await page.mouse.move(nodeBox.x + nodeBox.width / 2, nodeBox.y + nodeBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(nodeBox.x + nodeBox.width / 2 + 12, nodeBox.y + nodeBox.height / 2 + 10);
    await page.mouse.up();
    await expect(path).not.toHaveAttribute("d", before);
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(path).toHaveAttribute("d", before);
    await page.getByRole("button", { name: "Redo", exact: true }).click();
    await expect(path).not.toHaveAttribute("d", before);
  }
});

test("mobile Vector menu exposes primitive drawing and advanced vector actions", async ({ page }, info) => {
  test.skip(info.project.name !== "mobile-edge-emulated", "This check covers mobile tool navigation.");
  await openEditor(page);
  const menu = page.locator("#editor-menu-vector");
  if (!(await menu.evaluate((el) => el.open))) await menu.locator("summary").click();
  for (const label of ["Rectangle", "Ellipse", "Polygon", "Contour", "Blend", "Knife"]) {
    await expect(menu.getByRole("button", { name: label, exact: true })).toBeVisible();
  }
});
