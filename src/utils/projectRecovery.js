export const PROJECT_RECOVERY_KEY = "qadri-poster-maker.recovery.v1";

export function readProjectRecovery(storage = globalThis.localStorage) {
  const value = storage?.getItem(PROJECT_RECOVERY_KEY);
  if (!value) return null;
  let record;
  try { record = JSON.parse(value); }
  catch { throw new Error("The local recovery copy is corrupted. Your saved projects were left untouched."); }
  if (!record || record.version !== 1 || !record.project || typeof record.project !== "object") {
    throw new Error("The local recovery copy has an unsupported format. Your saved projects were left untouched.");
  }
  return record;
}

export function writeProjectRecovery(project, { storage = globalThis.localStorage, fileHandleKey = null, now = Date.now() } = {}) {
  try {
    storage.setItem(PROJECT_RECOVERY_KEY, JSON.stringify({ version: 1, updatedAt: now, fileHandleKey, project }));
    return { saved: true };
  } catch (error) {
    return { saved: false, error: error?.name === "QuotaExceededError" ? "Automatic local recovery is full. Save this poster to a project file." : "Automatic local recovery is unavailable in this browser." };
  }
}
