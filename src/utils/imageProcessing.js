export function getWorkingImageDimensions(width, height, pixelLimit) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) {
    throw new RangeError("Image dimensions must be positive finite numbers.");
  }
  if (!Number.isFinite(pixelLimit) || pixelLimit < 1) {
    throw new RangeError("The working pixel limit must be a positive finite number.");
  }
  const scale = Math.min(1, Math.sqrt(pixelLimit / (width * height)));
  return {
    width: Math.max(1, Math.floor(width * scale)),
    height: Math.max(1, Math.floor(height * scale)),
  };
}
