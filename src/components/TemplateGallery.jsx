import { useMemo, useState } from "react";
import "./TemplateSystem.css";

export default function TemplateGallery({ builtIns, templates, onSelect, adminMode }) {
  const [category, setCategory] = useState("All");
  const [active, setActive] = useState(null);
  const [failedPreviews, setFailedPreviews] = useState({});
  const categories = useMemo(() => [
    "All",
    ...new Set([
      ...builtIns.map((template) => template.category),
      ...templates.map((template) => template.category),
    ]),
  ], [builtIns, templates]);
  const entries = [
    ...builtIns.map((template) => ({ ...template, source: "built-in" })),
    ...templates.map((template) => ({ ...template, source: "saved" })),
  ].filter((template) => category === "All" || template.category === category);

  function editTemplate(template) {
    setActive(null);
    onSelect(template);
  }

  return (
    <>
      <div className="template-gallery-tools">
        <label>Category
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            {categories.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <span>{entries.length} templates</span>
        {adminMode && <span className="template-admin-badge">Local creator mode</span>}
      </div>
      <div className="templates template-gallery">
        {entries.map((template) => (
          <button type="button" key={`${template.source}-${template.id}`} className="template template-gallery-card" onClick={() => setActive(template)} aria-label={`Preview ${template.name} template`}>
            {template.source === "saved"
              ? failedPreviews[template.id]
                ? <span className="template-preview-failure" role="alert">Preview unavailable</span>
                : <img src={template.preview} alt="" onError={() => setFailedPreviews((current) => ({ ...current, [template.id]: true }))} />
              : <span className="template-built-in-preview" style={{ "--template-background": template.background, "--template-accent": template.accent, "--template-text": template.textColor }}>
                  <strong>{template.name}</strong><span dir="auto">{template.text}</span><small>{template.subtitle}</small>
                </span>}
            <span className="template-gallery-meta"><strong>{template.name}</strong><small>{template.category}</small></span>
          </button>
        ))}
        {entries.length === 0 && <p className="template-empty">No templates in this category yet.</p>}
      </div>
      {active && (
        <div className="template-modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setActive(null);
        }}>
          <section className="template-modal template-detail-modal" role="dialog" aria-modal="true" aria-labelledby="template-detail-title">
            <header className="template-modal-header">
              <div><span>{active.category}</span><h2 id="template-detail-title">{active.name}</h2></div>
              <button type="button" aria-label="Close template preview" onClick={() => setActive(null)}>×</button>
            </header>
            <div className="template-detail-preview">
              {active.source === "saved"
                ? failedPreviews[active.id]
                  ? <p className="template-preview-failure" role="alert">This saved preview could not be decoded. The editable template data is still retained.</p>
                  : <img src={active.preview} alt={`${active.name} full preview`} onError={() => setFailedPreviews((current) => ({ ...current, [active.id]: true }))} />
                : <div className="template-built-in-preview template-detail-built-in" style={{ "--template-background": active.background, "--template-accent": active.accent, "--template-text": active.textColor }}>
                    <strong>{active.name}</strong><span dir="auto">{active.text}</span><small>{active.subtitle}</small>
                  </div>}
            </div>
            {active.source === "saved" && <p className="template-local-notice">This opens a working copy. Editing or saving a project does not change the original template.</p>}
            <footer className="template-modal-footer">
              <button type="button" onClick={() => setActive(null)}>Cancel</button>
              <button className="template-primary" type="button" onClick={() => editTemplate(active)}>Edit Template</button>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
