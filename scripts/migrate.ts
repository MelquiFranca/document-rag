import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Pool } from "pg";
import { getConfig } from "../src/lib/config";

const target = process.argv.includes("--test")
  ? getConfig().TEST_DATABASE_URL
  : getConfig().DATABASE_URL;
const pool = new Pool({ connectionString: target });

try {
  const sql = await readFile(resolve("database/schema.sql"), "utf8");
  await pool.query(sql);
  console.log("Schema do AI Evidence Auditor pronto.");
} finally {
  await pool.end();
}
