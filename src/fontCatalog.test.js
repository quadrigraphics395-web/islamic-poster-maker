import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { builtInFonts } from "./fontCatalog.js";

test("built-in font catalog covers the required scripts with 25 or more families", () => {
  assert.equal(new Set(builtInFonts.map((font) => font.label)).size, builtInFonts.length);
  assert.ok(builtInFonts.length >= 25);
  for (const category of ["Urdu Nastaliq", "Arabic", "English", "Hindi / Devanagari"]) {
    assert.ok(builtInFonts.some((font) => font.category === category), `Missing ${category}`);
  }
});

test("every registered built-in font has a bundled OFL notice", () => {
  const licenseFiles = new Set([
    "noto-nastaliq-urdu", "amiri", "noto-naskh-arabic", "noto-sans-arabic", "noto-kufi-arabic", "scheherazade-new", "cairo", "tajawal", "ibm-plex-sans-arabic", "mada", "markazi-text", "reem-kufi", "el-messiri", "changa", "harmattan", "mirza", "aref-ruqaa", "inter", "montserrat", "poppins", "lato", "playfair-display", "oswald", "roboto", "merriweather", "noto-sans-devanagari", "noto-serif-devanagari", "hind", "mukta", "tiro-devanagari-hindi", "kalam",
  ]);
  assert.equal(licenseFiles.size, builtInFonts.length);
  for (const license of licenseFiles) assert.ok(existsSync(`public/fonts/licenses/${license}-OFL-1.1.txt`), `Missing license for ${license}`);
});
