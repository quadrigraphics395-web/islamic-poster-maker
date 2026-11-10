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
