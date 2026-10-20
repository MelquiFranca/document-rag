import { describe, expect, it } from "vitest";
import { reciprocalRankFusion } from "@/lib/ranking";
import type { RetrievedChunk } from "@/types/audit";

function chunk(chunkId: string) {
  return {
    chunkId,
    documentId: chunkId,
    policyKey: "policy",
    title: chunkId,
    version: "1",
    effectiveFrom: "2026-01-01",
    status: "active" as const,
    section: "section",
    ordinal: 0,
    content: chunkId,
  } satisfies Omit<RetrievedChunk, "score" | "source">;
}

describe("reciprocalRankFusion", () => {
  it("favorece resultados presentes nos dois rankings", () => {
    const result = reciprocalRankFusion(
      [chunk("semantic"), chunk("both")],
      [chunk("both"), chunk("lexical")],
      3,
    );
    expect(result[0].chunkId).toBe("both");
    expect(result[0]).toMatchObject({ vectorRank: 2, textRank: 1, source: "initial" });
  });
});
