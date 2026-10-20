import type { Evidence } from "@/types/audit";
import styles from "./EvidenceItem.module.css";

export function EvidenceItem({ evidence, index }: { evidence: Evidence; index: number }) {
  return (
    <details className={styles.item} style={{ "--item-index": index } as React.CSSProperties}>
      <summary>
        <span className={styles.number}>{String(index + 1).padStart(2, "0")}</span>
        <span className={styles.identity}>
          <strong>{evidence.documentId}</strong>
          <small>{evidence.version} · § {evidence.section}</small>
        </span>
        <span className={styles.action}>Ver trecho</span>
      </summary>
      <blockquote>“{evidence.quote}”</blockquote>
      <code>{evidence.chunkId}</code>
    </details>
  );
}
