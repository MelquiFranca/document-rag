import type { RetrievedChunk } from "@/types/audit";

type RankedChunk = Omit<RetrievedChunk, "score" | "source">;

export function reciprocalRankFusion(
  vectorResults: RankedChunk[],
  textResults: RankedChunk[],
  limit = 5,
  rankConstant = 60,
): RetrievedChunk[] {
  const fused = new Map<string, RetrievedChunk>();

  const add = (chunk: RankedChunk, rank: number, kind: "vector" | "text") => {
    const existing = fused.get(chunk.chunkId);
    const score = (existing?.score ?? 0) + 1 / (rankConstant + rank);
    fused.set(chunk.chunkId, {
      ...(existing ?? chunk),
      score,
      source: "initial",
      ...(kind === "vector" ? { vectorRank: rank } : { textRank: rank }),
    });
  };

  vectorResults.forEach((chunk, index) => add(chunk, index + 1, "vector"));
  textResults.forEach((chunk, index) => add(chunk, index + 1, "text"));

  return [...fused.values()].sort((a, b) => b.score - a.score).slice(0, limit);
}
