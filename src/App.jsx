import { useState, useRef, useEffect } from "react";
import "./App.css";
import BackgroundRemover from "./components/BackgroundRemover.jsx";
import ExportSettings from "./components/ExportSettings.jsx";
import ProjectManager from "./components/ProjectManager.jsx";
import TemplateGallery from "./components/TemplateGallery.jsx";
import TemplateManager from "./components/TemplateManager.jsx";
import TemplateSaveDialog from "./components/TemplateSaveDialog.jsx";
import { resizeObjectFromCorner } from "./utils/objectGeometry.js";
import { createProjectRecord, readProjects, writeProjects } from "./utils/projectStorage.js";
import { canManageTemplates } from "./utils/templatePermissions.js";
import { createTemplateRecord, deleteTemplate, readTemplates, writeTemplate } from "./utils/templateStorage.js";
import svgPathParser from "svg-path-parser";
import { applyBooleanGeometry, createBooleanVector, flattenVectorPath, pathToSvg, simplifyPolyline } from "./utils/vectorGeometry.js";
import { defaultTransparencyStops, imageMaskSvg, normalizeTransparencyMask, transparencyCss } from "./utils/transparency.js";

const canvasSizes = {
  "Instagram Post 1080x1080": { width: 1080, height: 1080 },
  "YouTube Thumbnail 1280x720": { width: 1280, height: 720 },
  "Instagram Story 1080x1920": { width: 1080, height: 1920 },
  "A4 Portrait": { width: 2480, height: 3508 },
  "A4 Landscape": { width: 3508, height: 2480 },
  "Square 1080x1080": { width: 1080, height: 1080 },
};

const fontOptions = [
  { label: "Naskh Arabic", value: '"Noto Naskh Arabic", "Traditional Arabic", serif' },
  { label: "Nastaliq Urdu", value: '"Noto Nastaliq Urdu", "Noto Naskh Arabic", serif' },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Times New Roman", value: '"Times New Roman", serif' },
];
const proportionalShapeIds = new Set(["circle", "circle-outline", "square", "circle-ornament"]);

const textEffectDefaults = {
  color: "#17352c",
  fillMode: "solid",
  imageFillSrc: null,
  imageFillScale: 100,
  imageFillX: 0,
  imageFillY: 0,
  gradientColor1: "#e7c36f",
  gradientColor2: "#fff2c2",
  gradientColor3: "#a97826",
  gradientColor3Enabled: false,
  gradientAngle: 0,
  strokeEnabled: false,
  strokeColor: "#442d0b",
  strokeWidth: 2,
  shadowEnabled: false,
  shadowColor: "#000000",
  shadowBlur: 8,
  shadowOffsetX: 2,
  shadowOffsetY: 3,
  shadowOpacity: 65,
  glowEnabled: false,
  glowColor: "#f5ca65",
  glowBlur: 18,
  glowOpacity: 75,
  opacity: 100,
  rotation: 0,
};

function createTextDesign(label, sample, colors, strokeColor, options = {}) {
  const [gradientColor1, gradientColor2, gradientColor3] = colors;
  return {
    label,
    sample,
    style: {
      ...textEffectDefaults,
      fillMode: options.fillMode ?? "gradient",
      color: gradientColor1,
      gradientColor1,
      gradientColor2,
      gradientColor3: gradientColor3 ?? gradientColor2,
      gradientColor3Enabled: Boolean(gradientColor3),
      gradientAngle: options.gradientAngle ?? 90,
      strokeEnabled: options.strokeEnabled ?? true,
      strokeColor,
      strokeWidth: options.strokeWidth ?? 1.2,
      shadowEnabled: options.shadowEnabled ?? true,
      shadowColor: options.shadowColor ?? "#17130b",
      shadowBlur: options.shadowBlur ?? 8,
      shadowOffsetX: options.shadowOffsetX ?? 1,
      shadowOffsetY: options.shadowOffsetY ?? 3,
      shadowOpacity: options.shadowOpacity ?? 65,
      glowEnabled: options.glowEnabled ?? false,
      glowColor: options.glowColor ?? gradientColor1,
      glowBlur: options.glowBlur ?? 18,
      glowOpacity: options.glowOpacity ?? 75,
      opacity: 100,
      fontFamily: options.fontFamily ?? fontOptions[0].value,
      fontSize: options.fontSize ?? 36,
      bold: options.bold ?? true,
      italic: options.italic ?? false,
      letterSpacing: options.letterSpacing ?? 0,
      lineHeight: options.lineHeight ?? 1.25,
    },
  };
}

const textDesigns = [
  createTextDesign("Gold Islamic", "بسم اللہ الرحمن الرحیم", ["#fff0b0", "#bd8124", "#f6d979"], "#5b3a10", { gradientAngle: 90, shadowBlur: 10, shadowOffsetY: 4 }),
  createTextDesign("Royal Gold", "محمد ﷺ", ["#fff7c2", "#b77714", "#f2cd66"], "#211708", { strokeWidth: 2, shadowBlur: 14, shadowOpacity: 78 }),
  createTextDesign("Green Islamic", "الحمد لله", ["#e5ffc3", "#347748", "#d9b964"], "#b68b39", { gradientAngle: 70, glowEnabled: true, glowColor: "#8bcf78", glowBlur: 14 }),
  createTextDesign("Emerald Gold", "سبحان الله", ["#d9fff0", "#00835a", "#f4d27b"], "#b78a36", { gradientAngle: 65, glowEnabled: true, glowColor: "#4cc98a", glowBlur: 12 }),
  createTextDesign("White Glow", "جمعہ مبارک", ["#ffffff", "#fffaf0"], "#dce9e4", { fillMode: "solid", strokeWidth: 0.8, shadowColor: "#153329", shadowBlur: 7, shadowOffsetY: 3, shadowOpacity: 45, glowEnabled: true, glowColor: "#ffffff", glowBlur: 22, glowOpacity: 85 }),
  createTextDesign("Golden Glow", "رمضان كريم", ["#fff2b7", "#b87915", "#ffe184"], "#5a3a10", { glowEnabled: true, glowColor: "#ffdc79", glowBlur: 20, shadowBlur: 9 }),
  createTextDesign("Red Gold", "عید مبارک", ["#ffe1a2", "#b73429", "#f0bf75"], "#611e18", { gradientAngle: 100, shadowColor: "#260a08", shadowBlur: 10, shadowOpacity: 70 }),
  createTextDesign("Blue Silver", "السلام عليكم", ["#ffffff", "#8ab7db", "#d6e7f4"], "#254766", { glowEnabled: true, glowColor: "#8acaff", glowBlur: 16, glowOpacity: 65, shadowColor: "#102c45" }),
  createTextDesign("Mosque Style", "لا إله إلا الله", ["#f1eccb", "#547761", "#d6b55f"], "#233d30", { gradientAngle: 80, shadowColor: "#12231a", shadowBlur: 12 }),
  createTextDesign("Ramadan Style", "رمضان كريم", ["#f5f2bd", "#176448", "#d7b65d"], "#173d2c", { glowEnabled: true, glowColor: "#b7d57c", glowBlur: 15 }),
  createTextDesign("Eid Style", "عيد مبارك", ["#fff0b0", "#43865a", "#e8c467"], "#315534", { glowEnabled: true, glowColor: "#f2d27a", glowBlur: 16 }),
  createTextDesign("Jummah Style", "جمعہ مبارک", ["#ffffff", "#78a77f", "#e4c876"], "#24563e", { glowEnabled: true, glowColor: "#d2e9d2", glowBlur: 12 }),
  createTextDesign("Elegant Arabic", "بسم الله الرحمن الرحيم", ["#fff4d5", "#c39a4b"], "#674817", { fontFamily: fontOptions[0].value, fontSize: 34, bold: false, strokeWidth: 0.8, shadowBlur: 5, shadowOffsetY: 2 }),
  createTextDesign("Luxury Islamic", "الله أكبر", ["#fff2c0", "#9f6b1a", "#e9c66d"], "#20190e", { strokeWidth: 2, shadowBlur: 15, shadowOffsetY: 5, shadowOpacity: 78 }),
  createTextDesign("Royal Nastaliq", "عید میلاد النبی ﷺ", ["#fff0b0", "#b57b21", "#f2d788"], "#49300d", { fontFamily: fontOptions[1].value, fontSize: 40, strokeWidth: 1.5, shadowBlur: 10, shadowOffsetY: 4 }),
  createTextDesign("Islamic Calligraphy", "اللهم صل على محمد", ["#fff1c9", "#856b36", "#e5d39b"], "#4a3b20", { fontFamily: fontOptions[0].value, fontSize: 34, bold: false, strokeWidth: 0.8, shadowBlur: 7 }),
  createTextDesign("Golden 3D", "سبحان الله", ["#fff2b0", "#c28b22", "#fff1a7"], "#523510", { strokeWidth: 3, shadowBlur: 16, shadowOffsetY: 6, shadowOpacity: 82 }),
  createTextDesign("White Gold", "يا رحمن", ["#ffffff", "#dbc17d", "#fff6d6"], "#8d7135", { glowEnabled: true, glowColor: "#fff0bb", glowBlur: 12, shadowBlur: 8 }),
  createTextDesign("Green Gold", "سبحان الله", ["#f2ffcf", "#2d7652", "#e3c16b"], "#b18b3c", { gradientAngle: 75, glowEnabled: true, glowColor: "#a2d37e", glowBlur: 12 }),
  createTextDesign("Black Gold", "الحمد لله", ["#fff0a8", "#55401d", "#d7ae4c"], "#17130c", { gradientAngle: 90, strokeWidth: 1.8, shadowColor: "#000000", shadowBlur: 13, shadowOpacity: 78 }),
];

const backgroundGradientPresets = [
  { label: "Gold", colors: ["#28170a", "#bd8b35", "#fae7a7"] },
  { label: "Green", colors: ["#09271f", "#17684a", "#d1b36b"] },
  { label: "Emerald", colors: ["#052b25", "#07805a", "#b8d987"] },
  { label: "Blue", colors: ["#101d38", "#326f9c", "#b5d2e3"] },
  { label: "Purple", colors: ["#20152f", "#684c78", "#d7b9d1"] },
  { label: "Red", colors: ["#391512", "#a23b31", "#e9b66e"] },
  { label: "Black & Gold", colors: ["#080909", "#342719", "#d8b665"] },
  { label: "Green & Gold", colors: ["#0a2d24", "#286d4a", "#e4c26c"] },
  { label: "Blue & Silver", colors: ["#111b2c", "#456078", "#e0e7eb"] },
];

const islamicBackgrounds = [
  { id: "green-mosque", label: "Green Islamic Mosque", colors: ["#071f1b", "#17634b", "#d9bd72"], motif: "mosque" },
  { id: "gold-mosque", label: "Gold Mosque", colors: ["#21180d", "#7e5720", "#f1d995"], motif: "mosque" },
  { id: "ramadan-lantern", label: "Ramadan Lantern", colors: ["#10182c", "#382b43", "#ecc36b"], motif: "lantern" },
  { id: "crescent-stars", label: "Crescent Moon & Stars", colors: ["#0b1932", "#21496b", "#f1d47f"], motif: "crescent" },
  { id: "geometric-pattern", label: "Islamic Geometric Pattern", colors: ["#0d2927", "#286458", "#c6a961"], motif: "geometric" },
  { id: "elegant-green-gold", label: "Elegant Green & Gold", colors: ["#10261f", "#31704b", "#ddbf72"], motif: "arabesque" },
  { id: "black-gold-islamic", label: "Black & Gold Islamic", colors: ["#0a0a0b", "#3a2a17", "#e7c66d"], motif: "geometric" },
  { id: "blue-mosque", label: "Blue Mosque", colors: ["#101b34", "#35779a", "#e8d398"], motif: "mosque" },
  { id: "royal-islamic-gold", label: "Royal Islamic Gold", colors: ["#20152f", "#63413d", "#f2d17c"], motif: "arch" },
  { id: "green-dome", label: "Green Dome Style", colors: ["#08251f", "#287a59", "#ddc276"], motif: "dome" },
  { id: "masjid-silhouette", label: "Masjid Silhouette", colors: ["#0d182d", "#344b6a", "#dfbd68"], motif: "mosque" },
  { id: "islamic-arch", label: "Islamic Arch", colors: ["#14312b", "#397264", "#dfc37a"], motif: "arch" },
  { id: "quran-book", label: "Quran / Islamic Book Style", colors: ["#281b14", "#73543a", "#e5cc88"], motif: "book" },
  { id: "golden-arabesque", label: "Golden Arabesque Pattern", colors: ["#281b0c", "#74501d", "#f0d17b"], motif: "arabesque" },
  { id: "emerald-pattern", label: "Emerald Islamic Pattern", colors: ["#06251f", "#087456", "#b8d991"], motif: "geometric" },
  { id: "blue-ornament", label: "Blue Islamic Ornament", colors: ["#101f34", "#27647d", "#d8c17c"], motif: "arabesque" },
  { id: "ramadan-night", label: "Ramadan Night", colors: ["#0a1025", "#302245", "#f0c566"], motif: "lantern" },
  { id: "eid-islamic", label: "Eid Islamic", colors: ["#10271e", "#4b7745", "#e5c875"], motif: "crescent" },
  { id: "jummah-islamic", label: "Jummah Islamic", colors: ["#082e27", "#277357", "#ece1bc"], motif: "arch" },
  { id: "luxury-islamic", label: "Luxury Islamic Background", colors: ["#111018", "#40304a", "#e8c978"], motif: "arabesque" },
];

function getIslamicBackgroundSvg(design) {
  const [dark, middle, accent] = design.colors;
  const motifs = {
    mosque: `<g fill="${dark}" opacity=".78"><path d="M0 840h1080v240H0zM130 840V550q0-120 115-170 115 50 115 170v290zm290 0V470q0-155 120-220 120 65 120 220v370zm300 0V550q0-120 115-170 115 50 115 170v290z"/><path d="M220 380V245h50v135m315-155V90h40v135m320 155V245h50v135"/></g><g fill="none" stroke="${accent}" stroke-width="8" opacity=".75"><path d="M80 840h920M170 840V560q0-75 75-112 75 37 75 112v280m230 0V480q0-112 90-162 90 50 90 162v360m150 0V560q0-75 75-112 75 37 75 112v280"/></g>`,
    lantern: `<g stroke="${accent}" fill="none" stroke-width="10" opacity=".86"><path d="M280 0v170m0 0-46 38 18 250 28 52 28-52 18-250zm520 0v170m0 0-46 38 18 250 28 52 28-52 18-250z"/><path d="M245 208h70m-58 250h46m442-250h70m-58 250h46" stroke-width="7"/><path d="M280 165v25m520-25v25"/></g><g fill="${accent}" opacity=".3"><path d="m280 520 110 230H170zm520 0 110 230H690z"/></g>`,
    crescent: `<g fill="${accent}" opacity=".9"><path d="M740 170a175 175 0 1 0 150 280 205 205 0 1 1-150-280z"/><path d="m350 220 18 48 52 2-40 34 14 50-44-28-44 28 14-50-40-34 52-2zm400 320 13 34 37 2-29 24 10 36-31-20-31 20 10-36-29-24 37-2zM180 485l12 32 34 1-27 22 9 33-28-18-28 18 9-33-27-22 34-1z"/></g>`,
    geometric: `<g fill="none" stroke="${accent}" stroke-width="9" opacity=".7"><path d="m540 230 95 95 135 0 0 135 95 95-95 95 0 135-135 0-95 95-95-95-135 0 0-135-95-95 95-95 0-135 135 0z"/><path d="m540 340 70 70 100 0 0 100 70 70-70 70 0 100-100 0-70 70-70-70-100 0 0-100-70-70 70-70 0-100 100 0z"/><circle cx="540" cy="540" r="235"/><circle cx="540" cy="540" r="125"/></g>`,
    arch: `<g fill="none" stroke="${accent}" opacity=".78"><path stroke-width="16" d="M180 1080V470Q180 180 540 120q360 60 360 350v610M250 1080V480Q250 250 540 205q290 45 290 275v600"/><path stroke-width="5" d="M310 1080V500q0-185 230-230 230 45 230 230v580M80 1080V550m920 530V550"/></g><g fill="${accent}" opacity=".86"><path d="m540 85 24 48 53 8-38 37 9 53-48-25-48 25 9-53-38-37 53-8z"/></g>`,
    book: `<g fill="none" stroke="${accent}" stroke-width="12" stroke-linejoin="round" opacity=".86"><path d="M190 420q170-80 350 20v390q-180-105-350-20zM890 420q-170-80-350 20v390q180-105 350-20z"/><path d="M540 440v390M260 485q130-35 220 12m-220 60q130-35 220 12m340-84q-130-35-220 12m220 60q-130-35-220 12" stroke-width="7"/><path d="M370 850h340l-170 100z"/></g>`,
    arabesque: `<g fill="none" stroke="${accent}" stroke-width="9" opacity=".72"><path d="M0 540q180-280 360 0t360 0 360 0M0 620q180 280 360 0t360 0 360 0M540 120c-150 120-150 250 0 360 150-110 150-240 0-360zm0 840c-150-120-150-250 0-360 150 110 150 240 0 360z"/><circle cx="540" cy="540" r="220"/><circle cx="540" cy="540" r="150"/></g><g fill="${accent}" opacity=".78"><circle cx="540" cy="540" r="34"/><circle cx="100" cy="130" r="12"/><circle cx="980" cy="130" r="12"/><circle cx="100" cy="950" r="12"/><circle cx="980" cy="950" r="12"/></g>`,
    dome: `<g fill="none" stroke="${accent}" stroke-width="13" opacity=".86"><path d="M180 1030V600q0-270 360-410 360 140 360 410v430M265 1030V600q0-205 275-315 275 110 275 315v430"/><path d="M540 190V95m-35 35h70M440 1030V660q0-105 100-155 100 50 100 155v370"/></g><g fill="${accent}" opacity=".4"><path d="M180 600q0-270 360-410 360 140 360 410-360-85-720 0z"/></g>`,
  };
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${dark}"/><stop offset=".55" stop-color="${middle}"/><stop offset="1" stop-color="${dark}"/></linearGradient><pattern id="tile" width="180" height="180" patternUnits="userSpaceOnUse"><path d="m90 5 25 60 60 25-60 25-25 60-25-60-60-25 60-25zM90 42l13 35 35 13-35 13-13 35-13-35-35-13 35-13z" fill="none" stroke="${accent}" stroke-width="3" opacity=".52"/><circle cx="90" cy="90" r="5" fill="${accent}"/></pattern><radialGradient id="glow"><stop stop-color="${accent}" stop-opacity=".28"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient></defs><rect width="1080" height="1080" fill="url(#bg)"/><rect width="1080" height="1080" fill="url(#tile)" opacity=".55"/><ellipse cx="540" cy="430" rx="500" ry="440" fill="url(#glow)"/>${motifs[design.motif] ?? motifs.geometric}<path d="M35 35h145M35 35v145m865-145h145v145M35 900v145h145m720 0h145V900" fill="none" stroke="${accent}" stroke-width="7" opacity=".72"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function getCssBackgroundGradient(colors, angle) {
  const stops = colors.map((color, index) => `${color} ${(index / (colors.length - 1)) * 100}%`).join(", ");
  return `linear-gradient(${90 + angle}deg, ${stops})`;
}

const islamicShapes = [
  { id: "arch", label: "Islamic Arch · محراب", svg: '<path d="M14 94V45a36 36 0 0 1 72 0v49M8 94h84M24 94V47a26 26 0 0 1 52 0v47" fill="none" stroke="currentColor" stroke-width="3"/>' },
  { id: "dome", label: "Mosque Dome · گنبد", svg: '<path d="M12 88V55a38 38 0 0 1 76 0v33H12Z"/><path d="M50 17V8m-5 9h10" fill="none" stroke="currentColor" stroke-width="3"/>' },
  { id: "crescent", label: "Crescent Moon · ہلال", svg: '<path d="M62 9a42 42 0 1 0 28 74A35 35 0 0 1 62 9Z"/>' },
  { id: "star", label: "Star · ستارہ", svg: '<polygon points="50,5 61,38 96,38 68,58 79,92 50,71 21,92 32,58 4,38 39,38"/>' },
  { id: "star-eight", label: "8 Point Islamic Star", svg: '<polygon points="50,4 59,36 82,17 64,41 96,50 64,59 82,83 59,64 50,96 41,64 18,83 36,59 4,50 36,41 18,17 41,36"/>' },
  { id: "star-six", label: "6 Point Star", svg: '<polygon points="50,4 60,34 86,18 68,43 96,50 68,57 86,82 60,66 50,96 40,66 14,82 32,57 4,50 32,43 14,18 40,34"/>' },
  { id: "geometric", label: "Geometric Islamic Pattern", svg: '<path d="M50 5 61 28 84 16 72 39 95 50 72 61 84 84 61 72 50 95 39 72 16 84 28 61 5 50 28 39 16 16 39 28Z" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="50" cy="50" r="19" fill="none" stroke="currentColor" stroke-width="3"/><path d="M50 5v26m0 38v26M5 50h26m38 0h26M18 18l19 19m26 26 19 19m0-64L63 37M37 63 18 82" fill="none" stroke="currentColor" stroke-width="2"/>' },
  { id: "ornament", label: "Islamic Ornament", svg: '<path d="M50 8c12 14 12 22 0 30-12-8-12-16 0-30Zm0 76c-12-14-12-22 0-30 12 8 12 16 0 30ZM8 50c14-12 22-12 30 0-8 12-16 12-30 0Zm76 0c-14 12-22 12-30 0 8-12 16-12 30 0Z"/><circle cx="50" cy="50" r="10"/><circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" stroke-width="2"/>' },
  { id: "corner", label: "Decorative Corner", svg: '<path d="M10 90V10h80M20 90V20h70M10 54c24 0 44-20 44-44M20 64c19 0 34-15 34-34M33 10c0 10 7 17 17 17M10 33c10 0 17 7 17 17" fill="none" stroke="currentColor" stroke-width="3"/><path d="m54 10 8 8-8 8-8-8Zm-44 44 8-8 8 8-8 8Z"/>' },
  { id: "divider", label: "Islamic Divider / Separator", svg: '<path d="M5 50h31m28 0h31" fill="none" stroke="currentColor" stroke-width="3"/><path d="m50 30 20 20-20 20-20-20Z"/><path d="m18 42 8 8-8 8-8-8Zm64 0 8 8-8 8-8-8Z"/>' },
  { id: "minaret", label: "Mosque Minaret", svg: '<path d="M34 91V38h32v53M27 91h46M38 38a12 12 0 0 1 24 0M42 26a8 8 0 0 1 16 0M50 26V12m-4 0h8M40 51h20M40 63h20M40 75h20" fill="none" stroke="currentColor" stroke-width="4"/><path d="M50 4 56 12H44Z"/>' },
  { id: "mosque", label: "Mosque Silhouette", svg: '<path d="M8 88V54l14-12 14 12v34H8Zm30 0V49l12-13 12 13v39H38Zm30 0V54l14-12 10 12v34H68ZM4 88h92v7H4ZM18 40V27a4 4 0 0 1 8 0v13m20-6V21a4 4 0 0 1 8 0v13m20 6V27a4 4 0 0 1 8 0v13"/><path d="M12 60h5v8h-5zm12 0h5v8h-5zm20 0h5v8h-5zm12 0h5v8h-5zm20 0h5v8h-5zm10 0h5v8h-5z" fill="#fff"/>' },
  { id: "frame", label: "Arabic-style Decorative Frame", svg: '<path d="M12 92V37Q12 10 50 10t38 27v55H72V38q0-17-22-17T28 38v54Z" fill="none" stroke="currentColor" stroke-width="3"/><path d="M12 92h76M20 82h60" fill="none" stroke="currentColor" stroke-width="2"/><path d="m50 3 5 7-5 7-5-7Zm-38 82 5 7-5 7-5-7Zm76 0 5 7-5 7-5-7Z"/>' },
  { id: "circle-ornament", label: "Circle Ornament", svg: '<circle cx="50" cy="50" r="31" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="50" cy="50" r="21" fill="none" stroke="currentColor" stroke-width="2"/><path d="M50 4 57 19 50 25 43 19Zm0 92 7-15-7-6-7 6ZM4 50l15-7 6 7-6 7Zm92 0-15-7-6 7 6 7ZM17 17l16 7-1 9-9 1Zm66 66-16-7 1-9 9-1Zm0-66-16 7 1 9 9 1Zm-66 66 16-7-1-9-9-1Z"/>' },
  { id: "rounded-frame", label: "Rounded Islamic Frame", svg: '<path d="M20 92V47Q20 20 50 20t30 27v45H68V47q0-15-18-15T32 47v45Zm-8-10h12m52 0h12M12 92h76" fill="none" stroke="currentColor" stroke-width="3"/><path d="m50 7 6 8-6 8-6-8Z"/>' },
  { id: "floral", label: "Floral Islamic Ornament", svg: '<path d="M50 50C28 42 29 20 50 8c21 12 22 34 0 42Zm0 0c8-22 30-21 42 0-12 21-34 22-42 0Zm0 0c22 8 21 30 0 42-21-12-22-34 0-42Zm0 0c-8 22-30 21-42 0 12-21 34-22 42 0Z"/><circle cx="50" cy="50" r="9"/><path d="M50 8V3m42 47h5M50 92v5M8 50H3" fill="none" stroke="currentColor" stroke-width="3"/>' },
];

const posterTemplates = [
  { id: "bismillah", name: "Bismillah", category: "Faith", text: "بسم اللہ الرحمن الرحیم", subtitle: "Begin with the name of Allah", background: "#17352c", accent: "#d5ad62", textColor: "#fffdf4", fontSize: 46 },
  { id: "jumma", name: "Jumma Mubarak", category: "Weekly", text: "جمعہ مبارک", subtitle: "A blessed Friday", background: "#17352c", accent: "#d5ad62", textColor: "#ffffff", fontSize: 58 },
  { id: "tawakkul", name: "Trust in Allah", category: "Faith", text: "اللہ پر بھروسہ رکھیں", subtitle: "Place your trust in Allah", background: "#17352c", accent: "#d5ad62", textColor: "#ffffff", fontSize: 42 },
  { id: "ramadan", name: "Ramadan Kareem", category: "Occasions", text: "رمضان كريم", subtitle: "A month of mercy and reflection", background: "#143d38", accent: "#e0c37d", textColor: "#fff7e6", fontSize: 58 },
  { id: "eid", name: "Eid Mubarak", category: "Occasions", text: "عيد مبارك", subtitle: "Peace, joy and togetherness", background: "#713d3a", accent: "#f0cf91", textColor: "#fff7e9", fontSize: 58 },
  { id: "dhikr", name: "Daily Dhikr", category: "Faith", text: "سُبْحَانَ الله", subtitle: "SubhanAllah", background: "#1e3852", accent: "#d7b975", textColor: "#fffaf0", fontSize: 56 },
  { id: "dua", name: "A Daily Dua", category: "Dua", text: "رَبِّ زِدْنِي عِلْمًا", subtitle: "My Lord, increase me in knowledge", background: "#d8e8dc", accent: "#638b70", textColor: "#244435", fontSize: 42 },
  { id: "salawat", name: "Send Blessings", category: "Faith", text: "اللهم صل على محمد", subtitle: "Peace and blessings upon the Prophet", background: "#343048", accent: "#dfbd83", textColor: "#fff9ed", fontSize: 42 },
  { id: "alhamdulillah", name: "Alhamdulillah", category: "Faith", text: "الحمد لله", subtitle: "All praise belongs to Allah", background: "#e7d7b6", accent: "#617455", textColor: "#354733", fontSize: 64 },
  { id: "peace", name: "A Moment of Peace", category: "Greetings", text: "السلام عليكم", subtitle: "May peace be with you", background: "#31504b", accent: "#dfb886", textColor: "#fff8ed", fontSize: 52 },
];

const resizeCorners = [
  { id: "top-left", label: "top left", opposite: "bottom-right" },
  { id: "top-right", label: "top right", opposite: "bottom-left" },
  { id: "bottom-left", label: "bottom left", opposite: "top-right" },
  { id: "bottom-right", label: "bottom right", opposite: "top-left" },
];

function getShapeSvgMarkup(shape, color) {
  const definition = islamicShapes.find((item) => item.id === shape);
  if (!definition) return null;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none" color="${color}" fill="currentColor">${definition.svg}</svg>`;
}

function colorWithOpacity(color, opacity) {
  const hex = color.replace("#", "");
  const normalized = hex.length === 3 ? [...hex].map((part) => `${part}${part}`).join("") : hex;
  const value = Number.parseInt(normalized, 16);
  if (Number.isNaN(value)) return color;
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${opacity / 100})`;
}

function getTextTypographyStyle(object) {
  return {
    fontSize: `${object.fontSize}px`,
    fontWeight: object.bold ? 700 : 400,
    fontStyle: object.italic ? "italic" : "normal",
    textAlign: object.align,
    fontFamily: object.fontFamily ?? "Arial, sans-serif",
    lineHeight: object.lineHeight ?? 1.25,
    letterSpacing: `${object.letterSpacing ?? 0}px`,
    whiteSpace: "pre-wrap",
  };
}

function getTextPreviewStyle(object) {
  const style = {
    ...getTextTypographyStyle(object),
    color: object.color ?? textEffectDefaults.color,
    opacity: (object.opacity ?? 100) / 100,
  };
  if (object.fillMode === "image" && object.imageFillSrc) {
    const scale = object.imageFillScale ?? 100;
    style.backgroundImage = `url("${object.imageFillSrc}")`;
    style.backgroundSize = `${scale}% ${scale}%`;
    style.backgroundPosition = `${50 + (object.imageFillX ?? 0)}% ${50 + (object.imageFillY ?? 0)}%`;
    style.backgroundRepeat = "no-repeat";
    style.backgroundClip = "text";
    style.WebkitBackgroundClip = "text";
    style.WebkitTextFillColor = "transparent";
  } else if (object.fillMode === "gradient") {
    const colors = [object.gradientColor1 ?? "#e7c36f"];
    if (object.gradientColor3Enabled) colors.push(object.gradientColor3 ?? "#ffffff");
    colors.push(object.gradientColor2 ?? "#a97826");
    const stops = colors.map((color, index) => `${color} ${(index / (colors.length - 1)) * 100}%`).join(", ");
    style.backgroundImage = `linear-gradient(${90 + (object.gradientAngle ?? 0)}deg, ${stops})`;
    style.backgroundClip = "text";
    style.WebkitBackgroundClip = "text";
    style.WebkitTextFillColor = "transparent";
  }
  if (object.strokeEnabled) {
    style.WebkitTextStroke = `${object.strokeWidth ?? 0}px ${object.strokeColor ?? "#442d0b"}`;
    style.paintOrder = "stroke fill";
  }
  const shadows = [];
  if (object.shadowEnabled) {
    shadows.push(`${object.shadowOffsetX ?? 0}px ${object.shadowOffsetY ?? 0}px ${object.shadowBlur ?? 0}px ${colorWithOpacity(object.shadowColor ?? "#000000", object.shadowOpacity ?? 65)}`);
  }
  if (object.glowEnabled) {
    shadows.push(`0 0 ${object.glowBlur ?? 0}px ${colorWithOpacity(object.glowColor ?? "#f5ca65", object.glowOpacity ?? 75)}`);
  }
  if (shadows.length) style.textShadow = shadows.join(", ");
  return style;
}

function getTextStrokeStyle(object) {
  return {
    ...getTextTypographyStyle(object),
    color: "transparent",
    WebkitTextFillColor: "transparent",
    WebkitTextStroke: object.strokeEnabled ? `${object.strokeWidth ?? 0}px ${object.strokeColor ?? "#442d0b"}` : "0 transparent",
    paintOrder: "normal",
    opacity: 1,
    textShadow: "none",
    backgroundImage: "none",
    pointerEvents: "none",
  };
}

function getTextDesignPreviewStyle(design) {
  const style = design.style;
  return getTextPreviewStyle({
    ...style,
    fontSize: 23,
    strokeWidth: (style.strokeWidth ?? 0) * 0.7,
    shadowBlur: (style.shadowBlur ?? 0) * 0.45,
    shadowOffsetX: (style.shadowOffsetX ?? 0) * 0.45,
    shadowOffsetY: (style.shadowOffsetY ?? 0) * 0.45,
    glowBlur: (style.glowBlur ?? 0) * 0.45,
    letterSpacing: 0,
    lineHeight: 1.1,
  });
}

function wrapCanvasText(context, text, maxWidth) {
  return text.split(/\r?\n/).flatMap((paragraph) => {
    const words = paragraph.split(/(\s+)/).filter(Boolean);
    if (!words.length) return [""];
    const lines = [];
    let line = "";
    words.forEach((word) => {
      const candidate = line + word;
      if (line.trim() && context.measureText(candidate).width > maxWidth) {
        lines.push(line.trimEnd());
        line = word.trimStart();
      } else {
        line = candidate;
      }
    });
    lines.push(line.trimEnd());
    return lines;
  });
}

function createTextImageMask(object, image, lines, maxWidth, lineOffset, scaleX) {
  if (!image || !lines.length) return null;
  const fontSize = object.fontSize * scaleX;
  const width = Math.max(1, Math.ceil(maxWidth));
  const height = Math.max(1, Math.ceil(fontSize * 2 + (lines.length - 1) * lineOffset));
  const mask = document.createElement("canvas");
  mask.width = width;
  mask.height = height;
  const maskContext = mask.getContext("2d");
  maskContext.font = `${object.italic ? "italic " : ""}${object.bold ? "bold " : ""}${fontSize}px ${object.fontFamily ?? "Arial, sans-serif"}`;
  maskContext.textAlign = object.align ?? "center";
  maskContext.textBaseline = "middle";
  maskContext.direction = object.direction === "auto"
    ? (/\u0600-\u06ff/.test(object.text) ? "rtl" : "ltr")
    : object.direction ?? "ltr";
  if ("letterSpacing" in maskContext) maskContext.letterSpacing = `${(object.letterSpacing ?? 0) * scaleX}px`;
  maskContext.fillStyle = "#ffffff";
  const textX = object.align === "left" ? 0 : object.align === "right" ? width : width / 2;
  lines.forEach((line, index) => maskContext.fillText(line, textX, fontSize + index * lineOffset));

  const scale = (object.imageFillScale ?? 100) / 100;
  const imageWidth = width * scale;
  const imageHeight = height * scale;
  const imageX = (width - imageWidth) * (0.5 + (object.imageFillX ?? 0) / 100);
  const imageY = (height - imageHeight) * (0.5 + (object.imageFillY ?? 0) / 100);
  maskContext.globalCompositeOperation = "source-in";
  maskContext.drawImage(image, imageX, imageY, imageWidth, imageHeight);
  return mask;
}

function drawTextObject(context, object, x, y, scaleX, scaleY, maxWidth, imageFillImage = null) {
  context.save();
  context.translate(x, y);
  context.rotate(((object.rotation ?? 0) * Math.PI) / 180);
  context.scale(object.flipHorizontal ? -1 : 1, object.flipVertical ? -1 : 1);
  context.globalAlpha = (object.opacity ?? 100) / 100;
  context.font = `${object.italic ? "italic " : ""}${object.bold ? "bold " : ""}${object.fontSize * scaleX}px ${object.fontFamily ?? "Arial, sans-serif"}`;
  context.textAlign = object.align ?? "center";
  context.textBaseline = "middle";
  context.direction = object.direction === "auto"
    ? (/\u0600-\u06ff/.test(object.text) ? "rtl" : "ltr")
    : object.direction ?? "ltr";
  if ("letterSpacing" in context) context.letterSpacing = `${(object.letterSpacing ?? 0) * scaleX}px`;
  const lines = wrapCanvasText(context, object.text, maxWidth);
  const lineOffset = (object.lineHeight ?? 1.25) * object.fontSize * scaleX;
  const anchorX = object.align === "left" ? -maxWidth / 2 : object.align === "right" ? maxWidth / 2 : 0;
  const gradientColors = [object.gradientColor1 ?? "#e7c36f"];
  if (object.gradientColor3Enabled) gradientColors.push(object.gradientColor3 ?? "#ffffff");
  gradientColors.push(object.gradientColor2 ?? "#a97826");

  lines.forEach((line, index) => {
    const lineY = (index - (lines.length - 1) / 2) * lineOffset;
    const lineWidth = Math.max(1, context.measureText(line).width);
    const lineX = object.align === "left" ? anchorX : object.align === "right" ? anchorX - lineWidth : anchorX - lineWidth / 2;
    const renderEffectPass = (color, blur, offsetX = 0, offsetY = 0) => {
      context.save();
      context.fillStyle = color;
      context.shadowColor = color;
      context.shadowBlur = blur * scaleX;
      context.shadowOffsetX = offsetX * scaleX;
      context.shadowOffsetY = offsetY * scaleY;
      context.fillText(line, anchorX, lineY);
      context.restore();
    };

    if (object.shadowEnabled) {
      renderEffectPass(
        colorWithOpacity(object.shadowColor ?? "#000000", object.shadowOpacity ?? 65),
        object.shadowBlur ?? 0,
        object.shadowOffsetX ?? 0,
        object.shadowOffsetY ?? 0,
      );
    }
    if (object.glowEnabled) {
      renderEffectPass(
        colorWithOpacity(object.glowColor ?? "#f5ca65", object.glowOpacity ?? 75),
        object.glowBlur ?? 0,
      );
    }

    if (object.strokeEnabled && (object.strokeWidth ?? 0) > 0) {
      context.strokeStyle = object.strokeColor ?? "#442d0b";
      context.lineWidth = object.strokeWidth * scaleX;
      context.lineJoin = "round";
      context.strokeText(line, anchorX, lineY);
    }

    if (object.fillMode === "gradient") {
      const angle = ((object.gradientAngle ?? 0) * Math.PI) / 180;
      const radius = Math.hypot(lineWidth, lineOffset) / 2;
      const centerX = lineX + lineWidth / 2;
      const centerY = lineY;
      const gradient = context.createLinearGradient(
        centerX - Math.cos(angle) * radius,
        centerY - Math.sin(angle) * radius,
        centerX + Math.cos(angle) * radius,
        centerY + Math.sin(angle) * radius,
      );
      gradientColors.forEach((color, colorIndex) => gradient.addColorStop(colorIndex / (gradientColors.length - 1), color));
      context.fillStyle = gradient;
    } else if (object.fillMode !== "image" || !imageFillImage) {
      context.fillStyle = object.color ?? textEffectDefaults.color;
    }
    if (object.fillMode !== "image" || !imageFillImage) {
      context.fillText(line, anchorX, lineY);
    }
  });

  if (object.fillMode === "image" && imageFillImage) {
    const imageMask = createTextImageMask(object, imageFillImage, lines, maxWidth, lineOffset, scaleX);
    if (imageMask) context.drawImage(imageMask, -maxWidth / 2, -imageMask.height / 2);
  }

  context.restore();
}

function ShapeArtwork({ shape, color, className }) {
  const definition = islamicShapes.find(
    (item) => item.id === shape
  );

  if (!definition) {
    return null;
  }

  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{
        color,
        fill: "currentColor",
      }}
      dangerouslySetInnerHTML={{
        __html: definition.svg,
      }}
    />
  );
}

function App() {
  const [editor, setEditor] = useState(false);
  const [canvasSize, setCanvasSize] = useState("Square 1080x1080");
  const [customWidth, setCustomWidth] = useState(1080);
  const [customHeight, setCustomHeight] = useState(1080);
  const [background, setBackground] = useState("#17352c");
  const [backgroundMode, setBackgroundMode] = useState("solid");
  const [shapePickerOpen, setShapePickerOpen] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [backgroundGradientColors, setBackgroundGradientColors] = useState(["#10261f", "#31704b", "#ddbf72"]);
  const [backgroundGradientThirdEnabled, setBackgroundGradientThirdEnabled] = useState(false);
  const [backgroundGradientAngle, setBackgroundGradientAngle] = useState(35);
  const [selectedIslamicBackgroundId, setSelectedIslamicBackgroundId] = useState(null);
  const [backgroundOverlayEnabled, setBackgroundOverlayEnabled] = useState(false);
  const [backgroundOverlayOpacity, setBackgroundOverlayOpacity] = useState(25);
  const [objects, setObjects] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [activeTool, setActiveTool] = useState("select");
  const [pathDraft, setPathDraft] = useState(null);
  const [closedDrawing, setClosedDrawing] = useState(true);
  const [vectorFill, setVectorFill] = useState("#d5ad62");
  const [vectorStroke, setVectorStroke] = useState("#17352c");
  const [vectorStrokeWidth, setVectorStrokeWidth] = useState(2);
  const [vectorOpacity, setVectorOpacity] = useState(100);
  const [fillEnabled, setFillEnabled] = useState(true);
  const [strokeEnabled, setStrokeEnabled] = useState(true);
  const [selectionMarquee, setSelectionMarquee] = useState(null);
  const [canvasViewOffset, setCanvasViewOffset] = useState({ x: 0, y: 0 });
  const [groupEditMode, setGroupEditMode] = useState(false);
  const [groupEditGroupId, setGroupEditGroupId] = useState(null);
  const [selectedNodeIndex, setSelectedNodeIndex] = useState(null);
  const [vectorMessage, setVectorMessage] = useState("");
  const [keepTrimCutter, setKeepTrimCutter] = useState(false);
  const [trimTopIsCutter, setTrimTopIsCutter] = useState(true);
  const [expandedGroupIds, setExpandedGroupIds] = useState([]);
 const [pages, setPages] = useState([
  {
    id: 1,
    name: "Page 1",
    objects: []
  }
]);

const [currentPageId, setCurrentPageId] = useState(1);
useEffect(() => {

  const currentPage = pages.find(
    (page) => page.id === currentPageId
  );

  if (currentPage) {
    setObjects(currentPage.objects || []);
  }

}, [currentPageId]);

useEffect(() => {

  setPages((current) =>
    current.map((page) =>
      page.id === currentPageId
        ? {
            ...page,
            objects
          }
        : page
    )
  );

}, [objects]);

useEffect(() => {
  let active = true;
  readTemplates()
    .then((templates) => {
      if (!active) return;
      setSavedTemplates(templates);
      setTemplateStorageError("");
    })
    .catch((loadError) => {
      if (!active) return;
      setTemplateStorageError(loadError.message || "Saved templates could not be loaded.");
    })
    .finally(() => {
      if (active) setTemplateStorageLoading(false);
    });
  return () => { active = false; };
}, []);

  const [selectedId, setSelectedId] = useState(null);
  const [editingImageId, setEditingImageId] = useState(null);
  const [templateName, setTemplateName] = useState("Create New Poster");
  const [history, setHistory] = useState([]);
const [redoStack, setRedoStack] = useState([]);
const [snapGridEnabled, setSnapGridEnabled] = useState(true);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportInitialFormat, setExportInitialFormat] = useState("png");
  const [localAdminMode, setLocalAdminMode] = useState(false);
  const [templateManagerOpen, setTemplateManagerOpen] = useState(false);
  const [templateSaveOpen, setTemplateSaveOpen] = useState(false);
  const [templatePreview, setTemplatePreview] = useState("");
  const [savedTemplates, setSavedTemplates] = useState([]);
  const [templateStorageError, setTemplateStorageError] = useState("");
  const [templateStorageLoading, setTemplateStorageLoading] = useState(true);
  const [savedProjects, setSavedProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [activeProjectName, setActiveProjectName] = useState("");
  const [projectStorageError, setProjectStorageError] = useState("");
  const uploadRef = useRef(null);
  const backgroundUploadRef = useRef(null);
  const textFillUploadRef = useRef(null);
  const projectUploadRef = useRef(null);
  const canvasRef = useRef(null);
  const dragRef = useRef(null);
  const shapeIdRef = useRef(0);
  const pathDraftRef = useRef(null);
  function changePathDraft(nextOrUpdate) {
    const next = typeof nextOrUpdate === "function" ? nextOrUpdate(pathDraftRef.current) : nextOrUpdate;
    pathDraftRef.current = next;
    setPathDraft(next);
  }
  function nextObjectId(prefix = "object") {
    shapeIdRef.current += 1;
    return `${prefix}-${shapeIdRef.current}`;
  }
  const findObject = (items, id) => {
    for (const item of items) {
      if (item.id === id) return item;
      if (item.type === "group") {
        const nested = findObject(item.children ?? [], id);
        if (nested) return nested;
      }
    }
    return null;
  };
  const selectedObject = findObject(objects, selectedId);
  const canEditTemplates = canManageTemplates(localAdminMode);
  const selectedShapeIsVector = selectedObject?.type === "shape" && (selectedObject.shape === "custom" || islamicShapes.some((shape) => shape.id === selectedObject.shape));
  const selectedLayerIndex = objects.findIndex((object) => object.id === selectedId);
  const dimensions = canvasSize === "Custom"
    ? { width: customWidth, height: customHeight }
    : canvasSizes[canvasSize];
  const selectedIslamicBackground = islamicBackgrounds.find((design) => design.id === selectedIslamicBackgroundId);
  const activeBackgroundImage = backgroundMode === "upload"
    ? backgroundImage
    : backgroundMode === "islamic" && selectedIslamicBackground
      ? getIslamicBackgroundSvg(selectedIslamicBackground)
      : null;
  const activeGradientColors = backgroundGradientThirdEnabled
    ? backgroundGradientColors
    : backgroundGradientColors.slice(0, 2);
  const backgroundGradientCss = getCssBackgroundGradient(activeGradientColors, backgroundGradientAngle);

  function selectObject(id, additive = false) {
    if (id == null) {
      setSelectedId(null);
      setSelectedIds([]);
      return;
    }
    setSelectedId(id);
    const parentGroup = findParentGroup(objects, id);
    if (parentGroup) setExpandedGroupIds((current) => current.includes(parentGroup.id) ? current : [...current, parentGroup.id]);
    setSelectedIds((current) => additive
      ? current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
      : [id]);
  }

  function findLayerObject(items, value) {
    for (const item of items) {
      if (String(item.id) === value) return item;
      if (item.type === "group") {
        const nested = findLayerObject(item.children ?? [], value);
        if (nested) return nested;
      }
    }
    return null;
  }

  function selectLayersFromEvent(event) {
    const ids = [...event.target.selectedOptions]
      .map((option) => findLayerObject(objects, option.value)?.id)
      .filter((id) => id != null);
    const child = ids.map((id) => findParentGroup(objects, id)).find(Boolean);
    setSelectedIds(ids);
    setSelectedId(ids.at(-1) ?? null);
    setGroupEditMode(Boolean(child));
    setGroupEditGroupId(child?.id ?? null);
  }

  function findParentGroup(items, id) {
    for (const item of items) {
      if (item.type !== "group") continue;
      if ((item.children ?? []).some((child) => child.id === id)) return item;
      const nested = findParentGroup(item.children ?? [], id);
      if (nested) return nested;
    }
    return null;
  }

  function positionAfterCanvasDelta(object, deltaX, deltaY, parentGroup = null) {
    if (!parentGroup) return { x: object.x + deltaX, y: object.y + deltaY };
    const rendered = transformGroupChild(object, parentGroup);
    const scale = groupScale(parentGroup);
    let dx = (rendered.x + deltaX - parentGroup.x) * dimensions.width;
    let dy = (rendered.y + deltaY - parentGroup.y) * dimensions.height;
    const radians = -(parentGroup.rotation ?? 0) * Math.PI / 180;
    const rotatedX = dx * Math.cos(radians) - dy * Math.sin(radians);
    const rotatedY = dx * Math.sin(radians) + dy * Math.cos(radians);
    dx = rotatedX * (parentGroup.flipHorizontal ? -1 : 1) / Math.max(scale.x, 0.001);
    dy = rotatedY * (parentGroup.flipVertical ? -1 : 1) / Math.max(scale.y, 0.001);
    const base = parentGroup.baseBounds ?? { x: parentGroup.x, y: parentGroup.y };
    return {
      x: (base.x * dimensions.width + dx) / dimensions.width,
      y: (base.y * dimensions.height + dy) / dimensions.height,
    };
  }

  function alignSelectedObject(alignment) {
    if (!selectedObject || selectedObject.locked || selectedIds.length !== 1 || !canvasRef.current) return;
    const canvasBounds = canvasRef.current.getBoundingClientRect();
    const element = canvasRef.current.querySelector(
      `.canvas-control-object[data-object-id="${CSS.escape(String(selectedObject.id))}"]`,
    );
    if (!element || canvasBounds.width <= 0 || canvasBounds.height <= 0) return;
    const objectBounds = element.getBoundingClientRect();
    const width = Math.min(objectBounds.width, canvasBounds.width);
    const height = Math.min(objectBounds.height, canvasBounds.height);
    const currentCenterX = objectBounds.left + objectBounds.width / 2;
    const currentCenterY = objectBounds.top + objectBounds.height / 2;
    const targetCenterX = alignment === "center" || alignment === "left" || alignment === "right"
      ? alignment === "center" || objectBounds.width >= canvasBounds.width
        ? canvasBounds.left + canvasBounds.width / 2
        : alignment === "left"
          ? canvasBounds.left + width / 2
          : canvasBounds.right - width / 2
      : Math.min(canvasBounds.right - width / 2, Math.max(canvasBounds.left + width / 2, currentCenterX));
    const targetCenterY = alignment === "center" || alignment === "top" || alignment === "bottom"
      ? alignment === "center" || objectBounds.height >= canvasBounds.height
        ? canvasBounds.top + canvasBounds.height / 2
        : alignment === "top"
          ? canvasBounds.top + height / 2
          : canvasBounds.bottom - height / 2
      : Math.min(canvasBounds.bottom - height / 2, Math.max(canvasBounds.top + height / 2, currentCenterY));
    const deltaX = (targetCenterX - currentCenterX) / canvasBounds.width * 100;
    const deltaY = (targetCenterY - currentCenterY) / canvasBounds.height * 100;
    const parentGroup = findParentGroup(objects, selectedObject.id);
    saveHistory();
    setObjects((current) => {
      const object = findObject(current, selectedObject.id);
      if (!object) return current;
      return updateObjectById(current, object.id, positionAfterCanvasDelta(object, deltaX, deltaY, parentGroup));
    });
    setCanvasViewOffset({ x: 0, y: 0 });
  }

  function locateSelectedObject() {
    if (!selectedObject || !canvasRef.current) return;
    canvasRef.current.scrollIntoView({ block: "center", inline: "center" });
    const canvasBounds = canvasRef.current.getBoundingClientRect();
    const element = canvasRef.current.querySelector(
      `.canvas-control-object[data-object-id="${CSS.escape(String(selectedObject.id))}"]`,
    );
    if (!element) return;
    const objectBounds = element.getBoundingClientRect();
    setCanvasViewOffset((current) => ({
      x: current.x + canvasBounds.left + canvasBounds.width / 2 - (objectBounds.left + objectBounds.width / 2),
      y: current.y + canvasBounds.top + canvasBounds.height / 2 - (objectBounds.top + objectBounds.height / 2),
    }));
  }

  function resetCanvasView() {
    setCanvasViewOffset({ x: 0, y: 0 });
  }

  function updateObjectById(items, id, updates) {
    return items.map((item) => {
      if (item.id === id) return { ...item, ...updates };
      if (item.type === "group") return { ...item, children: updateObjectById(item.children ?? [], id, updates) };
      return item;
    });
  }

  function removeObjectsById(items, ids) {
    return items.flatMap((item) => {
      if (ids.has(item.id)) return [];
      if (item.type === "group") return [{ ...item, children: removeObjectsById(item.children ?? [], ids) }];
      return [item];
    });
  }

  function groupScale(group) {
    return {
      x: group.width / Math.max(group.baseBounds?.width ?? group.width, 0.001),
      y: group.height / Math.max(group.baseBounds?.height ?? group.height, 0.001),
    };
  }

  function transformGroupChild(child, group) {
    const scale = groupScale(group);
    const base = group.baseBounds ?? { x: group.x, y: group.y, width: group.width, height: group.height };
    const canvasWidth = dimensions.width;
    const canvasHeight = dimensions.height;
    let dx = ((child.x - base.x) * canvasWidth) * scale.x;
    let dy = ((child.y - base.y) * canvasHeight) * scale.y;
    if (group.flipHorizontal) dx *= -1;
    if (group.flipVertical) dy *= -1;
    const radians = (group.rotation ?? 0) * Math.PI / 180;
    const centerX = group.x + (dx * Math.cos(radians) - dy * Math.sin(radians)) / canvasWidth;
    const centerY = group.y + (dx * Math.sin(radians) + dy * Math.cos(radians)) / canvasHeight;
    const scaleFactor = Math.sqrt(Math.abs(scale.x * scale.y));
    const next = {
      ...child,
      x: centerX,
      y: centerY,
      rotation: (child.rotation ?? 0) + (group.rotation ?? 0),
      flipHorizontal: Boolean(child.flipHorizontal) !== Boolean(group.flipHorizontal),
      flipVertical: Boolean(child.flipVertical) !== Boolean(group.flipVertical),
      opacity: (child.opacity ?? 100) * (group.opacity ?? 100) / 100,
      transparencyMasks: [
        ...(child.transparencyMasks ?? []),
        ...(group.transparencyMask ? [group.transparencyMask] : []),
      ],
      groupId: group.id,
    };
    if (child.type === "image") next.width = (child.width ?? 36) * scaleFactor;
    else if (child.type === "text") next.fontSize = (child.fontSize ?? 36) * scaleFactor;
    else if (child.type === "shape") {
      if (islamicShapes.some((shape) => shape.id === child.shape) || child.shape === "custom") {
        next.width = (child.width ?? 38) * scale.x;
        next.height = (child.height ?? 38) * scale.y;
      } else {
        next.width = (child.width ?? 140) * scale.x;
        next.height = (child.height ?? 16) * scale.y;
      }
    }
    return next;
  }

  function flattenGroups(items) {
    return items.flatMap((item) => {
      if (item.type !== "group") return [item];
      return flattenGroups((item.children ?? []).map((child) => transformGroupChild(child, item)));
    });
  }

  function saveHistory() {
  setHistory((prev) => [
    ...prev,
    JSON.stringify(objects)
  ]);

  setRedoStack([]);
}
function undo() {
  if (pathDraft?.length) {
    changePathDraft((current) => current.length > 1 ? current.slice(0, -1) : null);
    return;
  }
  if (!history.length) return;

  const last =
    history[history.length - 1];

  setRedoStack((prev) => [
    ...prev,
    JSON.stringify(objects)
  ]);

  const restored = JSON.parse(last);
  setObjects(restored);
  const stillSelected = selectedIds.filter((id) => findObject(restored, id));
  setSelectedIds(stillSelected);
  setSelectedId(stillSelected.at(-1) ?? null);

  setHistory((prev) =>
    prev.slice(0, -1)
  );
}
function redo() {
  if (!redoStack.length) return;

  const last =
    redoStack[redoStack.length - 1];

  setHistory((prev) => [
    ...prev,
    JSON.stringify(objects)
  ]);

  const restored = JSON.parse(last);
  setObjects(restored);
  const stillSelected = selectedIds.filter((id) => findObject(restored, id));
  setSelectedIds(stillSelected);
  setSelectedId(stillSelected.at(-1) ?? null);

  setRedoStack((prev) =>
    prev.slice(0, -1)
  );
}

function addPage() {

  const newPage = {
    id: Date.now(),
    name: `Page ${pages.length + 1}`,
    objects: []
  };

  setPages((current) => [
    ...current,
    newPage
  ]);

  setCurrentPageId(newPage.id);
}

function renamePage(pageId) {

  const name = prompt("Page Name");

  if (!name) return;

  setPages((current) =>
    current.map((page) =>
      page.id === pageId
        ? {
            ...page,
            name
          }
        : page
    )
  );
}
function deletePage(pageId) {

  if (pages.length === 1) {
    alert("At least one page is required");
    return;
  }

  const remainingPages =
    pages.filter(
      (page) => page.id !== pageId
    );

  setPages(remainingPages);

  if (currentPageId === pageId) {
    setCurrentPageId(
      remainingPages[0].id
    );
  }
}

  function resetPoster() {
    setCanvasSize("Instagram Post 1080x1080");
    setCustomWidth(1080);
    setCustomHeight(1080);
    setBackground("#ffffff");
    setBackgroundMode("solid");
    setBackgroundImage(null);
    setSelectedIslamicBackgroundId(null);
    setBackgroundOverlayEnabled(false);
    setObjects([]);
    setSelectedId(null);
    setSelectedIds([]);
    changePathDraft(null);
    setActiveTool("select");
    setTemplateName("Create New Poster");
  }

  function resetBackground() {
    setBackground("#ffffff");
    setBackgroundMode("solid");
    setBackgroundImage(null);
    setSelectedIslamicBackgroundId(null);
    setBackgroundGradientColors(["#10261f", "#31704b", "#ddbf72"]);
    setBackgroundGradientThirdEnabled(false);
    setBackgroundGradientAngle(35);
    setBackgroundOverlayEnabled(false);
    setBackgroundOverlayOpacity(25);
  }

  function resetProjectState() {
    resetPoster();
    setCanvasViewOffset({ x: 0, y: 0 });
    setPages([{ id: 1, name: "Page 1", objects: [] }]);
    setCurrentPageId(1);
    setBackgroundGradientColors(["#10261f", "#31704b", "#ddbf72"]);
    setBackgroundGradientThirdEnabled(false);
    setBackgroundGradientAngle(35);
    setBackgroundOverlayOpacity(25);
    setSnapGridEnabled(true);
    setHistory([]);
    setRedoStack([]);
    setActiveProjectId(null);
    setActiveProjectName("");
  }

  function startBlankPoster() {
    resetProjectState();
    setEditor(true);
  }

  function createNewProject() {
    if (!window.confirm("Start a new poster? Unsaved changes in this canvas will be cleared.")) return;
    resetProjectState();
  }

  function openTemplate(template) {
    resetProjectState();
    const mainId = `${template.id}-main`;
    setCanvasSize("Square 1080x1080");
    setCustomWidth(1080);
    setCustomHeight(1080);
    setBackground(template.background);
    setBackgroundMode("solid");
    setBackgroundImage(null);
    setSelectedIslamicBackgroundId(null);
    setBackgroundOverlayEnabled(false);
    setObjects([
      { id: `${template.id}-frame`, type: "shape", shape: "circle-outline", x: 50, y: 48, width: 236, height: 236, color: template.accent },
      { id: `${template.id}-divider`, type: "shape", shape: "line", x: 50, y: 58, width: 128, height: 3, color: template.accent },
      { id: `${template.id}-subtitle`, type: "text", text: template.subtitle, x: 50, y: 67, fontSize: 18, ...textEffectDefaults, color: template.textColor, bold: false, align: "center", fontFamily: "Arial, sans-serif" },
      { id: mainId, type: "text", text: template.text, x: 50, y: 47, fontSize: template.fontSize, ...textEffectDefaults, color: template.textColor, bold: true, align: "center", fontFamily: "Arial, sans-serif" },
    ]);
    selectObject(mainId);
    setTemplateName(template.name);
    setEditor(true);
  }

 function updateSelected(updates) {
    setObjects((current) => updateObjectById(current, selectedId, updates));
  }

 function setSelectedTransparencyMask(mask) {
   if (!selectedObject) return;
   const next = { ...selectedObject };
   if (mask) next.transparencyMask = normalizeTransparencyMask(mask);
   else delete next.transparencyMask;
   saveHistory();
   setObjects((current) => updateObjectById(current, selectedId, next));
 }

 function updateSelectedTransparencyMask(updates) {
   if (!selectedObject) return;
   updateSelected({
     transparencyMask: normalizeTransparencyMask({
       ...selectedObject.transparencyMask,
       ...updates,
       stops: updates.stops ?? selectedObject.transparencyMask?.stops ?? defaultTransparencyStops,
     }),
   });
 }

 function changeTransparencyType(type) {
   if (!selectedObject) return;
   if (type === "none") {
     setSelectedTransparencyMask(null);
     return;
   }
   setSelectedTransparencyMask({
     ...selectedObject.transparencyMask,
     type,
     stops: selectedObject.transparencyMask?.stops ?? defaultTransparencyStops,
   });
 }

  function flipSelected(axis) {
    if (!selectedObject) return;
    saveHistory();
    updateSelected({
      [axis === "horizontal" ? "flipHorizontal" : "flipVertical"]: !selectedObject[
        axis === "horizontal" ? "flipHorizontal" : "flipVertical"
      ],
    });
  }

  function applyTextDesign(design) {
    updateSelected({
      ...textEffectDefaults,
      ...design.style,
      fillMode: selectedObject.fillMode === "image" ? "image" : design.style.fillMode,
      imageFillSrc: selectedObject.imageFillSrc ?? null,
      imageFillScale: selectedObject.imageFillScale ?? textEffectDefaults.imageFillScale,
      imageFillX: selectedObject.imageFillX ?? textEffectDefaults.imageFillX,
      imageFillY: selectedObject.imageFillY ?? textEffectDefaults.imageFillY,
      textDesignLabel: design.label,
    });
  }

  function resetTextDesign() {
    updateSelected({
      ...textEffectDefaults,
      fontFamily: fontOptions[0].value,
      fontSize: 36,
      bold: false,
      italic: false,
      align: "center",
      direction: "auto",
      lineHeight: 1.25,
      letterSpacing: 0,
      textDesignLabel: null,
    });
  }

  function addText() {
    saveHistory();
    const id = nextObjectId("text");
    setObjects((current) => [...current, {
      id,
      type: "text",
      locked: false,
      text: "اپنا متن یہاں لکھیں",
      x: 50,
      y: 50,
      fontSize: 36,
      ...textEffectDefaults,
      bold: false,
      italic: false,
      align: "center",
      direction: "auto",
      lineHeight: 1.25,
      letterSpacing: 0,
      fontFamily: fontOptions[0].value,
    }]);
    selectObject(id);
  }

  function addShape(shapeType = "divider") {
    saveHistory();
    const id = `shape-${shapeIdRef.current++}`;
    const isDivider = shapeType === "divider";
    setObjects((current) => [...current, {
      id,
      type: "shape",
      shape: shapeType,
      locked: false,
      x: 50,
      y: 50,
      width: isDivider ? 58 : 38,
      height: isDivider ? 14 : 38,
      color: "#d5ad62",
      keepAspectRatio: proportionalShapeIds.has(shapeType),
    }]);
    selectObject(id);
  }

  function createCustomPath(points, closed) {
    const simplified = simplifyPolyline(points, 0.3);
    if (simplified.length < (closed ? 3 : 2)) {
      setVectorMessage("Draw a longer path before finishing.");
      return null;
    }
    const xs = simplified.flatMap((point) => [point.x, point.x + (point.in?.x ?? 0), point.x + (point.out?.x ?? 0)]);
    const ys = simplified.flatMap((point) => [point.y, point.y + (point.in?.y ?? 0), point.y + (point.out?.y ?? 0)]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const width = Math.max(maxX - minX, 0.2);
    const height = Math.max(maxY - minY, 0.2);
    const id = nextObjectId("vector");
    const paths = [{
      closed,
      nodes: simplified.map((point) => ({
        x: ((point.x - minX) / width) * 100,
        y: ((point.y - minY) / height) * 100,
        type: point.type ?? "corner",
        in: { x: ((point.in?.x ?? 0) / width) * 100, y: ((point.in?.y ?? 0) / height) * 100 },
        out: { x: ((point.out?.x ?? 0) / width) * 100, y: ((point.out?.y ?? 0) / height) * 100 },
      })),
    }];
    return {
      id,
      type: "shape",
      shape: "custom",
      x: (minX + maxX) / 2,
      y: (minY + maxY) / 2,
      width,
      height,
      paths,
      fillRule: "evenodd",
      fillEnabled: closed && fillEnabled,
      strokeEnabled: strokeEnabled || !closed,
      color: vectorFill,
      strokeColor: vectorStroke,
      strokeWidth: vectorStrokeWidth,
      opacity: vectorOpacity,
      locked: false,
    };
  }

  function finishDrawing(closeOverride = null) {
    const draft = pathDraftRef.current;
    if (!draft || draft.length < 2) {
      changePathDraft(null);
      setActiveTool("select");
      return;
    }
    const closed = closeOverride ?? (activeTool === "pen" ? draft.length > 2 && Math.hypot(draft[0].x - draft.at(-1).x, draft[0].y - draft.at(-1).y) < 3 : closedDrawing);
    const vector = createCustomPath(draft, closed);
    if (!vector) return;
    saveHistory();
    setObjects((current) => [...current, vector]);
    selectObject(vector.id);
    changePathDraft(null);
    setActiveTool("select");
  }

  function groupSelected() {
    const ids = new Set(selectedIds);
    if (ids.size < 2) return;
    const chosen = objects.filter((object) => ids.has(object.id) && object.type !== "group");
    if (chosen.length !== ids.size) {
      setVectorMessage("Nested groups are not enabled. Ungroup the selection before grouping it again.");
      return;
    }
    const canvasBounds = canvasRef.current?.getBoundingClientRect();
    const bounds = chosen.map((object) => {
      const element = canvasRef.current?.querySelector(`[data-object-id="${CSS.escape(String(object.id))}"]`);
      const rect = element?.getBoundingClientRect();
      if (!rect || !canvasBounds) return { left: object.x, right: object.x, top: object.y, bottom: object.y };
      return {
        left: (rect.left - canvasBounds.left) / canvasBounds.width * 100,
        right: (rect.right - canvasBounds.left) / canvasBounds.width * 100,
        top: (rect.top - canvasBounds.top) / canvasBounds.height * 100,
        bottom: (rect.bottom - canvasBounds.top) / canvasBounds.height * 100,
      };
    });
    const minX = Math.min(...bounds.map((bound) => bound.left));
    const maxX = Math.max(...bounds.map((bound) => bound.right));
    const minY = Math.min(...bounds.map((bound) => bound.top));
    const maxY = Math.max(...bounds.map((bound) => bound.bottom));
    const id = nextObjectId("group");
    saveHistory();
    setObjects((current) => [
      ...current.filter((object) => !ids.has(object.id)),
      {
        id,
        type: "group",
        x: (minX + maxX) / 2,
        y: (minY + maxY) / 2,
        width: Math.max(maxX - minX, 0.2),
        height: Math.max(maxY - minY, 0.2),
        baseBounds: {
          x: (minX + maxX) / 2,
          y: (minY + maxY) / 2,
          width: Math.max(maxX - minX, 0.2),
          height: Math.max(maxY - minY, 0.2),
        },
        rotation: 0,
        flipHorizontal: false,
        flipVertical: false,
        children: chosen,
      },
    ]);
    selectObject(id);
  }

  function ungroupSelected() {
    if (selectedObject?.type !== "group") return;
    saveHistory();
    const ungrouped = selectedObject.children.map((child) => {
      const transformed = transformGroupChild(child, selectedObject);
      delete transformed.groupId;
      return transformed;
    });
    const index = objects.findIndex((object) => object.id === selectedObject.id);
    setObjects((current) => [...current.slice(0, index), ...ungrouped, ...current.slice(index + 1)]);
    setSelectedIds(ungrouped.map((object) => object.id));
    setSelectedId(ungrouped[0]?.id ?? null);
    setGroupEditMode(false);
    setGroupEditGroupId(null);
  }

  function deleteSelectedObjects() {
    if (!selectedIds.length) return;
    saveHistory();
    setObjects((current) => removeObjectsById(current, new Set(selectedIds)));
    selectObject(null);
  }

  function addNodeToSelectedPath() {
    if (selectedObject?.shape !== "custom") return;
    const path = selectedObject.paths?.[0];
    if (!path || path.nodes.length < 2) return;
    const segmentIndex = path.closed
      ? selectedNodeIndex ?? 0
      : Math.min(selectedNodeIndex ?? 0, path.nodes.length - 2);
    const nextIndex = (segmentIndex + 1) % path.nodes.length;
    const first = path.nodes[segmentIndex];
    const second = path.nodes[nextIndex];
    const midpoint = {
      x: (first.x + second.x) / 2,
      y: (first.y + second.y) / 2,
      type: "corner",
      in: { x: 0, y: 0 },
      out: { x: 0, y: 0 },
    };
    const nodes = [...path.nodes];
    if (first.out?.x || first.out?.y || second.in?.x || second.in?.y) {
      const start = { x: first.x, y: first.y };
      const control1 = { x: first.x + (first.out?.x ?? 0), y: first.y + (first.out?.y ?? 0) };
      const control2 = { x: second.x + (second.in?.x ?? 0), y: second.y + (second.in?.y ?? 0) };
      const end = { x: second.x, y: second.y };
      const p01 = { x: (start.x + control1.x) / 2, y: (start.y + control1.y) / 2 };
      const p12 = { x: (control1.x + control2.x) / 2, y: (control1.y + control2.y) / 2 };
      const p23 = { x: (control2.x + end.x) / 2, y: (control2.y + end.y) / 2 };
      const p012 = { x: (p01.x + p12.x) / 2, y: (p01.y + p12.y) / 2 };
      const p123 = { x: (p12.x + p23.x) / 2, y: (p12.y + p23.y) / 2 };
      midpoint.x = (p012.x + p123.x) / 2;
      midpoint.y = (p012.y + p123.y) / 2;
      midpoint.in = { x: p012.x - midpoint.x, y: p012.y - midpoint.y };
      midpoint.out = { x: p123.x - midpoint.x, y: p123.y - midpoint.y };
      nodes[segmentIndex] = { ...first, out: { x: p01.x - start.x, y: p01.y - start.y } };
      nodes[nextIndex] = { ...second, in: { x: p23.x - end.x, y: p23.y - end.y } };
    }
    nodes.splice(segmentIndex + 1, 0, midpoint);
    saveHistory();
    updateSelected({ paths: [{ ...path, nodes }] });
    setSelectedNodeIndex(segmentIndex + 1);
  }

  function removeSelectedNode() {
    const path = selectedObject?.paths?.[0];
    if (!path || selectedNodeIndex == null || path.nodes.length <= (path.closed ? 3 : 2)) return;
    saveHistory();
    updateSelected({ paths: [{ ...path, nodes: path.nodes.filter((_, index) => index !== selectedNodeIndex) }] });
    setSelectedNodeIndex(null);
  }

  function toggleSelectedNodeType() {
    const path = selectedObject?.paths?.[0];
    if (!path || selectedNodeIndex == null) return;
    saveHistory();
    updateSelected({ paths: [{ ...path, nodes: path.nodes.map((node, index) => index === selectedNodeIndex
      ? node.type === "smooth"
        ? { ...node, type: "corner", in: { x: 0, y: 0 }, out: { x: 0, y: 0 } }
        : { ...node, type: "smooth", in: { x: -8, y: 0 }, out: { x: 8, y: 0 } }
      : node) }] });
  }

  function pathDataToRings(pathData) {
    const commands = svgPathParser.makeAbsolute(svgPathParser(pathData));
    const groups = [];
    let current = [];
    for (const command of commands) {
      if (command.code === "M" && current.length) {
        groups.push(current);
        current = [];
      }
      current.push(command);
    }
    if (current.length) groups.push(current);
    return groups.map((group) => {
      const data = group.map((command) => {
        if (command.code === "Z") return "Z";
        const parameterOrder = {
          M: ["x", "y"], L: ["x", "y"], H: ["x"], V: ["y"],
          C: ["x1", "y1", "x2", "y2", "x", "y"], S: ["x2", "y2", "x", "y"],
          Q: ["x1", "y1", "x", "y"], T: ["x", "y"],
          A: ["rx", "ry", "xAxisRotation", "largeArc", "sweep", "x", "y"],
        };
        const values = (parameterOrder[command.code] ?? [])
          .map((key) => command[key]);
        return `${command.code} ${values.join(" ")}`;
      }).join(" ");
      const svgPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
      svgPath.setAttribute("d", data);
      const length = svgPath.getTotalLength();
      if (!Number.isFinite(length) || length < 0.01) return [];
      const samples = Math.min(1200, Math.max(12, Math.ceil(length / 0.4)));
      const ring = Array.from({ length: samples }, (_, index) => {
        const point = svgPath.getPointAtLength((index / samples) * length);
        return { x: point.x, y: point.y };
      });
      return ring.length >= 3 ? ring : [];
    }).filter((ring) => ring.length >= 3);
  }

  function shapeMarkupRings(object) {
    const definition = islamicShapes.find((shape) => shape.id === object.shape);
    if (!definition) {
      if (["line", "divider", "circle-outline"].includes(object.shape)) return [];
      const width = 100;
      const height = 100;
      const points = object.shape === "circle" || object.shape === "circle-outline"
        ? Array.from({ length: 96 }, (_, index) => ({
            x: 50 + Math.cos(index * Math.PI * 2 / 96) * 50,
            y: 50 + Math.sin(index * Math.PI * 2 / 96) * 50,
          }))
        : [{ x: 0, y: 0 }, { x: width, y: 0 }, { x: width, y: height }, { x: 0, y: height }];
      return [points];
    }
    const parsed = new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${definition.svg}</svg>`, "image/svg+xml");
    const rings = [];
    parsed.querySelectorAll("path,polygon,circle,ellipse,rect").forEach((element) => {
      let ancestor = element;
      while (ancestor && ancestor.tagName.toLowerCase() !== "svg") {
        if (ancestor.getAttribute("fill") === "none") return;
        ancestor = ancestor.parentElement;
      }
      if (element.tagName.toLowerCase() === "path") {
        rings.push(...pathDataToRings(element.getAttribute("d") ?? ""));
      } else if (element.tagName.toLowerCase() === "polygon") {
        const values = (element.getAttribute("points") ?? "").trim().split(/[\s,]+/).map(Number);
        if (values.length >= 6) rings.push(Array.from({ length: Math.floor(values.length / 2) }, (_, index) => ({ x: values[index * 2], y: values[index * 2 + 1] })));
      } else if (element.tagName.toLowerCase() === "rect") {
        const x = Number(element.getAttribute("x") ?? 0);
        const y = Number(element.getAttribute("y") ?? 0);
        const width = Number(element.getAttribute("width") ?? 0);
        const height = Number(element.getAttribute("height") ?? 0);
        rings.push([{ x, y }, { x: x + width, y }, { x: x + width, y: y + height }, { x, y: y + height }]);
      } else {
        const cx = Number(element.getAttribute("cx") ?? 0);
        const cy = Number(element.getAttribute("cy") ?? 0);
        const rx = Number(element.getAttribute("r") ?? element.getAttribute("rx") ?? 0);
        const ry = Number(element.getAttribute("r") ?? element.getAttribute("ry") ?? rx);
        rings.push(Array.from({ length: 96 }, (_, index) => ({
          x: cx + Math.cos(index * Math.PI * 2 / 96) * rx,
          y: cy + Math.sin(index * Math.PI * 2 / 96) * ry,
        })));
      }
    });
    return rings;
  }

  function objectPolygonGeometry(object) {
    const isPreset = islamicShapes.some((shape) => shape.id === object.shape);
    if (object.type === "image") {
      const image = canvasRef.current?.querySelector(`.canvas-control-object[data-object-id="${CSS.escape(String(object.id))}"] .canvas-image`);
      const imageWidth = (object.width ?? 36) * dimensions.width / 100;
      const imageHeight = image?.naturalWidth
        ? imageWidth * image.naturalHeight / image.naturalWidth
        : (object.height ?? 36) * dimensions.height / 100;
      const radians = (object.rotation ?? 0) * Math.PI / 180;
      const centerX = object.x * dimensions.width / 100;
      const centerY = object.y * dimensions.height / 100;
      const points = [
        [-imageWidth / 2, -imageHeight / 2],
        [imageWidth / 2, -imageHeight / 2],
        [imageWidth / 2, imageHeight / 2],
        [-imageWidth / 2, imageHeight / 2],
      ].map(([x, y]) => [
        centerX + x * Math.cos(radians) - y * Math.sin(radians),
        centerY + x * Math.sin(radians) + y * Math.cos(radians),
      ]);
      return [[[...points, points[0]]]];
    }
    if (object.type !== "shape" || (!isPreset && object.shape !== "custom" && !["circle", "square", "rectangle"].includes(object.shape))) return null;
    let localRings;
    if (object.shape === "custom") {
      localRings = flattenVectorPath(object.paths ?? [], 24);
      if (!localRings.length) return null;
    } else {
      localRings = shapeMarkupRings(object);
      if (!localRings.length) return null;
    }
    const centerX = object.x;
    const centerY = object.y;
    const width = object.width ?? 38;
    const height = object.height ?? 38;
    const rotation = (object.rotation ?? 0) * Math.PI / 180;
    const flippedX = object.flipHorizontal ? -1 : 1;
    const flippedY = object.flipVertical ? -1 : 1;
    const scaleCanvasX = dimensions.width;
    const scaleCanvasY = dimensions.height;
    const worldRings = localRings.map((ring) => ring.map((point) => {
      const localX = (point.x - 50) * width / 100;
      const localY = (point.y - 50) * height / 100;
      const px = localX * scaleCanvasX / 100 * flippedX;
      const py = localY * scaleCanvasY / 100 * flippedY;
      return {
        x: centerX * scaleCanvasX / 100 + px * Math.cos(rotation) - py * Math.sin(rotation),
        y: centerY * scaleCanvasY / 100 + px * Math.sin(rotation) + py * Math.cos(rotation),
      };
    }));
    return ringsToMultiPolygon(worldRings);
  }

  function ringsToMultiPolygon(rings) {
    const area = (ring) => Math.abs(ring.reduce((sum, point, index) => {
      const next = ring[(index + 1) % ring.length];
      return sum + point.x * next.y - next.x * point.y;
    }, 0) / 2);
    const contains = (ring, point) => {
      let inside = false;
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
        if (((ring[i].y > point.y) !== (ring[j].y > point.y))
          && point.x < (ring[j].x - ring[i].x) * (point.y - ring[i].y) / (ring[j].y - ring[i].y) + ring[i].x) inside = !inside;
      }
      return inside;
    };
    const entries = rings.map((ring) => ({ ring, area: area(ring), parent: null, depth: 0 }));
    entries.forEach((entry) => {
      const sample = entry.ring[0];
      const parents = entries.filter((candidate) => candidate !== entry && candidate.area > entry.area && contains(candidate.ring, sample)).sort((a, b) => a.area - b.area);
      entry.parent = parents[0] ?? null;
    });
    entries.forEach((entry) => {
      let parent = entry.parent;
      while (parent) {
        entry.depth += 1;
        parent = parent.parent;
      }
    });
    const polygons = [];
    const polygonByEntry = new Map();
    entries.forEach((entry) => {
      if (entry.depth % 2 === 0) {
        const polygon = [entry.ring.map((point) => [point.x, point.y])];
        polygons.push(polygon);
        polygonByEntry.set(entry, polygon);
      }
    });
    entries.forEach((entry) => {
      if (entry.depth % 2 === 1) {
        let parent = entry.parent;
        while (parent && parent.depth % 2 !== 0) parent = parent.parent;
        const polygon = polygonByEntry.get(parent);
        if (polygon) polygon.push(entry.ring.map((point) => [point.x, point.y]));
      }
    });
    return polygons;
  }

  function imageMaskFromGeometry(imageObject, geometry) {
    const image = canvasRef.current?.querySelector(`.canvas-control-object[data-object-id="${CSS.escape(String(imageObject.id))}"] .canvas-image`);
    const width = (imageObject.width ?? 36) * dimensions.width / 100;
    const height = image?.naturalWidth
      ? width * image.naturalHeight / image.naturalWidth
      : (imageObject.height ?? 36) * dimensions.height / 100;
    const radians = -((imageObject.rotation ?? 0) * Math.PI) / 180;
    const centerX = imageObject.x * dimensions.width / 100;
    const centerY = imageObject.y * dimensions.height / 100;
    const contours = geometry.flatMap((polygon) => polygon.map((ring) => ring.slice(0, -1)));
    return {
      paths: contours.map((ring) => ({
        closed: true,
        nodes: ring.map(([x, y]) => {
          const dx = x - centerX;
          const dy = y - centerY;
          const localX = (dx * Math.cos(radians) - dy * Math.sin(radians)) * (imageObject.flipHorizontal ? -1 : 1);
          const localY = (dx * Math.sin(radians) + dy * Math.cos(radians)) * (imageObject.flipVertical ? -1 : 1);
          return {
            x: (localX / width + 0.5) * 100,
            y: (localY / height + 0.5) * 100,
          };
        }),
      })),
    };
  }

  function existingImageMaskGeometry(imageObject) {
    if (!imageObject.alphaMask?.paths?.length) return null;
    const width = (imageObject.width ?? 36) * dimensions.width / 100;
    const image = canvasRef.current?.querySelector(`.canvas-control-object[data-object-id="${CSS.escape(String(imageObject.id))}"] .canvas-image`);
    const height = image?.naturalWidth
      ? width * image.naturalHeight / image.naturalWidth
      : (imageObject.height ?? 36) * dimensions.height / 100;
    const radians = (imageObject.rotation ?? 0) * Math.PI / 180;
    const centerX = imageObject.x * dimensions.width / 100;
    const centerY = imageObject.y * dimensions.height / 100;
    return imageObject.alphaMask.paths.map((path) => path.nodes.map((node) => {
      const localX = (node.x / 100 - 0.5) * width * (imageObject.flipHorizontal ? -1 : 1);
      const localY = (node.y / 100 - 0.5) * height * (imageObject.flipVertical ? -1 : 1);
      return [
        centerX + localX * Math.cos(radians) - localY * Math.sin(radians),
        centerY + localX * Math.sin(radians) + localY * Math.cos(radians),
      ];
    }).concat(path.closed && path.nodes.length ? [[
      centerX + ((path.nodes[0].x / 100 - 0.5) * width * (imageObject.flipHorizontal ? -1 : 1)) * Math.cos(radians)
        - ((path.nodes[0].y / 100 - 0.5) * height * (imageObject.flipVertical ? -1 : 1)) * Math.sin(radians),
      centerY + ((path.nodes[0].x / 100 - 0.5) * width * (imageObject.flipHorizontal ? -1 : 1)) * Math.sin(radians)
        + ((path.nodes[0].y / 100 - 0.5) * height * (imageObject.flipVertical ? -1 : 1)) * Math.cos(radians),
    ]] : []));
  }

  function performImageBoolean(operation, chosen, keepCutter) {
    if (operation === "union") {
      if (chosen.some((object) => object.type !== "image")) {
        setVectorMessage("Image Weld supports images only. Select images without vector shapes.");
        return;
      }
      const loaded = chosen.map((object) => ({
        object,
        image: canvasRef.current?.querySelector(`.canvas-control-object[data-object-id="${CSS.escape(String(object.id))}"] .canvas-image`),
      }));
      if (loaded.some(({ image }) => !image?.naturalWidth)) {
        setVectorMessage("Wait for all selected images to finish loading before using Image Weld.");
        return;
      }
      const records = loaded.map(({ object, image }) => {
        const width = (object.width ?? 36) * dimensions.width / 100;
        const height = width * image.naturalHeight / image.naturalWidth;
        const radians = (object.rotation ?? 0) * Math.PI / 180;
        const centerX = object.x * dimensions.width / 100;
        const centerY = object.y * dimensions.height / 100;
        const halfWidth = (Math.abs(width * Math.cos(radians)) + Math.abs(height * Math.sin(radians))) / 2;
        const halfHeight = (Math.abs(width * Math.sin(radians)) + Math.abs(height * Math.cos(radians))) / 2;
        return { object, image, width, height, radians, centerX, centerY, left: centerX - halfWidth, right: centerX + halfWidth, top: centerY - halfHeight, bottom: centerY + halfHeight };
      });
      const minX = Math.min(...records.map((item) => item.left));
      const maxX = Math.max(...records.map((item) => item.right));
      const minY = Math.min(...records.map((item) => item.top));
      const maxY = Math.max(...records.map((item) => item.bottom));
      if (!(maxX > minX) || !(maxY > minY)) {
        setVectorMessage("The selected images do not overlap the canvas, so there is no visible Image Weld result.");
        return;
      }
      const combined = document.createElement("canvas");
      combined.width = Math.ceil(maxX - minX);
      combined.height = Math.ceil(maxY - minY);
      const combinedContext = combined.getContext("2d");
      try {
        records.forEach(({ object, image, width, height, radians, centerX, centerY }) => {
          const imageLayer = document.createElement("canvas");
          imageLayer.width = Math.max(1, Math.ceil(width));
          imageLayer.height = Math.max(1, Math.ceil(height));
          const imageContext = imageLayer.getContext("2d");
          imageContext.globalAlpha = (object.opacity ?? 100) / 100;
          imageContext.drawImage(image, 0, 0, imageLayer.width, imageLayer.height);
          if (object.alphaMask?.paths?.length) {
            imageContext.globalCompositeOperation = "destination-in";
            imageContext.scale(imageLayer.width / 100, imageLayer.height / 100);
            imageContext.fill(new Path2D(pathToSvg(object.alphaMask.paths)), "evenodd");
            imageContext.setTransform(1, 0, 0, 1, 0, 0);
          }
          const imageMasks = [...(object.transparencyMasks ?? []), ...(object.transparencyMask ? [object.transparencyMask] : [])];
          imageMasks.forEach((mask) => {
            const normalized = normalizeTransparencyMask(mask);
            const vectors = {
              "top-bottom": [0.5, 0, 0.5, 1],
              "bottom-top": [0.5, 1, 0.5, 0],
              "left-right": [0, 0.5, 1, 0.5],
              "right-left": [1, 0.5, 0, 0.5],
              "top-left-bottom-right": [0, 0, 1, 1],
              "bottom-right-top-left": [1, 1, 0, 0],
              "top-right-bottom-left": [1, 0, 0, 1],
              "bottom-left-top-right": [0, 1, 1, 0],
            };
            const [x1, y1, x2, y2] = vectors[normalized.direction] ?? vectors["left-right"];
            let gradient;
            if (normalized.type === "radial") {
              const centerX = imageLayer.width * normalized.centerX / 100;
              const centerY = imageLayer.height * normalized.centerY / 100;
              imageContext.save();
              imageContext.translate(centerX, centerY);
              imageContext.scale(1, imageLayer.height / imageLayer.width);
              gradient = imageContext.createRadialGradient(0, 0, 0, 0, 0, imageLayer.width * normalized.radius / 100);
              imageContext.restore();
            } else {
              gradient = imageContext.createLinearGradient(x1 * imageLayer.width, y1 * imageLayer.height, x2 * imageLayer.width, y2 * imageLayer.height);
            }
            normalized.stops.forEach((stop, index) => {
              if (normalized.hard && index > 0) gradient.addColorStop(Math.max(0, stop.offset - 0.1) / 100, `rgba(255,255,255,${normalized.stops[index - 1].opacity / 100})`);
              gradient.addColorStop(stop.offset / 100, `rgba(255,255,255,${stop.opacity / 100})`);
            });
            imageContext.globalCompositeOperation = "destination-in";
            imageContext.fillStyle = gradient;
            imageContext.fillRect(0, 0, imageLayer.width, imageLayer.height);
          });
          combinedContext.save();
          combinedContext.translate(centerX - minX, centerY - minY);
          combinedContext.rotate(radians);
          combinedContext.scale(object.flipHorizontal ? -1 : 1, object.flipVertical ? -1 : 1);
          combinedContext.drawImage(imageLayer, -width / 2, -height / 2, width, height);
          combinedContext.restore();
        });
        const id = nextObjectId("image-weld");
        const result = {
          ...records.at(-1).object,
          id,
          src: combined.toDataURL("image/png"),
          x: ((minX + maxX) / 2) / dimensions.width * 100,
          y: ((minY + maxY) / 2) / dimensions.height * 100,
          width: (combined.width / dimensions.width) * 100,
          rotation: 0,
          flipHorizontal: false,
          flipVertical: false,
          opacity: 100,
          alphaMask: undefined,
          transparencyMask: undefined,
        };
        const removeIds = new Set(chosen.map((object) => object.id));
        const firstIndex = Math.min(...objects.map((object, index) => removeIds.has(object.id) ? index : Infinity));
        saveHistory();
        const next = objects.filter((object) => !removeIds.has(object.id));
        next.splice(Math.min(firstIndex, next.length), 0, result);
        setObjects(next);
        selectObject(id);
        setVectorMessage("Image Weld created a combined PNG image with transparency.");
      } catch (error) {
        setVectorMessage(`Image Weld could not composite these images: ${error.message || "the image data is not accessible"}`);
      }
      return;
    }
    const ordered = [...chosen].sort((a, b) => objects.indexOf(a) - objects.indexOf(b));
    if (operation === "difference" && !trimTopIsCutter) ordered.reverse();
    const target = ordered[0];
    if (target.type !== "image") {
      setVectorMessage("Image Trim/Intersect needs the target image first. Select its layer with the cutter, then choose which layer is the target.");
      return;
    }
    const cutters = ordered.slice(1);
    if (!cutters.length || cutters.some((object) => !objectPolygonGeometry(object)?.length)) {
      setVectorMessage("Choose an image and at least one closed image or vector-shape cutter.");
      return;
    }
    const targetGeometry = objectPolygonGeometry(target);
    if (!targetGeometry) {
      setVectorMessage("The target image must finish loading before it can be masked.");
      return;
    }
    let baseGeometry = targetGeometry;
    if (target.alphaMask?.paths?.length) {
      try {
        baseGeometry = applyBooleanGeometry("intersection", [targetGeometry, ringsToMultiPolygon(
          existingImageMaskGeometry(target).map((ring) => ring.map(([x, y]) => ({ x, y }))),
        )]);
      } catch {
        setVectorMessage("The target image already has a mask that could not be read; its source was left unchanged.");
        return;
      }
    }
    let maskedGeometry;
    try {
      maskedGeometry = applyBooleanGeometry(operation, [baseGeometry, ...cutters.map((object) => objectPolygonGeometry(object))]);
    } catch (error) {
      setVectorMessage(error.message);
      return;
    }
    const mask = imageMaskFromGeometry(target, maskedGeometry);
    const id = nextObjectId("image-mask");
    const maskedImage = { ...target, id, alphaMask: mask };
    const removeIds = new Set(keepCutter && operation === "difference"
      ? ordered.slice(0, -1).map((object) => object.id)
      : ordered.map((object) => object.id));
    const firstIndex = Math.min(...objects.map((object, index) => removeIds.has(object.id) ? index : Infinity));
    saveHistory();
    const next = objects.filter((object) => !removeIds.has(object.id));
    next.splice(Math.min(firstIndex, next.length), 0, maskedImage);
    setObjects(next);
    selectObject(id);
    setVectorMessage(operation === "difference"
      ? `Image Trim applied as an editable alpha mask${keepCutter ? "; the top cutter was kept." : "."}`
      : "Image Intersect applied as an editable alpha mask.");
  }

  function performBoolean(operation, keepCutter = false) {
    const chosen = objects.filter((object) => selectedIds.includes(object.id));
    if (chosen.length !== selectedIds.length || chosen.length < 2) {
      setVectorMessage("Select two or more closed vector shapes, or an image and closed shape/image cutters.");
      return;
    }
    if (chosen.some((object) => object.type === "image")) {
      performImageBoolean(operation, chosen, keepCutter);
      return;
    }
    if (chosen.some((object) => object.type !== "shape")) {
      setVectorMessage("Text and grouped objects are not Boolean inputs. Choose vector shapes or an image with cutters.");
      return;
    }
    let geometries;
    try {
      geometries = chosen.map((object) => objectPolygonGeometry(object));
    } catch (error) {
      setVectorMessage(`Vector path could not be read: ${error.message || "invalid SVG geometry"}`);
      return;
    }
    if (geometries.some((geometry) => !geometry?.length)) {
      setVectorMessage("This selection includes an open path or unsupported shape. Choose closed vector shapes only.");
      return;
    }
    const ordered = [...chosen].sort((a, b) => objects.indexOf(a) - objects.indexOf(b));
    if (operation === "difference" && !trimTopIsCutter) ordered.reverse();
    const orderedGeometries = operation === "difference" ? ordered.map((object) => objectPolygonGeometry(object)) : geometries;
    const styleSource = operation === "difference" ? ordered[0] : ordered.at(-1);
    let result;
    try {
      result = createBooleanVector(operation, orderedGeometries, {
        color: styleSource.color ?? vectorFill,
        strokeEnabled: styleSource.strokeEnabled,
        strokeColor: styleSource.strokeColor,
        strokeWidth: styleSource.strokeWidth,
        opacity: styleSource.opacity,
        transparencyMask: styleSource.transparencyMask,
        transparencyMasks: styleSource.transparencyMasks,
        canvasWidth: dimensions.width,
        canvasHeight: dimensions.height,
      });
    } catch (error) {
      setVectorMessage(error.message);
      return;
    }
    const id = nextObjectId("boolean");
    result.id = id;
    const cutter = ordered.at(-1);
    const removeIds = new Set(keepCutter && operation === "difference" ? ordered.slice(0, -1).map((object) => object.id) : ordered.map((object) => object.id));
    const firstIndex = Math.min(...objects.map((object, index) => removeIds.has(object.id) ? index : Infinity));
    saveHistory();
    const next = objects.filter((object) => !removeIds.has(object.id));
    next.splice(Math.min(firstIndex, next.length), 0, result);
    setObjects(next);
    selectObject(id);
    setVectorMessage(operation === "difference" && keepCutter ? `Trim completed; “${cutter.shape}” cutter kept.` : "Boolean vector operation completed.");
  }

  function getCanvasPoint(event) {
    const bounds = canvasRef.current.getBoundingClientRect();
    return {
      x: ((event.clientX - bounds.left) / bounds.width) * 100,
      y: ((event.clientY - bounds.top) / bounds.height) * 100,
    };
  }

  function beginCanvasPointer(event) {
    if (event.button !== 0 || event.target.closest(".resize-handle, .vector-node-overlay, .group-selection-outline")) return;
    event.preventDefault();
    const point = getCanvasPoint(event);
    if (activeTool === "freehand") {
      event.currentTarget.setPointerCapture(event.pointerId);
      changePathDraft([point]);
      return;
    }
    if (activeTool === "pen") {
      event.currentTarget.setPointerCapture(event.pointerId);
      const currentDraft = pathDraftRef.current;
      if (currentDraft?.length >= 3 && Math.hypot(currentDraft[0].x - point.x, currentDraft[0].y - point.y) < 1.8) {
        finishDrawing(true);
      } else {
        changePathDraft((current) => [...(current ?? []), { ...point, type: "corner", in: { x: 0, y: 0 }, out: { x: 0, y: 0 } }]);
        dragRef.current = { type: "pen-handle", pointerId: event.pointerId, start: point };
      }
      return;
    }
    if (activeTool === "multi") {
      event.currentTarget.setPointerCapture(event.pointerId);
      setSelectionMarquee({ startX: point.x, startY: point.y, x: point.x, y: point.y, pointerId: event.pointerId });
      return;
    }
    if (activeTool === "select" && !event.target.closest(".canvas-object")) selectObject(null);
  }

  function updateCanvasInteraction(event) {
    const drag = dragRef.current;
    if (activeTool === "freehand" && pathDraftRef.current && event.buttons) {
      const point = getCanvasPoint(event);
      const last = pathDraftRef.current.at(-1);
      if (Math.hypot(point.x - last.x, point.y - last.y) >= 0.25) changePathDraft((current) => [...current, point]);
      return;
    }
    if (activeTool === "pen" && drag?.type === "pen-handle" && drag.pointerId === event.pointerId && event.buttons) {
      const point = getCanvasPoint(event);
      const dx = point.x - drag.start.x;
      const dy = point.y - drag.start.y;
      if (Math.hypot(dx, dy) > 0.2) {
        changePathDraft((current) => current.map((node, index) => index === current.length - 1
          ? { ...node, type: "smooth", in: { x: -dx, y: -dy }, out: { x: dx, y: dy } }
          : node));
      }
      return;
    }
    if (selectionMarquee?.pointerId === event.pointerId) {
      const point = getCanvasPoint(event);
      setSelectionMarquee((current) => ({ ...current, x: point.x, y: point.y }));
      return;
    }
    if (drag?.type === "node") {
      const object = findObject(renderableObjects, drag.id) ?? findObject(objects, drag.id);
      const element = canvasRef.current.querySelector(`.canvas-control-object[data-object-id="${CSS.escape(String(drag.id))}"]`);
      if (!object || !element) return;
      const canvasBounds = canvasRef.current.getBoundingClientRect();
      const centerX = canvasBounds.left + (object.x / 100) * canvasBounds.width;
      const centerY = canvasBounds.top + (object.y / 100) * canvasBounds.height;
      const width = (object.width ?? 38) / 100 * canvasBounds.width;
      const height = (object.height ?? 38) / 100 * canvasBounds.height;
      let dx = event.clientX - centerX;
      let dy = event.clientY - centerY;
      const radians = -((object.rotation ?? 0) * Math.PI) / 180;
      const rotatedX = dx * Math.cos(radians) - dy * Math.sin(radians);
      const rotatedY = dx * Math.sin(radians) + dy * Math.cos(radians);
      const localX = (rotatedX * (object.flipHorizontal ? -1 : 1) / width + 0.5) * 100;
      const localY = (rotatedY * (object.flipVertical ? -1 : 1) / height + 0.5) * 100;
      setObjects((current) => {
        const target = findObject(current, drag.id);
        const path = target?.paths?.[drag.pathIndex ?? 0];
        if (!path) return current;
        const nodes = path.nodes.map((node, index) => {
          if (index !== drag.nodeIndex) return node;
          if (drag.handle) {
            const handle = { x: localX - node.x, y: localY - node.y };
            const other = drag.handle === "in" ? "out" : "in";
            return { ...node, [drag.handle]: handle, ...(node.type === "smooth" ? { [other]: { x: -handle.x, y: -handle.y } } : {}) };
          }
          const offset = { x: localX - node.x, y: localY - node.y };
          return {
            ...node,
            x: localX,
            y: localY,
            in: { x: (node.in?.x ?? 0) + offset.x, y: (node.in?.y ?? 0) + offset.y },
            out: { x: (node.out?.x ?? 0) + offset.x, y: (node.out?.y ?? 0) + offset.y },
          };
        });
        return updateObjectById(current, drag.id, { paths: target.paths.map((item, index) => index === (drag.pathIndex ?? 0) ? { ...item, nodes } : item) });
      });
      return;
    }
    dragObject(event);
  }

  function endCanvasInteraction(event) {
    if (dragRef.current?.pointerId != null && dragRef.current.pointerId !== event.pointerId) return;
    if (activeTool === "freehand" && pathDraftRef.current) {
      finishDrawing();
      return;
    }
    if (selectionMarquee?.pointerId === event.pointerId) {
      const startX = Math.min(selectionMarquee.startX, selectionMarquee.x);
      const endX = Math.max(selectionMarquee.startX, selectionMarquee.x);
      const startY = Math.min(selectionMarquee.startY, selectionMarquee.y);
      const endY = Math.max(selectionMarquee.startY, selectionMarquee.y);
      const rect = canvasRef.current.getBoundingClientRect();
      const hits = objects.filter((object) => {
        if (object.type === "group") return false;
        const element = canvasRef.current.querySelector(`.canvas-control-object[data-object-id="${CSS.escape(String(object.id))}"]`);
        const bounds = element?.getBoundingClientRect();
        if (!bounds) return false;
        const left = (bounds.left - rect.left) / rect.width * 100;
        const right = (bounds.right - rect.left) / rect.width * 100;
        const top = (bounds.top - rect.top) / rect.height * 100;
        const bottom = (bounds.bottom - rect.top) / rect.height * 100;
        return right >= startX && left <= endX && bottom >= startY && top <= endY;
      }).map((object) => object.id);
      setSelectedIds(hits);
      setSelectedId(hits.at(-1) ?? null);
      setSelectionMarquee(null);
    }
    if (dragRef.current?.type === "pen-handle") dragRef.current = null;
    else dragRef.current = null;
  }

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape" && pathDraft) {
        event.preventDefault();
        changePathDraft(null);
        dragRef.current = null;
        setActiveTool("select");
        return;
      }
      if ((event.key === "Enter" || event.key === " ") && pathDraft && activeTool === "pen") {
        event.preventDefault();
        finishDrawing();
        return;
      }
      if (pathDraft && (event.key === "Backspace" || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z"))) {
        event.preventDefault();
        changePathDraft((current) => current?.slice(0, -1) ?? null);
        return;
      }
      if (event.target instanceof HTMLElement && ["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName)) return;
      if (event.key === "Delete" && selectedIds.length) {
        event.preventDefault();
        deleteSelectedObjects();
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "g") {
        event.preventDefault();
        if (event.shiftKey) ungroupSelected();
        else groupSelected();
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        undo();
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  function duplicateSelected() {
    saveHistory();
    if (!selectedObject) return;
    const cloneWithNewIds = (object) => ({
      ...object,
      ...(object.type === "group" ? { children: object.children.map(cloneWithNewIds) } : {}),
      id: nextObjectId("copy"),
      x: Math.min(96, object.x + 5),
      y: Math.min(96, object.y + 5),
    });
    const duplicate = cloneWithNewIds(selectedObject);
    setObjects((current) => [...current, duplicate]);
    selectObject(duplicate.id);
  }

  function moveSelectedLayer(direction) {
    setObjects((current) => {
      const index = current.findIndex((object) => object.id === selectedId);
      const nextIndex = direction === "front"
        ? current.length - 1
        : direction === "back"
          ? 0
          : Math.max(0, Math.min(current.length - 1, index + direction));
      if (index < 0 || nextIndex === index) return current;
      const reordered = [...current];
      [reordered[index], reordered[nextIndex]] = [reordered[nextIndex], reordered[index]];
      return reordered;
    });
  }

  function uploadImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const id = nextObjectId("image");
    const reader = new FileReader();
    reader.onload = () => {
      if (selectedObject?.type === "image") {
        setObjects((current) => updateObjectById(current, selectedObject.id, { src: reader.result }));
        return;
      }
      setObjects((current) => [...current, {
        id,
        type: "image",
        locked: false,
        src: reader.result,
        x: 50,
        y: 50,
        width: 36,
      }]);
      selectObject(id);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  function applyImageEdit(src) {
    saveHistory();
    setObjects((current) => updateObjectById(current, editingImageId, { src }));
    setEditingImageId(null);
  }

  function uploadBackgroundImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setBackgroundImage(reader.result);
      setBackgroundMode("upload");
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  function uploadTextFillImage(event) {
    const file = event.target.files?.[0];
    if (!file || selectedObject?.type !== "text") return;
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!allowedTypes.includes(file.type) && !["jpg", "jpeg", "png", "webp"].includes(extension)) return;
    const targetId = selectedId;
    const reader = new FileReader();
    reader.onload = () => setObjects((current) => updateObjectById(current, targetId, { imageFillSrc: reader.result }));
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  function moveObject(event, object) {
    if (activeTool !== "select" && activeTool !== "multi") return;
    const target = object.groupId && !groupEditMode ? findObject(objects, object.groupId) : object;
    if (!target || target.locked) return;
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.shiftKey || event.ctrlKey || event.metaKey || activeTool === "multi") {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    saveHistory();
    const canvasBounds = canvasRef.current.getBoundingClientRect();
    const objectBounds = target.type === "group"
      ? canvasRef.current.querySelector(`[data-group-id="${CSS.escape(String(target.id))}"]`)?.getBoundingClientRect() ?? event.currentTarget.getBoundingClientRect()
      : event.currentTarget.getBoundingClientRect();
    const ids = selectedIds.includes(target.id) && selectedIds.length > 1 ? selectedIds : [target.id];
    const pointerOffsetX = target.type === "group"
      ? event.clientX - (canvasBounds.left + target.x / 100 * canvasBounds.width)
      : event.clientX - (objectBounds.left + objectBounds.width / 2);
    const pointerOffsetY = target.type === "group"
      ? event.clientY - (canvasBounds.top + target.y / 100 * canvasBounds.height)
      : event.clientY - (objectBounds.top + objectBounds.height / 2);
    dragRef.current = {
      type: "move",
      pointerId: event.pointerId,
      ids,
      startPositions: ids.map((id) => {
        const selected = findObject(objects, id);
        return selected ? { id, x: selected.x, y: selected.y } : null;
      }).filter(Boolean),
      pointerOffsetX,
      pointerOffsetY,
      startX: target.x,
      startY: target.y,
      groupEdit: groupEditMode,
      halfWidth: (objectBounds.width / 2 + 6) / canvasBounds.width * 100,
      halfHeight: (objectBounds.height / 2 + 6) / canvasBounds.height * 100,
    };
    if (!ids.includes(target.id) || selectedId !== target.id) selectObject(target.id);
  }

  function resizeObject(event, object, corner) {
    event.preventDefault();
    event.stopPropagation();
    if (object.locked || event.button !== 0) return;

    const objectElement = event.currentTarget.closest(".canvas-object");
    const oppositeHandle = objectElement?.querySelector(`[data-resize-corner="${corner.opposite}"]`);
    if (!objectElement || !oppositeHandle) return;

    const objectBounds = objectElement.getBoundingClientRect();
    const canvasBounds = canvasRef.current.getBoundingClientRect();
    const objectCenterX = objectBounds.left + objectBounds.width / 2;
    const objectCenterY = objectBounds.top + objectBounds.height / 2;
    const isVectorShape = object.type === "shape" && (object.shape === "custom" || islamicShapes.some((shape) => shape.id === object.shape));
    const isShape = object.type === "shape";
    const shapeWidth = objectElement.offsetWidth;
    const shapeHeight = objectElement.offsetHeight;
    const cornerSigns = {
      "top-left": { x: -1, y: -1 },
      "top-right": { x: 1, y: -1 },
      "bottom-left": { x: -1, y: 1 },
      "bottom-right": { x: 1, y: 1 },
    }[corner.id];
    const radians = ((object.rotation ?? 0) * Math.PI) / 180;
    const anchorOffsetX = (-cornerSigns.x * shapeWidth / 2) * Math.cos(radians)
      - (-cornerSigns.y * shapeHeight / 2) * Math.sin(radians);
    const anchorOffsetY = (-cornerSigns.x * shapeWidth / 2) * Math.sin(radians)
      + (-cornerSigns.y * shapeHeight / 2) * Math.cos(radians);
    const shapeAnchorX = objectCenterX + anchorOffsetX;
    const shapeAnchorY = objectCenterY + anchorOffsetY;
    const oppositeBounds = oppositeHandle.getBoundingClientRect();
    const anchorX = isShape ? shapeAnchorX : oppositeBounds.left + oppositeBounds.width / 2;
    const anchorY = isShape ? shapeAnchorY : oppositeBounds.top + oppositeBounds.height / 2;

    if (isShape) {
      saveHistory();
      event.currentTarget.setPointerCapture(event.pointerId);
      dragRef.current = {
        type: "resize-shape",
        id: object.id,
        corner: corner.id,
        rotation: object.rotation ?? 0,
        anchorX: anchorX - canvasBounds.left,
        anchorY: anchorY - canvasBounds.top,
        startPointerX: event.clientX - canvasBounds.left,
        startPointerY: event.clientY - canvasBounds.top,
        startWidth: shapeWidth,
        startHeight: shapeHeight,
        propertyWidth: object.width ?? (isVectorShape ? 38 : 140),
        propertyHeight: object.height ?? (isVectorShape ? 38 : 16),
        widthUnit: isVectorShape ? canvasBounds.width / 100 : 1,
        heightUnit: isVectorShape ? canvasBounds.height / 100 : 1,
        positionWidthUnit: canvasBounds.width / 100,
        positionHeightUnit: canvasBounds.height / 100,
        lockAspectRatio: object.keepAspectRatio ?? proportionalShapeIds.has(object.shape),
      };
      selectObject(object.id);
      return;
    }

    const pointerVectorX = event.clientX - anchorX;
    const pointerVectorY = event.clientY - anchorY;

    event.currentTarget.setPointerCapture(event.pointerId);
    saveHistory();
    dragRef.current = {
      type: "resize",
      id: object.id,
      anchorX,
      anchorY,
      startCenterX: objectCenterX,
      startCenterY: objectCenterY,
      startVectorX: pointerVectorX,
      startVectorY: pointerVectorY,
      startVectorLengthSquared: pointerVectorX ** 2 + pointerVectorY ** 2,
      startFontSize: object.fontSize,
      startWidth: object.width ?? 36,
      rotation: object.rotation ?? 0,
    };
    selectObject(object.id);
  }

  function resizeGroup(event, group, corner) {
    event.preventDefault();
    event.stopPropagation();
    if (group.locked || event.button !== 0) return;
    const element = event.currentTarget.closest(".canvas-object");
    const opposite = event.currentTarget.closest(".group-selection-outline")?.querySelector(`[data-resize-corner="${corner.opposite}"]`);
    const canvasBounds = canvasRef.current.getBoundingClientRect();
    if (!element || !opposite) return;
    const oppositeBounds = opposite.getBoundingClientRect();
    const oppositeCenter = {
      x: oppositeBounds.left + oppositeBounds.width / 2,
      y: oppositeBounds.top + oppositeBounds.height / 2,
    };
    saveHistory();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      type: "resize-shape",
      id: group.id,
      corner: corner.id,
      rotation: group.rotation ?? 0,
      anchorX: oppositeCenter.x - canvasBounds.left,
      anchorY: oppositeCenter.y - canvasBounds.top,
      startPointerX: event.clientX - canvasBounds.left,
      startPointerY: event.clientY - canvasBounds.top,
      startWidth: element.offsetWidth,
      startHeight: element.offsetHeight,
      propertyWidth: group.width,
      propertyHeight: group.height,
      widthUnit: canvasBounds.width / 100,
      heightUnit: canvasBounds.height / 100,
      positionWidthUnit: canvasBounds.width / 100,
      positionHeightUnit: canvasBounds.height / 100,
      lockAspectRatio: false,
    };
  }

  function beginNodeDrag(event, object, pathIndex, nodeIndex, handle = null) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    saveHistory();
    selectObject(object.id);
    setSelectedNodeIndex(nodeIndex);
    dragRef.current = { type: "node", id: object.id, pathIndex, nodeIndex, handle };
  }

  function dragObject(event) {
    if (!dragRef.current || !canvasRef.current) return;
    const drag = dragRef.current;
    if (drag.pointerId != null && drag.pointerId !== event.pointerId) return;
    const bounds = canvasRef.current.getBoundingClientRect();
    if (drag.type === "resize-shape") {
      const resized = resizeObjectFromCorner({
        ...drag,
        pointerX: event.clientX - bounds.left,
        pointerY: event.clientY - bounds.top,
      });
      if (!resized) return;
      setObjects((current) => updateObjectById(current, drag.id, {
        x: resized.x,
        y: resized.y,
        width: resized.width,
        height: resized.height,
      }));
      return;
    }
    if (drag.type === "resize") {
      if (!drag.startVectorLengthSquared) return;
      const pointerVectorX = event.clientX - drag.anchorX;
      const pointerVectorY = event.clientY - drag.anchorY;
      const scale = Math.max(0.05, (
        pointerVectorX * drag.startVectorX + pointerVectorY * drag.startVectorY
      ) / drag.startVectorLengthSquared);
      setObjects((current) => current.map((object) => {
        if (object.id !== drag.id) return object;
        const x = ((drag.anchorX + (drag.startCenterX - drag.anchorX) * scale - bounds.left) / bounds.width) * 100;
        const y = ((drag.anchorY + (drag.startCenterY - drag.anchorY) * scale - bounds.top) / bounds.height) * 100;
        if (object.type === "text") {
          return { ...object, x, y, fontSize: Math.min(200, Math.max(8, Math.round(drag.startFontSize * scale))) };
        }
        if (object.type === "image") {
          return { ...object, x, y, width: Math.max(3, drag.startWidth * scale) };
        }
        return object;
      }));
      return;
    }
    if (drag.type === "resize-group") {
      const pointerX = ((event.clientX - bounds.left) / bounds.width) * 100;
      const pointerY = ((event.clientY - bounds.top) / bounds.height) * 100;
      const x = drag.corner.includes("left") ? Math.min(pointerX, drag.anchorX - 0.1) : Math.max(pointerX, drag.anchorX + 0.1);
      const y = drag.corner.includes("top") ? Math.min(pointerY, drag.anchorY - 0.1) : Math.max(pointerY, drag.anchorY + 0.1);
      const width = Math.max(0.2, Math.abs(x - drag.anchorX));
      const height = Math.max(0.2, Math.abs(y - drag.anchorY));
      setObjects((current) => updateObjectById(current, drag.id, {
        x: (x + drag.anchorX) / 2,
        y: (y + drag.anchorY) / 2,
        width,
        height,
      }));
      return;
    }
    const rawX = ((event.clientX - bounds.left - drag.pointerOffsetX) / bounds.width) * 100;
    const rawY = ((event.clientY - bounds.top - drag.pointerOffsetY) / bounds.height) * 100;
    const gridSize = 2;

    const pointerDeltaX = rawX - drag.startX;
    const pointerDeltaY = rawY - drag.startY;
    const deltaX = snapGridEnabled ? Math.round(pointerDeltaX / gridSize) * gridSize : pointerDeltaX;
    const deltaY = snapGridEnabled ? Math.round(pointerDeltaY / gridSize) * gridSize : pointerDeltaY;
    setObjects((current) => {
      let next = current;
      for (const id of drag.ids) {
        const object = findObject(next, id);
        const start = drag.startPositions.find((position) => position.id === id);
        if (!object || !start) continue;
        const initialObject = { ...object, x: start.x, y: start.y };
        const parentGroup = drag.groupEdit ? findParentGroup(next, id) : null;
        next = updateObjectById(next, id, positionAfterCanvasDelta(initialObject, deltaX, deltaY, parentGroup));
      }
      return next;
    });
  }

  function captureProject() {
    const savedPages = pages.map((page) => (
      page.id === currentPageId ? { ...page, objects } : page
    ));
    return {
      version: 2,
      canvasSize,
      customWidth,
      customHeight,
      background,
      backgroundMode,
      backgroundImage,
      backgroundGradientColors,
      backgroundGradientThirdEnabled,
      backgroundGradientAngle,
      selectedIslamicBackgroundId,
      backgroundOverlayEnabled,
      backgroundOverlayOpacity,
      objects,
      pages: savedPages,
      currentPageId,
      templateName,
      snapGridEnabled,
    };
  }

  function persistProject(name, overwriteId = null) {
    const projects = readProjects();
    const existing = overwriteId ? projects.find((project) => project.id === overwriteId) : null;
    if (overwriteId && !existing) throw new Error("That saved project no longer exists. Refresh the project list and try again.");
    const record = createProjectRecord(name, captureProject(), existing?.id ?? null);
    const nextProjects = existing
      ? projects.map((project) => project.id === existing.id ? record : project)
      : [...projects, record];
    writeProjects(nextProjects);
    setSavedProjects(nextProjects);
    setActiveProjectId(record.id);
    setActiveProjectName(record.name);
  }

  async function refreshTemplateList() {
    const templates = await readTemplates();
    setSavedTemplates(templates);
    setTemplateStorageError("");
    return templates;
  }

  function createTemplatePreview() {
    return new Promise((resolve, reject) => {
      downloadPoster("png", { mode: "poster", color: "#ffffff" }, resolve, reject);
    });
  }

  function verifyTemplateAssets(project) {
    const sources = new Set();
    if (project.backgroundImage) sources.add(project.backgroundImage);
    const visit = (list) => {
      if (!Array.isArray(list)) return;
      for (const object of list) {
        if (object.type === "image" && object.src) sources.add(object.src);
        if (object.type === "text" && object.fillMode === "image" && object.imageFillSrc) sources.add(object.imageFillSrc);
        if (object.type === "group") visit(object.children);
      }
    };
    visit(project.objects);
    (project.pages ?? []).forEach((page) => visit(page.objects));
    return Promise.all([...sources].map((source) => new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => image.naturalWidth > 0
        ? resolve()
        : reject(new Error("A template image asset has no valid image dimensions."));
      image.onerror = () => reject(new Error("A template image asset could not be decoded. The template data was left unchanged."));
      image.src = source;
    })));
  }

  async function openSaveTemplateDialog() {
    if (!canEditTemplates) return;
    setTemplateStorageError("");
    try {
      await verifyTemplateAssets(captureProject());
      setTemplatePreview(await createTemplatePreview());
      setTemplateSaveOpen(true);
    } catch (previewError) {
      setTemplateStorageError(previewError.message || "The poster preview could not be created.");
    }
  }

  async function persistTemplate(name, category) {
    if (!canEditTemplates) throw new Error("Enable Local Admin Mode to manage templates.");
    const project = captureProject();
    await verifyTemplateAssets(project);
    const currentTemplates = await readTemplates();
    const order = currentTemplates.reduce((highest, template) => Math.max(highest, template.order ?? -1), -1) + 1;
    const record = createTemplateRecord(name, category, project, templatePreview, null, order);
    await writeTemplate(record);
    await refreshTemplateList();
  }

  async function updateTemplateMetadata(template, values) {
    if (!canEditTemplates) throw new Error("Enable Local Admin Mode to manage templates.");
    const name = values.name.trim();
    const category = values.category.trim();
    if (!name || !category) throw new Error("Template name and category are required.");
    const templates = await readTemplates();
    const existing = templates.find((item) => item.id === template.id);
    if (!existing) throw new Error("That template no longer exists. Refresh the template list and try again.");
    await writeTemplate({ ...existing, name, category, updatedAt: Date.now() });
    await refreshTemplateList();
  }

  async function moveTemplate(templateId, direction) {
    if (!canEditTemplates) throw new Error("Enable Local Admin Mode to manage templates.");
    const templates = await readTemplates();
    const index = templates.findIndex((template) => template.id === templateId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= templates.length) return;
    const first = templates[index];
    const second = templates[nextIndex];
    await writeTemplate({ ...first, order: second.order, updatedAt: Date.now() });
    await writeTemplate({ ...second, order: first.order, updatedAt: Date.now() });
    await refreshTemplateList();
  }

  async function replaceTemplate(template) {
    if (!canEditTemplates) throw new Error("Enable Local Admin Mode to manage templates.");
    const templates = await readTemplates();
    const existing = templates.find((item) => item.id === template.id);
    if (!existing) throw new Error("That template no longer exists. Refresh the template list and try again.");
    await verifyTemplateAssets(existing.project);
    const preview = await createTemplatePreview();
    const project = captureProject();
    await verifyTemplateAssets(project);
    const updated = createTemplateRecord(
      existing.name,
      existing.category,
      project,
      preview,
      existing.id,
      existing.order,
      Date.now(),
    );
    updated.createdAt = existing.createdAt;
    await writeTemplate(updated);
    await refreshTemplateList();
  }

  async function removeTemplate(template) {
    if (!canEditTemplates) throw new Error("Enable Local Admin Mode to manage templates.");
    const templates = await readTemplates();
    const existing = templates.find((item) => item.id === template.id);
    if (!existing) throw new Error("That template no longer exists. Refresh the template list and try again.");
    await verifyTemplateAssets(existing.project);
    await deleteTemplate(template.id);
    await refreshTemplateList();
  }

  async function openSavedTemplate(template) {
    const storedTemplates = await readTemplates();
    const storedTemplate = storedTemplates.find((item) => item.id === template.id);
    if (!storedTemplate) throw new Error("That template no longer exists. Refresh the gallery and try again.");
    await verifyTemplateAssets(storedTemplate.project);
    const workingCopy = JSON.parse(JSON.stringify(storedTemplate.project));
    workingCopy.templateName = storedTemplate.name;
    applyProject(workingCopy, null, "");
  }

  function selectTemplate(template) {
    if (template.source === "saved") {
      openSavedTemplate(template).catch((loadError) => {
        setTemplateStorageError(loadError.message || "This template could not be opened.");
      });
      return;
    }
    openTemplate(template);
  }

  function updateProject(projectId) {
    const projects = readProjects();
    const existing = projects.find((project) => project.id === projectId);
    if (!existing) throw new Error("That saved project no longer exists. Refresh the project list and try again.");
    const updated = createProjectRecord(existing.name, captureProject(), existing.id);
    const nextProjects = projects.map((project) => project.id === projectId ? updated : project);
    writeProjects(nextProjects);
    setSavedProjects(nextProjects);
    setActiveProjectId(updated.id);
    setActiveProjectName(updated.name);
  }

  function renameProject(projectId, name) {
    const projects = readProjects();
    const existing = projects.find((project) => project.id === projectId);
    if (!existing) throw new Error("That saved project no longer exists. Refresh the project list and try again.");
    const updated = { ...existing, name, updatedAt: Date.now() };
    const nextProjects = projects.map((project) => project.id === projectId ? updated : project);
    writeProjects(nextProjects);
    setSavedProjects(nextProjects);
    if (activeProjectId === projectId) setActiveProjectName(name);
  }

  function deleteProject(projectId) {
    const nextProjects = readProjects().filter((project) => project.id !== projectId);
    writeProjects(nextProjects);
    setSavedProjects(nextProjects);
    if (activeProjectId === projectId) {
      setActiveProjectId(null);
      setActiveProjectName("");
    }
  }

  function openProjectsDialog() {
    let projects = [];
    let error = "";
    try {
      projects = readProjects();
    } catch (loadError) {
      error = loadError.message || "Saved projects could not be loaded.";
    }
    setSavedProjects(projects);
    setProjectStorageError(error);
    setProjectDialogOpen(true);
  }

  function saveProject() {
    openProjectsDialog();
  }

  function toggleEditorMenu(event) {
    const activeMenu = event.currentTarget.parentElement;
    window.setTimeout(() => {
      if (!activeMenu.open) return;
      document.querySelectorAll(".editor-menu[open]").forEach((menu) => {
        if (menu !== activeMenu) menu.open = false;
      });
    }, 0);
  }

  function closeEditorMenuAfterAction(event) {
    if (!event.target.closest("button")) return;
    const menu = event.currentTarget;
    window.setTimeout(() => { menu.open = false; }, 0);
  }

  function togglePropertyAccordion(event) {
    const summary = event.target.closest(".text-section > summary");
    if (!summary) return;
    const activeSection = summary.parentElement;
    window.setTimeout(() => {
      if (!activeSection.open) return;
      activeSection.parentElement.querySelectorAll(".text-section[open]").forEach((section) => {
        if (section !== activeSection) section.open = false;
      });
    }, 0);
  }

  function applyProject(project, projectId = null, projectName = "") {
    if (!project || typeof project !== "object") throw new Error("This project file does not contain a valid poster.");
    setCanvasViewOffset({ x: 0, y: 0 });
    setCanvasSize(project.canvasSize || "Square 1080x1080");
    setCustomWidth(project.customWidth || 1080);
    setCustomHeight(project.customHeight || 1080);
    setBackground(project.background || "#ffffff");
    setBackgroundMode(project.backgroundMode || "solid");
    setBackgroundImage(project.backgroundImage || null);
    const savedGradientColors = project.backgroundGradientColors;
    setBackgroundGradientColors(
      Array.isArray(savedGradientColors) && savedGradientColors.length >= 3 && savedGradientColors.slice(0, 3).every((color) => typeof color === "string")
        ? savedGradientColors.slice(0, 3)
        : ["#10261f", "#31704b", "#ddbf72"],
    );
    setBackgroundGradientThirdEnabled(Boolean(project.backgroundGradientThirdEnabled));
    setBackgroundGradientAngle(Number.isFinite(project.backgroundGradientAngle) ? project.backgroundGradientAngle : 35);
    setSelectedIslamicBackgroundId(project.selectedIslamicBackgroundId || null);
    setBackgroundOverlayEnabled(Boolean(project.backgroundOverlayEnabled));
    setBackgroundOverlayOpacity(Number.isFinite(project.backgroundOverlayOpacity) ? project.backgroundOverlayOpacity : 25);

    const importedObjects = Array.isArray(project.objects) ? project.objects : [];
    const importedPages = Array.isArray(project.pages) && project.pages.length
      ? project.pages.map((page, index) => ({
          ...page,
          id: page.id ?? index + 1,
          name: page.name || `Page ${index + 1}`,
          objects: Array.isArray(page.objects) ? page.objects : [],
        }))
      : [{ id: 1, name: "Page 1", objects: importedObjects }];
    const pageId = importedPages.some((page) => String(page.id) === String(project.currentPageId))
      ? importedPages.find((page) => String(page.id) === String(project.currentPageId)).id
      : importedPages[0].id;
    const activePage = importedPages.find((page) => page.id === pageId);
    setPages(importedPages);
    setCurrentPageId(pageId);
    setObjects(Array.isArray(project.pages) && project.pages.length ? activePage.objects : importedObjects);
    setSelectedId(null);
    setSelectedIds([]);
    changePathDraft(null);
    setActiveTool("select");
    setGroupEditMode(false);
    setGroupEditGroupId(null);
    setGroupEditMode(false);
    setGroupEditGroupId(null);
    setHistory([]);
    setRedoStack([]);
    setTemplateName(project.templateName || "Create New Poster");
    setSnapGridEnabled(project.snapGridEnabled ?? true);
    setActiveProjectId(projectId);
    setActiveProjectName(projectName);
    setEditor(true);
    setProjectDialogOpen(false);
  }

  function downloadProjectBackup() {
    const blob = new Blob([JSON.stringify(captureProject(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const safeName = Array.from(activeProjectName || templateName || "islamic-poster", (character) => (
      /[<>:"/\\|?*]/.test(character) || character.charCodeAt(0) < 32 ? "-" : character
    )).join("");
    link.download = `${safeName}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

 function loadProject(event) {

  const file =
    event.target.files?.[0];

  if (!file) return;

  const reader =
    new FileReader();

  reader.onload = () => {
    try {
      const project = JSON.parse(reader.result);
      applyProject(project);
    } catch (loadError) {
      window.alert(loadError.message || "This project file could not be opened.");
    }
  };

  reader.onerror = () => window.alert("The selected project file could not be read.");

  reader.readAsText(file);

  event.target.value = "";
}

  function openExport(format) {
    setExportInitialFormat(format);
    setExportDialogOpen(true);
  }

  function downloadPoster(format, exportBackground, onRendered = null, onError = null) {
    const outputObjects = flattenGroups(objects);
    const output = document.createElement("canvas");
    output.width = dimensions.width;
    output.height = dimensions.height;
    const context = output.getContext("2d");
    const exportBackgroundMode = format === "jpg" && exportBackground.mode === "transparent"
      ? "white"
      : exportBackground.mode;
    if (exportBackgroundMode === "poster") {
      if (backgroundMode === "gradient") {
        const angle = (backgroundGradientAngle * Math.PI) / 180;
        const radius = Math.hypot(output.width, output.height) / 2;
        const gradient = context.createLinearGradient(
          output.width / 2 - Math.cos(angle) * radius,
          output.height / 2 - Math.sin(angle) * radius,
          output.width / 2 + Math.cos(angle) * radius,
          output.height / 2 + Math.sin(angle) * radius,
        );
        activeGradientColors.forEach((color, index) => gradient.addColorStop(index / (activeGradientColors.length - 1), color));
        context.fillStyle = gradient;
      } else {
        context.fillStyle = background;
      }
      context.fillRect(0, 0, output.width, output.height);
    } else if (exportBackgroundMode === "white" || exportBackgroundMode === "custom") {
      context.fillStyle = exportBackgroundMode === "custom" ? exportBackground.color : "#ffffff";
      context.fillRect(0, 0, output.width, output.height);
    }
    const scaleX = output.width / canvasRef.current.clientWidth;
    const scaleY = output.height / canvasRef.current.clientHeight;
    const pendingBackground = exportBackgroundMode === "poster" && activeBackgroundImage
      ? new Promise((resolve) => {
          const image = new Image();
          image.crossOrigin = "anonymous";
          image.onload = () => resolve(image);
          image.onerror = () => resolve(null);
          image.src = activeBackgroundImage;
        })
      : Promise.resolve(null);
    const pendingImages = outputObjects.filter((object) => object.type === "image" || (object.type === "shape" && islamicShapes.some((shape) => shape.id === object.shape)));
    const images = pendingImages.map((object) => new Promise((resolve) => {
      const image = new Image();

      image.onload = () => resolve({ object, image });
      image.onerror = () => resolve(null);
      image.src = object.type === "shape"
        ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(getShapeSvgMarkup(object.shape, object.color))}`
        : object.src;
    }));
    const pendingTextFillImages = outputObjects.filter((object) => object.type === "text" && object.fillMode === "image" && object.imageFillSrc);
    const textFillImages = pendingTextFillImages.map((object) => new Promise((resolve) => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => resolve({ object, image });
      image.onerror = () => resolve(null);
      image.src = object.imageFillSrc;
    }));
    const fontLoads = outputObjects.filter((object) => object.type === "text").map((object) => {
      const font = `${object.italic ? "italic " : ""}${object.bold ? "bold " : ""}${object.fontSize * scaleX}px ${object.fontFamily ?? "Arial, sans-serif"}`;
      return document.fonts.load(font, object.text).catch(() => []);
    });

    Promise.all([pendingBackground, ...images, ...textFillImages, ...fontLoads]).then(([loadedBackground, ...loadedAssets]) => {
      const loadedImages = loadedAssets.slice(0, images.length);
      const loadedTextFillImages = loadedAssets.slice(images.length, images.length + textFillImages.length);
      if (loadedBackground) {
        const coverScale = Math.max(output.width / loadedBackground.width, output.height / loadedBackground.height);
        const width = loadedBackground.width * coverScale;
        const height = loadedBackground.height * coverScale;
        context.drawImage(loadedBackground, (output.width - width) / 2, (output.height - height) / 2, width, height);
      }
      if (exportBackgroundMode === "poster" && backgroundOverlayEnabled) {
        context.fillStyle = `rgba(0, 0, 0, ${backgroundOverlayOpacity / 100})`;
        context.fillRect(0, 0, output.width, output.height);
      }
      const posterContext = context;
      context.save();
      context.beginPath();
      context.rect(0, 0, output.width, output.height);
      context.clip();
      outputObjects.forEach((object) => {
        const masks = [...(object.transparencyMasks ?? []), ...(object.transparencyMask ? [object.transparencyMask] : [])];
        const needsLayer = (object.opacity ?? 100) < 100 || masks.length > 0 || (object.type === "image" && object.alphaMask?.paths?.length);
        const objectLayer = needsLayer ? document.createElement("canvas") : null;
        if (objectLayer) {
          objectLayer.width = output.width;
          objectLayer.height = output.height;
        }
        const context = objectLayer ? objectLayer.getContext("2d") : posterContext;
        const x = (object.x / 100) * output.width;
        const y = (object.y / 100) * output.height;
        if (object.type === "text") {
          const previewText = [...canvasRef.current.querySelectorAll(".canvas-text")]
            .find((element) => element.dataset.objectId === String(object.id));
          const previewWidth = previewText
            ? Number.parseFloat(window.getComputedStyle(previewText).width)
            : canvasRef.current.clientWidth * 0.9;
          const textFillImage = loadedTextFillImages.find((item) => item?.object.id === object.id)?.image ?? null;
          drawTextObject(context, object, x, y, scaleX, scaleY, previewWidth * scaleX, textFillImage);
        } else if (object.type === "shape") {
          context.save();
          context.translate(x, y);
          context.rotate(((object.rotation ?? 0) * Math.PI) / 180);
          context.scale(object.flipHorizontal ? -1 : 1, object.flipVertical ? -1 : 1);
          const vectorShape = islamicShapes.some((shape) => shape.id === object.shape);
          if (object.shape === "custom") {
            const width = ((object.width ?? 38) / 100) * output.width;
            const height = ((object.height ?? 38) / 100) * output.height;
            context.translate(-width / 2, -height / 2);
            context.scale(width / 100, height / 100);
            const path = new Path2D(pathToSvg(object.paths ?? []));
            if (object.fillEnabled !== false) {
              context.fillStyle = object.color ?? "#d5ad62";
              context.fill(path, object.fillRule ?? "evenodd");
            }
            if (object.strokeEnabled) {
              context.strokeStyle = object.strokeColor ?? object.color ?? "#17352c";
              context.lineWidth = (object.strokeWidth ?? 1) * 100 / Math.max(width, height);
              context.stroke(path);
            }
          } else if (vectorShape) {
            const loaded = loadedImages.find((item) => item?.object.id === object.id);
            if (loaded) {
              const width = ((object.width ?? 38) / 100) * output.width;
              const height = ((object.height ?? 38) / 100) * output.height;
              context.drawImage(loaded.image, -width / 2, -height / 2, width, height);
            }
          } else {
            context.fillStyle = object.color;
            const width = (object.width ?? 140) * scaleX;
            const height = (object.height ?? 16) * scaleY;
            if (object.shape === "circle-outline") {
              context.beginPath();
              context.ellipse(0, 0, width / 2, height / 2, 0, 0, Math.PI * 2);
              context.strokeStyle = object.color;
              context.lineWidth = 2 * scaleX;
              context.stroke();
            } else if (object.shape === "circle") {
              context.beginPath();
              context.ellipse(0, 0, width / 2, height / 2, 0, 0, Math.PI * 2);
              context.fill();
            } else {
              context.fillRect(-width / 2, -height / 2, width, height);
            }
          }
          context.restore();
        } else {
          const loaded = loadedImages.find((item) => item?.object.id === object.id);
          if (loaded) {
            const width = ((object.width ?? 36) / 100) * output.width;
            const height = width * (loaded.image.height / loaded.image.width);
            context.save();
            context.translate(x, y);
            context.rotate(((object.rotation ?? 0) * Math.PI) / 180);
            context.scale(object.flipHorizontal ? -1 : 1, object.flipVertical ? -1 : 1);
            context.drawImage(loaded.image, -width / 2, -height / 2, width, height);
            context.restore();
          }
        }
        if (object.type === "image" && object.alphaMask?.paths?.length) {
          const width = ((object.width ?? 36) / 100) * output.width;
          const loaded = loadedImages.find((item) => item?.object.id === object.id);
          const height = loaded ? width * loaded.image.height / loaded.image.width : width;
          context.save();
          context.globalCompositeOperation = "destination-in";
          context.translate(x, y);
          context.rotate(((object.rotation ?? 0) * Math.PI) / 180);
          context.scale(object.flipHorizontal ? -1 : 1, object.flipVertical ? -1 : 1);
          context.translate(-width / 2, -height / 2);
          context.scale(width / 100, height / 100);
          context.fillStyle = "#fff";
          context.fill(new Path2D(pathToSvg(object.alphaMask.paths)), "evenodd");
          context.restore();
        }
        if (masks.length) {
          const content = canvasRef.current.querySelector(`.canvas-control-object[data-object-id="${CSS.escape(String(object.id))}"] .canvas-object-content`);
          let maskWidth = (content?.offsetWidth ?? canvasRef.current.clientWidth * 0.4) * scaleX;
          let maskHeight = (content?.offsetHeight ?? canvasRef.current.clientHeight * 0.2) * scaleY;
          if (object.type === "image") {
            maskWidth = ((object.width ?? 36) / 100) * output.width;
            const loaded = loadedImages.find((item) => item?.object.id === object.id);
            if (loaded) maskHeight = maskWidth * loaded.image.height / loaded.image.width;
          } else if (object.type === "shape" && object.shape === "custom") {
            maskWidth = ((object.width ?? 38) / 100) * output.width;
            maskHeight = ((object.height ?? 38) / 100) * output.height;
          }
          context.save();
          context.globalCompositeOperation = "destination-in";
          context.translate(x, y);
          context.rotate(((object.rotation ?? 0) * Math.PI) / 180);
          context.scale(object.flipHorizontal ? -1 : 1, object.flipVertical ? -1 : 1);
          masks.forEach((mask) => {
            const normalized = normalizeTransparencyMask(mask);
            const points = normalized.stops;
            let gradient;
            if (normalized.type === "radial") {
              const centerX = maskWidth * normalized.centerX / 100;
              const centerY = maskHeight * normalized.centerY / 100;
              context.save();
              context.translate(centerX, centerY);
              context.scale(1, maskHeight / maskWidth);
              gradient = context.createRadialGradient(0, 0, 0, 0, 0, Math.max(1, maskWidth * normalized.radius / 100));
              context.restore();
            } else {
              const vectors = {
                "top-bottom": [0.5, 0, 0.5, 1],
                "bottom-top": [0.5, 1, 0.5, 0],
                "left-right": [0, 0.5, 1, 0.5],
                "right-left": [1, 0.5, 0, 0.5],
                "top-left-bottom-right": [0, 0, 1, 1],
                "bottom-right-top-left": [1, 1, 0, 0],
                "top-right-bottom-left": [1, 0, 0, 1],
                "bottom-left-top-right": [0, 1, 1, 0],
              };
              const [x1, y1, x2, y2] = vectors[normalized.direction] ?? vectors["left-right"];
              gradient = context.createLinearGradient(x1 * maskWidth, y1 * maskHeight, x2 * maskWidth, y2 * maskHeight);
            }
            points.forEach((stop, index) => {
              if (normalized.hard && index > 0) {
                gradient.addColorStop(Math.max(0, stop.offset - 0.1) / 100, `rgba(255,255,255,${points[index - 1].opacity / 100})`);
              }
              gradient.addColorStop(stop.offset / 100, `rgba(255,255,255,${stop.opacity / 100})`);
            });
            context.fillStyle = gradient;
            context.fillRect(-maskWidth / 2, -maskHeight / 2, maskWidth, maskHeight);
          });
          context.restore();
        }
        if (objectLayer) {
          posterContext.save();
          posterContext.globalAlpha = (object.opacity ?? 100) / 100;
          posterContext.drawImage(objectLayer, 0, 0);
          posterContext.restore();
        }
      });
      posterContext.restore();
      if (onRendered) {
        const preview = document.createElement("canvas");
        const previewScale = Math.min(1, 420 / output.width, 520 / output.height);
        preview.width = Math.max(1, Math.round(output.width * previewScale));
        preview.height = Math.max(1, Math.round(output.height * previewScale));
        preview.getContext("2d").drawImage(output, 0, 0, preview.width, preview.height);
        onRendered(preview.toDataURL("image/png"));
        return;
      }
      const mime = format === "jpg" ? "image/jpeg" : format === "webp" ? "image/webp" : "image/png";
      output.toBlob((blob) => {
        if (!blob) {
          const error = new Error("The poster could not be encoded. Try a smaller canvas size.");
          if (onError) onError(error);
          else window.alert(error.message);
          return;
        }
        if (blob.type !== mime) {
          const error = new Error(`${format.toUpperCase()} export is not supported by this browser. Choose PNG or JPG instead.`);
          if (onError) onError(error);
          else window.alert(error.message);
          return;
        }
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.download = `islamic-poster.${format}`;
        link.href = url;
        document.body.append(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        if (typeof exportBackground.onComplete === "function") exportBackground.onComplete({ size: blob.size, format });
      }, mime, format === "png" ? undefined : (exportBackground.quality ?? 0.85));
    }).catch((renderError) => {
      const error = new Error(`Poster preview or export could not be rendered: ${renderError.message || "unknown rendering error"}`);
      if (onError) {
        onError(error);
      } else {
        window.alert(error.message);
      }
    });
  }

  function renderCanvasObject(object, interactive) {
    const vectorShape = object.type === "shape" && (object.shape === "custom" || islamicShapes.some((shape) => shape.id === object.shape));
    const transparencyMasks = [...(object.transparencyMasks ?? []), ...(object.transparencyMask ? [object.transparencyMask] : [])];
    const gradientMask = transparencyMasks.map(transparencyCss).filter(Boolean).join(", ");
    const sourceMask = object.type === "image" ? imageMaskSvg(object.alphaMask) : null;
    const maskImages = [gradientMask, sourceMask].filter(Boolean).join(", ") || undefined;
    const selected = interactive && selectedIds.includes(object.id) && (!object.groupId || groupEditMode);
    const groupSelection = interactive && object.type === "group" && selectedIds.includes(object.id);
    return (
      <div
        key={`${interactive ? "control" : "art"}-${object.id}`}
        data-object-id={object.id}
        data-group-id={object.type === "group" ? object.id : undefined}
        className={`canvas-object ${interactive ? "canvas-control-object" : "canvas-art-object"}${selected ? " is-selected" : ""}${object.type === "group" ? " is-group-container" : ""}`}
        style={{
          left: `${object.x}%`,
          top: `${object.y}%`,
          width: object.type === "image" ? `${object.width ?? 36}%` : vectorShape || object.type === "group" ? `${object.width}%` : undefined,
          height: vectorShape || object.type === "group" ? `${object.height}%` : undefined,
          transform: `translate(-50%, -50%) rotate(${object.rotation ?? 0}deg)`,
        }}
        onPointerDown={interactive && object.type !== "group" ? (event) => moveObject(event, object) : undefined}
        onClick={interactive && object.type !== "group" && ["select", "multi", "node"].includes(activeTool) ? (event) => {
          event.stopPropagation();
          const targetId = object.groupId && !groupEditMode ? object.groupId : object.id;
          if (event.shiftKey || event.ctrlKey || event.metaKey || activeTool === "multi") selectObject(targetId, true);
          else if (selectedId !== targetId || selectedIds.length !== 1) selectObject(targetId);
        } : undefined}
      >
        <div className={`canvas-object-content${object.type === "image" ? " canvas-object-content--image" : ""}`} style={{
          transform: `scale(${object.flipHorizontal ? -1 : 1}, ${object.flipVertical ? -1 : 1})`,
          opacity: (object.opacity ?? 100) / 100,
          maskImage: maskImages,
          WebkitMaskImage: maskImages,
          maskSize: maskImages ? "100% 100%" : undefined,
          WebkitMaskSize: maskImages ? "100% 100%" : undefined,
          maskRepeat: maskImages ? "no-repeat" : undefined,
          WebkitMaskRepeat: maskImages ? "no-repeat" : undefined,
          maskComposite: transparencyMasks.length && sourceMask ? "intersect" : undefined,
          WebkitMaskComposite: transparencyMasks.length && sourceMask ? "source-in" : undefined,
        }}>
          {object.type === "text" && <span className="canvas-text" data-object-id={object.id} dir={object.direction ?? "auto"} style={getTextTypographyStyle(object)}>
            <span className="canvas-text-layer canvas-text-outline" dir={object.direction ?? "auto"} aria-hidden="true" style={getTextStrokeStyle(object)}>{object.text}</span>
            <span className="canvas-text-layer canvas-text-fill" dir={object.direction ?? "auto"} style={{ ...getTextPreviewStyle({ ...object, strokeEnabled: false, opacity: 100 }), WebkitTextStroke: "0 transparent", paintOrder: "normal" }}>{object.text}</span>
          </span>}
          {vectorShape && <ShapeArtwork shape={object.shape} color={object.color} className="canvas-vector-shape" />}
          {object.shape === "custom" && <svg className="canvas-vector-shape canvas-custom-vector" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d={pathToSvg(object.paths ?? [])} fill={object.fillEnabled === false ? "none" : object.color ?? "#d5ad62"} fillRule={object.fillRule ?? "evenodd"} stroke={object.strokeEnabled ? object.strokeColor ?? "#17352c" : "none"} strokeWidth={object.strokeWidth ?? 1} vectorEffect="non-scaling-stroke" />
          </svg>}
          {object.type === "shape" && !vectorShape && <span className={`canvas-shape shape-${object.shape ?? "line"}`} style={{ width: `${object.width ?? 140}px`, height: `${object.height ?? 16}px`, backgroundColor: object.shape === "circle-outline" ? "transparent" : object.color, borderColor: object.color }} />}
          {object.type === "image" && <img className="canvas-image" src={object.src} alt="Uploaded poster element" />}
        </div>
        {selected && !object.locked && resizeCorners.map((corner) => (
          <button
            key={corner.id}
            type="button"
            className={`resize-handle resize-handle--${corner.id}`}
            data-resize-corner={corner.id}
            aria-label={`Resize selected ${object.type} from ${corner.label}`}
            onPointerDown={(event) => resizeObject(event, object, corner)}
          />
        ))}
        {interactive && object.type === "group" && groupSelection && <div className="group-selection-outline" data-group-id={object.id} onPointerDown={(event) => moveObject(event, object)}>
          {resizeCorners.map((corner) => <button key={corner.id} type="button" className={`resize-handle resize-handle--${corner.id}`} data-resize-corner={corner.id} aria-label={`Resize group from ${corner.label}`} onPointerDown={(event) => resizeGroup(event, object, corner)} />)}
        </div>}
        {interactive && selected && object.shape === "custom" && activeTool === "node" && <svg className="vector-node-overlay" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ transform: `scale(${object.flipHorizontal ? -1 : 1}, ${object.flipVertical ? -1 : 1})` }}>
          {(object.paths ?? []).map((path, pathIndex) => path.nodes.map((node, nodeIndex) => <g key={`${pathIndex}-${nodeIndex}`}>
            {node.out && (node.out.x || node.out.y) && <><line x1={node.x} y1={node.y} x2={node.x + node.out.x} y2={node.y + node.out.y} /><circle className="vector-node-handle" cx={node.x + node.out.x} cy={node.y + node.out.y} r="2" onPointerDown={(event) => beginNodeDrag(event, object, pathIndex, nodeIndex, "out")} /></>}
            {node.in && (node.in.x || node.in.y) && <><line x1={node.x} y1={node.y} x2={node.x + node.in.x} y2={node.y + node.in.y} /><circle className="vector-node-handle" cx={node.x + node.in.x} cy={node.y + node.in.y} r="2" onPointerDown={(event) => beginNodeDrag(event, object, pathIndex, nodeIndex, "in")} /></>}
            <circle className={`vector-node${selectedNodeIndex === nodeIndex ? " is-active" : ""}`} cx={node.x} cy={node.y} r="2.5" onPointerDown={(event) => beginNodeDrag(event, object, pathIndex, nodeIndex)} />
          </g>))}
        </svg>}
      </div>
    );
  }

  const renderableObjects = flattenGroups(objects);

  if (editor) {
    return (
      <div className="editor-page">
        <header className="editor-topbar">
          <button className="back-btn" onClick={() => setEditor(false)}>← Back</button>
          <div className="editor-brand"><span className="logo"><img src="/logo.png" alt="" /></span><div><strong>Qadri Poster Maker</strong><small>{activeProjectName || templateName}</small></div></div>
          <nav className="editor-menu-bar" aria-label="Editor actions">
            <details id="editor-menu-add" className="editor-menu" onClick={closeEditorMenuAfterAction}>
              <summary title="Add text, images and shapes" onClick={toggleEditorMenu}><span>＋</span>Add</summary>
              <div className="editor-menu-panel">
                <button type="button" onClick={addText}>Add Text</button>
                <button type="button" onClick={() => uploadRef.current?.click()}>{selectedObject?.type === "image" ? "Replace Image" : "Upload Image"}</button>
                <button type="button" onClick={() => setShapePickerOpen(true)}>Add Shape</button>
                <button type="button" onClick={() => backgroundUploadRef.current?.click()}>Background Image</button>
              </div>
            </details>
            <details id="editor-menu-edit" className="editor-menu" onClick={closeEditorMenuAfterAction}>
              <summary title="Edit and duplicate the selected object" onClick={toggleEditorMenu}><span>✎</span>Edit</summary>
              <div className="editor-menu-panel">
                {selectedObject?.type === "image" && <button type="button" onClick={() => setEditingImageId(selectedObject.id)}>Edit Image / Background Remover</button>}
                {selectedObject && <button type="button" onClick={() => flipSelected("horizontal")}>Flip Horizontal</button>}
                {selectedObject && <button type="button" onClick={() => flipSelected("vertical")}>Flip Vertical</button>}
                <button type="button" disabled={!selectedObject} onClick={duplicateSelected}>Duplicate Selected</button>
                <button type="button" className="editor-menu-danger" disabled={!selectedObject} onClick={() => {
                  deleteSelectedObjects();
                }}>Delete Selected</button>
              </div>
            </details>
            <details id="editor-menu-vector" className="editor-menu" onClick={closeEditorMenuAfterAction}>
              <summary title="Draw, edit nodes and combine vector shapes" onClick={toggleEditorMenu}><span>⌘</span>Vector</summary>
              <div className="editor-menu-panel editor-menu-panel-wide vector-menu-panel">
                <div className="vector-tool-row">
                  <button type="button" className={activeTool === "select" ? "is-current" : ""} onClick={() => { setActiveTool("select"); changePathDraft(null); }}>Select</button>
                  <button type="button" className={activeTool === "multi" ? "is-current" : ""} onClick={() => { setActiveTool("multi"); changePathDraft(null); }}>Multi-select</button>
                  <button type="button" className={activeTool === "freehand" ? "is-current" : ""} onClick={() => { setActiveTool("freehand"); changePathDraft(null); }}>Freehand</button>
                  <button type="button" className={activeTool === "pen" ? "is-current" : ""} onClick={() => { setActiveTool("pen"); changePathDraft(null); }}>Pen / Bezier</button>
                  <button type="button" disabled={selectedObject?.shape !== "custom"} className={activeTool === "node" ? "is-current" : ""} onClick={() => { setActiveTool("node"); setSelectedNodeIndex(null); }}>Node edit</button>
                </div>
                {(activeTool === "freehand" || activeTool === "pen") && <>
                  <label className="effect-toggle"><input type="checkbox" checked={closedDrawing} onChange={(event) => setClosedDrawing(event.target.checked)} />Close freehand paths</label>
                  <label className="editor-menu-color"><span>Fill</span><input aria-label="Vector fill color" type="color" value={vectorFill} onChange={(event) => setVectorFill(event.target.value)} /></label>
                  <label className="editor-menu-color"><span>Stroke</span><input aria-label="Vector stroke color" type="color" value={vectorStroke} onChange={(event) => setVectorStroke(event.target.value)} /></label>
                  <label className="vector-stroke-control">Stroke width<input aria-label="Vector stroke width" type="range" min="0.5" max="12" step="0.5" value={vectorStrokeWidth} onChange={(event) => setVectorStrokeWidth(Number(event.target.value))} /></label>
                  <label className="vector-stroke-control">Opacity<input aria-label="Vector opacity" type="range" min="0" max="100" value={vectorOpacity} onChange={(event) => setVectorOpacity(Number(event.target.value))} /></label>
                  <label className="effect-toggle"><input type="checkbox" checked={fillEnabled} onChange={(event) => setFillEnabled(event.target.checked)} />Enable fill</label>
                  <label className="effect-toggle"><input type="checkbox" checked={strokeEnabled} onChange={(event) => setStrokeEnabled(event.target.checked)} />Enable stroke</label>
                </>}
                {pathDraft && <>
                  <span className="vector-draft-status">{pathDraft.length} nodes · {activeTool === "pen" ? "Click-drag curves; Enter finish; Esc cancel" : "Release pointer to finish"}</span>
                  <div className="editor-menu-actions"><button type="button" onClick={() => finishDrawing()}>Finish path</button><button type="button" onClick={() => { changePathDraft(null); setActiveTool("select"); }}>Cancel</button></div>
                </>}
                <label className="vector-draft-status">{selectedIds.length} object{selectedIds.length === 1 ? "" : "s"} selected</label>
                <div className="editor-menu-actions">
                  <button type="button" disabled={selectedIds.length < 2} onClick={groupSelected}>Group</button>
                  <button type="button" disabled={selectedObject?.type !== "group"} onClick={ungroupSelected}>Ungroup</button>
                </div>
                {(selectedObject?.type === "group" || groupEditGroupId != null) && <button type="button" onClick={() => {
                  if (groupEditMode) {
                    setGroupEditMode(false);
                    setGroupEditGroupId(null);
                    selectObject(groupEditGroupId);
                  } else {
                    setGroupEditMode(true);
                    setGroupEditGroupId(selectedObject.id);
                  }
                }}>{groupEditMode ? "Exit group editing" : "Edit group contents"}</button>}
                <div className="editor-menu-actions">
                  <button type="button" disabled={selectedIds.length < 2} onClick={() => performBoolean("union")}>Weld</button>
                  <button type="button" disabled={selectedIds.length < 2} onClick={() => performBoolean("difference", keepTrimCutter)}>Trim</button>
                  <button type="button" disabled={selectedIds.length < 2} onClick={() => performBoolean("intersection")}>Intersect</button>
                </div>
                <label className="effect-toggle"><input type="checkbox" checked={trimTopIsCutter} onChange={(event) => setTrimTopIsCutter(event.target.checked)} />Use top layer as Trim cutter</label>
                <label className="effect-toggle"><input type="checkbox" checked={keepTrimCutter} onChange={(event) => setKeepTrimCutter(event.target.checked)} />Keep cutter after Trim</label>
                {selectedObject?.shape === "custom" && <>
                  <div className="editor-menu-actions">
                    <button type="button" onClick={addNodeToSelectedPath}>Add node</button>
                    <button type="button" disabled={selectedNodeIndex == null} onClick={removeSelectedNode}>Delete node</button>
                  </div>
                  <button type="button" disabled={selectedNodeIndex == null} onClick={toggleSelectedNodeType}>Toggle corner / smooth</button>
                </>}
                {vectorMessage && <p className="vector-message" role="status">{vectorMessage}</p>}
              </div>
            </details>
            <details id="editor-menu-arrange" className="editor-menu" onClick={closeEditorMenuAfterAction}>
              <summary title="Manage layers, position and alignment" onClick={toggleEditorMenu}><span>↕</span>Arrange</summary>
              <div className="editor-menu-panel editor-menu-panel-wide">
                <label htmlFor="toolbar-canvas-layers">Layers</label>
                <select id="toolbar-canvas-layers" multiple size={Math.min(5, Math.max(2, objects.length))} value={selectedIds.map(String)} onChange={selectLayersFromEvent}>
                  {objects.flatMap((object, index) => {
                    const layerName = object.type === "text"
                      ? object.text?.slice(0, 28) || "Text"
                      : object.type === "group"
                        ? `Group (${object.children?.length ?? 0})`
                      : object.type === "image" ? "Image" : object.shape ?? "Shape";
                    const rows = [<option key={object.id} value={String(object.id)}>{`${index + 1}. ${layerName}`}</option>];
                    if (object.type === "group" && expandedGroupIds.includes(object.id)) {
                      rows.push(...object.children.map((child) => <option key={child.id} value={String(child.id)}>　↳ {child.type === "text" ? child.text?.slice(0, 24) || "Text" : child.type === "image" ? "Image" : child.shape ?? "Shape"}</option>));
                    }
                    return rows;
                  })}
                </select>
                {selectedObject?.type === "group" && <button type="button" onClick={() => setExpandedGroupIds((current) => current.includes(selectedObject.id) ? current.filter((id) => id !== selectedObject.id) : [...current, selectedObject.id])}>{expandedGroupIds.includes(selectedObject.id) ? "Collapse group layers" : "Expand group layers"}</button>}
                <div className="editor-menu-actions">
                  <button type="button" disabled={!selectedObject || selectedLayerIndex >= objects.length - 1} onClick={() => moveSelectedLayer(1)}>Bring Forward</button>
                  <button type="button" disabled={!selectedObject || selectedLayerIndex <= 0} onClick={() => moveSelectedLayer(-1)}>Send Backward</button>
                </div>
                <div className="editor-menu-actions">
                  <button type="button" disabled={!selectedObject || selectedLayerIndex >= objects.length - 1} onClick={() => moveSelectedLayer("front")}>Bring to Front</button>
                  <button type="button" disabled={!selectedObject || selectedLayerIndex <= 0} onClick={() => moveSelectedLayer("back")}>Send to Back</button>
                </div>
                {selectedObject && <button type="button" onClick={() => updateSelected({ locked: !selectedObject.locked })}>{selectedObject.locked ? "Unlock Layer" : "Lock Layer"}</button>}
                {selectedObject && <>
                  <label>Position (%)</label>
                  <div className="editor-menu-position">
                    <label>X<input aria-label="Arrange X position" type="number" step="0.1" value={selectedObject.x} onChange={(event) => updateSelected({ x: Number(event.target.value) || 0 })} /></label>
                    <label>Y<input aria-label="Arrange Y position" type="number" step="0.1" value={selectedObject.y} onChange={(event) => updateSelected({ y: Number(event.target.value) || 0 })} /></label>
                  </div>
                </>}
                {selectedObject?.type === "text" && <>
                  <label>Text alignment</label>
                  <div className="editor-menu-actions" role="group" aria-label="Arrange text alignment">
                    {["left", "center", "right"].map((align) => (
                      <button key={align} type="button" aria-pressed={selectedObject.align === align} className={selectedObject.align === align ? "is-current" : ""} onClick={() => updateSelected({ align })}>{align}</button>
                    ))}
                  </div>
                </>}
              </div>
            </details>
            <details id="editor-menu-project" className="editor-menu" onClick={closeEditorMenuAfterAction}>
              <summary title="Save projects, pages and templates" onClick={toggleEditorMenu}><span>▣</span>Project</summary>
              <div className="editor-menu-panel editor-menu-panel-wide">
                <button type="button" onClick={createNewProject}>New Project</button>
                <button type="button" onClick={saveProject}>Save Project</button>
                <button type="button" onClick={openProjectsDialog}>My Projects</button>
                {canEditTemplates && <>
                  <button type="button" onClick={openSaveTemplateDialog}>Save as Template</button>
                  <button type="button" onClick={() => setTemplateManagerOpen(true)}>Manage Templates</button>
                </>}
                <button type="button" onClick={() => projectUploadRef.current?.click()}>Open JSON Project</button>
                <button type="button" onClick={addPage}>Add Page</button>
                <label className="editor-menu-label">Pages</label>
                {pages.map((page) => (
                  <div className="editor-page-row" key={page.id}>
                    <button type="button" className={currentPageId === page.id ? "is-current" : ""} onClick={() => setCurrentPageId(page.id)}>{page.name}</button>
                    <button type="button" aria-label={`Rename ${page.name}`} onClick={() => renamePage(page.id)}>✎</button>
                    <button type="button" aria-label={`Delete ${page.name}`} disabled={pages.length === 1} onClick={() => deletePage(page.id)}>×</button>
                  </div>
                ))}
              </div>
            </details>
            <details id="editor-menu-more" className="editor-menu" onClick={closeEditorMenuAfterAction}>
              <summary title="More canvas and project tools" onClick={toggleEditorMenu}><span>⋯</span>More</summary>
              <div className="editor-menu-panel">
                <button type="button" onClick={() => setSnapGridEnabled((enabled) => !enabled)}>{snapGridEnabled ? "Grid snapping: On" : "Grid snapping: Off"}</button>
                <label className="editor-menu-color"><span>Background color</span><input aria-label="Background color" type="color" value={background} onChange={(event) => { setBackground(event.target.value); setBackgroundMode("solid"); }} /></label>
                <button type="button" onClick={resetPoster}>Clear / Reset Poster</button>
              </div>
            </details>
            <button type="button" className="mobile-tools-close" aria-label="Close tool panel" onClick={() => {
              document.querySelectorAll(".editor-menu[open]").forEach((menu) => { menu.open = false; });
            }}>×</button>
          </nav>
          <div className="history-actions" aria-label="Edit history">
            <button type="button" aria-label="Undo" title="Undo (Ctrl/Cmd+Z)" disabled={!history.length && !pathDraft?.length} onClick={undo}><span aria-hidden="true">↶</span><span className="history-action-label">Undo</span></button>
            <button type="button" aria-label="Redo" title="Redo (Ctrl/Cmd+Shift+Z)" disabled={!redoStack.length} onClick={redo}><span aria-hidden="true">↷</span><span className="history-action-label">Redo</span></button>
          </div>
          <div className="export-actions" aria-label="Export options">
            <button type="button" title="Export as JPEG" onClick={() => openExport("jpg")}>JPG</button>
            <button type="button" className="export-primary" title="Open PNG export settings" onClick={() => openExport("png")}>Export PNG</button>
          </div>
          <input ref={uploadRef} className="file-input" type="file" accept="image/*" onChange={uploadImage} />
          <input ref={backgroundUploadRef} className="file-input" type="file" accept="image/*" onChange={uploadBackgroundImage} />
          <input ref={projectUploadRef} className="file-input" type="file" accept=".json" onChange={loadProject} />
        </header>

        <div className="editor-workspace">
          <main className="editor-stage">
            <div className="stage-heading"><div><span>YOUR CANVAS</span><h1>{templateName}</h1></div>
              <div className="size-picker">
                <label htmlFor="canvas-size">Canvas size<select id="canvas-size" value={canvasSize} onChange={(event) => setCanvasSize(event.target.value)}>
                  {Object.keys(canvasSizes).map((size) => <option key={size}>{size}</option>)}
                  <option value="Custom">Custom dimensions</option>
                </select></label>
                {canvasSize === "Custom" && <div className="custom-size-fields">
                  <label>W<input type="number" min="1" max="5000" value={customWidth} onChange={(event) => setCustomWidth(Math.max(1, Math.min(5000, Number(event.target.value) || 1)))} /></label>
                  <label>H<input type="number" min="1" max="5000" value={customHeight} onChange={(event) => setCustomHeight(Math.max(1, Math.min(5000, Number(event.target.value) || 1)))} /></label>
                </div>}
              </div>
            </div>
            <div className="canvas-wrap">
              <div ref={canvasRef} className={`poster-canvas tool-${activeTool}`} style={{ aspectRatio: `${dimensions.width} / ${dimensions.height}`, width: dimensions.width > dimensions.height ? "100%" : "auto", height: dimensions.width > dimensions.height ? "auto" : "100%", backgroundColor: background, backgroundImage: backgroundMode === "gradient" ? backgroundGradientCss : "none", transform: canvasViewOffset.x || canvasViewOffset.y ? `translate(${canvasViewOffset.x}px, ${canvasViewOffset.y}px)` : undefined }} onPointerDown={beginCanvasPointer} onPointerMove={updateCanvasInteraction} onPointerUp={endCanvasInteraction} onPointerCancel={(event) => { if (dragRef.current?.pointerId == null || dragRef.current.pointerId === event.pointerId) dragRef.current = null; setSelectionMarquee(null); }} onDoubleClick={() => { if (activeTool === "pen" && pathDraft) finishDrawing(false); }}>
                <div className="poster-artwork">
                  {activeBackgroundImage && <img className="poster-background-image" src={activeBackgroundImage} alt="" draggable="false" />}
                  {backgroundOverlayEnabled && <div className="poster-background-overlay" style={{ opacity: backgroundOverlayOpacity / 100 }} />}
                  {renderableObjects.map((object) => renderCanvasObject(object, false))}
                </div>
                <div className="canvas-interaction-layer">
                  {renderableObjects.map((object) => renderCanvasObject(object, true))}
                  {objects.filter((object) => object.type === "group" && selectedIds.includes(object.id)).map((group) => renderCanvasObject(group, true))}
                  {pathDraft && <svg className="vector-drawing-preview" viewBox="0 0 100 100" preserveAspectRatio="none"><path d={activeTool === "pen" ? pathToSvg([{ nodes: pathDraft, closed: false }]) : `M ${pathDraft.map((point) => `${point.x} ${point.y}`).join(" L ")}`} fill={closedDrawing ? `${vectorFill}66` : "none"} stroke={vectorStroke} strokeWidth="0.35" vectorEffect="non-scaling-stroke" /></svg>}
                  {selectionMarquee && <div className="selection-marquee" style={{ left: `${Math.min(selectionMarquee.startX, selectionMarquee.x)}%`, top: `${Math.min(selectionMarquee.startY, selectionMarquee.y)}%`, width: `${Math.abs(selectionMarquee.x - selectionMarquee.startX)}%`, height: `${Math.abs(selectionMarquee.y - selectionMarquee.startY)}%` }} />}
                </div>
              </div>
            </div>
            <div className="canvas-caption">{canvasSize} <span>{dimensions.width} × {dimensions.height} px</span></div>
          </main>

          <aside className="properties-panel" onClick={togglePropertyAccordion}>
            <h2>{selectedObject ? `${selectedObject.type === "text" ? "Text" : selectedObject.type === "image" ? "Image" : selectedObject.type === "group" ? "Group" : "Shape"} Properties` : "Design & Background"}</h2>
            <p className="panel-hint">{selectedIds.length > 1 ? `${selectedIds.length} objects selected.` : "Select an element on your canvas to edit it."}</p>
            <details className="text-section background-properties" open>
              <summary>Background</summary>
              <label className="field-label" htmlFor="background-mode">Type</label>
              <select id="background-mode" className="font-select" value={backgroundMode} onChange={(event) => setBackgroundMode(event.target.value)}>
                <option value="solid">Solid Color</option>
                <option value="gradient">Gradient</option>
                <option value="upload">Upload Image</option>
                <option value="islamic">Islamic Backgrounds</option>
              </select>
              {backgroundMode === "solid" && <>
                <label className="field-label color-label">Background color<input aria-label="Background color picker" type="color" value={background} onChange={(event) => setBackground(event.target.value)} /></label>
                <label className="field-label" htmlFor="background-hex">HEX</label>
                <input id="background-hex" className="hex-input" type="text" value={background} maxLength="7" pattern="^#[0-9a-fA-F]{6}$" onChange={(event) => { if (/^#[0-9a-fA-F]{6}$/.test(event.target.value)) setBackground(event.target.value); }} />
              </>}
              {backgroundMode === "gradient" && <>
                {[0, 1].map((index) => <label key={index} className="field-label color-label">Color {index + 1}<input aria-label={`Background gradient color ${index + 1}`} type="color" value={backgroundGradientColors[index]} onChange={(event) => setBackgroundGradientColors((current) => current.map((color, colorIndex) => colorIndex === index ? event.target.value : color))} /></label>)}
                <label className="effect-toggle"><input type="checkbox" checked={backgroundGradientThirdEnabled} onChange={(event) => setBackgroundGradientThirdEnabled(event.target.checked)} />Use Color 3</label>
                {backgroundGradientThirdEnabled && <label className="field-label color-label">Color 3<input aria-label="Background gradient color 3" type="color" value={backgroundGradientColors[2]} onChange={(event) => setBackgroundGradientColors((current) => current.map((color, index) => index === 2 ? event.target.value : color))} /></label>}
                <label className="field-label" htmlFor="background-gradient-angle">Gradient angle <span>{backgroundGradientAngle}°</span></label>
                <input id="background-gradient-angle" className="size-range" type="range" min="-180" max="180" value={backgroundGradientAngle} onChange={(event) => setBackgroundGradientAngle(Number(event.target.value))} />
                <div className="field-label">Quick gradients</div>
                <div className="background-gradient-grid">{backgroundGradientPresets.map((preset) => <button key={preset.label} type="button" aria-label={`Apply ${preset.label} background gradient`} style={{ backgroundImage: getCssBackgroundGradient(preset.colors, 35) }} onClick={() => { setBackgroundGradientColors([preset.colors[0], preset.colors[1], preset.colors[2] ?? preset.colors[1]]); setBackgroundGradientThirdEnabled(preset.colors.length > 2); setBackgroundGradientAngle(35); }}><span>{preset.label}</span></button>)}</div>
              </>}
              {backgroundMode === "upload" && <button className="background-upload-btn" type="button" onClick={() => backgroundUploadRef.current?.click()}>{backgroundImage ? "Replace Background Image" : "Upload Background Image"}</button>}
              {backgroundMode === "islamic" && <div className="islamic-background-grid">{islamicBackgrounds.map((design) => <button key={design.id} type="button" className={`islamic-background-card${selectedIslamicBackgroundId === design.id ? " is-selected" : ""}`} aria-pressed={selectedIslamicBackgroundId === design.id} aria-label={`Apply ${design.label} background`} style={{ backgroundImage: `url("${getIslamicBackgroundSvg(design)}")` }} onClick={() => { setSelectedIslamicBackgroundId(design.id); setBackgroundMode("islamic"); }}><span>{design.label}</span></button>)}</div>}
              {backgroundMode !== "solid" && <>
                <label className="effect-toggle"><input type="checkbox" checked={backgroundOverlayEnabled} onChange={(event) => setBackgroundOverlayEnabled(event.target.checked)} />Dark overlay</label>
                {backgroundOverlayEnabled && <label className="field-label" htmlFor="background-overlay-opacity">Overlay opacity <span>{backgroundOverlayOpacity}%</span></label>}
                {backgroundOverlayEnabled && <input id="background-overlay-opacity" className="size-range" type="range" min="0" max="80" value={backgroundOverlayOpacity} onChange={(event) => setBackgroundOverlayOpacity(Number(event.target.value))} />}
              </>}
              <button className="reset-background-btn" type="button" onClick={resetBackground}>Reset Background</button>
            </details>
            {objects.length > 0 && <details className="text-section">
              <summary>Arrange & Layers</summary>
              <label className="field-label" htmlFor="canvas-layers">Canvas layers</label>
              <select id="canvas-layers" className="font-select layer-multi-select" multiple size={Math.min(6, Math.max(2, objects.length))} value={selectedIds.map(String)} onChange={selectLayersFromEvent}>
                {objects.flatMap((object, index) => {
                  const layerName = object.type === "text"
                    ? object.text?.slice(0, 28) || "Text"
                    : object.type === "group"
                      ? `Group (${object.children?.length ?? 0})`
                    : object.type === "image"
                      ? "Image"
                      : object.shape ?? "Shape";
                  const rows = [<option key={object.id} value={String(object.id)}>{`${index + 1}. ${layerName}`}</option>];
                  if (object.type === "group" && expandedGroupIds.includes(object.id)) {
                    rows.push(...object.children.map((child) => <option key={child.id} value={String(child.id)}>　↳ {child.type === "text" ? child.text?.slice(0, 24) || "Text" : child.type === "image" ? "Image" : child.shape ?? "Shape"}</option>));
                  }
                  return rows;
                })}
              </select>
              {selectedObject?.type === "group" && <button type="button" className="replace-image-btn" onClick={() => setExpandedGroupIds((current) => current.includes(selectedObject.id) ? current.filter((id) => id !== selectedObject.id) : [...current, selectedObject.id])}>{expandedGroupIds.includes(selectedObject.id) ? "Collapse group layers" : "Expand group layers"}</button>}
              <div className="layer-position-actions" role="group" aria-label="Position selected object in canvas">
                <button type="button" disabled={!selectedObject || selectedObject.locked || selectedIds.length !== 1} onClick={() => alignSelectedObject("center")}>Center in Canvas</button>
                <button type="button" disabled={!selectedObject || selectedObject.locked || selectedIds.length !== 1} onClick={() => alignSelectedObject("left")}>Align Left</button>
                <button type="button" disabled={!selectedObject || selectedObject.locked || selectedIds.length !== 1} onClick={() => alignSelectedObject("right")}>Align Right</button>
                <button type="button" disabled={!selectedObject || selectedObject.locked || selectedIds.length !== 1} onClick={() => alignSelectedObject("top")}>Align Top</button>
                <button type="button" disabled={!selectedObject || selectedObject.locked || selectedIds.length !== 1} onClick={() => alignSelectedObject("bottom")}>Align Bottom</button>
                <button type="button" disabled={!selectedObject || selectedIds.length !== 1} onClick={locateSelectedObject}>Locate Object</button>
                {(canvasViewOffset.x || canvasViewOffset.y) !== 0 && <button type="button" onClick={resetCanvasView}>Reset Canvas View</button>}
              </div>
            </details>}
            {selectedObject && <details className="text-section">
              <summary>Transparency</summary>
              <label className="field-label" htmlFor="object-opacity">Object opacity <span>{selectedObject.opacity ?? 100}%</span></label>
              <input id="object-opacity" className="size-range" type="range" min="0" max="100" value={selectedObject.opacity ?? 100} onPointerDown={saveHistory} onChange={(event) => updateSelected({ opacity: Number(event.target.value) })} />
              <label className="field-label" htmlFor="opacity-mask-type">Opacity mask</label>
              <select id="opacity-mask-type" className="font-select" value={selectedObject.transparencyMask?.type ?? "none"} onChange={(event) => changeTransparencyType(event.target.value)}>
                <option value="none">None</option>
                <option value="linear">Linear gradient</option>
                <option value="radial">Radial gradient</option>
              </select>
              {selectedObject.transparencyMask && <>
                {selectedObject.transparencyMask.type === "linear" && <label className="field-label" htmlFor="opacity-mask-direction">Direction</label>}
                {selectedObject.transparencyMask.type === "linear" && <select id="opacity-mask-direction" className="font-select" value={selectedObject.transparencyMask.direction ?? "left-right"} onPointerDown={saveHistory} onChange={(event) => updateSelectedTransparencyMask({ direction: event.target.value })}>
                  <option value="top-bottom">Top to bottom</option>
                  <option value="bottom-top">Bottom to top</option>
                  <option value="left-right">Left to right</option>
                  <option value="right-left">Right to left</option>
                  <option value="top-left-bottom-right">Diagonal: top left to bottom right</option>
                  <option value="bottom-right-top-left">Diagonal: bottom right to top left</option>
                  <option value="top-right-bottom-left">Diagonal: top right to bottom left</option>
                  <option value="bottom-left-top-right">Diagonal: bottom left to top right</option>
                </select>}
                {selectedObject.transparencyMask.type === "radial" && <>
                  <label className="field-label">Radial center X <span>{selectedObject.transparencyMask.centerX ?? 50}%</span></label>
                  <input className="size-range" type="range" min="0" max="100" value={selectedObject.transparencyMask.centerX ?? 50} onPointerDown={saveHistory} onChange={(event) => updateSelectedTransparencyMask({ centerX: Number(event.target.value) })} />
                  <label className="field-label">Radial center Y <span>{selectedObject.transparencyMask.centerY ?? 50}%</span></label>
                  <input className="size-range" type="range" min="0" max="100" value={selectedObject.transparencyMask.centerY ?? 50} onPointerDown={saveHistory} onChange={(event) => updateSelectedTransparencyMask({ centerY: Number(event.target.value) })} />
                  <label className="field-label">Radial radius <span>{selectedObject.transparencyMask.radius ?? 70}%</span></label>
                  <input className="size-range" type="range" min="1" max="100" value={selectedObject.transparencyMask.radius ?? 70} onPointerDown={saveHistory} onChange={(event) => updateSelectedTransparencyMask({ radius: Number(event.target.value) })} />
                </>}
                <label className="effect-toggle"><input type="checkbox" checked={Boolean(selectedObject.transparencyMask.hard)} onChange={(event) => { saveHistory(); updateSelectedTransparencyMask({ hard: event.target.checked }); }} />Hard transition</label>
                <div className="transparency-stop-list" aria-label="Opacity gradient stops">
                  {(selectedObject.transparencyMask.stops ?? defaultTransparencyStops).map((stop, index) => <div className="transparency-stop" key={stop.id ?? index}>
                    <label>Stop {index + 1} · {stop.offset}%</label>
                    <input aria-label={`Stop ${index + 1} position`} type="range" min="0" max="100" value={stop.offset} onPointerDown={saveHistory} onChange={(event) => updateSelectedTransparencyMask({ stops: selectedObject.transparencyMask.stops.map((item, itemIndex) => itemIndex === index ? { ...item, offset: Number(event.target.value) } : item) })} />
                    <label>Opacity · {stop.opacity}%</label>
                    <input aria-label={`Stop ${index + 1} opacity`} type="range" min="0" max="100" value={stop.opacity} onPointerDown={saveHistory} onChange={(event) => updateSelectedTransparencyMask({ stops: selectedObject.transparencyMask.stops.map((item, itemIndex) => itemIndex === index ? { ...item, opacity: Number(event.target.value) } : item) })} />
                    <button type="button" disabled={selectedObject.transparencyMask.stops.length <= 2} onClick={() => { saveHistory(); updateSelectedTransparencyMask({ stops: selectedObject.transparencyMask.stops.filter((_, itemIndex) => itemIndex !== index) }); }}>Remove stop</button>
                  </div>)}
                </div>
                <div className="transparency-mask-preview" style={{ maskImage: transparencyCss(selectedObject.transparencyMask), WebkitMaskImage: transparencyCss(selectedObject.transparencyMask) }} aria-label="Opacity mask live preview" />
                <button type="button" onClick={() => { saveHistory(); updateSelectedTransparencyMask({ stops: [...(selectedObject.transparencyMask.stops ?? defaultTransparencyStops), { id: nextObjectId("opacity-stop"), offset: 50, opacity: 50 }] }); }}>Add gradient stop</button>
              </>}
            </details>}
            {selectedObject && <details className="text-section">
              <summary>Transform</summary>
              <label className="field-label" htmlFor="object-rotation">Rotation <span>{selectedObject.rotation ?? 0}°</span></label>
              <input id="object-rotation" className="size-range" type="range" min="-180" max="180" value={selectedObject.rotation ?? 0} onPointerDown={selectedObject.type === "group" ? saveHistory : undefined} onChange={(event) => updateSelected({ rotation: Number(event.target.value) })} />
              <div className="object-flip-actions" role="group" aria-label="Mirror selected object">
                <button type="button" aria-pressed={Boolean(selectedObject.flipHorizontal)} onClick={() => flipSelected("horizontal")}>↔ Flip Horizontal</button>
                <button type="button" aria-pressed={Boolean(selectedObject.flipVertical)} onClick={() => flipSelected("vertical")}>↕ Flip Vertical</button>
              </div>
            </details>}
            {selectedObject?.type === "group" && <details className="text-section">
              <summary>Group Transform</summary>
              <label className="field-label" htmlFor="group-width">Width <span>{selectedObject.width.toFixed(1)}%</span></label>
              <input id="group-width" className="size-range" type="range" min="2" max="200" value={selectedObject.width} onPointerDown={saveHistory} onChange={(event) => updateSelected({ width: Number(event.target.value) })} />
              <label className="field-label" htmlFor="group-height">Height <span>{selectedObject.height.toFixed(1)}%</span></label>
              <input id="group-height" className="size-range" type="range" min="2" max="200" value={selectedObject.height} onPointerDown={saveHistory} onChange={(event) => updateSelected({ height: Number(event.target.value) })} />
            </details>}
            {selectedObject?.type === "text" && <>
              <details className="text-section">
                <summary>Text</summary>
                <label className="field-label" htmlFor="poster-text">Content</label>
                <textarea id="poster-text" className="text-input" dir={selectedObject.direction ?? "auto"} style={{ fontFamily: selectedObject.fontFamily ?? fontOptions[0].value }} value={selectedObject.text} onChange={(event) => updateSelected({ text: event.target.value })} />
              </details>
              <details className="text-section">
                <summary>Font</summary>
                <label className="field-label" htmlFor="font-family">Typeface</label>
                <select id="font-family" className="font-select" value={selectedObject.fontFamily ?? fontOptions[0].value} onChange={(event) => updateSelected({ fontFamily: event.target.value })}>{fontOptions.map((font) => <option key={font.label} value={font.value}>{font.label}</option>)}</select>
                <label className="field-label" htmlFor="font-size">Font size <span>{selectedObject.fontSize}px</span></label>
                <div className="font-size-controls"><input id="font-size" className="size-range" type="range" min="8" max="200" value={selectedObject.fontSize} onChange={(event) => updateSelected({ fontSize: Number(event.target.value) })} /><input aria-label="Font size in pixels" className="number-input" type="number" min="8" max="200" value={selectedObject.fontSize} onChange={(event) => updateSelected({ fontSize: Math.max(8, Math.min(200, Number(event.target.value) || 8)) })} /></div>
                <div className="field-label">Style and alignment</div>
                <div className="format-row"><button className={selectedObject.bold ? "format-active" : ""} aria-label="Bold" aria-pressed={Boolean(selectedObject.bold)} onClick={() => updateSelected({ bold: !selectedObject.bold })}><strong>B</strong></button><button className={selectedObject.italic ? "format-active" : ""} aria-label="Italic" aria-pressed={Boolean(selectedObject.italic)} onClick={() => updateSelected({ italic: !selectedObject.italic })}><em>I</em></button><div className="alignment-control" aria-label="Text alignment">{["left", "center", "right"].map((align) => <button key={align} className={selectedObject.align === align ? "format-active" : ""} aria-label={`Align ${align}`} aria-pressed={selectedObject.align === align} onClick={() => updateSelected({ align })}>{align === "left" ? "≡" : align === "center" ? "☰" : "≡"}</button>)}</div></div>
                <label className="field-label">
  Width
  <span>{selectedObject.width ?? 38}</span>
</label>

<input
  className="size-range"
  type="range"
  min="10"
  max="100"
  value={selectedObject.width ?? 38}
  onChange={(event) =>
    updateSelected({
      width: Number(event.target.value)
    })
  }
  />
<label className="field-label">
  Height
  <span>{selectedObject.height ?? 38}</span>
</label>

<input
  className="size-range"
  type="range"
  min="10"
  max="100"
  value={selectedObject.height ?? 38}
  onChange={(event) =>
    updateSelected({
      height: Number(event.target.value)
    })
  }
/>
                <label className="field-label" htmlFor="text-direction">Direction</label>
                <select id="text-direction" className="font-select" value={selectedObject.direction ?? "auto"} onChange={(event) => updateSelected({ direction: event.target.value })}><option value="auto">Automatic</option><option value="rtl">Right to left</option><option value="ltr">Left to right</option></select>
              </details>
              <details className="text-section">
                <summary>Fill</summary>
                <label className="field-label" htmlFor="fill-mode">Fill type</label>
                <select id="fill-mode" className="font-select" value={selectedObject.fillMode ?? "solid"} onChange={(event) => updateSelected({ fillMode: event.target.value })}><option value="solid">Solid</option><option value="gradient">Gradient</option><option value="image">Image</option></select>
                {(selectedObject.fillMode ?? "solid") === "solid" ? <label className="field-label color-label">Text color<input type="color" value={selectedObject.color ?? "#17352c"} onChange={(event) => updateSelected({ color: event.target.value })} /></label> : selectedObject.fillMode === "gradient" ? <>
                  <label className="field-label color-label">Gradient color 1<input type="color" value={selectedObject.gradientColor1 ?? "#e7c36f"} onChange={(event) => updateSelected({ gradientColor1: event.target.value })} /></label>
                  <label className="field-label color-label">Gradient color 2<input type="color" value={selectedObject.gradientColor2 ?? "#a97826"} onChange={(event) => updateSelected({ gradientColor2: event.target.value })} /></label>
                  <label className="effect-toggle"><input type="checkbox" checked={Boolean(selectedObject.gradientColor3Enabled)} onChange={(event) => updateSelected({ gradientColor3Enabled: event.target.checked })} />Use third color</label>
                  {selectedObject.gradientColor3Enabled && <label className="field-label color-label">Gradient color 3<input type="color" value={selectedObject.gradientColor3 ?? "#ffffff"} onChange={(event) => updateSelected({ gradientColor3: event.target.value })} /></label>}
                  <label className="field-label" htmlFor="gradient-angle">Gradient angle <span>{selectedObject.gradientAngle ?? 0}°</span></label>
                  <input id="gradient-angle" className="size-range" type="range" min="-180" max="180" value={selectedObject.gradientAngle ?? 0} onChange={(event) => updateSelected({ gradientAngle: Number(event.target.value) })} />
                </> : <>
                  <input ref={textFillUploadRef} className="file-input" type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" onChange={uploadTextFillImage} />
                  <div className="text-image-actions">
                    <button type="button" onClick={() => textFillUploadRef.current?.click()}>{selectedObject.imageFillSrc ? "Replace Image" : "Upload Image"}</button>
                    {selectedObject.imageFillSrc && <button type="button" onClick={() => updateSelected({ imageFillSrc: null })}>Remove Image</button>}
                  </div>
                  {!selectedObject.imageFillSrc && <p className="panel-hint">Choose a JPG, PNG or WEBP image to fill the text.</p>}
                  {selectedObject.imageFillSrc && <>
                    <label className="field-label" htmlFor="image-fill-scale">Image scale <span>{selectedObject.imageFillScale ?? 100}%</span></label>
                    <input id="image-fill-scale" className="size-range" type="range" min="25" max="300" step="5" value={selectedObject.imageFillScale ?? 100} onChange={(event) => updateSelected({ imageFillScale: Number(event.target.value) })} />
                    <label className="field-label" htmlFor="image-fill-x">Image X position <span>{selectedObject.imageFillX ?? 0}%</span></label>
                    <input id="image-fill-x" className="size-range" type="range" min="-100" max="100" value={selectedObject.imageFillX ?? 0} onChange={(event) => updateSelected({ imageFillX: Number(event.target.value) })} />
                    <label className="field-label" htmlFor="image-fill-y">Image Y position <span>{selectedObject.imageFillY ?? 0}%</span></label>
                    <input id="image-fill-y" className="size-range" type="range" min="-100" max="100" value={selectedObject.imageFillY ?? 0} onChange={(event) => updateSelected({ imageFillY: Number(event.target.value) })} />
                  </>}
                </>}
              </details>
              <details className="text-section text-designs-section">
                <summary>Text Designs</summary>
                <div className="text-design-grid">
                  {textDesigns.map((design) => <button key={design.label} type="button" className={`text-design-card${selectedObject.textDesignLabel === design.label ? " is-applied" : ""}`} aria-label={`Apply ${design.label} text design`} onClick={() => applyTextDesign(design)}>
                    <span className="text-design-preview" dir="auto" style={getTextDesignPreviewStyle(design)}>{design.sample}</span>
                    <span className="text-design-name">{design.label}</span>
                  </button>)}
                </div>
                <button className="reset-text-design" type="button" onClick={resetTextDesign}>Reset Text Design</button>
              </details>
              <details className="text-section">
                <summary>Stroke</summary>
                <label className="effect-toggle"><input type="checkbox" checked={Boolean(selectedObject.strokeEnabled)} onChange={(event) => updateSelected({ strokeEnabled: event.target.checked })} />Enable outline</label>
                {selectedObject.strokeEnabled && <>
                  <label className="field-label color-label">Stroke color<input type="color" value={selectedObject.strokeColor ?? "#442d0b"} onChange={(event) => updateSelected({ strokeColor: event.target.value })} /></label>
                  <label className="field-label" htmlFor="stroke-width">Stroke width <span>{selectedObject.strokeWidth ?? 2}px</span></label>
                  <input id="stroke-width" className="size-range" type="range" min="0" max="12" step="0.5" value={selectedObject.strokeWidth ?? 2} onChange={(event) => updateSelected({ strokeWidth: Number(event.target.value) })} />
                </>}
              </details>
              <details className="text-section">
                <summary>Shadow</summary>
                <label className="effect-toggle"><input type="checkbox" checked={Boolean(selectedObject.shadowEnabled)} onChange={(event) => updateSelected({ shadowEnabled: event.target.checked })} />Enable shadow</label>
                {selectedObject.shadowEnabled && <>
                  <label className="field-label color-label">Shadow color<input type="color" value={selectedObject.shadowColor ?? "#000000"} onChange={(event) => updateSelected({ shadowColor: event.target.value })} /></label>
                  <label className="field-label" htmlFor="shadow-blur">Blur <span>{selectedObject.shadowBlur ?? 8}px</span></label><input id="shadow-blur" className="size-range" type="range" min="0" max="40" value={selectedObject.shadowBlur ?? 8} onChange={(event) => updateSelected({ shadowBlur: Number(event.target.value) })} />
                  <label className="field-label" htmlFor="shadow-x">X offset <span>{selectedObject.shadowOffsetX ?? 2}px</span></label><input id="shadow-x" className="size-range" type="range" min="-30" max="30" value={selectedObject.shadowOffsetX ?? 2} onChange={(event) => updateSelected({ shadowOffsetX: Number(event.target.value) })} />
                  <label className="field-label" htmlFor="shadow-y">Y offset <span>{selectedObject.shadowOffsetY ?? 3}px</span></label><input id="shadow-y" className="size-range" type="range" min="-30" max="30" value={selectedObject.shadowOffsetY ?? 3} onChange={(event) => updateSelected({ shadowOffsetY: Number(event.target.value) })} />
                  <label className="field-label" htmlFor="shadow-opacity">Shadow opacity <span>{selectedObject.shadowOpacity ?? 65}%</span></label><input id="shadow-opacity" className="size-range" type="range" min="0" max="100" value={selectedObject.shadowOpacity ?? 65} onChange={(event) => updateSelected({ shadowOpacity: Number(event.target.value) })} />
                </>}
              </details>
              <details className="text-section">
                <summary>Glow</summary>
                <label className="effect-toggle"><input type="checkbox" checked={Boolean(selectedObject.glowEnabled)} onChange={(event) => updateSelected({ glowEnabled: event.target.checked })} />Enable glow</label>
                {selectedObject.glowEnabled && <>
                  <label className="field-label color-label">Glow color<input type="color" value={selectedObject.glowColor ?? "#f5ca65"} onChange={(event) => updateSelected({ glowColor: event.target.value })} /></label>
                  <label className="field-label" htmlFor="glow-blur">Glow size <span>{selectedObject.glowBlur ?? 18}px</span></label><input id="glow-blur" className="size-range" type="range" min="0" max="50" value={selectedObject.glowBlur ?? 18} onChange={(event) => updateSelected({ glowBlur: Number(event.target.value) })} />
                  <label className="field-label" htmlFor="glow-opacity">Glow opacity <span>{selectedObject.glowOpacity ?? 75}%</span></label><input id="glow-opacity" className="size-range" type="range" min="0" max="100" value={selectedObject.glowOpacity ?? 75} onChange={(event) => updateSelected({ glowOpacity: Number(event.target.value) })} />
                </>}
              </details>
              <details className="text-section">
                <summary>Spacing</summary>
                <label className="field-label" htmlFor="letter-spacing">Letter spacing <span>{selectedObject.letterSpacing ?? 0}px</span></label>
                <input id="letter-spacing" className="size-range" type="range" min="-5" max="20" step="0.5" value={selectedObject.letterSpacing ?? 0} onChange={(event) => updateSelected({ letterSpacing: Number(event.target.value) })} />
                <label className="field-label" htmlFor="line-height">Line height <span>{(selectedObject.lineHeight ?? 1.25).toFixed(2)}×</span></label>
                <input id="line-height" className="size-range" type="range" min="0.8" max="3" step="0.05" value={selectedObject.lineHeight ?? 1.25} onChange={(event) => updateSelected({ lineHeight: Number(event.target.value) })} />
              </details>
              <details className="text-section">
                <summary>Position</summary>
                <label className="field-label" htmlFor="text-position-x">X position (%)</label>
                <input id="text-position-x" className="number-input" type="number" step="0.1" value={selectedObject.x} onChange={(event) => updateSelected({ x: Number(event.target.value) || 0 })} />
                <label className="field-label" htmlFor="text-position-y">Y position (%)</label>
                <input id="text-position-y" className="number-input" type="number" step="0.1" value={selectedObject.y} onChange={(event) => updateSelected({ y: Number(event.target.value) || 0 })} />
              </details>
              <details className="text-section">
                <summary>Layer</summary>
                <div className="text-layer-actions">
                  <button disabled={selectedLayerIndex >= objects.length - 1} onClick={() => moveSelectedLayer(1)}>Bring Forward</button>
                  <button disabled={selectedLayerIndex <= 0} onClick={() => moveSelectedLayer(-1)}>Send Backward</button>
                  <button disabled={selectedLayerIndex >= objects.length - 1} onClick={() => moveSelectedLayer("front")}>Bring to Front</button>
                  <button disabled={selectedLayerIndex <= 0} onClick={() => moveSelectedLayer("back")}>Send to Back</button>
                </div>
              </details>
            </>}
            {selectedObject?.type === "shape" && <>
              <label className="field-label color-label">Shape color<input type="color" value={selectedObject.color} onChange={(event) => updateSelected({ color: event.target.value })} /></label>
              {selectedObject.shape === "custom" && <>
                <label className="effect-toggle"><input type="checkbox" checked={selectedObject.fillEnabled !== false} onChange={(event) => updateSelected({ fillEnabled: event.target.checked })} />Fill enabled</label>
                <label className="effect-toggle"><input type="checkbox" checked={Boolean(selectedObject.strokeEnabled)} onChange={(event) => updateSelected({ strokeEnabled: event.target.checked })} />Stroke enabled</label>
                <label className="field-label color-label">Stroke color<input type="color" value={selectedObject.strokeColor ?? "#17352c"} onChange={(event) => updateSelected({ strokeColor: event.target.value })} /></label>
                <label className="field-label" htmlFor="custom-stroke-width">Stroke width <span>{selectedObject.strokeWidth ?? 1}</span></label>
                <input id="custom-stroke-width" className="size-range" type="range" min="0.5" max="12" step="0.5" value={selectedObject.strokeWidth ?? 1} onChange={(event) => updateSelected({ strokeWidth: Number(event.target.value) })} />
                <label className="effect-toggle"><input type="checkbox" checked={activeTool === "node"} onChange={(event) => { setActiveTool(event.target.checked ? "node" : "select"); setSelectedNodeIndex(null); }} />Edit vector nodes</label>
                <div className="editor-menu-actions">
                  <button type="button" onClick={addNodeToSelectedPath}>Add node</button>
                  <button type="button" disabled={selectedNodeIndex == null} onClick={removeSelectedNode}>Delete node</button>
                </div>
                <button type="button" disabled={selectedNodeIndex == null} onClick={toggleSelectedNodeType}>Toggle corner / smooth</button>
              </>}
              <label className="effect-toggle"><input type="checkbox" checked={selectedObject.keepAspectRatio ?? proportionalShapeIds.has(selectedObject.shape)} onChange={(event) => updateSelected({ keepAspectRatio: event.target.checked })} />Keep proportions</label>
              <label className="field-label" htmlFor="shape-width">Width <span>{selectedObject.width ?? (selectedShapeIsVector ? 38 : 140)}{selectedShapeIsVector ? "%" : "px"}</span></label>
              <input id="shape-width" className="size-range" type="range" min={selectedShapeIsVector ? 8 : 16} max={selectedShapeIsVector ? 92 : 500} value={selectedObject.width ?? (selectedShapeIsVector ? 38 : 140)} onChange={(event) => updateSelected({ width: Number(event.target.value) })} />
              <label className="field-label" htmlFor="shape-height">Height <span>{selectedObject.height ?? (selectedShapeIsVector ? 38 : 16)}{selectedShapeIsVector ? "%" : "px"}</span></label>
              <input id="shape-height" className="size-range" type="range" min={selectedShapeIsVector ? 8 : 1} max={selectedShapeIsVector ? 92 : 500} value={selectedObject.height ?? (selectedShapeIsVector ? 38 : 16)} onChange={(event) => updateSelected({ height: Number(event.target.value) })} />
              <div className="shape-layer-actions">
                <button onClick={duplicateSelected}>Duplicate</button>
                <button disabled={selectedLayerIndex === objects.length - 1} onClick={() => moveSelectedLayer(1)}>Bring Forward</button>
                <button disabled={selectedLayerIndex <= 0} onClick={() => moveSelectedLayer(-1)}>Send Backward</button>
              </div>
              <p className="panel-hint">Drag the shape on the canvas to position it.</p>
            </>}
            {selectedObject?.type === "image" && <>
              <button className="replace-image-btn" type="button" onClick={() => setEditingImageId(selectedObject.id)}>Edit image / Remove background</button>
              <button className="replace-image-btn" onClick={() => uploadRef.current?.click()}>Replace image</button>
              <label className="field-label" htmlFor="image-size">Image width <span>{selectedObject.width ?? 36}%</span></label>
              <input id="image-size" className="size-range" type="range" min="3" max={Math.max(100, Math.ceil((selectedObject.width ?? 36) * 2))} value={selectedObject.width ?? 36} onChange={(event) => updateSelected({ width: Number(event.target.value) })} />
              <details className="text-section">
                <summary>Position</summary>
                <label className="field-label" htmlFor="image-position-x">X position (%)</label>
                <input id="image-position-x" className="number-input" type="number" step="0.1" value={selectedObject.x} onChange={(event) => updateSelected({ x: Number(event.target.value) || 0 })} />
                <label className="field-label" htmlFor="image-position-y">Y position (%)</label>
                <input id="image-position-y" className="number-input" type="number" step="0.1" value={selectedObject.y} onChange={(event) => updateSelected({ y: Number(event.target.value) || 0 })} />
              </details>
              <p className="panel-hint">Drag the image on the canvas to position it.</p>
            </>}
            {!selectedObject && <p className="panel-empty">Choose a tool to add an element to your poster.</p>}
          </aside>
        </div>
        {shapePickerOpen && <div className="shape-picker-backdrop" onClick={() => setShapePickerOpen(false)}>
          <section className="shape-picker" role="dialog" aria-modal="true" aria-labelledby="shape-picker-title" onClick={(event) => event.stopPropagation()}>
            <header className="shape-picker-header"><div><span>VECTOR COLLECTION</span><h2 id="shape-picker-title">Choose an Islamic shape</h2></div><button aria-label="Close shapes" onClick={() => setShapePickerOpen(false)}>×</button></header>
            <div className="shape-picker-grid">
              {islamicShapes.map((shape) => <button key={shape.id} className="shape-picker-option" onClick={() => { addShape(shape.id); setShapePickerOpen(false); }}>
                <span className="shape-picker-art"><ShapeArtwork shape={shape.id} color="#ae8a4b" className="shape-picker-svg" /></span>
                <span>{shape.label}</span>
              </button>)}
            </div>
          </section>
        </div>}
        {editingImageId != null && objects.find((object) => object.id === editingImageId)?.type === "image" && (
          <BackgroundRemover
            imageSrc={objects.find((object) => object.id === editingImageId).src}
            onApply={applyImageEdit}
            onCancel={() => setEditingImageId(null)}
          />
        )}
        {projectDialogOpen && (
          <ProjectManager
            projects={savedProjects}
            activeProjectId={activeProjectId}
            initialName={activeProjectName || templateName}
            initialError={projectStorageError}
            onClose={() => setProjectDialogOpen(false)}
            onSave={persistProject}
            onOpen={(project) => applyProject(project.project, project.id, project.name)}
            onUpdate={updateProject}
            onRename={renameProject}
            onDelete={deleteProject}
            onDownloadBackup={downloadProjectBackup}
          />
        )}
        {templateSaveOpen && canEditTemplates && (
          <TemplateSaveDialog
            preview={templatePreview}
            categories={[...new Set(savedTemplates.map((template) => template.category))]}
            initialName={templateName}
            onSave={persistTemplate}
            onClose={() => setTemplateSaveOpen(false)}
          />
        )}
        {templateManagerOpen && canEditTemplates && (
          <TemplateManager
            templates={savedTemplates}
            onClose={() => setTemplateManagerOpen(false)}
            onMetadataChange={updateTemplateMetadata}
            onMove={moveTemplate}
            onReplace={replaceTemplate}
            onDelete={removeTemplate}
          />
        )}
        {exportDialogOpen && (
          <ExportSettings
            initialFormat={exportInitialFormat}
            onExport={downloadPoster}
            onClose={() => setExportDialogOpen(false)}
          />
        )}
      </div>
    );
  }

 return (
  <div className="app">
<header className="header">
  <div className="home-brand">
    <img className="logo" src="/logo.png" alt="Qadri Poster Maker logo" />
    <div><strong>Qadri Poster Maker</strong><span>Design Studio</span></div>
  </div>

</header>
    <main>
        <section className="hero">
          <h2>اپنا خوبصورت اسلامی پوسٹر بنائیں</h2>

          <p>
            Dua، Jumma اور Islamic Quotes کے خوبصورت
            پوسٹر آسانی سے تیار کریں۔
          </p>

          <button
            className="create-btn"
            onClick={startBlankPoster}
          >
            ＋ Create New Poster
          </button>
        </section>

        <section className="local-admin-controls" aria-label="Local template creator mode">
          <div>
            <strong>{canEditTemplates ? "Local Template Creator Mode: On" : "Template Gallery"}</strong>
            <p>{canEditTemplates
              ? "Creator controls are enabled only in this browser session; this is not online authentication."
              : "Browse and edit templates as working copies. Only enable creator mode on a device you control."}</p>
          </div>
          <div>
            <button type="button" aria-pressed={localAdminMode} onClick={() => setLocalAdminMode((enabled) => !enabled)}>
              {canEditTemplates ? "Turn Off Creator Mode" : "Enable Local Creator Mode"}
            </button>
            {canEditTemplates && <button type="button" onClick={() => setTemplateManagerOpen(true)}>Manage Templates</button>}
          </div>
        </section>
        {templateStorageLoading && <p className="template-storage-status">Loading local templates…</p>}
        {templateStorageError && <p className="template-storage-error" role="alert">{templateStorageError}</p>}

        <h2 className="section-title">Categories</h2>

        <div className="categories">
          <div className="category">🤲<span>Dua</span></div>
          <div className="category">🕌<span>Jumma</span></div>
          <div className="category">❤️<span>Islamic Quotes</span></div>
          <div className="category">🌙<span>Ramadan</span></div>
          <div className="category">✨<span>Durood</span></div>
        </div>

        <h2 className="section-title">Ready Made Templates</h2>

        <TemplateGallery
          builtIns={posterTemplates}
          templates={savedTemplates}
          onSelect={selectTemplate}
          adminMode={canEditTemplates}
        />
      </main>

      {templateManagerOpen && canEditTemplates && (
        <TemplateManager
          templates={savedTemplates}
          onClose={() => setTemplateManagerOpen(false)}
          onMetadataChange={updateTemplateMetadata}
          onMove={moveTemplate}
          onReplace={replaceTemplate}
          onDelete={removeTemplate}
        />
      )}

      <footer>
        <p>© 2026 Qadri Poster Maker</p>
      </footer>
    </div>
  );
}

export default App;
