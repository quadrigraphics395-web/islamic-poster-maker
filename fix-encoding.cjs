const fs = require("fs");

const file = "src/App.jsx";
const backup = "src/App.backup-before-encoding-fix.jsx";

if (!fs.existsSync(file)) {
  console.error("App.jsx not found.");
  process.exit(1);
}

fs.copyFileSync(file, backup);

const text = fs.readFileSync(file, "utf8");

const cp1252 = {
  "€": 0x80,
  "‚": 0x82,
  "ƒ": 0x83,
  "„": 0x84,
  "…": 0x85,
  "†": 0x86,
  "‡": 0x87,
  "ˆ": 0x88,
  "‰": 0x89,
  "Š": 0x8A,
  "‹": 0x8B,
  "Œ": 0x8C,
  "Ž": 0x8E,
  "‘": 0x91,
  "’": 0x92,
  "“": 0x93,
  "”": 0x94,
  "•": 0x95,
  "–": 0x96,
  "—": 0x97,
  "˜": 0x98,
  "™": 0x99,
  "š": 0x9A,
  "›": 0x9B,
  "œ": 0x9C,
  "ž": 0x9E,
  "Ÿ": 0x9F
};

function repairMojibake(value) {
  const bytes = [];

  for (const ch of value) {
    const code = ch.codePointAt(0);

    if (Object.prototype.hasOwnProperty.call(cp1252, ch)) {
      bytes.push(cp1252[ch]);
    } else if (code <= 255) {
      bytes.push(code);
    } else {
      return value;
    }
  }

  try {
    const repaired = new TextDecoder("utf-8", { fatal: true }).decode(
      Uint8Array.from(bytes)
    );

    return repaired;
  } catch {
    return value;
  }
}

const repaired = repairMojibake(text);

fs.writeFileSync(file, repaired, "utf8");

console.log("Encoding fixed successfully!");
console.log("Backup created:");
console.log(backup);