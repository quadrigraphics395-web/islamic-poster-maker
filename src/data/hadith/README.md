# Hadith Data and Import Provenance

Collection JSON files are arrays of normalized records and remain empty until records are imported and reviewed. `bukhari-test-source.json` is a ten-record source fixture for exercising the importer; it is not preloaded into the library. Each record points to its individual Sahih al-Bukhari page on Sunnah.com.

Sunnah.com states in its [About page, section 8](https://sunnah.com/about) that reproduction of individual Hadith or selections for teaching/didactic/presentation purposes is permitted, while scraping or reproducing entire books/collections is not permitted. The fixture contains ten individually referenced records, not an entire book or collection. Sunnah.com says its Arabic text is sourced from al-eman.com and other now-defunct sources, but does not identify the precise upstream source for each individual record. The source pages do not attribute the English or Urdu translators; those fields remain empty. Where shown, the USC-MSA English reference scheme is marked deprecated. No grade is supplied, and the importer always sets `verified: false`.

Sunnah.com's official API requires an API key. The app therefore supports structured JSON imports without embedding credentials. API access may be integrated later after an authorized key and applicable usage terms are provided.

**Integrity rule:** AI may assist with search, categorization and user interface features, but AI must never generate, rewrite, alter, authenticate or assign a Hadith's canonical text, reference or grade.
