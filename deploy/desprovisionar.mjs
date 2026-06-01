// Da de baja un cliente: detiene su contenedor y quita su ruta de Traefik.
// Con --purge además BORRA su base de datos (irreversible).
//
//   node deploy/desprovisionar.mjs <slug>
//   node deploy/desprovisionar.mjs <slug> --purge

import { spawn } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEPLOY_DIR = path.dirname(fileURLToPath(import.meta.url));
const DB_CONTAINER = "posvet-saas-db";
const PGUSER = "posvet";

function run(cmd, args) {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, { stdio: "ignore" });
    p.on("error", () => resolve());
    p.on("exit", () => resolve());
  });
}

const slug = process.argv[2];
if (!slug || slug.startsWith("--")) {
  console.error("Uso: node deploy/desprovisionar.mjs <slug> [--purge]");
  process.exit(1);
}
const dbName = `pos_${slug.replace(/-/g, "_")}`;
const purge = process.argv.includes("--purge");

await run("docker", ["rm", "-f", `posvet-${slug}`]);
const ruta = path.join(DEPLOY_DIR, "dynamic", `${slug}.yml`);
if (existsSync(ruta)) rmSync(ruta);
// Limpia también el secreto de sesión de la tienda (antes quedaba huérfano).
const secreto = path.join(DEPLOY_DIR, "tenants", `${slug}.secret`);
if (existsSync(secreto)) rmSync(secreto);
console.log(`Contenedor, ruta y secreto de ${slug} eliminados.`);

if (purge) {
  await run("docker", [
    "exec", DB_CONTAINER, "dropdb", "-U", PGUSER, "--if-exists", dbName,
  ]);
  console.log(`Base de datos ${dbName} BORRADA.`);
} else {
  console.log(`BD ${dbName} conservada (usa --purge para borrarla).`);
}
