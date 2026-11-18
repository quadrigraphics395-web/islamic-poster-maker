# Qadri Poster Maker — Playwright Browser Test Report

**Date:** 13 November 2026  
**Branch:** `main`  
**Scope:** Install and use Playwright Test with the existing Microsoft Edge browser; exercise existing editor workflows on desktop and emulated mobile. No app feature or editor architecture was changed.

## Installation and configuration

- Added **`@playwright/test` `1.65.0`** as a development dependency. Its three package-lock entries are `@playwright/test`, `playwright`, and `playwright-core`.
- Node.js `v24.21.0`, npm `11.19.0`.
- Used Edge already installed at `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`, via Playwright `channel: "msedge"`. No browser binary was downloaded or installed.
- Added `playwright.config.js`, isolated tests under `tests/browser/`, and the package script `test:e2e`. Playwright starts the existing Vite dev server on `http://127.0.0.1:4173` with `--strictPort`; the existing `dist/` directory is not used or overwritten.
- Desktop project: Edge at **1440 × 900**. Mobile project: Edge at **390 × 844**, `isMobile: true`, `hasTouch: true`. This is browser emulation, not physical-device verification.
- Playwright screenshots, traces (on failures), and PNG export output are kept outside the repository at `C:\Users\quadr\AppData\Local\Temp\qadri-playwright-phase2-task3\`.
- Before the install, `package.json` and `package-lock.json` already contained user changes. The installed package and script were added while preserving those changes. The lockfile was compared against the pre-install project backup and reconstructed with only the three Playwright package records and the Playwright root devDependency added; no existing package versions were changed by the final lockfile.

## Tests created

`tests/browser/editor.spec.js` contains seven behavior-oriented tests, run against both desktop and mobile projects where applicable:

1. Open the app, create a poster, assert the editor and canvas have visible dimensions, and check for uncaught page errors.
2. Add text and edit it in English, Urdu, and Arabic; change fonts through the existing properties panel; verify text appears in the canvas DOM and Urdu/Arabic direction resolves RTL; undo/redo an added text object.
3. Add a shape and upload a small PNG through the real image file input; verify editable canvas objects and image decoding.
4. Move a selected text object with mouse drag and verify the position changes, then undo and redo the transform.
5. Save to the actual browser project library, open the saved project, and assert the saved text reappears.
6. On desktop only, export PNG, capture the download, and verify PNG signature and non-empty output.
7. On mobile only, check viewport overflow, the responsive menu/canvas layout, open the View menu, and tap-select an object through touch emulation.

Selectors use inspected accessible names and implementation selectors such as `#poster-text`, `#font-family`, `.poster-canvas`, `.canvas-control-object`, and `data-object-id`. No production test IDs or behavior hooks were added.

## Results

Command:

```powershell
npm.cmd run test:e2e -- --workers=1 --reporter=line
```

**Final result: 12 passed, 0 failed, 2 skipped** (14 cases enumerated across the two projects; 2 skips are intentional project-specific tests: PNG export runs on desktop only, and touch-layout coverage runs on mobile emulation only). The run completed in about 2.9 minutes.

### Desktop Edge results

At 1440 × 900, the app opened without a blank screen or uncaught page error. The editor and canvas were visible. Text input/editing for English, Urdu and Arabic, font changes, shape creation, PNG image upload/decode, mouse movement, undo/redo, browser-library save/reopen, and PNG download passed.

The PNG download was 280,145 bytes, had a `.png` filename, and passed the PNG magic-byte check. This verifies a real browser download and PNG encoding; it does not validate every pixel, print fidelity, or cross-browser rendering.

### Mobile Edge emulation results

At 390 × 844 with touch emulation, the editor opened without an uncaught page error, remained within the tested horizontal viewport bound, and showed the responsive canvas and menu navigation. Text/font edits, image/shape creation, object movement/undo/redo, project save/reopen, and a touch tap that selected the canvas object passed.

The mobile layout exposes the menu row at the bottom with Object, Edit, Vector, Arrange, File, and View menus. The inspected implementation has a **View** menu rather than an item literally named **More**. The mobile test opens View and checks its Page Setup action. The command bar is hidden by the mobile layout. This is only Edge device emulation; no actual phone/tablet was tested.

## Urdu and Arabic verification status

The browser tests entered real Urdu and Arabic strings, selected Noto Nastaliq Urdu and Noto Naskh Arabic, checked the text content in the rendered canvas DOM, and verified computed RTL direction for Urdu. Those checks passed on both desktop and mobile Edge emulation.

This does **not** prove typographic quality. The tests do not compare rendered glyph pixels, ligatures, diacritic placement, line breaking, font fallback, export parity, or behavior across operating systems. The startup screenshots show the app’s initial placeholder text rendered as mojibake; the screenshot also shows several existing interface labels with encoding artifacts. The entered Unicode Urdu/Arabic strings passed DOM assertions, but a separate visual typography review is still needed. No application source was changed to address this.

## Failed and unverified workflows

**No failures remained in the final full Playwright run.** During test development, test selectors were corrected to match actual UI behavior (the initial Page Setup overlay, mutually exclusive Text/Font accordions, and the toolbar’s export title). Those were harness adjustments; no application code was changed.

An exploratory undo check also showed that editing the text field itself did not create a distinct history snapshot in that interaction: Undo reverted the preceding text-object creation and Redo restored the object without selecting it. Final tests therefore verify undo/redo of object creation and movement, not text-edit undo. This behavior is recorded as a coverage/behavior limitation and was not changed.

Still unverified:

- Physical phone/tablet interaction, scrolling versus gesture behavior, browser address-bar/virtual-keyboard effects, and real-device performance.
- Screenshot/pixel-level typography quality for Urdu/Arabic and export rendering parity.
- Resize handles and rotation, multiple-page switching, local recovery after reload/crash, `.qpm` native file-picker save/open, SVG import in browser, JPG export, and recovery/history coverage for every edit type.
- WebP export is not offered in the inspected UI; the tests do not expect it.
- Cross-browser behavior in Firefox, Safari/iOS, and other Chromium installations.

Evidence screenshots from the final passing run:

- Desktop editor: `C:\Users\quadr\AppData\Local\Temp\qadri-playwright-phase2-task3\editor-startup-creates-a-v-7e1e1-t-an-uncaught-startup-error-desktop-edge\desktop-editor.png`
- Mobile Edge emulation: `C:\Users\quadr\AppData\Local\Temp\qadri-playwright-phase2-task3\editor-startup-creates-a-v-7e1e1-t-an-uncaught-startup-error-mobile-edge-emulated\mobile-editor-emulated.png`
- Mobile touch selection: `C:\Users\quadr\AppData\Local\Temp\qadri-playwright-phase2-task3\editor-mobile-emulation-ke-2ab2a-nd-supports-touch-selection-mobile-edge-emulated\mobile-editor-emulated-touch.png`
- Exported PNG: `C:\Users\quadr\AppData\Local\Temp\qadri-playwright-phase2-task3\editor-exports-a-non-empty-PNG-download-desktop-edge\poster-export.png`

## Existing Node tests

Command:

```powershell
node --test src\*.test.js src\utils\*.test.js src\data\hadith\*.test.js cloudflare\worker\src\*.test.js
```

**Result: 146 passed, 0 failed, 0 skipped.**

## Production build

Command:

```powershell
npm.cmd run build -- --outDir 'C:\Users\quadr\AppData\Local\Temp\qadri-playwright-build-20261113'
```

**Result: passed; 118 modules transformed.** Vite emitted its existing warning that the generated JavaScript chunk exceeds 500 kB. Output went to the new temporary folder above. The repository `dist/` folder was not touched.

## Files and dependency changes

Created:

- `playwright.config.js`
- `tests/browser/editor.spec.js`
- `QADRI_PLAYWRIGHT_TEST_REPORT.md`

Modified:

- `package.json`: added `@playwright/test` and `test:e2e`; the earlier uncommitted user changes remain.
- `package-lock.json`: added only Playwright package records and the root devDependency to the pre-install user version; no prior package versions changed.

Not modified: `src/App.jsx`, other application source, Supabase/backend/deployment configuration, the existing `dist/`, and all other pre-existing user files. No commit, push, or deploy occurred. Browser screenshots/build/test artifacts are in the OS temporary directory.

## Recommended next task

Run the manual typography and physical-device checklist from `QADRI_REGRESSION_TEST_PLAN.md` on a real phone and a desktop browser, using the screenshots and tests here as a starting point. Then decide separately whether to prioritize repairing the observed text-encoding/placeholder issue or expanding automated coverage for page switching, resize/rotate and `.qpm` file-picker flows. Do not begin editor refactoring until those baselines are reviewed.

