import { PDFDocument } from 'pdf-lib';

/**
 * Merge multiple PDF buffers into a single PDF
 * @param pdfBuffers - Array of PDF buffers to merge
 * @returns Merged PDF buffer
 */
export async function mergePDFs(pdfBuffers: Buffer[]): Promise<Buffer> {
  // Create a new PDF document
  const mergedPdf = await PDFDocument.create();

  // Iterate through each PDF buffer
  for (const pdfBuffer of pdfBuffers) {
    // Load the PDF
    const pdf = await PDFDocument.load(pdfBuffer);

    // Copy all pages from the current PDF
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());

    // Add each page to the merged document
    copiedPages.forEach((page) => {
      mergedPdf.addPage(page);
    });
  }

  // Serialize the merged PDF to bytes
  const mergedPdfBytes = await mergedPdf.save();

  // Convert to Buffer
  return Buffer.from(mergedPdfBytes);
}

/**
 * Fetch PDF from URL
 * @param url - URL of the PDF to fetch
 * @returns PDF buffer
 */
export async function fetchPDFFromURL(url: string): Promise<Buffer> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch PDF from ${url}: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
