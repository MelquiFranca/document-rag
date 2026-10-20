import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { AiProvider, AuditPrompt, EmbeddingResult, GenerationResult } from "@/types/audit";
import type { AppConfig } from "@/lib/config";
import { providerAuditSchema } from "@/lib/schemas";
import { buildAuditPrompt, SYSTEM_INSTRUCTIONS } from "@/lib/providers/prompt";

export class OpenAiProvider implements AiProvider {
  readonly name = "openai" as const;
  readonly chatModel: string;
  readonly embeddingModel: string;
  private readonly client: OpenAI;
  private readonly dimensions: number;

  constructor(config: AppConfig) {
    if (!config.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY não configurada.");
    this.client = new OpenAI({ apiKey: config.OPENAI_API_KEY });
    this.chatModel = config.OPENAI_CHAT_MODEL;
    this.embeddingModel = config.OPENAI_EMBEDDING_MODEL;
    this.dimensions = config.EMBEDDING_DIMENSIONS;
  }

  async embed(texts: string[]): Promise<EmbeddingResult> {
    if (!texts.length) return { vectors: [], inputTokens: 0 };
    const response = await this.client.embeddings.create({
      model: this.embeddingModel,
      input: texts,
      dimensions: this.dimensions,
      encoding_format: "float",
    });
    return {
      vectors: response.data.sort((a, b) => a.index - b.index).map((item) => item.embedding),
      inputTokens: response.usage.prompt_tokens,
    };
  }

  async generateAudit(input: AuditPrompt): Promise<GenerationResult> {
    const response = await this.client.responses.parse({
      model: this.chatModel,
      instructions: SYSTEM_INSTRUCTIONS,
      input: buildAuditPrompt(input),
      text: { format: zodTextFormat(providerAuditSchema, "evidence_audit") },
    });
    if (!response.output_parsed) throw new Error("A OpenAI não retornou uma auditoria estruturada.");
    return {
      output: providerAuditSchema.parse(response.output_parsed),
      usage: {
        inputTokens: response.usage?.input_tokens ?? null,
        outputTokens: response.usage?.output_tokens ?? null,
      },
    };
  }
}
