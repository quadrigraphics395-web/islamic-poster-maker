import { useRef, useState } from "react";
import "./ExportSettings.css";

const backgroundOptions = [
  { id: "transparent", title: "Transparent", description: "Preserve alpha in PNG", icon: "▧" },
  { id: "white", title: "White", description: "Use a white page background", icon: "□" },
  { id: "custom", title: "Custom color", description: "Choose an export-only color", icon: "◉" },
  { id: "poster", title: "Poster background", description: "Keep the current canvas background", icon: "▤" },
];

export default function ExportSettings({ initialFormat, onExport, onClose, printResolution }) {
  const [format, setFormat] = useState(initialFormat);
  const [background, setBackground] = useState("poster");
  const [customColor, setCustomColor] = useState("#ffffff");
  const [quality, setQuality] = useState("normal");
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  function selectFormat(nextFormat) {
    setFormat(nextFormat);
    if (["jpg", "pdf"].includes(nextFormat) && background === "transparent") setBackground("white");
  }

  async function exportFile() {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setResult("");
    try {
      const exported = await new Promise((resolve, reject) => onExport(format, {
        mode: background,
        color: customColor,
        qualityKey: quality,
        onComplete: resolve,
      }, null, reject));
      const actualFormat = exported?.format?.toUpperCase() ?? format.toUpperCase();
      setResult(exported?.size ? `Exported ${actualFormat}: ${(exported.size / 1024 / 1024).toFixed(2)} MB` : "Export complete.");
    } catch (error) {
      setResult(error.message || "Export failed. Try again with a smaller document.");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="export-dialog-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !busy) onClose();
    }}>
      <section className="export-dialog" role="dialog" aria-modal="true" aria-labelledby="export-dialog-title">
        <header className="export-dialog-header">
          <div><span>FINAL OUTPUT</span><h2 id="export-dialog-title">Export poster</h2></div>
          <button type="button" className="export-dialog-close" aria-label="Close export settings" disabled={busy} onClick={onClose}>×</button>
        </header>

        <div className="export-format-switch" role="group" aria-label="Export format">
          {["png", "jpg", "pdf"].map((item) => (
            <button key={item} type="button" aria-pressed={format === item} className={format === item ? "is-active" : ""} disabled={busy} onClick={() => selectFormat(item)}>
              {item.toUpperCase()}
            </button>
          ))}
        </div>

        {format === "jpg" && <fieldset className="export-quality-options">
          <legend>JPEG quality</legend>
          {[["low", "Low · 60%"], ["normal", "Normal · 80%"], ["high", "High · 95%"]].map(([value, label]) => (
            <label key={value}><input type="radio" name="export-quality" value={value} checked={quality === value} disabled={busy} onChange={() => setQuality(value)} />{label}</label>
          ))}
        </fieldset>}

        <fieldset className="export-background-options">
          <legend>{format === "pdf" ? "PDF page background" : "Poster background"}</legend>
          {backgroundOptions.map((option) => {
            const unavailable = ["jpg", "pdf"].includes(format) && option.id === "transparent";
            return <label key={option.id} className={`export-background-option${background === option.id ? " is-selected" : ""}${unavailable ? " is-unavailable" : ""}`}>
              <input type="radio" name="export-background" value={option.id} checked={background === option.id} disabled={busy || unavailable} onChange={() => setBackground(option.id)} />
              <span className={`export-background-preview${option.id === "transparent" ? " is-checkerboard" : ""}`} style={option.id === "custom" ? { backgroundColor: customColor } : undefined}>{option.id === "transparent" ? "α" : option.id === "white" ? "W" : option.id === "custom" ? "C" : "P"}</span>
              <span className="export-background-copy"><strong>{option.title}</strong><small>{unavailable ? "PDF and JPG require an opaque page" : option.description}</small></span>
            </label>;
          })}
          {background === "custom" && <label className="export-custom-color"><span>Export color</span><input aria-label="Custom export background color" type="color" value={customColor} disabled={busy} onChange={(event) => setCustomColor(event.target.value)} /></label>}
        </fieldset>

        <p className="export-dialog-note">
          {format === "pdf"
            ? `Creates a one-page PDF at the document’s physical size. Artwork is rasterized at ${printResolution} DPI where browser memory permits, preserving the editor’s Urdu and Arabic shaping.`
            : background === "transparent" && format === "png"
              ? "PNG keeps transparent areas. The poster background and saved project remain unchanged."
              : `The ${format.toUpperCase()} export uses ${printResolution} DPI output dimensions. Export settings do not change your saved design.`}
        </p>
        <footer className="export-dialog-footer">
          <button type="button" disabled={busy} onClick={onClose}>Cancel</button>
          <button type="button" className="export-dialog-primary" disabled={busy} onClick={exportFile}>{busy ? "Exporting…" : `Download ${format.toUpperCase()}`}</button>
        </footer>
        {busy && <p className="export-progress" role="status">Rendering at {printResolution} DPI…</p>}
        {result && <p className="export-result" role="status">{result}</p>}
      </section>
    </div>
  );
}
