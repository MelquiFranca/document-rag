"use client";

import { useCallback, useEffect, useState } from "react";
import type { DocumentRecord } from "@/types/audit";
import { DocumentPanel } from "@/components/organisms/DocumentPanel/DocumentPanel";
import { AuditPanel } from "@/components/organisms/AuditPanel/AuditPanel";
import { EvaluationPanel, type LatestEvaluation } from "@/components/organisms/EvaluationPanel/EvaluationPanel";
import { WorkbenchLayout } from "@/components/templates/WorkbenchLayout/WorkbenchLayout";
import styles from "./EvidenceAuditor.module.css";

type Health = { status: string; provider?: string; index?: { chunkCount: number } };

async function fetchDocuments() {
  const response = await fetch("/api/documents", { cache: "no-store" });
  if (!response.ok) return [];
  const body = (await response.json()) as { documents: DocumentRecord[] };
  return body.documents;
}

export function EvidenceAuditor() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [evaluation, setEvaluation] = useState<LatestEvaluation | null>(null);
  const [health, setHealth] = useState<Health>({ status: "checking" });
  const [focalDocumentId, setFocalDocumentId] = useState("");

  const loadDocuments = useCallback(async () => {
    setDocuments(await fetchDocuments());
  }, []);

  useEffect(() => {
    void Promise.all([
      fetchDocuments().then(setDocuments),
      fetch("/api/evaluations/latest", { cache: "no-store" })
        .then((response) => response.json())
        .then((body: { evaluation?: LatestEvaluation }) => setEvaluation(body.evaluation ?? null)),
      fetch("/api/health", { cache: "no-store" })
        .then((response) => response.json())
        .then((body: Health) => setHealth(body))
        .catch(() => setHealth({ status: "unavailable" })),
    ]);
  }, []);

  return (
    <>
      <header className={styles.topbar}>
        <a className={styles.brand} href="#top" aria-label="AI Evidence Auditor — início">
          <span>AE</span>
          <strong>AI Evidence Auditor</strong>
        </a>
        <div className={styles.health}>
          <span className={`${styles.dot} ${styles[health.status.replace("-", "")] ?? ""}`} />
          <span>{health.status === "ok" ? `${health.provider} · ${health.index?.chunkCount ?? 0} chunks` : health.status === "checking" ? "Verificando ambiente" : "Ambiente requer atenção"}</span>
        </div>
      </header>
      <div id="top" className={styles.contextBar}>
        <span>POC 09 / Document AI</span>
        <p>Recuperar é só o começo. Vigência, contradição e evidência decidem a resposta.</p>
        <span>PostgreSQL · pgvector</span>
      </div>
      <WorkbenchLayout
        sidebar={<DocumentPanel documents={documents} focalDocumentId={focalDocumentId} onFocalChange={setFocalDocumentId} onUploaded={loadDocuments} />}
        main={<AuditPanel focalDocumentId={focalDocumentId} />}
      />
      <EvaluationPanel evaluation={evaluation} />
      <footer className={styles.footer}>
        <strong>AI Evidence Auditor</strong>
        <span>Dataset fictício · respostas exigem evidência verificável</span>
      </footer>
    </>
  );
}
