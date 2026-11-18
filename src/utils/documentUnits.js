export const CSS_PIXELS_PER_INCH = 96;
export const INCHES_PER_FOOT = 12;
export const CSS_PIXELS_PER_FOOT = CSS_PIXELS_PER_INCH * INCHES_PER_FOOT;
export const DEFAULT_PRINT_DPI = 300;
export const MAX_EXPORT_PIXELS = 18_000_000;
export const MAX_EXPORT_DIMENSION = 16_384;

const unitFactors = {
  px: 1,
  mm: CSS_PIXELS_PER_INCH / 25.4,
  cm: CSS_PIXELS_PER_INCH / 2.54,
  in: CSS_PIXELS_PER_INCH,
  ft: CSS_PIXELS_PER_FOOT,
};

const unitPrecision = { px: 0, mm: 2, cm: 3, in: 4, ft: 5 };

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
  return String(Number(value.toFixed(unitPrecision[unit] ?? 2)));
}

export function createRulerTicks(cssPixels, unit, targetTickCount = 10) {
  const total = fromCssPixels(cssPixels, unit);
  if (total == null || !Number.isFinite(targetTickCount) || targetTickCount < 1) return [];
  const rawStep = total / targetTickCount;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;
  const step = (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * magnitude;
  const values = [];
  for (let value = 0; value < total; value += step) values.push(value);
  if (!values.length || total - values.at(-1) > Number.EPSILON * total) values.push(total);
  return values.map((value) => ({
    value,
    position: (value / total) * 100,
    label: String(Number(value.toFixed(unitPrecision[unit] ?? 2))),
  }));
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
    sizeUnit: ["px", "mm", "cm", "in", "ft"].includes(project.documentMeta?.sizeUnit) ? project.documentMeta.sizeUnit : "px",
    printDpi: [150, 300, 600].includes(project.documentMeta?.printDpi) ? project.documentMeta.printDpi : DEFAULT_PRINT_DPI,
  };
}
