import type { Pool } from "pg";
import type { AiProvider, AuditResponse, SearchMode } from "@/types/audit";
import { expandVersionContext, listDocuments, searchChunks } from "@/lib/repository";
import { asksForCurrentState, resolveVersion } from "@/lib/version-resolution";
import { validateProviderOutput } from "@/lib/citation-guard";
import { withEstimatedCost } from "@/lib/cost";

type AuditOptions = {
  question: string;
  searchMode: SearchMode;
  focalDocumentId?: string;
};

export async function auditQuestion(
  pool: Pool,
  provider: AiProvider,
  options: AuditOptions,
): Promise<AuditResponse & { retrievedChunkIds: string[] }> {
  const startedAt = performance.now();
  const embedding = await provider.embed([options.question]);
  const initial = await searchChunks(
    pool,
    options.question,
    embedding.vectors[0],
    options.searchMode,
    5,
  );
  const documents = await listDocuments(pool);
  const resolution = resolveVersion(options.question, initial, documents);
  const context = await expandVersionContext(
    pool,
    initial,
    embedding.vectors[0],
    options.focalDocumentId,
    8,
    resolution.policyKey,
  );
  const retrievalDuration = performance.now() - startedAt;

  if (!context.length || (asksForCurrentState(options.question) && resolution.state === "ambiguous")) {
    return {
      outcome: "abstained",
      answer: "Não há informação suficiente para determinar qual política está vigente.",
      confidence: "low",
      confidenceReason: resolution.reason,
      evidence: [],
      conflicts: [],
      uncertainties: [resolution.reason],
      retrieval: {
        mode: options.searchMode,
        initialTopK: initial.length,
        expandedContextCount: context.length,
        durationMs: Math.round(retrievalDuration),
      },
      usage: withEstimatedCost(provider.name, {
        inputTokens: embedding.inputTokens,
        outputTokens: 0,
      }),
      retrievedChunkIds: initial.map((chunk) => chunk.chunkId),
    };
  }

  const generation = await provider.generateAudit({
    question: options.question,
    chunks: context,
    resolution,
    focalDocumentId: options.focalDocumentId,
  });
  const guarded = validateProviderOutput(generation.output, context);
  const confidence = guarded.outcome === "abstained" ? "low" : resolution.historicalQuestion ? "medium" : "high";
  const confidenceReason =
    guarded.outcome === "abstained"
      ? guarded.uncertainties[0] ?? "A evidência recuperada é insuficiente."
      : confidence === "high"
        ? resolution.reason
        : "O fato histórico é sustentado, mas não representa necessariamente a versão vigente.";
  const inputTokens =
    embedding.inputTokens === null && generation.usage.inputTokens === null
      ? null
      : (embedding.inputTokens ?? 0) + (generation.usage.inputTokens ?? 0);

  return {
    ...guarded,
    confidence,
    confidenceReason,
    retrieval: {
      mode: options.searchMode,
      initialTopK: initial.length,
      expandedContextCount: context.length,
      durationMs: Math.round(retrievalDuration),
    },
    usage: withEstimatedCost(provider.name, {
      inputTokens,
      outputTokens: generation.usage.outputTokens,
    }),
    retrievedChunkIds: initial.map((chunk) => chunk.chunkId),
  };
}
