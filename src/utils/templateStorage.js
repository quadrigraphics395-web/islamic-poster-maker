export const TEMPLATE_DATABASE_NAME = "qadri-islamic-poster-templates";
export const TEMPLATE_STORE_NAME = "templates";
const TEMPLATE_DATABASE_VERSION = 1;

let databasePromise;

function openTemplateDatabase() {
  if (!globalThis.indexedDB) {
    return Promise.reject(new Error("Template storage is unavailable in this browser."));
  }
  if (databasePromise) return databasePromise;

  databasePromise = new Promise((resolve, reject) => {
    const request = globalThis.indexedDB.open(TEMPLATE_DATABASE_NAME, TEMPLATE_DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(TEMPLATE_STORE_NAME)) {
        database.createObjectStore(TEMPLATE_STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      databasePromise = null;
      reject(new Error(`Could not open local template storage: ${request.error?.message || "unknown database error"}`));
    };
    request.onblocked = () => {
      databasePromise = null;
      reject(new Error("Local template storage is blocked by another open app tab. Close other tabs and try again."));
    };
  });
  return databasePromise;
}

function runTransaction(mode, operation) {
  return openTemplateDatabase().then((database) => new Promise((resolve, reject) => {
    const transaction = database.transaction(TEMPLATE_STORE_NAME, mode);
    const store = transaction.objectStore(TEMPLATE_STORE_NAME);
    let result;
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(new Error(`Could not access local templates: ${transaction.error?.message || "transaction failed"}`));
    transaction.onabort = () => reject(new Error(`Local template storage canceled the operation: ${transaction.error?.message || "transaction aborted"}`));
    try {
      const request = operation(store);
      if (request) {
        request.onsuccess = () => { result = request.result; };
        request.onerror = () => transaction.abort();
      }
    } catch (error) {
      transaction.abort();
      reject(error);
    }
  }));
}

const browserTemplateDatabase = {
  getAll: () => runTransaction("readonly", (store) => store.getAll()),
  put: (template) => runTransaction("readwrite", (store) => store.put(template)),
  delete: (id) => runTransaction("readwrite", (store) => store.delete(id)),
};

function visitImageAssets(project, visitor) {
  if (project.backgroundImage != null) visitor(project.backgroundImage, "background image");
  const pages = Array.isArray(project.pages) ? project.pages : [];
  const objectLists = [project.objects, ...pages.map((page) => page?.objects)];
  for (const objects of objectLists) {
    if (!Array.isArray(objects)) continue;
    for (const object of objects) {
      if (object?.type === "image") visitor(object.src, "image object", true);
      if (object?.type === "text" && object.fillMode === "image" && object.imageFillSrc) visitor(object.imageFillSrc, "text image fill");
      if (object?.type === "group" && Array.isArray(object.children)) {
        visitImageAssets({ objects: object.children }, visitor);
      }
    }
  }
}

export function validateTemplateProject(project) {
  if (!project || typeof project !== "object" || Array.isArray(project)) {
    throw new Error("Template data is missing or is not a valid editable poster project.");
  }
  if (!Array.isArray(project.objects) && !Array.isArray(project.pages)) {
    throw new Error("Template data does not contain editable objects or pages.");
  }
  if (Array.isArray(project.pages) && project.pages.some((page) => !page || !Array.isArray(page.objects))) {
    throw new Error("A template page has invalid object data. The saved template was left unchanged.");
  }

  visitImageAssets(project, (source, assetName, required) => {
    if (required && (typeof source !== "string" || !source)) {
      throw new Error(`The ${assetName} is missing. Reimport it into the editor before saving this template.`);
    }
    if (source != null && (typeof source !== "string" || source.startsWith("blob:") || !source.startsWith("data:image/"))) {
      throw new Error(`The ${assetName} is not stored as persistent image data. Reimport it into the editor before saving this template.`);
    }
  });
}

export function createTemplateRecord(name, category, project, preview, id = null, order = 0, now = Date.now()) {
  const normalizedName = typeof name === "string" ? name.trim() : "";
  const normalizedCategory = typeof category === "string" ? category.trim() : "";
  if (!normalizedName) throw new Error("Enter a template name before saving.");
  if (!normalizedCategory) throw new Error("Enter a template category before saving.");
  validateTemplateProject(project);
  if (typeof preview !== "string" || !preview.startsWith("data:image/")) {
    throw new Error("A persistent preview image is required to save this template.");
  }

  return {
    id: id ?? `template-${now}-${Math.random().toString(36).slice(2, 8)}`,
    name: normalizedName,
    category: normalizedCategory,
    order,
    createdAt: now,
    updatedAt: now,
    preview,
    project,
  };
}

export async function readTemplates(database = browserTemplateDatabase) {
  const templates = await database.getAll();
  if (!Array.isArray(templates) || templates.some((template) => (
    !template
    || typeof template.id !== "string"
    || typeof template.name !== "string"
    || typeof template.category !== "string"
    || typeof template.preview !== "string"
    || !template.project
  ))) {
    throw new Error("Saved templates contain invalid data. They were left untouched so they can be recovered.");
  }
  for (const template of templates) {
    validateTemplateProject(template.project);
    if (!template.preview.startsWith("data:image/")) {
      throw new Error(`The preview for “${template.name}” is invalid. The saved template was left unchanged.`);
    }
  }
  return templates.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
}

export async function writeTemplate(template, database = browserTemplateDatabase) {
  if (!template || typeof template.id !== "string" || !template.name?.trim() || !template.category?.trim()) {
    throw new Error("Template name, category, and identifier are required.");
  }
  validateTemplateProject(template.project);
  if (typeof template.preview !== "string" || !template.preview.startsWith("data:image/")) {
    throw new Error("Template preview data is invalid. The template was not changed.");
  }
  await database.put(template);
}

export async function deleteTemplate(id, database = browserTemplateDatabase) {
  if (typeof id !== "string" || !id) throw new Error("A valid template must be selected.");
  const templates = await readTemplates(database);
  if (!templates.some((template) => template.id === id)) {
    throw new Error("That template no longer exists. Refresh the template list before trying again.");
  }
  await database.delete(id);
}
