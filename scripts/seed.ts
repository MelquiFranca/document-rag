import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { db } from "../src/lib/db";
import { createAiProvider } from "../src/lib/providers";
import { ingestDocument } from "../src/lib/ingestion";
import type { DocumentRecord } from "../src/types/audit";

type ManifestEntry = Omit<DocumentRecord, "content" | "contentHash"> & { file: string };

const provider = createAiProvider();
const manifest = JSON.parse(
  await readFile(resolve("data/documents/manifest.json"), "utf8"),
) as ManifestEntry[];

try {
  for (const item of manifest) {
    const content = await readFile(resolve("data/documents", item.file), "utf8");
    const metadata = {
      documentId: item.documentId,
      policyKey: item.policyKey,
      title: item.title,
      version: item.version,
      effectiveFrom: item.effectiveFrom,
      status: item.status,
    };
    const result = await ingestDocument(db, provider, { ...metadata, content });
    console.log(`${result.document.documentId}: ${result.chunks} chunks`);
  }
  console.log(`Dataset indexado com ${provider.name}/${provider.embeddingModel}.`);
} finally {
  await db.end();
}
