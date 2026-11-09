import { useEffect, useRef, useState } from "react";
import { DEFAULT_CROP_RECT, moveCropRect, normalizeCropRect, resizeCropRect } from "../utils/imageCrop.js";
import "./ImageCropEditor.css";

const cropHandles = ["top-left", "top", "top-right", "right", "bottom-right", "bottom", "bottom-left", "left"];

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

export default function ImageCropEditor({ src, initialCrop, onApply, onCancel }) {
  const [crop, setCrop] = useState(() => normalizeCropRect(initialCrop ?? DEFAULT_CROP_RECT));
  const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 });
  const [mode, setMode] = useState("crop");
  const [imageSize, setImageSize] = useState(null);
  const [stageWidth, setStageWidth] = useState(0);
  const [error, setError] = useState("");
  const stageRef = useRef(null);
  const stageWrapRef = useRef(null);
  const dragRef = useRef(null);

  useEffect(() => {
    const image = new Image();
    image.onload = () => {
      if (image.naturalWidth && image.naturalHeight) setImageSize({ width: image.naturalWidth, height: image.naturalHeight });
      else setError("This image has no usable dimensions.");
    };
    image.onerror = () => setError("The image could not be opened for cropping.");
    image.src = src;
    return () => { image.onload = null; image.onerror = null; };
  }, [src]);

  useEffect(() => {
    if (!imageSize || !stageWrapRef.current) return undefined;
    const measureStage = () => {
      const wrapper = stageWrapRef.current;
      if (!wrapper) return;
      const styles = window.getComputedStyle(wrapper);
      const availableWidth = wrapper.clientWidth - Number.parseFloat(styles.paddingLeft) - Number.parseFloat(styles.paddingRight);
      const maxHeight = window.innerHeight * (window.matchMedia("(max-width: 600px)").matches ? 0.48 : 0.58);
      const aspectRatio = imageSize.width / imageSize.height;
      setStageWidth(Math.max(1, Math.floor(Math.min(740, availableWidth, maxHeight * aspectRatio))));
    };
    measureStage();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measureStage);
    observer?.observe(stageWrapRef.current);
    window.addEventListener("resize", measureStage);
    window.visualViewport?.addEventListener("resize", measureStage);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measureStage);
      window.visualViewport?.removeEventListener("resize", measureStage);
    };
  }, [imageSize]);

  function beginDrag(event, handle = "move") {
    if (!stageRef.current || !imageSize || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const bounds = stageRef.current.getBoundingClientRect();
    dragRef.current = {
      pointerId: event.pointerId,
      handle,
      startX: event.clientX,
      startY: event.clientY,
      bounds,
      crop,
      imageOffset,
      mode,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function updateDrag(event) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const deltaX = (event.clientX - drag.startX) / drag.bounds.width;
    const deltaY = (event.clientY - drag.startY) / drag.bounds.height;
    if (drag.mode === "reposition" && drag.handle === "move") {
      const nextCrop = {
        ...drag.crop,
        x: clamp(drag.crop.x - deltaX, 0, 1 - drag.crop.width),
        y: clamp(drag.crop.y - deltaY, 0, 1 - drag.crop.height),
      };
      setCrop(nextCrop);
      setImageOffset({
        x: drag.imageOffset.x + drag.crop.x - nextCrop.x,
        y: drag.imageOffset.y + drag.crop.y - nextCrop.y,
      });
    } else if (drag.handle === "move") {
      setCrop(moveCropRect(drag.crop, deltaX, deltaY));
    } else {
      setCrop(resizeCropRect(drag.crop, drag.handle, deltaX, deltaY));
    }
  }

  function endDrag(event) {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  }

  const displayedCrop = {
    ...crop,
    x: crop.x + imageOffset.x,
    y: crop.y + imageOffset.y,
  };

  return (
    <div className="crop-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
      <section className="crop-dialog" role="dialog" aria-modal="true" aria-labelledby="crop-dialog-title">
        <header className="crop-dialog-header">
          <div><span>IMAGE EDITING</span><h2 id="crop-dialog-title">Crop image</h2></div>
          <button type="button" className="crop-close" aria-label="Cancel crop" onClick={onCancel}>×</button>
        </header>
        <div className="crop-mode-switch" role="group" aria-label="Crop interaction mode">
          <button type="button" aria-pressed={mode === "crop"} className={mode === "crop" ? "is-active" : ""} onClick={() => setMode("crop")}>Move crop area</button>
          <button type="button" aria-pressed={mode === "reposition"} className={mode === "reposition" ? "is-active" : ""} onClick={() => setMode("reposition")}>Reposition image</button>
        </div>
        <div ref={stageWrapRef} className="crop-stage-wrap">
          {imageSize ? (
            <div ref={stageRef} className="crop-stage" style={{ aspectRatio: `${imageSize.width} / ${imageSize.height}`, width: stageWidth ? `${stageWidth}px` : "min(100%, 740px)" }}>
              <img
                className="crop-source-image"
                src={src}
                alt="Image crop preview"
                draggable="false"
                style={{ transform: `translate(${imageOffset.x * 100}%, ${imageOffset.y * 100}%)` }}
                onPointerDown={mode === "reposition" ? (event) => beginDrag(event) : undefined}
                onPointerMove={updateDrag}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
              />
              <div
                className={`crop-selection${mode === "reposition" ? " is-repositioning" : ""}`}
                style={{ left: `${displayedCrop.x * 100}%`, top: `${displayedCrop.y * 100}%`, width: `${crop.width * 100}%`, height: `${crop.height * 100}%` }}
                onPointerDown={mode === "crop" ? (event) => beginDrag(event) : (event) => beginDrag(event)}
                onPointerMove={updateDrag}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
              >
                <span className="crop-grid crop-grid--vertical" aria-hidden="true" />
                <span className="crop-grid crop-grid--horizontal" aria-hidden="true" />
                {cropHandles.map((handle) => (
                  <button
                    key={handle}
                    type="button"
                    className={`crop-handle crop-handle--${handle}`}
                    aria-label={`Resize crop from ${handle.replace("-", " ")}`}
                    onPointerDown={(event) => beginDrag(event, handle)}
                    onPointerMove={updateDrag}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                  />
                ))}
              </div>
            </div>
          ) : <p className="crop-loading">Loading image…</p>}
        </div>
        <p className="crop-help">{mode === "crop" ? "Drag the selected area to move it. Use any corner or edge handle to resize." : "Drag the image under the fixed crop window to choose the retained area."} The original image data stays intact.</p>
        {imageSize && <p className="crop-dimensions">Original: {imageSize.width} × {imageSize.height} px</p>}
        {error && <p className="crop-error" role="alert">{error}</p>}
        <footer className="crop-dialog-footer">
          <button type="button" onClick={onCancel}>Cancel</button>
          <button type="button" className="crop-apply" disabled={!imageSize || Boolean(error)} onClick={() => onApply({ crop, imageSize })}>Apply crop</button>
        </footer>
      </section>
    </div>
  );
}
