import { expect, test } from "@playwright/test";
import fs from "node:fs/promises";

const appErrors = new WeakMap();
const imagePng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=",
  "base64",
);

test.beforeEach(async ({ page }) => {
  const errors = [];
  appErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/");
  await expect(page.locator(".hero")).toBeVisible();
  await page.getByRole("button", { name: /Create New Poster/ }).click();
  await expect(page.locator(".editor-page")).toBeVisible();
  await expect(page.locator(".poster-canvas")).toBeVisible();
  const pageSetup = page.getByRole("dialog", { name: "Page Setup" });
  if (await pageSetup.isVisible()) await pageSetup.getByRole("button", { name: "Close Page Setup" }).click();
});

test.afterEach(async ({ page }) => {
  expect(appErrors.get(page), "uncaught page errors").toEqual([]);
});

async function openMenu(page, menuId) {
  const menu = page.locator(`#${menuId}`);
  const summary = menu.locator("summary");
  if (!(await menu.evaluate((element) => element.open))) await summary.click();
  return menu;
}

async function openTextInput(page) {
  const textAccordion = page.locator(".properties-panel details.text-section").filter({
    has: page.locator("summary").filter({ hasText: /^Text$/ }),
  });
  if (!(await textAccordion.evaluate((element) => element.open))) await textAccordion.locator("summary").click();
  await expect(page.locator("#poster-text")).toBeVisible();
}

async function addText(page) {
  const objectMenu = await openMenu(page, "editor-menu-add");
  await objectMenu.getByRole("button", { name: "Add Text", exact: true }).click();
  await openTextInput(page);
}

async function selectFont(page, label) {
  const fontAccordion = page.locator(".properties-panel details.text-section").filter({
    has: page.locator("summary").filter({ hasText: /^Font$/ }),
  });
  if (!(await fontAccordion.evaluate((element) => element.open))) await fontAccordion.locator("summary").click();
  const fontSelect = page.locator("#font-family");
  await fontSelect.selectOption({ label });
  return fontSelect;
}

test("startup creates a visible poster canvas without an uncaught startup error", async ({ page }, testInfo) => {
  const canvas = page.locator(".poster-canvas");
  const bounds = await canvas.boundingBox();
  expect(bounds?.width).toBeGreaterThan(100);
  expect(bounds?.height).toBeGreaterThan(100);

  if (testInfo.project.name === "desktop-edge") {
    await expect(page.getByRole("navigation", { name: "Editor actions" })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("desktop-editor.png"), fullPage: true });
  } else {
    await expect(page.getByRole("navigation", { name: "Editor actions" })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("mobile-editor-emulated.png"), fullPage: true });
  }
});

test("adds and edits text, checks font controls, and undoes/redoes an edit", async ({ page }) => {
  await addText(page);
  const editor = page.locator("#poster-text");
  const canvasText = page.locator(".canvas-art-object .canvas-text-fill").last();

  await editor.fill("Browser regression title");
  await expect(canvasText).toHaveText("Browser regression title");
  const selectedFont = await selectFont(page, "Inter");
  await expect(selectedFont).toHaveValue('"Inter"');

  await openTextInput(page);
  await editor.fill("خوبصورت اردو خطاطی");
  await selectFont(page, "Noto Nastaliq Urdu");
  await expect(canvasText).toHaveText("خوبصورت اردو خطاطی");
  await expect.poll(() => canvasText.evaluate((element) => getComputedStyle(element).direction)).toBe("rtl");

  await openTextInput(page);
  await editor.fill("بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ");
  await selectFont(page, "Noto Naskh Arabic");
  await expect(canvasText).toHaveText("بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ");

  await openTextInput(page);
  const previousText = await editor.inputValue();
  await editor.fill("English title");
  await selectFont(page, "Inter");
  await expect(canvasText).toHaveText("English title");
  await page.locator(".poster-canvas").click({ position: { x: 8, y: 8 } });

  const editMenu = await openMenu(page, "editor-menu-edit");
  await editMenu.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(canvasText).toHaveText(previousText);
  const redoMenu = await openMenu(page, "editor-menu-edit");
  await redoMenu.getByRole("button", { name: "Redo", exact: true }).click();
  await expect(page.locator(".canvas-art-object .canvas-text-fill")).toHaveText("English title");
});

test("text editing undo and redo restore content and retain selection", async ({ page }) => {
  await addText(page);
  const editor = page.locator("#poster-text");
  const originalText = await editor.inputValue();
  const canvasText = page.locator(".canvas-art-object .canvas-text-fill").last();
  const selectedObject = page.locator('.canvas-control-object[data-object-id^="text-"]').last();

  await editor.fill("Undoable text edit");
  await expect(canvasText).toHaveText("Undoable text edit");
  const undoMenu = await openMenu(page, "editor-menu-edit");
  await undoMenu.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(canvasText).toHaveText(originalText);
  await expect(selectedObject).toHaveClass(/is-selected/);

  const redoMenu = await openMenu(page, "editor-menu-edit");
  await redoMenu.getByRole("button", { name: "Redo", exact: true }).click();
  await expect(canvasText).toHaveText("Undoable text edit");
  await expect(selectedObject).toHaveClass(/is-selected/);
});

test("consecutive text edits undo and redo in edit order", async ({ page }) => {
  await addText(page);
  const editor = page.locator("#poster-text");
  const originalText = await editor.inputValue();
  const canvasText = page.locator(".canvas-art-object .canvas-text-fill").last();

  await editor.fill("First edit");
  await editor.evaluate((element) => element.blur());
  await editor.fill("Second edit");
  await page.locator(".poster-canvas").click({ position: { x: 8, y: 8 } });

  let menu = await openMenu(page, "editor-menu-edit");
  await menu.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(canvasText).toHaveText("First edit");
  menu = await openMenu(page, "editor-menu-edit");
  await menu.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(canvasText).toHaveText(originalText);

  menu = await openMenu(page, "editor-menu-edit");
  await menu.getByRole("button", { name: "Redo", exact: true }).click();
  await expect(canvasText).toHaveText("First edit");
  menu = await openMenu(page, "editor-menu-edit");
  await menu.getByRole("button", { name: "Redo", exact: true }).click();
  await expect(canvasText).toHaveText("Second edit");
});

test("unchanged or reverted text edits do not add an undo step", async ({ page }) => {
  await addText(page);
  const editor = page.locator("#poster-text");
  const originalText = await editor.inputValue();
  await editor.click();
  await editor.fill("Temporary draft");
  await editor.fill(originalText);

  const menu = await openMenu(page, "editor-menu-edit");
  await menu.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.locator(".canvas-art-object .canvas-text-fill")).toHaveCount(0);
});

test("undoing one text edit leaves other text objects unchanged", async ({ page }) => {
  await addText(page);
  const textNodes = page.locator(".canvas-art-object .canvas-text-fill");
  const firstText = "First text object";
  const editor = page.locator("#poster-text");
  await editor.fill(firstText);
  await editor.evaluate((element) => element.blur());

  const objectMenu = await openMenu(page, "editor-menu-add");
  await objectMenu.getByRole("button", { name: "Add Text", exact: true }).click();
  await openTextInput(page);
  const secondOriginal = await page.locator("#poster-text").inputValue();
  await editor.fill("Second text edit");

  const menu = await openMenu(page, "editor-menu-edit");
  await menu.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(textNodes.nth(0)).toHaveText(firstText);
  await expect(textNodes.nth(1)).toHaveText(secondOriginal);
});

test("text undo and redo preserve font and object properties", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-edge", "Context toolbar property assertions run on desktop.");
  await addText(page);
  const editor = page.locator("#poster-text");

  await page.getByLabel("Selected object X position").fill("23");
  await page.getByLabel("Selected text font", { exact: true }).selectOption({ label: "Inter" });
  await page.getByLabel("Selected text font size").fill("52");
  await page.getByLabel("Selected text alignment").selectOption("right");
  await page.getByLabel("Selected object color").fill("#123456");
  const editedText = "Styled text edit";
  await editor.fill(editedText);
  const menu = await openMenu(page, "editor-menu-edit");
  await menu.getByRole("button", { name: "Undo", exact: true }).click();

  await expect(page.getByLabel("Selected object X position")).toHaveValue("23");
  await expect(page.getByLabel("Selected text font", { exact: true })).toHaveValue('"Inter"');
  await expect(page.getByLabel("Selected text font size")).toHaveValue("52");
  await expect(page.getByLabel("Selected text alignment")).toHaveValue("right");
  await expect(page.getByLabel("Selected object color")).toHaveValue("#123456");

  const redoMenu = await openMenu(page, "editor-menu-edit");
  await redoMenu.getByRole("button", { name: "Redo", exact: true }).click();
  await expect(editor).toHaveValue(editedText);
  await expect(page.getByLabel("Selected object X position")).toHaveValue("23");
  await expect(page.getByLabel("Selected text font", { exact: true })).toHaveValue('"Inter"');
  await expect(page.getByLabel("Selected text font size")).toHaveValue("52");
  await expect(page.getByLabel("Selected text alignment")).toHaveValue("right");
  await expect(page.getByLabel("Selected object color")).toHaveValue("#123456");
});

test("adds a shape and an image from a local file input", async ({ page }) => {
  const objectMenu = await openMenu(page, "editor-menu-add");
  await objectMenu.getByRole("button", { name: "Add Shape", exact: true }).click();
  const shapePicker = page.locator(".shape-picker-backdrop");
  await expect(shapePicker).toBeVisible();
  await shapePicker.locator(".shape-picker-option").first().click();
  await expect(page.locator('.canvas-art-object[data-object-id^="shape-"] .canvas-vector-shape')).toBeVisible();

  const imageInput = page.locator('input[type="file"][accept="image/*"]').first();
  await imageInput.setInputFiles({ name: "pixel.png", mimeType: "image/png", buffer: imagePng });
  const imageObject = page.locator('.canvas-art-object[data-object-id^="image-"]');
  await expect(imageObject).toBeVisible();
  await expect.poll(() => imageObject.locator("img").first().evaluate((image) => image.naturalWidth)).toBe(1);
});

test("moves a selected text object and restores the position through undo and redo", async ({ page }) => {
  await addText(page);
  const object = page.locator('.canvas-control-object[data-object-id^="text-"]').last();
  const initialLeft = await object.evaluate((element) => element.style.left);
  const bounds = await object.boundingBox();
  expect(bounds).not.toBeNull();

  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width / 2 + 70, bounds.y + bounds.height / 2 + 35, { steps: 6 });
  await page.mouse.up();

  await expect.poll(() => object.evaluate((element) => element.style.left)).not.toBe(initialLeft);
  const movedLeft = await object.evaluate((element) => element.style.left);
  const editMenu = await openMenu(page, "editor-menu-edit");
  await editMenu.getByRole("button", { name: "Undo", exact: true }).click();
  await expect.poll(() => object.evaluate((element) => element.style.left)).toBe(initialLeft);
  const redoMenu = await openMenu(page, "editor-menu-edit");
  await redoMenu.getByRole("button", { name: "Redo", exact: true }).click();
  await expect.poll(() => object.evaluate((element) => element.style.left)).toBe(movedLeft);
});

test("saves a project to the browser library and reopens its saved content", async ({ page }) => {
  await addText(page);
  await page.locator("#poster-text").fill("Saved browser title");

  const fileMenu = await openMenu(page, "editor-menu-project");
  await fileMenu.getByRole("button", { name: "Save to Browser Library", exact: true }).click();
  const projectDialog = page.getByRole("dialog", { name: "Save & manage projects" });
  await expect(projectDialog).toBeVisible();
  await page.locator("#project-name").fill("Playwright Regression Project");
  await projectDialog.getByRole("button", { name: "Save project", exact: true }).click();
  await expect(projectDialog.locator(".project-card")).toContainText("Playwright Regression Project");
  await projectDialog.getByRole("button", { name: "Done", exact: true }).click();

  const reopenMenu = await openMenu(page, "editor-menu-project");
  await reopenMenu.getByRole("button", { name: "My Projects", exact: true }).click();
  const savedCard = page.locator(".project-card").filter({ hasText: "Playwright Regression Project" });
  await expect(savedCard).toBeVisible();
  await savedCard.getByRole("button", { name: "Open", exact: true }).click();
  await expect(page.locator(".canvas-art-object .canvas-text-fill").last()).toHaveText("Saved browser title");
});

test("exports a non-empty PNG download", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-edge", "Canvas PNG export is covered in the desktop Edge project only.");
  await addText(page);
  await page.locator("#poster-text").fill("PNG export regression");

  await page.locator('.editor-command-bar button[title="Export poster"]').click();
  const dialog = page.getByRole("dialog", { name: "Export poster" });
  await expect(dialog).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Download PNG", exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.png$/i);

  const outputPath = testInfo.outputPath("poster-export.png");
  await download.saveAs(outputPath);
  const bytes = await fs.readFile(outputPath);
  expect(bytes.length).toBeGreaterThan(500);
  expect(bytes.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
});

test("mobile emulation keeps the editor usable and supports touch selection", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-edge-emulated", "Phone viewport and touch checks run in the mobile Edge project.");

  const viewportWidth = page.viewportSize().width;
  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport + 2);
  await expect(page.locator(".editor-menu-bar")).toBeVisible();
  await expect(page.locator(".editor-command-bar")).toBeHidden();
  await expect(page.locator(".poster-canvas")).toBeVisible();

  const viewMenu = await openMenu(page, "editor-menu-more");
  await expect(viewMenu.getByRole("button", { name: "Page Setup", exact: true })).toBeVisible();
  await addText(page);
  const object = page.locator('.canvas-control-object[data-object-id^="text-"]').last();
  const bounds = await object.boundingBox();
  expect(bounds).not.toBeNull();
  await page.touchscreen.tap(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await expect(object).toHaveClass(/is-selected/);
  await page.screenshot({ path: testInfo.outputPath("mobile-editor-emulated-touch.png"), fullPage: true });
  expect(viewportWidth).toBe(390);
});
