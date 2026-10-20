import type { DocumentRecord, RetrievedChunk, VersionResolution } from "@/types/audit";

const currentQuestionPattern = /\b(atual|vigente|hoje|agora|em vigor)\b/i;
const historicalPattern = /\b(20\d{2}|vers[aã]o anterior|hist[oó]ric[oa]|mudou|mudan[cç]a)\b/i;

export function resolveVersion(
  question: string,
  chunks: RetrievedChunk[],
  documents: Pick<DocumentRecord, "documentId" | "policyKey" | "status" | "effectiveFrom">[],
): VersionResolution {
  if (!chunks.length) {
    return {
      policyKey: null,
      currentDocumentId: null,
      state: "not-applicable",
      reason: "Nenhum trecho relevante foi recuperado.",
      historicalQuestion: false,
    };
  }

  const normalizedQuestion = question
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const ignored = new Set(["politica", "manual", "procedimento", "atual", "vigente", "versao"]);
  const policyCandidates = [...new Set(chunks.map((chunk) => chunk.policyKey))].map((policyKey) => {
    const representative = chunks.find((chunk) => chunk.policyKey === policyKey)!;
    const tokens = `${representative.title} ${policyKey}`
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length >= 5 && !ignored.has(token));
    const positions = tokens
      .map((token) => normalizedQuestion.indexOf(token))
      .filter((position) => position >= 0);
    return { policyKey, position: positions.length ? Math.min(...positions) : Number.POSITIVE_INFINITY };
  });
  policyCandidates.sort((a, b) => a.position - b.position);
  const policyKey = policyCandidates[0].position === Number.POSITIVE_INFINITY
    ? chunks[0].policyKey
    : policyCandidates[0].policyKey;
  const siblings = documents.filter((document) => document.policyKey === policyKey);
  const today = new Date().toISOString().slice(0, 10);
  const active = siblings.filter(
    (document) =>
      document.status === "active" &&
      document.effectiveFrom !== null &&
      document.effectiveFrom <= today,
  );
  const historicalQuestion = historicalPattern.test(question) && !currentQuestionPattern.test(question);

  if (active.length === 1) {
    return {
      policyKey,
      currentDocumentId: active[0].documentId,
      state: "resolved",
      reason: `Apenas ${active[0].documentId} está ativo e já entrou em vigor.`,
      historicalQuestion,
    };
  }

  return {
    policyKey,
    currentDocumentId: null,
    state: "ambiguous",
    reason:
      active.length > 1
        ? "Mais de uma versão está marcada como ativa."
        : "Nenhuma versão possui status ativo e data de vigência válida.",
    historicalQuestion,
  };
}

export function asksForCurrentState(question: string) {
  return currentQuestionPattern.test(question);
}
