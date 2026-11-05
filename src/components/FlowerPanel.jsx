import { useMemo, useState } from "react";
import flowerFiles from "../data/flowerFiles";

export default function FlowerPanel({ onAddFlower }) {
  const [search, setSearch] = useState("");

  const filteredFlowers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return flowerFiles;
    }

    return flowerFiles.filter((file) =>
      file.toLowerCase().includes(query)
    );
  }, [search]);

  return (
    <div
      style={{
        padding: "16px",
        background: "#ffffff",
        borderRadius: "12px",
        border: "1px solid #ddd",
      }}
    >
      <h3 style={{ marginTop: 0 }}>🌸 Flowers</h3>

      <input
        type="text"
        placeholder="Search flowers..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: "100%",
          padding: "10px",
          borderRadius: "8px",
          border: "1px solid #ccc",
          marginBottom: "15px",
          boxSizing: "border-box",
        }}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "10px",
          maxHeight: "500px",
          overflowY: "auto",
        }}
      >
        {filteredFlowers.map((file) => (
          <button
            key={file}
            type="button"
            onClick={() => onAddFlower?.(`/flowers/${file}`)}
            title={`Add ${file}`}
            style={{
              border: "1px solid #ddd",
              borderRadius: "8px",
              background: "#fafafa",
              padding: "6px",
              cursor: "pointer",
            }}
          >
            <img
              src={`/flowers/${file}`}
              alt={file}
              style={{
                width: "100%",
                height: "80px",
                objectFit: "contain",
              }}
            />
          </button>
        ))}
      </div>

      {filteredFlowers.length === 0 && (
        <p style={{ color: "#777", textAlign: "center" }}>
          No flowers found.
        </p>
      )}

      <p
        style={{
          marginBottom: 0,
          marginTop: "12px",
          fontSize: "13px",
          color: "#777",
        }}
      >
        {filteredFlowers.length} flowers
      </p>
    </div>
  );
}