# Bundled font licenses and attributions

The application self-hosts the selected WOFF2 files from Fontsource packages. The packages identify the upstream projects and state **SIL Open Font License 1.1 (OFL-1.1)** for every family below. Individual copyright and license notices are preserved in [`public/fonts/licenses/`](public/fonts/licenses/), and shipped in the production assets. Sources are Fontsource's Google Fonts distribution (`https://github.com/fontsource/font-files`) and its Noto distribution (`https://github.com/fontsource/font-files`). Package metadata was checked at the versions recorded in `package-lock.json`.

The fonts remain on the application origin; the app does not fetch fonts from a third-party font service at runtime. The CSS imports request script-specific subsets and regular/bold weights (Noto Nastaliq Urdu is variable), allowing the browser to load only subsets needed by the chosen text.

| Category | Family | License |
|---|---|---|
| Urdu Nastaliq | Noto Nastaliq Urdu | SIL OFL 1.1 |
| Arabic | Amiri | SIL OFL 1.1 |
| Arabic | Noto Naskh Arabic | SIL OFL 1.1 |
| Arabic | Noto Sans Arabic | SIL OFL 1.1 |
| Arabic | Noto Kufi Arabic | SIL OFL 1.1 |
| Arabic | Scheherazade New | SIL OFL 1.1 |
| Arabic | Cairo | SIL OFL 1.1 |
| Arabic | Tajawal | SIL OFL 1.1 |
| Arabic | IBM Plex Sans Arabic | SIL OFL 1.1 |
| Arabic | Mada | SIL OFL 1.1 |
| Arabic | Markazi Text | SIL OFL 1.1 |
| Arabic | Reem Kufi | SIL OFL 1.1 |
| Arabic | El Messiri | SIL OFL 1.1 |
| Arabic | Changa | SIL OFL 1.1 |
| Arabic | Harmattan | SIL OFL 1.1 |
| Arabic | Mirza | SIL OFL 1.1 |
| Arabic | Aref Ruqaa | SIL OFL 1.1 |
| English | Inter | SIL OFL 1.1 |
| English | Montserrat | SIL OFL 1.1 |
| English | Poppins | SIL OFL 1.1 |
| English | Lato | SIL OFL 1.1 |
| English | Playfair Display | SIL OFL 1.1 |
| English | Oswald | SIL OFL 1.1 |
| English | Roboto | SIL OFL 1.1 |
| English | Merriweather | SIL OFL 1.1 |
| Hindi / Devanagari | Noto Sans Devanagari | SIL OFL 1.1 |
| Hindi / Devanagari | Noto Serif Devanagari | SIL OFL 1.1 |
| Hindi / Devanagari | Hind | SIL OFL 1.1 |
| Hindi / Devanagari | Mukta | SIL OFL 1.1 |
| Hindi / Devanagari | Tiro Devanagari Hindi | SIL OFL 1.1 |
| Hindi / Devanagari | Kalam | SIL OFL 1.1 |

Personal fonts selected by users are not covered by these bundled licenses and remain in that user's local browser IndexedDB. Users are responsible for having rights to use any imported file.
