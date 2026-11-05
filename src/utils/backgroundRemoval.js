const YIELD_INTERVAL = 65536;

function yieldToBrowser() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

export function colorDistance(data, pixelIndex, color) {
  const offset = pixelIndex * 4;
  const red = data[offset] - color[0];
  const green = data[offset + 1] - color[1];
  const blue = data[offset + 2] - color[2];
  return Math.sqrt(0.299 * red ** 2 + 0.587 * green ** 2 + 0.114 * blue ** 2);
}

export async function createColorSelection({ data, width, height, x, y, tolerance, mode = "contiguous" }) {
  const mask = new Uint8Array(width * height);
  const seedX = Math.floor(x);
  const seedY = Math.floor(y);
  if (seedX < 0 || seedY < 0 || seedX >= width || seedY >= height) return mask;

  const seedIndex = seedY * width + seedX;
  const seedOffset = seedIndex * 4;
  const seedColor = data.subarray(seedOffset, seedOffset + 3);
  if (data[seedOffset + 3] === 0) return mask;
  const toleranceSquared = tolerance * tolerance;

  const matches = (index) => {
    const offset = index * 4;
    const red = data[offset] - seedColor[0];
    const green = data[offset + 1] - seedColor[1];
    const blue = data[offset + 2] - seedColor[2];
    return data[offset + 3] > 0
      && 0.299 * red ** 2 + 0.587 * green ** 2 + 0.114 * blue ** 2 <= toleranceSquared;
  };

  if (mode === "similar") {
    for (let start = 0; start < mask.length; start += YIELD_INTERVAL) {
      const end = Math.min(start + YIELD_INTERVAL, mask.length);
      for (let index = start; index < end; index += 1) {
        if (matches(index)) mask[index] = 1;
      }
      if (end < mask.length) await yieldToBrowser();
    }
    return mask;
  }

  if (!matches(seedIndex)) return mask;
  const queue = new Uint32Array(width * height);
  let head = 0;
  let tail = 0;
  queue[tail++] = seedIndex;
  mask[seedIndex] = 1;

  while (head < tail) {
    const end = Math.min(head + YIELD_INTERVAL, tail);
    for (; head < end; head += 1) {
      const index = queue[head];
      const column = index % width;
      const left = index - 1;
      if (column > 0 && !mask[left] && matches(left)) {
        mask[left] = 1;
        queue[tail++] = left;
      }
      const right = index + 1;
      if (column + 1 < width && !mask[right] && matches(right)) {
        mask[right] = 1;
        queue[tail++] = right;
      }
      const above = index - width;
      if (above >= 0 && !mask[above] && matches(above)) {
        mask[above] = 1;
        queue[tail++] = above;
      }
      const below = index + width;
      if (below < mask.length && !mask[below] && matches(below)) {
        mask[below] = 1;
        queue[tail++] = below;
      }
    }
    if (head < tail && head % YIELD_INTERVAL === 0) await yieldToBrowser();
  }

  return mask;
}

export async function combineColorSelections(data, width, height, selections, tolerance) {
  const combined = new Uint8Array(width * height);
  for (const selection of selections) {
    const mask = await createColorSelection({
      data,
      width,
      height,
      x: selection.x,
      y: selection.y,
      tolerance,
      mode: selection.mode,
    });
    for (let index = 0; index < combined.length; index += 1) {
      if (mask[index]) combined[index] = 1;
    }
    await yieldToBrowser();
  }
  return combined;
}

export function removeSelectedPixels(data, mask) {
  let changed = false;
  for (let index = 0; index < mask.length; index += 1) {
    const alphaIndex = index * 4 + 3;
    if (mask[index] && data[alphaIndex] !== 0) {
      data[alphaIndex] = 0;
      changed = true;
    }
  }
  return changed;
}

export function paintAlpha(data, originalData, width, height, x, y, radius, hardness, restore) {
  const left = Math.max(0, Math.floor(x - radius));
  const right = Math.min(width - 1, Math.ceil(x + radius));
  const top = Math.max(0, Math.floor(y - radius));
  const bottom = Math.min(height - 1, Math.ceil(y + radius));
  const hardRadius = radius * hardness;
  let changed = false;

  for (let row = top; row <= bottom; row += 1) {
    for (let column = left; column <= right; column += 1) {
      const distance = Math.hypot(column + 0.5 - x, row + 0.5 - y);
      if (distance > radius) continue;
      const strength = distance <= hardRadius || radius === hardRadius
        ? 1
        : Math.max(0, (radius - distance) / (radius - hardRadius));
      const alphaIndex = (row * width + column) * 4 + 3;
      const previous = data[alphaIndex];
      const original = originalData[alphaIndex];
      const next = restore
        ? Math.round(previous + (original - previous) * strength)
        : Math.round(previous * (1 - strength));
      if (next !== previous) {
        data[alphaIndex] = next;
        changed = true;
      }
    }
  }

  return changed;
}
