// Genera el par de llaves Ed25519 del emisor. Uso de UNA sola vez.
//
//   npm run lic:keygen
//
// Escribe .licencia/private.pem (SECRETA, nunca al repo) y .licencia/public.pem.
// La pública debe copiarse a src/lib/modules/licencia/keys.ts (EMBEBIDA) o
// pasarse vía env LICENCIA_PUBLIC_KEY.

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { generarParLlaves } from "../../src/lib/modules/licencia/crypto";

const DIR = resolve(process.cwd(), ".licencia");
const PRIV = resolve(DIR, "private.pem");
const PUB = resolve(DIR, "public.pem");

if (existsSync(PRIV) && !process.argv.includes("--force")) {
  console.error(
    `Ya existe ${PRIV}. Sobrescribir invalidaría TODAS las licencias emitidas.\n` +
      "Si de verdad quieres regenerar, vuelve a correr con --force.",
  );
  process.exit(1);
}

mkdirSync(DIR, { recursive: true });
const { publicKeyPem, privateKeyPem } = generarParLlaves();
writeFileSync(PRIV, privateKeyPem, { mode: 0o600 });
writeFileSync(PUB, publicKeyPem);

console.log(`Llave privada -> ${PRIV}  (mantenla en secreto)`);
console.log(`Llave pública -> ${PUB}`);
console.log("\nCopia esta llave pública en src/lib/modules/licencia/keys.ts:\n");
console.log(publicKeyPem);
