export const PERSONAL_FONTS_DB = "qadri-personal-fonts";
export const PERSONAL_FONTS_STORE = "fonts";
export const MAX_FONT_FILE_BYTES = 20 * 1024 * 1024;

export function readSfntNames(buffer) {
  const view = new DataView(buffer);
  if (view.byteLength < 12) throw new Error("This file is too small to be a supported font.");
  const signature = view.getUint32(0);
  if (![0x00010000, 0x4f54544f, 0x74727565, 0x74797031].includes(signature)) {
    throw new Error("This file is not a supported TrueType or OpenType font.");
  }
  const tableCount = view.getUint16(4);
  let nameOffset = -1;
  let nameLength = 0;
  for (let index = 0; index < tableCount; index += 1) {
    const offset = 12 + index * 16;
    if (offset + 16 > view.byteLength) break;
    if (view.getUint32(offset) === 0x6e616d65) {
      nameOffset = view.getUint32(offset + 8);
      nameLength = view.getUint32(offset + 12);
      break;
    }
  }
  if (nameOffset < 0 || nameOffset + nameLength > view.byteLength) return { family: "Imported Font", style: "Regular" };
  const count = view.getUint16(nameOffset + 2);
  const stringsOffset = nameOffset + view.getUint16(nameOffset + 4);
  const records = [];
  for (let index = 0; index < count; index += 1) {
    const record = nameOffset + 6 + index * 12;
    if (record + 12 > view.byteLength) break;
    const platform = view.getUint16(record);
    const language = view.getUint16(record + 4);
    const nameId = view.getUint16(record + 6);
    const length = view.getUint16(record + 8);
    const offset = stringsOffset + view.getUint16(record + 10);
    if (![1, 2, 4, 6, 16, 17].includes(nameId) || offset + length > view.byteLength) continue;
    const bytes = new Uint8Array(buffer, offset, length);
    let value;
    if (platform === 0 || platform === 3) {
      let decoded = "";
      for (let i = 0; i + 1 < bytes.length; i += 2) decoded += String.fromCharCode(bytes[i] * 256 + bytes[i + 1]);
      value = decoded;
    } else value = new TextDecoder("macintosh").decode(bytes);
    records.push({ nameId, language, value: value.replace(/\0/g, "").trim() });
  }
  const pick = (...ids) => {
    for (const id of ids) {
      const candidates = records.filter((record) => record.nameId === id && record.value);
      const preferred = candidates.find((record) => record.language === 0x0409) ?? candidates[0];
      if (preferred) return preferred.value;
    }
    return "";
  };
  return { family: pick(16, 1) || "Imported Font", style: pick(17, 2) || "Regular", fullName: pick(4, 6) };
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) return reject(new Error("This browser does not support local font storage."));
    const request = indexedDB.open(PERSONAL_FONTS_DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(PERSONAL_FONTS_STORE, { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open local font storage."));
  });
}

async function withStore(mode, action) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(PERSONAL_FONTS_STORE, mode);
    const request = action(transaction.objectStore(PERSONAL_FONTS_STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Local font storage failed."));
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => { database.close(); reject(transaction.error); };
  });
}

export const listPersonalFonts = () => withStore("readonly", (store) => store.getAll());
export const savePersonalFont = (font) => withStore("readwrite", (store) => store.put(font));
export const deletePersonalFont = (id) => withStore("readwrite", (store) => store.delete(id));

export async function preparePersonalFont(file) {
  if (!/\.(ttf|otf)$/i.test(file.name)) throw new Error("Choose a .ttf or .otf font file.");
  if (!file.size || file.size > MAX_FONT_FILE_BYTES) throw new Error("Font files must be smaller than 20 MB.");
  const buffer = await file.arrayBuffer();
  const metadata = readSfntNames(buffer);
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  const hash = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  const style = metadata.style.toLowerCase();
  const weight = /black|heavy/.test(style) ? 900 : /extra.?bold|ultra.?bold/.test(style) ? 800 : /semi.?bold|demi.?bold/.test(style) ? 600 : /bold/.test(style) ? 700 : /medium/.test(style) ? 500 : 400;
  return { id: hash, hash, fileName: file.name, family: metadata.family, style: metadata.style, weight, label: metadata.fullName || `${metadata.family} ${metadata.style}`, blob: new Blob([buffer], { type: "font/ttf" }), addedAt: Date.now() };
}
