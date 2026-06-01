// Restaura la base de datos de una tienda desde un respaldo (.dump).
// DESTRUCTIVO: reemplaza por completo la BD actual de esa tienda.
//
//   node deploy/restaurar.mjs <slug> deploy/backups/pos_xxx-....dump

import { spawn } from "node:child_process";
import { createReadStream, existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEPLOY_DIR = path.dirname(fileURLToPath(import.meta.url));
const DB_CONTAINER = "posvet-saas-db";

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

function run(args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn("docker", args, { stdio: "inherit", ...opts });
    p.on("error", reject);
    p.on("exit", (c) => (c === 0 ? resolve() : reject(new Error(`docker → ${c}`))));
  });
}

async function main() {
  const slug = process.argv[2];
  const archivo = process.argv[3];
  if (!slug || !archivo) {
    console.error("Uso: node deploy/restaurar.mjs <slug> <archivo.dump>");
    process.exit(1);
  }
  if (!existsSync(archivo)) {
    console.error(`No existe el archivo: ${archivo}`);
    process.exit(1);
  }
  const dbName = `pos_${slug.replace(/-/g, "_")}`;

  console.log(`Restaurando ${dbName} desde ${archivo} (reemplaza la BD actual)…`);
  // BD limpia: borrar y recrear. --force corta las conexiones activas del POS.
  await run([
    "exec", DB_CONTAINER, "dropdb", "-U", PGUSER, "--if-exists", "--force", dbName,
  ]);
  await run(["exec", DB_CONTAINER, "createdb", "-U", PGUSER, dbName]);

  // pg_restore leyendo el dump por stdin.
  await new Promise((resolve, reject) => {
    const p = spawn(
      "docker",
      ["exec", "-i", DB_CONTAINER, "pg_restore", "-U", PGUSER, "-d", dbName, "--no-owner"],
      { stdio: ["pipe", "inherit", "inherit"] },
    );
    createReadStream(archivo).pipe(p.stdin);
    p.on("error", reject);
    p.on("exit", (c) => (c === 0 ? resolve() : reject(new Error(`pg_restore → ${c}`))));
  });

  console.log(`\nListo. Si el contenedor de ${slug} no está corriendo, vuelve a`);
  console.log(`provisionarlo:  node deploy/provisionar.mjs ${slug}`);
}

main().catch((err) => {
  console.error("\n✗", err.message);
  process.exit(1);
});
