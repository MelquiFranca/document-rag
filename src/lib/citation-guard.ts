import type { ProviderAuditOutput, RetrievedChunk } from "@/types/audit";
import { normalizeWhitespace } from "@/lib/text";

export function validateProviderOutput(
  output: ProviderAuditOutput,
  context: RetrievedChunk[],
): ProviderAuditOutput {
  const byId = new Map(context.map((chunk) => [chunk.chunkId, chunk]));

  const evidence = output.evidence.filter((item) => {
    const chunk = byId.get(item.chunkId);
    return (
      chunk !== undefined &&
      chunk.documentId === item.documentId &&
      chunk.version === item.version &&
      chunk.section === item.section &&
      normalizeWhitespace(chunk.content).includes(normalizeWhitespace(item.quote)) &&
      normalizeWhitespace(item.quote).length >= 8
    );
  });

  const validChunkIds = new Set(context.map((chunk) => chunk.chunkId));
  const conflicts = output.conflicts.filter((item) => {
    const chunk = byId.get(item.evidenceChunkId);
    return chunk?.documentId === item.documentId && validChunkIds.has(item.evidenceChunkId);
  });

  if (output.outcome === "answered" && evidence.length === 0) {
    return {
      outcome: "abstained",
      answer: "Não há evidência verificável suficiente no contexto recuperado para responder com segurança.",
      evidence: [],
      conflicts,
      uncertainties: [
        ...output.uncertainties,
        "A resposta gerada não apresentou uma citação literal válida.",
      ],
    };
  }

  return { ...output, evidence, conflicts };
}
