import polygonClipping from "polygon-clipping";
import { interpolateHexColor } from "./colorPalette.js";

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
  return geometryToCustomVector(result, style);
}

export function createVectorFromGeometry(geometry, style = {}) {
  if (!Array.isArray(geometry) || !geometry.length) throw new Error("A non-empty closed vector geometry is required.");
  return geometryToCustomVector(geometry, style);
}

export function convertPrimitiveToCurves(object) {
  if (!object || !["rectangle", "ellipse", "polygon"].includes(object.shape)) {
    throw new Error("Convert to Curves supports rectangle, ellipse, and polygon objects.");
  }
  let nodes;
  if (object.shape === "rectangle") {
    nodes = [[0, 0], [100, 0], [100, 100], [0, 100]].map(([x, y]) => cornerNode(x, y));
  } else if (object.shape === "ellipse") {
    const handle = 100 * 0.5522847498 / 2;
    nodes = [
      { ...cornerNode(50, 0), type: "smooth", in: { x: -handle, y: 0 }, out: { x: handle, y: 0 } },
      { ...cornerNode(100, 50), type: "smooth", in: { x: 0, y: -handle }, out: { x: 0, y: handle } },
      { ...cornerNode(50, 100), type: "smooth", in: { x: handle, y: 0 }, out: { x: -handle, y: 0 } },
      { ...cornerNode(0, 50), type: "smooth", in: { x: 0, y: handle }, out: { x: 0, y: -handle } },
    ];
  } else {
    const sides = Math.max(3, Math.min(32, Math.round(Number(object.sides) || 6)));
    nodes = regularPolygonPoints(sides).map((point) => cornerNode(point.x, point.y));
  }
  return {
    ...object,
    shape: "custom",
    paths: [{ closed: true, nodes }],
    fillRule: "nonzero",
    convertedFrom: object.shape,
  };
}

function cornerNode(x, y) {
  return { x, y, type: "corner", in: { x: 0, y: 0 }, out: { x: 0, y: 0 } };
}

export function regularPolygonPoints(sides, radius = 50, center = 50) {
  const count = Math.max(3, Math.min(32, Math.round(Number(sides) || 6)));
  return Array.from({ length: count }, (_, index) => {
    const angle = -Math.PI / 2 + index * Math.PI * 2 / count;
    return { x: center + Math.cos(angle) * radius, y: center + Math.sin(angle) * radius };
  });
}

export function deformVectorPaths(paths, envelope) {
  if (!Array.isArray(envelope) || envelope.length !== 4 || envelope.some((point) => !Number.isFinite(point?.x) || !Number.isFinite(point?.y))) {
    throw new Error("An envelope needs four finite corner points.");
  }
  const mapPoint = ({ x, y }) => {
    const u = x / 100;
    const v = y / 100;
    const [tl, tr, br, bl] = envelope;
    return {
      x: (1 - u) * (1 - v) * tl.x + u * (1 - v) * tr.x + u * v * br.x + (1 - u) * v * bl.x,
      y: (1 - u) * (1 - v) * tl.y + u * (1 - v) * tr.y + u * v * br.y + (1 - u) * v * bl.y,
    };
  };
  return paths.map((path) => ({
    ...path,
    nodes: path.nodes.map((node) => {
      const anchor = mapPoint(node);
      const incoming = mapPoint({ x: node.x + (node.in?.x ?? 0), y: node.y + (node.in?.y ?? 0) });
      const outgoing = mapPoint({ x: node.x + (node.out?.x ?? 0), y: node.y + (node.out?.y ?? 0) });
      return {
        ...node,
        ...anchor,
        in: { x: incoming.x - anchor.x, y: incoming.y - anchor.y },
        out: { x: outgoing.x - anchor.x, y: outgoing.y - anchor.y },
      };
    }),
  }));
}

export function createBlendVectors(from, to, steps) {
  const count = Math.round(Number(steps));
  if (!Number.isInteger(count) || count < 1 || count > 64) throw new Error("Blend steps must be between 1 and 64.");
  if (!from?.paths?.length || !to?.paths?.length || from.paths.length !== to.paths.length) {
    throw new Error("Blend requires two editable vectors with matching contour counts.");
  }
  if (Boolean(from.flipHorizontal) !== Boolean(to.flipHorizontal) || Boolean(from.flipVertical) !== Boolean(to.flipVertical)) {
    throw new Error("Blend sources must use matching flip settings.");
  }
  const topologyMatches = from.paths.every((path, index) => path.closed === to.paths[index].closed && path.nodes.length === to.paths[index].nodes.length);
  if (!topologyMatches) throw new Error("Blend sources need matching node counts and open/closed contours.");
  return Array.from({ length: count }, (_, index) => {
    const t = (index + 1) / (count + 1);
    const mix = (a, b) => a + (b - a) * t;
    return {
      ...from,
      x: mix(from.x, to.x),
      y: mix(from.y, to.y),
      width: mix(from.width, to.width),
      height: mix(from.height, to.height),
      rotation: (from.rotation ?? 0) + ((((to.rotation ?? 0) - (from.rotation ?? 0) + 540) % 360) - 180) * t,
      color: interpolateHexColor(from.color ?? "#d5ad62", to.color ?? from.color ?? "#d5ad62", t),
      strokeColor: interpolateHexColor(from.strokeColor ?? from.color ?? "#17352c", to.strokeColor ?? to.color ?? "#17352c", t),
      strokeWidth: mix(from.strokeWidth ?? 1, to.strokeWidth ?? 1),
      fillOpacity: mix(from.fillOpacity ?? 100, to.fillOpacity ?? 100),
      strokeOpacity: mix(from.strokeOpacity ?? 100, to.strokeOpacity ?? 100),
      opacity: mix(from.opacity ?? 100, to.opacity ?? 100),
      paths: from.paths.map((path, pathIndex) => ({
        ...path,
        nodes: path.nodes.map((node, nodeIndex) => {
          const other = to.paths[pathIndex].nodes[nodeIndex];
          return {
            ...node,
            x: mix(node.x, other.x),
            y: mix(node.y, other.y),
            in: { x: mix(node.in?.x ?? 0, other.in?.x ?? 0), y: mix(node.in?.y ?? 0, other.in?.y ?? 0) },
            out: { x: mix(node.out?.x ?? 0, other.out?.x ?? 0), y: mix(node.out?.y ?? 0, other.out?.y ?? 0) },
          };
        }),
      })),
    };
  });
}

export function offsetPolygonGeometry(geometry, distance) {
  const offset = Number(distance);
  if (!Array.isArray(geometry) || !geometry.length || !Number.isFinite(offset) || offset === 0) {
    throw new Error("Contour needs closed vector geometry and a non-zero distance.");
  }
  const offsetRing = (closedRing) => {
    const ring = closedRing.slice(0, -1);
    if (ring.length < 3) throw new Error("Contour requires rings with at least three points.");
    const lines = ring.map((point, index) => {
      const next = ring[(index + 1) % ring.length];
      const dx = next[0] - point[0];
      const dy = next[1] - point[1];
      const length = Math.hypot(dx, dy);
      if (length < 1e-8) throw new Error("Contour cannot offset a zero-length edge.");
      const nx = dy / length * offset;
      const ny = -dx / length * offset;
      return { a: [point[0] + nx, point[1] + ny], d: [dx, dy] };
    });
    const points = ring.map((_, index) => {
      const previous = lines[(index - 1 + lines.length) % lines.length];
      const current = lines[index];
      const cross = previous.d[0] * current.d[1] - previous.d[1] * current.d[0];
      if (Math.abs(cross) < 1e-8) return current.a;
      const deltaX = current.a[0] - previous.a[0];
      const deltaY = current.a[1] - previous.a[1];
      const t = (deltaX * current.d[1] - deltaY * current.d[0]) / cross;
      return [previous.a[0] + previous.d[0] * t, previous.a[1] + previous.d[1] * t];
    });
    const area = (values) => values.reduce((sum, point, index) => {
      const next = values[(index + 1) % values.length];
      return sum + point[0] * next[1] - next[0] * point[1];
    }, 0);
    const originalArea = area(ring);
    const nextArea = area(points);
    const spanX = Math.max(...ring.map((point) => point[0])) - Math.min(...ring.map((point) => point[0]));
    const spanY = Math.max(...ring.map((point) => point[1])) - Math.min(...ring.map((point) => point[1]));
    const shrinking = Math.sign(originalArea) * offset < 0;
    if (!Number.isFinite(nextArea) || Math.sign(nextArea) !== Math.sign(originalArea)
      || (shrinking && Math.abs(offset) * 2 >= Math.min(spanX, spanY))) {
      throw new Error("That contour distance collapses or reverses part of the selected shape.");
    }
    return [...points, [...points[0]]];
  };
  return geometry.map((polygon) => polygon.map(offsetRing));
}

export function splitGeometryByLine(geometry, start, end, width, height) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  if (Math.hypot(dx, dy) < 1e-6) throw new Error("Draw a longer knife line to split a shape.");
  const clipSide = (sign) => {
    const corners = [[0, 0], [width, 0], [width, height], [0, height]];
    const signedDistance = ([x, y]) => ((x - start[0]) * dy - (y - start[1]) * dx) * sign;
    const output = [];
    for (let index = 0; index < corners.length; index += 1) {
      const current = corners[index];
      const next = corners[(index + 1) % corners.length];
      const currentDistance = signedDistance(current);
      const nextDistance = signedDistance(next);
      const currentInside = currentDistance >= -1e-7;
      const nextInside = nextDistance >= -1e-7;
      if (currentInside) output.push(current);
      if (currentInside !== nextInside) {
        const t = currentDistance / (currentDistance - nextDistance);
        output.push([current[0] + (next[0] - current[0]) * t, current[1] + (next[1] - current[1]) * t]);
      }
    }
    if (output.length < 3) return [];
    return [[ [...output, [...output[0]]] ]];
  };
  const sides = [clipSide(1), clipSide(-1)].filter(Boolean);
  const results = sides.map((clip) => {
    try { return applyBooleanGeometry("intersection", [geometry, clip]); } catch { return []; }
  }).filter((result) => result.length);
  if (results.length !== 2) throw new Error("The knife line must cross the selected closed vector to create two pieces.");
  return results;
}

export function createCompoundVector(geometries, style = {}) {
  if (!Array.isArray(geometries) || geometries.length < 2
    || geometries.some((geometry) => !Array.isArray(geometry) || !geometry.length)) {
    throw new Error("Combine needs at least two closed vector shapes.");
  }
  return geometryToCustomVector(geometries.flat(), { ...style, fillRule: "nonzero" });
}

export function breakApartVector(geometry, style = {}) {
  if (!Array.isArray(geometry) || !geometry.length || geometry.some((polygon) => !Array.isArray(polygon) || !polygon.length)) {
    throw new Error("Break Apart needs a compound vector with closed components.");
  }
  if (geometry.length < 2) throw new Error("This vector has no separate components to break apart.");
  return geometry.map((polygon) => geometryToCustomVector([polygon], style));
}

function geometryToCustomVector(result, style = {}) {
  if (!Array.isArray(result) || !result.length) throw new Error("The vector operation produced no geometry.");
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
    fillOpacity: style.fillOpacity ?? 100,
    strokeOpacity: style.strokeOpacity ?? 100,
    strokeLineJoin: style.strokeLineJoin ?? "round",
    opacity: style.opacity ?? 100,
    transparencyMask: style.transparencyMask,
    transparencyMasks: style.transparencyMasks,
    fillRule: style.fillRule ?? "evenodd",
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
