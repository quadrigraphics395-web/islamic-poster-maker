# Qadri Poster Maker — Browser Regression Assessment

**Date:** 13 November 2026  
**Project:** `C:\islamic poster maker`  
**Scope:** Phase 2, Task 2. Browser tooling discovery and a reviewable browser test plan. No browser tests were run because no browser automation framework is installed. No dependencies were installed and no application or deployment code was changed.

## 1. Git state and preservation

Git status was inspected before other work. The checkout already had modified `package.json`, `package-lock.json`, `src/App.jsx`, and `src/App.css`, plus untracked `.env.example`, the Phase 1 and Phase 2 reports/tests, `cloudflare/`, `scripts/`, `supabase/`, and the unusual root filename `lamic poster maker`. None of these existing changes were staged, modified, or removed for this assessment.

No files were created or modified in the application. This report is the only file created in this task. `dist/` was not touched. No commit, push, or deployment occurred.

## 2. Browser testing tools available

### Project dependencies

Inspected `package.json`, `vite.config.js`, and local `node_modules`:

- **Present:** React, Vite, React Vite plugin, Node's built-in `node:test` test runner, and the project's existing utility tests.
- **Not present:** Playwright / `@playwright/test`, `playwright-core`, Puppeteer, Cypress, Vitest, jsdom, and Testing Library. No browser test configuration or browser workflow tests were found.
- `npm.cmd ls --depth=0` had previously completed with the current declared packages. No package was installed in this task.

### System browsers and automation

- Microsoft Edge executable found at `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`.
- Mozilla Firefox executable found at `C:\Program Files\Mozilla Firefox\firefox.exe`.
- No Chrome or standalone `playwright` executable was found on PATH or at the checked standard Chrome location.
- The available session tools do not include browser/computer-use automation. The presence of Edge and Firefox allows a future automation framework to drive an installed browser, but the executable alone does not provide test orchestration, reliable element interaction, assertions, or mobile device emulation.

### Safest automation option

Use **Playwright Test** (`@playwright/test`) and its `channel: "msedge"` option to drive the installed Edge browser. That would provide desktop browser control, mobile viewport/touch emulation, assertions, trace capture, and screenshots without downloading a separate browser binary, subject to Playwright compatibility with the installed Edge version. A later Firefox project could be added after the Edge suite is stable.

Installing `@playwright/test` would change `package.json` and `package-lock.json`, which are already dirty user files. It also requires package registry access. This report does **not** install it; explicit user approval is required before changing those files. No browser binary download is currently needed for the recommended Edge-channel path.

## 3. Desktop and mobile test results

**No desktop or mobile browser session was started. No browser workflow passed or failed. All browser workflows below are unverified.** This avoids presenting source inspection or a production build as proof of interactive behavior.

The prior task's 146 passing Node tests and successful Vite build cover utility behavior and compilation only. They do not establish application startup, editor behavior, actual glyph rendering, canvas output, or touch-device compatibility.

## 4. Browser workflow matrix

This matrix is the planned Playwright coverage after approval, or a manual checklist now. Where useful, implementation entry points are listed; implementation presence is not a test result.

| # | Workflow | Expected behavior | Key implementation | Result |
|---|---|---|---|---|
| 1 | Open application | App mounts without a blank screen or uncaught startup error. | `src/main.jsx`, `src/App.jsx` | Unverified |
| 2 | Create New Poster | New document opens with expected initial page and defaults. | `src/App.jsx`: `createNewProject`, `startBlankPoster` | Unverified |
| 3 | Canvas appears | Document fits the editor viewport with toolbar and panels usable. | `src/App.jsx`, `src/App.css`, `src/utils/canvasViewport.js` | Unverified |
| 4 | Add text | New text object appears on the page and can be selected. | `src/App.jsx`: `addText` | Unverified |
| 5 | Edit text | Text content/property updates are visible and retained in document state. | `src/App.jsx`: text controls and selected-object updates | Unverified |
| 6 | Add Urdu | Urdu text appears in correct reading order with Nastaliq font when selected. | `src/fontCatalog.js`, `src/fontLibrary.js`, `src/App.jsx` | Unverified; requires visual shaping check |
| 7 | Add Arabic | Arabic text and marks render in expected reading order and font. | Font catalog/library and `App.jsx` text rendering | Unverified; requires visual shaping check |
| 8 | Add English | Latin text appears and can be edited. | `src/App.jsx`, `src/fontCatalog.js` | Unverified |
| 9 | Change font/properties | Font, size, alignment and spacing controls change selected text output. | `src/App.jsx` typography controls | Unverified |
| 10 | Add image | Supported image file appears as an editable image object. | `src/App.jsx`: `uploadImage` | Unverified |
| 11 | Add shape | Shape is created and appears in expected position. | `src/App.jsx`: `addShape` | Unverified |
| 12 | Select/move object | Mouse/touch selection and drag update object position. | `src/App.jsx`: pointer handlers, `moveObject` | Unverified |
| 13 | Resize/rotate | Selected object changes dimensions/angle and remains selectable. | `src/App.jsx`: `resizeObject`, object controls | Unverified |
| 14 | Undo/redo | Undo restores prior edit; redo reapplies it. | `src/App.jsx`: `saveHistory`, `undo`, `redo` | Unverified in React UI |
| 15 | Switch pages | Page changes show the correct independent page objects. | `src/App.jsx`: page state/handlers | Unverified |
| 16 | Save project | Named save and `.qpm` save persist without unintended replacement. | `src/utils/projectStorage.js`, `projectFileManager.js`, `ProjectManager.jsx` | Unverified in browser |
| 17 | Reopen project | Reload/open restores objects, pages, text and assets. | `src/App.jsx`: `applyProject`, `handleProjectFileInput` | Unverified in browser |
| 18 | Export PNG | Downloaded image has visible content and expected dimensions/background. | `src/App.jsx`: `downloadPoster`, `documentUnits.js` | Unverified; canvas output requires browser |
| 19 | Export JPG/WebP | JPG follows available quality settings; no WebP export was found in inspected code. | `downloadPoster`, `ExportSettings.jsx` | Unverified; WebP output not implemented in inspected path |
| 20 | Mobile canvas/touch | Canvas-first layout and touch selection/pan/zoom work at phone dimensions. | `src/App.jsx`, `src/App.css`, `canvasViewport.js` | Unverified; emulation cannot prove real-device behavior |

## 5. Manual testing checklist

Until automation is approved, the following can be run manually in installed Edge. Use a disposable poster; avoid relying on test results for real user documents.

### Start the app

1. From PowerShell in the project folder, run `npm.cmd run dev -- --host 127.0.0.1`.
2. Open the printed local URL in Edge. Confirm the home/editor view renders and Edge DevTools Console has no uncaught startup error.
3. Choose **Create New Poster**. Confirm the editor canvas, desktop toolbar, and properties area appear; inspect for clipping or blank content.

### Desktop workflow (laptop-sized viewport)

1. Keep a realistic laptop viewport, for example 1440 × 900 CSS pixels.
2. Add English, Urdu, and Arabic text separately. Edit each string, font, size and alignment. Confirm actual glyph shaping and diacritics visually; serialized text alone is not enough.
3. Add a PNG/JPEG/WebP image using the image control, add a shape, select and move both, resize/rotate where supported.
4. Make several edits, undo them one at a time, redo them, and confirm both object position and properties.
5. If page controls are available, add/switch pages and verify page contents remain separate.
6. Save as a named project and as `.qpm`; reload the app and reopen each copy. Verify text, image, shape and pages.
7. Export PNG and JPG (and PDF if included in the export menu). Open each downloaded file and inspect dimensions, background, clipping, Arabic/Urdu rendering and effects. WebP export is not expected based on inspected implementation.

### Mobile browser-emulation workflow

1. In Edge DevTools, enable device emulation with a common phone profile or a 390 × 844 CSS-pixel viewport and touch emulation.
2. Reload and create a new poster. Inspect the canvas-first layout, bottom toolbar and **More** panel at portrait and landscape orientation.
3. Add a shape and text, tap-select, drag, resize and use pan/pinch controls. Open and close properties while checking that page scrolling does not steal canvas gestures.
4. Test a narrow viewport, the virtual keyboard while editing text, orientation change, and a gesture interruption/cancel. Check console errors and whether important controls remain reachable.
5. Repeat on a real phone/tablet before claiming device compatibility. Desktop touch emulation is not real-device verification.

These procedures have not been executed for this report. No screenshots or trace files are available because no browser run occurred.

## 6. Successful, failed, and unverified workflows

- **Successful browser workflows:** None claimed; no browser test was run.
- **Failed browser workflows:** None observed; no browser test was run.
- **Unverified browser workflows:** All 20 workflows in the matrix, including desktop and mobile interaction, actual Urdu/Arabic glyph rendering, file dialogs, canvas exports, and recovery after reload.
- **Successfully verified in the prior task only:** 146 Node tests passed using the explicit test-file list; the production build passed to a temporary output path. These are not browser results.
- **Missing dependencies:** `@playwright/test` (recommended); no new browser-testing package or browser binary has been installed.

## 7. Recommended next task

After approval, install `@playwright/test` as a development dependency and configure it to drive the already installed Edge via `channel: "msedge"`. Keep test fixtures/configuration isolated under a new `tests/browser/` directory. Start with four stable flows: app starts/create-new, add and edit object, save/reopen `.qpm`, and export PNG. Then extend to typography, pages, images, undo/redo, and mobile touch emulation. Preserve the current dirty package files by reviewing their diffs and applying only the minimal dependency addition; do not overwrite the existing manifest/lock changes.

### Approval needed before proceeding

The requested browser automation cannot be performed with the tools currently installed. The smallest enabling change is installing `@playwright/test` (a development dependency) and using existing Edge, with no browser-binary download. This modifies already-dirty `package.json` and `package-lock.json`, so wait for approval before installation or writing browser tests.

