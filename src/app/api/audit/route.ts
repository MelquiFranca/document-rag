import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createAiProvider } from "@/lib/providers";
import { auditRequestSchema } from "@/lib/schemas";
import { auditQuestion } from "@/lib/audit-service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const input = auditRequestSchema.parse(await request.json());
    const response = await auditQuestion(db, createAiProvider(), input);
    return NextResponse.json({
      outcome: response.outcome,
      answer: response.answer,
      confidence: response.confidence,
      confidenceReason: response.confidenceReason,
      evidence: response.evidence,
      conflicts: response.conflicts,
      uncertainties: response.uncertainties,
      retrieval: response.retrieval,
      usage: response.usage,
    });
  } catch (error) {
    if (error && typeof error === "object" && "issues" in error) {
      return NextResponse.json(
        { code: "INVALID_REQUEST", message: "Informe uma pergunta e um modo de busca válidos." },
        { status: 400 },
      );
    }
    console.error("audit.failed", error);
    return NextResponse.json(
      {
        code: "AUDIT_FAILED",
        message: "A auditoria falhou. Verifique o banco e o provider de IA configurado.",
      },
      { status: 503 },
    );
  }
}
