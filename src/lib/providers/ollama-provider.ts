import { Ollama } from "ollama";
import { z } from "zod";
import type { AiProvider, AuditPrompt, EmbeddingResult, GenerationResult } from "@/types/audit";
import type { AppConfig } from "@/lib/config";
import { providerAuditSchema } from "@/lib/schemas";
import { buildAuditPrompt, SYSTEM_INSTRUCTIONS } from "@/lib/providers/prompt";

export class OllamaProvider implements AiProvider {
  readonly name = "ollama" as const;
  readonly chatModel: string;
  readonly embeddingModel: string;
  private readonly client: Ollama;
  private readonly dimensions: number;

  constructor(config: AppConfig) {
    this.client = new Ollama({ host: config.OLLAMA_BASE_URL });
    this.chatModel = config.OLLAMA_CHAT_MODEL;
    this.embeddingModel = config.OLLAMA_EMBEDDING_MODEL;
    this.dimensions = config.EMBEDDING_DIMENSIONS;
  }

  async embed(texts: string[]): Promise<EmbeddingResult> {
    if (!texts.length) return { vectors: [], inputTokens: 0 };
    const response = await this.client.embed({
      model: this.embeddingModel,
      input: texts,
      dimensions: this.dimensions,
      truncate: true,
    });
    return { vectors: response.embeddings, inputTokens: response.prompt_eval_count ?? null };
  }

  async generateAudit(input: AuditPrompt): Promise<GenerationResult> {
    const response = await this.client.chat({
      model: this.chatModel,
      messages: [
        { role: "system", content: SYSTEM_INSTRUCTIONS },
        { role: "user", content: buildAuditPrompt(input) },
      ],
      format: z.toJSONSchema(providerAuditSchema),
      stream: false,
      options: { temperature: 0 },
    });
    return {
      output: providerAuditSchema.parse(JSON.parse(response.message.content)),
      usage: {
        inputTokens: response.prompt_eval_count ?? null,
        outputTokens: response.eval_count ?? null,
      },
    };
  }
}
