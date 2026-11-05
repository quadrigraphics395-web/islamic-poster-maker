import { useCallback, useEffect, useRef, useState } from "react";
import {
  combineColorSelections,
  paintAlpha,
  removeSelectedPixels,
} from "../utils/backgroundRemoval.js";
import "./BackgroundRemover.css";

const HISTORY_LIMIT = 12;
const HISTORY_BYTE_LIMIT = 32 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 12_000_000;

function decodeImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The selected image could not be decoded."));
    image.src = source;
  });
}

function trimHistory(history) {
  let bytes = history.reduce((total, snapshot) => total + snapshot.byteLength, 0);
  while (history.length > 1 && (history.length > HISTORY_LIMIT || bytes > HISTORY_BYTE_LIMIT)) {
    bytes -= history.shift().byteLength;
  }
}

function readPixel(data, width, x, y) {
  const offset = (y * width + x) * 4;
  return `rgb(${data[offset]}, ${data[offset + 1]}, ${data[offset + 2]})`;
}

function createAlphaSnapshot(data) {
  const alpha = new Uint8Array(data.length / 4);
  for (let index = 0; index < alpha.length; index += 1) alpha[index] = data[index * 4 + 3];
  return alpha;
}

function restoreAlphaSnapshot(data, snapshot) {
  for (let index = 0; index < snapshot.length; index += 1) data[index * 4 + 3] = snapshot[index];
}

export default function BackgroundRemover({ imageSrc, onApply, onCancel }) {
  const viewportRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const imageDataRef = useRef(null);
  const originalDataRef = useRef(null);
  const selectionsRef = useRef([]);
  const brushSnapshotRef = useRef(null);
  const brushChangedRef = useRef(false);
  const paintingRef = useRef(false);
  const undoRef = useRef([]);
  const redoRef = useRef([]);
  const dimensionsRef = useRef(null);
  const [dimensions, setDimensions] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [mode, setMode] = useState("contiguous");
  const [tool, setTool] = useState("wand");
  const [tolerance, setTolerance] = useState(24);
  const [brushSize, setBrushSize] = useState(30);
  const [hardness, setHardness] = useState(100);
  const [addSelection, setAddSelection] = useState(false);
  const [selections, setSelections] = useState([]);
  const [undoCount, setUndoCount] = useState(0);
  const [redoCount, setRedoCount] = useState(0);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  const fitImage = useCallback((imageSize = dimensionsRef.current) => {
    const viewport = viewportRef.current;
    if (!viewport || !imageSize) return;
    const nextZoom = Math.min(
      (viewport.clientWidth - 48) / imageSize.width,
      (viewport.clientHeight - 48) / imageSize.height,
      1,
    );
    setZoom(Math.max(0.02, nextZoom));
  }, []);

  const redrawImage = useCallback(() => {
    const imageCanvas = canvasRef.current;
    const overlayCanvas = overlayRef.current;
    const imageData = imageDataRef.current;
    if (!imageCanvas || !overlayCanvas || !imageData) return;

    imageCanvas.getContext("2d").putImageData(imageData, 0, 0);
    const overlayContext = overlayCanvas.getContext("2d");
    const overlayData = overlayContext.createImageData(imageData.width, imageData.height);
    const mask = selectionsRef.current;
    for (let index = 0; index < mask.length; index += 1) {
      if (mask[index]) {
        const offset = index * 4;
        overlayData.data[offset] = 29;
        overlayData.data[offset + 1] = 174;
        overlayData.data[offset + 2] = 145;
        overlayData.data[offset + 3] = 96;
      }
    }
    overlayContext.putImageData(overlayData, 0, 0);
  }, []);

  const refreshSelectionMask = useCallback(async (nextSelections, nextTolerance = tolerance) => {
    const imageData = imageDataRef.current;
    if (!imageData) return;
    const mask = await combineColorSelections(
      imageData.data,
      imageData.width,
      imageData.height,
      nextSelections,
      nextTolerance,
    );
    selectionsRef.current = mask;
    redrawImage();
  }, [redrawImage, tolerance]);

  useEffect(() => {
    let active = true;
    decodeImage(imageSrc).then((image) => {
      if (!active) return;
      const { naturalWidth: width, naturalHeight: height } = image;
      if (!width || !height || width * height > MAX_IMAGE_PIXELS) {
        throw new Error("This image is too large to edit safely in your browser (maximum 12 megapixels).");
      }
      const canvas = canvasRef.current;
      const overlay = overlayRef.current;
      if (!canvas || !overlay) return;
      canvas.width = width;
      canvas.height = height;
      overlay.width = width;
      overlay.height = height;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      context.drawImage(image, 0, 0);
      const original = context.getImageData(0, 0, width, height);
      originalDataRef.current = new ImageData(
        new Uint8ClampedArray(original.data),
        width,
        height,
      );
      imageDataRef.current = new ImageData(new Uint8ClampedArray(original.data), width, height);
      dimensionsRef.current = { width, height };
      setDimensions({ width, height });
      setBusy(false);
      requestAnimationFrame(() => fitImage({ width, height }));
    }).catch((loadError) => {
      if (active) {
        setError(loadError.message || "The selected image could not be opened.");
        setBusy(false);
      }
    });

    return () => {
      active = false;
    };
  }, [fitImage, imageSrc]);

  useEffect(() => {
    if (!dimensions) return undefined;
    const observer = new ResizeObserver(() => fitImage());
    if (viewportRef.current) observer.observe(viewportRef.current);
    return () => observer.disconnect();
  }, [dimensions, fitImage]);

  const rememberEdit = useCallback((snapshot = createAlphaSnapshot(imageDataRef.current.data)) => {
    const undo = undoRef.current;
    undo.push(snapshot);
    trimHistory(undo);
    redoRef.current = [];
    setUndoCount(undo.length);
    setRedoCount(0);
  }, []);

  const undo = useCallback(() => {
    if (!undoRef.current.length || !imageDataRef.current) return;
    const current = createAlphaSnapshot(imageDataRef.current.data);
    const previous = undoRef.current.pop();
    redoRef.current.push(current);
    trimHistory(redoRef.current);
    restoreAlphaSnapshot(imageDataRef.current.data, previous);
    selectionsRef.current = new Uint8Array(imageDataRef.current.data.length / 4);
    setSelections([]);
    redrawImage();
    setUndoCount(undoRef.current.length);
    setRedoCount(redoRef.current.length);
  }, [redrawImage]);

  const redo = useCallback(() => {
    if (!redoRef.current.length || !imageDataRef.current) return;
    const current = createAlphaSnapshot(imageDataRef.current.data);
    const next = redoRef.current.pop();
    undoRef.current.push(current);
    trimHistory(undoRef.current);
    restoreAlphaSnapshot(imageDataRef.current.data, next);
    selectionsRef.current = new Uint8Array(imageDataRef.current.data.length / 4);
    setSelections([]);
    redrawImage();
    setUndoCount(undoRef.current.length);
    setRedoCount(redoRef.current.length);
  }, [redrawImage]);

  const removeSelection = useCallback(() => {
    const imageData = imageDataRef.current;
    if (!imageData || !selectionsRef.current.some(Boolean)) return;
    const before = createAlphaSnapshot(imageData.data);
    if (!removeSelectedPixels(imageData.data, selectionsRef.current)) return;
    rememberEdit(before);
    selectionsRef.current = new Uint8Array(imageData.data.length / 4);
    setSelections([]);
    redrawImage();
  }, [redrawImage, rememberEdit]);

  const handleKeyDown = useCallback((event) => {
    if (event.key === "Escape") {
      onCancel();
      return;
    }
    const target = event.target;
    if (target instanceof HTMLElement && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
      event.preventDefault();
      if (event.shiftKey) redo();
      else undo();
    } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
      event.preventDefault();
      redo();
    } else if (event.key === "Delete" && selectionsRef.current.some(Boolean)) {
      event.preventDefault();
      removeSelection();
    }
  }, [onCancel, redo, removeSelection, undo]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  async function addColorAt(event) {
    const imageData = imageDataRef.current;
    const canvas = canvasRef.current;
    if (!imageData || !canvas || busy) return;
    const bounds = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(imageData.width - 1, Math.floor((event.clientX - bounds.left) / bounds.width * imageData.width)));
    const y = Math.max(0, Math.min(imageData.height - 1, Math.floor((event.clientY - bounds.top) / bounds.height * imageData.height)));
    const index = (y * imageData.width + x) * 4;
    if (imageData.data[index + 3] === 0) return;

    const selection = {
      id: `${Date.now()}-${Math.random()}`,
      x,
      y,
      color: readPixel(imageData.data, imageData.width, x, y),
      mode,
    };
    const nextSelections = event.shiftKey || addSelection
      ? [...selections, selection]
      : [selection];
    setBusy(true);
    setError("");
    try {
      await refreshSelectionMask(nextSelections);
      setSelections(nextSelections);
    } catch (selectionError) {
      setError(selectionError.message || "Could not select pixels from this image.");
    } finally {
      setBusy(false);
    }
  }

  async function removeSwatch(id) {
    const nextSelections = selections.filter((selection) => selection.id !== id);
    setBusy(true);
    try {
      await refreshSelectionMask(nextSelections);
      setSelections(nextSelections);
    } catch (selectionError) {
      setError(selectionError.message || "Could not update the selection.");
    } finally {
      setBusy(false);
    }
  }

  async function updateTolerance(value) {
    const nextTolerance = Number(value);
    setTolerance(nextTolerance);
    if (!selections.length) return;
    setBusy(true);
    try {
      await refreshSelectionMask(selections, nextTolerance);
    } catch (selectionError) {
      setError(selectionError.message || "Could not update the selection.");
    } finally {
      setBusy(false);
    }
  }

  function clearSelection() {
    if (!imageDataRef.current) return;
    selectionsRef.current = new Uint8Array(imageDataRef.current.data.length / 4);
    setSelections([]);
    redrawImage();
  }

  function restoreOriginal() {
    if (!imageDataRef.current || !originalDataRef.current) return;
    rememberEdit();
    imageDataRef.current = new ImageData(
      new Uint8ClampedArray(originalDataRef.current.data),
      originalDataRef.current.width,
      originalDataRef.current.height,
    );
    selectionsRef.current = new Uint8Array(imageDataRef.current.data.length / 4);
    setSelections([]);
    redrawImage();
  }

  function pointerToImage(event) {
    const canvas = canvasRef.current;
    const imageData = imageDataRef.current;
    const bounds = canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(imageData.width - 1, (event.clientX - bounds.left) / bounds.width * imageData.width)),
      y: Math.max(0, Math.min(imageData.height - 1, (event.clientY - bounds.top) / bounds.height * imageData.height)),
    };
  }

  function paintBetween(from, to, restore) {
    const imageData = imageDataRef.current;
    if (!imageData) return;
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    const step = Math.max(1, brushSize * 0.2);
    const steps = Math.ceil(distance / step);
    for (let index = 0; index <= steps; index += 1) {
      const progress = steps ? index / steps : 1;
      brushChangedRef.current = paintAlpha(
        imageData.data,
        originalDataRef.current.data,
        imageData.width,
        imageData.height,
        from.x + (to.x - from.x) * progress,
        from.y + (to.y - from.y) * progress,
        brushSize / 2,
        hardness / 100,
        restore,
      ) || brushChangedRef.current;
    }
  }

  function startBrush(event, restore) {
    if (!imageDataRef.current || busy) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    paintingRef.current = true;
    brushSnapshotRef.current = createAlphaSnapshot(imageDataRef.current.data);
    brushChangedRef.current = false;
    const point = pointerToImage(event);
    moveBrush.previousPoint = point;
    paintBetween(point, point, restore);
    redrawImage();
  }

  function moveBrush(event, restore) {
    if (!paintingRef.current) return;
    const next = pointerToImage(event);
    paintBetween(moveBrush.previousPoint ?? next, next, restore);
    moveBrush.previousPoint = next;
    redrawImage();
  }

  function endBrush() {
    if (!paintingRef.current) return;
    paintingRef.current = false;
    if (brushChangedRef.current && brushSnapshotRef.current) rememberEdit(brushSnapshotRef.current);
    brushSnapshotRef.current = null;
    brushChangedRef.current = false;
    moveBrush.previousPoint = null;
  }

  async function applyChanges() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setBusy(true);
    setError("");
    try {
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((result) => {
          if (result) resolve(result);
          else reject(new Error("Could not encode the edited image as a transparent PNG."));
        }, "image/png");
      });
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") onApply(reader.result);
        else {
          setError("Could not read the edited PNG.");
          setBusy(false);
        }
      };
      reader.onerror = () => {
        setError("Could not read the edited PNG.");
        setBusy(false);
      };
      reader.readAsDataURL(blob);
    } catch (applyError) {
      setError(applyError.message || "Could not apply the image edits.");
      setBusy(false);
    }
  }

  const displayedWidth = dimensions ? dimensions.width * zoom : 0;
  const displayedHeight = dimensions ? dimensions.height * zoom : 0;

  return (
    <div className="background-remover-backdrop">
      <section className="background-remover" role="dialog" aria-modal="true" aria-labelledby="background-remover-title">
        <header className="background-remover-header">
          <div>
            <span>IMAGE EDITOR</span>
            <h2 id="background-remover-title">Background Remover</h2>
          </div>
          <div className="background-remover-zoom">
            <button type="button" aria-label="Zoom out" disabled={!dimensions} onClick={() => setZoom((value) => Math.max(0.02, value / 1.25))}>−</button>
            <span>{Math.round(zoom * 100)}%</span>
            <button type="button" aria-label="Zoom in" disabled={!dimensions} onClick={() => setZoom((value) => Math.min(8, value * 1.25))}>+</button>
            <button type="button" onClick={fitImage}>Fit</button>
          </div>
          <button type="button" className="background-remover-close" aria-label="Cancel image editing" onClick={onCancel}>×</button>
        </header>

        <div className="background-remover-workspace">
          <aside className="background-remover-tools" aria-label="Image editing tools">
            <span className="background-remover-panel-title">TOOLS</span>
            <button type="button" className={tool === "wand" ? "is-active" : ""} onClick={() => setTool("wand")}>✳ Magic Wand</button>
            <button type="button" className={tool === "eraser" ? "is-active" : ""} onClick={() => setTool("eraser")}>⌫ Eraser</button>
            <button type="button" className={tool === "restore" ? "is-active" : ""} onClick={() => setTool("restore")}>↶ Restore</button>
            <button type="button" onClick={undo} disabled={!undoCount}>↶ Undo</button>
            <button type="button" onClick={redo} disabled={!redoCount}>↷ Redo</button>
            <button type="button" onClick={restoreOriginal} disabled={!dimensions}>Original</button>
          </aside>

          <div className="background-remover-canvas-wrap" ref={viewportRef}>
            <div className="background-remover-canvas-stack" style={{ width: displayedWidth, height: displayedHeight }}>
              <canvas
                ref={canvasRef}
                className="background-remover-image-canvas"
                style={{ width: displayedWidth, height: displayedHeight }}
                onPointerDown={tool === "wand" ? addColorAt : (event) => startBrush(event, tool === "restore")}
                onPointerMove={tool === "wand" ? undefined : (event) => moveBrush(event, tool === "restore")}
                onPointerUp={endBrush}
                onPointerCancel={endBrush}
              />
              <canvas
                ref={overlayRef}
                className="background-remover-selection-canvas"
                aria-hidden="true"
                style={{ width: displayedWidth, height: displayedHeight, pointerEvents: "none" }}
              />
            </div>
            {busy && <div className="background-remover-busy">Processing pixels…</div>}
            {error && <div className="background-remover-error" role="alert">{error}</div>}
          </div>

          <aside className="background-remover-settings">
            <span className="background-remover-panel-title">SELECTION</span>
            <div className="background-remover-mode" role="group" aria-label="Color selection mode">
              <button type="button" className={mode === "contiguous" ? "is-active" : ""} aria-pressed={mode === "contiguous"} onClick={() => setMode("contiguous")}>Contiguous</button>
              <button type="button" className={mode === "similar" ? "is-active" : ""} aria-pressed={mode === "similar"} onClick={() => setMode("similar")}>Similar colors</button>
            </div>
            <label className="background-remover-control">
              <span>Tolerance <strong>{tolerance}</strong></span>
              <input type="range" min="0" max="255" value={tolerance} onChange={(event) => updateTolerance(event.target.value)} />
            </label>
            <label className="background-remover-toggle">
              <input type="checkbox" checked={addSelection} onChange={(event) => setAddSelection(event.target.checked)} />
              Add to selection
            </label>
            <div className="background-remover-swatches-heading">
              <span>Selected colors</span>
              <button type="button" disabled={!selections.length} onClick={clearSelection}>Clear all</button>
            </div>
            <div className="background-remover-swatches">
              {selections.map((selection) => (
                <span key={selection.id} className="background-remover-swatch">
                  <i style={{ backgroundColor: selection.color }} />
                  <button type="button" aria-label={`Remove ${selection.color} from selection`} onClick={() => removeSwatch(selection.id)}>×</button>
                </span>
              ))}
              {!selections.length && <span className="background-remover-empty">Click a color to select pixels.</span>}
            </div>
            <label className="background-remover-control">
              <span>Brush size <strong>{brushSize}px</strong></span>
              <input type="range" min="2" max="300" value={brushSize} onChange={(event) => setBrushSize(Number(event.target.value))} />
            </label>
            <label className="background-remover-control">
              <span>Hardness <strong>{hardness}%</strong></span>
              <input type="range" min="0" max="100" value={hardness} onChange={(event) => setHardness(Number(event.target.value))} />
            </label>
            <button type="button" className="background-remover-delete" disabled={!selections.length || busy} onClick={removeSelection}>Remove Background / Delete</button>
            <button type="button" className="background-remover-deselect" disabled={!selections.length} onClick={clearSelection}>Deselect</button>
            {dimensions && <span className="background-remover-resolution">{dimensions.width} × {dimensions.height}px</span>}
          </aside>
        </div>

        <footer className="background-remover-footer">
          <span>Shift + click adds a color · Ctrl/Cmd + Z undoes · Select a layer in Poster Editor to access it later</span>
          <div>
            <button type="button" className="background-remover-cancel" onClick={onCancel}>Cancel</button>
            <button type="button" className="background-remover-apply" disabled={!dimensions || busy} onClick={applyChanges}>Apply Changes</button>
          </div>
        </footer>
      </section>
    </div>
  );
}
