import { describe, expect, it } from "vitest";
import { chunkDocument, MAX_CHUNK_CHARS } from "@/lib/chunking";
import type { DocumentRecord } from "@/types/audit";

const document: DocumentRecord = {
  documentId: "policy-2026",
  policyKey: "policy",
  title: "Política 2026",
  version: "2026.1",
  effectiveFrom: "2026-01-01",
  status: "active",
  contentHash: "hash",
  content: "# Política\n\n## 4.2 Prazo atual\n\nO prazo vigente é de 7 dias.\n\n## 5.1 Canal\n\nUse o portal.",
};

describe("chunkDocument", () => {
  it("preserva seção e gera IDs estáveis", () => {
    const chunks = chunkDocument(document);
    expect(chunks.map((chunk) => chunk.chunkId)).toEqual([
      "policy-2026:4-2-prazo-atual:0",
      "policy-2026:5-1-canal:0",
    ]);
    expect(chunks[0]).toMatchObject({ section: "4.2 Prazo atual", status: "active", version: "2026.1" });
  });

  it("respeita o limite aproximado para parágrafos normais", () => {
    const content = Array.from({ length: 30 }, (_, index) => `Parágrafo ${index} ${"texto ".repeat(15)}`).join("\n\n");
    const chunks = chunkDocument({ ...document, content: `## Longa\n\n${content}` });
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.content.length <= MAX_CHUNK_CHARS + 200)).toBe(true);
  });
});
