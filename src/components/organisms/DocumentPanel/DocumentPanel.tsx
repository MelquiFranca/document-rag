"use client";

import { useState, type FormEvent } from "react";
import type { DocumentRecord } from "@/types/audit";
import { Button } from "@/components/atoms/Button/Button";
import { StatusBadge } from "@/components/atoms/StatusBadge/StatusBadge";
import styles from "./DocumentPanel.module.css";

type Props = {
  documents: DocumentRecord[];
  focalDocumentId: string;
  onFocalChange: (id: string) => void;
  onUploaded: () => Promise<void>;
};

export function DocumentPanel({ documents, focalDocumentId, onFocalChange, onUploaded }: Props) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/documents", { method: "POST", body: new FormData(formElement) });
      const body = (await response.json()) as { message?: string };
      if (response.ok) {
        formElement.reset();
        setMessage("Documento indexado com sucesso.");
        await onUploaded();
      } else {
        setMessage(body.message ?? "Falha ao indexar o documento.");
      }
    } catch {
      setMessage("Não foi possível conectar ao serviço de indexação.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className={styles.panel} aria-labelledby="documents-title">
      <header className={styles.header}>
        <div>
          <span className="eyebrow">Corpus · {documents.length} documentos</span>
          <h2 id="documents-title">Linha do tempo</h2>
        </div>
        <Button variant="secondary" onClick={() => setUploadOpen((value) => !value)} aria-expanded={uploadOpen}>
          {uploadOpen ? "Fechar" : "+ Documento"}
        </Button>
      </header>

      {uploadOpen ? (
        <form className={styles.upload} onSubmit={submit}>
          <div className={styles.formGrid}>
            <label>Identificador<input name="documentId" placeholder="policy-2027" required pattern="[a-z0-9][a-z0-9-]*" /></label>
            <label>Família da política<input name="policyKey" placeholder="reimbursement-policy" required pattern="[a-z0-9][a-z0-9-]*" /></label>
            <label className={styles.wide}>Título<input name="title" required /></label>
            <label>Versão<input name="version" required /></label>
            <label>Vigência<input name="effectiveFrom" type="date" /></label>
            <label>Status<select name="status" defaultValue="unknown"><option value="active">Vigente</option><option value="superseded">Substituída</option><option value="draft">Minuta</option><option value="unknown">Incerta</option></select></label>
            <label className={styles.wide}>Arquivo TXT ou MD<input name="file" type="file" accept=".txt,.md,.markdown,text/plain,text/markdown" required /></label>
          </div>
          <div className={styles.formFooter}>
            <small>{message || "Máximo de 200 KB · conteúdo UTF-8"}</small>
            <Button disabled={pending}>{pending ? "Indexando…" : "Indexar documento"}</Button>
          </div>
        </form>
      ) : null}

      <div className={styles.timeline}>
        {documents.map((document) => {
          const selected = document.documentId === focalDocumentId;
          return (
            <button
              type="button"
              className={`${styles.document} ${selected ? styles.selected : ""}`}
              key={document.documentId}
              onClick={() => onFocalChange(selected ? "" : document.documentId)}
              aria-pressed={selected}
            >
              <span className={styles.marker} />
              <span className={styles.documentBody}>
                <span className={styles.documentTop}>
                  <strong>{document.title}</strong>
                  <StatusBadge status={document.status} />
                </span>
                <span className={styles.meta}>v{document.version} · {document.effectiveFrom ?? "vigência desconhecida"}</span>
                <code>{document.documentId}</code>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
