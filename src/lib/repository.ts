import { createHash } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import type { Chunk, DocumentRecord, RetrievedChunk, SearchMode } from "@/types/audit";
import { reciprocalRankFusion } from "@/lib/ranking";

type Queryable = Pick<Pool | PoolClient, "query">;

function vectorLiteral(vector: number[]) {
  return `[${vector.join(",")}]`;
}

function mapDocument(row: Record<string, unknown>): DocumentRecord {
  return {
    documentId: String(row.document_id),
    policyKey: String(row.policy_key),
    title: String(row.title),
    version: String(row.version),
    effectiveFrom: row.effective_from ? String(row.effective_from) : null,
    status: row.status as DocumentRecord["status"],
    content: String(row.content ?? ""),
    contentHash: String(row.content_hash),
    createdAt: row.created_at ? String(row.created_at) : undefined,
  };
}

function mapChunk(row: Record<string, unknown>) {
  return {
    chunkId: String(row.chunk_id),
    documentId: String(row.document_id),
    policyKey: String(row.policy_key),
    title: String(row.title),
    version: String(row.version),
    effectiveFrom: row.effective_from ? String(row.effective_from) : null,
    status: row.status as Chunk["status"],
    section: String(row.section),
    ordinal: Number(row.ordinal),
    content: String(row.content),
  };
}

const chunkSelect = `
  SELECT c.chunk_id, c.document_id, c.section, c.ordinal, c.content,
         d.policy_key, d.title, d.version,
         to_char(d.effective_from, 'YYYY-MM-DD') AS effective_from,
         d.status
  FROM chunks c
  JOIN documents d ON d.document_id = c.document_id`;

export function hashContent(content: string) {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

export async function listDocuments(client: Queryable) {
  const result = await client.query(`
    SELECT document_id, policy_key, title, version,
           to_char(effective_from, 'YYYY-MM-DD') AS effective_from,
           status, content_hash, created_at, '' AS content
    FROM documents
    ORDER BY policy_key, effective_from NULLS LAST, version`);
  return result.rows.map(mapDocument);
}

export async function findDocument(client: Queryable, documentId: string) {
  const result = await client.query(
    `SELECT document_id, policy_key, title, version,
            to_char(effective_from, 'YYYY-MM-DD') AS effective_from,
            status, content_hash, created_at, content
     FROM documents WHERE document_id = $1`,
    [documentId],
  );
  return result.rows[0] ? mapDocument(result.rows[0]) : null;
}

export async function replaceDocument(
  client: PoolClient,
  document: DocumentRecord,
  chunks: Chunk[],
  embeddings: number[][],
  embeddingProvider: string,
  embeddingModel: string,
) {
  if (chunks.length !== embeddings.length) throw new Error("Número de chunks e embeddings divergente.");
  await client.query(
    `INSERT INTO documents
      (document_id, policy_key, title, version, effective_from, status, content, content_hash)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (document_id) DO UPDATE SET
       policy_key = EXCLUDED.policy_key,
       title = EXCLUDED.title,
       version = EXCLUDED.version,
       effective_from = EXCLUDED.effective_from,
       status = EXCLUDED.status,
       content = EXCLUDED.content,
       content_hash = EXCLUDED.content_hash,
       updated_at = NOW()`,
    [
      document.documentId,
      document.policyKey,
      document.title,
      document.version,
      document.effectiveFrom,
      document.status,
      document.content,
      document.contentHash,
    ],
  );
  await client.query("DELETE FROM chunks WHERE document_id = $1", [document.documentId]);
  for (let index = 0; index < chunks.length; index += 1) {
    const chunk = chunks[index];
    await client.query(
      `INSERT INTO chunks
        (chunk_id, document_id, section, ordinal, content, embedding, embedding_provider, embedding_model)
       VALUES ($1, $2, $3, $4, $5, $6::vector, $7, $8)`,
      [
        chunk.chunkId,
        chunk.documentId,
        chunk.section,
        chunk.ordinal,
        chunk.content,
        vectorLiteral(embeddings[index]),
        embeddingProvider,
        embeddingModel,
      ],
    );
  }
}

async function vectorSearch(client: Queryable, vector: number[], limit: number) {
  const result = await client.query(
    `${chunkSelect}, 1 - (c.embedding <=> $1::vector) AS similarity
     ORDER BY c.embedding <=> $1::vector
     LIMIT $2`,
    [vectorLiteral(vector), limit],
  );
  return result.rows.map((row, index) => ({ ...mapChunk(row), score: Number(row.similarity), vectorRank: index + 1 }));
}

async function textSearch(client: Queryable, question: string, limit: number) {
  const result = await client.query(
    `${chunkSelect}, ts_rank_cd(c.search_vector, websearch_to_tsquery('portuguese', $1)) AS text_score
     WHERE c.search_vector @@ websearch_to_tsquery('portuguese', $1)
     ORDER BY text_score DESC
     LIMIT $2`,
    [question, limit],
  );
  return result.rows.map((row, index) => ({ ...mapChunk(row), score: Number(row.text_score), textRank: index + 1 }));
}

export async function searchChunks(
  client: Queryable,
  question: string,
  vector: number[],
  mode: SearchMode,
  limit = 5,
): Promise<RetrievedChunk[]> {
  if (mode === "vector") {
    const vectorResults = await vectorSearch(client, vector, limit);
    return vectorResults.map((chunk) => ({ ...chunk, source: "initial" }));
  }
  const [vectorResults, textResults] = await Promise.all([
    vectorSearch(client, vector, 20),
    textSearch(client, question, 20),
  ]);
  return reciprocalRankFusion(vectorResults, textResults, limit);
}

export async function expandVersionContext(
  client: Queryable,
  initial: RetrievedChunk[],
  vector: number[],
  focalDocumentId?: string,
  maxContext = 8,
  preferredPolicyKey?: string | null,
) {
  if (!initial.length) return initial;
  const policyKey = preferredPolicyKey ?? initial[0].policyKey;
  const result = await client.query(
    `${chunkSelect}, 1 - (c.embedding <=> $1::vector) AS similarity
     WHERE d.policy_key = $2 OR d.document_id = $3
     ORDER BY c.embedding <=> $1::vector
     LIMIT 40`,
    [vectorLiteral(vector), policyKey, focalDocumentId ?? ""],
  );
  const candidates = result.rows.map((row) => ({
    ...mapChunk(row),
    score: Number(row.similarity),
    source: "version-expansion" as const,
  }));
  const context = [...initial];
  const present = new Set(initial.map((chunk) => chunk.chunkId));
  const presentDocuments = new Set(initial.map((chunk) => chunk.documentId));

  if (focalDocumentId && !presentDocuments.has(focalDocumentId)) {
    const focal = candidates.find((chunk) => chunk.documentId === focalDocumentId);
    if (focal) {
      context.push({ ...focal, source: "focal" });
      present.add(focal.chunkId);
      presentDocuments.add(focal.documentId);
    }
  }

  for (const candidate of candidates) {
    if (context.length >= maxContext) break;
    if (present.has(candidate.chunkId) || presentDocuments.has(candidate.documentId)) continue;
    context.push(candidate);
    present.add(candidate.chunkId);
    presentDocuments.add(candidate.documentId);
  }
  return context.slice(0, maxContext);
}

export async function getIndexState(client: Queryable) {
  const result = await client.query(`
    SELECT COUNT(*)::int AS chunk_count,
           COUNT(DISTINCT (embedding_provider, embedding_model))::int AS configurations,
           MIN(embedding_provider) AS provider,
           MIN(embedding_model) AS model
    FROM chunks`);
  return {
    chunkCount: Number(result.rows[0].chunk_count),
    configurations: Number(result.rows[0].configurations),
    provider: result.rows[0].provider ? String(result.rows[0].provider) : null,
    model: result.rows[0].model ? String(result.rows[0].model) : null,
  };
}

export async function getLatestEvaluation(client: Queryable) {
  const result = await client.query(`
    SELECT id, provider, chat_model, embedding_model, modes, metrics, cases, created_at
    FROM evaluation_runs ORDER BY created_at DESC LIMIT 1`);
  return result.rows[0] ?? null;
}
