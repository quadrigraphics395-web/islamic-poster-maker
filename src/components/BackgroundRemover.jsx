import { useCallback, useEffect, useRef, useState } from "react";
import {
  combineColorSelections,
  paintAlpha,
  removeSelectedPixels,
} from "../utils/backgroundRemoval.js";
import { getWorkingImageDimensions } from "../utils/imageProcessing.js";
import "./BackgroundRemover.css";

const HISTORY_LIMIT = 12;
const HISTORY_BYTE_LIMIT = 32 * 1024 * 1024;
const WORKING_MAX_PIXELS = 5_000_000;

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
  const originalImageRef = useRef(null);
  const workingDimensionsRef = useRef(null);
  const pointersRef = useRef(new Map());
  const panRef = useRef(null);
  const pinchRef = useRef(null);
  const touchEditRef = useRef(null);
  const [dimensions, setDimensions] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [toolsOpen, setToolsOpen] = useState(true);
  const [navigationMode, setNavigationMode] = useState(false);
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
    setPan({ x: 0, y: 0 });
  }, []);

  const changeZoom = useCallback((multiplier) => {
    setZoom((value) => Math.max(0.02, Math.min(8, value * multiplier)));
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
      if (!width || !height) throw new Error("This image has invalid dimensions.");
      originalImageRef.current = image;
      const mobile = window.matchMedia("(max-width: 700px)").matches || (navigator.deviceMemory && navigator.deviceMemory <= 4);
      const pixelLimit = mobile ? 2_000_000 : WORKING_MAX_PIXELS;
      const { width: workWidth, height: workHeight } = getWorkingImageDimensions(width, height, pixelLimit);
      const canvas = canvasRef.current;
      const overlay = overlayRef.current;
      if (!canvas || !overlay) return;
      canvas.width = workWidth;
      canvas.height = workHeight;
      overlay.width = workWidth;
      overlay.height = workHeight;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      context.drawImage(image, 0, 0, workWidth, workHeight);
      const original = context.getImageData(0, 0, workWidth, workHeight);
      originalDataRef.current = new ImageData(
        new Uint8ClampedArray(original.data),
        workWidth,
        workHeight,
      );
      imageDataRef.current = new ImageData(new Uint8ClampedArray(original.data), workWidth, workHeight);
      workingDimensionsRef.current = { width: workWidth, height: workHeight };
      dimensionsRef.current = { width, height };
      setDimensions({ width, height });
      setBusy(false);
      requestAnimationFrame(() => fitImage({ width, height }));
    }).catch((loadError) => {
      if (active) {
        setError(loadError.message || "The image could not be decoded. Try a PNG, JPEG, or WebP image.");
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

  function beginPan(event) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    panRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      panX: pan.x,
      panY: pan.y,
    };
  }

  function updatePan(event) {
    const activePan = panRef.current;
    if (!activePan || activePan.pointerId !== event.pointerId) return false;
    setPan({
      x: activePan.panX + event.clientX - activePan.startX,
      y: activePan.panY + event.clientY - activePan.startY,
    });
    return true;
  }

  function pointerDistance(points) {
    return Math.hypot(points[0].clientX - points[1].clientX, points[0].clientY - points[1].clientY);
  }

  function pointerCenter(points) {
    return {
      x: (points[0].clientX + points[1].clientX) / 2,
      y: (points[0].clientY + points[1].clientY) / 2,
    };
  }

  function beginCanvasPointer(event) {
    if (busy) return;
    if (event.pointerType === "touch") pointersRef.current.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY });
    const points = [...pointersRef.current.values()];
    if (points.length >= 2) {
      endBrush();
      touchEditRef.current = null;
      pinchRef.current = { distance: pointerDistance(points), zoom, pan: { ...pan }, center: pointerCenter(points) };
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }
    if (navigationMode || event.button === 1 || event.shiftKey) {
      beginPan(event);
      return;
    }
    if (event.pointerType === "touch") {
      event.currentTarget.setPointerCapture(event.pointerId);
      touchEditRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, started: false };
      return;
    }
    if (tool === "wand") addColorAt(event);
    else startBrush(event, tool === "restore");
  }

  function updateCanvasPointer(event) {
    if (event.pointerType === "touch" && pointersRef.current.has(event.pointerId)) pointersRef.current.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY });
    const points = [...pointersRef.current.values()];
    if (pinchRef.current && points.length >= 2) {
      event.preventDefault();
      const gesture = pinchRef.current;
      const center = pointerCenter(points);
      const nextZoom = Math.max(0.02, Math.min(8, gesture.zoom * pointerDistance(points) / gesture.distance));
      const viewport = viewportRef.current.getBoundingClientRect();
      const startX = gesture.center.x - (viewport.left + viewport.width / 2);
      const startY = gesture.center.y - (viewport.top + viewport.height / 2);
      const centerX = center.x - (viewport.left + viewport.width / 2);
      const centerY = center.y - (viewport.top + viewport.height / 2);
      const scale = nextZoom / gesture.zoom;
      setZoom(nextZoom);
      setPan({ x: centerX + (gesture.pan.x - startX) * scale, y: centerY + (gesture.pan.y - startY) * scale });
      return;
    }
    if (updatePan(event)) return;
    const touchEdit = touchEditRef.current;
    if (event.pointerType === "touch" && touchEdit?.pointerId === event.pointerId) {
      if (tool !== "wand" && !touchEdit.started && Math.hypot(event.clientX - touchEdit.startX, event.clientY - touchEdit.startY) > 3) {
        touchEdit.started = true;
        startBrush(event, tool === "restore");
      }
      if (touchEdit.started) moveBrush(event, tool === "restore");
      return;
    }
    if (tool !== "wand") moveBrush(event, tool === "restore");
  }

  function endCanvasPointer(event, cancelled = false) {
    if (event.pointerType === "touch") pointersRef.current.delete(event.pointerId);
    if (pinchRef.current) {
      if (pointersRef.current.size < 2) pinchRef.current = null;
      touchEditRef.current = null;
      return;
    }
    if (panRef.current?.pointerId === event.pointerId) {
      panRef.current = null;
      return;
    }
    const touchEdit = touchEditRef.current;
    if (!cancelled && event.pointerType === "touch" && touchEdit?.pointerId === event.pointerId) {
      if (tool === "wand") addColorAt(event);
      else {
        if (!touchEdit.started) startBrush(event, tool === "restore");
        endBrush();
      }
      touchEditRef.current = null;
      return;
    }
    if (cancelled) endBrush();
    else if (tool !== "wand") endBrush();
  }

  function handleWheel(event) {
    if (!dimensions) return;
    event.preventDefault();
    changeZoom(event.deltaY < 0 ? 1.12 : 1 / 1.12);
  }

  function selectTool(nextTool) {
    endBrush();
    setTool(nextTool);
    setNavigationMode(false);
  }

  function toggleNavigation() {
    endBrush();
    setNavigationMode((active) => !active);
  }

  async function applyChanges() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setBusy(true);
    setError("");
    try {
      let outputCanvas = canvas;
      const source = originalImageRef.current;
      const originalSize = dimensionsRef.current;
      const workingSize = workingDimensionsRef.current;
      if (source && originalSize && workingSize && (originalSize.width !== workingSize.width || originalSize.height !== workingSize.height)) {
        outputCanvas = document.createElement("canvas");
        outputCanvas.width = originalSize.width;
        outputCanvas.height = originalSize.height;
        const outputContext = outputCanvas.getContext("2d");
        outputContext.drawImage(source, 0, 0, originalSize.width, originalSize.height);
        const alphaCanvas = document.createElement("canvas");
        alphaCanvas.width = workingSize.width;
        alphaCanvas.height = workingSize.height;
        const alphaContext = alphaCanvas.getContext("2d");
        const alphaPixels = alphaContext.createImageData(workingSize.width, workingSize.height);
        const edited = imageDataRef.current.data;
        for (let pixel = 0; pixel < edited.length; pixel += 4) {
          alphaPixels.data[pixel] = 255;
          alphaPixels.data[pixel + 1] = 255;
          alphaPixels.data[pixel + 2] = 255;
          alphaPixels.data[pixel + 3] = edited[pixel + 3];
        }
        alphaContext.putImageData(alphaPixels, 0, 0);
        outputContext.globalCompositeOperation = "destination-in";
        outputContext.imageSmoothingEnabled = true;
        outputContext.drawImage(alphaCanvas, 0, 0, originalSize.width, originalSize.height);
      }
      const blob = await new Promise((resolve, reject) => {
        outputCanvas.toBlob((result) => {
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
      setError(applyError.name === "SecurityError"
        ? "The browser could not read this image's pixels. Try opening a PNG, JPEG, or WebP copy."
        : applyError.message || "Could not create the transparent PNG. This image may exceed available browser memory.");
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
          <div className="background-remover-view-actions" aria-label="Workspace controls">
            <button type="button" className={toolsOpen ? "is-active" : ""} aria-pressed={toolsOpen} onClick={() => setToolsOpen((open) => !open)}>Tools</button>
            <button type="button" className={navigationMode ? "is-active" : ""} aria-pressed={navigationMode} onClick={toggleNavigation}>{navigationMode ? "Editing" : "Move"}</button>
          </div>
          <div className="background-remover-zoom">
            <button type="button" aria-label="Zoom out" disabled={!dimensions} onClick={() => changeZoom(1 / 1.25)}>−</button>
            <span>{Math.round(zoom * 100)}%</span>
            <button type="button" aria-label="Zoom in" disabled={!dimensions} onClick={() => changeZoom(1.25)}>+</button>
            <button type="button" onClick={fitImage}>Fit</button>
          </div>
          <button type="button" className="background-remover-close" aria-label="Cancel image editing" onClick={onCancel}>×</button>
        </header>

        <div className={`background-remover-workspace${toolsOpen ? " has-tools" : " tools-hidden"}`}>
          <aside className="background-remover-tools" aria-label="Image editing tools" hidden={!toolsOpen}>
            <span className="background-remover-panel-title">TOOLS</span>
            <button type="button" className={tool === "wand" ? "is-active" : ""} onClick={() => selectTool("wand")}>✳ Magic Wand</button>
            <button type="button" className={tool === "eraser" ? "is-active" : ""} onClick={() => selectTool("eraser")}>⌫ Eraser</button>
            <button type="button" className={tool === "restore" ? "is-active" : ""} onClick={() => selectTool("restore")}>↶ Restore</button>
            <button type="button" onClick={undo} disabled={!undoCount}>↶ Undo</button>
            <button type="button" onClick={redo} disabled={!redoCount}>↷ Redo</button>
            <button type="button" onClick={restoreOriginal} disabled={!dimensions}>Original</button>
          </aside>

          <div className="background-remover-canvas-wrap" ref={viewportRef} onWheel={handleWheel}>
            <div className="background-remover-canvas-stack" style={{ width: displayedWidth, height: displayedHeight, transform: `translate(${pan.x}px, ${pan.y}px)` }}>
              <canvas
                ref={canvasRef}
                className="background-remover-image-canvas"
                style={{ width: displayedWidth, height: displayedHeight }}
                onPointerDown={beginCanvasPointer}
                onPointerMove={updateCanvasPointer}
                onPointerUp={(event) => endCanvasPointer(event)}
                onPointerCancel={(event) => endCanvasPointer(event, true)}
                onLostPointerCapture={(event) => endCanvasPointer(event, true)}
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
