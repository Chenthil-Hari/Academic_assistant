import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/middleware-utils";
import connectToDatabase from "@/lib/db/connection";
import { UploadedDocument } from "@/lib/db/models/UploadedDocument";
import { extractTextFromPdf } from "@/lib/pdf/extract-pdf";
import { parseAcademicDocument } from "@/lib/pdf/academic-parser";
import fs from "fs/promises";
import path from "path";
import os from "os";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Writable directory on both local and Vercel serverless functions
const UPLOADS_DIR = path.join(os.tmpdir(), "academic_ai_uploads");

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

    // Write file to /tmp directory safely
    const userUploadDir = path.join(UPLOADS_DIR, user.userId);
    let filePath = `memory://${file.name}`;
    try {
      await fs.mkdir(userUploadDir, { recursive: true });
      const safeFileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      filePath = path.join(userUploadDir, safeFileName);
      await fs.writeFile(filePath, buffer);
    } catch (fsErr) {
      console.warn("Serverless disk write skipped, using memory buffer:", fsErr);
    }

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
      rawText: text.slice(0, 10000),
      usedOcr,
    });
  } catch (error: any) {
    console.error("PDF upload error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
