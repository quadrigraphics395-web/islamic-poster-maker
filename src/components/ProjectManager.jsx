import { useState } from "react";
import "./ProjectManager.css";

function normalizedName(name) {
  return name.trim().toLocaleLowerCase();
}

export default function ProjectManager({
  projects,
  activeProjectId,
  initialName,
  onClose,
  onSave,
  onOpen,
  onUpdate,
  onRename,
  onDelete,
  onDownloadBackup,
  initialError = "",
}) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState(initialError);
  const [pendingOverwrite, setPendingOverwrite] = useState(null);
  const [pendingUpdate, setPendingUpdate] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");

  function save(overwriteId = null) {
    try {
      onSave(name.trim(), overwriteId);
      setPendingOverwrite(null);
      setError("");
    } catch (saveError) {
      setError(saveError.message || "The project could not be saved.");
    }
  }

  function requestSave(event) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Enter a project name before saving.");
      return;
    }
    const existing = projects.find((project) => normalizedName(project.name) === normalizedName(trimmed));
    if (existing) {
      setPendingOverwrite(existing.id);
      setError("");
      return;
    }
    save();
  }

  function saveRename(projectId) {
    const trimmed = renameValue.trim();
    if (!trimmed) {
      setError("Project names cannot be empty.");
      return;
    }
    if (projects.some((project) => project.id !== projectId && normalizedName(project.name) === normalizedName(trimmed))) {
      setError("Another project already uses that name.");
      return;
    }
    try {
      onRename(projectId, trimmed);
      setEditingId(null);
      setError("");
    } catch (renameError) {
      setError(renameError.message || "The project could not be renamed.");
    }
  }

  return (
    <div className="project-dialog-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="project-dialog" role="dialog" aria-modal="true" aria-labelledby="project-dialog-title">
        <header className="project-dialog-header">
          <div>
            <span>YOUR WORKSPACE</span>
            <h2 id="project-dialog-title">Save &amp; manage projects</h2>
          </div>
          <button type="button" className="project-dialog-close" aria-label="Close projects" onClick={onClose}>×</button>
        </header>

        <form className="project-save-form" onSubmit={requestSave}>
          <label htmlFor="project-name">Project name</label>
          <div className="project-save-row">
            <input id="project-name" autoFocus maxLength="80" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Jummah announcement" />
            <button type="submit" className="project-primary-button">Save project</button>
          </div>
          {error && <p className="project-dialog-error" role="alert">{error}</p>}
        </form>

        {pendingOverwrite && (
          <div className="project-confirmation" role="alertdialog" aria-label="Confirm project overwrite">
            <p>A project with this name already exists. Replace its saved version?</p>
            <div>
              <button type="button" onClick={() => setPendingOverwrite(null)}>Cancel</button>
              <button type="button" className="project-primary-button" onClick={() => save(pendingOverwrite)}>Overwrite</button>
            </div>
          </div>
        )}

        {pendingUpdate && (
          <div className="project-confirmation" role="alertdialog" aria-label="Confirm project update">
            <p>Update “{projects.find((project) => project.id === pendingUpdate)?.name}” with the current canvas?</p>
            <div>
              <button type="button" onClick={() => setPendingUpdate(null)}>Cancel</button>
              <button type="button" className="project-primary-button" onClick={() => {
                try {
                  onUpdate(pendingUpdate);
                  setPendingUpdate(null);
                  setError("");
                } catch (updateError) {
                  setError(updateError.message || "The project could not be updated.");
                  setPendingUpdate(null);
                }
              }}>Update project</button>
            </div>
          </div>
        )}

        {pendingDelete && (
          <div className="project-confirmation" role="alertdialog" aria-label="Confirm project deletion">
            <p>Delete “{projects.find((project) => project.id === pendingDelete)?.name}”? This cannot be undone.</p>
            <div>
              <button type="button" onClick={() => setPendingDelete(null)}>Cancel</button>
              <button type="button" className="project-danger-button" onClick={() => {
                try {
                  onDelete(pendingDelete);
                  setPendingDelete(null);
                  setError("");
                } catch (deleteError) {
                  setError(deleteError.message || "The project could not be deleted.");
                  setPendingDelete(null);
                }
              }}>Delete project</button>
            </div>
          </div>
        )}

        <div className="project-list-heading">
          <div><h3>My Projects</h3><span>{projects.length} saved</span></div>
          <button type="button" onClick={onDownloadBackup}>Download JSON backup</button>
        </div>
        <div className="project-list">
          {!projects.length && <p className="project-list-empty">Your saved designs will appear here.</p>}
          {projects.map((project) => (
            <article key={project.id} className={`project-card${project.id === activeProjectId ? " is-current" : ""}`}>
              <div className="project-card-info">
                <strong>{project.name}</strong>
                <span>{project.project.canvasSize || "Custom canvas"} · Updated {new Date(project.updatedAt).toLocaleString()}</span>
              </div>
              {editingId === project.id ? (
                <div className="project-card-actions project-rename-actions">
                  <input aria-label={`Rename ${project.name}`} maxLength="80" value={renameValue} onChange={(event) => setRenameValue(event.target.value)} />
                  <button type="button" onClick={() => saveRename(project.id)}>Save name</button>
                  <button type="button" onClick={() => setEditingId(null)}>Cancel</button>
                </div>
              ) : (
                <div className="project-card-actions">
                  <button type="button" onClick={() => onOpen(project)}>Open</button>
                  <button type="button" onClick={() => { setEditingId(project.id); setRenameValue(project.name); setError(""); }}>Rename</button>
                  <button type="button" onClick={() => setPendingDelete(project.id)}>Delete</button>
                  <button type="button" onClick={() => setPendingUpdate(project.id)}>Update</button>
                </div>
              )}
            </article>
          ))}
        </div>
        <footer className="project-dialog-footer">
          <span>Projects are stored in this browser. Download a JSON backup to move them elsewhere.</span>
          <button type="button" onClick={onClose}>Done</button>
        </footer>
      </section>
    </div>
  );
}
