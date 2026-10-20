import type { AuditResponse } from "@/types/audit";
import { normalizeForMatch } from "@/lib/text";

export type EvaluationCase = {
  id: string;
  category: string;
  question: string;
  expectedOutcome: "answered" | "abstained";
  requiredTermGroups: string[][];
  forbiddenTerms: string[];
  expectedCurrentDocumentId: string | null;
  relevantChunkIds: string[];
  acceptableCitationChunkIds: string[];
  focalDocumentId?: string;
};

export type CaseScore = {
  recallAt5: number;
  validCitations: number;
  totalCitations: number;
  answerCorrect: boolean;
  abstentionCorrect: boolean;
};

export function scoreCase(
  fixture: EvaluationCase,
  response: AuditResponse,
  retrievedChunkIds: string[],
): CaseScore {
  const retrieved = new Set(retrievedChunkIds.slice(0, 5));
  const relevant = fixture.relevantChunkIds;
  const recallAt5 = relevant.length
    ? relevant.filter((id) => retrieved.has(id)).length / relevant.length
    : 1;
  const accepted = new Set(fixture.acceptableCitationChunkIds);
  const validCitations = response.evidence.filter((evidence) => accepted.has(evidence.chunkId)).length;
  const normalizedAnswer = normalizeForMatch(response.answer);
  const hasRequiredTerms = fixture.requiredTermGroups.every((group) =>
    group.some((term) => normalizedAnswer.includes(normalizeForMatch(term))),
  );
  const hasForbiddenTerm = fixture.forbiddenTerms.some((term) =>
    normalizedAnswer.includes(normalizeForMatch(term)),
  );
  const hasCurrentDocument =
    fixture.expectedCurrentDocumentId === null ||
    response.evidence.some((evidence) => evidence.documentId === fixture.expectedCurrentDocumentId);
  const outcomeCorrect = response.outcome === fixture.expectedOutcome;

  return {
    recallAt5,
    validCitations,
    totalCitations: response.evidence.length,
    answerCorrect: outcomeCorrect && hasRequiredTerms && !hasForbiddenTerm && hasCurrentDocument,
    abstentionCorrect: outcomeCorrect,
  };
}

export function percentile(values: number[], value: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((value / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

export function aggregateScores(
  scores: Array<CaseScore & { latencyMs: number; costUsd: number | null }>,
) {
  const sum = (values: number[]) => values.reduce((total, item) => total + item, 0);
  const validCitations = sum(scores.map((score) => score.validCitations));
  const totalCitations = sum(scores.map((score) => score.totalCitations));
  const costs = scores.map((score) => score.costUsd).filter((value): value is number => value !== null);
  return {
    recallAt5: sum(scores.map((score) => score.recallAt5)) / scores.length,
    citationPrecision: totalCitations ? validCitations / totalCitations : 1,
    answerCorrectness: scores.filter((score) => score.answerCorrect).length / scores.length,
    abstentionAccuracy: scores.filter((score) => score.abstentionCorrect).length / scores.length,
    latencyP50Ms: percentile(scores.map((score) => score.latencyMs), 50),
    latencyP95Ms: percentile(scores.map((score) => score.latencyMs), 95),
    totalCostUsd: costs.length ? sum(costs) : null,
    averageCostUsd: costs.length ? sum(costs) / costs.length : null,
  };
}
