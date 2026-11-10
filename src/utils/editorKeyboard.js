export function isEditableKeyboardTarget(target) {
  if (!target) return false;
  const tagName = String(target.tagName ?? "").toUpperCase();
  return ["INPUT", "TEXTAREA", "SELECT"].includes(tagName) || target.isContentEditable === true;
}
