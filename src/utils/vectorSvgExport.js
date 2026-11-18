import { pathToSvg } from "./vectorGeometry.js";

const escapeXml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;",
}[character]));

export function exportCustomVectorsSvg(objects, { width = 100, height = 100 } = {}) {
  const vectors = objects.filter((object) => object?.type === "shape" && object.shape === "custom" && object.paths?.length);
  const content = vectors.map((object) => {
    const transform = `translate(${object.x ?? 50} ${object.y ?? 50}) rotate(${object.rotation ?? 0}) scale(${(object.width ?? 38) / 100} ${(object.height ?? 38) / 100}) translate(-50 -50)`;
    const data = pathToSvg(object.paths);
    return `<path data-object-id="${escapeXml(object.id)}" d="${escapeXml(data)}" transform="${transform}" fill="${object.fillEnabled === false ? "none" : escapeXml(object.color ?? "#d5ad62")}" fill-rule="${escapeXml(object.fillRule ?? "evenodd")}" stroke="${object.strokeEnabled ? escapeXml(object.strokeColor ?? "#17352c") : "none"}" stroke-width="${Number(object.strokeWidth ?? 1)}" vector-effect="non-scaling-stroke" opacity="${Math.max(0, Math.min(100, Number(object.opacity ?? 100))) / 100}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" xmlns:app="https://qadri.app/ns/vector" width="${Number(width)}" height="${Number(height)}" viewBox="0 0 100 100">${content}</svg>`;
}
