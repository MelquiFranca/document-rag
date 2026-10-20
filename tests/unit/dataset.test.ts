import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { chunkDocument } from "@/lib/chunking";
import { hashContent } from "@/lib/repository";
import type { EvaluationCase } from "@/lib/evaluation";
import type { DocumentRecord } from "@/types/audit";

type ManifestEntry = Omit<DocumentRecord, "content" | "contentHash"> & { file: string };

describe("dataset de demonstração", () => {
  it("mantém 10 documentos, 20 perguntas e referências de chunks válidas", async () => {
    const manifest = JSON.parse(
      await readFile(resolve("data/documents/manifest.json"), "utf8"),
    ) as ManifestEntry[];
    const questions = JSON.parse(
      await readFile(resolve("data/evaluation/questions.json"), "utf8"),
    ) as EvaluationCase[];
    const chunkIds = new Set<string>();

    for (const entry of manifest) {
      const content = await readFile(resolve("data/documents", entry.file), "utf8");
      const document: DocumentRecord = {
        documentId: entry.documentId,
        policyKey: entry.policyKey,
        title: entry.title,
        version: entry.version,
        effectiveFrom: entry.effectiveFrom,
        status: entry.status,
        content,
        contentHash: hashContent(content),
      };
      chunkDocument(document).forEach((chunk) => chunkIds.add(chunk.chunkId));
    }

    expect(manifest).toHaveLength(10);
    expect(questions).toHaveLength(20);
    for (const question of questions) {
      for (const chunkId of [...question.relevantChunkIds, ...question.acceptableCitationChunkIds]) {
        expect(chunkIds, `${question.id} referencia ${chunkId}`).toContain(chunkId);
      }
    }
  });
});
