// Apply a SQL migration to Supabase via the Management API.
//
//   node scripts/run-migration.mjs supabase/upgrade-v8.sql
//
// Reads the Supabase personal access token from ./.supabase-token (git-ignored),
// or from the SUPABASE_ACCESS_TOKEN env var. Never commit the token.
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || "dxkaegvahrkogqdykwcq";

function getToken() {
  if (process.env.SUPABASE_ACCESS_TOKEN) return process.env.SUPABASE_ACCESS_TOKEN.trim();
  for (const name of ["supabase-token.txt", ".supabase-token"]) {
    const file = resolve(root, name);
    if (existsSync(file)) return readFileSync(file, "utf8").trim();
  }
  console.error("No token found. Save your Supabase access token to supabase-token.txt (git-ignored) or set SUPABASE_ACCESS_TOKEN.");
  process.exit(1);
}

const sqlPath = process.argv[2];
if (!sqlPath) { console.error("Usage: node scripts/run-migration.mjs <path-to.sql>"); process.exit(1); }
const query = readFileSync(resolve(root, sqlPath), "utf8");
const token = getToken();

const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query }),
});
const text = await res.text();
if (res.ok) {
  console.log(`✓ Applied ${sqlPath}`);
  if (text && text !== "[]") console.log(text);
} else {
  console.error(`✗ Failed (${res.status}): ${text}`);
  process.exit(1);
}
