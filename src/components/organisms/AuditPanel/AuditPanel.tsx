"use client";

import { useState, type FormEvent } from "react";
import type { AuditResponse, SearchMode } from "@/types/audit";
import { Button } from "@/components/atoms/Button/Button";
import { SegmentedControl } from "@/components/atoms/SegmentedControl/SegmentedControl";
import { StatusBadge } from "@/components/atoms/StatusBadge/StatusBadge";
import { EvidenceItem } from "@/components/molecules/EvidenceItem/EvidenceItem";
import styles from "./AuditPanel.module.css";

const sampleQuestion = "Qual é o prazo atual para solicitar reembolso e quando ele mudou?";

export function AuditPanel({ focalDocumentId }: { focalDocumentId: string }) {
  const [question, setQuestion] = useState(sampleQuestion);
  const [mode, setMode] = useState<SearchMode>("hybrid");
  const [result, setResult] = useState<AuditResponse | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, searchMode: mode, focalDocumentId: focalDocumentId || undefined }),
      });
      const body = (await response.json()) as AuditResponse & { message?: string };
      if (response.ok) setResult(body);
      else setError(body.message ?? "Não foi possível executar a auditoria.");
    } catch {
      setError("Não foi possível conectar ao serviço de auditoria.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className={styles.panel} aria-labelledby="audit-title">
      <header className={styles.header}>
        <div>
          <span className="eyebrow">Consulta fundamentada</span>
          <h1 id="audit-title">Audite a resposta, não apenas a busca.</h1>
        </div>
        <span className={styles.focal} title={focalDocumentId || "Nenhuma versão focal"}>
          {focalDocumentId ? `Foco: ${focalDocumentId}` : "Corpus completo"}
        </span>
      </header>

      <form className={styles.composer} onSubmit={submit}>
        <label htmlFor="question">Pergunta</label>
        <textarea
          id="question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          rows={3}
          maxLength={1_000}
          required
        />
        <div className={styles.actions}>
          <SegmentedControl
            label="Modo de busca"
            value={mode}
            onChange={setMode}
            options={[{ value: "vector", label: "Vetorial" }, { value: "hybrid", label: "Híbrida" }]}
          />
          <Button disabled={pending || question.trim().length < 3}>
            {pending ? "Auditando…" : "Executar auditoria →"}
          </Button>
        </div>
      </form>

      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      {pending ? <div className={styles.loading} aria-live="polite"><span /><p>Recuperando trechos e confrontando versões…</p></div> : null}
      {!pending && !result ? (
        <div className={styles.empty}>
          <span>01</span>
          <p>A conclusão aparecerá aqui com as citações que a sustentam e as versões que divergem.</p>
        </div>
      ) : null}
      {!pending && result ? <AuditResult result={result} /> : null}
    </section>
  );
}

function AuditResult({ result }: { result: AuditResponse }) {
  return (
    <div className={styles.result} aria-live="polite">
      <div className={styles.verdict}>
        <div className={styles.verdictMeta}>
          <span className="eyebrow">{result.outcome === "answered" ? "Conclusão sustentada" : "Abstenção"}</span>
          <StatusBadge status={result.confidence} />
        </div>
        <p>{result.answer}</p>
        <small>{result.confidenceReason}</small>
      </div>

      {result.conflicts.length ? (
        <section className={styles.conflicts} aria-labelledby="conflicts-title">
          <h3 id="conflicts-title">Divergências encontradas</h3>
          {result.conflicts.map((conflict) => (
            <div key={`${conflict.evidenceChunkId}-${conflict.value}`}>
              <strong>{conflict.value}</strong>
              <span>{conflict.documentId} · v{conflict.version}</span>
              <p>{conflict.reason}</p>
            </div>
          ))}
        </section>
      ) : null}

      {result.uncertainties.length ? (
        <section className={styles.uncertainties}>
          <h3>Incertezas</h3>
          <ul>{result.uncertainties.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>
      ) : null}

      <section className={styles.evidence} aria-labelledby="evidence-title">
        <div className={styles.sectionTitle}>
          <h3 id="evidence-title">Evidências verificadas</h3>
          <span>{result.evidence.length} citações válidas</span>
        </div>
        {result.evidence.length
          ? result.evidence.map((item, index) => <EvidenceItem evidence={item} index={index} key={`${item.chunkId}-${index}`} />)
          : <p className={styles.noEvidence}>Nenhuma evidência foi aceita pelo verificador.</p>}
      </section>

      <footer className={styles.telemetry}>
        <span><b>{result.retrieval.mode === "hybrid" ? "Híbrida" : "Vetorial"}</b> busca</span>
        <span><b>{result.retrieval.initialTopK}</b> top-k</span>
        <span><b>{result.retrieval.expandedContextCount}</b> no contexto</span>
        <span><b>{result.retrieval.durationMs} ms</b> recuperação</span>
        <span><b>{result.usage.inputTokens ?? "—"}</b> tokens entrada</span>
        <span><b>{result.usage.outputTokens ?? "—"}</b> tokens saída</span>
        <span><b>{result.usage.estimatedCostUsd === null ? "—" : `$${result.usage.estimatedCostUsd}`}</b> custo</span>
      </footer>
    </div>
  );
}
