import { describe, expect, it } from "vitest";
import { aggregateScores, scoreCase, type EvaluationCase } from "@/lib/evaluation";
import type { AuditResponse } from "@/types/audit";

const fixture: EvaluationCase = {
  id: "q1",
  category: "current",
  question: "Prazo?",
  expectedOutcome: "answered",
  requiredTermGroups: [["7 dias"]],
  forbiddenTerms: ["99 dias"],
  expectedCurrentDocumentId: "policy-2026",
  relevantChunkIds: ["c1", "c2"],
  acceptableCitationChunkIds: ["c1"],
};

const response: AuditResponse = {
  outcome: "answered",
  answer: "O prazo atual é de 7 dias.",
  confidence: "high",
  confidenceReason: "Ativa",
  evidence: [{ chunkId: "c1", documentId: "policy-2026", version: "1", section: "4.2", quote: "7 dias" }],
  conflicts: [],
  uncertainties: [],
  retrieval: { mode: "hybrid", initialTopK: 2, expandedContextCount: 2, durationMs: 10 },
  usage: { inputTokens: 10, outputTokens: 5, estimatedCostUsd: null },
};

describe("evaluation metrics", () => {
  it("calcula recall, precisão e correção", () => {
    expect(scoreCase(fixture, response, ["c1", "other"])).toEqual({
      recallAt5: 0.5,
      validCitations: 1,
      totalCitations: 1,
      answerCorrect: true,
      abstentionCorrect: true,
    });
  });

  it("agrega percentis e métricas", () => {
    const result = aggregateScores([
      { ...scoreCase(fixture, response, ["c1", "c2"]), latencyMs: 100, costUsd: null },
      { ...scoreCase(fixture, { ...response, answer: "99 dias" }, []), latencyMs: 300, costUsd: null },
    ]);
    expect(result.recallAt5).toBe(0.5);
    expect(result.answerCorrectness).toBe(0.5);
    expect(result.latencyP50Ms).toBe(100);
    expect(result.latencyP95Ms).toBe(300);
  });
});
