import { z } from "zod";
import { documentStatuses } from "@/types/audit";

export const providerEvidenceSchema = z.object({
  chunkId: z.string(),
  documentId: z.string(),
  version: z.string(),
  section: z.string(),
  quote: z.string(),
});

export const providerConflictSchema = z.object({
  documentId: z.string(),
  version: z.string(),
  value: z.string(),
  reason: z.string(),
  evidenceChunkId: z.string(),
});

export const providerAuditSchema = z.object({
  outcome: z.enum(["answered", "abstained"]),
  answer: z.string(),
  evidence: z.array(providerEvidenceSchema),
  conflicts: z.array(providerConflictSchema),
  uncertainties: z.array(z.string()),
});

export const auditRequestSchema = z.object({
  question: z.string().trim().min(3).max(1_000),
  searchMode: z.enum(["vector", "hybrid"]),
  focalDocumentId: z.string().trim().min(1).optional(),
});

export const uploadMetadataSchema = z.object({
  documentId: z.string().trim().min(2).max(100).regex(/^[a-z0-9][a-z0-9-]*$/),
  policyKey: z.string().trim().min(2).max(100).regex(/^[a-z0-9][a-z0-9-]*$/),
  title: z.string().trim().min(2).max(160),
  version: z.string().trim().min(1).max(40),
  effectiveFrom: z
    .string()
    .trim()
    .transform((value) => value || null)
    .refine((value) => value === null || /^\d{4}-\d{2}-\d{2}$/.test(value), "Data inválida"),
  status: z.enum(documentStatuses),
});
