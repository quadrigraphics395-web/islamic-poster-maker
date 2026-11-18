# Qadri Poster Maker — Phase 1 Project Audit

**Audit date:** 13 November 2026  
**Project path:** `C:\islamic poster maker`  
**Branch / HEAD:** `main` at `1e8956b` (`fix: repair poster creation and complete flower gallery`), tracking `origin/main`  
**Audit scope:** Repository and source inspection only. No application code, dependencies, configuration, remote service, or data was changed. No build, tests, or browser session was run; feature behavior below is verified from implementation paths, not an end-to-end runtime session.

## 1. Project overview

This is a React 19 + Vite browser poster editor. Its editor is already broader than a basic poster maker: it has a layered object model, multiple pages, vector path editing and boolean geometry, image and text treatments, local project files, local recovery, SVG import, raster exports, and a separate online template service. It is not yet a general-purpose vector design application: its UI, document model, renderer, and interactions are centered in one very large React component, and important professional interchange/print features are limited or absent.

### Repository state and preservation notes

The checkout was not clean at audit time. Git reported modified tracked files `package.json`, `package-lock.json`, `src/App.jsx`, and `src/App.css`, along with untracked `.env.example`, `cloudflare/`, `scripts/`, `supabase/`, and a strangely named root file displayed as `lamic poster maker`. These are pre-existing user changes and were included in the backup. The ignored tree includes `node_modules/`, `dist/`, `cloudflare/worker/.wrangler/`, and local Cloudflare credential/configuration files (`.admin-login-key.local`, `.dev.vars`, `.env.production`).

Recent commits are feature and repair commits, not a stable release series: `1e8956b`, `7ad730c`, `13b7ca9`, `0794e05`, and `a2c0e8b`. `HEAD` matched `origin/main` when inspected. The dirty files have not been reverted or staged.

## 2. Existing architecture

- **Application shell/editor:** `src/main.jsx` mounts `App`; `src/App.jsx` contains the editor state, menu and panel UI, document/page lifecycle, pointer interactions, import/export orchestration, and much of the HTML/SVG/canvas rendering. It is 4,747 lines. The adjacent `src/App.css` is 3,721 lines.
- **Rendering:** Editable objects are primarily React DOM elements styled with CSS and inline SVG. Canvas 2D is used for high-resolution raster export, text masks/effects, and image manipulation. `App.jsx` has the rendering helpers and `renderCanvasObject` as well as the interactive view. This is a hybrid DOM/SVG preview and canvas export model, not a standalone rendering engine.
- **Document model:** State in `App.jsx` stores `objects`, `pages`, dimensions, selection, background settings, zoom, and editor state. Objects include text, image, shape, custom path, and group forms. Pages contain object arrays. Serialization is assembled in `captureProject` / `applyProject` in `App.jsx`.
- **Focused utilities:** `src/utils/` contains geometry, vector boolean operations, SVG parsing/import, units, crop, image filters, transparency masks, project storage/files/recovery, PDF packaging, and template storage. Tests are Node built-in tests adjacent to utilities.
- **UI components:** `src/components/` separates image crop, background remover, project manager, export settings, template gallery/save/manager, and flower picker. These components still rely on `App.jsx` for editor state and rendering integration.
- **Online template services:** `src/utils/onlineTemplates.js`, `supabase/`, and `cloudflare/worker/` implement/configure online template APIs and related storage. The audit did not contact or inspect live deployment credentials/services.
- **Styling/responsiveness:** `src/App.css` contains the editor and much of the responsive styling. `src/index.css` appears to retain starter Vite styles earlier in the file, then overrides global variables and root layout later.
- **Build/config:** Vite + React plugin, with Oxlint and Wrangler among development dependencies. `package.json` declares Node test scripts for targeted utilities and services. There is no app-level test runner or browser automation configuration evident in the root package/config inventory.

## 3. Feature inventory

“Working” below means a complete implementation path is present in source, not that this audit executed it in a browser. Items depending on browser APIs, external services, or complex rendering are called out for runtime verification.

### A. Working features (implementation present)

| Feature | Implementation and current operation | Limitations / risks |
|---|---|---|
| Editor document and page model | `src/App.jsx` owns object/page state; `addPage`, `renamePage`, `deletePage`, `captureProject`, and `applyProject` operate on pages. | Tightly coupled to component state; page-level history semantics and scale limits need end-to-end checks. |
| Object selection, manipulation, alignment, layer ordering | `src/App.jsx` implements selection, marquee, clipboard, duplicate/delete, alignment, layer movement, group/ungroup, lock/visibility properties, resize/rotate, and keyboard shortcuts. `src/utils/objectGeometry.js` and `objectOperations.js` hold some shared operations. | Layer tree and nested group operations are bespoke; interaction, transform, and keyboard regression risk is high in the oversized component. |
| Vector shapes and custom paths | `src/App.jsx` provides shape library, pen/freehand path creation, node/handle operations, grouping and boolean-tool integration. `src/utils/vectorGeometry.js` serializes paths and uses `polygon-clipping` for polygon operations. | Geometry is a focused subset; not a complete professional Bézier/path model. Boolean conversion, precision, malformed paths, and large geometry need stronger integration/performance coverage. |
| Undo and redo | `src/App.jsx` snapshots object state through `src/utils/objectHistory.js`; utility and geometry tests exist. | History is object-centric; whether all document/page/background edits are included consistently needs audit-driven regression tests. Large embedded image data can make snapshots expensive. |
| Text and typography controls | Built-in font catalog in `src/fontCatalog.js`; self-hosted font subset imports in `src/fontLibrary.js`; `App.jsx` handles alignment, wrapping, sizing, spacing, styles, image fill, gradients, stroke, shadows/glow and preview/export drawing. `src/utils/personalFonts.js` supports personal font import/storage. | Browser shaping is used; no dedicated shaping/layout engine or conversion of glyphs to outlines. Export parity is not guaranteed for every script/font. |
| Image import and editing | `App.jsx` imports images and supports image effects, filters (`src/utils/imageFilters.js`), opacity/transparency (`transparency.js`), masks, crop (`ImageCropEditor.jsx`, `imageCrop.js`), and transforms. | Embedded images and generated canvases can consume substantial memory; filter/effect parity and source resolution require verification. |
| Background remover | `BackgroundRemover.jsx` provides selection/brush editing, touch/pointer navigation, bounded working resolution and bounded alpha history; algorithms live in `backgroundRemoval.js`. | Working image is capped at 5 million pixels; this is a destructive raster workflow at that working resolution. Cross-origin image/canvas and large-device performance need runtime testing. |
| Project save/open and local recovery | `projectStorage.js` stores named projects in `localStorage`; `projectRecovery.js` saves an automatic recovery snapshot; `projectFileManager.js` reads/writes a versioned JSON `.qpm` envelope, with File System Access API when available and download/input fallbacks. Handles are stored through `projectFileHandleStore.js`. | Browser storage quota is finite. `.qpm` is JSON (not a packaged asset bundle), so image/font data can bloat it. File System Access API behavior varies by browser; fallback save behavior needs explicit browser coverage. No IndexedDB implementation was found. |
| SVG import | `src/utils/svgImport.js` parses SVG into supported editor objects; `App.jsx` integrates upload. | Import converts to the app's supported subset; filters, masks, external resources, text semantics, and unsupported SVG constructs may be lost. No matching editable SVG export path was found. |
| Raster and PDF export | `App.jsx` creates raster output and `src/utils/documentUnits.js` calculates print dimensions. `src/utils/pdfExport.js` packages a JPEG into a one-page PDF. `ExportSettings.jsx` exposes export options. | PDF is a raster image in a single page, not vector PDF. Raster export quality/memory depends on canvas dimensions and browser canvas limits. No multipage print/PDF export found. |
| Templates and flower assets | Local template CRUD/storage (`templateStorage.js`, `TemplateManager.jsx`) and template save/gallery components; flower picker (`FlowerPanel.jsx`) reads local asset catalog. Online templates are handled by `onlineTemplates.js` and backend code. | Online CRUD requires correctly configured backend/auth. Asset URL lifecycle, upload limits, and deployed backend behavior were not exercised. |
| Responsive editor and pointer interaction | CSS media queries create compact/mobile layouts; `App.jsx`, crop editor, and background remover use pointer events, pointer capture, multi-pointer canvas navigation and pinch/zoom state. | CSS presence does not establish a usable mobile workflow. Pointer cancellation, gesture conflicts, virtual keyboard/viewport, and narrow/tall devices need device coverage. |

### B. Partially working features (implemented, but bounded or incomplete)

| Feature | Evidence and current behavior | Limitation / risk |
|---|---|---|
| Vector drawing/editing | Custom SVG paths, node handles, simplification and boolean operations exist in `App.jsx` and `vectorGeometry.js`. | Not a full vector engine: lacks a general scene graph, robust path editing model, broad shape constraints, and demonstrated SVG round-trip fidelity. |
| Arabic/Urdu typography | Many Arabic, Nastaliq, Urdu, English, and Devanagari fonts are self-hosted. Canvas text drawing and browser CSS shaping are used; text controls include spacing and line-height. | No explicit bidi/script shaping layer, glyph-level layout, optical metrics, text-on-path, or outline conversion. Canvas `fillText`/browser rendering results can differ across platforms and export. Requires native-script visual testing with mixed direction, diacritics, ligatures, wrapping and font fallback. |
| Image editing | Crop, color-based background removal, filters, masks, opacity, shadow/outline/inner shadow and transforms exist. | Not a nondestructive, color-managed image pipeline; background removal works on a reduced working bitmap. No evidence of layers/masks as a general compositing graph or high-bit-depth workflow. |
| Color, gradients and effects | Solid fills, multi-stop-style presets/controls, gradients, opacity masks, outlines, shadows and glow are represented in object properties and generated output. | Effects are app-specific properties and canvas/CSS approximations; interchange fidelity, color profiles, blend modes, and consistent rendering remain limited. |
| Save reliability and history | Named local projects, recovery snapshots, file serialization, overwrite checks, and object history are present. | Persistence relies heavily on localStorage and in-memory state; quota, interrupted writes, large documents, multiple tabs, corrupted legacy data and complete history coverage remain risks. |
| SVG support | A substantial importer exists, plus SVG path/vector objects internally. | No user-facing general SVG export/import round-trip. Import only supports a mapped subset; does not replace standards-compatible interchange. |
| Print export | Physical presets, units and DPI-based dimension calculation; JPEG/PNG raster export and a raster PDF wrapper. | Not a prepress pipeline: no vector PDF, multipage output, bleed/crop marks, color profile/CMYK support, or explicit font embedding/outlining. Browser canvas maximum dimensions and memory constrain very large output. |
| Online template sharing | Supabase/Cloudflare-related code and migrations are present, with admin session and template operations. | Depends on external configuration, credentials, deployment and service compatibility. Repository inspection cannot verify live service correctness or security posture. |

### C. Missing features (not found in inspected implementation)

- General editable SVG **export** and reliable SVG round-trip interchange.
- A full multi-page/vector **PDF** exporter; current PDF utility wraps one JPEG raster image.
- A packaged, asset-aware `.qpm` format with migrations, schema validation beyond basic object/page checks, resource manifest, compression, and robust recovery semantics.
- IndexedDB-backed project/library storage for large image-rich documents.
- A dedicated reusable document model/store and renderer boundary independent of React UI state.
- Professional print controls such as CMYK/color profiles, bleed, trim/crop marks, separations, and preflight checks.
- Dedicated Arabic/Urdu shaping/layout and glyph-outline workflows for consistent print/export fidelity.
- General non-destructive image adjustment/compositing pipeline with editable masks and color-managed/high-bit-depth operations.
- Evidence in repository config of automated end-to-end browser/device testing or visual regression infrastructure.

These findings mean “not found in the inspected repository implementation,” not a claim about features available only in the live deployment or external systems.

## 4. Important files and responsibilities

| File / directory | Responsibility |
|---|---|
| `package.json`, `package-lock.json` | Dependencies, scripts, lockfile. Both are currently modified in the working tree. |
| `src/main.jsx` | React bootstrap and root mount. |
| `src/App.jsx` | Editor shell, document state, object/page operations, interaction, rendering orchestration, project lifecycle and export. 4,747 lines. |
| `src/App.css`, `src/index.css` | Editor styles/responsive rules and global styles. `App.css` is 3,721 lines; `index.css` includes starter styles followed by overrides. |
| `src/fontCatalog.js`, `src/fontLibrary.js`, `public/fonts/licenses/` | Font catalog, font package subset imports and license records. |
| `src/components/BackgroundRemover.*` | Raster selection/brush editing UI and its styles. |
| `src/components/ImageCropEditor.*`, `src/utils/imageCrop.js` | Crop/reposition UI and normalized crop math. |
| `src/components/ProjectManager.*` | Named project management UI. |
| `src/components/ExportSettings.*` | Export configuration UI. |
| `src/components/Template*.jsx`, `src/components/TemplateSystem.css` | Template gallery, editing, saving and styling. |
| `src/utils/projectStorage.js`, `projectRecovery.js`, `projectFileManager.js`, `projectFileHandleStore.js` | Browser storage, auto-recovery, `.qpm`/JSON serialization, file picker and handle persistence. |
| `src/utils/vectorGeometry.js`, `objectGeometry.js`, `objectOperations.js`, `objectHistory.js` | Path operations, geometry transforms/selection, object helpers and snapshots. |
| `src/utils/svgImport.js` | SVG parsing and conversion to application objects. |
| `src/utils/documentUnits.js`, `pdfExport.js` | Physical size/DPI calculations and single-page raster PDF serialization. |
| `src/utils/imageFilters.js`, `imageProcessing.js`, `backgroundRemoval.js`, `transparency.js` | Image adjustment helpers, working resolution, pixel selection/removal and mask CSS/SVG generation. |
| `src/utils/onlineTemplates.js`, `supabase/`, `cloudflare/worker/` | Online template client, schema/migrations, worker implementation/configuration. |
| `src/**/*.test.js`, `cloudflare/worker/src/index.test.js` | Unit-level utility and worker tests. Present but not run during this audit. |
| `src/App-working-backup.jsx`, `src/App copy.jsx working` | Additional copies of old editor source; increase ambiguity about canonical implementation and maintenance. |
| Root file `lamic poster maker` | Unusual Unicode filename, 16,592 bytes; purpose/content were not inferred from its name. Should be reviewed manually before cleanup. |

## 5. Technical problems and risks

### Architecture and maintainability

- `App.jsx` combines document state, UI, input state machines, file persistence, online-template administration, renderer logic and export. `App.css` is similarly broad. This makes isolated work and regression review difficult.
- Legacy copies (`App-working-backup.jsx`, `App copy.jsx working`) and many top-level utility tests indicate partial extraction has begun, but canonical boundaries are not yet clear.
- State and serialization schema are implicit in React objects. New editor capabilities risk changing existing `.qpm` and local project semantics unless a versioned model and migrations are introduced.

### Rendering and performance

- The preview is DOM/SVG-oriented while export is separately rendered through Canvas 2D. This creates duplicated rendering logic and risks visible/export mismatch.
- Text and image effects create temporary canvases; export generates large output canvases and object/image data may be copied in history and JSON snapshots. Large designs can cause memory pressure or hit browser canvas/storage limits.
- The current background remover explicitly caps its working bitmap at 5 MP and keeps bounded alpha history; this is a sensible guard but a quality limitation for print work.
- No worker/offscreen rendering architecture or explicit resource lifecycle/asset cache was found in the audited paths. Performance on lower-end phones and large documents is unverified.

### Typography and language support

- Many high-quality self-hosted font families are included, but text flow depends on browser CSS/Canvas shaping. There is no dedicated shaping model that guarantees identical Urdu/Arabic output across browser/platform/export renderers.
- Some text and labels in inspected source rendered as mojibake in the PowerShell output (for example in preset strings and UI labels). This may reflect a source-encoding/display issue; inspect the actual files in an editor configured for UTF-8 before any encoding conversion. `fix-encoding.cjs` exists but must not be run casually because it could rewrite content.

### Data durability

- Named projects and automatic recovery are stored in localStorage, which is quota-limited and synchronous. The code reports quota errors, but large inline image data makes this a material data-loss risk.
- `.qpm` stores JSON project state and appears to carry image data inline. There is a version field, but the format is not an asset package and project validation is structural rather than a comprehensive schema migration/validation system.
- File System Access API is optional and requires browser permission; browser fallback behavior and interrupted downloads/writes require compatibility tests.
- Local browser data is not covered by the source backup. Users should export their own project files; this repository backup only captures files present in the checkout.

### Mobile, compatibility and security

- Responsive layouts, pointer events, pointer capture, pinch navigation and viewport measurements are implemented, but no device/browser runtime check was performed. Mobile gesture conflicts, cancellation and memory limits remain open.
- `src/utils/svgImport.js` parses imported SVG and the app uses DOMParser for built-in vector markup. Continue validating imported content as untrusted input; avoid injecting imported SVG as raw HTML or allowing external resources. Review importer sanitization carefully before expanding support.
- Online template administration and worker security require a separate deployment/configuration audit. Local ignored `.dev.vars`, `.env.production`, and `.admin-login-key.local` files exist and are deliberately included in the private backup; keep that archive private. No secret values are reproduced in this report.
- Browser support for File System Access API, `ResizeObserver`, pointer capture and modern CSS viewport units varies. The project has no browser support matrix in the inspected config.

## 6. Backup location and restoration

A ZIP backup was created outside the repository:

`C:\Users\quadr\AppData\Local\Temp\qadri-poster-maker-backup-20261113-190037.zip`

It contains 753 files (about 89 MB), including the dirty tracked files, untracked files, `.git` metadata, and ignored local configuration/credential files. It excludes `node_modules/`, `dist/`, and `.wrangler/` generated/cache folders. No prior backup was overwritten. The archive was opened after creation and its 753 entries were counted.

**Restore:** Extract the archive into a new empty directory (recommended) and inspect the result before replacing any checkout. To restore the current checkout later, preserve any newer work first, then extract over the project root and allow replacement of archived files. Reinstall dependencies only when intentionally resuming development. The archive contains sensitive local configuration; do not share it publicly. The backup is in the OS temporary directory and may be removed by system cleanup, so copy it to durable private storage if it must be retained. This source backup does not include browser localStorage or projects stored only in a user's browser.

## 7. Recommended future architecture

Introduce seams incrementally while keeping the existing editor usable:

1. **Versioned document core:** define schema and migrations for document, pages, objects, assets, units, and metadata. Keep compatibility adapters to current `captureProject`/`applyProject` state.
2. **Editor commands and history:** centralize mutations as commands with reliable undo/redo and dirty-state semantics; add invariant tests before changing existing paths.
3. **Renderer boundary:** provide a shared scene/document representation to preview and export renderers. Preserve the existing renderer behind an adapter until parity is demonstrated.
4. **Input/tool controllers:** isolate selection, pointer gestures, pen/node editing, transform and viewport logic from React panels; make pointer cancellation and touch behavior explicit.
5. **Asset repository:** store large binary assets separately (IndexedDB initially), reference them by stable IDs, and define lifecycle/serialization for local file and cloud documents.
6. **Feature modules:** separate vector geometry, typography layout, image processing, effects/color and artboard/page management behind document-level APIs.
7. **Interchange/export adapters:** implement validated SVG import/export, then vector PDF/print output with preflight, while retaining raster export for compatibility.
8. **UI adaptation:** keep desktop and mobile layouts as views over the same document/actions, not separate editing logic.

Technology selection should follow measured requirements: retain React/Vite and SVG/Canvas where they already serve poster workflows; evaluate CanvasKit/Skia, a mature vector scene library, or a shaping engine only after a renderer/input prototype demonstrates gaps that the existing DOM/SVG/Canvas pipeline cannot meet. Avoid replacing the rendering stack in one step.

## 8. Phase-by-phase roadmap

Risk levels: **Low**, **Medium**, **High**; risks describe regression/complexity, not overall product priority.

### Phase 1 — Existing architecture and stability

| Task | Modules | Depends on | Challenge / risk | Verification and completion criteria |
|---|---|---|---|---|
| 1.1 Capture current document and interaction invariants | `src/utils/*.test.js`, new app-level test harness | None | High: current behavior spans component state | Representative create/edit/group/page/undo/save/reopen/export workflows are repeatable and recorded; no baseline regressions. |
| 1.2 Define document schema and migration adapters | New `src/document/` schema, validation, migrations; adapters in `App.jsx` | 1.1 | High: legacy projects and dirty user data | Existing sample/legacy documents load unchanged; invalid documents fail safely; schema version increments are tested. |
| 1.3 Extract commands/history and persistence interfaces | New `src/editor/commands/`, history and persistence modules | 1.1, 1.2 | High: history currently object-focused | Each edit command has undo/redo invariants; save/dirty/recovery behavior documented and covered. |
| 1.4 Establish lint/build/browser support and performance baselines | package scripts/config and `docs/` | 1.1 | Medium | Supported browser/device matrix and baseline document sizes/render timings documented; repeatable automated checks exist. |

### Phase 2 — Professional Vector Engine

| Task | Modules | Depends on | Challenge / risk | Verification and completion criteria |
|---|---|---|---|---|
| 2.1 Define vector object/path schema | `src/document/vector/` | Phase 1.2 | High | Paths, fills, strokes, transforms and IDs serialize/migrate with invariant tests. |
| 2.2 Extract geometry and selection operations | `src/vector/geometry/`, adapters to `vectorGeometry.js` | 2.1, Phase 1.3 | High | Existing paths and boolean tools produce stable geometry; precision and malformed-path cases covered. |
| 2.3 Add shape tools, pen/node editing, transforms | `src/editor/tools/`, vector panels | 2.2 | High | Mouse/touch create, select, edit, transform, undo and redo behave consistently. |
| 2.4 Add robust path operations and object constraints | vector modules and command tests | 2.3 | High | Boolean, simplify, combine, align and snapping pass geometry regression fixtures. |

### Phase 3 — Urdu/Arabic Typography Engine

| Task | Modules | Depends on | Challenge / risk | Verification and completion criteria |
|---|---|---|---|---|
| 3.1 Build script/bidi typography corpus | `src/typography/tests/`, font metadata | Phase 1 | Medium | Urdu, Arabic, mixed English/digits, diacritics and fallback fixtures cover supported scripts. |
| 3.2 Separate text layout from UI/rendering | `src/typography/` layout API | Phase 1.2, 1.3 | High | Text document model stores styles and direction; preview/export consume a common layout result. |
| 3.3 Evaluate and integrate shaping backend if needed | isolated renderer prototype | 3.1, 3.2 | High | Comparison on target browsers establishes acceptable glyph ordering, line breaks and metrics. |
| 3.4 Add outline conversion and text-on-path workflows | typography/vector modules | Phase 2 | High | Outlined output retains appearance; editable text remains available in project source. |

### Phase 4 — Advanced Image Editing Engine

| Task | Modules | Depends on | Challenge / risk | Verification and completion criteria |
|---|---|---|---|---|
| 4.1 Introduce asset store and image references | `src/assets/`, IndexedDB repository, project adapters | Phase 1.2 | High: migration and quota behavior | Large image assets save/reopen without embedding repeated base64 in history snapshots. |
| 4.2 Separate nondestructive image adjustments from source pixels | `src/images/` adjustment graph | 4.1, Phase 1.3 | High | Original pixels remain recoverable; edit stack serializes and renders consistently. |
| 4.3 Improve masks, crop, selection and background removal | image modules and UI | 4.2 | High | Resolution, undo, cancellation, alpha edges and mobile memory behavior meet documented limits. |
| 4.4 Add worker/async rendering where profiling supports it | workers/render adapters | 4.2 | Medium/High | UI remains responsive on reference large images; workers have fallback behavior. |

### Phase 5 — Color, Gradients and Effects

| Task | Modules | Depends on | Challenge / risk | Verification and completion criteria |
|---|---|---|---|---|
| 5.1 Normalize fill/stroke/effect schema | `src/document/styles/` | Phase 1.2 | High | Existing styles migrate with no visible changes in reference exports. |
| 5.2 Build shared gradient and opacity-mask model | style/render modules | 5.1 | Medium | Stops, transforms, alpha masks and serialization match in preview/export. |
| 5.3 Add compositing/blend modes and color handling | renderer and color modules | 5.1, Phase 1.4 | High | Rendering behavior is specified and reference-tested; unsupported profiles are explicit. |
| 5.4 Establish color-managed print path | export modules | Phase 9 prerequisites | High | Color profile behavior and output are validated against target print workflow. |

### Phase 6 — Layers, Objects and Workspace

| Task | Modules | Depends on | Challenge / risk | Verification and completion criteria |
|---|---|---|---|---|
| 6.1 Extract object tree and selection model | `src/document/scene/`, `src/editor/selection/` | Phase 1.2, 1.3 | High | Nested groups, visibility, lock, selection and z-order remain stable across edit/save/reopen. |
| 6.2 Build dedicated layer panel and object actions | new layer panel components | 6.1 | Medium | Panel reflects all document mutations and works at desktop/mobile breakpoints. |
| 6.3 Add alignment, snapping, guides and constraints | editor workspace/tool modules | 6.1, Phase 2 | Medium/High | Geometry fixtures and pointer tests cover snapping and transforms. |

### Phase 7 — Multiple Pages and Artboards

| Task | Modules | Depends on | Challenge / risk | Verification and completion criteria |
|---|---|---|---|---|
| 7.1 Formalize page/artboard model and per-page metadata | document schema/migrations | Phase 1.2 | Medium | Existing pages migrate; units/background/size semantics are explicit. |
| 7.2 Add artboard navigation, duplication and reorder | page panel/workspace | 7.1, Phase 6 | Medium | Page operations preserve content and undo/redo correctly. |
| 7.3 Add per-page asset/history handling | project core | 7.1, Phase 1.3, Phase 4 | High | Switching pages and recovery never cross-contaminate state. |

### Phase 8 — Editable `.qpm` project format

| Task | Modules | Depends on | Challenge / risk | Verification and completion criteria |
|---|---|---|---|---|
| 8.1 Specify versioned container and manifest | `src/project-format/` | Phase 1.2, Phase 4.1 | High | Format supports schema version, resource manifest and deterministic round-trip fixtures. |
| 8.2 Add safe import validation and migrations | project-format parser | 8.1 | High: untrusted files | Size/shape/resource validation, clear failure and legacy JSON compatibility tests pass. |
| 8.3 Add atomic save, autosave and recovery | persistence adapters | 8.1, Phase 1.3 | High | Interrupted save/reopen scenarios preserve last valid document and recovery point. |
| 8.4 Add asset packaging and deduplication | asset repository/serializer | 4.1, 8.1 | Medium/High | Repeated assets are stored once; project portability is verified offline. |

### Phase 9 — SVG/PDF and professional print export

| Task | Modules | Depends on | Challenge / risk | Verification and completion criteria |
|---|---|---|---|---|
| 9.1 Define supported SVG export profile and import warnings | `src/export/svg/`, `svgImport.js` | Phase 2, 3, 5, 8 | High | Supported object round-trips are tested; unsupported effects/resources are surfaced. |
| 9.2 Implement vector PDF output | `src/export/pdf/` | 9.1, shared renderer | High | Text/vector output remains vector where supported; opens in independent PDF readers. |
| 9.3 Add multi-page, bleed, trim and preflight | print export modules | Phase 7, 9.2 | High | Page boxes, dimensions, resolution and missing assets/fonts are reported and fixture-checked. |
| 9.4 Validate color, font and raster fallback behavior | export integration | Phase 3, 5, 9.2 | High | Print samples match agreed color/output tolerances and state fallback limitations. |

### Phase 10 — Laptop/Mobile optimization and testing

| Task | Modules | Depends on | Challenge / risk | Verification and completion criteria |
|---|---|---|---|---|
| 10.1 Define device/browser matrix and interaction contract | `docs/`, app test harness | Phase 1.4 | Low/Medium | Supported desktop/mobile browsers, viewport sizes and gestures are explicit. |
| 10.2 Add automated editor workflow coverage | browser test setup and fixtures | Phase 1.1 | Medium | Create/edit/undo/save/open/export and touch workflows run in CI. |
| 10.3 Profile large projects and low-memory devices | renderer/assets/mobile UI | Phases 2–9 | High | Agreed project-size performance budgets are met or graceful limits are shown. |
| 10.4 Complete accessibility, keyboard and responsive review | UI components/styles | Phase 6, 10.1 | Medium | Core workflows are operable by keyboard and touch; no critical layout/gesture regressions on matrix. |

## 9. Recommended first implementation task

**Create a representative editor workflow regression baseline before extracting or replacing editor internals.** Add an app-level test harness and fixtures for: add/edit/move/group objects, draw/edit a vector path, change page, undo/redo, save/reopen `.qpm`, restore recovery, import a supported SVG, and export PNG/PDF. Include representative Arabic/Urdu and image-heavy documents. This is the lowest-regret first implementation because the current editor already has broad functionality and is monolithic; measurable behavioral coverage will make every later module extraction safer. Keep all existing code and project formats intact in this first task.

