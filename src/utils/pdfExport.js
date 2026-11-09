const encoder = new TextEncoder();

function joinBytes(chunks) {
  const total = chunks.reduce((length, chunk) => length + chunk.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

export function createSinglePageJpegPdf({ jpegBytes, pixelWidth, pixelHeight, pageWidthPoints, pageHeightPoints }) {
  if (!(jpegBytes instanceof Uint8Array) || jpegBytes.length < 4 || jpegBytes[0] !== 0xff || jpegBytes[1] !== 0xd8) {
    throw new Error("PDF export needs a valid JPEG image stream.");
  }
  if (![pixelWidth, pixelHeight, pageWidthPoints, pageHeightPoints].every(Number.isFinite)
    || pixelWidth < 1 || pixelHeight < 1 || pageWidthPoints <= 0 || pageHeightPoints <= 0) {
    throw new Error("PDF page dimensions must be positive numbers.");
  }

  const content = `q\n${pageWidthPoints} 0 0 ${pageHeightPoints} 0 0 cm\n/Poster Do\nQ\n`;
  const objectBodies = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidthPoints} ${pageHeightPoints}] /Resources << /XObject << /Poster 4 0 R >> >> /Contents 5 0 R >>`,
    null,
    `<< /Length ${encoder.encode(content).length} >>\nstream\n${content}endstream`,
  ];
  const header = encoder.encode("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  const chunks = [header];
  const offsets = [0];
  let length = header.length;

  objectBodies.forEach((body, index) => {
    offsets.push(length);
    const objectHeader = encoder.encode(`${index + 1} 0 obj\n`);
    const objectBody = body === null
      ? joinBytes([
          encoder.encode(`<< /Type /XObject /Subtype /Image /Width ${pixelWidth} /Height ${pixelHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`),
          jpegBytes,
          encoder.encode("\nendstream"),
        ])
      : encoder.encode(body);
    const objectFooter = encoder.encode("\nendobj\n");
    chunks.push(objectHeader, objectBody, objectFooter);
    length += objectHeader.length + objectBody.length + objectFooter.length;
  });

  const xrefOffset = length;
  const xref = ["xref\n0 6\n", "0000000000 65535 f \n"];
  for (let index = 1; index <= 5; index += 1) xref.push(`${String(offsets[index]).padStart(10, "0")} 00000 n \n`);
  const trailer = `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  chunks.push(encoder.encode(xref.join("")), encoder.encode(trailer));
  return joinBytes(chunks);
}

export function getPdfPagePoints(widthCssPx, heightCssPx) {
  return { width: widthCssPx * 72 / 96, height: heightCssPx * 72 / 96 };
}
