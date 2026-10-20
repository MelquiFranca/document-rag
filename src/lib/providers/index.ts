import type { AiProvider } from "@/types/audit";
import { getConfig } from "@/lib/config";
import { OpenAiProvider } from "@/lib/providers/openai-provider";
import { OllamaProvider } from "@/lib/providers/ollama-provider";

export function createAiProvider(): AiProvider {
  const config = getConfig();
  return config.AI_PROVIDER === "openai"
    ? new OpenAiProvider(config)
    : new OllamaProvider(config);
}
