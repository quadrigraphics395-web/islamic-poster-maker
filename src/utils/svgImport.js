const MAX_SVG_LENGTH = 5_000_000;
const MAX_ELEMENTS = 10_000;
const SAFE_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

function decodeXml(value) {
  return value.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (entity, name) => {
    if (name[0] === "#") {
      const code = name[1].toLowerCase() === "x" ? Number.parseInt(name.slice(2), 16) : Number.parseInt(name.slice(1), 10);
      if (!Number.isFinite(code) || code < 0 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) throw new Error("The SVG contains an invalid character entity.");
      return String.fromCodePoint(code);
    }
    return { amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'" }[name.toLowerCase()];
  }).replace(/&[^;\s]+;/g, () => { throw new Error("The SVG contains an unsupported XML entity."); });
}

function parseXml(source) {
  if (source.length > MAX_SVG_LENGTH) throw new Error("SVG files must be smaller than 5 MB.");
  if (/<!\s*(DOCTYPE|ENTITY)|<\?xml-stylesheet/i.test(source)) throw new Error("SVG document declarations and external stylesheets are not supported.");
  const root = { name: "#document", attrs: {}, children: [], text: "" };
  const stack = [root];
  const tokens = source.match(/<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<![^>]*>|<[^>]+>|[^<]+/g) ?? [];
  let count = 0;
  for (const token of tokens) {
    if (token.startsWith("<!--") || token.startsWith("<?")) continue;
    if (token.startsWith("<!")) throw new Error("SVG declarations are not supported.");
    if (token.startsWith("</")) {
      const name = token.slice(2, -1).trim().toLowerCase();
      if (stack.length === 1 || stack.at(-1).name !== name) throw new Error("The SVG markup is malformed.");
      stack.pop();
      continue;
    }
    if (token.startsWith("<")) {
      const match = token.match(/^<\s*([\w:.-]+)([\s\S]*?)\/?\s*>$/);
      if (!match) throw new Error("The SVG markup is malformed.");
      const name = match[1].toLowerCase();
      const attrs = {};
      const rest = match[2];
      const attrPattern = /([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
      let attrMatch;
      let consumed = "";
      while ((attrMatch = attrPattern.exec(rest))) {
        attrs[attrMatch[1].toLowerCase()] = decodeXml(attrMatch[2] ?? attrMatch[3] ?? "");
        consumed += `${attrMatch[0]} `;
      }
      if (rest.replace(attrPattern, "").replace(/\s+/g, "").length) throw new Error("SVG attributes must use quoted values.");
      const node = { name, attrs, children: [], text: "" };
      stack.at(-1).children.push(node);
      count += 1;
      if (count > MAX_ELEMENTS) throw new Error("SVG contains too many elements (maximum 10,000).");
      if (!/\/\s*>$/.test(token)) stack.push(node);
      continue;
    }
    const text = decodeXml(token);
    stack.at(-1).text += text;
    stack.at(-1).children.push({ name: "#text", attrs: {}, children: [], text });
  }
  if (stack.length !== 1) throw new Error("The SVG markup is incomplete.");
  const svg = root.children.find((node) => node.name === "svg");
  if (!svg) throw new Error("Choose a valid SVG document.");
  return { svg, count };
}

function escapeXml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function serializeSafe(node) {
  const blocked = new Set(["script", "style", "foreignobject", "iframe", "object", "embed", "audio", "video", "animate", "animatetransform", "animatemotion", "set"]);
  if (blocked.has(node.name)) return "";
  if (node.name === "#text") return escapeXml(node.text);
  const attrs = Object.entries(node.attrs).filter(([name, value]) => {
    if (/^on/i.test(name)) return false;
    if (name === "href" || name === "xlink:href") return Boolean(safeImageData(value)) || String(value).startsWith("#");
    if (/(?:javascript\s*:|expression\s*\(|url\(\s*['"]?(?!#))/i.test(value)) return false;
    return true;
  }).map(([name, value]) => ` ${name}="${escapeXml(value)}"`).join("");
  const children = node.children.map(serializeSafe).join("");
  if (!children) return `<${node.name}${attrs}/>`;
  return `<${node.name}${attrs}>${children}</${node.name}>`;
}

const number = (value, fallback = 0) => {
  const match = String(value ?? "").trim().match(/^[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/i);
  const parsed = match ? Number(match[0]) : fallback;
  return Number.isFinite(parsed) ? parsed : fallback;
};
const svgLength = (value, fallback = 0) => {
  const match = String(value ?? "").trim().match(/^([-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?)(px|pt|pc|mm|cm|in|q)?$/i);
  if (!match) return fallback;
  const factors = { px: 1, pt: 96 / 72, pc: 16, mm: 96 / 25.4, cm: 96 / 2.54, in: 96, q: 96 / 101.6 };
  return Number(match[1]) * factors[(match[2] ?? "px").toLowerCase()];
};
const opacity = (value, fallback = 1) => Math.max(0, Math.min(1, number(value, fallback)));

function parseStyle(node) {
  const result = {};
  for (const declaration of (node.attrs.style ?? "").split(";")) {
    const separator = declaration.indexOf(":");
    if (separator < 0) continue;
    result[declaration.slice(0, separator).trim().toLowerCase()] = declaration.slice(separator + 1).trim();
  }
  return { ...result, ...node.attrs };
}

function matrixMultiply(a, b) {
  return [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3], a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]];
}
function parseTransform(value = "") {
  let result = [1, 0, 0, 1, 0, 0];
  const expression = /(matrix|translate|scale|rotate)\s*\(([^)]*)\)/gi;
  let match;
  while ((match = expression.exec(value))) {
    const values = match[2].trim().split(/[\s,]+/).map(Number);
    if (values.some((item) => !Number.isFinite(item))) continue;
    let next;
    if (match[1].toLowerCase() === "matrix" && values.length === 6) next = values;
    else if (match[1].toLowerCase() === "translate") next = [1, 0, 0, 1, values[0] ?? 0, values[1] ?? 0];
    else if (match[1].toLowerCase() === "scale") next = [values[0] ?? 1, 0, 0, values[1] ?? values[0] ?? 1, 0, 0];
    else if (match[1].toLowerCase() === "rotate") {
      const angle = (values[0] ?? 0) * Math.PI / 180;
      const rotation = [Math.cos(angle), Math.sin(angle), -Math.sin(angle), Math.cos(angle), 0, 0];
      const cx = values[1] ?? 0;
      const cy = values[2] ?? 0;
      next = matrixMultiply(matrixMultiply([1, 0, 0, 1, cx, cy], rotation), [1, 0, 0, 1, -cx, -cy]);
    }
    if (next) result = matrixMultiply(result, next);
  }
  return result;
}
const transformPoint = (matrix, x, y) => ({ x: matrix[0] * x + matrix[2] * y + matrix[4], y: matrix[1] * x + matrix[3] * y + matrix[5] });
const safeColor = (value, fallback) => {
  const color = String(value ?? fallback).trim();
  if (/^(?:none|transparent|currentcolor|url\s*\()/i.test(color)) return color.toLowerCase() === "none" ? "none" : fallback;
  return /^#[\da-f]{3,8}$/i.test(color) || /^(?:rgb|rgba|hsl|hsla)\([\d.%\s,/-]+\)$/i.test(color) || /^[a-z]{1,24}$/i.test(color) ? color : fallback;
};
function safeImageData(value) {
  const match = String(value ?? "").match(/^data:(image\/(?:png|jpeg|webp|gif));base64,([a-z\d+/=]+)$/i);
  if (!match || !SAFE_IMAGE_TYPES.has(match[1].toLowerCase()) || match[2].length > 5_000_000) return null;
  return `data:${match[1].toLowerCase()};base64,${match[2]}`;
}

function shapePath(node) {
  const a = node.attrs;
  if (node.name === "rect") {
    const x = number(a.x), y = number(a.y), w = number(a.width), h = number(a.height);
    if (w <= 0 || h <= 0) return null;
    return { d: `M ${x} ${y} H ${x + w} V ${y + h} H ${x} Z`, bounds: [x, y, x + w, y + h], rounded: number(a.rx) > 0 || number(a.ry) > 0 };
  }
  if (node.name === "circle" || node.name === "ellipse") {
    const cx = number(a.cx), cy = number(a.cy), rx = node.name === "circle" ? number(a.r) : number(a.rx), ry = node.name === "circle" ? rx : number(a.ry);
    if (rx <= 0 || ry <= 0) return null;
    const k = 0.5522847498;
    return { d: `M ${cx - rx} ${cy} C ${cx - rx} ${cy - k * ry} ${cx - k * rx} ${cy - ry} ${cx} ${cy - ry} C ${cx + k * rx} ${cy - ry} ${cx + rx} ${cy - k * ry} ${cx + rx} ${cy} C ${cx + rx} ${cy + k * ry} ${cx + k * rx} ${cy + ry} ${cx} ${cy + ry} C ${cx - k * rx} ${cy + ry} ${cx - rx} ${cy + k * ry} ${cx - rx} ${cy} Z`, bounds: [cx - rx, cy - ry, cx + rx, cy + ry] };
  }
  if (node.name === "line") {
    const x1 = number(a.x1), y1 = number(a.y1), x2 = number(a.x2), y2 = number(a.y2);
    return { d: `M ${x1} ${y1} L ${x2} ${y2}`, bounds: [Math.min(x1, x2), Math.min(y1, y2), Math.max(x1, x2), Math.max(y1, y2)] };
  }
  if (node.name === "polyline" || node.name === "polygon") {
    const points = (a.points ?? "").trim().split(/[\s,]+/).map(Number);
    if (points.length < 4 || points.length % 2 || points.some((point) => !Number.isFinite(point))) return null;
    const pairs = Array.from({ length: points.length / 2 }, (_, index) => [points[index * 2], points[index * 2 + 1]]);
    const d = `M ${pairs.map((point) => point.join(" ")).join(" L ")}${node.name === "polygon" ? " Z" : ""}`;
    return { d, bounds: [Math.min(...pairs.map((point) => point[0])), Math.min(...pairs.map((point) => point[1])), Math.max(...pairs.map((point) => point[0])), Math.max(...pairs.map((point) => point[1]))] };
  }
  if (node.name === "path" && a.d && !/[<>]/.test(a.d)) {
    try {
      const commands = svgPathParser(a.d);
      let currentX = 0, currentY = 0, subpathX = 0, subpathY = 0;
      const points = [];
      for (const command of commands) {
        const relative = command.code === command.code.toLowerCase();
        const baseX = currentX, baseY = currentY;
        const absolute = (x, y) => ({ x: relative ? baseX + x : x, y: relative ? baseY + y : y });
        if (command.code.toLowerCase() === "z") {
          currentX = subpathX; currentY = subpathY;
          points.push({ x: currentX, y: currentY });
          continue;
        }
        if (command.code.toLowerCase() === "h") {
          currentX = relative ? baseX + command.x : command.x;
          points.push({ x: currentX, y: currentY });
          continue;
        }
        if (command.code.toLowerCase() === "v") {
          currentY = relative ? baseY + command.y : command.y;
          points.push({ x: currentX, y: currentY });
          continue;
        }
        for (const suffix of ["1", "2"]) {
          const x = command[`x${suffix}`], y = command[`y${suffix}`];
          if (Number.isFinite(x) && Number.isFinite(y)) points.push(absolute(x, y));
        }
        if (command.code.toLowerCase() === "a") {
          const end = absolute(command.x, command.y);
          points.push(end, { x: end.x - command.rx, y: end.y - command.ry }, { x: end.x + command.rx, y: end.y + command.ry });
        } else if (Number.isFinite(command.x) && Number.isFinite(command.y)) {
          const end = absolute(command.x, command.y);
          currentX = end.x; currentY = end.y;
          if (command.code.toLowerCase() === "m") { subpathX = currentX; subpathY = currentY; }
          points.push(end);
        }
      }
      if (!points.length) return null;
      return { d: a.d, bounds: [Math.min(...points.map((point) => point.x)), Math.min(...points.map((point) => point.y)), Math.max(...points.map((point) => point.x)), Math.max(...points.map((point) => point.y))] };
    } catch { return null; }
  }
  return null;
}

export function importSvgDocument(source, { width, height, createId = () => `svg-${Math.random().toString(36).slice(2)}` }) {
  const warnings = new Set();
  const { svg } = parseXml(String(source));
  const safeSource = serializeSafe(svg);
  const viewBoxValues = (svg.attrs.viewbox ?? "").trim().split(/[\s,]+/).map(Number);
  const viewBox = viewBoxValues.length === 4 && viewBoxValues.every(Number.isFinite) && viewBoxValues[2] > 0 && viewBoxValues[3] > 0
    ? viewBoxValues
    : [0, 0, svgLength(svg.attrs.width, 100), svgLength(svg.attrs.height, 100)];
  const [, , sourceWidth, sourceHeight] = viewBox;
  const rootWidthPx = svgLength(svg.attrs.width, sourceWidth);
  const userUnitsPerCssPixel = sourceWidth / Math.max(rootWidthPx, 0.001);
  const fit = Math.min(width * 0.78 / sourceWidth, height * 0.72 / sourceHeight);
  const offsetX = (width - sourceWidth * fit) / 2;
  const offsetY = (height - sourceHeight * fit) / 2;
  const objects = [];
  const rootMatrix = [1, 0, 0, 1, -viewBox[0], -viewBox[1]];
  const walk = (node, parentMatrix, inheritedStyle = {}, parentOpacity = 1) => {
    if (["script", "foreignobject", "iframe", "object", "embed", "audio", "video", "animate", "animatetransform", "animatemotion", "set"].includes(node.name)) {
      warnings.add(`Removed unsafe or unsupported <${node.name}> content.`);
      return;
    }
    const ownStyle = parseStyle(node);
    const style = { ...inheritedStyle, ...ownStyle };
    const localMatrix = matrixMultiply(parentMatrix, parseTransform(ownStyle.transform));
    const elementOpacity = parentOpacity * opacity(ownStyle.opacity, 1);
    if (ownStyle.transform) {
      const unsupportedTransforms = [...ownStyle.transform.matchAll(/([a-zA-Z]+)\s*\(/g)].map((match) => match[1].toLowerCase()).filter((name) => !["matrix", "translate", "scale", "rotate"].includes(name));
      if (unsupportedTransforms.length) warnings.add(`SVG transform ${unsupportedTransforms.join(", ")} is unsupported; affected objects may not match the source.`);
    }
    if (node.name === "style") { warnings.add("Embedded SVG stylesheets are unsupported and were removed."); return; }
    if (node.name === "defs" || node.name === "clippath" || node.name === "mask" || node.name === "filter" || node.name === "lineargradient" || node.name === "radialgradient" || node.name === "pattern") {
      if (node.name !== "defs") warnings.add(`SVG ${node.name} effects are not supported and were skipped.`);
      return;
    }
    if (node.name === "g" || node.name === "svg") {
      if (style.filter || style.mask || style["clip-path"]) warnings.add("Group filters, clipping and masks are not supported.");
      for (const child of node.children.filter((item) => item.name !== "#text")) walk(child, localMatrix, style, elementOpacity);
      if (node.children.some((child) => child.name === "#text" && child.text.trim())) warnings.add("Text outside an SVG <text> element was skipped.");
      return;
    }
    if (node.name === "text" || node.name === "tspan") {
      if (node.name === "tspan") {
        warnings.add("Nested tspan positioning and per-run styling are partially supported; text runs were combined.");
      }
      const collectText = (item) => item.children.length
        ? item.children.map((child) => child.name === "#text" ? child.text : child.name === "tspan" ? collectText(child) : "").join("")
        : item.text;
      const content = collectText(node);
      if (!content) return;
      const svgAnchor = style["text-anchor"] ?? "start";
      const x = number(style.x), y = number(style.y);
      const position = transformPoint(localMatrix, x, y);
      const sx = Math.hypot(localMatrix[0], localMatrix[1]);
      const sy = Math.hypot(localMatrix[2], localMatrix[3]);
      const rtl = /^(rtl|auto)$/i.test(style.direction ?? "") || /[\u0590-\u08ff]/.test(content);
      const anchor = rtl && svgAnchor === "start" ? "end" : rtl && svgAnchor === "end" ? "start" : svgAnchor;
      const fill = safeColor(style.fill, "#000000");
      const textStroke = safeColor(style.stroke, "none");
      const fontSize = Math.max(1, svgLength(style["font-size"], 16) * userUnitsPerCssPixel * (sx + sy) / 2 * fit);
      if (style["dominant-baseline"] || style["writing-mode"] || style["text-decoration"]) warnings.add("Some SVG text baseline, writing-mode or decoration properties are not supported.");
      const textWidth = Math.max(fontSize * content.length * 0.6 / width * 100, 0.1);
      const textX = (offsetX + position.x * fit + (anchor === "start" ? 0.5 : anchor === "end" ? -0.5 : 0) * textWidth * width / 100) / width * 100;
      const textY = (offsetY + position.y * fit - fontSize * 0.35) / height * 100;
      if (style["stroke-opacity"] && opacity(style["stroke-opacity"]) !== opacity(style["fill-opacity"], 1)) warnings.add("Independent text fill and stroke opacity is not supported; the text fill opacity is used.");
      objects.push({ id: createId(), type: "text", text: content, x: textX, y: textY, fontSize, svgWidth: textWidth, svgHeight: Math.max(fontSize / height * 100, 0.1), fontFamily: style["font-family"] || "Arial, sans-serif", color: fill === "none" ? "#000000" : fill, fillMode: "solid", align: anchor === "middle" ? "center" : anchor === "end" ? "right" : "left", direction: rtl ? "rtl" : "ltr", opacity: elementOpacity * opacity(style["fill-opacity"], 1) * 100, bold: /bold|[6-9]00/.test(style["font-weight"] ?? ""), italic: style["font-style"] === "italic", letterSpacing: svgLength(style["letter-spacing"], 0) * userUnitsPerCssPixel * fit, wordSpacing: svgLength(style["word-spacing"], 0) * userUnitsPerCssPixel * fit, strokeEnabled: textStroke !== "none", strokeColor: textStroke === "none" ? "#442d0b" : textStroke, strokeWidth: svgLength(style["stroke-width"], 1) * userUnitsPerCssPixel * fit, rotation: Math.atan2(localMatrix[1], localMatrix[0]) * 180 / Math.PI, locked: false });
      for (const child of node.children.filter((item) => item.name !== "tspan")) walk(child, localMatrix, style, elementOpacity);
      return;
    }
    if (node.name === "image") {
      const href = style.href ?? style["xlink:href"];
      const src = safeImageData(href);
      if (!src) { warnings.add("Removed an SVG image with an unsupported or external URL."); return; }
      const x = number(style.x), y = number(style.y), w = number(style.width), h = number(style.height);
      const p = transformPoint(localMatrix, x + w / 2, y + h / 2);
      if (Math.abs(Math.hypot(localMatrix[0], localMatrix[1]) - Math.hypot(localMatrix[2], localMatrix[3])) > 0.001) warnings.add("Non-uniformly transformed embedded images may not retain their exact proportions.");
      objects.push({ id: createId(), type: "image", src, x: (offsetX + p.x * fit) / width * 100, y: (offsetY + p.y * fit) / height * 100, width: w * Math.hypot(localMatrix[0], localMatrix[1]) * fit / width * 100, rotation: Math.atan2(localMatrix[1], localMatrix[0]) * 180 / Math.PI, opacity: elementOpacity * 100, locked: false, svgImported: true, svgHeight: h * Math.hypot(localMatrix[2], localMatrix[3]) * fit / height * 100 });
      return;
    }
    const geometry = shapePath(node);
    if (!geometry) { warnings.add(`Skipped unsupported SVG element <${node.name}>.`); return; }
    if (geometry.rounded) warnings.add("Rounded rectangle corners are not supported and were imported as square corners.");
    if (style.filter || style.mask || style["clip-path"] || style.fill?.startsWith("url(") || style.stroke?.startsWith("url(")) warnings.add("SVG gradients, filters, clipping and masks are not supported; affected objects use fallback colors.");
    const [minX, minY, maxX, maxY] = geometry.bounds;
    const corners = [transformPoint(localMatrix, minX, minY), transformPoint(localMatrix, maxX, minY), transformPoint(localMatrix, maxX, maxY), transformPoint(localMatrix, minX, maxY)];
    const left = Math.min(...corners.map((point) => point.x)), top = Math.min(...corners.map((point) => point.y));
    const right = Math.max(...corners.map((point) => point.x)), bottom = Math.max(...corners.map((point) => point.y));
    const boundsWidth = Math.max(right - left, 0.01), boundsHeight = Math.max(bottom - top, 0.01);
    const fill = safeColor(style.fill, "#000000");
    const stroke = safeColor(style.stroke, "none");
    objects.push({ id: createId(), type: "shape", shape: "custom", svgPathData: geometry.d, svgTransform: localMatrix, svgViewBox: [left, top, boundsWidth, boundsHeight], x: (offsetX + (left + boundsWidth / 2) * fit) / width * 100, y: (offsetY + (top + boundsHeight / 2) * fit) / height * 100, width: boundsWidth * fit / width * 100, height: boundsHeight * fit / height * 100, color: fill === "none" ? "#000000" : fill, fillEnabled: fill !== "none", fillOpacity: opacity(style["fill-opacity"], 1), strokeEnabled: stroke !== "none", strokeColor: stroke === "none" ? "#000000" : stroke, strokeWidth: number(style["stroke-width"], 1), strokeOpacity: opacity(style["stroke-opacity"], 1), strokeLineCap: style["stroke-linecap"] || "butt", strokeLineJoin: style["stroke-linejoin"] || "miter", fillRule: style["fill-rule"] === "evenodd" ? "evenodd" : "nonzero", opacity: elementOpacity * 100, rotation: 0, locked: false, svgImported: true });
  };
  for (const child of svg.children.filter((item) => item.name !== "#text")) walk(child, rootMatrix, {}, 1);
  if (!objects.length) throw new Error("No supported editable objects were found in this SVG.");
  warnings.add("SVG grouping hierarchy is flattened into editable design objects.");
  const bounds = objects.map((object) => {
    const objectWidth = object.width ?? object.svgWidth ?? 0.1;
    const objectHeight = object.height ?? object.svgHeight ?? 0.1;
    return { left: object.x - objectWidth / 2, right: object.x + objectWidth / 2, top: object.y - objectHeight / 2, bottom: object.y + objectHeight / 2 };
  });
  const left = Math.min(...bounds.map((item) => item.left)), right = Math.max(...bounds.map((item) => item.right));
  const top = Math.min(...bounds.map((item) => item.top)), bottom = Math.max(...bounds.map((item) => item.bottom));
  const group = objects.length === 1
    ? { ...objects[0], svgSource: safeSource }
    : { id: createId(), type: "group", x: (left + right) / 2, y: (top + bottom) / 2, width: Math.max(0.1, right - left), height: Math.max(0.1, bottom - top), baseBounds: { x: (left + right) / 2, y: (top + bottom) / 2, width: Math.max(0.1, right - left), height: Math.max(0.1, bottom - top) }, rotation: 0, flipHorizontal: false, flipVertical: false, opacity: 100, svgSource: safeSource, children: objects };
  return { objects: [group], warnings: [...warnings], viewBox, sourceWidth: number(svg.attrs.width, sourceWidth), sourceHeight: number(svg.attrs.height, sourceHeight) };
}
import svgPathParser from "svg-path-parser";
