export const documentStatuses = ["active", "superseded", "draft", "unknown"] as const;
export type DocumentStatus = (typeof documentStatuses)[number];
export type SearchMode = "vector" | "hybrid";

export type DocumentRecord = {
  documentId: string;
  policyKey: string;
  title: string;
  version: string;
  effectiveFrom: string | null;
  status: DocumentStatus;
  content: string;
  contentHash: string;
  createdAt?: string;
};

export type Chunk = {
  chunkId: string;
  documentId: string;
  policyKey: string;
  title: string;
  version: string;
  effectiveFrom: string | null;
  status: DocumentStatus;
  section: string;
  ordinal: number;
  content: string;
};

export type RetrievedChunk = Chunk & {
  score: number;
  vectorRank?: number;
  textRank?: number;
  source: "initial" | "version-expansion" | "focal";
};

export type Usage = {
  inputTokens: number | null;
  outputTokens: number | null;
  estimatedCostUsd: number | null;
};

export type Evidence = {
  chunkId: string;
  documentId: string;
  version: string;
  section: string;
  quote: string;
};

export type Conflict = {
  documentId: string;
  version: string;
  value: string;
  reason: string;
  evidenceChunkId: string;
};

export type AuditResponse = {
  outcome: "answered" | "abstained";
  answer: string;
  confidence: "high" | "medium" | "low";
  confidenceReason: string;
  evidence: Evidence[];
  conflicts: Conflict[];
  uncertainties: string[];
  retrieval: {
    mode: SearchMode;
    initialTopK: number;
    expandedContextCount: number;
    durationMs: number;
  };
  usage: Usage;
};

export type VersionResolution = {
  policyKey: string | null;
  currentDocumentId: string | null;
  state: "resolved" | "ambiguous" | "not-applicable";
  reason: string;
  historicalQuestion: boolean;
};

export type AuditPrompt = {
  question: string;
  chunks: RetrievedChunk[];
  resolution: VersionResolution;
  focalDocumentId?: string;
};

export type ProviderAuditOutput = Pick<
  AuditResponse,
  "outcome" | "answer" | "evidence" | "conflicts" | "uncertainties"
>;

export type EmbeddingResult = {
  vectors: number[][];
  inputTokens: number | null;
};

export type GenerationResult = {
  output: ProviderAuditOutput;
  usage: Omit<Usage, "estimatedCostUsd">;
};

export interface AiProvider {
  readonly name: "openai" | "ollama";
  readonly chatModel: string;
  readonly embeddingModel: string;
  embed(texts: string[]): Promise<EmbeddingResult>;
  generateAudit(input: AuditPrompt): Promise<GenerationResult>;
}
