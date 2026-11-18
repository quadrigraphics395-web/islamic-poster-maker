# Qadri Poster Maker — Regression Test Plan

**Date:** 13 November 2026  
**Scope:** Phase 2, Task 1. This adds Node-based utility workflow coverage and documents browser/manual checks. It does not change application behavior, `App.jsx`, dependencies, backend configuration, or deployment settings.

## Test setup inspected

- Runtime and test runner: Node.js `v24.21.0`, built-in `node:test` and `node:assert/strict`.
- App/build: React `19.3.0`, Vite `8.3.6`, `@vitejs/plugin-react` `6.1.1`; config is `vite.config.js`.
- Other relevant installed dependencies include `polygon-clipping`, `svg-path-parser`, and Oxlint. `npm.cmd ls --depth=0` completed without reporting missing declared packages.
- No Playwright, Cypress, Vitest, jsdom, Testing Library, or browser automation setup was found among declared or installed top-level dependencies. No dependency was installed.
- Existing test files cover focused utilities for project storage/files/recovery, object operations/history, geometry/vector paths, image filters/background removal, SVG import, units/PDF packaging, fonts, templates and Cloudflare worker code. Tests do not mount the React editor or exercise browser-rendered UI.
- `src/App.jsx` remains the central editor implementation; `captureProject`, `applyProject`, `saveHistory`/`undo`/`redo`, pointer handling, file inputs and `downloadPoster` are implemented there. The browser APIs those paths use are not represented by a DOM test environment.

## Critical workflow matrix

“Automated” means the named unit/utility implementation is exercised. It does **not** mean the full application workflow has been verified. No claim of browser/UI behavior passing is made.

| # | Workflow and expected behavior | Implementation | Existing/new automated coverage | Automated status and manual procedure |
|---|---|---|---|---|
| 1 | Start the app and load the editor without a fatal error. | `src/main.jsx`, `src/App.jsx`, `vite.config.js` | Production build compiles app modules; no browser startup test. | **Partial (build only).** Start `npm.cmd run dev`, open the local URL, create/open an editor, and check console/network for errors. |
| 2 | Create a new poster with initial page, dimensions and default background. | `src/App.jsx`: `startBlankPoster`, `createNewProject`, reset/page initialization | No app-level state/UI test. | **Manual.** Create a blank poster from the home/editor entry point; inspect size/background and confirm no prior document content leaks in. |
| 3 | Add text, edit text and style, then retain values after save/reopen. | `src/App.jsx`: `addText`, selected-object updates, `captureProject` / `applyProject` | New regression test round-trips representative text data; project-file tests cover serialized fields. Does not invoke editor controls. | **Partial.** Add/edit/delete text in editor; save/reopen and compare text, font, spacing, alignment and effects. |
| 4 | Render Urdu and Arabic correctly, including shaping, direction, marks and mixed-script lines. | `src/fontCatalog.js`, `src/fontLibrary.js`, `src/App.jsx` text preview/export drawing | Existing font catalog tests and SVG/document round-trip tests check metadata/content, not glyph rendering. New test checks Urdu/Arabic content survives persistence. | **Manual visual check required.** Compare Nastaliq Urdu and Arabic with diacritics/mixed Latin in browser preview and exported PNG on supported desktop/mobile browsers. |
| 5 | Add an image and edit/crop/filter/transform it without losing the source unexpectedly. | `src/App.jsx`, `ImageCropEditor.jsx`, `src/utils/imageCrop.js`, `imageFilters.js` | Existing crop/filter/image dimension tests. New project round-trip uses an embedded image reference. No file-input/browser-canvas integration test. | **Partial.** Import PNG/JPEG/WebP, crop, adjust filter/opacity/rotation, undo, save/reopen, export, and check pixels/edges. |
| 6 | Add shapes and custom paths; edit their geometry/style. | `src/App.jsx`, `src/utils/vectorGeometry.js`, `objectGeometry.js` | Existing vector and geometry tests exercise math and serialization, not drawing gestures/UI. | **Partial.** Draw common shape and pen path, edit nodes, resize/rotate, save/reopen, then compare geometry. |
| 7 | Select one/many objects and transform accurately. | `src/App.jsx`: selection, `beginCanvasPointer`, `updateCanvasInteraction`, `moveObject`, `resizeObject` | Existing geometry and viewport utility tests; no pointer-driven app test. | **Partial.** Mouse-select, marquee, multi-select, drag, resize and rotate; repeat with touch and test pointer cancellation. |
| 8 | Reorder, group/ungroup, lock/hide, duplicate and delete objects while preserving layer relationships. | `src/App.jsx`: group/layer handlers; `src/utils/objectOperations.js` | Existing object operations tests; new test verifies delete state and snapshot restoration at utility level. | **Partial.** Exercise nested group and layer panel/menu operations, then save/reopen and confirm order/visibility/lock. |
| 9 | Undo/redo restores the exact document edits and does not lose selection/content. | `src/App.jsx`: `saveHistory`, `undo`, `redo`; `src/utils/objectHistory.js` | Existing history/object tests; new test checks serialization, restoration, edit and delete snapshots. | **Partial.** Execute multiple UI edits, undo and redo each, include group/path/image/text and page/background operations. |
| 10 | Add, rename, switch and delete pages without mixing page contents. | `src/App.jsx`: `addPage`, `renamePage`, `deletePage`, `captureProject`, `applyProject` | New test verifies pages are preserved through project serialization; no UI page-switch/history test. | **Partial.** Create two pages with different objects, switch repeatedly, rename/delete, undo, save/reopen and compare both pages. |
| 11 | Save named project without silently overwriting a different project. | `src/utils/projectStorage.js`, `ProjectManager.jsx`, `src/App.jsx`: `persistProject` | Existing localStorage adapter tests; new integrated save/reopen test. Storage is mocked in Node. | **Partial.** Save new name and duplicate name, confirm overwrite prompt, inspect project list and reload. |
| 12 | Close/reopen `.qpm` or supported JSON and restore all editable content. | `src/utils/projectFileManager.js`, `src/App.jsx`: `saveProject`, `handleProjectFileInput`, `applyProject` | Existing QPM parser/picker/fallback tests; new full representative document round-trip. Native picker itself is mocked. | **Partial.** Save `.qpm`, close/reload app, open it through picker/fallback, compare pages/assets/text/paths and confirm invalid file is rejected safely. |
| 13 | Recover most recent work after reload/crash; recovery must not overwrite named saves. | `src/utils/projectRecovery.js`, `src/App.jsx` recovery effects/prompts | Existing quota/corruption/recovery tests; new test checks recovery alongside unchanged named project. Browser lifecycle/autosave timing is not tested. | **Partial.** Make edits, wait for recovery save, reload/close abruptly, choose recovery, then verify saved project remains intact. |
| 14 | Import supported image types and use them as objects/background/text fills. | `src/App.jsx`: `uploadImage`, `uploadBackgroundImage`, `uploadTextFillImage` | Image utility tests do not decode browser files or assert file input behavior. | **Manual.** Try PNG, JPEG, WebP and unsupported/corrupt files; verify object dimensions, background/fill, errors, save/reopen and export. |
| 15 | Import supported SVG into editable objects; safely reject unsupported/unsafe content. | `src/utils/svgImport.js`, `src/App.jsx` SVG upload handler | Existing SVG parsing/security/geometry tests and project round-trip tests; new SVG-to-QPM-to-reopen test. | **Partial.** Import representative real SVG through file input, inspect warnings, edit imported objects, save/reopen; include hostile/external-resource fixtures. |
| 16 | Export PNG with expected dimensions, transparency/background and visible content. | `src/App.jsx`: `downloadPoster`; `src/utils/documentUnits.js`; `ExportSettings.jsx` | Unit tests cover export dimensions/background mode; no browser canvas/pixel output test. | **Partial.** Export transparent and opaque PNGs at screen/print sizes; inspect dimensions, alpha, clipping, Arabic text, images and effects. |
| 17 | Export JPG/PDF as offered; quality/background and dimensions are valid. WebP export support is not present in inspected export path. | `src/App.jsx`: `downloadPoster`; `src/utils/documentUnits.js`, `pdfExport.js` | Existing tests cover JPEG quality calculation and raster one-page PDF structure. No image encoder/browser download test. | **Partial.** Export JPG at each quality; open PDF in independent reader and check page size/content. Do not expect WebP output. |
| 18 | Background remover selections/brush edits, undo/redo and apply remain responsive and preserve alpha. | `BackgroundRemover.jsx`, `src/utils/backgroundRemoval.js`, `imageProcessing.js` | Existing algorithm and working-size tests exercise masks/alpha helpers; UI, canvas and source-file integration are not tested. | **Partial.** Test contiguous/similar selection, brush erase/restore, undo/redo, apply/cancel, large image and touch device. |
| 19 | Mobile canvas supports selection, transform, pan/pinch and usable properties without gesture conflicts. | `src/App.jsx`, `src/App.css`, `canvasViewport.js`, crop/background remover components | Existing viewport math tests cover fitting/zoom; no mobile browser automation or responsive visual tests. | **Partial.** Real phone/tablet: portrait/landscape, pinch/pan/select/resize, property panel, virtual keyboard, rotation and interrupted pointers. |
| 20 | Desktop editor supports menus, keyboard shortcuts, canvas interactions and export reliably. | `src/App.jsx`, `src/App.css`, `editorKeyboard.js` | Existing keyboard utility tests; build compiles. No browser keyboard/UI test. | **Partial.** Desktop browsers: menus, shortcuts, pointer tools, file picker fallback, project lifecycle and exports; check console and focus behavior. |

## Automated tests added

Created `src/utils/regressionBaseline.test.js` using only existing Node built-ins and application utilities:

1. A representative poster with Arabic/Urdu text, an image reference, shape and page goes through named local save, `.qpm` serialize/parse, and recovery write/read; asserts data is preserved and the named save remains unchanged.
2. Text edit/delete states use the actual object snapshot serialization/restoration and object deletion helpers; asserts undo/redo snapshots recover the exact object data.
3. Supported SVG import is serialized to `.qpm` and reopened; asserts imported text/path objects remain editable data.

These are integration tests across utility modules, **not** React editor workflow tests. Existing focused tests already cover many other supporting helpers; see the matrix and `src/**/*.test.js` files.

## Commands and results

Run the complete applicable Node test set from PowerShell:

```powershell
node --test src\*.test.js src\utils\*.test.js src\data\hadith\*.test.js cloudflare\worker\src\*.test.js
```

**Executed result:** 146 tests passed, 0 failed, 0 skipped. This includes the 3 new tests.

Run only the new baseline:

```powershell
node --test src/utils/regressionBaseline.test.js
```

**Executed result:** 3 passed, 0 failed.

An unrestricted `node --test` was also tried. Node auto-discovered `scripts/test-cloudflare-local.mjs` as a test file and failed because that manual smoke script requires `TEMPLATE_TEST_ADMIN_KEY`; the other 146 actual test files passed. No environment key was supplied and no Cloudflare local service was started. Use the explicit test-file command above. The existing `test:cloudflare:local` script is a credential-gated local smoke test, not a normal unit test.

Production build command:

```powershell
npm.cmd run build -- --outDir 'C:\Users\quadr\AppData\Local\Temp\qadri-baseline-build-20261113'
```

**Executed result:** Vite production build passed (118 modules transformed). Output was directed to a fresh temporary folder so the existing ignored project `dist/` was not overwritten. Vite warned that the generated JS chunk is larger than 500 kB; this is an existing optimization warning, not a build failure.

## Manual regression procedure

For each supported desktop and mobile browser, use a disposable project and check:

1. Start the app; create a blank poster and verify its page size/background.
2. Add English, Urdu Nastaliq and Arabic Naskh text. Edit content/font/size/alignment/spacing and compare the visible glyphs and line breaks with a known reference.
3. Import PNG/JPEG/WebP images. Crop, filter, transform, opacity-adjust and test background/text fill where applicable.
4. Add a standard shape and a custom path; move, resize, rotate, edit nodes, group/ungroup, reorder, lock/hide, duplicate and delete.
5. Exercise undo/redo after text, image, path, group, page and background edits.
6. Add and rename pages with visibly different content; switch pages and confirm no content leakage.
7. Save a named project and `.qpm`; reload the page and open both. Confirm all object properties and embedded image data remain intact.
8. Trigger recovery by making unsaved edits and reloading; confirm the recovery prompt and keep the named project unchanged.
9. Import representative safe SVGs and one unsupported/unsafe SVG; check warnings/rejection and edit/save/reopen accepted objects.
10. Export transparent and opaque PNG, JPG at available quality choices and PDF. Inspect pixel dimensions, alpha/background, clipping, text shaping, effects and PDF page size/content.
11. Run background remover selection/brush, undo/redo, apply/cancel and a large image; verify edges and responsiveness.
12. On mobile, test both orientations, touch selection, drag/resize, pinch zoom, pan, properties, keyboard appearance and pointer cancellation. On desktop, repeat key shortcuts, menu actions and file picker/fallback flows.

Record browser/device, viewport, project fixture, observed result and any console error for each manual run. These steps have not been executed as part of this task.

## Known limitations and coverage gaps

- No browser automation/DOM harness is installed. Application startup, actual text shaping, pointer input, canvas pixel output, file pickers, responsive UI and crash/reload lifecycle cannot be reliably exercised by the current Node utility tests.
- No automated test currently drives `App.jsx` state transitions; the new history test tests the same snapshot utilities used by the app, not React's `undo` / `redo` callbacks.
- Urdu/Arabic tests preserve text/direction data, but do not prove fonts load, glyph shaping, mixed bidi line layout, or export parity.
- PNG/JPG encoding uses browser Canvas APIs inside `App.jsx`; tests cover dimension/quality helpers but not output image bytes. PDF tests validate the generated raster-PDF structure, not independent viewer rendering or print fidelity.
- The current `.qpm` is JSON with inline resource data; storage tests use in-memory localStorage mocks and cannot reproduce browser quota/device conditions.
- WebP input is accepted in selected image flows, but WebP output was not found in the export UI/path.
- `node --test` without a file list mistakenly treats `scripts/test-cloudflare-local.mjs` as a test and requires a local admin key. Do not set a real credential to run the generic discovery command; run the explicit test-file list instead.

## Files created and preserved

- Created `src/utils/regressionBaseline.test.js`.
- Created `QADRI_REGRESSION_TEST_PLAN.md`.
- No existing files were modified. No dependencies were changed or installed. No application code, Supabase/auth/database/deployment configuration, `dist/`, or ignored user files were modified. The pre-existing dirty and untracked files were preserved.

