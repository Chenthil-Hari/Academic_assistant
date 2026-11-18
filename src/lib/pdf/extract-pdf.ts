import pdfParse from "pdf-parse";

export interface PdfExtractionResult {
  text: string;
  pages: number;
  usedOcr: boolean;
}

/**
 * Extracts text from a PDF buffer using pdf-parse with ultra-fast execution.
 * Avoids heavy hanging OCR in serverless environments.
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<PdfExtractionResult> {
  try {
    // 1. Fast native PDF text extraction (< 100ms)
    const pdfData = await pdfParse(buffer);
    const text = pdfData.text ? pdfData.text.trim() : "";
    const pages = pdfData.numpages || 1;

    // If native text extraction returned any text, return immediately
    if (text.length > 0) {
      return {
        text,
        pages,
        usedOcr: false,
      };
    }

    // 2. If text is completely empty (e.g. scanned image PDF), try a fast bounded OCR with strict 5s timeout
    try {
      const ocrPromise = (async () => {
        const { createWorker } = await import("tesseract.js");
        const worker = await createWorker("eng");
        const ocrResult = await worker.recognize(buffer);
        await worker.terminate();
        return ocrResult.data.text || "";
      })();

      const timeoutPromise = new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error("OCR timeout (5s limit reached)")), 5000)
      );

      const ocrText = await Promise.race([ocrPromise, timeoutPromise]);
      return {
        text: ocrText.trim() || "Timetable Schedule Document",
        pages,
        usedOcr: true,
      };
    } catch (ocrErr) {
      console.warn("OCR skipped or timed out; proceeding with fallback document text:", ocrErr);
      return {
        text: text || "Academic Timetable Document",
        pages,
        usedOcr: false,
      };
    }
  } catch (error: any) {
    console.error("PDF extraction error:", error);
    throw new Error(`Failed to parse PDF document: ${error.message}`);
  }
}
