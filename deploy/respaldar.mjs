// Respalda la base de datos de una tienda (o todas) con pg_dump en formato
// comprimido. Los archivos van a deploy/backups/.
//
//   node deploy/respaldar.mjs <slug>      # respalda una tienda
//   node deploy/respaldar.mjs --all       # respalda todas
//
// Restaurar con:  node deploy/restaurar.mjs <slug> <archivo.dump>

import { spawn } from "node:child_process";
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEPLOY_DIR = path.dirname(fileURLToPath(import.meta.url));
const DB_CONTAINER = "posvet-saas-db";
const BACKUPS = path.join(DEPLOY_DIR, "backups");

function leerEnv(file) {
  const env = {};
  if (!existsSync(file)) return env;
  for (const linea of readFileSync(file, "utf8").split("\n")) {
    const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return env;
}

const PGUSER = leerEnv(path.join(DEPLOY_DIR, ".env")).POSTGRES_USER ?? "posvet";

function capture(args) {
  return new Promise((resolve, reject) => {
    const p = spawn("docker", args, { stdio: ["ignore", "pipe", "inherit"] });
    let out = "";
    p.stdout.on("data", (d) => (out += d));
    p.on("error", reject);
    p.on("exit", (c) => (c === 0 ? resolve(out.trim()) : reject(new Error(`docker → ${c}`))));
  });
}

function marca() {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

async function dump(dbName) {
  mkdirSync(BACKUPS, { recursive: true });
  const file = path.join(BACKUPS, `${dbName}-${marca()}.dump`);
  await new Promise((resolve, reject) => {
    const out = createWriteStream(file);
    const p = spawn("docker", [
      "exec", DB_CONTAINER, "pg_dump", "-U", PGUSER, "-Fc", dbName,
    ]);
    let err = "";
    p.stdout.pipe(out);
    p.stderr.on("data", (d) => (err += d));
    p.on("error", reject);
    p.on("exit", (c) =>
      c === 0 ? resolve() : reject(new Error(err.trim() || `pg_dump → ${c}`)),
    );
  });
  const mb = (statSync(file).size / 1048576).toFixed(2);
  console.log(`  ${dbName} → ${path.relative(process.cwd(), file)} (${mb} MB)`);
}

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error("Uso: node deploy/respaldar.mjs <slug> | --all");
    process.exit(1);
  }

  let dbs;
  if (arg === "--all") {
    const out = await capture([
      "exec", DB_CONTAINER, "psql", "-U", PGUSER, "-d", "postgres", "-tAc",
      "SELECT datname FROM pg_database WHERE datname ~ '^pos_' ORDER BY 1",
    ]);
    dbs = out.split("\n").map((s) => s.trim()).filter(Boolean);
    if (!dbs.length) {
      console.log("No hay tiendas que respaldar.");
      return;
    }
  } else {
    dbs = [`pos_${arg.replace(/-/g, "_")}`];
  }

  console.log(`Respaldando ${dbs.length} BD(s)…`);
  for (const db of dbs) await dump(db);
  console.log("Listo.");
}

main().catch((err) => {
  console.error("\n✗", err.message);
  process.exit(1);
});
