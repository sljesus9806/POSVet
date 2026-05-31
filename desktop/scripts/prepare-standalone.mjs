// Next standalone NO copia .next/static ni public junto al server. Este script
// los coloca en su lugar tras `next build`, dejando .next/standalone listo para
// empaquetar. Correr después de `npm run build` en la raíz.

import { cpSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const STANDALONE = path.join(ROOT, ".next", "standalone");

if (!existsSync(path.join(STANDALONE, "server.js"))) {
  console.error(
    "No existe .next/standalone/server.js. Corre primero `npm run build` (con output: 'standalone').",
  );
  process.exit(1);
}

cpSync(path.join(ROOT, ".next", "static"), path.join(STANDALONE, ".next", "static"), {
  recursive: true,
});
if (existsSync(path.join(ROOT, "public"))) {
  cpSync(path.join(ROOT, "public"), path.join(STANDALONE, "public"), {
    recursive: true,
  });
}
console.log("standalone listo: static y public copiados.");
