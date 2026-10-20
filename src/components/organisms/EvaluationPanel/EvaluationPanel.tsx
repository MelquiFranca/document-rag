import { Metric } from "@/components/molecules/Metric/Metric";
import styles from "./EvaluationPanel.module.css";

type Metrics = {
  recallAt5: number;
  citationPrecision: number;
  answerCorrectness: number;
  abstentionAccuracy: number;
  latencyP50Ms: number;
  latencyP95Ms: number;
  totalCostUsd: number | null;
};

export type LatestEvaluation = {
  id: number;
  provider: string;
  chat_model: string;
  embedding_model: string;
  modes: string[];
  metrics: Record<string, Metrics>;
  created_at: string;
};

const percentage = (value: number) => `${Math.round(value * 100)}%`;

export function EvaluationPanel({ evaluation }: { evaluation: LatestEvaluation | null }) {
  return (
    <section className={styles.panel} aria-labelledby="evaluation-title">
      <header>
        <div>
          <span className="eyebrow">Avaliação reproduzível</span>
          <h2 id="evaluation-title">A qualidade fica visível.</h2>
        </div>
        <code>npm run eval -- --mode=both</code>
      </header>

      {!evaluation ? (
        <div className={styles.empty}>
          <strong>Nenhuma execução registrada.</strong>
          <p>Rode a suíte pela CLI para comparar recuperação vetorial e híbrida nas mesmas 20 perguntas.</p>
        </div>
      ) : (
        <>
          <div className={styles.runMeta}>
            <span>Execução #{evaluation.id}</span>
            <span>{evaluation.provider} · {evaluation.chat_model}</span>
            <time>{new Date(evaluation.created_at).toLocaleString("pt-BR")}</time>
          </div>
          <div className={styles.comparison}>
            {Object.entries(evaluation.metrics).map(([mode, metrics]) => (
              <article key={mode}>
                <h3>{mode === "hybrid" ? "Busca híbrida" : "Busca vetorial"}</h3>
                <div className={styles.metrics}>
                  <Metric label="Recall@5" value={percentage(metrics.recallAt5)} />
                  <Metric label="Citações" value={percentage(metrics.citationPrecision)} />
                  <Metric label="Correção" value={percentage(metrics.answerCorrectness)} />
                  <Metric label="Abstenção" value={percentage(metrics.abstentionAccuracy)} />
                  <Metric label="Latência p50" value={`${metrics.latencyP50Ms} ms`} hint={`p95 ${metrics.latencyP95Ms} ms`} />
                  <Metric label="Custo total" value={metrics.totalCostUsd === null ? "Local" : `$${metrics.totalCostUsd.toFixed(4)}`} />
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
