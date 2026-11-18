# Qadri Poster Maker — Phase 2 Task 4 Investigation

**Scope:** Read-only investigation of the starter text encoding and undo/redo limitations. No application code, tests, configuration, dependencies, or existing reports were modified. This report is the only file created for this task.

## 1. Git status and preservation

Before inspection, Git reported branch `main` tracking `origin/main`, with pre-existing modifications to `package.json`, `package-lock.json`, `src/App.css`, and `src/App.jsx`. Pre-existing untracked items included the earlier phase reports, `playwright.config.js`, `tests/`, `src/utils/regressionBaseline.test.js`, and other user files/directories. The existing diffs were left untouched. The working `App.jsx` is user-modified; comparisons below distinguish it from `HEAD` and do not attribute when the change was made.

The four requested reports were read. Their prior evidence records 146 Node tests and a production build passing in Task 1, and 12 Playwright cases passing with 2 intentional project-specific skips in Task 3. Task 3 reports that the browser suite exercised Edge desktop (1440 × 900) and Edge mobile emulation (390 × 844), and observed the starter text as mojibake. Those are prior results, not tests run in this investigation.

## 2. Starter text encoding investigation

### Finding

The starter phrase is already corrupted in the current JavaScript source literal. This is not a runtime UTF-8 decoding, JSON, or localStorage conversion problem.

- Working-tree `src/App.jsx` is valid UTF-8 with a BOM. In `addText()` at [src/App.jsx:1644](src/App.jsx), the inserted object’s `text` literal at line 1651 is `"Ø§Ù¾Ù†Ø§ Ù…ØªÙ† ÛŒÛØ§Úº Ù„Ú©Ú¾ÛŒÚº"`.
- The corresponding `HEAD` source is valid UTF-8 without a BOM and contains the intended Urdu phrase `"اپنا متن یہاں لکھیں"` at the same `addText()` object initializer. Decoding the current mojibake through the inverse CP1252/Latin-1 mapping yields exactly that phrase. The current BOM is not the cause: the literal itself differs from the repository version.
- The Playwright report independently records the starter placeholder looking corrupted in a browser screenshot. It also reports that explicitly typed Urdu and Arabic survive text entry and are present in the canvas DOM. This narrows the observed defect to source-provided strings rather than all Unicode input. Pixel-level glyph shaping was not established by those DOM assertions.

### Data path and related strings

`addText()` constructs a plain object with a JavaScript string. The text editor is controlled by `selectedObject.text` and calls `updateSelected({ text: event.target.value })` on change (around [src/App.jsx:4457](src/App.jsx)). Project/file and recovery paths serialize and parse ordinary JSON: [src/utils/projectFileManager.js](src/utils/projectFileManager.js), [src/utils/projectStorage.js](src/utils/projectStorage.js), and [src/utils/projectRecovery.js](src/utils/projectRecovery.js). These paths do not apply charset conversion. Existing serialization tests and the prior Playwright save/reopen workflow report Unicode project data surviving those paths.

The dirty `App.jsx` also contains other Urdu/Arabic built-in samples and interface strings with similar mojibake (for example `islamicShapes` labels around lines 204–209). Thus the observed source-text corruption is not confined to the one starter phrase, though the starter is the confirmed browser-visible instance under investigation. The source has no replacement-character evidence for this phrase; its characters are valid Unicode representing the wrong, mojibaked sequence.

`fix-encoding.cjs` is present in the workspace and was inspected, not executed. It attempts a whole-file conversion and creates an `App.backup-before-encoding-fix.jsx` copy. It is too broad for a safe targeted repair of the already user-modified file and should not be run as-is.

**Root cause:** the working-tree `addText()` default literal was changed from the intended Urdu phrase to a CP1252/Latin-1-style mojibake sequence. The display is faithful to the string the application receives. The separate question of whether every bundled Urdu/Arabic string is correct remains an inventory/review task.

## 3. Undo/redo architecture investigation

### State and snapshot lifecycle

In [src/App.jsx:1301](src/App.jsx), `saveHistory()` appends `serializeObjectSnapshot(objects)` to React `history` and clears `redoStack`. In [src/utils/objectHistory.js](src/utils/objectHistory.js), serialization is only `JSON.stringify(objects)` and restoration is `JSON.parse(snapshot)`. The history snapshots contain the object array only, not document settings, pages, selection, or other editor state. There is no equality/deduplication check or history depth/byte limit in this path.

`undo()` at [src/App.jsx:1309](src/App.jsx) pops the last history snapshot, pushes current objects to redo, restores objects, filters existing selected IDs against the restored array, and updates selected ID(s). `redo()` at [src/App.jsx:1334](src/App.jsx) performs the symmetric operation. While drawing a path, Ctrl/Cmd+Z instead removes a point from `pathDraft` (lines 1310–1312). Keyboard Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z, Ctrl/Cmd+Y route to these same handlers around lines 2577–2583; toolbar actions also use the same undo/redo functions.

### Operation coverage observed in source

- **History is explicitly saved** for common object commands such as add text, add shape, duplication/deletion, group operations, path completion, and many toolbar property controls. For example, toolbar property controls commonly call `saveHistory` on focus/pointer down before `updateSelected`.
- **Text field changes do not create a snapshot.** `updateSelected()` at [src/App.jsx:1495](src/App.jsx) only updates the selected object. The text field’s `onChange` invokes that helper without `saveHistory` or a focus snapshot. The prior Playwright report documents the real-browser consequence: after adding and editing text, Undo undid the preceding text-object creation instead of reverting the edit; Redo restored the object without selecting it. This is the confirmed reported limitation.
- **Image file upload/replacement bypasses the object history helper.** `uploadImage()` at [src/App.jsx:2631](src/App.jsx) updates/replaces or appends objects in the `FileReader.onload` callback without a preceding `saveHistory()`.
- **Page operations are outside this history.** `addPage`, `renamePage`, and `deletePage` at [src/App.jsx:1356](src/App.jsx)–[src/App.jsx:1408](src/App.jsx) update `pages` and/or `currentPageId` without saving an object snapshot. The snapshots themselves cannot restore page names, membership, or page selection.
- Background/document settings are held in separate React state and are not represented in `serializeObjectSnapshot(objects)`. An operation that only changes those values is therefore not restored by this object-only undo stack.
- Some object transformations/property edits have history hooks; coverage is interaction-specific. There are controls that call `updateSelected` without a nearby history hook, so the source does not support a claim that all property edits are undoable. A complete control-by-control audit should be part of implementation planning before broadening semantics.

### Save/load, restoration and selection

Project save and recovery capture project/document data, not undo stacks. `applyProject()` at [src/App.jsx:3408](src/App.jsx) loads project objects/pages and clears `history` and `redoStack` around lines 3472–3473. `resetProjectState()` also clears both stacks around lines 1453–1454. Consequently, history is session-memory-only and intentionally does not survive loading/reopening a project. This is distinct from saved poster content being lost.

Undo/redo restore the object array from the snapshot; the observed edited-text problem is primarily a **missing snapshot before the edit**, rather than evidence that JSON restoration corrupts object text. Selection is synchronized by filtering the current selected IDs against restored objects. When undo removes a newly added object, its selection disappears; redo restores the object but does not restore the prior selection because the current selection list no longer contains that ID. That explains the Playwright observation that the redone object was not selected.

Snapshots are added by event handlers using the current render’s `objects`, `history`, and `redoStack`. The available evidence identifies missing history calls as the demonstrated defect; it does not establish stale React closures as the cause. Fast consecutive interaction/keyboard behavior should nevertheless be covered by regression tests if history logic is changed.

**Root cause:** undo is an opt-in snapshot mechanism for object-array changes, not a document-wide command history. The text input updates the object without recording its pre-edit state, so undo consumes an older snapshot. Image upload/replacement, page metadata/selection, and document settings also bypass or fall outside this object-only history model. Redo mirrors snapshots correctly for recorded object operations, subject to selection not being restored and the same coverage gaps.

## 4. Minimal repair plans (not implemented)

### A. Starter string repair

- **Root cause:** mojibake is embedded in the current `addText()` source literal; runtime storage faithfully preserves it.
- **Files/functions:** targeted literal in `src/App.jsx`, `addText()` around line 1651. Review other known built-in literals separately; do not bulk-convert the full dirty file.
- **Minimal change:** restore the verified intended Urdu phrase in the default object initializer using UTF-8 source. Do not migrate or silently rewrite already saved user projects.
- **Risk:** low for changing only this default; moderate if attempting to normalize other built-in strings without a verified source/reference.
- **Must remain unchanged:** default object style, insertion position, editing/persistence semantics, all user project content, and unrelated user edits in `App.jsx`.
- **Regression tests:** add a browser assertion for the exact default phrase; save/reopen it and verify code points/text remain intact; keep tests for user-entered Urdu and Arabic. Review screenshot/rendering separately because DOM text assertions do not verify shaping.
- **Manual checks:** Edge desktop and mobile emulation; actual phone/tablet check if available; verify default glyphs, typing/editing Urdu and Arabic, save/reopen, and PNG export. Inspect bundled sample labels if they are included in the eventual scope.
- **Rollback:** revert only the exact literal hunk, preserving all surrounding user changes. Avoid the whole-file `fix-encoding.cjs` path.

### B. Undo/redo repair

- **Root cause:** `updateSelected()` and the text input do not record a pre-edit object snapshot. Several other commands bypass `saveHistory`; page/document state is not represented by the object snapshot. No demonstrated evidence points to stale closures as the root cause.
- **Files/functions:** initially `src/App.jsx` `saveHistory`, `undo`, `redo`, `updateSelected`, text editor input, and `uploadImage`; page handlers only if a separately scoped decision is made to include pages. `src/utils/objectHistory.js` is a pure snapshot helper but currently does not manage transactions/stacks.
- **Minimal change:** first repair text editing with one snapshot per edit transaction (for example, capture the original object once at edit start rather than one snapshot per keystroke). Explicitly define focus-without-change, cancel, IME composition, multi-selection, and redo behavior before choosing the event wiring. In a separate small step, add a pre-change snapshot to image upload/replacement. Do not silently expand object-only undo to all document settings/pages in the same patch; that is a larger history-model change.
- **Risk:** moderate. Snapshot timing affects undo granularity and redo; composition input and pointer/focus events can create duplicate/no-op entries. A new history abstraction or document-wide history has higher risk and should be separately reviewed.
- **Must remain unchanged:** current recorded object operations, project file schema and save/recovery content, tool behavior, and undo/redo keyboard shortcuts. Reopening a project should continue to clear session history unless product behavior is explicitly changed later.
- **Regression tests:** pure snapshot/stack tests for ordering and redo invalidation; Playwright test editing existing text then undo/redo while keeping the object; add-text then edit sequence (undo edit first, then creation); Urdu/Arabic IME or composition entry; image add and replacement; transform/property edit; delete/group/layer order; save/reopen persistence of document data with a fresh history stack. Include rapid consecutive keyboard actions.
- **Manual checks:** desktop mouse/keyboard and mobile touch flows for text editing, object transforms, image replacement, undo/redo and selection state; ensure no accidental history per keystroke or focus-only action.
- **Rollback:** revert only the changed handler/test hunks; retain current object snapshot code and all existing editor state. Do not restore/replace the full `App.jsx`.

## 5. Regression testing strategy

Use the existing Node suite (146-test explicit command recorded in the prior plan) for pure snapshot, serialization and recovery behavior. Use the existing Playwright Edge setup for real UI event flows, with desktop and mobile **emulation** reported separately. Test observable data before relying on pixel comparisons; add visual review for Urdu/Arabic shaping and export parity. Capture failures and traces/screenshots outside the repository as the existing browser setup does. No tests were added or run in this investigation.

History assertions should explicitly separate: (1) object data restoration, (2) selection restoration, (3) persistence after project save/reopen, and (4) operations intentionally outside current object history. This avoids labeling the deliberate history reset on project load as saved-project data loss.

## 6. Safest first modular extraction candidate

The safest candidate to consider after approval is the pure `getCssBackgroundGradient(colors, angle)` helper at [src/App.jsx:199](src/App.jsx), moved unchanged into a small utility module. It has no React or editor-state dependency and deterministic string output, making it easy to unit-test and independently roll back. Its initial tests can assert existing outputs exactly. This is deliberately a small boundary and not a recommendation to extract background state or redesign the background panel.

This is safer than extracting canvas rendering or editor/history state first: canvas and state paths are coupled to coordinate transforms, selection, pages, persistence, and a large number of event handlers, where a behavioral mismatch could affect existing projects. The gradient helper does not read or mutate project state or alter the saved project schema.

## 7. Next recommended implementation task

After review/approval, make a narrow encoding correction to the single verified starter phrase and add a regression assertion for it. Keep any broader built-in string cleanup separately scoped. Then address text-edit undo as an isolated history transaction change with focused unit/browser coverage. Do not combine the two repairs or begin architectural extraction in the same implementation task.

## Verification and limitations

This was source/report inspection only. No application, test, build, or browser command was run; no pass/fail claims are made for this investigation. Exact Unicode source comparison and browser observations are cited as evidence from the prior Task 3 work. Physical-device rendering, Urdu/Arabic glyph shaping quality, every `updateSelected` caller’s history coverage, and whole-document undo semantics remain unverified.
