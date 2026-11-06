export const builtInFonts = [
  { label: "Noto Nastaliq Urdu", family: '"Noto Nastaliq Urdu Variable"', category: "Urdu Nastaliq", weights: [400, 500, 600, 700], sample: "\u062e\u0648\u0628\u0635\u0648\u0631\u062a \u0627\u0631\u062f\u0648 \u062e\u0637\u0627\u0637\u06cc" },
  ...[
    "Amiri", "Noto Naskh Arabic", "Noto Sans Arabic", "Noto Kufi Arabic", "Scheherazade New", "Cairo", "Tajawal", "IBM Plex Sans Arabic", "Mada", "Markazi Text", "Reem Kufi", "El Messiri", "Changa", "Harmattan", "Mirza", "Aref Ruqaa",
  ].map((name) => ({ label: name, family: `"${name}"`, category: "Arabic", weights: [400, 700], sample: "\u0628\u0650\u0633\u0652\u0645\u0650 \u0627\u0644\u0644\u064e\u0651\u0647\u0650 \u0627\u0644\u0631\u064e\u0651\u062d\u0652\u0645\u064e\u0670\u0646\u0650 \u0627\u0644\u0631\u064e\u0651\u062d\u0650\u064a\u0645\u0650" })),
  ...["Inter", "Montserrat", "Poppins", "Lato", "Playfair Display", "Oswald", "Roboto", "Merriweather"].map((name) => ({ label: name, family: `"${name}"`, category: "English", weights: [400, 700], sample: "Beautiful Poster Design" })),
  ...["Noto Sans Devanagari", "Noto Serif Devanagari", "Hind", "Mukta", "Tiro Devanagari Hindi", "Kalam"].map((name) => ({ label: name, family: `"${name}"`, category: "Hindi / Devanagari", weights: name === "Tiro Devanagari Hindi" ? [400] : [400, 700], sample: "\u0938\u0941\u0902\u0926\u0930 \u092a\u094b\u0938\u094d\u091f\u0930 \u0921\u093f\u091c\u093c\u093e\u0907\u0928" })),
];
