const cornerSigns = {
  "top-left": { x: -1, y: -1 },
  "top-right": { x: 1, y: -1 },
  "bottom-left": { x: -1, y: 1 },
  "bottom-right": { x: 1, y: 1 },
};

function rotatePoint(x, y, radians) {
  return {
    x: x * Math.cos(radians) - y * Math.sin(radians),
    y: x * Math.sin(radians) + y * Math.cos(radians),
  };
}

export function resizeObjectFromCorner({
  corner,
  rotation = 0,
  anchorX,
  anchorY,
  startPointerX,
  startPointerY,
  pointerX,
  pointerY,
  startWidth,
  startHeight,
  propertyWidth,
  propertyHeight,
  widthUnit = 1,
  heightUnit = 1,
  positionWidthUnit = widthUnit,
  positionHeightUnit = heightUnit,
  lockAspectRatio = false,
  minWidth = 8,
  minHeight = 8,
}) {
  const signs = cornerSigns[corner];
  if (!signs || startWidth <= 0 || startHeight <= 0 || !widthUnit || !heightUnit) return null;

  const radians = (rotation * Math.PI) / 180;
  const pointerDelta = rotatePoint(pointerX - startPointerX, pointerY - startPointerY, -radians);
  const localStartX = signs.x * startWidth / 2;
  const localStartY = signs.y * startHeight / 2;
  const localPointerX = localStartX + pointerDelta.x;
  const localPointerY = localStartY + pointerDelta.y;
  const minimumScale = Math.max(minWidth / startWidth, minHeight / startHeight);
  let scaleX;
  let scaleY;

  if (lockAspectRatio) {
    const startLengthSquared = localStartX ** 2 + localStartY ** 2;
    const projectedScale = (
      localPointerX * localStartX + localPointerY * localStartY
    ) / startLengthSquared;
    scaleX = Math.max(minimumScale, projectedScale);
    scaleY = scaleX;
  } else {
    scaleX = Math.max(minWidth / startWidth, Math.abs(localPointerX / localStartX));
    scaleY = Math.max(minHeight / startHeight, Math.abs(localPointerY / localStartY));
  }

  const width = startWidth * scaleX;
  const height = startHeight * scaleY;
  const centerOffset = rotatePoint(signs.x * width / 2, signs.y * height / 2, radians);
  const centerX = anchorX + centerOffset.x;
  const centerY = anchorY + centerOffset.y;

  return {
    width: propertyWidth * scaleX,
    height: propertyHeight * scaleY,
    centerX,
    centerY,
    scaleX,
    scaleY,
    x: centerX / positionWidthUnit,
    y: centerY / positionHeightUnit,
  };
}
