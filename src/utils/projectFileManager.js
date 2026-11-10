export const PROJECT_FILE_FORMAT = "qadri-poster-maker-project";
export const PROJECT_FILE_VERSION = 1;
export const PROJECT_FILE_EXTENSION = ".qpm";

export function serializeProjectFile(project) {
  return JSON.stringify({ format: PROJECT_FILE_FORMAT, formatVersion: PROJECT_FILE_VERSION, project }, null, 2);
}

export function parseProjectFile(contents) {
  let parsed;
  try { parsed = JSON.parse(contents); }
  catch { throw new Error("This project file is not valid JSON or may be corrupted."); }
  const project = parsed?.format === PROJECT_FILE_FORMAT ? parsed.project : parsed;
  if (!project || typeof project !== "object" || Array.isArray(project)) throw new Error("This file does not contain a valid editable project.");
  if (parsed?.format === PROJECT_FILE_FORMAT && parsed.formatVersion !== PROJECT_FILE_VERSION) throw new Error("This QPM project was created by an unsupported file format version.");
  if ((!Array.isArray(project.objects) && !Array.isArray(project.pages))
    || (project.objects != null && !Array.isArray(project.objects))
    || (project.pages != null && (!Array.isArray(project.pages) || project.pages.some((page) => !page || !Array.isArray(page.objects))))) {
    throw new Error("This file is missing valid poster objects or pages and was not opened.");
  }
  return project;
}

export function suggestedProjectFileName(name = "qadri-poster") {
  const safe = String(name || "qadri-poster").trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-").replace(/[. ]+$/g, "").slice(0, 100) || "qadri-poster";
  return safe.toLowerCase().endsWith(PROJECT_FILE_EXTENSION) ? safe : `${safe}${PROJECT_FILE_EXTENSION}`;
}

export async function chooseProjectSaveHandle(platform = globalThis, fileName = "qadri-poster.qpm") {
  if (typeof platform.showSaveFilePicker !== "function") return null;
  return platform.showSaveFilePicker({
    suggestedName: suggestedProjectFileName(fileName),
    types: [{ description: "Qadri Poster Maker project", accept: { "application/json": [".qpm"] } }],
  });
}

export async function chooseProjectOpenFile(platform = globalThis) {
  if (typeof platform.showOpenFilePicker !== "function") return null;
  const [handle] = await platform.showOpenFilePicker({
    multiple: false,
    types: [{ description: "Qadri Poster Maker project", accept: { "application/json": [".qpm", ".json"] } }],
  });
  return { handle, file: await handle.getFile() };
}

export async function writeProjectFileHandle(handle, contents) {
  if (!handle || typeof handle.createWritable !== "function") throw new Error("The selected project file is unavailable. Choose Save As to select it again.");
  if (typeof handle.queryPermission === "function") {
    let permission = await handle.queryPermission({ mode: "readwrite" });
    if (permission !== "granted" && typeof handle.requestPermission === "function") permission = await handle.requestPermission({ mode: "readwrite" });
    if (permission !== "granted") throw new Error("Permission to save this file was not granted. Choose Save As to select a file again.");
  }
  const writable = await handle.createWritable();
  try {
    await writable.write(contents);
    await writable.close();
  } catch (error) {
    await writable.abort?.().catch?.(() => {});
    throw new Error(`The project file could not be saved: ${error.message || "write failed"}`);
  }
}

export function downloadProjectFile(contents, fileName, platform = globalThis) {
  if (!platform.document?.createElement || !platform.URL?.createObjectURL) throw new Error("This browser cannot create a project download.");
  const blob = new platform.Blob([contents], { type: "application/vnd.qadri.poster-project+json" });
  const url = platform.URL.createObjectURL(blob);
  const link = platform.document.createElement("a");
  link.href = url;
  link.download = suggestedProjectFileName(fileName);
  link.click();
  platform.URL.revokeObjectURL(url);
  return link.download;
}

export async function readProjectFile(file) {
  if (!file || typeof file.text !== "function") throw new Error("Choose a readable .qpm or JSON project file.");
  return parseProjectFile(await file.text());
}

export function confirmProjectReplacement(hasUnsavedChanges, confirm = globalThis.confirm) {
  if (!hasUnsavedChanges) return true;
  return confirm("This poster has unsaved changes. Replace it and lose those changes?");
}
