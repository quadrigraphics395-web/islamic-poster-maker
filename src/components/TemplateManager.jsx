import { useState } from "react";
import "./TemplateSystem.css";

export default function TemplateManager({ templates, onClose, onMetadataChange, onMove, onReplace, onDelete }) {
  const [editing, setEditing] = useState({});
  const [pendingAction, setPendingAction] = useState(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  async function runAction(template, action) {
    setError("");
    setBusyId(template.id);
    try {
      await action(template);
      setPendingAction(null);
    } catch (actionError) {
      setError(actionError.message || "Template changes could not be saved.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="template-modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="template-modal template-manager-modal" role="dialog" aria-modal="true" aria-labelledby="template-manager-title">
        <header className="template-modal-header">
          <div><span>LOCAL TEMPLATE LIBRARY</span><h2 id="template-manager-title">Manage Templates</h2></div>
          <button type="button" aria-label="Close template manager" onClick={onClose}>×</button>
        </header>
        <p className="template-local-notice">Shared templates are managed online. Existing browser-local templates remain stored on this device.</p>
        {error && <p className="template-error" role="alert">{error}</p>}
        <div className="template-manager-list">
          {templates.length === 0 && <p className="template-empty">No saved templates yet. Create a poster and choose Save as Template.</p>}
          {templates.map((template, index) => {
            const values = editing[template.id] ?? { name: template.name, category: template.category, description: template.description || "", featured: Boolean(template.featured), published: Boolean(template.published) };
            const pending = pendingAction?.id === template.id ? pendingAction.type : null;
            return (
              <article className="template-manager-item" key={template.id}>
                <img
                  src={template.preview}
                  alt={`${template.name} preview`}
                  onError={() => setError(`The preview for “${template.name}” could not be decoded. The saved template was left unchanged.`)}
                />
                <div className="template-manager-fields">
                  <label>Template name<input maxLength={100} value={values.name} onChange={(event) => setEditing((current) => ({ ...current, [template.id]: { ...values, name: event.target.value } }))} /></label>
                  <label>Category<input maxLength={60} value={values.category} onChange={(event) => setEditing((current) => ({ ...current, [template.id]: { ...values, category: event.target.value } }))} /></label>
                  {template.source === "online" && <>
                    <label>Description<input maxLength={500} value={values.description} onChange={(event) => setEditing((current) => ({ ...current, [template.id]: { ...values, description: event.target.value } }))} /></label>
                    <label className="template-check"><input type="checkbox" checked={values.featured} onChange={(event) => setEditing((current) => ({ ...current, [template.id]: { ...values, featured: event.target.checked } }))} /> Featured</label>
                    <label className="template-check"><input type="checkbox" checked={values.published} onChange={(event) => setEditing((current) => ({ ...current, [template.id]: { ...values, published: event.target.checked } }))} /> Published</label>
                  </>}
                  <div className="template-manager-actions">
                    <button type="button" disabled={busyId === template.id} onClick={() => runAction(template, () => onMetadataChange(template, values))}>Save Details</button>
                    {template.source !== "online" && <><button type="button" disabled={index === 0 || busyId === template.id} aria-label={`Move ${template.name} up`} onClick={() => runAction(template, () => onMove(template.id, -1))}>↑ Order</button>
                    <button type="button" disabled={index === templates.length - 1 || busyId === template.id} aria-label={`Move ${template.name} down`} onClick={() => runAction(template, () => onMove(template.id, 1))}>↓ Order</button></>}
                    <button type="button" disabled={busyId === template.id} onClick={() => setPendingAction({ id: template.id, type: "replace" })}>Update / Replace</button>
                    {template.source !== "online" && <button type="button" className="template-danger" disabled={busyId === template.id} onClick={() => setPendingAction({ id: template.id, type: "delete" })}>Delete</button>}
                  </div>
                  {pending && (
                    <div className="template-confirmation" role="alertdialog" aria-label={`${pending === "delete" ? "Delete" : "Replace"} template confirmation`}>
                      <strong>{pending === "delete" ? "Delete this template?" : "Replace saved design?"}</strong>
                      <span>{pending === "delete" ? "This removes the template from the local gallery. This cannot be undone." : "The current editor design and assets will replace this template's editable data."}</span>
                      <div>
                        <button type="button" onClick={() => setPendingAction(null)}>Cancel</button>
                        <button
                          type="button"
                          className={pending === "delete" ? "template-danger" : "template-primary"}
                          disabled={busyId === template.id}
                          onClick={() => runAction(template, () => pending === "delete" ? onDelete(template) : onReplace(template))}
                        >
                          Confirm {pending === "delete" ? "Delete" : "Replace"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
        <footer className="template-modal-footer"><button type="button" onClick={onClose}>Done</button></footer>
      </section>
    </div>
  );
}
