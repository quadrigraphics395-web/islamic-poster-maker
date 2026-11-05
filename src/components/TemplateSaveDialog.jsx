import { useState } from "react";
import "./TemplateSystem.css";

export default function TemplateSaveDialog({ preview, categories, initialName, onSave, onClose }) {
  const [name, setName] = useState(initialName || "");
  const [category, setCategory] = useState(categories[0] || "My Templates");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      await onSave(name, category);
      onClose();
    } catch (saveError) {
      setError(saveError.message || "The template could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="template-modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <form className="template-modal template-save-modal" onSubmit={submit} aria-labelledby="template-save-title">
        <header className="template-modal-header">
          <div><span>LOCAL TEMPLATE LIBRARY</span><h2 id="template-save-title">Save as Template</h2></div>
          <button type="button" aria-label="Close dialog" onClick={onClose}>×</button>
        </header>
        <div className="template-save-content">
          <div className="template-preview-frame">
            {preview ? <img src={preview} alt="Current poster preview" /> : <p>Creating preview…</p>}
          </div>
          <label>Template name<input autoFocus required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} /></label>
          <label>Category<input required list="template-category-options" maxLength={60} value={category} onChange={(event) => setCategory(event.target.value)} /></label>
          <datalist id="template-category-options">{categories.map((item) => <option key={item} value={item} />)}</datalist>
          <p className="template-local-notice">Local-only creator mode. This is not online authentication or server-side access control.</p>
          {error && <p className="template-error" role="alert">{error}</p>}
        </div>
        <footer className="template-modal-footer">
          <button type="button" onClick={onClose}>Cancel</button>
          <button className="template-primary" type="submit" disabled={!preview || saving}>{saving ? "Saving…" : "Save Template"}</button>
        </footer>
      </form>
    </div>
  );
}
