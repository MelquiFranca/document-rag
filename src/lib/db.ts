import { Pool } from "pg";
import { getConfig } from "@/lib/config";

declare global {
  var evidenceAuditorPool: Pool | undefined;
}

function createPool() {
  return new Pool({ connectionString: getConfig().DATABASE_URL, max: 10 });
}

export const db = global.evidenceAuditorPool ?? createPool();

if (process.env.NODE_ENV !== "production") global.evidenceAuditorPool = db;
