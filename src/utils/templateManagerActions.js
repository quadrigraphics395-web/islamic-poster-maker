export function getTemplateManagerValues(template, editing) {
  return editing[template.id] ?? {
    name: template.name,
    category: template.category,
    description: template.description || "",
    featured: Boolean(template.featured),
    published: Boolean(template.published),
  };
}

export function clearTemplateEdit(editing, templateId) {
  if (!Object.hasOwn(editing, templateId)) return editing;
  const next = { ...editing };
  delete next[templateId];
  return next;
}

export async function runTemplateAction(template, action, { setBusyId, setError, onSuccess, onFailure } = {}) {
  setError("");
  setBusyId(template.id);
  try {
    await action(template);
    onSuccess?.(template);
    return true;
  } catch (actionError) {
    setError(actionError.message || "Template changes could not be saved.");
    onFailure?.(template);
    return false;
  } finally {
    setBusyId(null);
  }
}
