import type { DocumentStatus } from "@/types/audit";
import styles from "./StatusBadge.module.css";

const labels: Record<DocumentStatus | "high" | "medium" | "low", string> = {
  active: "Vigente",
  superseded: "Substituída",
  draft: "Minuta",
  unknown: "Incerta",
  high: "Alta confiança",
  medium: "Confiança média",
  low: "Baixa confiança",
};

export function StatusBadge({ status }: { status: DocumentStatus | "high" | "medium" | "low" }) {
  return <span className={`${styles.badge} ${styles[status]}`}>{labels[status]}</span>;
}
