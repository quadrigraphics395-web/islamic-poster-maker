import { expect, test } from "@playwright/test";

const pixelPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=",
  "base64",
);

async function dragBottomRightHandle(page, object, dx = 60, dy = 48) {
  const marker = await object.locator(".resize-handle--bottom-right .resize-handle-visual").boundingBox();
  const start = { x: marker.x + marker.width / 2 + 8, y: marker.y + marker.height / 2 + 8 };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + dx, start.y + dy);
  await page.mouse.up();
}

async function openPageSettings(page, projectName) {
  if (projectName === "mobile-edge-emulated") await page.locator(".document-size-trigger").click();
  else await page.locator(".page-setup-action").click();
  return page.getByRole("dialog", { name: "Page Setup" });
}

async function drawShape(page, shape, start = [0.28, 0.24], end = [0.48, 0.43]) {
  if (page.viewportSize().width <= 600) {
    const menu = page.locator("#editor-menu-vector");
    if (!(await menu.evaluate((element) => element.open))) await menu.locator("summary").click();
    await menu.getByRole("button", { name: shape, exact: true }).click();
  } else {
    const toolbox = page.getByRole("complementary", { name: "Drawing and editing tools" });
    await toolbox.getByRole("button", { name: `${shape} tool` }).click();
  }
  const canvas = page.locator(".poster-canvas");
  const bounds = await canvas.boundingBox();
  await page.mouse.move(bounds.x + bounds.width * start[0], bounds.y + bounds.height * start[1]);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * end[0], bounds.y + bounds.height * end[1]);
  await page.mouse.up();
  const object = page.locator('.canvas-control-object[data-object-id^="shape-"]').last();
  await expect(object).toBeVisible();
  await expect(object.locator(".resize-handle")).toHaveCount(4);
  return object;
}

async function createSelectedGroup(page) {
  const mobile = page.viewportSize().width <= 600;
  await drawShape(page, "Rectangle", [0.25, 0.30], [0.29, 0.34]);
  const vectorMenu = page.locator("#editor-menu-vector");
  if (mobile) {
    if (!(await vectorMenu.evaluate((element) => element.open))) await vectorMenu.locator("summary").click();
    await vectorMenu.getByRole("button", { name: "Select", exact: true }).click();
  } else {
    await page.getByRole("button", { name: "Pan tool" }).click();
    await page.getByRole("button", { name: "Pan tool" }).click();
  }
  const pageCanvas = page.locator(".poster-canvas");
  const blankBounds = await pageCanvas.boundingBox();
  await page.mouse.click(blankBounds.x + blankBounds.width * 0.85, blankBounds.y + blankBounds.height * 0.85);
  await drawShape(page, "Ellipse", [0.33, 0.38], [0.37, 0.42]);
  if (!(await vectorMenu.evaluate((element) => element.open))) await vectorMenu.locator("summary").click();
  await vectorMenu.getByRole("button", { name: "Multi-select", exact: true }).click();
  const canvas = page.locator(".poster-canvas");
  const bounds = await canvas.boundingBox();
  await page.mouse.move(bounds.x + bounds.width * 0.08, bounds.y + bounds.height * 0.08);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * 0.72, bounds.y + bounds.height * 0.74);
  await page.mouse.up();
  await expect(page.locator(".canvas-control-object.is-selected")).toHaveCount(2);
  if (mobile) {
    const arrangeMenu = page.locator("#editor-menu-arrange");
    if (!(await arrangeMenu.evaluate((element) => element.open))) await arrangeMenu.locator("summary").click();
    await arrangeMenu.getByRole("button", { name: "Group", exact: true }).click();
  } else await page.locator('button[title="Group selected objects"]').click();
  const group = page.locator('.canvas-control-object.is-group-container').last();
  await expect(group.locator(".group-selection-outline .resize-handle")).toHaveCount(4);
  return group;
}

async function dragGroupCorner(page, group, corner, zoom) {
  const signs = {
    "top-left": [-1, -1],
    "top-right": [1, -1],
    "bottom-left": [-1, 1],
    "bottom-right": [1, 1],
  };
  const opposite = {
    "top-left": "bottom-right",
    "top-right": "bottom-left",
    "bottom-left": "top-right",
    "bottom-right": "top-left",
  };
  const [signX, signY] = signs[corner];
  const visual = (name) => group.locator(`.group-selection-outline .resize-handle--${name} .resize-handle-visual`);
  const oppositeBefore = await visual(opposite[corner]).boundingBox();
  const handle = await visual(corner).boundingBox();
  const { direction, pageZoom } = await group.evaluate((element) => {
    const transform = new DOMMatrix(getComputedStyle(element).transform);
    const zoom = new DOMMatrix(getComputedStyle(document.querySelector(".poster-canvas")).transform).a;
    return { direction: { a: transform.a, b: transform.b, c: transform.c, d: transform.d }, pageZoom: zoom };
  });
  const vectorX = direction.a * signX + direction.c * signY;
  const vectorY = direction.b * signX + direction.d * signY;
  const vectorLength = Math.hypot(vectorX, vectorY) || 1;
  const unitX = vectorX / vectorLength;
  const unitY = vectorY / vectorLength;
  const start = { x: handle.x + handle.width / 2 + unitX * 10, y: handle.y + handle.height / 2 + unitY * 10 };
  const before = await group.evaluate((element) => ({ width: element.offsetWidth, height: element.offsetHeight }));
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + unitX * 24 * pageZoom, start.y + unitY * 24 * pageZoom);
  await page.mouse.up();
  await expect.poll(() => group.evaluate((element) => element.offsetWidth)).toBeGreaterThan(before.width + 2);
  await expect.poll(() => group.evaluate((element) => element.offsetHeight)).toBeGreaterThan(before.height + 2);
  const oppositeAfter = await visual(opposite[corner]).boundingBox();
  const screenTolerance = Math.max(2, zoom * 2);
  expect(Math.abs(oppositeAfter.x + oppositeAfter.width / 2 - oppositeBefore.x - oppositeBefore.width / 2)).toBeLessThan(screenTolerance);
  expect(Math.abs(oppositeAfter.y + oppositeAfter.height / 2 - oppositeBefore.y - oppositeBefore.height / 2)).toBeLessThan(screenTolerance);
  expect(zoom).toBeGreaterThan(0);
}

async function assertHandlesMatchTransformedCorners(object) {
  const expected = await object.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const transform = new DOMMatrix(getComputedStyle(element).transform);
    const pageZoom = new DOMMatrix(getComputedStyle(document.querySelector(".poster-canvas")).transform).a;
    const width = element.offsetWidth;
    const height = element.offsetHeight;
    const markerBounds = 12 * (Math.abs(transform.a) + Math.abs(transform.b));
    const corners = {
      "top-left": [-width / 2, -height / 2],
      "top-right": [width / 2, -height / 2],
      "bottom-left": [-width / 2, height / 2],
      "bottom-right": [width / 2, height / 2],
    };
    return Object.fromEntries(Object.entries(corners).map(([name, [x, y]]) => [name, {
      x: rect.left + rect.width / 2 + (transform.a * x + transform.c * y) * pageZoom,
      y: rect.top + rect.height / 2 + (transform.b * x + transform.d * y) * pageZoom,
      zoom: pageZoom,
      markerBounds,
    }]));
  });
  for (const [corner, point] of Object.entries(expected)) {
    const visual = object.locator(`.resize-handle--${corner} .resize-handle-visual`).first();
    const box = await visual.boundingBox();
    expect(box, `${corner} visual handle`).not.toBeNull();
    expect(Math.abs(box.x + box.width / 2 - point.x), `${corner} x alignment`).toBeLessThan(1.6);
    expect(Math.abs(box.y + box.height / 2 - point.y), `${corner} y alignment`).toBeLessThan(1.6);
    expect(Math.abs(box.width - point.markerBounds), `${corner} screen-space width at ${point.zoom}x`).toBeLessThan(1.6);
    expect(Math.abs(box.height - point.markerBounds), `${corner} screen-space height at ${point.zoom}x`).toBeLessThan(1.6);
  }
}

async function zoomTo(page, target) {
  const canvas = page.locator(".poster-canvas");
  const readZoom = () => canvas.evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).a);
  let current = await readZoom();
  for (let count = 0; count < 40 && current < target * 0.98; count += 1) {
    await page.getByRole("button", { name: "Zoom in", exact: true }).last().click();
    current = await readZoom();
  }
  for (let count = 0; count < 40 && current > target * 1.02; count += 1) {
    await page.getByRole("button", { name: "Zoom out", exact: true }).last().click();
    current = await readZoom();
  }
  expect(Math.abs(current - target)).toBeLessThan(target * 0.24);
  return current;
}

test("startup opens the editable A4 portrait editor and the landing page remains reachable", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".editor-page")).toBeVisible();
  await expect(page.locator(".poster-canvas")).toBeVisible();
  await expect(page.locator(".stage-heading")).toContainText("210 × 297 mm");
  await expect(page.locator(".page-ruler-layer")).toHaveAttribute("aria-label", "Page rulers in mm");
  if (page.viewportSize().width <= 600) {
    const vectorMenu = page.locator("#editor-menu-vector");
    if (!(await vectorMenu.evaluate((element) => element.open))) await vectorMenu.locator("summary").click();
    await expect(vectorMenu.getByRole("button", { name: "Rectangle", exact: true })).toBeVisible();
  } else {
    await expect(page.getByRole("complementary", { name: "Drawing and editing tools" })).toBeVisible();
  }

  await page.locator(".back-btn").click();
  await expect(page.locator(".hero")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Published Templates" })).toBeVisible();
  await page.getByRole("button", { name: /Create New Poster/ }).click();
  await expect(page.locator(".editor-page")).toBeVisible();
  const settings = page.getByRole("dialog", { name: "Page Setup" });
  await expect(settings).toBeVisible();
  await expect(settings.locator("#page-orientation")).toHaveValue("portrait");
  await expect(settings.locator("#mobile-canvas-unit")).toHaveValue("mm");
  await expect(settings.locator(".size-picker-physical")).toHaveText("210 × 297 mm");
});

test("page size converts through mm, cm, inches and feet, with orientation and custom dimensions", async ({ page }, info) => {
  await page.goto("/");
  await expect(page.locator(".poster-canvas")).toBeVisible();
  const settings = await openPageSettings(page, info.project.name);
  await expect(settings.locator(".size-picker-physical")).toHaveText("210 × 297 mm");
  await expect(settings.locator("#mobile-canvas-size")).toHaveValue("A4 Portrait");

  await settings.locator("#mobile-canvas-unit").selectOption("cm");
  await expect(settings.locator(".size-picker-physical")).toHaveText("21 × 29.7 cm");
  await settings.locator("#mobile-canvas-unit").selectOption("in");
  await expect(settings.locator(".size-picker-physical")).toHaveText("8.2677 × 11.6929 in");
  await settings.locator("#mobile-canvas-unit").selectOption("ft");
  await expect(settings.locator(".size-picker-physical")).toHaveText("0.68898 × 0.97441 ft");
  await settings.locator("#mobile-canvas-unit").selectOption("mm");
  await expect(settings.locator(".size-picker-physical")).toHaveText("210 × 297 mm");

  await settings.locator("#page-orientation").selectOption("landscape");
  await expect(settings.locator("#mobile-canvas-size")).toHaveValue("A4 Landscape");
  await expect(settings.locator(".size-picker-physical")).toHaveText("297 × 210 mm");
  await settings.locator("#mobile-canvas-size").selectOption("Custom");
  await expect(settings.getByLabel("Custom width in mm")).toHaveValue("297");
  await expect(settings.getByLabel("Custom height in mm")).toHaveValue("210");
  await settings.getByLabel("Custom width in mm").fill("300");
  await settings.getByLabel("Custom height in mm").fill("210");
  await expect(settings.locator(".size-picker-physical")).toHaveText("300 × 210 mm");

  await settings.locator("#mobile-canvas-unit").selectOption("cm");
  await expect(settings.getByLabel("Custom width in cm")).toHaveValue("30");
  await expect(settings.getByLabel("Custom height in cm")).toHaveValue("21");
  await settings.locator("#mobile-canvas-unit").selectOption("in");
  await expect(settings.getByLabel("Custom width in in")).toHaveValue("11.811");
  await settings.locator("#mobile-canvas-unit").selectOption("ft");
  await expect(settings.getByLabel("Custom width in ft")).toHaveValue("0.98425");
  await settings.locator("#mobile-canvas-unit").selectOption("mm");
  await expect(settings.getByLabel("Custom width in mm")).toHaveValue("300");
  await settings.locator("#page-orientation").selectOption("portrait");
  await expect(settings.locator(".size-picker-physical")).toHaveText("210 × 300 mm");
  await expect(page.locator(".page-ruler-layer")).toHaveAttribute("aria-label", "Page rulers in mm");
  await settings.getByRole("button", { name: "Apply & Close" }).click();
});

test("saved custom page measurements survive a new document and reopening the browser library project", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop-edge", "Project save and reopen runs on desktop.");
  await page.goto("/");
  const settings = await openPageSettings(page, info.project.name);
  await settings.locator("#mobile-canvas-size").selectOption("Custom");
  await settings.getByLabel("Custom width in mm").fill("300");
  await settings.getByLabel("Custom height in mm").fill("210");
  await settings.getByRole("button", { name: "Apply & Close" }).click();

  const fileMenu = page.locator("#editor-menu-project");
  if (!(await fileMenu.evaluate((element) => element.open))) await fileMenu.locator("summary").click();
  await fileMenu.getByRole("button", { name: "Save to Browser Library" }).click();
  const projectDialog = page.getByRole("dialog", { name: "Save & manage projects" });
  await projectDialog.getByLabel("Project name").fill("Phase 3 measurement fixture");
  await projectDialog.getByRole("button", { name: "Save project" }).click();
  await expect(projectDialog.locator(".project-card")).toContainText("Phase 3 measurement fixture");
  await projectDialog.getByRole("button", { name: "Done" }).click();

  if (!(await fileMenu.evaluate((element) => element.open))) await fileMenu.locator("summary").click();
  page.once("dialog", (dialog) => dialog.accept());
  await fileMenu.getByRole("button", { name: "New Project" }).click();
  await page.getByRole("button", { name: "Apply & Close" }).click();
  if (!(await fileMenu.evaluate((element) => element.open))) await fileMenu.locator("summary").click();
  await fileMenu.getByRole("button", { name: "My Projects" }).click();
  const savedProject = page.locator(".project-card").filter({ hasText: "Phase 3 measurement fixture" });
  await savedProject.getByRole("button", { name: "Open" }).click();
  await expect(page.locator(".stage-heading")).toContainText("300 × 210 mm");
  await expect(page.locator(".page-ruler-layer")).toHaveAttribute("aria-label", "Page rulers in mm");
});

test("resizing keeps the opposite corner fixed and transformed handles aligned through zoom, pan and rotation", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop-edge", "Pointer resize matrix runs on desktop.");
  await page.goto("/");
  const object = await drawShape(page, "Rectangle");
  const rotation = page.getByLabel("Selected object rotation");
  await rotation.fill("31");
  await rotation.dispatchEvent("change");
  await expect(object).toHaveCSS("transform", /matrix/);

  for (const zoom of [0.5, 1, 3, 4]) {
    const appliedZoom = await zoomTo(page, zoom);
    await assertHandlesMatchTransformedCorners(object);
    if (zoom === 3) {
      const originalOpposite = await object.locator(".resize-handle--top-left .resize-handle-visual").boundingBox();
      const target = object.locator(".resize-handle--bottom-right .resize-handle-visual");
      const targetBox = await target.boundingBox();
      await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(targetBox.x + targetBox.width / 2 + appliedZoom * 18, targetBox.y + targetBox.height / 2 + appliedZoom * 14);
      await page.mouse.up();
      const resizedOpposite = await object.locator(".resize-handle--top-left .resize-handle-visual").boundingBox();
      expect(Math.abs(resizedOpposite.x + resizedOpposite.width / 2 - originalOpposite.x - originalOpposite.width / 2)).toBeLessThan(2);
      expect(Math.abs(resizedOpposite.y + resizedOpposite.height / 2 - originalOpposite.y - originalOpposite.height / 2)).toBeLessThan(2);
      await assertHandlesMatchTransformedCorners(object);
      await page.getByRole("button", { name: "Undo", exact: true }).first().click();
      await assertHandlesMatchTransformedCorners(object);
      await page.getByRole("button", { name: "Redo", exact: true }).first().click();
      await assertHandlesMatchTransformedCorners(object);
    }
  }

  await page.getByRole("button", { name: "Pan tool" }).click();
  const canvas = page.locator(".poster-canvas");
  const canvasBox = await canvas.boundingBox();
  await page.mouse.move(canvasBox.x + 18, canvasBox.y + 18);
  await page.mouse.down();
  await page.mouse.move(canvasBox.x + 46, canvasBox.y + 35);
  await page.mouse.up();
  await assertHandlesMatchTransformedCorners(object);
});

test("multi-selection resize keeps its opposite anchor through zoom, pan, offsets, all corners, and history", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop-edge", "Group resize coordinate matrix runs on desktop.");
  await page.goto("/");
  const group = await createSelectedGroup(page);
  await zoomTo(page, 3);
  const canvas = page.locator(".poster-canvas");
  const initialBounds = await canvas.boundingBox();
  expect(initialBounds.x).not.toBe(0);
  expect(initialBounds.y).not.toBe(0);
  const panPoint = await page.evaluate(() => {
    const canvasRect = document.querySelector(".poster-canvas").getBoundingClientRect();
    const left = Math.max(4, canvasRect.left + 4);
    const right = Math.min(window.innerWidth - 4, canvasRect.right - 4);
    const top = Math.max(4, canvasRect.top + 4);
    const bottom = Math.min(window.innerHeight - 4, canvasRect.bottom - 4);
    for (let y = top; y < bottom; y += 24) {
      for (let x = left; x < right; x += 24) {
        const target = document.elementFromPoint(x, y);
        if (!target?.closest(".poster-canvas")) continue;
        if (target?.closest(".canvas-control-object.is-group-container")) continue;
        return { x, y };
      }
    }
    return null;
  });
  expect(panPoint).not.toBeNull();
  await page.getByRole("button", { name: "Pan tool" }).click();
  await page.mouse.move(panPoint.x, panPoint.y);
  await page.mouse.down();
  await page.mouse.move(panPoint.x + 34, panPoint.y + 122);
  await page.mouse.up();
  await page.getByRole("button", { name: "Pan tool" }).click();
  await expect.poll(async () => {
    const bounds = await canvas.boundingBox();
    return Math.abs(bounds.x - initialBounds.x) + Math.abs(bounds.y - initialBounds.y);
  }).toBeGreaterThan(10);
  const pannedBounds = await canvas.boundingBox();
  expect(Math.abs(pannedBounds.x - initialBounds.x)).toBeGreaterThan(10);
  expect(Math.abs(pannedBounds.y - initialBounds.y)).toBeGreaterThan(10);

  for (const targetZoom of [3, 1, 0.5]) {
    const zoom = await zoomTo(page, targetZoom);
    for (const corner of ["top-left", "top-right", "bottom-left", "bottom-right"]) {
      const before = await group.evaluate((element) => ({ width: element.offsetWidth, height: element.offsetHeight }));
      await dragGroupCorner(page, group, corner, zoom);
      await assertHandlesMatchTransformedCorners(group);
      await page.getByRole("button", { name: "Undo", exact: true }).first().click();
      await expect.poll(() => group.evaluate((element) => element.offsetWidth)).toBeLessThan(before.width + 2);
      await expect.poll(() => group.evaluate((element) => element.offsetHeight)).toBeLessThan(before.height + 2);
      if (targetZoom === 3 && corner === "top-left") {
        await page.getByRole("button", { name: "Redo", exact: true }).first().click();
        await assertHandlesMatchTransformedCorners(group);
        await page.getByRole("button", { name: "Undo", exact: true }).first().click();
      }
    }
  }
});

test("mobile multi-selection stays aligned and touch-resizable after pinch zoom", async ({ page }, info) => {
  test.skip(info.project.name !== "mobile-edge-emulated", "Mobile group resize runs in mobile emulation.");
  await page.goto("/");
  const group = await createSelectedGroup(page);
  const vectorMenu = page.locator("#editor-menu-vector");
  if (!(await vectorMenu.evaluate((element) => element.open))) await vectorMenu.locator("summary").click();
  await vectorMenu.getByRole("button", { name: "Select", exact: true }).click();

  const bounds = await group.boundingBox();
  const focal = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [
    { id: 11, x: focal.x - 20, y: focal.y, radiusX: 1, radiusY: 1, force: 1 },
    { id: 12, x: focal.x + 20, y: focal.y, radiusX: 1, radiusY: 1, force: 1 },
  ] });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [
    { id: 11, x: focal.x - 55, y: focal.y, radiusX: 1, radiusY: 1, force: 1 },
    { id: 12, x: focal.x + 55, y: focal.y, radiusX: 1, radiusY: 1, force: 1 },
  ] });
  await expect.poll(() => page.locator(".poster-canvas").evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).a)).toBeGreaterThan(1);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await assertHandlesMatchTransformedCorners(group);

  const visual = group.locator(".group-selection-outline .resize-handle--bottom-right .resize-handle-visual");
  const marker = await visual.boundingBox();
  const start = { x: marker.x + marker.width / 2 + 20, y: marker.y + marker.height / 2 + 20 };
  const opposite = group.locator(".group-selection-outline .resize-handle--top-left .resize-handle-visual");
  const oppositeBefore = await opposite.boundingBox();
  const widthBefore = await group.evaluate((element) => element.offsetWidth);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [
    { id: 13, x: start.x, y: start.y, radiusX: 1, radiusY: 1, force: 1 },
  ] });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [
    { id: 13, x: start.x + 50, y: start.y + 45, radiusX: 1, radiusY: 1, force: 1 },
  ] });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect.poll(() => group.evaluate((element) => element.offsetWidth)).toBeGreaterThan(widthBefore + 2);
  const oppositeAfter = await opposite.boundingBox();
  expect(Math.abs(oppositeAfter.x + oppositeAfter.width / 2 - oppositeBefore.x - oppositeBefore.width / 2)).toBeLessThan(5);
  expect(Math.abs(oppositeAfter.y + oppositeAfter.height / 2 - oppositeBefore.y - oppositeBefore.height / 2)).toBeLessThan(5);
  await cdp.detach();
});

test("text and image resize calculations stay in canvas space at expanded zoom", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop-edge", "Text and image pointer resizing runs on desktop.");
  await page.goto("/");
  await zoomTo(page, 3);
  const addMenu = page.locator("#editor-menu-add");
  if (!(await addMenu.evaluate((element) => element.open))) await addMenu.locator("summary").click();
  await addMenu.getByRole("button", { name: "Add Text", exact: true }).click();
  const textObject = page.locator('.canvas-control-object[data-object-id^="text-"]').last();
  await expect(textObject.locator(".resize-handle")).toHaveCount(4);
  await assertHandlesMatchTransformedCorners(textObject);
  const fontSizeBefore = await textObject.locator(".canvas-text").evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
  await dragBottomRightHandle(page, textObject, 75, 60);
  await expect.poll(() => textObject.locator(".canvas-text").evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThan(fontSizeBefore);
  await assertHandlesMatchTransformedCorners(textObject);

  await page.locator('input[type="file"][accept="image/*"]').first().setInputFiles({
    name: "resize-pixel.png", mimeType: "image/png", buffer: pixelPng,
  });
  const imageObject = page.locator('.canvas-control-object[data-object-id^="image-"]').last();
  await expect(imageObject.locator(".resize-handle")).toHaveCount(4);
  await assertHandlesMatchTransformedCorners(imageObject);
  const imageWidthBefore = await imageObject.evaluate((element) => element.offsetWidth);
  await dragBottomRightHandle(page, imageObject, 75, 60);
  await expect.poll(() => imageObject.evaluate((element) => element.offsetWidth)).toBeGreaterThan(imageWidthBefore);
  await assertHandlesMatchTransformedCorners(imageObject);
});

test("touch resize handles remain aligned after pinch zoom on mobile", async ({ page }, info) => {
  test.skip(info.project.name !== "mobile-edge-emulated", "Touch resize runs in mobile emulation.");
  await page.goto("/");
  const object = await drawShape(page, "Ellipse");
  const menu = page.locator("#editor-menu-vector");
  if (!(await menu.evaluate((element) => element.open))) await menu.locator("summary").click();
  await menu.getByRole("button", { name: "Select", exact: true }).click();
  const bounds = await object.boundingBox();
  const focal = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [
    { id: 1, x: focal.x - 24, y: focal.y, radiusX: 1, radiusY: 1, force: 1 },
    { id: 2, x: focal.x + 24, y: focal.y, radiusX: 1, radiusY: 1, force: 1 },
  ] });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [
    { id: 1, x: focal.x - 70, y: focal.y, radiusX: 1, radiusY: 1, force: 1 },
    { id: 2, x: focal.x + 70, y: focal.y, radiusX: 1, radiusY: 1, force: 1 },
  ] });
  await expect.poll(() => page.locator(".poster-canvas").evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).a)).toBeGreaterThan(1);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await assertHandlesMatchTransformedCorners(object);

  const visual = object.locator(".resize-handle--bottom-right .resize-handle-visual");
  const marker = await visual.boundingBox();
  const touchStart = { x: marker.x + marker.width / 2 + 20, y: marker.y + marker.height / 2 + 20 };
  const before = await object.evaluate((element) => ({ width: element.offsetWidth, height: element.offsetHeight }));
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [
    { id: 3, x: touchStart.x, y: touchStart.y, radiusX: 1, radiusY: 1, force: 1 },
  ] });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [
    { id: 3, x: touchStart.x + 64, y: touchStart.y + 50, radiusX: 1, radiusY: 1, force: 1 },
  ] });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect.poll(() => object.evaluate((element) => element.offsetWidth)).toBeGreaterThan(before.width);
  await assertHandlesMatchTransformedCorners(object);
  await cdp.detach();
});
