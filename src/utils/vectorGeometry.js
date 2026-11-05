import polygonClipping from "polygon-clipping";

const distance = (left, right) => Math.hypot(left.x - right.x, left.y - right.y);

function pointLineDistance(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (dx === 0 && dy === 0) return distance(point, start);
  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(point.x - start.x - t * dx, point.y - start.y - t * dy);
}

function simplifyRange(points, first, last, tolerance, keep) {
  let maximum = tolerance;
  let index = -1;
  for (let cursor = first + 1; cursor < last; cursor += 1) {
    const deviation = pointLineDistance(points[cursor], points[first], points[last]);
    if (deviation > maximum) {
      maximum = deviation;
      index = cursor;
    }
  }
  if (index < 0) return;
  keep.add(index);
  simplifyRange(points, first, index, tolerance, keep);
  simplifyRange(points, index, last, tolerance, keep);
}

export function simplifyPolyline(points, tolerance = 0.35) {
  if (points.length <= 2) return points.map((point) => ({ ...point }));
  const protectedIndices = points.map((point, index) => (
    point.type === "smooth" || point.in?.x || point.in?.y || point.out?.x || point.out?.y ? index : -1
  )).filter((index) => index >= 0);
  const anchors = [...new Set([0, ...protectedIndices, points.length - 1])].sort((a, b) => a - b);
  const keep = new Set(anchors);
  for (let index = 0; index < anchors.length - 1; index += 1) {
    simplifyRange(points, anchors[index], anchors[index + 1], tolerance, keep);
  }
  return [...keep].sort((a, b) => a - b).map((index) => ({ ...points[index] }));
}

function cubicPoint(start, control1, control2, end, t) {
  const inverse = 1 - t;
  return {
    x: inverse ** 3 * start.x + 3 * inverse ** 2 * t * control1.x + 3 * inverse * t ** 2 * control2.x + t ** 3 * end.x,
    y: inverse ** 3 * start.y + 3 * inverse ** 2 * t * control1.y + 3 * inverse * t ** 2 * control2.y + t ** 3 * end.y,
  };
}

export function flattenVectorPath(paths, stepsPerCurve = 16) {
  return paths.filter((path) => path.closed && path.nodes.length >= 3).map((path) => {
    const points = [];
    const nodes = path.nodes;
    nodes.forEach((node, index) => {
      const next = nodes[(index + 1) % nodes.length];
      points.push({ x: node.x, y: node.y });
      if (node.out?.x || node.out?.y || next.in?.x || next.in?.y) {
        const control1 = { x: node.x + (node.out?.x ?? 0), y: node.y + (node.out?.y ?? 0) };
        const control2 = { x: next.x + (next.in?.x ?? 0), y: next.y + (next.in?.y ?? 0) };
        for (let step = 1; step < stepsPerCurve; step += 1) {
          points.push(cubicPoint(node, control1, control2, next, step / stepsPerCurve));
        }
      }
    });
    return points;
  });
}

export function applyBooleanGeometry(operation, geometries) {
  if (!["union", "difference", "intersection"].includes(operation)) {
    throw new Error("Choose Weld, Trim, or Intersect before running a vector operation.");
  }
  if (geometries.length < 2 || geometries.some((geometry) => !Array.isArray(geometry) || !geometry.length)) {
    throw new Error("Select at least two closed vector shapes for this operation.");
  }

  let result;
  try {
    if (operation === "union") result = polygonClipping.union(...geometries);
    if (operation === "difference") result = polygonClipping.difference(geometries[0], ...geometries.slice(1));
    if (operation === "intersection") result = geometries.slice(1).reduce(
      (current, geometry) => polygonClipping.intersection(current, geometry),
      geometries[0],
    );
  } catch (error) {
    throw new Error(`Vector geometry could not be combined: ${error.message || "invalid path data"}`);
  }
  if (!result?.length) throw new Error("The selected shapes do not produce a non-empty result.");
  return result;
}

export function createBooleanVector(operation, geometries, style = {}) {
  const result = applyBooleanGeometry(operation, geometries);

  const rings = result.flatMap((polygon, polygonIndex) => polygon.map((ring, ringIndex) => ({
    polygonIndex,
    hole: ringIndex > 0,
    points: ring.slice(0, -1).map(([x, y]) => ({ x, y })),
  })));
  const coordinates = rings.flatMap((ring) => ring.points);
  const minX = Math.min(...coordinates.map((point) => point.x));
  const maxX = Math.max(...coordinates.map((point) => point.x));
  const minY = Math.min(...coordinates.map((point) => point.y));
  const maxY = Math.max(...coordinates.map((point) => point.y));
  const geometryWidth = maxX - minX;
  const geometryHeight = maxY - minY;
  const canvasWidth = style.canvasWidth ?? 100;
  const canvasHeight = style.canvasHeight ?? 100;
  const width = geometryWidth / canvasWidth * 100;
  const height = geometryHeight / canvasHeight * 100;
  if (!(geometryWidth > 0) || !(geometryHeight > 0)) throw new Error("The result has no measurable area.");

  return {
    type: "shape",
    shape: "custom",
    x: (minX + maxX) / 2 / canvasWidth * 100,
    y: (minY + maxY) / 2 / canvasHeight * 100,
    width,
    height,
    color: style.color ?? "#d5ad62",
    fillEnabled: true,
    strokeEnabled: Boolean(style.strokeEnabled),
    strokeColor: style.strokeColor ?? style.color ?? "#d5ad62",
    strokeWidth: style.strokeWidth ?? 1,
    opacity: style.opacity ?? 100,
    transparencyMask: style.transparencyMask,
    transparencyMasks: style.transparencyMasks,
    fillRule: "evenodd",
    paths: rings.map((ring) => ({
      closed: true,
      polygonIndex: ring.polygonIndex,
      hole: ring.hole,
      nodes: ring.points.map((point) => ({
        x: ((point.x - minX) / geometryWidth) * 100,
        y: ((point.y - minY) / geometryHeight) * 100,
        type: "corner",
        in: { x: 0, y: 0 },
        out: { x: 0, y: 0 },
      })),
    })),
  };
}

export function pathToSvg(paths) {
  return paths.map((path) => {
    if (!path.nodes.length) return "";
    const [first, ...rest] = path.nodes;
    let data = `M ${first.x} ${first.y}`;
    let previous = first;
    for (const node of rest) {
      if (previous.out?.x || previous.out?.y || node.in?.x || node.in?.y) {
        data += ` C ${previous.x + (previous.out?.x ?? 0)} ${previous.y + (previous.out?.y ?? 0)} ${node.x + (node.in?.x ?? 0)} ${node.y + (node.in?.y ?? 0)} ${node.x} ${node.y}`;
      } else {
        data += ` L ${node.x} ${node.y}`;
      }
      previous = node;
    }
    if (path.closed && path.nodes.length > 1) {
      const node = first;
      if (previous.out?.x || previous.out?.y || node.in?.x || node.in?.y) {
        data += ` C ${previous.x + (previous.out?.x ?? 0)} ${previous.y + (previous.out?.y ?? 0)} ${node.x + (node.in?.x ?? 0)} ${node.y + (node.in?.y ?? 0)} ${node.x} ${node.y}`;
      }
      data += " Z";
    }
    return data;
  }).filter(Boolean).join(" ");
}
