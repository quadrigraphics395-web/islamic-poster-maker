export const DEFAULT_CROP_RECT = Object.freeze({ x: 0, y: 0, width: 1, height: 1 });

export function normalizeCropRect(crop = DEFAULT_CROP_RECT) {
  const x = Math.min(1, Math.max(0, Number(crop.x) || 0));
  const y = Math.min(1, Math.max(0, Number(crop.y) || 0));
  const width = Math.min(1 - x, Math.max(0.01, Number(crop.width) || 1));
  const height = Math.min(1 - y, Math.max(0.01, Number(crop.height) || 1));
  return { x, y, width, height };
}

export function cropRectToSource(crop, naturalWidth, naturalHeight) {
  const normalized = normalizeCropRect(crop);
  if (!(naturalWidth > 0) || !(naturalHeight > 0)) return null;
  const left = Math.round(normalized.x * naturalWidth);
  const top = Math.round(normalized.y * naturalHeight);
  const right = Math.round((normalized.x + normalized.width) * naturalWidth);
  const bottom = Math.round((normalized.y + normalized.height) * naturalHeight);
  return {
    x: left,
    y: top,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
  };
}

export function getCroppedImageAspectRatio(crop, naturalWidth, naturalHeight) {
  const rect = normalizeCropRect(crop);
  if (!(naturalWidth > 0) || !(naturalHeight > 0)) return 1;
  return (naturalWidth * rect.width) / (naturalHeight * rect.height);
}

export function moveCropRect(crop, deltaX, deltaY) {
  const rect = normalizeCropRect(crop);
  return {
    ...rect,
    x: Math.min(1 - rect.width, Math.max(0, rect.x + deltaX)),
    y: Math.min(1 - rect.height, Math.max(0, rect.y + deltaY)),
  };
}

export function resizeCropRect(crop, handle, deltaX, deltaY, minSize = 0.02) {
  const rect = normalizeCropRect(crop);
  const left = handle.includes("left");
  const right = handle.includes("right");
  const top = handle.includes("top");
  const bottom = handle.includes("bottom");
  let x1 = rect.x;
  let y1 = rect.y;
  let x2 = rect.x + rect.width;
  let y2 = rect.y + rect.height;

  if (left) x1 = Math.min(x2 - minSize, Math.max(0, x1 + deltaX));
  if (right) x2 = Math.max(x1 + minSize, Math.min(1, x2 + deltaX));
  if (top) y1 = Math.min(y2 - minSize, Math.max(0, y1 + deltaY));
  if (bottom) y2 = Math.max(y1 + minSize, Math.min(1, y2 + deltaY));
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
}
