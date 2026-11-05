export const defaultTransparencyStops = [
  { id: "stop-1", offset: 0, opacity: 0 },
  { id: "stop-2", offset: 100, opacity: 100 },
];

export function normalizeTransparencyMask(mask) {
  const stops = (mask?.stops ?? defaultTransparencyStops)
    .map((stop) => ({
      id: stop.id,
      offset: Math.max(0, Math.min(100, Number(stop.offset) || 0)),
      opacity: Math.max(0, Math.min(100, Number(stop.opacity) || 0)),
    }))
    .sort((left, right) => left.offset - right.offset);
  return {
    type: mask?.type === "radial" ? "radial" : "linear",
    direction: mask?.direction ?? "left-right",
    centerX: Math.max(0, Math.min(100, Number(mask?.centerX ?? 50))),
    centerY: Math.max(0, Math.min(100, Number(mask?.centerY ?? 50))),
    radius: Math.max(1, Math.min(100, Number(mask?.radius ?? 70))),
    hard: Boolean(mask?.hard),
    stops: stops.length >= 2 ? stops : defaultTransparencyStops,
  };
}

function stopsToCss(stops, hard) {
  const entries = [];
  stops.forEach((stop, index) => {
    const alpha = stop.opacity / 100;
    if (hard && index > 0) {
      entries.push(`rgba(0,0,0,${stops[index - 1].opacity / 100}) ${Math.max(0, stop.offset - 0.1)}%`);
    }
    entries.push(`rgba(0,0,0,${alpha}) ${stop.offset}%`);
  });
  return entries.join(", ");
}

export function transparencyCss(mask) {
  if (!mask) return undefined;
  const value = normalizeTransparencyMask(mask);
  const stops = stopsToCss(value.stops, value.hard);
  if (value.type === "radial") {
    return `radial-gradient(ellipse ${value.radius}% ${value.radius}% at ${value.centerX}% ${value.centerY}%, ${stops})`;
  }
  const directions = {
    "top-bottom": "to bottom",
    "bottom-top": "to top",
    "left-right": "to right",
    "right-left": "to left",
    "top-left-bottom-right": "to bottom right",
    "bottom-right-top-left": "to top left",
    "top-right-bottom-left": "to bottom left",
    "bottom-left-top-right": "to top right",
  };
  return `linear-gradient(${directions[value.direction] ?? "to right"}, ${stops})`;
}

export function transparencyOpacityAt(mask, x, y) {
  const value = normalizeTransparencyMask(mask);
  let position;
  if (value.type === "radial") {
    position = Math.min(100, Math.hypot(x - value.centerX, y - value.centerY) * 100 / value.radius);
  } else {
    const directions = {
      "top-bottom": [0, 1],
      "bottom-top": [0, -1],
      "left-right": [1, 0],
      "right-left": [-1, 0],
      "top-left-bottom-right": [1, 1],
      "bottom-right-top-left": [-1, -1],
      "top-right-bottom-left": [1, -1],
      "bottom-left-top-right": [-1, 1],
    };
    const [dx, dy] = directions[value.direction] ?? [1, 0];
    const length = Math.abs(dx) + Math.abs(dy) || 1;
    position = Math.max(0, Math.min(100, ((x - 50) * dx + (y - 50) * dy) / length + 50));
  }
  const upperIndex = value.stops.findIndex((stop) => stop.offset >= position);
  if (upperIndex <= 0) return value.stops[upperIndex < 0 ? value.stops.length - 1 : 0].opacity;
  const lower = value.stops[upperIndex - 1];
  const upper = value.stops[upperIndex];
  if (upper.offset === lower.offset) return upper.opacity;
  if (value.hard) return position < upper.offset ? lower.opacity : upper.opacity;
  const progress = (position - lower.offset) / (upper.offset - lower.offset);
  return lower.opacity + (upper.opacity - lower.opacity) * progress;
}

export function imageMaskSvg(mask) {
  if (!mask?.paths?.length) return null;
  const pathData = mask.paths.map((path) => {
    const [first, ...rest] = path.nodes;
    if (!first) return "";
    let d = `M ${first.x} ${first.y} ${rest.map((node) => `L ${node.x} ${node.y}`).join(" ")}`;
    if (path.closed) d += " Z";
    return d;
  }).join("");
  const maskBase = mask.inverted
    ? `<rect width="100" height="100" fill="white"/><path d="${pathData}" fill="black" fill-rule="evenodd"/>`
    : `<rect width="100" height="100" fill="black"/><path d="${pathData}" fill="white" fill-rule="evenodd"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><mask id="m" mask-type="luminance">${maskBase}</mask><rect width="100" height="100" fill="white" mask="url(#m)"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
