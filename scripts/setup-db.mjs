#!/usr/bin/env node
/**
 * One-shot DB setup: runs the migration SQL files against Supabase Postgres.
 * Usage: DATABASE_URL=... node scripts/setup-db.mjs
 */

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("Missing DATABASE_URL env");
  process.exit(1);
}

const files = [
  join(__dirname, "..", "supabase", "migrations", "0001_initial_schema.sql"),
  join(__dirname, "..", "supabase", "storage-policies.sql"),
];

const client = new pg.Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  console.log("✓ Connected to Postgres");

  for (const f of files) {
    console.log(`→ Running ${f.split("/").slice(-2).join("/")}...`);
    const sql = await readFile(f, "utf8");
    await client.query(sql);
    console.log(`✓ Done`);
  }

  const tables = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name",
  );
  console.log(
    `✓ Public tables (${tables.rows.length}):`,
    tables.rows.map((r) => r.table_name).join(", "),
  );
} catch (err) {
  console.error("✗ Error:", err.message);
  process.exit(1);
} finally {
  await client.end();
}
