import type { Pool } from "pg";
import type { AiProvider, DocumentRecord } from "@/types/audit";
import { chunkDocument } from "@/lib/chunking";
import { hashContent, replaceDocument } from "@/lib/repository";

export async function ingestDocument(
  pool: Pool,
  provider: AiProvider,
  document: Omit<DocumentRecord, "contentHash">,
) {
  const completeDocument: DocumentRecord = {
    ...document,
    contentHash: hashContent(document.content),
  };
  const chunks = chunkDocument(completeDocument);
  if (!chunks.length) throw new Error("O documento não possui conteúdo indexável.");
  const { vectors } = await provider.embed(
    chunks.map(
      (chunk) =>
        `${chunk.title}\nVersão: ${chunk.version}\nSeção: ${chunk.section}\n${chunk.content}`,
    ),
  );
  const connection = await pool.connect();
  try {
    await connection.query("BEGIN");
    await replaceDocument(
      connection,
      completeDocument,
      chunks,
      vectors,
      provider.name,
      provider.embeddingModel,
    );
    await connection.query("COMMIT");
  } catch (error) {
    await connection.query("ROLLBACK");
    throw error;
  } finally {
    connection.release();
  }
  return { document: completeDocument, chunks: chunks.length };
}
