import { useState, useRef, useEffect } from "react";
import "./App.css";

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
  { id: "bismillah", name: "Bismillah", text: "بسم اللہ الرحمن الرحیم", subtitle: "Begin with the name of Allah", background: "#17352c", accent: "#d5ad62", textColor: "#fffdf4", fontSize: 46 },
  { id: "jumma", name: "Jumma Mubarak", text: "جمعہ مبارک", subtitle: "A blessed Friday", background: "#17352c", accent: "#d5ad62", textColor: "#ffffff", fontSize: 58 },
  { id: "tawakkul", name: "Trust in Allah", text: "اللہ پر بھروسہ رکھیں", subtitle: "Place your trust in Allah", background: "#17352c", accent: "#d5ad62", textColor: "#ffffff", fontSize: 42 },
  { id: "ramadan", name: "Ramadan Kareem", text: "رمضان كريم", subtitle: "A month of mercy and reflection", background: "#143d38", accent: "#e0c37d", textColor: "#fff7e6", fontSize: 58 },
  { id: "eid", name: "Eid Mubarak", text: "عيد مبارك", subtitle: "Peace, joy and togetherness", background: "#713d3a", accent: "#f0cf91", textColor: "#fff7e9", fontSize: 58 },
  { id: "dhikr", name: "Daily Dhikr", text: "سُبْحَانَ الله", subtitle: "SubhanAllah", background: "#1e3852", accent: "#d7b975", textColor: "#fffaf0", fontSize: 56 },
  { id: "dua", name: "A Daily Dua", text: "رَبِّ زِدْنِي عِلْمًا", subtitle: "My Lord, increase me in knowledge", background: "#d8e8dc", accent: "#638b70", textColor: "#244435", fontSize: 42 },
  { id: "salawat", name: "Send Blessings", text: "اللهم صل على محمد", subtitle: "Peace and blessings upon the Prophet", background: "#343048", accent: "#dfbd83", textColor: "#fff9ed", fontSize: 42 },
  { id: "alhamdulillah", name: "Alhamdulillah", text: "الحمد لله", subtitle: "All praise belongs to Allah", background: "#e7d7b6", accent: "#617455", textColor: "#354733", fontSize: 64 },
  { id: "peace", name: "A Moment of Peace", text: "السلام عليكم", subtitle: "May peace be with you", background: "#31504b", accent: "#dfb886", textColor: "#fff8ed", fontSize: 52 },
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

  const [selectedId, setSelectedId] = useState(null);
  const [templateName, setTemplateName] = useState("Create New Poster");
  const [history, setHistory] = useState([]);
const [redoStack, setRedoStack] = useState([]);
const [snapGridEnabled, setSnapGridEnabled] = useState(true);
  const uploadRef = useRef(null);
  const backgroundUploadRef = useRef(null);
  const textFillUploadRef = useRef(null);
  const projectUploadRef = useRef(null);
  const canvasRef = useRef(null);
  const dragRef = useRef(null);
  const shapeIdRef = useRef(0);
  const selectedObject = objects.find((object) => object.id === selectedId);
  const textObjects = objects.filter((object) => object.type === "text");
  const selectedShapeIsVector = selectedObject?.type === "shape" && islamicShapes.some((shape) => shape.id === selectedObject.shape);
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

  function saveHistory() {
  setHistory((prev) => [
    ...prev,
    JSON.stringify(objects)
  ]);

  setRedoStack([]);
}
function undo() {
  if (!history.length) return;

  const last =
    history[history.length - 1];

  setRedoStack((prev) => [
    ...prev,
    JSON.stringify(objects)
  ]);

  setObjects(JSON.parse(last));

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

  setObjects(JSON.parse(last));

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

  function startBlankPoster() {
    resetPoster();
    setEditor(true);
  }

  function openTemplate(template) {
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
    setSelectedId(mainId);
    setTemplateName(template.name);
    setEditor(true);
  }

 function updateSelected(updates) {
    setObjects((current) => current.map((object) =>
      object.id === selectedId ? { ...object, ...updates } : object,
    ));
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
    const id = Date.now();
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
    setSelectedId(id);
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
    }]);
    setSelectedId(id);
  }

  function duplicateSelected() {
    saveHistory();
    if (!selectedObject) return;
    const id = `${selectedObject.id}-copy-${Date.now()}`;
    const duplicate = {
      ...selectedObject,
      id,
      x: Math.min(96, selectedObject.x + 5),
      y: Math.min(96, selectedObject.y + 5),
    };
    setObjects((current) => [...current, duplicate]);
    setSelectedId(id);
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
    const id = Date.now();
    const reader = new FileReader();
    reader.onload = () => {
      if (selectedObject?.type === "image") {
        setObjects((current) => current.map((object) =>
          object.id === selectedObject.id ? { ...object, src: reader.result } : object,
        ));
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
      setSelectedId(id);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
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
    reader.onload = () => setObjects((current) => current.map((object) =>
      object.id === targetId && object.type === "text"
        ? { ...object, imageFillSrc: reader.result }
        : object,
    ));
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  function moveObject(event, object) {
    if (object.locked) return;
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const canvasBounds = canvasRef.current.getBoundingClientRect();
    const objectBounds = event.currentTarget.getBoundingClientRect();
    dragRef.current = {
      id: object.id,
      pointerOffsetX: event.clientX - (objectBounds.left + objectBounds.width / 2),
      pointerOffsetY: event.clientY - (objectBounds.top + objectBounds.height / 2),
      halfWidth: (objectBounds.width / 2 + 6) / canvasBounds.width * 100,
      halfHeight: (objectBounds.height / 2 + 6) / canvasBounds.height * 100,
    };
    setSelectedId(object.id);
  }

  function dragObject(event) {
    if (!dragRef.current || !canvasRef.current) return;
    const drag = dragRef.current;
    const bounds = canvasRef.current.getBoundingClientRect();
    const minX = Math.min(drag.halfWidth, 50);
    const minY = Math.min(drag.halfHeight, 50);
    const rawX = ((event.clientX - bounds.left - drag.pointerOffsetX) / bounds.width) * 100;
    const rawY = ((event.clientY - bounds.top - drag.pointerOffsetY) / bounds.height) * 100;
    const x = Math.min(100 - minX, Math.max(minX, rawX));
    const y = Math.min(100 - minY, Math.max(minY, rawY));
    const gridSize = 2;

const snappedX = snapGridEnabled
  ? Math.round(x / gridSize) * gridSize
  : x;

const snappedY = snapGridEnabled
  ? Math.round(y / gridSize) * gridSize
  : y;
   setObjects((current) => current.map((object) =>
  object.id === drag.id
    ? {
        ...object,
        x: snappedX,
        y: snappedY
      }
    : object,
));
  }

  function saveProject() {

  const project = {
    canvasSize,
    customWidth,
    customHeight,
    background,
    backgroundMode,
    backgroundImage,
    objects
  };

  const blob = new Blob(
    [
      JSON.stringify(
        project,
        null,
        2
      )
    ], 
    {
      type: "application/json"
    }
  );

  const url =
    URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  link.href = url;

  link.download =
    "islamic-poster-project.json";

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

    const project =
      JSON.parse(reader.result);

    setCanvasSize(
      project.canvasSize ||
      "Square 1080x1080"
    );

    setCustomWidth(
      project.customWidth || 1080
    );

    setCustomHeight(
      project.customHeight || 1080
    );

    setBackground(
      project.background || "#ffffff"
    );

    setBackgroundMode(
      project.backgroundMode || "solid"
    );

    setBackgroundImage(
      project.backgroundImage || null
    );

    setObjects(
      project.objects || []
    );

    setSelectedId(null);
  };

  reader.readAsText(file);

  event.target.value = "";
}

  function downloadPoster(format) {
    const output = document.createElement("canvas");
    output.width = dimensions.width;
    output.height = dimensions.height;
    const context = output.getContext("2d");
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
    const scaleX = output.width / canvasRef.current.clientWidth;
    const scaleY = output.height / canvasRef.current.clientHeight;
    const pendingBackground = activeBackgroundImage ? new Promise((resolve) => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = activeBackgroundImage;
    }) : Promise.resolve(null);
    const pendingImages = objects.filter((object) => object.type === "image" || (object.type === "shape" && islamicShapes.some((shape) => shape.id === object.shape)));
    const images = pendingImages.map((object) => new Promise((resolve) => {
      const image = new Image();

      image.onload = () => resolve({ object, image });
      image.onerror = () => resolve(null);
      image.src = object.type === "shape"
        ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(getShapeSvgMarkup(object.shape, object.color))}`
        : object.src;
    }));
    const pendingTextFillImages = objects.filter((object) => object.type === "text" && object.fillMode === "image" && object.imageFillSrc);
    const textFillImages = pendingTextFillImages.map((object) => new Promise((resolve) => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => resolve({ object, image });
      image.onerror = () => resolve(null);
      image.src = object.imageFillSrc;
    }));
    const fontLoads = objects.filter((object) => object.type === "text").map((object) => {
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
      if (backgroundOverlayEnabled) {
        context.fillStyle = `rgba(0, 0, 0, ${backgroundOverlayOpacity / 100})`;
        context.fillRect(0, 0, output.width, output.height);
      }
      objects.forEach((object) => {
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
          const vectorShape = islamicShapes.some((shape) => shape.id === object.shape);
          if (vectorShape) {
            const loaded = loadedImages.find((item) => item?.object.id === object.id);
            if (loaded) {
              const width = ((object.width ?? 38) / 100) * output.width;
              const height = ((object.height ?? 38) / 100) * output.height;
              context.drawImage(loaded.image, x - width / 2, y - height / 2, width, height);
            }
          } else {
            context.fillStyle = object.color;
            const width = (object.width ?? 140) * scaleX;
            const height = (object.height ?? 16) * scaleY;
            if (object.shape === "circle-outline") {
              context.beginPath();
              context.ellipse(x, y, width / 2, height / 2, 0, 0, Math.PI * 2);
              context.strokeStyle = object.color;
              context.lineWidth = 2 * scaleX;
              context.stroke();
            } else if (object.shape === "circle") {
              context.beginPath();
              context.ellipse(x, y, width / 2, height / 2, 0, 0, Math.PI * 2);
              context.fill();
            } else {
              context.fillRect(x - width / 2, y - height / 2, width, height);
            }
          }
        } else {
          const loaded = loadedImages.find((item) => item?.object.id === object.id);
          if (loaded) {
            const width = ((object.width ?? 36) / 100) * output.width;
            const height = width * (loaded.image.height / loaded.image.width);
            context.drawImage(loaded.image, x - width / 2, y - height / 2, width, height);
          }
        }
      });
      const link = document.createElement("a");
      link.download = `islamic-poster.${format}`;
      link.href = output.toDataURL(format === "jpg" ? "image/jpeg" : "image/png", 0.92);
      link.click();
    });
  }

  if (editor) {
    return (
      <div className="editor-page">
        <header className="editor-topbar">
          <button className="back-btn" onClick={() => setEditor(false)}>← Back</button>
          <div className="editor-brand"><span className="logo">🕌</span><div><strong>Qadri Islamic Poster</strong><small>Poster Editor</small></div></div>
          <div className="export-actions">
            <button onClick={() => downloadPoster("jpg")}>Download JPG</button>
            <button className="export-primary" onClick={() => downloadPoster("png")}>Download PNG</button>
          </div>
        </header>

        <div className="editor-workspace">
          <aside className="editor-toolbar" aria-label="Poster tools">
            <div className="pages-panel">

  {pages.map((page) => (

  <div
    key={page.id}
    className="page-item"
  >

    <button
      onClick={() =>
        setCurrentPageId(page.id)
      }
      className={
        currentPageId === page.id
          ? "active-page"
          : ""
      }
    >
      {page.name}
    </button>

    <button
      onClick={() =>
        renamePage(page.id)
      }
    >
      ✏️
    </button>
    <button
  onClick={() =>
    deletePage(page.id)
  }
>
  🗑️
</button>

  </div>

))}
``
</div>
            <button onClick={undo}>
  ↶ Undo
</button>

<button onClick={redo}>
  ↷ Redo
</button>
<button
  onClick={() =>
    setSnapGridEnabled(
      !snapGridEnabled
    )
  }
>
  {snapGridEnabled
    ? "Grid ON"
    : "Grid OFF"}
</button>

<button onClick={saveProject}>
  💾 Save Project
</button>

<button onClick={addPage}>
  + Page
</button>

<button
  onClick={() =>
    projectUploadRef.current?.click()
  }
>
  📂 Load Project
</button>

            <button onClick={addText}><span> T </span>Add Text</button>
            <button onClick={() => uploadRef.current?.click()}><span>▧</span>{selectedObject?.type === "image" ? "Replace Image" : "Upload Image"}</button>
            <label className="tool-color"><span>◐</span><span>Background</span><input aria-label="Background color" type="color" value={background} onChange={(event) => { setBackground(event.target.value); setBackgroundMode("solid"); }} /></label>
            <button onClick={() => backgroundUploadRef.current?.click()}><span>▧</span>Background Image</button>
            <button onClick={() => setShapePickerOpen(true)}><span>▰</span>Add Shape</button>
  {selectedObject && (
  <button
    onClick={() =>
      updateSelected({
        locked: !selectedObject.locked
      })
    }
  >
    {selectedObject.locked
      ? "🔓 Unlock Layer"
      : "🔒 Lock Layer"}
  </button>
)}
<button
  className="delete-tool"
  disabled={!selectedObject}
  onClick={() => {

    saveHistory();

    setObjects((current) =>
      current.filter(
        (object) =>
          object.id !== selectedId
      )
    );

    setSelectedId(null);

  }}
>
  <span>⌫</span>
  Delete Selected
</button>

            <button className="reset-tool" onClick={resetPoster}><span>↺</span>Clear / Reset</button>
       <input
  ref={uploadRef}
  className="file-input"
  type="file"
  accept="image/*"
  onChange={uploadImage}
/>

<input
  ref={backgroundUploadRef}
  className="file-input"
  type="file"
  accept="image/*"
  onChange={uploadBackgroundImage}
/>

<input
  ref={projectUploadRef}
  className="file-input"
  type="file"
  accept=".json"
  onChange={loadProject}
/>

</aside>

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
              <div ref={canvasRef} className="poster-canvas" style={{ aspectRatio: `${dimensions.width} / ${dimensions.height}`, width: dimensions.width > dimensions.height ? "100%" : "auto", height: dimensions.width > dimensions.height ? "auto" : "100%", backgroundColor: background, backgroundImage: backgroundMode === "gradient" ? backgroundGradientCss : "none" }} onPointerMove={dragObject} onPointerUp={() => { dragRef.current = null; }}>
                {activeBackgroundImage && <img className="poster-background-image" src={activeBackgroundImage} alt="" draggable="false" />}
                {backgroundOverlayEnabled && <div className="poster-background-overlay" style={{ opacity: backgroundOverlayOpacity / 100 }} />}
                {objects.map((object) => {
                  const vectorShape = object.type === "shape" && islamicShapes.some((shape) => shape.id === object.shape);
                  return <div key={object.id} data-object-id={object.id} className={`canvas-object ${selectedId === object.id ? "is-selected" : ""}`} style={{ left: `${object.x}%`, top: `${object.y}%`, width: object.type === "image" ? `${object.width ?? 36}%` : vectorShape ? `${object.width}%` : undefined, height: vectorShape ? `${object.height}%` : undefined, transform: object.type === "text" ? `translate(-50%, -50%) rotate(${object.rotation ?? 0}deg)` : undefined }} onPointerDown={(event) => moveObject(event, object)} onClick={() => setSelectedId(object.id)}>
                    {object.type === "text" && <span className="canvas-text" data-object-id={object.id} dir={object.direction ?? "auto"} style={{ ...getTextTypographyStyle(object), opacity: (object.opacity ?? 100) / 100 }}>
                      <span className="canvas-text-layer canvas-text-outline" dir={object.direction ?? "auto"} aria-hidden="true" style={getTextStrokeStyle(object)}>{object.text}</span>
                      <span className="canvas-text-layer canvas-text-fill" dir={object.direction ?? "auto"} style={{ ...getTextPreviewStyle({ ...object, strokeEnabled: false, opacity: 100 }), WebkitTextStroke: "0 transparent", paintOrder: "normal" }}>{object.text}</span>
                    </span>}
                    {vectorShape && <ShapeArtwork shape={object.shape} color={object.color} className="canvas-vector-shape" />}
                    {object.type === "shape" && !vectorShape && <span className={`canvas-shape shape-${object.shape ?? "line"}`} style={{ width: `${object.width ?? 140}px`, height: `${object.height ?? 16}px`, backgroundColor: object.shape === "circle-outline" ? "transparent" : object.color, borderColor: object.color }} />}
                    {object.type === "image" && <img className="canvas-image" src={object.src} alt="Uploaded poster element" />}
                  </div>;
                })}
              </div>
            </div>
            <div className="canvas-caption">{canvasSize} <span>{dimensions.width} × {dimensions.height} px</span></div>
          </main>

          <aside className="properties-panel">
            <h2>{selectedObject?.type === "text" ? "Text Properties" : "Design"}</h2>
            <p className="panel-hint">Select an element on your canvas to edit it.</p>
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
            {textObjects.length > 1 && <>
              <label className="field-label" htmlFor="text-layer">Text layers</label>
              <select id="text-layer" className="font-select" value={selectedObject?.type === "text" ? String(selectedId) : ""} onChange={(event) => setSelectedId(textObjects.find((object) => String(object.id) === event.target.value)?.id ?? null)}>
                <option value="">Select a text layer</option>
                {textObjects.map((object, index) => <option key={object.id} value={String(object.id)}>{`${index + 1}. ${object.text.slice(0, 28)}`}</option>)}
              </select>
            </>}
            {selectedObject?.type === "text" && <>
              <details className="text-section" open>
                <summary>Text</summary>
                <label className="field-label" htmlFor="poster-text">Content</label>
                <textarea id="poster-text" className="text-input" dir={selectedObject.direction ?? "auto"} style={{ fontFamily: selectedObject.fontFamily ?? fontOptions[0].value }} value={selectedObject.text} onChange={(event) => updateSelected({ text: event.target.value })} />
              </details>
              <details className="text-section" open>
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
              <details className="text-section" open>
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
                <label className="field-label" htmlFor="text-opacity">Opacity <span>{selectedObject.opacity ?? 100}%</span></label>
                <input id="text-opacity" className="size-range" type="range" min="0" max="100" value={selectedObject.opacity ?? 100} onChange={(event) => updateSelected({ opacity: Number(event.target.value) })} />
              </details>
              <details className="text-section text-designs-section" open>
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
                <label className="field-label" htmlFor="text-position-x">X position <span>{Math.round(selectedObject.x)}%</span></label>
                <input id="text-position-x" className="size-range" type="range" min="0" max="100" value={selectedObject.x} onChange={(event) => updateSelected({ x: Number(event.target.value) })} />
                <label className="field-label" htmlFor="text-position-y">Y position <span>{Math.round(selectedObject.y)}%</span></label>
                <input id="text-position-y" className="size-range" type="range" min="0" max="100" value={selectedObject.y} onChange={(event) => updateSelected({ y: Number(event.target.value) })} />
              </details>
              <details className="text-section">
                <summary>Rotation</summary>
                <label className="field-label" htmlFor="text-rotation">Rotation <span>{selectedObject.rotation ?? 0}°</span></label>
                <input id="text-rotation" className="size-range" type="range" min="-180" max="180" value={selectedObject.rotation ?? 0} onChange={(event) => updateSelected({ rotation: Number(event.target.value) })} />
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
              <button className="replace-image-btn" onClick={() => uploadRef.current?.click()}>Replace image</button>
              <label className="field-label" htmlFor="image-size">Image width <span>{selectedObject.width ?? 36}%</span></label>
              <input id="image-size" className="size-range" type="range" min="10" max="90" value={selectedObject.width ?? 36} onChange={(event) => updateSelected({ width: Number(event.target.value) })} />
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
      </div>
    );
  }

 return (
  <div className="app">
<header className="header">
  <div className="logo">
    <img
      src="/logo.png"
      alt="Logo"
      style={{
        width: "100%", height: "100%"
      }}
    />
    <p>Quadri Islamic Poster</p>
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

        <h2 className="section-title">Categories</h2>

        <div className="categories">
          <div className="category">🤲<span>Dua</span></div>
          <div className="category">🕌<span>Jumma</span></div>
          <div className="category">❤️<span>Islamic Quotes</span></div>
          <div className="category">🌙<span>Ramadan</span></div>
          <div className="category">✨<span>Durood</span></div>
        </div>

        <h2 className="section-title">Ready Made Templates</h2>

        <div className="templates">
          {posterTemplates.map((template, index) => (
            <button
              key={template.id}
              type="button"
              className={`template${index > 2 ? " template-designed" : ""}`}
              style={index > 2 ? {
                "--template-background": template.background,
                "--template-accent": template.accent,
                "--template-text": template.textColor,
              } : undefined}
              onClick={() => openTemplate(template)}
              aria-label={`Edit ${template.name} template`}
            >
              {index < 3 ? template.text : <>
                <span className="template-overline">{template.name}</span>
                <span className="template-preview-text" dir="auto">{template.text}</span>
                <span className="template-preview-subtitle">{template.subtitle}</span>
                <span className="template-preview-ornament" aria-hidden="true" />
              </>}
            </button>
          ))}
        </div>
      </main>

      <footer>
        <p>© 2026 Qadri Islamic Poster</p>
      </footer>
    </div>
  );
}

export default App;