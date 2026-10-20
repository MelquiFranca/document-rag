import type { Usage } from "@/types/audit";
import { getConfig } from "@/lib/config";

export function withEstimatedCost(
  provider: "openai" | "ollama",
  usage: Omit<Usage, "estimatedCostUsd">,
): Usage {
  if (provider === "ollama") return { ...usage, estimatedCostUsd: null };
  const config = getConfig();
  if (
    usage.inputTokens === null ||
    usage.outputTokens === null ||
    config.OPENAI_INPUT_USD_PER_MILLION === undefined ||
    config.OPENAI_OUTPUT_USD_PER_MILLION === undefined
  ) {
    return { ...usage, estimatedCostUsd: null };
  }
  const estimatedCostUsd =
    (usage.inputTokens / 1_000_000) * config.OPENAI_INPUT_USD_PER_MILLION +
    (usage.outputTokens / 1_000_000) * config.OPENAI_OUTPUT_USD_PER_MILLION;
  return { ...usage, estimatedCostUsd: Number(estimatedCostUsd.toFixed(8)) };
}
