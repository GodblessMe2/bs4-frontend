import * as pdfjsLib from 'pdfjs-dist';

/**
 * Renders a specific PDF page onto an offscreen canvas and returns a JPEG/PNG data URL.
 */
export async function renderPdfPageToDataUrl(
  data: ArrayBuffer,
  pageNumber = 1,
  scale = 0.45
): Promise<string> {
  const pdf = await pdfjsLib.getDocument({ data: data.slice(0) }).promise;
  const targetPage = Math.min(Math.max(1, pageNumber), pdf.numPages);
  const page = await pdf.getPage(targetPage);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return '';

  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);

  await page.render({
    canvasContext: context,
    viewport,
  }).promise;

  return canvas.toDataURL('image/jpeg', 0.82);
}

/**
 * Generates a valid, inspectable multi-page sample PDF File for instant copy shop testing.
 */
export function createSamplePdfFile(filename = 'Sample_Lecture_Notes_2026.pdf', pageCount = 12): File {
  const objects: string[] = [];
  // Object 1: Catalog
  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  const pageObjIds: number[] = [];
  const firstPageObjId = 4; // 1=Catalog, 2=Pages, 3=Font
  for (let i = 0; i < pageCount; i++) {
    pageObjIds.push(firstPageObjId + i * 2);
  }

  // Object 2: Pages root
  objects.push(
    `2 0 obj\n<< /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageCount} >>\nendobj\n`
  );

  // Object 3: Helvetica font
  objects.push(
    '3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n'
  );

  // Page + Content objects
  for (let i = 0; i < pageCount; i++) {
    const pageId = firstPageObjId + i * 2;
    const contentId = pageId + 1;
    const streamText = `BT /F1 18 Tf 60 740 Td (BS4copy&print Services - Sample Document) Tj 0 -32 Td /F1 12 Tf (Page ${i + 1} of ${pageCount} - Brislington, Bristol Commercial Press) Tj ET`;

    objects.push(
      `${pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>\nendobj\n`
    );
    objects.push(
      `${contentId} 0 obj\n<< /Length ${streamText.length} >>\nstream\n${streamText}\nendstream\nendobj\n`
    );
  }

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj;
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i < offsets.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  const blob = new Blob([pdf], { type: 'application/pdf' });
  return new File([blob], filename, { type: 'application/pdf' });
}

