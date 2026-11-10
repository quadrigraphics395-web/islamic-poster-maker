export const DEFAULT_IMAGE_FILTERS = Object.freeze({
  brightness: 100,
  contrast: 100,
  saturation: 100,
  exposure: 0,
  warmth: 0,
  hue: 0,
  blur: 0,
  grayscale: 0,
  sepia: 0,
});

export const IMAGE_FILTER_PRESETS = Object.freeze({
  Original: DEFAULT_IMAGE_FILTERS,
  Natural: { ...DEFAULT_IMAGE_FILTERS, saturation: 108, contrast: 104 },
  Bright: { ...DEFAULT_IMAGE_FILTERS, brightness: 118, exposure: 0.15 },
  Warm: { ...DEFAULT_IMAGE_FILTERS, warmth: 24, saturation: 108 },
  Cool: { ...DEFAULT_IMAGE_FILTERS, warmth: -24, hue: 6 },
  "Black & White": { ...DEFAULT_IMAGE_FILTERS, grayscale: 100, contrast: 110 },
  Vintage: { ...DEFAULT_IMAGE_FILTERS, sepia: 40, saturation: 82, contrast: 94, warmth: 12 },
  "High Contrast": { ...DEFAULT_IMAGE_FILTERS, contrast: 145, saturation: 110 },
});

export function normalizeImageFilters(filters = {}) {
  return Object.fromEntries(Object.entries(DEFAULT_IMAGE_FILTERS).map(([key, fallback]) => {
    const value = Number(filters[key]);
    return [key, Number.isFinite(value) ? value : fallback];
  }));
}

export function imageFiltersToCss(filters = {}) {
  const value = normalizeImageFilters(filters);
  const brightness = value.brightness * 2 ** value.exposure;
  const warmth = value.warmth * 0.12;
  return `brightness(${brightness}%) contrast(${value.contrast}%) saturate(${value.saturation}%) hue-rotate(${value.hue + warmth}deg) blur(${value.blur}px) grayscale(${value.grayscale}%) sepia(${value.sepia}%)`;
}
