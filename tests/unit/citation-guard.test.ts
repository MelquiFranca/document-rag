import { describe, expect, it } from "vitest";
import { validateProviderOutput } from "@/lib/citation-guard";
import type { ProviderAuditOutput, RetrievedChunk } from "@/types/audit";

const chunk: RetrievedChunk = {
  chunkId: "policy:section:0",
  documentId: "policy",
  policyKey: "policy",
  title: "Policy",
  version: "1",
  effectiveFrom: "2026-01-01",
  status: "active",
  section: "4.2",
  ordinal: 0,
  content: "O prazo vigente é de 7 dias corridos.",
  score: 1,
  source: "initial",
};

function output(quote: string): ProviderAuditOutput {
  return {
    outcome: "answered",
    answer: "O prazo é 7 dias.",
    evidence: [{ chunkId: chunk.chunkId, documentId: "policy", version: "1", section: "4.2", quote }],
    conflicts: [],
    uncertainties: [],
  };
}

describe("validateProviderOutput", () => {
  it("aceita somente uma citação literal do contexto", () => {
    expect(validateProviderOutput(output("prazo vigente é de 7 dias"), [chunk]).outcome).toBe("answered");
  });

  it("força abstenção quando a citação é inventada", () => {
    const guarded = validateProviderOutput(output("O prazo é de 99 dias"), [chunk]);
    expect(guarded.outcome).toBe("abstained");
    expect(guarded.evidence).toHaveLength(0);
  });
});
