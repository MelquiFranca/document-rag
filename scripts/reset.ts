import { Pool } from "pg";
import { getConfig } from "../src/lib/config";

const connectionString = process.argv.includes("--test")
  ? getConfig().TEST_DATABASE_URL
  : getConfig().DATABASE_URL;
const databaseName = new URL(connectionString).pathname.slice(1);
if (!databaseName.startsWith("evidence_auditor")) {
  throw new Error(`Reset recusado para o banco ${databaseName}.`);
}

const pool = new Pool({ connectionString });
try {
  await pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  console.log(`Banco ${databaseName} limpo. Execute db:migrate e db:seed.`);
} finally {
  await pool.end();
}
