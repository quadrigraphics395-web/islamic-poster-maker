export function clientPointToCanvas(clientX, clientY, canvasRect, zoom = 1) {
  const values = [clientX, clientY, canvasRect?.left, canvasRect?.top, zoom].map(Number);
  if (values.some((value) => !Number.isFinite(value)) || zoom <= 0) return null;
  const [x, y, left, top, scale] = values;
  return { x: (x - left) / scale, y: (y - top) / scale };
}

export function canvasPointToClient(x, y, canvasRect, zoom = 1) {
  const values = [x, y, canvasRect?.left, canvasRect?.top, zoom].map(Number);
  if (values.some((value) => !Number.isFinite(value)) || zoom <= 0) return null;
  const [canvasX, canvasY, left, top, scale] = values;
  return { x: left + canvasX * scale, y: top + canvasY * scale };
}
