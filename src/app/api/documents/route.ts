import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createAiProvider } from "@/lib/providers";
import { findDocument, listDocuments } from "@/lib/repository";
import { uploadMetadataSchema } from "@/lib/schemas";
import { ingestDocument } from "@/lib/ingestion";

export const dynamic = "force-dynamic";
const MAX_FILE_BYTES = 200 * 1024;

export async function GET() {
  try {
    const documents = await listDocuments(db);
    return NextResponse.json({ documents });
  } catch (error) {
    console.error("documents.list_failed", error);
    return NextResponse.json(
      { code: "DATABASE_UNAVAILABLE", message: "Não foi possível carregar os documentos." },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { code: "INVALID_FILE", message: "Selecione um arquivo TXT ou Markdown." },
        { status: 400 },
      );
    }
    const extension = file.name.toLowerCase().split(".").pop();
    if (!extension || !["txt", "md", "markdown"].includes(extension) || file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { code: "INVALID_FILE", message: "Use um arquivo TXT/MD de até 200 KB." },
        { status: 400 },
      );
    }

    const metadata = uploadMetadataSchema.parse({
      documentId: form.get("documentId"),
      policyKey: form.get("policyKey"),
      title: form.get("title"),
      version: form.get("version"),
      effectiveFrom: form.get("effectiveFrom"),
      status: form.get("status"),
    });
    if (await findDocument(db, metadata.documentId)) {
      return NextResponse.json(
        { code: "DUPLICATE_DOCUMENT", message: "Já existe um documento com esse identificador." },
        { status: 409 },
      );
    }

    const bytes = await file.arrayBuffer();
    let content: string;
    try {
      content = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      return NextResponse.json(
        { code: "INVALID_ENCODING", message: "O arquivo deve usar codificação UTF-8." },
        { status: 400 },
      );
    }
    const result = await ingestDocument(db, createAiProvider(), { ...metadata, content });
    return NextResponse.json(
      { document: result.document, chunks: result.chunks },
      { status: 201 },
    );
  } catch (error) {
    if (error && typeof error === "object" && "issues" in error) {
      return NextResponse.json(
        { code: "INVALID_METADATA", message: "Revise os metadados informados." },
        { status: 400 },
      );
    }
    console.error("documents.upload_failed", error);
    return NextResponse.json(
      { code: "INGESTION_FAILED", message: "Não foi possível indexar o documento." },
      { status: 500 },
    );
  }
}
