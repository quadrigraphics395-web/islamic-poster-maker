export const CSS_PIXELS_PER_INCH = 96;
export const INCHES_PER_FOOT = 12;
export const CSS_PIXELS_PER_FOOT = CSS_PIXELS_PER_INCH * INCHES_PER_FOOT;
export const DEFAULT_PRINT_DPI = 300;
export const MAX_EXPORT_PIXELS = 18_000_000;
export const MAX_EXPORT_DIMENSION = 16_384;

const unitFactors = {
  px: 1,
  in: CSS_PIXELS_PER_INCH,
  ft: CSS_PIXELS_PER_FOOT,
};

export function toCssPixels(value, unit = "px") {
  const amount = Number(value);
  const factor = unitFactors[unit];
  if (!Number.isFinite(amount) || amount <= 0 || !factor) return null;
  return amount * factor;
}

export function fromCssPixels(value, unit = "px") {
  const factor = unitFactors[unit];
  if (!Number.isFinite(value) || value <= 0 || !factor) return null;
  return value / factor;
}

export function formatUnitValue(cssPixels, unit) {
  const value = fromCssPixels(cssPixels, unit);
  if (value == null) return "";
  if (unit === "px") return String(Math.round(value));
  return String(Number(value.toFixed(2)));
}

export function getPrintExportDimensions(widthCssPx, heightCssPx, dpi = DEFAULT_PRINT_DPI, maxPixels = MAX_EXPORT_PIXELS, maxDimension = MAX_EXPORT_DIMENSION) {
  if (![widthCssPx, heightCssPx, dpi, maxPixels, maxDimension].every(Number.isFinite) || widthCssPx <= 0 || heightCssPx <= 0 || dpi <= 0 || maxPixels <= 0 || maxDimension <= 0) {
    throw new Error("Document dimensions and print resolution must be positive numbers.");
  }
  const requestedScale = dpi / CSS_PIXELS_PER_INCH;
  let width = Math.max(1, Math.round(widthCssPx * requestedScale));
  let height = Math.max(1, Math.round(heightCssPx * requestedScale));
  let effectiveDpi = dpi;
  const area = width * height;
  const dimensionScale = Math.min(1, maxDimension / width, maxDimension / height);
  const pixelScale = area > maxPixels ? Math.sqrt(maxPixels / area) : 1;
  const safetyScale = Math.min(dimensionScale, pixelScale);
  if (safetyScale < 1) {
    width = Math.max(1, Math.floor(width * safetyScale));
    height = Math.max(1, Math.floor(height * safetyScale));
    effectiveDpi = dpi * safetyScale;
  }
  return { width, height, requestedDpi: dpi, effectiveDpi, wasLimited: effectiveDpi < dpi };
}

export function getJpegQuality(value) {
  return ({ low: 0.6, normal: 0.8, high: 0.95 })[value] ?? 0.8;
}

export function getExportBackgroundMode(format, mode) {
  if (format === "pdf" && mode === "transparent") return "white";
  if (format === "jpg" && mode === "transparent") return "white";
  return mode;
}

export function getPresetPhysicalSize(preset) {
  if (!preset) return null;
  if (Number.isFinite(preset.widthIn) && Number.isFinite(preset.heightIn)) {
    return { widthIn: preset.widthIn, heightIn: preset.heightIn };
  }
  return { widthIn: preset.width / CSS_PIXELS_PER_INCH, heightIn: preset.height / CSS_PIXELS_PER_INCH };
}

export function readProjectDocumentMeta(project = {}) {
  return {
    sizeUnit: ["px", "in", "ft"].includes(project.documentMeta?.sizeUnit) ? project.documentMeta.sizeUnit : "px",
    printDpi: [150, 300, 600].includes(project.documentMeta?.printDpi) ? project.documentMeta.printDpi : DEFAULT_PRINT_DPI,
  };
}
