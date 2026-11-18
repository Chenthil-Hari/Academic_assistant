import pdfParse from "pdf-parse";

export interface PdfExtractionResult {
  text: string;
  pages: number;
  usedOcr: boolean;
}

/**
 * Extracts text from a PDF buffer using pdf-parse with fallback to OCR if text is sparse.
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<PdfExtractionResult> {
  try {
    // 1. First attempt native PDF text extraction
    const pdfData = await pdfParse(buffer);
    const text = pdfData.text ? pdfData.text.trim() : "";

    // If native text extraction returned meaningful text, return it
    if (text.length >= 50) {
      return {
        text,
        pages: pdfData.numpages || 1,
        usedOcr: false,
      };
    }

    console.log("PDF text is sparse (< 50 chars). Attempting OCR fallback with Tesseract...");

    // 2. Fallback to OCR if scanned PDF
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng");
      const ocrResult = await worker.recognize(buffer);
      await worker.terminate();

      return {
        text: ocrResult.data.text || text,
        pages: pdfData.numpages || 1,
        usedOcr: true,
      };
    } catch (ocrErr) {
      console.warn("OCR fallback failed or not supported in current environment:", ocrErr);
      return {
        text: text || "Unable to extract text from scanned document.",
        pages: pdfData.numpages || 1,
        usedOcr: false,
      };
    }
  } catch (error: any) {
    console.error("PDF extraction error:", error);
    throw new Error(`Failed to parse PDF document: ${error.message}`);
  }
}
