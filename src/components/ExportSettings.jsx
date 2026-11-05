import { useState } from "react";
import "./ExportSettings.css";

const backgroundOptions = [
  { id: "transparent", title: "Transparent", description: "PNG with an alpha channel", icon: "▧" },
  { id: "white", title: "White", description: "Classic white poster background", icon: "□" },
  { id: "custom", title: "Custom color", description: "Choose an export-only color", icon: "◉" },
  { id: "poster", title: "Poster background", description: "Keep the current canvas background", icon: "▤" },
];

export default function ExportSettings({ initialFormat, onExport, onClose }) {
  const [format, setFormat] = useState(initialFormat);
  const [background, setBackground] = useState("poster");
  const [customColor, setCustomColor] = useState("#ffffff");
  const [quality, setQuality] = useState("balanced");
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);
  const qualities = { high: 0.88, balanced: 0.85, small: 0.82 };

  return (
    <div className="export-dialog-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="export-dialog" role="dialog" aria-modal="true" aria-labelledby="export-dialog-title">
        <header className="export-dialog-header">
          <div>
            <span>FINAL OUTPUT</span>
            <h2 id="export-dialog-title">Export poster</h2>
          </div>
          <button type="button" className="export-dialog-close" aria-label="Close export settings" onClick={onClose}>×</button>
        </header>

        <div className="export-format-switch" role="group" aria-label="Export format">
          {["png", "jpg", "webp"].map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={format === item}
              className={format === item ? "is-active" : ""}
              onClick={() => {
                setFormat(item);
                if (item === "jpg" && background === "transparent") setBackground("white");
              }}
            >
              {item.toUpperCase()}
            </button>
          ))}
        </div>

        {format !== "png" && <fieldset className="export-quality-options">
          <legend>Quality</legend>
          {[["high", "High Quality"], ["balanced", "Balanced"], ["small", "Smaller File Size"]].map(([value, label]) => (
            <label key={value}><input type="radio" name="export-quality" value={value} checked={quality === value} onChange={() => setQuality(value)} />{label}</label>
          ))}
        </fieldset>}

        <fieldset className="export-background-options">
          <legend>Poster background</legend>
          {backgroundOptions.map((option) => (
            <label
              key={option.id}
              className={`export-background-option${background === option.id ? " is-selected" : ""}${format === "jpg" && option.id === "transparent" ? " is-unavailable" : ""}`}
            >
              <input
                type="radio"
                name="export-background"
                value={option.id}
                checked={background === option.id}
                disabled={format === "jpg" && option.id === "transparent"}
                onChange={() => setBackground(option.id)}
              />
              <span className={`export-background-preview${option.id === "transparent" ? " is-checkerboard" : ""}`} style={option.id === "custom" ? { backgroundColor: customColor } : undefined}>
                {option.id === "transparent" && <span>α</span>}
                {option.id === "white" && <span>W</span>}
                {option.id === "custom" && <span>C</span>}
              </span>
              <span className="export-background-copy">
                <strong>{option.title}</strong>
                <small>{format === "jpg" && option.id === "transparent" ? "Unavailable for JPG" : option.description}</small>
              </span>
            </label>
          ))}
          {background === "custom" && (
            <label className="export-custom-color">
              <span>Export color</span>
              <input aria-label="Custom export background color" type="color" value={customColor} onChange={(event) => setCustomColor(event.target.value)} />
            </label>
          )}
        </fieldset>

        <p className="export-dialog-note">
          {background === "transparent"
            ? `Only the exported ${format.toUpperCase()} background becomes transparent. Your poster and saved project background stay unchanged.`
            : background === "poster"
              ? "The current poster background and its styling will be preserved."
            : "This export background does not change your poster design or saved project."}
        </p>
        <footer className="export-dialog-footer">
          <button type="button" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="export-dialog-primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setResult("");
              try {
                const exported = await new Promise((resolve, reject) => onExport(format, {
                  mode: background,
                  color: customColor,
                  quality: qualities[quality],
                  onComplete: resolve,
                }, null, reject));
                const actualFormat = exported?.format?.toUpperCase() ?? format.toUpperCase();
                setResult(exported?.size ? `Exported ${actualFormat}: ${(exported.size / 1024 / 1024).toFixed(2)} MB` : "Export complete.");
              } catch (error) {
                setResult(error.message || "Export failed.");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Exporting…" : `Export ${format.toUpperCase()}`}
          </button>
        </footer>
        {result && <p className="export-result" role="status">{result}</p>}
      </section>
    </div>
  );
}
