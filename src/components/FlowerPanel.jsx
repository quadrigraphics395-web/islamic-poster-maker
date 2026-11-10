import { useEffect, useMemo, useState } from "react";

export default function FlowerPanel({ onAddFlower }) {
  const [flowerFiles, setFlowerFiles] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [failedFlowers, setFailedFlowers] = useState(() => new Set());

  useEffect(() => {
    let active = true;

    fetch("/flowers.json")
      .then((response) => {
        if (!response.ok) throw new Error("Could not load flower collection.");
        return response.json();
      })
      .then((files) => {
        if (!active) return;
        setFlowerFiles(Array.isArray(files)
          ? files.filter((file) => typeof file === "string" && file.toLowerCase().endsWith(".png"))
          : []);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setError("Flower collection could not be loaded. Please refresh the app.");
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const filteredFlowers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return flowerFiles;
    return flowerFiles.filter((file) => file.toLowerCase().includes(query));
  }, [flowerFiles, search]);

  return (
    <div className="flower-panel">
      <div className="flower-search-wrap">
        <input
          type="search"
          aria-label="Search flowers"
          placeholder="Search flowers..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <span>{filteredFlowers.length} / {flowerFiles.length}</span>
      </div>

      {loading && <p className="flower-panel-message">Loading flowers...</p>}
      {error && <p className="flower-panel-message flower-panel-error">{error}</p>}

      {!loading && !error && (
        <>
          <div className="flower-grid">
            {filteredFlowers.map((file) => (
              <button
                key={file}
                type="button"
                className="flower-option"
                onClick={() => onAddFlower?.(`/flowers/${encodeURIComponent(file)}`)}
                title={`Add ${file}`}
                aria-label={`Add flower ${file}`}
              >
                <span className="flower-option-image">
                  {failedFlowers.has(file)
                    ? <span className="flower-panel-image-error">Image unavailable</span>
                    : <img
                        src={`/flowers/${encodeURIComponent(file)}`}
                        alt=""
                        loading="lazy"
                        onError={() => setFailedFlowers((current) => new Set(current).add(file))}
                      />}
                </span>
                <span className="flower-option-name">{file.replace(/\.png$/i, "")}</span>
              </button>
            ))}
          </div>

          {filteredFlowers.length === 0 && (
            <p className="flower-panel-message">No flowers found. Try another search.</p>
          )}
        </>
      )}
    </div>
  );
}