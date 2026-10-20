import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { chunkDocument } from "@/lib/chunking";
import { getConfig } from "@/lib/config";
import { hashContent, replaceDocument, searchChunks } from "@/lib/repository";
import type { DocumentRecord } from "@/types/audit";

const describeDatabase = process.env.RUN_DB_TESTS === "1" ? describe : describe.skip;
const pool = new Pool({ connectionString: getConfig().TEST_DATABASE_URL });

function vector(axis: number) {
  return Array.from({ length: 768 }, (_, index) => (index === axis ? 1 : 0));
}

function document(
  documentId: string,
  version: string,
  status: DocumentRecord["status"],
  content: string,
): DocumentRecord {
  return {
    documentId,
    policyKey: "refund-policy-test",
    title: `Política de Reembolso ${version}`,
    version,
    effectiveFrom: `${version}-01-01`,
    status,
    content: `## Prazo\n\n${content}`,
    contentHash: hashContent(content),
  };
}

describeDatabase("PostgreSQL + pgvector", () => {
  beforeAll(async () => {
    const schema = await readFile(resolve("database/schema.sql"), "utf8");
    await pool.query(schema);
    await pool.query("TRUNCATE evaluation_runs, chunks, documents RESTART IDENTITY CASCADE");

    const previous = document("refund-test-2025", "2025", "superseded", "O prazo era de 15 dias corridos.");
    const current = document("refund-test-2026", "2026", "active", "O prazo vigente é de 7 dias corridos.");
    const connection = await pool.connect();
    try {
      await connection.query("BEGIN");
      await replaceDocument(connection, previous, chunkDocument(previous), [vector(1)], "test", "fixed");
      await replaceDocument(connection, current, chunkDocument(current), [vector(0)], "test", "fixed");
      await connection.query("COMMIT");
    } finally {
      connection.release();
    }
  });

  afterAll(async () => {
    await pool.query("TRUNCATE evaluation_runs, chunks, documents RESTART IDENTITY CASCADE");
    await pool.end();
  });

  it("ordena a versão semanticamente mais próxima na busca vetorial", async () => {
    const results = await searchChunks(pool, "prazo vigente", vector(0), "vector");
    expect(results[0].documentId).toBe("refund-test-2026");
  });

  it("combina texto e vetor na busca híbrida", async () => {
    const results = await searchChunks(pool, "prazo reembolso", vector(0), "hybrid");
    expect(results.map((result) => result.documentId)).toContain("refund-test-2026");
    expect(results[0].source).toBe("initial");
  });
});
