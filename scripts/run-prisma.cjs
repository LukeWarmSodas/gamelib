/**
 * Runs `npx prisma …` with the same DATABASE_URL resolution as `src/lib/db.ts`
 * (Windows + docker-style `/app/data/` → `file:./dev.db`) so migrations hit the DB
 * the Next.js dev server actually uses.
 */
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const envPath = path.join(root, ".env");

function readDatabaseUrlFromEnvFile() {
  if (!fs.existsSync(envPath)) return undefined;
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const m = trimmed.match(/^DATABASE_URL\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[1].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    return v;
  }
  return undefined;
}

let databaseUrl = process.env.DATABASE_URL || readDatabaseUrlFromEnvFile();
const isWindows = process.platform === "win32";
if (
  isWindows &&
  typeof databaseUrl === "string" &&
  databaseUrl.includes("/app/data/")
) {
  databaseUrl = "file:./dev.db";
}

const prismaArgs = process.argv.slice(2);
if (prismaArgs.length === 0) {
  console.error("Usage: node scripts/run-prisma.cjs <prisma-args…>  e.g. db push");
  process.exit(1);
}

const env = { ...process.env };
if (databaseUrl) {
  env.DATABASE_URL = databaseUrl;
}

const result = spawnSync("npx", ["prisma", ...prismaArgs], {
  cwd: root,
  stdio: "inherit",
  shell: true,
  env,
});

process.exit(result.status ?? 1);
