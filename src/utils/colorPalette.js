export const QADRI_COLOR_PALETTE = [
  { name: "White", hex: "#ffffff" }, { name: "Black", hex: "#111111" },
  { name: "Charcoal", hex: "#343a40" }, { name: "Grey", hex: "#808080" },
  { name: "Light Grey", hex: "#d9dedb" }, { name: "Cream", hex: "#fff4dc" },
  { name: "Red", hex: "#e53935" }, { name: "Dark Red", hex: "#9f2020" },
  { name: "Coral", hex: "#ff725e" }, { name: "Orange", hex: "#f28c28" },
  { name: "Amber", hex: "#f5b82e" }, { name: "Yellow", hex: "#ffdf35" },
  { name: "Lime", hex: "#a8c936" }, { name: "Green", hex: "#23844a" },
  { name: "Forest Green", hex: "#174d37" }, { name: "Teal", hex: "#168c8c" },
  { name: "Cyan", hex: "#29c6d1" }, { name: "Sky Blue", hex: "#55a9ed" },
  { name: "Blue", hex: "#2875d2" }, { name: "Navy", hex: "#173b6c" },
  { name: "Indigo", hex: "#5147b8" }, { name: "Purple", hex: "#854cb8" },
  { name: "Violet", hex: "#bd65d4" }, { name: "Pink", hex: "#ed6ca2" },
  { name: "Rose", hex: "#bd4967" }, { name: "Brown", hex: "#79543a" },
  { name: "Gold", hex: "#c49a45" }, { name: "Sand", hex: "#d8bf91" },
  { name: "Sage", hex: "#a4b7a2" }, { name: "Mint", hex: "#9ed8ba" },
  { name: "Pale Blue", hex: "#b8d8ef" }, { name: "Lavender", hex: "#d5c6ed" },
];

export function normalizeHexColor(color) {
  if (typeof color !== "string") return null;
  const match = color.trim().match(/^#?([\da-f]{3}|[\da-f]{6})$/i);
  if (!match) return null;
  const value = match[1].length === 3 ? [...match[1]].map((digit) => digit + digit).join("") : match[1];
  return `#${value.toLowerCase()}`;
}

export function interpolateHexColor(from, to, amount) {
  const first = normalizeHexColor(from);
  const second = normalizeHexColor(to);
  const t = Math.max(0, Math.min(1, Number(amount)));
  if (!first || !second || !Number.isFinite(t)) return first ?? second ?? "#000000";
  const start = first.slice(1).match(/../g).map((part) => Number.parseInt(part, 16));
  const end = second.slice(1).match(/../g).map((part) => Number.parseInt(part, 16));
  return `#${start.map((value, index) => Math.round(value + (end[index] - value) * t).toString(16).padStart(2, "0")).join("")}`;
}
