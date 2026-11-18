import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/middleware-utils";
import connectToDatabase from "@/lib/db/connection";
import { UploadedDocument } from "@/lib/db/models/UploadedDocument";
import { extractTextFromPdf } from "@/lib/pdf/extract-pdf";
import { parseAcademicDocument } from "@/lib/pdf/academic-parser";
import fs from "fs/promises";
import path from "path";

// Private storage directory
const UPLOADS_DIR = path.join(process.cwd(), "uploads");

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest(req);
    if (errorResponse || !user) return errorResponse;

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const fileType = (formData.get("fileType") as any) || "timetable_pdf";

    if (!file) {
      return NextResponse.json(
        { success: false, message: "No PDF file uploaded." },
        { status: 400 }
      );
    }

    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      return NextResponse.json(
        { success: false, message: "Only PDF documents are supported." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Ensure private user upload directory exists
    const userUploadDir = path.join(UPLOADS_DIR, user.userId);
    await fs.mkdir(userUploadDir, { recursive: true });

    const safeFileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const filePath = path.join(userUploadDir, safeFileName);
    await fs.writeFile(filePath, buffer);

    await connectToDatabase();

    // 1. Extract text (native PDF text + OCR fallback)
    const { text, pages, usedOcr } = await extractTextFromPdf(buffer);

    // 2. Parse academic information
    const extractedData = await parseAcademicDocument(text, fileType);

    // 3. Save document record in MongoDB
    const doc = await UploadedDocument.create({
      userId: user.userId,
      fileName: file.name,
      fileUrl: filePath,
      fileType,
      fileSize: file.size,
      extractionStatus: "completed",
      extractedData,
      rawText: text.slice(0, 10000), // store preview of raw text
      isVerifiedByUser: false,
    });

    return NextResponse.json({
      success: true,
      message: `PDF processed successfully (${pages} page${pages > 1 ? "s" : ""}${usedOcr ? ", with OCR" : ""}).`,
      documentId: doc._id,
      extractedData,
      usedOcr,
    });
  } catch (error: any) {
    console.error("PDF upload error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
