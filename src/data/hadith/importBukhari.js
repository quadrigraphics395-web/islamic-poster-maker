const requiredMetadataFields = ["sourceName", "sourceEdition", "license", "licenseUrl", "provenance"];
const requiredRecordFields = ["collection", "hadithNumber", "arabicText", "reference", "sourceUrl"];

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

function isHttpsUrl(value) {
  if (!isNonEmptyString(value)) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function stableSlug(value) {
  return value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function createReport(accepted, rejected, duplicates) {
  return {
    imported: accepted.length,
    verified: 0,
    needsVerification: accepted.length,
    rejected: rejected.length,
    duplicates: duplicates.length,
  };
}

export function importBukhariSource(payload, existingRecords = []) {
  const accepted = [];
  const rejected = [];
  const duplicates = [];
  const sourceMetadata = payload?.sourceMetadata;
  const sourceRecords = payload?.records;

  if (!sourceMetadata || typeof sourceMetadata !== "object" || Array.isArray(sourceMetadata)) {
    rejected.push({ index: null, reason: "sourceMetadata must be an object." });
    return { accepted, rejected, duplicates, report: createReport(accepted, rejected, duplicates) };
  }

  const missingMetadata = requiredMetadataFields.filter((field) => !isNonEmptyString(sourceMetadata[field]));
  if (missingMetadata.length > 0) {
    rejected.push({ index: null, reason: `Missing source metadata: ${missingMetadata.join(", ")}.` });
    return { accepted, rejected, duplicates, report: createReport(accepted, rejected, duplicates) };
  }
  if (!isHttpsUrl(sourceMetadata.licenseUrl)) {
    rejected.push({ index: null, reason: "licenseUrl must be an HTTPS URL." });
    return { accepted, rejected, duplicates, report: createReport(accepted, rejected, duplicates) };
  }
  if (!Array.isArray(sourceRecords)) {
    rejected.push({ index: null, reason: "records must be an array." });
    return { accepted, rejected, duplicates, report: createReport(accepted, rejected, duplicates) };
  }

  sourceRecords.forEach((sourceRecord, index) => {
    if (!sourceRecord || typeof sourceRecord !== "object" || Array.isArray(sourceRecord)) {
      rejected.push({ index, reason: "Record must be an object." });
      return;
    }

    const missingFields = requiredRecordFields.filter((field) => !isNonEmptyString(sourceRecord[field]));
    if (missingFields.length > 0) {
      rejected.push({ index, reason: `Missing required fields: ${missingFields.join(", ")}.` });
      return;
    }
    if (sourceRecord.collection !== "Sahih al-Bukhari") {
      rejected.push({ index, reason: "This importer accepts Sahih al-Bukhari records only." });
      return;
    }
    if (!isHttpsUrl(sourceRecord.sourceUrl)) {
      rejected.push({ index, reason: "sourceUrl must be an HTTPS URL." });
      return;
    }
    if (typeof sourceRecord.hadithNumber !== "string" && !(Number.isSafeInteger(sourceRecord.hadithNumber) && sourceRecord.hadithNumber > 0)) {
      rejected.push({ index, reason: "hadithNumber must be a non-empty string or positive safe integer." });
      return;
    }

    const hadithNumber = String(sourceRecord.hadithNumber);
    const sourceEdition = sourceRecord.sourceEdition || sourceMetadata.sourceEdition;
    const duplicate = existingRecords.some((record) =>
      record.collection === sourceRecord.collection
      && String(record.hadithNumber) === hadithNumber
      && (record.sourceEdition === sourceEdition || record.sourceUrl === sourceRecord.sourceUrl),
    ) || accepted.some((record) =>
      record.collection === sourceRecord.collection
      && record.hadithNumber === hadithNumber
      && (record.sourceEdition === sourceEdition || record.sourceUrl === sourceRecord.sourceUrl),
    );
    if (duplicate) {
      duplicates.push({ index, collection: sourceRecord.collection, hadithNumber, sourceEdition });
      return;
    }

    const strings = [
      "bookName", "sourceEdition", "chapter", "chapterNumber", "narrator", "grade", "urduTranslation",
      "englishTranslation", "notes", "translator", "englishTranslator", "urduTranslator", "englishEdition", "urduEdition",
    ];
    const invalidOptionalField = strings.find((field) => sourceRecord[field] !== undefined && typeof sourceRecord[field] !== "string");
    if (invalidOptionalField) {
      rejected.push({ index, reason: `${invalidOptionalField} must be a string when provided.` });
      return;
    }
    const optionalMetadataFields = ["translator", "englishTranslator", "urduTranslator", "englishEdition", "urduEdition"];
    const invalidSourceMetadata = optionalMetadataFields.find((field) =>
      sourceMetadata[field] !== undefined && typeof sourceMetadata[field] !== "string",
    );
    if (invalidSourceMetadata) {
      rejected.push({ index, reason: `Source metadata '${invalidSourceMetadata}' must be a string when provided.` });
      return;
    }
    if (sourceRecord.grade && typeof sourceRecord.grade !== "string") {
      rejected.push({ index, reason: "grade must be a string when provided." });
      return;
    }
    if (sourceRecord.originalArabicText !== undefined && sourceRecord.originalArabicText !== sourceRecord.arabicText) {
      rejected.push({ index, reason: "originalArabicText must exactly match the supplied source Arabic text." });
      return;
    }

    const englishTranslation = sourceRecord.englishTranslation ?? "";
    const urduTranslation = sourceRecord.urduTranslation ?? "";
    accepted.push({
      id: `bukhari-${stableSlug(hadithNumber)}-${stableSlug(sourceEdition)}`,
      collection: sourceRecord.collection,
      bookName: sourceRecord.bookName || sourceRecord.collection,
      bookSlug: "bukhari",
      hadithNumber,
      originalHadithNumber: sourceRecord.hadithNumber,
      chapter: sourceRecord.chapter ?? "",
      chapterNumber: sourceRecord.chapterNumber ?? "",
      originalArabicText: sourceRecord.arabicText,
      arabicText: sourceRecord.arabicText,
      originalUrduTranslation: urduTranslation,
      urduTranslation,
      originalEnglishTranslation: englishTranslation,
      englishTranslation,
      reference: sourceRecord.reference,
      originalSource: sourceMetadata.sourceName,
      grade: sourceRecord.grade ?? "",
      narrator: sourceRecord.narrator ?? "",
      sourceUrl: sourceRecord.sourceUrl,
      sourceEdition,
      translator: sourceRecord.translator ?? sourceMetadata.translator ?? "",
      englishTranslator: sourceRecord.englishTranslator ?? sourceMetadata.englishTranslator ?? "",
      urduTranslator: sourceRecord.urduTranslator ?? sourceMetadata.urduTranslator ?? "",
      englishEdition: sourceRecord.englishEdition ?? sourceMetadata.englishEdition ?? "",
      urduEdition: sourceRecord.urduEdition ?? sourceMetadata.urduEdition ?? "",
      license: sourceMetadata.license,
      licenseUrl: sourceMetadata.licenseUrl,
      provenance: sourceMetadata.provenance,
      notes: sourceRecord.notes ?? "",
      verified: false,
      verificationStatus: "needs-verification",
    });
  });

  return { accepted, rejected, duplicates, report: createReport(accepted, rejected, duplicates) };
}
