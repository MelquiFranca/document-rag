import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getConfig } from "@/lib/config";
import { getIndexState } from "@/lib/repository";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = getConfig();
    const vector = await db.query("SELECT extversion FROM pg_extension WHERE extname = 'vector'");
    const index = await getIndexState(db);
    const expectedModel =
      config.AI_PROVIDER === "openai"
        ? config.OPENAI_EMBEDDING_MODEL
        : config.OLLAMA_EMBEDDING_MODEL;
    const compatible =
      index.chunkCount === 0 ||
      (index.configurations === 1 && index.provider === config.AI_PROVIDER && index.model === expectedModel);
    return NextResponse.json({
      status: compatible ? "ok" : "reindex-required",
      database: "connected",
      pgvector: vector.rows[0]?.extversion ?? null,
      provider: config.AI_PROVIDER,
      expectedEmbeddingModel: expectedModel,
      index,
    });
  } catch (error) {
    console.error("health.failed", error);
    return NextResponse.json(
      { status: "unavailable", database: "disconnected" },
      { status: 503 },
    );
  }
}
