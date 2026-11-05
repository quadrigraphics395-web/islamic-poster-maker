export const PROJECTS_STORAGE_KEY = "qadri-islamic-poster-projects";

export function readProjects(storage = window.localStorage) {
  const saved = storage.getItem(PROJECTS_STORAGE_KEY);
  if (!saved) return [];

  let projects;
  try {
    projects = JSON.parse(saved);
  } catch {
    throw new Error("Saved projects could not be read because the browser data is invalid.");
  }

  if (!Array.isArray(projects) || projects.some((project) => (
    !project || typeof project.id !== "string" || typeof project.name !== "string" || !project.project
  ))) {
    throw new Error("Saved projects could not be read because their data has an unexpected format.");
  }
  return projects;
}

export function writeProjects(projects, storage = window.localStorage) {
  try {
    storage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
  } catch (error) {
    if (error?.name === "QuotaExceededError" || error?.name === "NS_ERROR_DOM_QUOTA_REACHED") {
      throw new Error("Browser storage is full. Remove an unused project or export a JSON backup before saving.");
    }
    throw new Error(`Could not save projects in this browser: ${error.message || "storage unavailable"}`);
  }
}

export function createProjectRecord(name, project, id = null, now = Date.now()) {
  return {
    id: id ?? `project-${now}-${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim(),
    updatedAt: now,
    project,
  };
}
