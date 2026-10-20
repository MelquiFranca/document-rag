CREATE EXTENSION IF NOT EXISTS vector;

DO $$ BEGIN
  CREATE TYPE document_status AS ENUM ('active', 'superseded', 'draft', 'unknown');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS documents (
  document_id TEXT PRIMARY KEY,
  policy_key TEXT NOT NULL,
  title TEXT NOT NULL,
  version TEXT NOT NULL,
  effective_from DATE,
  status document_status NOT NULL DEFAULT 'unknown',
  content TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chunks (
  chunk_id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(document_id) ON DELETE CASCADE,
  section TEXT NOT NULL,
  ordinal INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(768) NOT NULL,
  embedding_provider TEXT NOT NULL,
  embedding_model TEXT NOT NULL,
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('portuguese', coalesce(section, '') || ' ' || coalesce(content, ''))
  ) STORED,
  UNIQUE(document_id, ordinal)
);

CREATE INDEX IF NOT EXISTS chunks_search_vector_idx ON chunks USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS chunks_embedding_hnsw_idx
  ON chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS documents_policy_key_idx ON documents(policy_key);

CREATE TABLE IF NOT EXISTS evaluation_runs (
  id BIGSERIAL PRIMARY KEY,
  provider TEXT NOT NULL,
  chat_model TEXT NOT NULL,
  embedding_model TEXT NOT NULL,
  modes TEXT[] NOT NULL,
  metrics JSONB NOT NULL,
  cases JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
