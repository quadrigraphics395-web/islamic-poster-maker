# Qadri Poster Maker — Phase 3 Task 2 Report

## A. Text and icon appearance

### Findings and corrections

- The pre-edit `src/App.jsx` contained 310 matches for common UTF-8-as-Windows-1252 mojibake markers across interface text and symbol glyphs. A targeted repair corrected 126 contiguous damaged text/icon runs. The current file has zero matches and zero U+FFFD replacement characters. The starter Urdu text `اپنا متن یہاں لکھیں` was verified against the pre-edit source and left unchanged.
- Local font packages were already present and load from `src/fontLibrary.js`; no missing asset or global CSS override was found. Saved documents can use the legacy family name `Noto Nastaliq Urdu`, while the loaded Fontsource face is named `Noto Nastaliq Urdu Variable`. `resolveTextFontFamily()` now maps that legacy name for canvas, editor, preview, masking, and export rendering without changing stored selections.
- The application uses Unicode symbols and inline SVGs rather than a separate icon package. Restoring the corrupted literals repaired those existing glyphs; no icon system replacement or broad CSS override was needed. `src/App.css` and the font library were not changed for this task.
- A reliable historical screenshot was not available. The older working backup predates the current editor architecture, so it was inspected but not restored wholesale. The Phase 2 Task 5 report documented a narrower starter-text repair; this task addressed the remaining source corruption without changing the starter phrase.

### Browser observations

- Edge desktop (1440×900): the header, desktop toolbox, menu glyphs, properties, and Urdu preview displayed without missing-glyph boxes. Nastaliq shaping was visible and the locally loaded variable font was confirmed by computed family and `document.fonts.check()`.
- Edge mobile emulation (390×844): the Urdu preview and bottom navigation rendered, the View/More sheet opened, and the page had no horizontal overflow. Arabic Naskh font loading and RTL direction were also checked in both viewports. The compact mobile properties column wraps some controls by design.
- Browser checks found no uncaught page errors or failed font requests.

Screenshots captured from the rendered app:

- [Desktop Urdu font and editor](artifacts/phase3-task2/desktop-urdu-font.png)
- [Mobile Urdu font and editor](artifacts/phase3-task2/mobile-urdu-font.png)
- [Mobile View/More sheet](artifacts/phase3-task2/mobile-more-sheet.png)
- [Vector selection before Combine](artifacts/phase3-task2/vector-before-combine.png)
- [Editable vector after Combine](artifacts/phase3-task2/vector-after-combine.png)

## B. Editable vector operations

- Reused the existing `polygon-clipping` dependency and Task 1 custom-path representation; no second geometry engine or dependency was added.
- **Weld** uses polygon union. **Trim** subtracts cutters from a target. **Intersect** keeps the actual common region. **Combine** stores separate contours together as one custom vector with nonzero fill and component/hole metadata. **Break Apart** returns each connected component as an editable custom vector and keeps holes attached to their component.
- Layers are ordered back to front. By default, the frontmost selected shape is the Trim cutter and the lowest selected shape is the target. The checkbox reverses that choice; the optional Keep cutter control retains the active cutter. Trim results inherit the target styling. Other vector results inherit the topmost selected styling.
- Compatible operations appear in the context property bar and Vector menu. Unsupported text, groups, open paths, and invalid selections are disabled or rejected with a status message; sources remain unchanged if geometry creation fails. Existing image Weld/masking behavior remains separate from vector geometry.
- Vector operation history restores both source/result geometry and selection across undo/redo. Project serialization stores the editable custom path data directly; QPM round-trip and editable SVG export are covered. The browser flow also exports a combined two-contour SVG and checks its nonzero fill rule.

## C. Verification

- Node: **24 passed, 0 failed** across `vectorGeometry.test.js`, `vectorSvgExport.test.js`, and `projectFileManager.test.js`. Coverage includes Weld/Trim/Intersect geometry, empty/open input handling, compound contours and holes, Break Apart, QPM round-trip, and SVG serialization.
- Phase 3 Task 2 browser suite: **5 passed, 1 expected skip** across desktop and mobile Edge projects. It covers Combine/Break Apart, SVG download, undo/redo, Urdu and Arabic typography, local font loading, mobile More-sheet usability, and horizontal overflow.
- Existing Task 1 `vector-tools.spec.js`: **3 passed, 3 expected skips**. Pen, Bézier, node editing, SVG export, and mobile Vector navigation remain functional.
- Production build: **passed** with Vite to `.tmp-phase3-task2-final-build`; the existing `dist` directory was not used or overwritten. Vite reported its existing >500 kB JavaScript chunk-size advisory.

## D. Backups and preservation

- Fresh pre-edit backups are in `.backups/phase3-task2-20261114/`: `App.jsx`, `App.css`, `vectorGeometry.js`, and `vectorGeometry.test.js`. They were left unchanged.
- Existing modified and untracked user files, including Task 1 work and reports, were preserved. This task did not modify `package.json`, `package-lock.json`, or `src/App.css`, and added no runtime dependency.
- No reset, clean, restore, checkout, stash, commit, push, or deployment was performed.
