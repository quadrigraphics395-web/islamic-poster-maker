import bukhari from "./bukhari.json";
import muslim from "./muslim.json";
import abuDawud from "./abudawud.json";
import tirmidhi from "./tirmidhi.json";
import nasai from "./nasai.json";
import ibnMajah from "./ibnmajah.json";
import mishkat from "./mishkat.json";
import muwatta from "./muwatta.json";
import musnadAhmad from "./musnad-ahmad.json";
import riyadUsSalihin from "./riyad-us-salihin.json";

// Hadith content must come from a trusted, manually verified source. AI must never generate or alter canonical Arabic text, translation, Hadith number, source, or grade.
const stringFields = [
  "id",
  "collection",
  "bookName",
  "bookSlug",
  "hadithNumber",
  "originalHadithNumber",
  "chapter",
  "chapterNumber",
  "originalArabicText",
  "arabicText",
  "originalUrduTranslation",
  "urduTranslation",
  "originalEnglishTranslation",
  "reference",
  "originalSource",
  "grade",
  "narrator",
  "sourceUrl",
  "sourceEdition",
  "translator",
  "englishTranslator",
  "urduTranslator",
  "englishEdition",
  "urduEdition",
  "license",
  "licenseUrl",
  "provenance",
  "notes",
];

export function validateHadithRecords(records) {
  if (!Array.isArray(records)) throw new TypeError("Hadith collection must be an array.");
  records.forEach((record, index) => {
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      throw new TypeError(`Hadith record ${index} must be an object.`);
    }
    stringFields.forEach((field) => {
      if (typeof record[field] !== "string") {
        throw new TypeError(`Hadith record ${index} must include string field '${field}'.`);
      }
    });
    if (record.englishTranslation !== undefined && typeof record.englishTranslation !== "string") {
      throw new TypeError(`Hadith record ${index} must use a string for optional field 'englishTranslation'.`);
    }
    if (record.originalEnglishTranslation !== undefined && typeof record.originalEnglishTranslation !== "string") {
      throw new TypeError(`Hadith record ${index} must use a string for optional field 'originalEnglishTranslation'.`);
    }
    if (typeof record.verified !== "boolean") {
      throw new TypeError(`Hadith record ${index} must include a boolean 'verified' field.`);
    }
  });
  return records;
}

export const hadithCollections = [
  { bookName: "Sahih al-Bukhari", bookSlug: "bukhari", records: validateHadithRecords(bukhari) },
  { bookName: "Sahih Muslim", bookSlug: "muslim", records: validateHadithRecords(muslim) },
  { bookName: "Sunan Abi Dawud", bookSlug: "abudawud", records: validateHadithRecords(abuDawud) },
  { bookName: "Jami` at-Tirmidhi", bookSlug: "tirmidhi", records: validateHadithRecords(tirmidhi) },
  { bookName: "Sunan an-Nasa'i", bookSlug: "nasai", records: validateHadithRecords(nasai) },
  { bookName: "Sunan Ibn Majah", bookSlug: "ibnmajah", records: validateHadithRecords(ibnMajah) },
  { bookName: "Mishkat al-Masabih", bookSlug: "mishkat", records: validateHadithRecords(mishkat) },
  { bookName: "Muwatta Malik", bookSlug: "muwatta", records: validateHadithRecords(muwatta) },
  { bookName: "Musnad Ahmad", bookSlug: "musnad-ahmad", records: validateHadithRecords(musnadAhmad) },
  { bookName: "Riyad as-Salihin", bookSlug: "riyad-us-salihin", records: validateHadithRecords(riyadUsSalihin) },
];

export const hadithRecords = hadithCollections.flatMap(({ records }) => records);
