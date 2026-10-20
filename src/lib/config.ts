import { z } from "zod";

const optionalNumber = z.preprocess(
  (value) => (value === "" || value === undefined ? undefined : Number(value)),
  z.number().nonnegative().optional(),
);

const envSchema = z.object({
  DATABASE_URL: z.string().default("postgresql://postgres:postgres@localhost:5435/evidence_auditor"),
  TEST_DATABASE_URL: z
    .string()
    .default("postgresql://postgres:postgres@localhost:5435/evidence_auditor_test"),
  AI_PROVIDER: z.enum(["openai", "ollama"]).default("ollama"),
  EMBEDDING_DIMENSIONS: z.coerce.number().int().positive().default(768),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_CHAT_MODEL: z.string().default("gpt-6-luna"),
  OPENAI_EMBEDDING_MODEL: z.string().default("text-embedding-3-small"),
  OLLAMA_BASE_URL: z.string().url().default("http://127.0.0.1:11434"),
  OLLAMA_CHAT_MODEL: z.string().default("gemma3:4b"),
  OLLAMA_EMBEDDING_MODEL: z.string().default("embeddinggemma"),
  OPENAI_INPUT_USD_PER_MILLION: optionalNumber,
  OPENAI_OUTPUT_USD_PER_MILLION: optionalNumber,
});

export function getConfig() {
  const config = envSchema.parse(process.env);
  if (config.EMBEDDING_DIMENSIONS !== 768) {
    throw new Error("EMBEDDING_DIMENSIONS deve ser 768 para corresponder ao schema do pgvector.");
  }
  return config;
}

export type AppConfig = ReturnType<typeof getConfig>;
