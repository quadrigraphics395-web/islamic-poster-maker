import { expect, test } from "@playwright/test";

const pixelPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=",
  "base64",
);

async function openEditor(page) {
  await page.goto("/");
  await page.getByRole("button", { name: /Create New Poster/ }).click();
  const setup = page.getByRole("dialog", { name: "Page Setup" });
  if (await setup.isVisible()) await setup.getByRole("button", { name: "Close Page Setup" }).click();
  await expect(page.locator(".poster-canvas")).toBeVisible();
}

async function drawRectangle(page, xFraction = 0.22, yFraction = 0.2) {
  if (page.viewportSize().width <= 600) {
    const vectorMenu = page.locator("#editor-menu-vector");
    if (!(await vectorMenu.evaluate((element) => element.open))) await vectorMenu.locator("summary").click();
    await vectorMenu.getByRole("button", { name: "Rectangle", exact: true }).click();
  } else {
    await page.getByRole("button", { name: "Rectangle tool" }).click();
  }
  const canvas = page.locator(".poster-canvas");
  const bounds = await canvas.boundingBox();
  await page.mouse.move(bounds.x + bounds.width * xFraction, bounds.y + bounds.height * yFraction);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * (xFraction + 0.18), bounds.y + bounds.height * (yFraction + 0.17));
  await page.mouse.up();
  return page.locator('.canvas-control-object[data-object-id^="shape-"]').last();
}

function visiblePalette(page) {
  return page.locator(".qadri-color-palette:visible").first();
}

async function selectColorTarget(palette, target) {
  await palette.getByRole("button", { name: target, exact: true }).click();
}

test("desktop palette updates selected shapes, text, and image outline with undo and redo", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop-edge", "Desktop color rail interaction.");
  await openEditor(page);
  const palette = visiblePalette(page);
  await expect(palette).toBeVisible();

  const rectangle = await drawRectangle(page);
  const rect = rectangle.locator(".canvas-primitive-vector rect");
  await selectColorTarget(palette, "Fill");
  await palette.getByRole("button", { name: "Fill Red" }).click();
  await expect(rect).toHaveAttribute("fill", "#e53935");
  await selectColorTarget(palette, "Outline");
  await palette.getByRole("button", { name: "Outline Blue" }).click();
  await expect(rect).toHaveAttribute("stroke", "#2875d2");
  await page.getByRole("button", { name: "Undo", exact: true }).first().click();
  await expect(rect).toHaveAttribute("stroke", "#17352c");
  await page.getByRole("button", { name: "Redo", exact: true }).first().click();
  await expect(rect).toHaveAttribute("stroke", "#2875d2");

  const add = page.locator("#editor-menu-add");
  if (!(await add.evaluate((element) => element.open))) await add.locator("summary").click();
  await add.getByRole("button", { name: "Add Text", exact: true }).click();
  const textFill = page.locator(".canvas-control-object .canvas-text-fill").last();
  await selectColorTarget(palette, "Fill");
  await palette.getByRole("button", { name: "Fill Green" }).click();
  await expect.poll(() => textFill.evaluate((element) => getComputedStyle(element).color)).toBe("rgb(35, 132, 74)");
  await selectColorTarget(palette, "Outline");
  await palette.getByRole("button", { name: "Outline Purple" }).click();
  const textOutline = page.locator(".canvas-control-object .canvas-text-outline").last();
  await expect.poll(() => textOutline.evaluate((element) => element.style.textShadow)).toContain("rgb(133, 76, 184)");

  await page.locator('input[type="file"][accept="image/*"]').first().setInputFiles({
    name: "palette-pixel.png", mimeType: "image/png", buffer: pixelPng,
  });
  const imageObject = page.locator('.canvas-control-object[data-object-id^="image-"]').last();
  await expect(page.locator('.canvas-art-object[data-object-id^="image-"]').last().locator("img")).toBeVisible();
  await selectColorTarget(palette, "Fill");
  await expect(palette.getByRole("button", { name: "Fill Red" })).toBeDisabled();
  await selectColorTarget(palette, "Outline");
  await palette.getByRole("button", { name: "Outline Teal" }).click();
  await expect(imageObject.locator("feFlood")).toHaveAttribute("flood-color", "#168c8c");
});

test("contour creates editable bands and undo/redo restores the generated objects", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop-edge", "Desktop contour generation workflow.");
  await openEditor(page);
  await drawRectangle(page);
  const source = page.locator('.canvas-control-object[data-object-id^="shape-"]').last();
  const tools = page.getByRole("complementary", { name: "Drawing and editing tools" });
  await tools.getByRole("button", { name: "Open advanced vector tools" }).click();
  await page.getByRole("group", { name: "Advanced vector tools" }).getByRole("button", { name: "Contour", exact: true }).click();
  await page.locator(".editor-context-toolbar").getByRole("button", { name: "Create Contour", exact: true }).click();
  const contour = page.locator('.canvas-control-object[data-object-id^="contour-"]').first();
  await expect(contour).toBeVisible();
  await expect(contour.locator(".canvas-custom-vector path")).toBeAttached();
  const originalContourId = await contour.getAttribute("data-object-id");
  const originalContourPath = await contour.locator(".canvas-custom-vector path").getAttribute("d");
  await page.locator(".editor-context-toolbar").getByLabel("Contour distance").fill("20");
  await expect.poll(async () => page.locator('.canvas-control-object[data-object-id^="contour-"]').first().getAttribute("data-object-id")).not.toBe(originalContourId);
  await expect.poll(async () => page.locator('.canvas-control-object[data-object-id^="contour-"]').first().locator(".canvas-custom-vector path").getAttribute("d")).not.toBe(originalContourPath);
  await page.getByRole("button", { name: "Undo", exact: true }).first().click();
  await expect(page.locator(`.canvas-control-object[data-object-id="${originalContourId}"]`)).toBeVisible();
  await expect(source).toBeVisible();
  await page.getByRole("button", { name: "Redo", exact: true }).first().click();
  await expect(page.locator('.canvas-control-object[data-object-id^="contour-"]').first()).not.toHaveAttribute("data-object-id", originalContourId);
});

test("blend creates editable intermediate vectors and step changes regenerate with history", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop-edge", "Desktop blend generation workflow.");
  await openEditor(page);
  await drawRectangle(page, 0.16, 0.18);
  await drawRectangle(page, 0.62, 0.58);
  const shapes = page.locator(".canvas-control-object[data-object-id^='shape-']");
  const ids = await shapes.evaluateAll((items) => items.map((element) => element.getAttribute("data-object-id")));
  const arrange = page.locator("#editor-menu-arrange");
  if (!(await arrange.evaluate((element) => element.open))) await arrange.locator("summary").click();
  await page.locator("#toolbar-canvas-layers").selectOption(ids);
  await expect.poll(() => page.locator("#toolbar-canvas-layers").evaluate((element) => element.selectedOptions.length)).toBe(2);
  const tools = page.getByRole("complementary", { name: "Drawing and editing tools" });
  await tools.getByRole("button", { name: "Open advanced vector tools" }).click();
  await page.getByRole("group", { name: "Advanced vector tools" }).getByRole("button", { name: "Blend", exact: true }).click();
  await page.locator(".editor-context-toolbar").getByRole("button", { name: "Create Blend", exact: true }).click();
  const blends = page.locator('.canvas-control-object[data-object-id^="blend-"]');
  await expect(blends).toHaveCount(4);
  await expect(blends.first().locator(".canvas-custom-vector path")).toBeAttached();
  await page.locator(".editor-context-toolbar").getByLabel("Blend steps").fill("2");
  await expect(blends).toHaveCount(2);
  await page.getByRole("button", { name: "Undo", exact: true }).first().click();
  await expect(blends).toHaveCount(4);
  await page.getByRole("button", { name: "Redo", exact: true }).first().click();
  await expect(blends).toHaveCount(2);
});

test("zoom exceeds 300 percent, wheel zoom stays anchored, and Fit Selection centers the object", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop-edge", "Desktop zoom and fit workflow.");
  await openEditor(page);
  const rectangle = await drawRectangle(page, 0.18, 0.18);
  const position = page.getByLabel("Selected object X position");
  await position.fill("26");
  await position.blur();
  const wrap = page.locator(".canvas-wrap");
  const wrapBox = await wrap.boundingBox();
  const objectBox = await rectangle.boundingBox();
  const pointer = { x: objectBox.x + objectBox.width / 2, y: objectBox.y + objectBox.height / 2 };
  const beforeWheel = Number((await page.locator(".zoom-readout").textContent()).replace("%", ""));
  await page.mouse.move(pointer.x, pointer.y);
  await page.mouse.wheel(0, -180);
  await expect.poll(async () => Number((await page.locator(".zoom-readout").textContent()).replace("%", ""))).toBeGreaterThan(beforeWheel);
  const afterWheel = await rectangle.boundingBox();
  expect(Math.abs(afterWheel.x + afterWheel.width / 2 - pointer.x)).toBeLessThan(4);
  expect(Math.abs(afterWheel.y + afterWheel.height / 2 - pointer.y)).toBeLessThan(4);

  for (let index = 0; index < 10; index += 1) await page.getByRole("button", { name: "Zoom in", exact: true }).last().click();
  await expect.poll(async () => Number((await page.locator(".zoom-readout").textContent()).replace("%", ""))).toBeGreaterThan(300);
  await page.getByRole("button", { name: "Fit Selection", exact: true }).click();
  const fittedObject = await rectangle.boundingBox();
  const fittedWrap = await wrap.boundingBox();
  expect(Math.abs(fittedObject.x + fittedObject.width / 2 - fittedWrap.x - fittedWrap.width / 2)).toBeLessThan(4);
  expect(Math.abs(fittedObject.y + fittedObject.height / 2 - fittedWrap.y - fittedWrap.height / 2)).toBeLessThan(4);
  expect(fittedObject.width).toBeLessThan(fittedWrap.width * 0.9);
  expect(fittedObject.height).toBeLessThan(fittedWrap.height * 0.9);
  expect(wrapBox).not.toBeNull();

  const zoomPoint = { x: fittedWrap.x + fittedWrap.width * 0.28, y: fittedWrap.y + fittedWrap.height / 2 };
  const centerBeforeClick = { x: fittedObject.x + fittedObject.width / 2, y: fittedObject.y + fittedObject.height / 2 };
  const scaleBeforeClick = await page.locator(".poster-canvas").evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).a);
  await page.getByRole("button", { name: "Zoom tool" }).click();
  await page.mouse.click(zoomPoint.x, zoomPoint.y);
  await expect.poll(() => page.locator(".poster-canvas").evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).a)).toBeGreaterThan(scaleBeforeClick);
  const afterClickZoom = await rectangle.boundingBox();
  expect(Math.abs(afterClickZoom.x + afterClickZoom.width / 2 - (zoomPoint.x + (centerBeforeClick.x - zoomPoint.x) * 1.2))).toBeLessThan(5);
  expect(Math.abs(afterClickZoom.y + afterClickZoom.height / 2 - centerBeforeClick.y)).toBeLessThan(5);
});

test("mobile palette is available and two-finger pinch changes canvas zoom", async ({ page }, info) => {
  test.skip(info.project.name !== "mobile-edge-emulated", "Mobile vector palette and pinch gesture.");
  await openEditor(page);
  const vectorMenu = page.locator("#editor-menu-vector");
  if (!(await vectorMenu.evaluate((element) => element.open))) await vectorMenu.locator("summary").click();
  const palette = visiblePalette(page);
  await expect(palette).toBeVisible();
  await expect(palette.getByRole("button", { name: "Fill Red" })).toBeVisible();
  await vectorMenu.locator("summary").click();

  const rectangle = await drawRectangle(page, 0.28, 0.25);
  if (!(await vectorMenu.evaluate((element) => element.open))) await vectorMenu.locator("summary").click();
  await vectorMenu.getByRole("button", { name: "Select", exact: true }).click();
  const objectBox = await rectangle.boundingBox();
  const focalPoint = { x: objectBox.x + objectBox.width / 2, y: objectBox.y + objectBox.height / 2 };
  const beforeZoom = Number((await page.locator(".zoom-readout").textContent()).replace("%", ""));
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [
    { id: 1, x: focalPoint.x - 25, y: focalPoint.y, radiusX: 1, radiusY: 1, force: 1 },
    { id: 2, x: focalPoint.x + 25, y: focalPoint.y, radiusX: 1, radiusY: 1, force: 1 },
  ] });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [
    { id: 1, x: focalPoint.x - 70, y: focalPoint.y, radiusX: 1, radiusY: 1, force: 1 },
    { id: 2, x: focalPoint.x + 70, y: focalPoint.y, radiusX: 1, radiusY: 1, force: 1 },
  ] });
  await expect.poll(async () => Number((await page.locator(".zoom-readout").textContent()).replace("%", ""))).toBeGreaterThan(beforeZoom);
  const afterPinch = await rectangle.boundingBox();
  expect(Math.abs(afterPinch.x + afterPinch.width / 2 - focalPoint.x)).toBeLessThan(5);
  expect(Math.abs(afterPinch.y + afterPinch.height / 2 - focalPoint.y)).toBeLessThan(5);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await cdp.detach();
  await page.getByRole("button", { name: "Fit Selection", exact: true }).click();
  const fittedObject = await rectangle.boundingBox();
  const fittedWrap = await page.locator(".canvas-wrap").boundingBox();
  expect(Math.abs(fittedObject.x + fittedObject.width / 2 - fittedWrap.x - fittedWrap.width / 2)).toBeLessThan(5);
  expect(Math.abs(fittedObject.y + fittedObject.height / 2 - fittedWrap.y - fittedWrap.height / 2)).toBeLessThan(5);
});
