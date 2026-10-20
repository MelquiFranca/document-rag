import { describe, expect, it } from "vitest";
import { resolveVersion } from "@/lib/version-resolution";
import type { DocumentRecord, RetrievedChunk } from "@/types/audit";

const documents = [
  { documentId: "policy-2025", policyKey: "refund", status: "superseded", effectiveFrom: "2025-01-01" },
  { documentId: "policy-2026", policyKey: "refund", status: "active", effectiveFrom: "2026-01-01" },
] satisfies Pick<DocumentRecord, "documentId" | "policyKey" | "status" | "effectiveFrom">[];

const baseChunk: RetrievedChunk = {
  chunkId: "c1",
  documentId: "policy-2026",
  policyKey: "refund",
  title: "Política de Reembolso",
  version: "2026",
  effectiveFrom: "2026-01-01",
  status: "active",
  section: "Prazo",
  ordinal: 0,
  content: "7 dias",
  score: 1,
  source: "initial",
};

describe("resolveVersion", () => {
  it("resolve uma única versão ativa", () => {
    expect(resolveVersion("Qual é o prazo atual de reembolso?", [baseChunk], documents)).toMatchObject({
      state: "resolved",
      currentDocumentId: "policy-2026",
    });
  });

  it("não infere vigência somente pela data", () => {
    const ambiguous = documents.map((document) => ({ ...document, status: "unknown" as const }));
    expect(resolveVersion("Qual é o prazo vigente?", [baseChunk], ambiguous)).toMatchObject({
      state: "ambiguous",
      currentDocumentId: null,
    });
  });

  it("identifica perguntas históricas", () => {
    expect(resolveVersion("Qual era o prazo em 2025?", [baseChunk], documents).historicalQuestion).toBe(true);
  });
});
