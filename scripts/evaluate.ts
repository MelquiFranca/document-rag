import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { db } from "../src/lib/db";
import { createAiProvider } from "../src/lib/providers";
import { auditQuestion } from "../src/lib/audit-service";
import { aggregateScores, scoreCase, type EvaluationCase } from "../src/lib/evaluation";
import type { SearchMode } from "../src/types/audit";

function readArgument(name: string) {
  const match = process.argv.find((argument) => argument.startsWith(`--${name}=`));
  return match?.split("=")[1];
}

const requestedMode = readArgument("mode") ?? "both";
if (!new Set(["vector", "hybrid", "both"]).has(requestedMode)) {
  throw new Error("Use --mode=vector, --mode=hybrid ou --mode=both.");
}
const modes: SearchMode[] = requestedMode === "both" ? ["vector", "hybrid"] : [requestedMode as SearchMode];
const strict = process.argv.includes("--strict");
const fixtures = JSON.parse(
  await readFile(resolve("data/evaluation/questions.json"), "utf8"),
) as EvaluationCase[];
const provider = createAiProvider();
const metrics: Record<string, ReturnType<typeof aggregateScores>> = {};
const allCases: Record<string, unknown[]> = {};

try {
  for (const mode of modes) {
    const results = [];
    console.log(`\nExecutando ${fixtures.length} casos em modo ${mode}...`);
    for (const fixture of fixtures) {
      const startedAt = performance.now();
      const response = await auditQuestion(db, provider, {
        question: fixture.question,
        searchMode: mode,
        focalDocumentId: fixture.focalDocumentId,
      });
      const latencyMs = Math.round(performance.now() - startedAt);
      const score = scoreCase(fixture, response, response.retrievedChunkIds);
      results.push({
        id: fixture.id,
        category: fixture.category,
        ...score,
        latencyMs,
        costUsd: response.usage.estimatedCostUsd,
        outcome: response.outcome,
        answer: response.answer,
        retrievedChunkIds: response.retrievedChunkIds,
      });
      console.log(`${score.answerCorrect ? "✓" : "×"} ${fixture.id} · ${latencyMs} ms`);
    }
    metrics[mode] = aggregateScores(results);
    allCases[mode] = results;
  }

  await db.query(
    `INSERT INTO evaluation_runs
      (provider, chat_model, embedding_model, modes, metrics, cases)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb)`,
    [
      provider.name,
      provider.chatModel,
      provider.embeddingModel,
      modes,
      JSON.stringify(metrics),
      JSON.stringify(allCases),
    ],
  );
  console.log("\nResumo");
  console.table(metrics);

  if (strict) {
    const failures = Object.entries(metrics).flatMap(([mode, result]) => [
      ...(mode === "hybrid" && result.recallAt5 < 0.85 ? [`${mode}: Recall@5 < 85%`] : []),
      ...(result.citationPrecision < 0.95 ? [`${mode}: citation precision < 95%`] : []),
      ...(result.answerCorrectness < 0.8 ? [`${mode}: answer correctness < 80%`] : []),
      ...(result.abstentionAccuracy < 0.9 ? [`${mode}: abstention accuracy < 90%`] : []),
    ]);
    if (failures.length) throw new Error(`Limites não atendidos:\n${failures.join("\n")}`);
  }
} finally {
  await db.end();
}
