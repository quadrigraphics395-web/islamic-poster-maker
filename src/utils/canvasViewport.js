export const MIN_CANVAS_ZOOM = 0.01;
export const MAX_CANVAS_ZOOM = 64;

export function clampCanvasZoom(zoom) {
  const value = Number(zoom);
  if (!Number.isFinite(value)) return 1;
  return Math.min(MAX_CANVAS_ZOOM, Math.max(MIN_CANVAS_ZOOM, value));
}

export function fitBoundsInViewport(bounds, canvasWidth, canvasHeight, viewportWidth, viewportHeight) {
  const values = [bounds?.x, bounds?.y, bounds?.width, bounds?.height, canvasWidth, canvasHeight, viewportWidth, viewportHeight].map(Number);
  if (values.some((value) => !Number.isFinite(value)) || values.slice(2).some((value) => value <= 0)) return null;
  const [x, y, width, height, pageWidth, pageHeight, viewWidth, viewHeight] = values;
  const zoom = clampCanvasZoom(Math.min(viewWidth * 0.82 / width, viewHeight * 0.82 / height));
  const offset = clampCanvasPan({
    x: -(x + width / 2 - pageWidth / 2) * zoom,
    y: -(y + height / 2 - pageHeight / 2) * zoom,
  }, pageWidth, pageHeight, viewWidth, viewHeight, zoom);
  return { zoom, offset };
}

export function fitCanvasToViewport(documentWidth, documentHeight, viewportWidth, viewportHeight, zoom = 1) {
  const values = [documentWidth, documentHeight, viewportWidth, viewportHeight, zoom].map(Number);
  if (values.some((value) => !Number.isFinite(value) || value <= 0)) {
    return { width: 0, height: 0, scale: 0 };
  }

  const [sourceWidth, sourceHeight, availableWidth, availableHeight, zoomLevel] = values;
  const scale = Math.min(availableWidth / sourceWidth, availableHeight / sourceHeight) * zoomLevel;
  return {
    width: sourceWidth * scale,
    height: sourceHeight * scale,
    scale,
  };
}

export function mobilePropertiesWidth(viewportWidth) {
  const width = Number(viewportWidth);
  if (!Number.isFinite(width) || width <= 0) return 80;
  return Math.min(108, Math.max(80, width * 0.24));
}

export function clampCanvasPan(offset, canvasWidth, canvasHeight, viewportWidth, viewportHeight, zoom = 1) {
  const values = [canvasWidth, canvasHeight, viewportWidth, viewportHeight, zoom].map(Number);
  if (values.some((value) => !Number.isFinite(value) || value < 0) || zoom === 0) return { x: 0, y: 0 };
  const [width, height, viewWidth, viewHeight, zoomLevel] = values;
  const maxX = Math.max(0, (width * zoomLevel - viewWidth) / 2);
  const maxY = Math.max(0, (height * zoomLevel - viewHeight) / 2);
  const x = Number(offset?.x);
  const y = Number(offset?.y);
  const clamp = (value, maximum) => {
    const result = Math.min(maximum, Math.max(-maximum, Number.isFinite(value) ? value : 0));
    return Object.is(result, -0) ? 0 : result;
  };
  return {
    x: clamp(x, maxX),
    y: clamp(y, maxY),
  };
}

export function clampCanvasPanWithMargins(offset, canvasWidth, canvasHeight, viewportWidth, viewportHeight, zoom = 1, minVisibleFraction = 0.5) {
  const values = [canvasWidth, canvasHeight, viewportWidth, viewportHeight, zoom, minVisibleFraction].map(Number);
  if (values.some((value) => !Number.isFinite(value) || value < 0) || zoom === 0) {
    return clampCanvasPan(offset, canvasWidth, canvasHeight, viewportWidth, viewportHeight, zoom);
  }
  const [width, height, viewWidth, viewHeight, zoomLevel, visibleFraction] = values;
  const maxOffset = (canvasLength, viewLength) => {
    const scaledLength = canvasLength * zoomLevel;
    return Math.max(0, (scaledLength + viewLength) / 2 - Math.min(scaledLength, viewLength) * Math.min(1, visibleFraction));
  };
  const clamp = (value, maximum) => {
    const number = Number(value);
    const result = Math.max(-maximum, Math.min(maximum, Number.isFinite(number) ? number : 0));
    return Object.is(result, -0) ? 0 : result;
  };
  return {
    x: clamp(offset?.x, maxOffset(width, viewWidth)),
    y: clamp(offset?.y, maxOffset(height, viewHeight)),
  };
}

export function zoomOffsetAtPoint(offset, currentZoom, nextZoom, pointerX, pointerY, viewportWidth, viewportHeight, canvasWidth, canvasHeight, preserveAnchor = false) {
  const values = [currentZoom, nextZoom, pointerX, pointerY, viewportWidth, viewportHeight].map(Number);
  const clampPan = preserveAnchor ? clampCanvasPanWithMargins : clampCanvasPan;
  if (values.some((value) => !Number.isFinite(value)) || currentZoom <= 0 || nextZoom <= 0) {
    return clampPan(offset, canvasWidth, canvasHeight, viewportWidth, viewportHeight, nextZoom);
  }
  const [fromZoom, toZoom, x, y, width, height] = values;
  const nextOffset = {
    x: x - width / 2 - ((x - width / 2 - Number(offset?.x || 0)) / fromZoom) * toZoom,
    y: y - height / 2 - ((y - height / 2 - Number(offset?.y || 0)) / fromZoom) * toZoom,
  };
  return clampPan(nextOffset, canvasWidth, canvasHeight, width, height, toZoom);
}
